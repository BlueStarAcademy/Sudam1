

import * as db from './db.js';
import * as types from '../types.js';
import { RANKING_TIERS, SEASONAL_TIER_REWARDS, BORDER_POOL, LEAGUE_DATA, LEAGUE_WEEKLY_REWARDS, SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES, SEASONAL_TIER_BORDERS, DAILY_QUESTS, WEEKLY_QUESTS, MONTHLY_QUESTS, TOURNAMENT_DEFINITIONS, BOT_NAMES, AVATAR_POOL } from '../constants';
import { randomUUID } from 'crypto';
import { getKSTDate, getCurrentSeason, getPreviousSeason, SeasonInfo, isDifferentWeekKST, isSameDayKST, getStartOfDayKST, isDifferentDayKST, isDifferentMonthKST, getKSTDay, getKSTHours, getKSTMinutes, getKSTFullYear, getKSTMonth, getKSTDate_UTC } from '../utils/timeUtils.js';
import { resetAndGenerateQuests } from './gameActions.js';
import * as tournamentService from './tournamentService.js';
import { calculateTotalStats } from './statService.js';
import { TournamentType } from '../types.js';
import { startTournamentSessionForUser } from './actions/tournamentActions.js';
import { broadcast } from './socket.js';

let lastSeasonProcessed: SeasonInfo | null = null;
let lastWeeklyResetTimestamp: number | null = null;
let lastWeeklyLeagueUpdateTimestamp: number | null = null;
let lastDailyRankingUpdateTimestamp: number | null = null;
let lastDailyQuestResetTimestamp: number | null = null;
let lastTowerRankingRewardTimestamp: number | null = null;

export function setLastWeeklyLeagueUpdateTimestamp(timestamp: number): void {
    lastWeeklyLeagueUpdateTimestamp = timestamp;
}

export function getLastWeeklyLeagueUpdateTimestamp(): number | null {
    return lastWeeklyLeagueUpdateTimestamp;
}

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
        
        // 3. Reset game mode stats for the new season
        // 놀이바둑만 1200점으로 초기화, 전략바둑은 점수 유지
        if (user.stats) {
            const playfulModes = PLAYFUL_GAME_MODES.map(m => m.mode);
            const strategicModes = SPECIAL_GAME_MODES.map(m => m.mode);
            
            for (const mode of allGameModes) {
                if (user.stats[mode]) {
                    if (playfulModes.includes(mode)) {
                        // 놀이바둑: 매 시즌 1200점으로 초기화
                        user.stats[mode] = { wins: 0, losses: 0, rankingScore: 1200 };
                    } else if (strategicModes.includes(mode)) {
                        // 전략바둑: 점수 유지, 승패만 초기화
                        const currentScore = user.stats[mode].rankingScore || 1200;
                        user.stats[mode] = { wins: 0, losses: 0, rankingScore: currentScore };
                    } else {
                        // 기타 모드: 1200점으로 초기화 (기본 동작)
                        user.stats[mode] = { wins: 0, losses: 0, rankingScore: 1200 };
                    }
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
    const kstMonth = getKSTMonth(now);
    const kstDate = getKSTDate_UTC(now);
    const kstHours = getKSTHours(now);
    
    // Check if it's the start of a new season day
    const isNewSeasonDay = 
        (kstMonth === 0 && kstDate === 1) || // Jan 1
        (kstMonth === 3 && kstDate === 1) || // Apr 1
        (kstMonth === 6 && kstDate === 1) || // Jul 1
        (kstMonth === 9 && kstDate === 1);   // Oct 1

    if (!isNewSeasonDay || kstHours !== 0) { // Only run at midnight KST
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

// 월요일 0시에 티어변동 후 새로운 경쟁상대를 매칭하고 모든 점수를 리셋하는 함수
// 주의: 이 함수는 processWeeklyLeagueUpdates 이후에 호출되어야 함 (티어변동 후 새로운 경쟁상대 매칭)
export async function processWeeklyResetAndRematch(): Promise<void> {
    const now = Date.now();
    const kstDay = getKSTDay(now);
    const kstHours = getKSTHours(now);
    const kstMinutes = getKSTMinutes(now);
    const isMondayMidnight = kstDay === 1 && kstHours === 0 && kstMinutes < 5;
    
    // 디버깅: 현재 KST 시간 정보 로그
    if (process.env.NODE_ENV === 'development') {
        console.log(`[WeeklyReset] Checking: KST Day=${kstDay}, Hours=${kstHours}, Minutes=${kstMinutes}, isMondayMidnight=${isMondayMidnight}`);
    }
    
    // Check if we've already processed this Monday
    // KST 기준으로 월요일인지 확인하고, 같은 월요일이면 이미 처리한 것으로 간주
    if (lastWeeklyResetTimestamp !== null && isMondayMidnight) {
        // 마지막 리셋 타임스탬프의 KST 기준 날짜와 현재 날짜를 비교
        const lastResetDayStart = getStartOfDayKST(lastWeeklyResetTimestamp);
        const currentDayStart = getStartOfDayKST(now);
        
        // 같은 날이면 이미 처리한 것으로 간주
        if (lastResetDayStart === currentDayStart) {
            if (process.env.NODE_ENV === 'development') {
                console.log(`[WeeklyReset] Already processed this Monday`);
            }
            return; // Already processed this Monday
        }
    }
    
    if (isMondayMidnight) {
        console.log(`[WeeklyReset] Processing weekly reset and rematch at Monday 0:00 KST`);
        const allUsers = await db.getAllUsers();
        
        // 1. 새로운 경쟁상대 매칭 (티어변동 후 새로운 리그에 맞는 경쟁상대 매칭)
        // 2. 모든 점수 리셋 (유저 점수 0, 봇 점수 0, yesterdayScore 0)
        
        // 티어변동 후 새로운 경쟁상대 매칭
        // 모든 유저를 처리하되, 관리자나 초기데이터 아이디도 포함하여 처리
        for (const user of allUsers) {
            // 최신 유저 데이터 가져오기 (티어변동이 반영된 상태)
            const freshUser = await db.getUser(user.id);
            if (!freshUser) continue;
            
            // 월요일 0시에는 강제로 경쟁 상대를 업데이트 (주간 체크 무시)
            // 관리자나 초기데이터 아이디도 포함하여 처리
            let updatedUser = freshUser;
            const nowForUpdate = Date.now();
            if (isDifferentWeekKST(freshUser.lastWeeklyCompetitorsUpdate ?? undefined, nowForUpdate) || !freshUser.weeklyCompetitors || freshUser.weeklyCompetitors.length === 0) {
                // 경쟁 상대 업데이트가 필요한 경우
                console.log(`[WeeklyReset] Updating weekly competitors for ${freshUser.nickname} (${freshUser.id})`);
                
                // Find 15 other users in the same league
                const potentialCompetitors = allUsers.filter(
                    u => u.id !== freshUser.id && u.league === freshUser.league
                );
                
                const shuffledCompetitors = potentialCompetitors.sort(() => 0.5 - Math.random());
                const selectedCompetitors = shuffledCompetitors.slice(0, 15);
                
                // Create the list of competitors including the current user
                const competitorList: types.WeeklyCompetitor[] = [freshUser, ...selectedCompetitors].map(u => ({
                    id: u.id,
                    nickname: u.nickname,
                    avatarId: u.avatarId,
                    borderId: u.borderId,
                    league: u.league,
                    initialScore: 0 // All scores reset to 0 at the start of the week
                }));
                
                updatedUser = JSON.parse(JSON.stringify(freshUser));
                updatedUser.weeklyCompetitors = competitorList;
                updatedUser.lastWeeklyCompetitorsUpdate = nowForUpdate;
                
                // 새로운 주간 경쟁상대가 매칭되면 봇 점수도 0으로 리셋
                updatedUser.weeklyCompetitorsBotScores = {};
            } else {
                // 이미 경쟁 상대가 있고 주간 체크를 통과한 경우에도 updateWeeklyCompetitorsIfNeeded 호출
                updatedUser = await updateWeeklyCompetitorsIfNeeded(freshUser, allUsers);
            }
            
            // 모든 유저의 주간 점수를 0으로 리셋 (processWeeklyLeagueUpdates에서 이미 누적 점수에 추가됨)
            updatedUser.tournamentScore = 0;
            
            // 월요일 0시에 유저의 yesterdayTournamentScore를 현재 누적 점수로 설정 (변화없음으로 시작)
            // 이렇게 하면 누적 점수는 업데이트되어도 변화표에 "변화없음"으로 표시됨
            // (liveScore - yesterdayScore = cumulativeTournamentScore - cumulativeTournamentScore = 0)
            updatedUser.yesterdayTournamentScore = updatedUser.cumulativeTournamentScore || 0;
            
            // dailyRankings.championship도 초기화하여 변화표가 올바르게 표시되도록 함
            if (!updatedUser.dailyRankings) {
                updatedUser.dailyRankings = {};
            }
            // 월요일 0시에는 누적 점수가 업데이트된 상태이지만, 변화표는 변화없음으로 시작하도록 설정
            // processDailyRankings에서 나중에 rank를 업데이트함
            updatedUser.dailyRankings.championship = {
                rank: 0, // processDailyRankings에서 나중에 업데이트됨
                score: updatedUser.cumulativeTournamentScore || 0, // 누적 점수 유지
                lastUpdated: now
            };
            
            // 새로운 경쟁상대 매칭 시 updateWeeklyCompetitorsIfNeeded에서 weeklyCompetitorsBotScores가 {}로 리셋됨
            // 새로운 경쟁상대에 봇이 포함된 경우를 대비해 초기화
            if (!updatedUser.weeklyCompetitorsBotScores) {
                updatedUser.weeklyCompetitorsBotScores = {};
            }
            
            // 새로운 경쟁상대에 봇이 포함된 경우, 봇 점수를 0으로 초기화하고 yesterdayScore도 0으로 설정
            // 그리고 월요일 0시에 경쟁 상대가 갱신된 직후이므로 봇 점수에 1~50점을 한번 추가
            if (updatedUser.weeklyCompetitors) {
                for (const competitor of updatedUser.weeklyCompetitors) {
                    if (competitor.id.startsWith('bot-')) {
                        // 1-50 사이의 랜덤값 생성 (봇 ID와 KST 기준 날짜를 시드로 사용)
                        const kstYear = getKSTFullYear(now);
                        const kstMonth = getKSTMonth(now) + 1; // 0-based to 1-based
                        const kstDate = getKSTDate_UTC(now);
                        const dateStr = `${kstYear}-${String(kstMonth).padStart(2, '0')}-${String(kstDate).padStart(2, '0')}`;
                        const seedStr = `${competitor.id}-${dateStr}`;
                        let seed = 0;
                        for (let i = 0; i < seedStr.length; i++) {
                            seed = ((seed << 5) - seed) + seedStr.charCodeAt(i);
                            seed = seed & seed; // Convert to 32bit integer
                        }
                        const randomVal = Math.abs(Math.sin(seed)) * 10000;
                        const initialGain = Math.floor((randomVal % 50)) + 1; // 1-50
                        
                        updatedUser.weeklyCompetitorsBotScores[competitor.id] = {
                            score: initialGain, // 월요일 0시에 경쟁 상대 갱신 직후 1~50점 추가
                            lastUpdate: now,
                            yesterdayScore: 0 // 변화없음으로 표시
                        };
                    }
                }
            }
            
            // 기존 봇 점수가 있으면 처리 (새로운 경쟁상대에 포함되지 않은 봇)
            for (const botId in updatedUser.weeklyCompetitorsBotScores) {
                const competitorExists = updatedUser.weeklyCompetitors?.some(c => c.id === botId);
                if (!competitorExists) {
                    // 새로운 경쟁상대에 포함되지 않은 봇은 삭제
                    delete updatedUser.weeklyCompetitorsBotScores[botId];
                } else {
                    // 새로운 경쟁상대에 포함된 봇은 이미 위에서 처리됨
                    // 하지만 혹시 모를 경우를 대비해 점수 확인 및 업데이트
                    const botScoreData = updatedUser.weeklyCompetitorsBotScores[botId];
                    if (botScoreData && botScoreData.score === 0 && botScoreData.lastUpdate === now) {
                        // 1-50 사이의 랜덤값 생성 (봇 ID와 KST 기준 날짜를 시드로 사용)
                        const kstYear = getKSTFullYear(now);
                        const kstMonth = getKSTMonth(now) + 1; // 0-based to 1-based
                        const kstDate = getKSTDate_UTC(now);
                        const dateStr = `${kstYear}-${String(kstMonth).padStart(2, '0')}-${String(kstDate).padStart(2, '0')}`;
                        const seedStr = `${botId}-${dateStr}`;
                        let seed = 0;
                        for (let i = 0; i < seedStr.length; i++) {
                            seed = ((seed << 5) - seed) + seedStr.charCodeAt(i);
                            seed = seed & seed; // Convert to 32bit integer
                        }
                        const randomVal = Math.abs(Math.sin(seed)) * 10000;
                        const initialGain = Math.floor((randomVal % 50)) + 1; // 1-50
                        
                        updatedUser.weeklyCompetitorsBotScores[botId] = {
                            score: initialGain, // 월요일 0시에 경쟁 상대 갱신 직후 1~50점 추가
                            lastUpdate: now,
                            yesterdayScore: 0 // 변화없음으로 표시
                        };
                    }
                }
            }
            
            await db.updateUser(updatedUser);
        }
        
        lastWeeklyResetTimestamp = now;
        console.log(`[WeeklyReset] Reset all tournament scores, bot scores, and rematched competitors`);
    }
}

// 기존 함수는 호환성을 위해 유지 (월요일 0시 처리는 processWeeklyResetAndRematch로 대체)
export async function processWeeklyTournamentReset(): Promise<void> {
    // 월요일 0시 처리는 processWeeklyResetAndRematch에서 처리되므로 여기서는 아무것도 하지 않음
    // 기존 코드와의 호환성을 위해 함수는 유지
}

// 1회성 챔피언십 점수 초기화 함수
export async function resetAllTournamentScores(): Promise<void> {
    console.log(`[OneTimeReset] Resetting all tournament scores to 0`);
    const allUsers = await db.getAllUsers();
    
    for (const user of allUsers) {
        user.tournamentScore = 0;
        await db.updateUser(user);
    }
    
    console.log(`[OneTimeReset] Reset ${allUsers.length} users' tournament scores to 0`);
}

// 1회성: 모든 유저의 리그 점수를 0으로 초기화하여 변화없음으로 표시되도록 함
export async function resetAllUsersLeagueScoresForNewWeek(): Promise<void> {
    console.log(`[OneTimeReset] Resetting all users' tournament scores to 0 for new week`);
    const allUsers = await db.getAllUsers();
    let updatedCount = 0;
    
    for (const user of allUsers) {
        if (user.tournamentScore !== 0) {
            // 누적 점수에 현재 주간 점수 추가 (리셋 전에)
            const weeklyScore = user.tournamentScore || 0;
            user.cumulativeTournamentScore = (user.cumulativeTournamentScore || 0) + weeklyScore;
            
            // 주간 점수를 0으로 리셋
            user.tournamentScore = 0;
            await db.updateUser(user);
            updatedCount++;
        }
    }
    
    console.log(`[OneTimeReset] Reset ${updatedCount} users' tournament scores to 0 (total users: ${allUsers.length})`);
}

export async function resetAllChampionshipScoresToZero(): Promise<void> {
    console.log(`[OneTimeReset] Resetting all championship cumulative scores to 0`);
    const allUsers = await db.getAllUsers();
    const now = Date.now();
    let updatedCount = 0;

    for (const user of allUsers) {
        let hasChanges = false;

        if ((user.cumulativeTournamentScore ?? 0) !== 0) {
            user.cumulativeTournamentScore = 0;
            hasChanges = true;
        }

        if (!user.dailyRankings) {
            user.dailyRankings = {};
            hasChanges = true;
        }

        const currentChampionship = user.dailyRankings.championship;
        if (!currentChampionship || currentChampionship.score !== 0 || currentChampionship.rank !== 0) {
            user.dailyRankings.championship = {
                rank: 0,
                score: 0,
                lastUpdated: now
            };
            hasChanges = true;
        }

        if (hasChanges) {
            await db.updateUser(user);
            updatedCount++;
        }
    }

    console.log(`[OneTimeReset] Reset championship scores to 0 for ${updatedCount} users (total users: ${allUsers.length})`);
}

export async function processWeeklyLeagueUpdates(user: types.User): Promise<types.User> {
    if (!isDifferentWeekKST(user.lastLeagueUpdate ?? undefined, Date.now())) {
        return user; // Not a new week, no update needed
    }

    // 로그 제거 (과도한 로깅 방지)

    if (!user.weeklyCompetitors || user.weeklyCompetitors.length === 0) {
        // 로그 제거 (과도한 로깅 방지)
        user.lastLeagueUpdate = Date.now();
        return user;
    }
    
    const now = Date.now();
    const allUsers = await db.getAllUsers();
    const competitorMap = new Map(allUsers.map(u => [u.id, u]));

    const finalRankings = user.weeklyCompetitors.map(c => {
        if (c.id.startsWith('bot-')) {
            // 봇의 경우 weeklyCompetitorsBotScores에서 점수 가져오기
            const botScore = user.weeklyCompetitorsBotScores?.[c.id]?.score || 0;
            return {
                id: c.id,
                nickname: c.nickname,
                finalScore: botScore
            };
        } else {
            const liveData = competitorMap.get(c.id);
            return {
                id: c.id,
                nickname: c.nickname,
                finalScore: liveData ? liveData.tournamentScore : c.initialScore
            };
        }
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

    // 주간 점수를 누적 점수에 추가 (티어변동 계산 후)
    const weeklyScore = user.tournamentScore || 0;
    user.cumulativeTournamentScore = (user.cumulativeTournamentScore || 0) + weeklyScore;

    // KST 기준으로 날짜 정보 가져오기
    const kstYear = getKSTFullYear(now);
    const kstMonth = getKSTMonth(now);
    const kstDate = getKSTDate_UTC(now);
    const year = kstYear.toString().slice(-2);
    const month = kstMonth + 1;
    const week = Math.ceil(kstDate / 7);

    const mailTitle = `${year}년 ${month}월 ${week}주차 리그 정산 보상`;
    const mailMessage = `
${year}년 ${month}월 ${week}주차 주간 경쟁 결과, ${finalRankings.length}명 중 ${myRank}위를 기록하셨습니다.
        
- 이전 리그: ${oldLeague}
- 현재 리그: ${newLeague}
        
결과: [${resultText}]

보상이 지급되었습니다. 5일 이내에 수령해주세요.
        
새로운 주간 경쟁이 시작됩니다. 행운을 빕니다!
    `.trim().replace(/^\s+/gm, '');

    // user.mail 배열 초기화 확인
    if (!user.mail || !Array.isArray(user.mail)) {
        user.mail = [];
    }
    
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
    
    // 로그 제거 (과도한 로깅 방지)

    return user;
}

export async function updateWeeklyCompetitorsIfNeeded(user: types.User, allUsers: types.User[]): Promise<types.User> {
    const now = Date.now();
    if (!isDifferentWeekKST(user.lastWeeklyCompetitorsUpdate ?? undefined, now)) {
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
    
    // 새로운 주간 경쟁상대가 매칭되면 봇 점수도 0으로 리셋
    updatedUser.weeklyCompetitorsBotScores = {};

    return updatedUser;
}

// 봇의 리그 점수를 하루에 한번 증가시키는 함수
export async function updateBotLeagueScores(user: types.User): Promise<types.User> {
    if (!user.weeklyCompetitors || user.weeklyCompetitors.length === 0) {
        return user;
    }
    
    const now = Date.now();
    const todayStart = getStartOfDayKST(now);
    
    // weeklyCompetitors에 봇 점수 업데이트 정보가 없으면 초기화
    if (!user.weeklyCompetitorsBotScores) {
        user.weeklyCompetitorsBotScores = {};
    }
    
    const updatedUser = JSON.parse(JSON.stringify(user));
    let hasChanges = false;
    
    // 각 경쟁상대 중 봇인 경우 점수 업데이트
    for (const competitor of updatedUser.weeklyCompetitors) {
        if (competitor.id.startsWith('bot-')) {
            const botScoreData = user.weeklyCompetitorsBotScores?.[competitor.id];
            const lastUpdate = botScoreData?.lastUpdate || 0;
            const lastUpdateDay = getStartOfDayKST(lastUpdate);
            const currentScore = botScoreData?.score || 0;
            
            // 오늘 아직 업데이트하지 않았으면 점수 증가
            if (lastUpdateDay < todayStart) {
                // 어제 점수를 yesterdayScore로 저장 (0시 직전의 점수)
                const yesterdayScore = currentScore;
                
                // 1-50 사이의 랜덤값 생성 (봇 ID와 KST 기준 날짜를 시드로 사용)
                // KST 기준 날짜 문자열 생성 (YYYY-MM-DD 형식)
                const kstYear = getKSTFullYear(now);
                const kstMonth = getKSTMonth(now) + 1; // 0-based to 1-based
                const kstDate = getKSTDate_UTC(now);
                const dateStr = `${kstYear}-${String(kstMonth).padStart(2, '0')}-${String(kstDate).padStart(2, '0')}`;
                const seedStr = `${competitor.id}-${dateStr}`;
                let seed = 0;
                for (let i = 0; i < seedStr.length; i++) {
                    seed = ((seed << 5) - seed) + seedStr.charCodeAt(i);
                    seed = seed & seed; // Convert to 32bit integer
                }
                const randomVal = Math.abs(Math.sin(seed)) * 10000;
                const dailyGain = Math.floor((randomVal % 50)) + 1; // 1-50
                
                const newScore = currentScore + dailyGain;
                
                if (!updatedUser.weeklyCompetitorsBotScores) {
                    updatedUser.weeklyCompetitorsBotScores = {};
                }
                updatedUser.weeklyCompetitorsBotScores[competitor.id] = {
                    score: newScore,
                    lastUpdate: now,
                    yesterdayScore: yesterdayScore // 어제 점수 저장
                };
                
                hasChanges = true;
            } else if (!botScoreData?.yesterdayScore && currentScore > 0) {
                // 이미 오늘 업데이트했지만 yesterdayScore가 없는 경우 (마이그레이션)
                // 현재 점수를 어제 점수로 설정 (변화 없음으로 표시)
                if (!updatedUser.weeklyCompetitorsBotScores) {
                    updatedUser.weeklyCompetitorsBotScores = {};
                }
                updatedUser.weeklyCompetitorsBotScores[competitor.id] = {
                    ...botScoreData,
                    yesterdayScore: currentScore
                };
                hasChanges = true;
            }
        }
    }
    
    return hasChanges ? updatedUser : user;
}

// 매일 0시에 랭킹 정산 (전략바둑, 놀이바둑, 챔피언십)
export async function processDailyRankings(): Promise<void> {
    const now = Date.now();
    const kstHours = getKSTHours(now);
    const kstMinutes = getKSTMinutes(now);
    const isMidnight = kstHours === 0 && kstMinutes < 5;
    
    // 디버깅: 현재 KST 시간 정보 로그
    if (process.env.NODE_ENV === 'development' && kstHours === 0) {
        console.log(`[DailyRanking] Checking: KST Hours=${kstHours}, Minutes=${kstMinutes}, isMidnight=${isMidnight}`);
    }
    
    if (!isMidnight) {
        return;
    }
    
    // 이미 오늘 처리했는지 확인
    if (lastDailyRankingUpdateTimestamp !== null) {
        const todayStart = getStartOfDayKST(now);
        const lastUpdateStart = getStartOfDayKST(lastDailyRankingUpdateTimestamp);
        
        if (lastUpdateStart === todayStart) {
            return; // Already processed today
        }
    }
    
    console.log(`[DailyRanking] Processing daily ranking calculations at midnight KST`);
    
    const allUsers = await db.getAllUsers();
    
    // 전략바둑 랭킹 계산 (누적 점수 기준, 10판 이상 PVP 필수)
    const strategicRankings = allUsers
        .filter(user => {
            if (!user || !user.id) return false;
            // 전략바둑 모드들의 총 게임 수 계산 (wins + losses)
            let totalGames = 0;
            for (const mode of SPECIAL_GAME_MODES) {
                const gameStats = user.stats?.[mode.mode];
                if (gameStats) {
                    totalGames += (gameStats.wins || 0) + (gameStats.losses || 0);
                }
            }
            // 10판 이상 PVP를 한 유저만 랭킹에 포함
            return totalGames >= 10 && user.cumulativeRankingScore?.['standard'] !== undefined;
        })
        .map(user => ({
            user,
            score: user.cumulativeRankingScore?.['standard'] || 0
        }))
        .sort((a, b) => b.score - a.score)
        .map((entry, index) => ({
            userId: entry.user.id,
            rank: index + 1,
            score: entry.score
        }));
    
    // 놀이바둑 랭킹 계산 (누적 점수 기준, 10판 이상 PVP 필수)
    const playfulRankings = allUsers
        .filter(user => {
            if (!user || !user.id) return false;
            // 놀이바둑 모드들의 총 게임 수 계산 (wins + losses)
            let totalGames = 0;
            for (const mode of PLAYFUL_GAME_MODES) {
                const gameStats = user.stats?.[mode.mode];
                if (gameStats) {
                    totalGames += (gameStats.wins || 0) + (gameStats.losses || 0);
                }
            }
            // 10판 이상 PVP를 한 유저만 랭킹에 포함
            return totalGames >= 10 && user.cumulativeRankingScore?.['playful'] !== undefined;
        })
        .map(user => ({
            user,
            score: user.cumulativeRankingScore?.['playful'] || 0
        }))
        .sort((a, b) => b.score - a.score)
        .map((entry, index) => ({
            userId: entry.user.id,
            rank: index + 1,
            score: entry.score
        }));
    
    // 챔피언십 랭킹 계산 (누적 점수 기준) - 모든 사용자 포함 (누적 점수가 0이어도 포함)
    const championshipRankings = allUsers
        .filter(user => user && user.id)
        .map(user => ({
            user,
            score: user.cumulativeTournamentScore || 0
        }))
        .sort((a, b) => b.score - a.score)
        .map((entry, index) => ({
            userId: entry.user.id,
            rank: index + 1,
            score: entry.score
        }));
    
    // 월요일 0시인지 확인 (월요일 0시에는 봇 점수 업데이트를 하지 않음 - processWeeklyResetAndRematch에서 처리)
    // kstHours와 kstMinutes는 이미 위에서 선언되었으므로 재사용
    const kstDay = getKSTDay(now);
    const isMondayMidnight = kstDay === 1 && kstHours === 0 && kstMinutes < 5;
    
    // 각 유저의 dailyRankings 업데이트 및 봇 점수 업데이트
    for (const user of allUsers) {
        let updatedUser = JSON.parse(JSON.stringify(user));
        
        // 봇의 리그 점수 업데이트 (매일 0시에 실행, 단 월요일 0시는 제외 - 이미 processWeeklyResetAndRematch에서 리셋됨)
        if (!isMondayMidnight) {
            updatedUser = await updateBotLeagueScores(updatedUser);
        }
        
        if (!updatedUser.dailyRankings) {
            updatedUser.dailyRankings = {};
        }
        
        // 전략바둑 순위 저장
        const strategicRank = strategicRankings.findIndex(r => r.userId === user.id);
        if (strategicRank !== -1) {
            updatedUser.dailyRankings.strategic = {
                rank: strategicRank + 1,
                score: user.cumulativeRankingScore?.['standard'] || 0,
                lastUpdated: now
            };
        }
        
        // 놀이바둑 순위 저장
        const playfulRank = playfulRankings.findIndex(r => r.userId === user.id);
        if (playfulRank !== -1) {
            updatedUser.dailyRankings.playful = {
                rank: playfulRank + 1,
                score: user.cumulativeRankingScore?.['playful'] || 0,
                lastUpdated: now
            };
        }
        
        // 챔피언십 순위 저장 (누적 점수 기준 - 모든 사용자에게 저장)
        const championshipRank = championshipRankings.findIndex(r => r.userId === user.id);
        const currentScore = user.cumulativeTournamentScore || 0;
        
        // 월요일 0시인 경우: yesterdayTournamentScore를 현재 누적 점수로 설정하여 변화없음으로 시작
        // 월요일이 아닌 경우: 어제 점수를 저장 (0시 직전의 점수)
        if (isMondayMidnight) {
            // 월요일 0시에는 processWeeklyResetAndRematch에서 이미 yesterdayTournamentScore를 현재 누적 점수로 설정했지만,
            // 여기서도 확인하여 확실하게 설정 (누적 점수 = yesterdayScore이므로 변화량 = 0)
            updatedUser.yesterdayTournamentScore = currentScore;
            updatedUser.dailyRankings.championship = {
                rank: championshipRank !== -1 ? championshipRank + 1 : allUsers.length,
                score: currentScore, // 누적 점수는 업데이트된 상태이지만, 변화표는 변화없음으로 시작
                lastUpdated: now
            };
        } else {
            // 월요일이 아닌 경우: 어제 점수를 저장 (0시 직전의 점수)
            // dailyRankings.championship.score가 있으면 그것을 어제 점수로 사용, 없으면 현재 점수를 어제 점수로 설정
            const yesterdayScore = updatedUser.dailyRankings.championship?.score ?? currentScore;
            updatedUser.yesterdayTournamentScore = yesterdayScore;
            
            if (championshipRank !== -1) {
                updatedUser.dailyRankings.championship = {
                    rank: championshipRank + 1,
                    score: currentScore, // 현재 점수로 업데이트
                    lastUpdated: now
                };
            } else {
                // 랭킹에 없는 경우에도 0점으로 기록 (누적 점수가 없는 신규 사용자 등)
                updatedUser.dailyRankings.championship = {
                    rank: allUsers.length, // 마지막 순위
                    score: currentScore,
                    lastUpdated: now
                };
            }
        }
        
        await db.updateUser(updatedUser);
    }
    
    lastDailyRankingUpdateTimestamp = now;
    console.log(`[DailyRanking] Updated daily rankings for ${allUsers.length} users`);
}

// 매일 0시 KST에 일일 퀘스트 초기화 및 토너먼트 상태 리셋
export async function processDailyQuestReset(): Promise<void> {
    const now = Date.now();
    const kstHours = getKSTHours(now);
    const kstMinutes = getKSTMinutes(now);
    const isMidnight = kstHours === 0 && kstMinutes < 5;
    
    if (!isMidnight) {
        return;
    }
    
    // 이미 오늘 처리했는지 확인
    if (lastDailyQuestResetTimestamp !== null) {
        const todayStart = getStartOfDayKST(now);
        const lastResetStart = getStartOfDayKST(lastDailyQuestResetTimestamp);
        
        if (lastResetStart === todayStart) {
            return; // Already processed today
        }
    }
    
    console.log(`[DailyQuestReset] Processing daily quest reset and tournament state reset at midnight KST`);

    const allUsers = await db.getAllUsers();
    let resetCount = 0;
    let tournamentResetCount = 0;
    let tournamentSessionStartedCount = 0;

    // 모든 사용자에게 토너먼트 세션 자동 시작
    const tournamentTypes: TournamentType[] = ['neighborhood', 'national', 'world'];
    const updatedUsersMap = new Map<string, types.User>();

    for (const user of allUsers) {
        let updatedUser = await resetAndGenerateQuests(user);
        
        // Check if quests or tournament states were actually reset
        const questsChanged = JSON.stringify(user.quests) !== JSON.stringify(updatedUser.quests);
        const tournamentStatesChanged = 
            user.lastNeighborhoodTournament !== updatedUser.lastNeighborhoodTournament ||
            user.lastNationalTournament !== updatedUser.lastNationalTournament ||
            user.lastWorldTournament !== updatedUser.lastWorldTournament ||
            user.lastNeighborhoodPlayedDate !== updatedUser.lastNeighborhoodPlayedDate ||
            user.lastNationalPlayedDate !== updatedUser.lastNationalPlayedDate ||
            user.lastWorldPlayedDate !== updatedUser.lastWorldPlayedDate;
        
        if (questsChanged || tournamentStatesChanged) {
            await db.updateUser(updatedUser);
            resetCount++;
            if (tournamentStatesChanged) {
                tournamentResetCount++;
            }
        }

        // 각 토너먼트 타입에 대해 세션 시작 시도
        // 매일 0시에 토너먼트 상태가 리셋되었으므로, 모든 사용자에게 새로운 토너먼트 세션을 시작
        for (const tournamentType of tournamentTypes) {
            try {
                // 최신 유저 데이터 가져오기
                const freshUser = await db.getUser(user.id);
                if (!freshUser) continue;

                // forceNew = true: 매일 0시 자동 시작이므로 무조건 새 토너먼트 시작
                const result = await startTournamentSessionForUser(freshUser, tournamentType, true, true);
                if (result.success && result.updatedUser) {
                    updatedUser = result.updatedUser;
                    updatedUsersMap.set(user.id, updatedUser);
                    tournamentSessionStartedCount++;
                } else if (result.error) {
                    console.warn(`[DailyQuestReset] Failed to start tournament session for user ${freshUser.id}, type ${tournamentType}: ${result.error}`);
                }
            } catch (error) {
                console.error(`[DailyQuestReset] Failed to start tournament session for user ${user.id}, type ${tournamentType}:`, error);
            }
        }
    }

    // 모든 사용자 업데이트를 일괄 브로드캐스트
    if (updatedUsersMap.size > 0) {
        const usersToBroadcast: Record<string, types.User> = {};
        for (const [userId, updatedUser] of updatedUsersMap) {
            usersToBroadcast[userId] = updatedUser;
        }
        broadcast({ type: 'USER_UPDATE', payload: usersToBroadcast });
    }

    lastDailyQuestResetTimestamp = now;
    console.log(`[DailyQuestReset] Reset daily quests for ${resetCount} users, tournament states for ${tournamentResetCount} users, started tournament sessions for ${tournamentSessionStartedCount} user-tournament combinations`);
}

// 매일 0시 KST에 도전의 탑 랭킹 보상 지급
export async function processTowerRankingRewards(): Promise<void> {
    const now = Date.now();
    const kstHours = getKSTHours(now);
    const kstMinutes = getKSTMinutes(now);
    const kstDate = getKSTDate_UTC(now);
    const isMidnight = kstHours === 0 && kstMinutes < 5;
    
    // 디버깅: 현재 KST 시간 정보 로그
    if (process.env.NODE_ENV === 'development' && kstHours === 0) {
        console.log(`[TowerRankingReward] Checking: KST Date=${kstDate}, Hours=${kstHours}, Minutes=${kstMinutes}, isMidnight=${isMidnight}`);
    }
    
    if (!isMidnight) {
        return;
    }
    
    // 이미 오늘 처리했는지 확인
    if (lastTowerRankingRewardTimestamp !== null) {
        const todayStart = getStartOfDayKST(now);
        const lastUpdateStart = getStartOfDayKST(lastTowerRankingRewardTimestamp);
        
        if (lastUpdateStart === todayStart) {
            return; // Already processed today
        }
    }
    
    console.log(`[TowerRankingReward] Processing tower ranking rewards at midnight KST`);
    
    const allUsers = await db.getAllUsers();
    
    // 1층 이상 클리어한 사용자만 필터링
    const eligibleUsers = allUsers.filter(user => {
        const towerFloor = (user as any).towerFloor ?? 0;
        return towerFloor > 0;
    });
    
    // 랭킹 계산: 층수 높은 순, 같은 층이면 먼저 클리어한 순
    const sortedUsers = eligibleUsers.sort((a, b) => {
        const floorA = (a as any).towerFloor ?? 0;
        const floorB = (b as any).towerFloor ?? 0;
        
        if (floorA !== floorB) {
            return floorB - floorA; // 층수 높은 순
        }
        
        // 같은 층이면 먼저 클리어한 순
        const timeA = (a as any).lastTowerClearTime ?? Infinity;
        const timeB = (b as any).lastTowerClearTime ?? Infinity;
        return timeA - timeB;
    });
    
    // 보상 정의
    const getRewardForRank = (rank: number): { gold: number; diamonds: number; items: { itemId: string; quantity: number }[] } => {
        if (rank === 1) {
            return {
                gold: 50000,
                diamonds: 300,
                items: [{ itemId: '장비상자6', quantity: 3 }]
            };
        } else if (rank === 2) {
            return {
                gold: 30000,
                diamonds: 200,
                items: [{ itemId: '장비상자6', quantity: 2 }]
            };
        } else if (rank >= 3 && rank <= 5) {
            return {
                gold: 20000,
                diamonds: 150,
                items: [{ itemId: '장비상자6', quantity: 1 }]
            };
        } else if (rank >= 6 && rank <= 10) {
            return {
                gold: 10000,
                diamonds: 100,
                items: [{ itemId: '장비상자5', quantity: 1 }]
            };
        } else if (rank >= 11 && rank <= 50) {
            return {
                gold: 7500,
                diamonds: 75,
                items: [{ itemId: '장비상자4', quantity: 2 }]
            };
        } else if (rank >= 51 && rank <= 100) {
            return {
                gold: 5000,
                diamonds: 50,
                items: [{ itemId: '장비상자4', quantity: 1 }]
            };
        }
        // 순위권 밖 (101위 이상이지만 1층 이상 클리어)
        return {
            gold: 1000,
            diamonds: 25,
            items: [{ itemId: '장비상자3', quantity: 1 }]
        };
    };
    
    // 각 사용자에게 보상 지급
    let rewardCount = 0;
    for (let i = 0; i < sortedUsers.length; i++) {
        const user = sortedUsers[i];
        const rank = i + 1;
        const reward = getRewardForRank(rank);
        
        // 메일 생성
        const mailTitle = `도전의 탑 랭킹 보상 (${rank}위)`;
        const mailMessage = `도전의 탑 랭킹에서 ${rank}위를 기록하셨습니다.\n\n보상이 지급되었습니다. 30일 이내에 수령해주세요.`;
        
        const mail: types.Mail = {
            id: `mail-tower-ranking-${randomUUID()}`,
            from: 'System',
            title: mailTitle,
            message: mailMessage,
            attachments: {
                gold: reward.gold,
                diamonds: reward.diamonds,
                items: reward.items
            },
            receivedAt: now,
            expiresAt: now + 30 * 24 * 60 * 60 * 1000, // 30 days
            isRead: false,
            attachmentsClaimed: false,
        };
        
        if (!user.mail) user.mail = [];
        user.mail.unshift(mail);
        
        await db.updateUser(user);
        rewardCount++;
    }
    
    lastTowerRankingRewardTimestamp = now;
    console.log(`[TowerRankingReward] Sent rewards to ${rewardCount} users`);
}