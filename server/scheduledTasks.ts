

import * as db from './db.js';
import * as types from '../types.js';
import { RANKING_TIERS, SEASONAL_TIER_REWARDS, BORDER_POOL, LEAGUE_DATA, LEAGUE_WEEKLY_REWARDS, SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES, SEASONAL_TIER_BORDERS } from '../constants.js';
import { randomUUID } from 'crypto';
import { getKSTDate, getCurrentSeason, getPreviousSeason, SeasonInfo, isDifferentWeekKST } from '../utils/timeUtils.js';

let lastSeasonProcessed: SeasonInfo | null = null;

const processRewardsForSeason = async (season: SeasonInfo) => {
    console.log(`[Scheduler] Processing rewards for ${season.name}...`);
    const allGameModes = [...SPECIAL_GAME_MODES, ...PLAYFUL_GAME_MODES].map(m => m.mode);
    const rewards = SEASONAL_TIER_REWARDS;

    const allUsers = await db.getAllUsers();
    const tierOrder = RANKING_TIERS.map(t => t.name);
    const now = Date.now();

    // Pre-calculate rankings for all modes to avoid repeated sorting
    const rankingsByMode: Record<string, { user: types.User, rank: number }[]> = {};
    for (const mode of allGameModes) {
        const eligibleUsers = allUsers
            .filter(u => u.stats?.[mode] && (u.stats[mode].wins + u.stats[mode].losses) >= 20)
            .sort((a, b) => (b.stats![mode].rankingScore || 0) - (a.stats![mode].rankingScore || 0));
        
        rankingsByMode[mode] = eligibleUsers.map((user, index) => ({ user, rank: index + 1 }));
    }

    for (const user of allUsers) {
        let bestTierInfo: { tierName: string, mode: types.GameMode } | null = null;
        let bestTierRank = Infinity;

        // Find user's best tier across all modes
        for (const mode of allGameModes) {
            const modeRanking = rankingsByMode[mode];
            const totalEligiblePlayers = modeRanking.length;
            const userRankInfo = modeRanking.find(r => r.user.id === user.id);
            
            let currentTierName = '새싹'; // Default

            if (userRankInfo) { // User was eligible and ranked
                const userScore = userRankInfo.user.stats![mode].rankingScore || 0;
                const userTotalGames = (userRankInfo.user.stats![mode].wins || 0) + (userRankInfo.user.stats![mode].losses || 0);
                for (const tier of RANKING_TIERS) {
                    if (tier.threshold(userScore, userRankInfo.rank, userTotalGames)) {
                        currentTierName = tier.name;
                        break;
                    }
                }
            }
            
            // Store historical tier for this mode
            if (!user.seasonHistory) user.seasonHistory = {};
            if (!user.seasonHistory[season.name]) user.seasonHistory[season.name] = {};
            user.seasonHistory[season.name][mode] = currentTierName;

            // Check if this is the best tier so far
            const currentTierIndex = tierOrder.indexOf(currentTierName);
            if (currentTierIndex < bestTierRank) {
                bestTierRank = currentTierIndex;
                bestTierInfo = { tierName: currentTierName, mode };
            }
        }
        
        // If the user participated in any mode, they have a best tier
        if (bestTierInfo) {
            user.previousSeasonTier = bestTierInfo.tierName;

            // 1. Grant border reward
            const seasonalBorderId = SEASONAL_TIER_BORDERS[bestTierInfo.tierName];
            if (seasonalBorderId) {
                if (!user.ownedBorders) user.ownedBorders = ['default', 'simple_black']; // Ensure array exists
                if (!user.ownedBorders.includes(seasonalBorderId)) {
                    user.ownedBorders.push(seasonalBorderId);
                }
                user.borderId = seasonalBorderId; // Equip the seasonal border
            }
            
            // 2. Grant mail reward
            const reward = rewards[bestTierInfo.tierName];
            if (reward) {
                const mailTitle = `${season.name} 최고 티어는 "${bestTierInfo.tierName}" 티어입니다.`;
                const mailMessage = `프로필의 테두리 아이템을 한 시즌동안 사용하실 수 있습니다.\n티어 보상 상품을 수령하세요.`;
                
                const mail: types.Mail = {
                    id: `mail-season-${randomUUID()}`,
                    from: 'System',
                    title: mailTitle,
                    message: mailMessage,
                    attachments: reward,
                    receivedAt: now,
                    expiresAt: now + 14 * 24 * 60 * 60 * 1000, // 14 days
                    isRead: false,
                    attachmentsClaimed: false,
                };
                if (!user.mail) user.mail = [];
                user.mail.unshift(mail); // Add to the top
            }
        }
        
        // 3. Reset all game mode stats for the new season
        if (user.stats) {
            for (const mode of allGameModes) {
                if (user.stats[mode]) {
                    user.stats[mode] = { wins: 0, losses: 0, rankingScore: 1200 };
                }
            }
        }

        // 4. Save the updated user
        await db.updateUser(user);
    } // End of user loop
    
    console.log(`[Scheduler] Finished processing rewards and resetting stats for ${season.name}.`);
};

export const processRankingRewards = async (volatileState: types.VolatileState): Promise<void> => {
    const now = Date.now();
    const kstNow = getKSTDate(now);
    
    // Check if it's the start of a new season day
    const isNewSeasonDay = 
        (kstNow.getUTCMonth() === 0 && kstNow.getUTCDate() === 1) || // Jan 1
        (kstNow.getUTCMonth() === 3 && kstNow.getUTCDate() === 1) || // Apr 1
        (kstNow.getUTCMonth() === 6 && kstNow.getUTCDate() === 1) || // Jul 1
        (kstNow.getUTCMonth() === 9 && kstNow.getUTCDate() === 1);   // Oct 1

    if (!isNewSeasonDay || kstNow.getUTCHours() !== 0) { // Only run at midnight KST
        return;
    }

    if (lastSeasonProcessed === null) {
        const saved = await db.getKV<SeasonInfo>('lastSeasonProcessed');
        if (saved) {
            lastSeasonProcessed = saved;
        } else {
            // First time ever, set to previous season to prevent running on first boot
            lastSeasonProcessed = getPreviousSeason(now);
            await db.setKV('lastSeasonProcessed', lastSeasonProcessed);
            return;
        }
    }
    
    const currentSeason = getCurrentSeason(now);
    
    // Check if the current season is different from the last one we processed
    if (lastSeasonProcessed.name !== currentSeason.name) {
        const previousSeason = getPreviousSeason(now);
        await processRewardsForSeason(previousSeason);
        
        // Update the state to reflect that the new season has been processed
        lastSeasonProcessed = currentSeason;
        await db.setKV('lastSeasonProcessed', lastSeasonProcessed);
    }
};

export async function processWeeklyLeagueUpdates(user: types.User): Promise<types.User> {
    if (!isDifferentWeekKST(user.lastLeagueUpdate, Date.now())) {
        return user; // Not a new week, no update needed
    }

    console.log(`[LeagueUpdate] Processing weekly update for ${user.nickname}`);

    if (!user.weeklyCompetitors || user.weeklyCompetitors.length === 0) {
        console.log(`[LeagueUpdate] No competitors found for ${user.nickname}. Skipping league update, but updating timestamp.`);
        user.lastLeagueUpdate = Date.now();
        return user;
    }
    
    const allUsers = await db.getAllUsers();

    // Reset tournament scores for all users at the start of a new week
    /*
    for (const u of allUsers) {
        if (u.tournamentScore !== 0) {
            u.tournamentScore = 0;
            await db.updateUser(u);
        }
    }
    */

    const competitorMap = new Map(allUsers.map(u => [u.id, u]));

    const finalRankings = user.weeklyCompetitors.map(c => {
        const liveData = competitorMap.get(c.id);
        return {
            id: c.id,
            nickname: c.nickname,
            finalScore: liveData ? liveData.tournamentScore : c.initialScore
        };
    }).sort((a, b) => b.finalScore - a.finalScore);
    
    const myRank = finalRankings.findIndex(c => c.id === user.id) + 1;
    
    if (myRank === 0) {
        console.warn(`[LeagueUpdate] User ${user.nickname} not found in their own competitor list. Aborting update.`);
        user.lastLeagueUpdate = Date.now();
        return user;
    }

    const currentLeague = user.league;
    const rewardTiers = LEAGUE_WEEKLY_REWARDS[currentLeague];
    if (!rewardTiers) {
        console.warn(`[LeagueUpdate] No reward tiers found for league: ${currentLeague}`);
        user.lastLeagueUpdate = Date.now();
        return user;
    }

    const myRewardTier = rewardTiers.find(tier => myRank >= tier.rankStart && myRank <= tier.rankEnd);
    if (!myRewardTier) {
        console.warn(`[LeagueUpdate] No reward tier found for rank ${myRank} in league ${currentLeague}`);
        user.lastLeagueUpdate = Date.now();
        return user;
    }

    const currentLeagueIndex = LEAGUE_DATA.findIndex(l => l.tier === currentLeague);
    if (currentLeagueIndex === -1) {
        console.warn(`[LeagueUpdate] User ${user.nickname} has an invalid league: ${user.league}. Resetting to Sprout.`);
        user.league = types.LeagueTier.Sprout;
    }

    let newLeagueIndex = currentLeagueIndex;
    let resultText = "";
    
    if (myRewardTier.outcome === 'promote') {
        newLeagueIndex = Math.min(LEAGUE_DATA.length - 1, currentLeagueIndex + 1);
        resultText = "승급";
    } else if (myRewardTier.outcome === 'demote') {
        newLeagueIndex = Math.max(0, currentLeagueIndex - 1);
        resultText = "강등";
    } else {
        resultText = "잔류";
    }
    
    const oldLeague = user.league;
    const newLeague = LEAGUE_DATA[newLeagueIndex].tier;
    
    if (oldLeague !== newLeague) {
        user.league = newLeague;
    }

    const now = Date.now();
    const kstNow = getKSTDate(now);
    const year = kstNow.getUTCFullYear().toString().slice(-2);
    const month = kstNow.getUTCMonth() + 1;
    const week = Math.ceil(kstNow.getUTCDate() / 7);

    const mailTitle = `${year}년 ${month}월 ${week}주차 리그 정산 보상`;
    const mailMessage = `
${year}년 ${month}월 ${week}주차 주간 경쟁 결과, ${finalRankings.length}명 중 ${myRank}위를 기록하셨습니다.
        
- 이전 리그: ${oldLeague}
- 현재 리그: ${newLeague}
        
결과: [${resultText}]

보상이 지급되었습니다. 5일 이내에 수령해주세요.
        
새로운 주간 경쟁이 시작됩니다. 행운을 빕니다!
    `.trim().replace(/^\s+/gm, '');

    const newMail: types.Mail = {
        id: `mail-league-${randomUUID()}`,
        from: 'System',
        title: mailTitle,
        message: mailMessage,
        attachments: { diamonds: myRewardTier.diamonds },
        receivedAt: now,
        expiresAt: now + 5 * 24 * 60 * 60 * 1000, // 5 days
        isRead: false,
        attachmentsClaimed: false,
    };
    user.mail.unshift(newMail);

    user.lastLeagueUpdate = now;
    
    console.log(`[LeagueUpdate] ${user.nickname} ranked ${myRank}/${finalRankings.length}. Reward: ${myRewardTier.diamonds} diamonds. Result: ${resultText}. New league: ${newLeague}`);

    return user;
}

export async function updateWeeklyCompetitorsIfNeeded(user: types.User, allUsers: types.User[]): Promise<types.User> {
    const now = Date.now();
    if (!isDifferentWeekKST(user.lastWeeklyCompetitorsUpdate, now)) {
        return user; // No update needed
    }

    console.log(`[LeagueUpdate] Updating weekly competitors for ${user.nickname}`);

    // Find 15 other users in the same league
    const potentialCompetitors = allUsers.filter(
        u => u.id !== user.id && u.league === user.league
    );

    const shuffledCompetitors = potentialCompetitors.sort(() => 0.5 - Math.random());
    const selectedCompetitors = shuffledCompetitors.slice(0, 15);

    // Create the list of competitors including the current user
    const competitorList: types.WeeklyCompetitor[] = [user, ...selectedCompetitors].map(u => ({
        id: u.id,
        nickname: u.nickname,
        avatarId: u.avatarId,
        borderId: u.borderId,
        league: u.league,
        initialScore: 0 // All scores reset to 0 at the start of the week
    }));
    
    const updatedUser = JSON.parse(JSON.stringify(user));
    updatedUser.weeklyCompetitors = competitorList;
    updatedUser.lastWeeklyCompetitorsUpdate = now;

    return updatedUser;
}