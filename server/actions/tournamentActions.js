import * as db from '../db.js';
import { LeagueTier, CoreStat } from '../../types.js';
import { TOURNAMENT_DEFINITIONS, BOT_NAMES, AVATAR_POOL } from '../../constants.js';
import * as tournamentService from '../tournamentService.js';
import { calculateTotalStats } from '../statService.js';
import { handleRewardAction } from './rewardActions.js';
const LEAGUE_BOT_STATS = {
    [LeagueTier.Sprout]: 100,
    [LeagueTier.Rookie]: 120,
    [LeagueTier.Rising]: 140,
    [LeagueTier.Ace]: 160,
    [LeagueTier.Diamond]: 200,
    [LeagueTier.Master]: 240,
    [LeagueTier.Grandmaster]: 275,
    [LeagueTier.Challenger]: 300,
};
const TOURNAMENT_BOT_STAT_MULTIPLIER = {
    neighborhood: 0.8,
    national: 1.0,
    world: 1.2,
};
const createBotStats = (league, tournamentType) => {
    const baseStatValue = LEAGUE_BOT_STATS[league] || 100;
    const multiplier = TOURNAMENT_BOT_STAT_MULTIPLIER[tournamentType] || 1.0;
    const finalStatValue = Math.round(baseStatValue * multiplier);
    const stats = {};
    for (const key of Object.values(CoreStat)) {
        stats[key] = finalStatValue;
    }
    return stats;
};
export const handleTournamentAction = async (volatileState, action, user) => {
    const { type, payload } = action;
    const now = Date.now();
    switch (type) {
        case 'START_TOURNAMENT_SESSION': {
            const { type } = payload;
            const definition = TOURNAMENT_DEFINITIONS[type];
            if (!definition)
                return { error: '유효하지 않은 토너먼트 타입입니다.' };
            let stateKey;
            let playedDateKey;
            switch (type) {
                case 'neighborhood':
                    stateKey = 'lastNeighborhoodTournament';
                    playedDateKey = 'lastNeighborhoodPlayedDate';
                    break;
                case 'national':
                    stateKey = 'lastNationalTournament';
                    playedDateKey = 'lastNationalPlayedDate';
                    break;
                case 'world':
                    stateKey = 'lastWorldTournament';
                    playedDateKey = 'lastWorldPlayedDate';
                    break;
                default:
                    return { error: 'Invalid tournament type.' };
            }
            const activeTournament = volatileState.activeTournaments?.[user.id];
            if (activeTournament && activeTournament.type === type) {
                return { clientResponse: { redirectToTournament: type } };
            }
            const existingState = user[stateKey];
            if (existingState) {
                // Session exists. Update the user's stats within it before returning.
                const userInTournament = existingState.players.find(p => p.id === user.id);
                if (userInTournament) {
                    userInTournament.stats = calculateTotalStats(user);
                    userInTournament.avatarId = user.avatarId;
                    userInTournament.borderId = user.borderId;
                }
                user[stateKey] = existingState; // Re-assign to mark for update
                await db.updateUser(user);
                return { clientResponse: { redirectToTournament: type } };
            }
            // if ((user as any)[playedDateKey] && isSameDayKST((user as any)[playedDateKey], now) && !user.isAdmin) {
            //     return { error: '이미 오늘 참가한 토너먼트입니다.' };
            // }
            const allUsers = await db.getAllUsers();
            const myLeague = user.league;
            const myId = user.id;
            const potentialOpponents = allUsers
                .filter(u => u.id !== myId && u.league === myLeague)
                .sort(() => 0.5 - Math.random());
            const neededOpponents = definition.players - 1;
            const selectedOpponents = potentialOpponents.slice(0, neededOpponents);
            const botsToCreate = neededOpponents - selectedOpponents.length;
            const botNames = [...BOT_NAMES].sort(() => 0.5 - Math.random());
            for (let i = 0; i < botsToCreate; i++) {
                const botName = botNames[i % botNames.length];
                const botAvatar = AVATAR_POOL[Math.floor(Math.random() * AVATAR_POOL.length)];
                selectedOpponents.push({
                    id: `bot-${botName}-${i}`,
                    nickname: botName,
                    avatarId: botAvatar.id,
                    borderId: 'default',
                    league: myLeague,
                });
            }
            const participants = [user, ...selectedOpponents].map(p => {
                const initialStats = p.id.startsWith('bot-') ? createBotStats(p.league, type) : calculateTotalStats(p);
                return {
                    id: p.id,
                    nickname: p.nickname,
                    avatarId: p.avatarId,
                    borderId: p.borderId,
                    league: p.league,
                    stats: JSON.parse(JSON.stringify(initialStats)), // Mutable copy for simulation
                    originalStats: initialStats, // Store the original stats
                    wins: 0,
                    losses: 0,
                    condition: 1000, // Initialize with a magic number for "not set"
                };
            });
            const shuffledParticipants = [participants[0], ...participants.slice(1).sort(() => 0.5 - Math.random())];
            const newState = tournamentService.createTournament(type, user, shuffledParticipants);
            user[stateKey] = newState;
            user[playedDateKey] = now;
            await db.updateUser(user);
            return { clientResponse: { redirectToTournament: type } };
        }
        case 'START_TOURNAMENT_ROUND': {
            const { type } = payload;
            let stateKey;
            switch (type) {
                case 'neighborhood':
                    stateKey = 'lastNeighborhoodTournament';
                    break;
                case 'national':
                    stateKey = 'lastNationalTournament';
                    break;
                case 'world':
                    stateKey = 'lastWorldTournament';
                    break;
                default: return { error: 'Invalid tournament type.' };
            }
            // Get the most up-to-date user data from DB, which includes the latest tournament state.
            const freshUser = await db.getUser(user.id);
            if (!freshUser)
                return { error: 'User not found in DB.' };
            const tournamentState = freshUser[stateKey];
            if (!tournamentState)
                return { error: '토너먼트 정보를 찾을 수 없습니다.' };
            // Now that we have the fresh state, start the next round. This will mutate tournamentState.
            tournamentService.startNextRound(tournamentState, freshUser);
            // The state object on the user is already mutated, so just save the user.
            await db.updateUser(freshUser);
            // Update volatile state as well for immediate consistency
            if (!volatileState.activeTournaments)
                volatileState.activeTournaments = {};
            return { clientResponse: { redirectToTournament: type } };
        }
        case 'SKIP_TOURNAMENT_END': {
            const { type } = payload;
            let stateKey;
            switch (type) {
                case 'neighborhood':
                    stateKey = 'lastNeighborhoodTournament';
                    break;
                case 'national':
                    stateKey = 'lastNationalTournament';
                    break;
                case 'world':
                    stateKey = 'lastWorldTournament';
                    break;
                default: return { error: 'Invalid tournament type.' };
            }
            const freshUser = await db.getUser(user.id);
            if (!freshUser)
                return { error: 'User not found' };
            const tournamentState = freshUser[stateKey];
            if (!tournamentState)
                return { error: '토너먼트 정보를 찾을 수 없습니다.' };
            if (tournamentState) {
                tournamentService.skipToResults(tournamentState, user.id);
                freshUser[stateKey] = tournamentState;
                await db.updateUser(freshUser);
                if (volatileState.activeTournaments?.[user.id]) {
                    delete volatileState.activeTournaments[user.id];
                }
            }
            return {};
        }
        case 'FORFEIT_TOURNAMENT': {
            const { type } = payload;
            let stateKey;
            switch (type) {
                case 'neighborhood':
                    stateKey = 'lastNeighborhoodTournament';
                    break;
                case 'national':
                    stateKey = 'lastNationalTournament';
                    break;
                case 'world':
                    stateKey = 'lastWorldTournament';
                    break;
                default: return { error: 'Invalid tournament type.' };
            }
            let tournamentState = volatileState.activeTournaments?.[user.id];
            if (!tournamentState) {
                tournamentState = user[stateKey];
                if (!tournamentState)
                    return { error: '토너먼트 정보를 찾을 수 없습니다.' };
            }
            if (tournamentState) {
                tournamentService.forfeitTournament(tournamentState, user.id);
                user[stateKey] = tournamentState;
                await db.updateUser(user);
                if (volatileState.activeTournaments) {
                    delete volatileState.activeTournaments[user.id];
                }
            }
            return {};
        }
        case 'SAVE_TOURNAMENT_PROGRESS': {
            const { type } = payload;
            const tournamentState = volatileState.activeTournaments?.[user.id];
            if (tournamentState) {
                let stateKey;
                switch (type) {
                    case 'neighborhood':
                        stateKey = 'lastNeighborhoodTournament';
                        break;
                    case 'national':
                        stateKey = 'lastNationalTournament';
                        break;
                    case 'world':
                        stateKey = 'lastWorldTournament';
                        break;
                    default: return { error: 'Invalid tournament type.' };
                }
                user[stateKey] = tournamentState;
                await db.updateUser(user);
                if (volatileState.activeTournaments) {
                    delete volatileState.activeTournaments[user.id];
                }
            }
            return {};
        }
        case 'CLEAR_TOURNAMENT_SESSION': {
            const { type } = payload;
            if (type) {
                let stateKey;
                switch (type) {
                    case 'neighborhood':
                        stateKey = 'lastNeighborhoodTournament';
                        break;
                    case 'national':
                        stateKey = 'lastNationalTournament';
                        break;
                    case 'world':
                        stateKey = 'lastWorldTournament';
                        break;
                    default: return { error: 'Invalid tournament type.' };
                }
                user[stateKey] = null;
            }
            else {
                user.lastNeighborhoodTournament = null;
                user.lastNationalTournament = null;
                user.lastWorldTournament = null;
            }
            if (volatileState.activeTournaments?.[user.id]) {
                if (!type || volatileState.activeTournaments[user.id].type === type) {
                    delete volatileState.activeTournaments[user.id];
                }
            }
            await db.updateUser(user);
            return {};
        }
        case 'CLAIM_TOURNAMENT_REWARD': {
            return handleRewardAction(volatileState, action, user);
        }
        default:
            return { error: `Action ${type} is not handled by tournamentActions.` };
    }
};
