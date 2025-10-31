import { randomUUID } from 'crypto';
import * as db from '../db.js';
import { type ServerAction, type User, type VolatileState, TournamentType, PlayerForTournament, InventoryItem, InventoryItemType, TournamentState, LeagueTier, CoreStat } from '../../types.js';
import * as types from '../../types.js';
import { TOURNAMENT_DEFINITIONS, BASE_TOURNAMENT_REWARDS, CONSUMABLE_ITEMS, MATERIAL_ITEMS, TOURNAMENT_SCORE_REWARDS, BOT_NAMES, AVATAR_POOL } from '../../constants.js';
import { updateQuestProgress } from '../questService.js';
import { createItemFromTemplate, SHOP_ITEMS } from '../shop.js';
import { isSameDayKST } from '../../utils/timeUtils.js';
import * as tournamentService from '../tournamentService.js';
import { addItemsToInventory, createItemInstancesFromReward } from '../../utils/inventoryUtils.js';
import { calculateTotalStats } from '../statService.js';
import { handleRewardAction } from './rewardActions.js';


type HandleActionResult = { 
    clientResponse?: any;
    error?: string;
};

const LEAGUE_BOT_STATS: Record<LeagueTier, number> = {
    [LeagueTier.Sprout]: 100,
    [LeagueTier.Rookie]: 120,
    [LeagueTier.Rising]: 140,
    [LeagueTier.Ace]: 160,
    [LeagueTier.Diamond]: 200,
    [LeagueTier.Master]: 240,
    [LeagueTier.Grandmaster]: 275,
    [LeagueTier.Challenger]: 300,
};

const TOURNAMENT_BOT_STAT_MULTIPLIER: Record<TournamentType, number> = {
    neighborhood: 0.8,
    national: 1.0,
    world: 1.2,
};

const createBotStats = (league: LeagueTier, tournamentType: TournamentType): Record<CoreStat, number> => {
    const baseStatValue = LEAGUE_BOT_STATS[league] || 100;
    const multiplier = TOURNAMENT_BOT_STAT_MULTIPLIER[tournamentType] || 1.0;
    const finalStatValue = Math.round(baseStatValue * multiplier);

    const stats: Partial<Record<CoreStat, number>> = {};
    for (const key of Object.values(CoreStat)) {
        stats[key] = finalStatValue;
    }
    return stats as Record<CoreStat, number>;
};


export const handleTournamentAction = async (volatileState: VolatileState, action: ServerAction & { userId: string }, user: User): Promise<HandleActionResult> => {
    const { type, payload } = action;
    const now = Date.now();

    switch (type) {
        case 'START_TOURNAMENT_SESSION': {
            const { type } = payload as { type: TournamentType };
            const definition = TOURNAMENT_DEFINITIONS[type];
            if (!definition) return { error: '유효하지 않은 토너먼트 타입입니다.' };
            
            let stateKey: keyof User;
            let playedDateKey: keyof User;
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

            const existingState = (user as any)[stateKey] as TournamentState | null;

            if (existingState) {
                // Session exists. Update the user's stats within it before returning.
                const userInTournament = existingState.players.find(p => p.id === user.id);
                if (userInTournament) {
                    userInTournament.stats = calculateTotalStats(user);
                    userInTournament.avatarId = user.avatarId;
                    userInTournament.borderId = user.borderId;
                }
                (user as any)[stateKey] = existingState; // Re-assign to mark for update
                await db.updateUser(user);
                return {};
            }

            if ((user as any)[playedDateKey] && isSameDayKST((user as any)[playedDateKey], now) && !user.isAdmin) {
                return { error: '이미 오늘 참가한 토너먼트입니다.' };
            }
            
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
                } as any);
            }
            
            const participants: PlayerForTournament[] = [user, ...selectedOpponents].map(p => {
                const initialStats = p.id.startsWith('bot-') ? createBotStats(p.league as LeagueTier, type) : calculateTotalStats(p as User);
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
            (user as any)[stateKey] = newState;
            (user as any)[playedDateKey] = now;
            
            updateQuestProgress(user, 'tournament_participate');

            await db.updateUser(user);
            return {};
        }

        case 'START_TOURNAMENT_ROUND': {
            const { type } = payload as { type: TournamentType };
            let stateKey: keyof User;
            switch (type) {
                case 'neighborhood': stateKey = 'lastNeighborhoodTournament'; break;
                case 'national': stateKey = 'lastNationalTournament'; break;
                case 'world': stateKey = 'lastWorldTournament'; break;
                default: return { error: 'Invalid tournament type.' };
            }
            
            // Get the most up-to-date user data from DB, which includes the latest tournament state.
            const freshUser = await db.getUser(user.id);
            if (!freshUser) return { error: 'User not found in DB.' };

            const tournamentState = (freshUser as any)[stateKey] as types.TournamentState | null;
            if (!tournamentState) return { error: '토너먼트 정보를 찾을 수 없습니다.' };
            
            // Now that we have the fresh state, start the next round. This will mutate tournamentState.
            tournamentService.startNextRound(tournamentState, freshUser);
            
            // The state object on the user is already mutated, so just save the user.
            await db.updateUser(freshUser);
            
            // Update volatile state as well for immediate consistency
            if (!volatileState.activeTournaments) volatileState.activeTournaments = {};
            volatileState.activeTournaments[user.id] = tournamentState;

            return {};
        }

        case 'SKIP_TOURNAMENT_END': {
            const { type } = payload as { type: TournamentType };
            let stateKey: keyof User;
            switch (type) {
                case 'neighborhood': stateKey = 'lastNeighborhoodTournament'; break;
                case 'national': stateKey = 'lastNationalTournament'; break;
                case 'world': stateKey = 'lastWorldTournament'; break;
                default: return { error: 'Invalid tournament type.' };
            }
            
            const freshUser = await db.getUser(user.id);
            if (!freshUser) return { error: 'User not found' };
        
            const tournamentState = (freshUser as any)[stateKey] as TournamentState | null;
            if (!tournamentState) return { error: '토너먼트 정보를 찾을 수 없습니다.' };
            
            if (tournamentState) {
                tournamentService.skipToResults(tournamentState, user.id);
            
                (freshUser as any)[stateKey] = tournamentState;
                await db.updateUser(freshUser);
        
                if (volatileState.activeTournaments?.[user.id]) {
                    delete volatileState.activeTournaments[user.id];
                }
            }
            
            return {};
        }
        
        case 'FORFEIT_TOURNAMENT': {
            const { type } = payload as { type: TournamentType };
            let stateKey: keyof User;
            switch (type) {
                case 'neighborhood': stateKey = 'lastNeighborhoodTournament'; break;
                case 'national': stateKey = 'lastNationalTournament'; break;
                case 'world': stateKey = 'lastWorldTournament'; break;
                default: return { error: 'Invalid tournament type.' };
            }
            let tournamentState: types.TournamentState | null | undefined = volatileState.activeTournaments?.[user.id];

            if (!tournamentState) {
                tournamentState = (user as any)[stateKey] as types.TournamentState | null;
                 if (!tournamentState) return { error: '토너먼트 정보를 찾을 수 없습니다.' };
            }
            
            if (tournamentState) {
                tournamentService.forfeitTournament(tournamentState, user.id);
            
                (user as any)[stateKey] = tournamentState;
                await db.updateUser(user);

                if (volatileState.activeTournaments) {
                    delete volatileState.activeTournaments[user.id];
                }
            }
            
            return {};
        }

        case 'SAVE_TOURNAMENT_PROGRESS': {
            const { type } = payload as { type: TournamentType };
            const tournamentState = volatileState.activeTournaments?.[user.id];
            
            if (tournamentState) {
                let stateKey: keyof User;
                switch (type) {
                    case 'neighborhood': stateKey = 'lastNeighborhoodTournament'; break;
                    case 'national': stateKey = 'lastNationalTournament'; break;
                    case 'world': stateKey = 'lastWorldTournament'; break;
                    default: return { error: 'Invalid tournament type.' };
                }
                (user as any)[stateKey] = tournamentState;
                await db.updateUser(user);
                if (volatileState.activeTournaments) {
                    delete volatileState.activeTournaments[user.id];
                }
            }
            return {};
        }

        case 'CLEAR_TOURNAMENT_SESSION': {
            const { type } = payload as { type?: TournamentType };
            if (type) {
                let stateKey: keyof User;
                switch (type) {
                    case 'neighborhood': stateKey = 'lastNeighborhoodTournament'; break;
                    case 'national': stateKey = 'lastNationalTournament'; break;
                    case 'world': stateKey = 'lastWorldTournament'; break;
                    default: return { error: 'Invalid tournament type.' };
                }
                (user as any)[stateKey] = null;
            } else {
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