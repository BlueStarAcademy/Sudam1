import { randomUUID } from 'crypto';
import * as db from '../db.js';
import { type ServerAction, type User, type VolatileState, TournamentType, PlayerForTournament, InventoryItem, InventoryItemType, TournamentState, LeagueTier, CoreStat, EquipmentSlot, ItemGrade } from '../../types.js';
import * as types from '../../types.js';
import { TOURNAMENT_DEFINITIONS, BASE_TOURNAMENT_REWARDS, CONSUMABLE_ITEMS, MATERIAL_ITEMS, TOURNAMENT_SCORE_REWARDS, BOT_NAMES, AVATAR_POOL, BORDER_POOL } from '../../constants';
import { updateQuestProgress } from '../questService.js';
import { createItemFromTemplate, SHOP_ITEMS } from '../shop.js';
import { isSameDayKST, getStartOfDayKST } from '../../utils/timeUtils.js';
import * as tournamentService from '../tournamentService.js';
import { addItemsToInventory, createItemInstancesFromReward } from '../../utils/inventoryUtils.js';
import { calculateTotalStats } from '../statService.js';
import { handleRewardAction } from './rewardActions.js';
import { generateNewItem } from './inventoryActions.js';
import { broadcast } from '../socket.js';
import { createDefaultQuests } from '../initialData.js';


type HandleActionResult = { 
    clientResponse?: any;
    error?: string;
};

const ALL_SLOTS: EquipmentSlot[] = ['fan', 'board', 'top', 'bottom', 'bowl', 'stones'];
const GRADE_ORDER: ItemGrade[] = ['normal', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

const getRandomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// 리그별 봇 설정
const LEAGUE_BOT_CONFIG: Record<LeagueTier, {
    minLevel: number;
    maxLevel: number;
    minStat: number;
    maxStat: number;
    equipmentGrade: ItemGrade;
}> = {
    [LeagueTier.Sprout]: {
        minLevel: 5,
        maxLevel: 10,
        minStat: 100,
        maxStat: 120,
        equipmentGrade: 'rare', // 고급장비 (rare/epic)
    },
    [LeagueTier.Rookie]: {
        minLevel: 8,
        maxLevel: 15,
        minStat: 110,
        maxStat: 135,
        equipmentGrade: 'rare',
    },
    [LeagueTier.Rising]: {
        minLevel: 12,
        maxLevel: 20,
        minStat: 125,
        maxStat: 150,
        equipmentGrade: 'epic',
    },
    [LeagueTier.Ace]: {
        minLevel: 18,
        maxLevel: 28,
        minStat: 145,
        maxStat: 170,
        equipmentGrade: 'epic',
    },
    [LeagueTier.Diamond]: {
        minLevel: 25,
        maxLevel: 35,
        minStat: 165,
        maxStat: 190,
        equipmentGrade: 'legendary',
    },
    [LeagueTier.Master]: {
        minLevel: 32,
        maxLevel: 42,
        minStat: 180,
        maxStat: 210,
        equipmentGrade: 'legendary',
    },
    [LeagueTier.Grandmaster]: {
        minLevel: 40,
        maxLevel: 48,
        minStat: 195,
        maxStat: 225,
        equipmentGrade: 'legendary',
    },
    [LeagueTier.Challenger]: {
        minLevel: 45,
        maxLevel: 50,
        minStat: 200,
        maxStat: 230,
        equipmentGrade: 'mythic', // 신화장비
    },
};

// 봇 생성 함수: 리그별 설정에 따라 랜덤 레벨, 장비, 능력치로 봇 User 객체 생성
export const createBotUser = (league: LeagueTier, tournamentType: TournamentType, botId: string, botName: string, botAvatar: { id: string }, botBorder: { id: string }): User => {
    const config = LEAGUE_BOT_CONFIG[league] || LEAGUE_BOT_CONFIG[LeagueTier.Sprout];
    
    // 1. 리그별 레벨 범위에서 랜덤 생성
    const strategyLevel = getRandomInt(config.minLevel, config.maxLevel);
    const playfulLevel = getRandomInt(config.minLevel, config.maxLevel);
    
    // 2. 리그별 장비 등급으로 장비 생성
    const inventory: InventoryItem[] = [];
    const equipment: Record<EquipmentSlot, string> = {} as any;
    
    for (const slot of ALL_SLOTS) {
        // 리그별 지정된 등급으로 아이템 생성
        // 고급장비(rare)의 경우 rare 또는 epic 중 랜덤 선택
        let selectedGrade: ItemGrade = config.equipmentGrade;
        
        if (config.equipmentGrade === 'rare') {
            // rare 리그: rare(70%) 또는 epic(30%)
            selectedGrade = Math.random() < 0.7 ? 'rare' : 'epic';
        } else if (config.equipmentGrade === 'epic') {
            // epic 리그: epic(80%) 또는 legendary(20%)
            selectedGrade = Math.random() < 0.8 ? 'epic' : 'legendary';
        } else if (config.equipmentGrade === 'legendary') {
            // legendary 리그: legendary(85%) 또는 mythic(15%)
            selectedGrade = Math.random() < 0.85 ? 'legendary' : 'mythic';
        }
        // mythic 리그는 항상 mythic
        
        // 아이템 생성 및 장착
        const item = generateNewItem(selectedGrade, slot);
        item.isEquipped = true;
        inventory.push(item);
        equipment[slot] = item.name;
    }
    
    // 3. 리그별 능력치 범위에서 랜덤 생성
    const tournamentMultiplier: Record<TournamentType, number> = {
        neighborhood: 0.8,
        national: 1.0,
        world: 1.2,
    };
    const multiplier = tournamentMultiplier[tournamentType] || 1.0;
    
    const baseStats: Record<CoreStat, number> = {} as any;
    const spentStatPoints: Record<CoreStat, number> = {} as any;
    
    // 각 능력치를 리그별 범위 내에서 랜덤 생성
    for (const stat of Object.values(CoreStat)) {
        // baseStats는 리그별 범위에서 랜덤 생성 후 토너먼트 타입에 따른 보정 적용
        const baseStatValue = getRandomInt(config.minStat, config.maxStat);
        baseStats[stat] = Math.round(baseStatValue * multiplier);
        
        // spentStatPoints는 레벨에 따라 분배 (각 레벨당 2포인트씩)
        const totalPoints = (strategyLevel + playfulLevel) * 2;
        // 각 능력치에 고르게 분배하되 약간의 랜덤 변동 추가
        spentStatPoints[stat] = Math.floor(totalPoints / 6) + getRandomInt(-3, 3);
        spentStatPoints[stat] = Math.max(0, spentStatPoints[stat]);
    }
    
    // 봇 User 객체 생성
    const botUser: User = {
        id: botId,
        username: `bot_${botId}`,
        nickname: botName,
        isAdmin: false,
        strategyLevel,
        strategyXp: 0,
        playfulLevel,
        playfulXp: 0,
        blacksmithLevel: 1,
        blacksmithXp: 0,
        baseStats,
        spentStatPoints,
        inventory,
        inventorySlots: { equipment: 40, consumable: 40, material: 40 },
        equipment,
        actionPoints: { current: 0, max: 0 },
        lastActionPointUpdate: Date.now(),
        actionPointPurchasesToday: 0,
        lastActionPointPurchaseDate: 0,
        dailyShopPurchases: {},
        gold: 0,
        diamonds: 0,
        mannerScore: 100,
        mail: [],
        quests: createDefaultQuests(),
        stats: {}, // 게임 모드별 전적 정보 (봇은 빈 객체)
        avatarId: botAvatar.id,
        borderId: botBorder.id,
        ownedBorders: [botBorder.id],
        tournamentScore: 0,
        league,
    };
    
    return botUser;
};


// 토너먼트 세션을 시작하는 헬퍼 함수 (재사용 가능)
export const startTournamentSessionForUser = async (user: User, tournamentType: TournamentType, skipBroadcast = false, forceNew = false): Promise<{ success: boolean; error?: string; updatedUser?: User }> => {
    const definition = TOURNAMENT_DEFINITIONS[tournamentType];
    if (!definition) return { success: false, error: '유효하지 않은 토너먼트 타입입니다.' };
    
    let stateKey: keyof User;
    let playedDateKey: keyof User;
    switch (tournamentType) {
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
            return { success: false, error: 'Invalid tournament type.' };
    }

    const now = Date.now();
    const existingState = (user as any)[stateKey] as TournamentState | null;

    // forceNew가 false이고 이미 토너먼트가 있으면 업데이트만 하고 반환
    // forceNew가 true이면 (매일 0시 자동 시작) 무조건 새 토너먼트 시작
    if (!forceNew && existingState) {
        const userInTournament = existingState.players.find(p => p.id === user.id);
        if (userInTournament) {
            // 능력치는 토너먼트 생성 시점(0시)의 originalStats로 고정되어 있으므로 업데이트하지 않음
            // PVE처럼 클론과 대결하는 구조이므로, 토너먼트 중 능력치 변경은 반영되지 않음
            // 아바타와 테두리만 업데이트 (시각적 정보만 최신 상태로 유지)
            userInTournament.avatarId = user.avatarId;
            userInTournament.borderId = user.borderId;
        }
        (user as any)[stateKey] = existingState;
        await db.updateUser(user);
        return { success: true, updatedUser: user };
    }

    // forceNew가 true인 경우, 기존 토너먼트가 완료되지 않았어도 새로 시작
    // (매일 0시에 리셋 후 자동 시작하는 경우)
    
    // 최신 유저 데이터 가져오기 (능력치가 최신 상태인지 확인)
    const freshUser = await db.getUser(user.id);
    if (!freshUser) return { success: false, error: 'User not found in DB.' };
    
    const allUsers = await db.getAllUsers();
    // allUsers에 현재 유저가 최신 상태로 포함되도록 업데이트
    const currentUserIndex = allUsers.findIndex(u => u.id === freshUser.id);
    if (currentUserIndex !== -1) {
        allUsers[currentUserIndex] = freshUser;
    } else {
        allUsers.push(freshUser);
    }
    
    const myLeague = freshUser.league;
    const myId = freshUser.id;

    // 각 경기장 매칭: 같은 리그에 있는 모든 유저(온라인/오프라인 포함) 중에서 완전 랜덤으로 선택
    // 주간 경쟁 상대(weeklyCompetitors)와는 별개이며, 매칭될 수도 있고 안될 수도 있음 (완전 랜덤)
    // 오프라인 사용자도 포함되어 있으며, 매칭 시점(0시)의 능력치로 고정되어 PVE처럼 클론과 대결하는 구조
    const potentialOpponents = allUsers
        .filter(u => u.id !== myId && u.league === myLeague)
        .sort(() => 0.5 - Math.random()); // 완전 랜덤 셔플
    
    const neededOpponents = definition.players - 1;
    const selectedOpponents = potentialOpponents.slice(0, neededOpponents);
    
    // 같은 리그에 인원이 부족한 경우 봇으로 보완

    const botsToCreate = neededOpponents - selectedOpponents.length;
    const botNames = [...BOT_NAMES].sort(() => 0.5 - Math.random());
    const botUsers: User[] = [];

    for (let i = 0; i < botsToCreate; i++) {
        const botName = botNames[i % botNames.length];
        const botAvatar = AVATAR_POOL[Math.floor(Math.random() * AVATAR_POOL.length)];
        const botBorder = BORDER_POOL[Math.floor(Math.random() * BORDER_POOL.length)];
        const botId = `bot-${botName}-${i}`;
        
        // 랜덤 레벨, 장비, 능력치로 봇 생성
        const botUser = createBotUser(myLeague, tournamentType, botId, botName, botAvatar, botBorder);
        botUsers.push(botUser);
        
        selectedOpponents.push({
            id: botId,
            nickname: botName,
            avatarId: botAvatar.id,
            borderId: botBorder.id,
            league: myLeague,
        } as any);
    }
    
    // 오늘 0시 기준 타임스탬프 (능력치 고정용)
    const todayStartKST = getStartOfDayKST(now);
    
    // 현재 유저를 포함한 모든 참가자 생성
    const allParticipants = [{ id: freshUser.id, nickname: freshUser.nickname, avatarId: freshUser.avatarId, borderId: freshUser.borderId, league: freshUser.league }, ...selectedOpponents];
    
    const participants: PlayerForTournament[] = allParticipants.map(p => {
        let initialStats: Record<CoreStat, number>;
        if (p.id.startsWith('bot-')) {
            // 봇의 경우 생성된 User 객체에서 능력치 가져오기 (고정값)
            const botUser = botUsers.find(b => b.id === p.id);
            if (botUser) {
                // calculateTotalStats로 봇의 최종 능력치 계산
                initialStats = calculateTotalStats(botUser);
            } else {
                // 폴백: 기본 능력치 생성
                const baseStatValue = 100;
                const stats: Partial<Record<CoreStat, number>> = {};
                for (const key of Object.values(CoreStat)) {
                    stats[key] = baseStatValue;
                }
                initialStats = stats as Record<CoreStat, number>;
            }
        } else {
            // 실제 유저의 경우 - allUsers에서 찾아서 매칭 시점(0시)의 능력치로 고정
            // 오프라인/온라인 모두 포함되며, 이 시점의 능력치가 토너먼트 전체에서 사용됨 (PVE 클론 구조)
            const realUser = allUsers.find(u => u.id === p.id);
            if (realUser) {
                // calculateTotalStats는 baseStats + spentStatPoints + 장비 보너스를 모두 계산
                // 이 능력치는 originalStats에 저장되어 토너먼트 전체에서 고정됨
                initialStats = calculateTotalStats(realUser);
            } else {
                // 폴백: 기본 능력치 생성
                const baseStatValue = 100;
                const stats: Partial<Record<CoreStat, number>> = {};
                for (const key of Object.values(CoreStat)) {
                    stats[key] = baseStatValue;
                }
                initialStats = stats as Record<CoreStat, number>;
            }
        }
        
        return {
            id: p.id,
            nickname: p.nickname,
            avatarId: p.avatarId,
            borderId: p.borderId,
            league: p.league,
            stats: JSON.parse(JSON.stringify(initialStats)), // Mutable copy for simulation
            originalStats: initialStats, // Store the original stats (오늘 0시 기준 고정값)
            wins: 0,
            losses: 0,
            condition: 1000, // Initialize with a magic number for "not set"
            statsTimestamp: todayStartKST, // 오늘 0시 기준 타임스탬프 저장
        };
    });
    
    const shuffledParticipants = [participants[0], ...participants.slice(1).sort(() => 0.5 - Math.random())];

    const newState = tournamentService.createTournament(tournamentType, freshUser, shuffledParticipants);
    (freshUser as any)[stateKey] = newState;
    (freshUser as any)[playedDateKey] = now;
    
    await db.updateUser(freshUser);
    
    // 깊은 복사로 updatedUser 생성
    const updatedUser = JSON.parse(JSON.stringify(freshUser));
    
    // WebSocket으로 사용자 업데이트 브로드캐스트 (옵션)
    if (!skipBroadcast) {
        broadcast({ type: 'USER_UPDATE', payload: { [freshUser.id]: updatedUser } });
    }
    
    return { success: true, updatedUser };
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

            const activeTournament = volatileState.activeTournaments?.[user.id];

            if (activeTournament && activeTournament.type === type) {
                return { clientResponse: { redirectToTournament: type } };
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
                return { clientResponse: { redirectToTournament: type } };
            }

            if ((user as any)[playedDateKey] && isSameDayKST((user as any)[playedDateKey], now) && !user.isAdmin) {
                return { error: '이미 오늘 참가한 토너먼트입니다.' };
            }
            
            // 헬퍼 함수 사용
            const result = await startTournamentSessionForUser(user, type, false);
            if (!result.success) {
                return { error: result.error || '토너먼트 세션 시작 실패' };
            }
            
            return { clientResponse: { redirectToTournament: type, updatedUser: result.updatedUser } };
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
            
            // 깊은 복사로 updatedUser 생성하여 React가 변경을 확실히 감지하도록 함
            const updatedUser = JSON.parse(JSON.stringify(freshUser));
            
            // WebSocket으로 사용자 업데이트 브로드캐스트
            broadcast({ type: 'USER_UPDATE', payload: { [freshUser.id]: updatedUser } });
            
            return { clientResponse: { redirectToTournament: type, updatedUser } };
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

        case 'FORFEIT_CURRENT_MATCH': {
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
                tournamentService.forfeitCurrentMatch(tournamentState, user);
            
                (user as any)[stateKey] = tournamentState;
                await db.updateUser(user);

                if (volatileState.activeTournaments) {
                    volatileState.activeTournaments[user.id] = tournamentState;
                }
            }
            
            return { clientResponse: { updatedUser: user } };
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

        case 'USE_CONDITION_POTION': {
            const { tournamentType, potionType } = payload as { tournamentType: TournamentType; potionType: 'small' | 'medium' | 'large' };
            
            // 회복제 타입별 정보
            const potionInfo = {
                small: { name: '컨디션회복제(소)', minRecovery: 1, maxRecovery: 10, price: 100 },
                medium: { name: '컨디션회복제(중)', minRecovery: 10, maxRecovery: 20, price: 150 },
                large: { name: '컨디션회복제(대)', minRecovery: 20, maxRecovery: 30, price: 200 }
            }[potionType];

            if (!potionInfo) {
                return { error: '유효하지 않은 회복제 타입입니다.' };
            }

            let stateKey: keyof User;
            switch (tournamentType) {
                case 'neighborhood': stateKey = 'lastNeighborhoodTournament'; break;
                case 'national': stateKey = 'lastNationalTournament'; break;
                case 'world': stateKey = 'lastWorldTournament'; break;
                default: return { error: 'Invalid tournament type.' };
            }

            // Check if user has condition potion in inventory
            const conditionPotion = user.inventory.find(item => item.name === potionInfo.name && item.type === 'consumable');
            if (!conditionPotion) {
                return { error: `${potionInfo.name}이(가) 없습니다.` };
            }

            // Check if user has enough gold
            if (user.gold < potionInfo.price && !user.isAdmin) {
                return { error: `골드가 부족합니다. (필요: ${potionInfo.price} 골드)` };
            }

            // Get tournament state
            const tournamentState = (user as any)[stateKey] as TournamentState | null;
            if (!tournamentState) {
                return { error: '토너먼트 정보를 찾을 수 없습니다.' };
            }

            // Only allow using condition potion before match starts (not during round_in_progress)
            if (tournamentState.status === 'round_in_progress') {
                return { error: '경기가 진행 중에는 컨디션 회복제를 사용할 수 없습니다.' };
            }

            // Check if user has an upcoming match or current match
            // 경기 시작 전(bracket_ready) 상태에서는 항상 다음 경기가 있거나, 경기 완료 후에도 다음 경기가 있을 수 있음
            const hasUpcomingUserMatch = tournamentState.rounds.some(round => 
                round.matches.some(match => match.isUserMatch && !match.isFinished)
            );

            // 경기 시작 전 상태이거나 다음 경기가 있으면 컨디션 회복제 사용 가능
            if (tournamentState.status !== 'bracket_ready' && !hasUpcomingUserMatch) {
                return { error: '다음 경기가 없습니다.' };
            }

            // Find user player in tournament
            const userPlayer = tournamentState.players.find(p => p.id === user.id);
            if (!userPlayer) {
                return { error: '선수를 찾을 수 없습니다.' };
            }

            // Check if condition is already 100
            if (userPlayer.condition >= 100) {
                return { error: '컨디션이 이미 최대입니다.' };
            }

            // Use condition potion - 인벤토리에서 제거
            // quantity가 1보다 크면 감소, 1이면 배열에서 제거
            if (conditionPotion.quantity && conditionPotion.quantity > 1) {
                conditionPotion.quantity--;
            } else {
                // quantity가 1이거나 undefined인 경우 배열에서 제거
                const itemIndex = user.inventory.findIndex(i => i.id === conditionPotion.id);
                if (itemIndex !== -1) {
                    user.inventory.splice(itemIndex, 1);
                }
            }
            
            // 인벤토리 배열의 참조를 변경하여 React가 변경을 감지하도록 함
            user.inventory = [...user.inventory];

            // Deduct gold
            if (!user.isAdmin) {
                user.gold -= potionInfo.price;
            }

            // Calculate random recovery amount
            const getRandomInt = (min: number, max: number) => {
                return Math.floor(Math.random() * (max - min + 1)) + min;
            };
            const recoveryAmount = getRandomInt(potionInfo.minRecovery, potionInfo.maxRecovery);
            const newCondition = Math.min(100, userPlayer.condition + recoveryAmount);
            userPlayer.condition = newCondition;

            // Save tournament state and user
            try {
                await db.updateUser(user);
                
                // 저장 후 DB에서 다시 읽어서 검증 (인벤토리 변경사항이 확실히 반영되었는지 확인)
                const savedUser = await db.getUser(user.id);
                if (!savedUser) {
                    console.error(`[USE_CONDITION_POTION] User not found after save: ${user.id}`);
                    return { error: '저장 후 사용자를 찾을 수 없습니다.' };
                }
                
                // 저장된 사용자 데이터 사용 (DB에 실제로 저장된 것)
                user = savedUser;
            } catch (error: any) {
                console.error(`[USE_CONDITION_POTION] Error updating user ${user.id}:`, error);
                console.error(`[USE_CONDITION_POTION] Error stack:`, error.stack);
                return { error: '데이터 저장 중 오류가 발생했습니다.' };
            }

            // 깊은 복사로 updatedUser 생성
            const updatedUser = JSON.parse(JSON.stringify(user));

            // WebSocket으로 사용자 업데이트 브로드캐스트
            broadcast({ type: 'USER_UPDATE', payload: { [user.id]: updatedUser } });

            return { 
                clientResponse: { 
                    updatedUser,
                    redirectToTournament: tournamentType
                } 
            };
        }

        case 'START_TOURNAMENT_MATCH': {
            const { type } = payload as { type: TournamentType };
            let stateKey: keyof User;
            switch (type) {
                case 'neighborhood': stateKey = 'lastNeighborhoodTournament'; break;
                case 'national': stateKey = 'lastNationalTournament'; break;
                case 'world': stateKey = 'lastWorldTournament'; break;
                default: return { error: 'Invalid tournament type.' };
            }
            
            // Get the most up-to-date user data from DB
            const freshUser = await db.getUser(user.id);
            if (!freshUser) return { error: 'User not found in DB.' };

            const tournamentState = (freshUser as any)[stateKey] as types.TournamentState | null;
            if (!tournamentState) return { error: '토너먼트 정보를 찾을 수 없습니다.' };
            
            // 유저의 다음 경기 찾기 (상태 확인 전에 먼저 찾기)
            let userMatch: types.Match | null = null;
            let roundIndex = -1;
            let matchIndex = -1;

            if (tournamentState.type === 'neighborhood') {
                const currentRound = tournamentState.currentRoundRobinRound || 1;
                // rounds 배열에서 name이 "1회차", "2회차" 등인 라운드 찾기
                const currentRoundObj = tournamentState.rounds.find(r => r.name === `${currentRound}회차`);
                if (!currentRoundObj) {
                    return { error: `현재 회차(${currentRound}회차)의 라운드를 찾을 수 없습니다.` };
                }
                const match = currentRoundObj.matches.find(m => m.isUserMatch && !m.isFinished);
                if (match) {
                    userMatch = match;
                    // roundIndex는 rounds 배열의 실제 인덱스
                    roundIndex = tournamentState.rounds.findIndex(r => r.id === currentRoundObj.id);
                    matchIndex = currentRoundObj.matches.findIndex(m => m.id === match.id);
                }
            } else {
                // tournament 타입 (national, world)
                for (let i = 0; i < tournamentState.rounds.length; i++) {
                    const round = tournamentState.rounds[i];
                    const match = round.matches.find(m => m.isUserMatch && !m.isFinished);
                    if (match) {
                        userMatch = match;
                        roundIndex = i;
                        matchIndex = round.matches.findIndex(m => m.id === match.id);
                        break;
                    }
                }
            }

            if (!userMatch) {
                return { error: '시작할 유저 경기를 찾을 수 없습니다.' };
            }

            // 경기 시작 전 상태인지 확인 (bracket_ready 또는 round_complete 상태에서 시작 가능)
            // 단, 유저 매치가 있는 경우에만 허용
            if (tournamentState.status !== 'bracket_ready' && tournamentState.status !== 'round_complete') {
                return { error: `경기를 시작할 수 있는 상태가 아닙니다. (현재 상태: ${tournamentState.status})` };
            }
            if (roundIndex === -1 || matchIndex === -1) {
                return { error: `경기 인덱스를 찾을 수 없습니다. (roundIndex: ${roundIndex}, matchIndex: ${matchIndex})` };
            }

            // 경기 시작 전: 유저의 최신 능력치를 계산하여 originalStats 업데이트 및 stats 복구
            const userPlayer = tournamentState.players.find(p => p.id === freshUser.id);
            if (userPlayer) {
                // 유저의 최신 능력치를 계산하여 originalStats와 stats 업데이트
                const latestStats = calculateTotalStats(freshUser);
                userPlayer.originalStats = JSON.parse(JSON.stringify(latestStats));
                userPlayer.stats = JSON.parse(JSON.stringify(latestStats));
            }

            // 경기 상대방의 능력치도 originalStats로 복구
            const match = tournamentState.rounds[roundIndex].matches[matchIndex];
            if (match.players[0] && match.players[1]) {
                const p1 = tournamentState.players.find(p => p.id === match.players[0]!.id);
                const p2 = tournamentState.players.find(p => p.id === match.players[1]!.id);
                
                if (p1 && p1.originalStats) {
                    p1.stats = JSON.parse(JSON.stringify(p1.originalStats));
                }
                if (p2 && p2.originalStats) {
                    p2.stats = JSON.parse(JSON.stringify(p2.originalStats));
                }
            }

            // 경기 시작: 상태를 round_in_progress로 변경
            tournamentState.status = 'round_in_progress';
            tournamentState.currentSimulatingMatch = { roundIndex, matchIndex };
            tournamentState.currentMatchCommentary = [];
            tournamentState.timeElapsed = 0;
            tournamentState.currentMatchScores = { player1: 0, player2: 0 };
            tournamentState.lastSimulationTime = Date.now() - 1100; // 시뮬레이션 시작 직전 시간으로 설정하여 즉시 첫 틱 진행

            // Save tournament state
            await db.updateUser(freshUser);
            
            // Update volatile state
            if (!volatileState.activeTournaments) volatileState.activeTournaments = {};
            volatileState.activeTournaments[freshUser.id] = tournamentState;

            // 즉시 첫 번째 시뮬레이션 진행 (지연 없이 시작)
            const { advanceSimulation } = await import('../tournamentService.js');
            advanceSimulation(tournamentState, freshUser);
            
            // 시뮬레이션 진행 후 다시 저장
            await db.updateUser(freshUser);

            // WebSocket으로 사용자 업데이트 브로드캐스트
            const updatedUserCopy = JSON.parse(JSON.stringify(freshUser));
            broadcast({ type: 'USER_UPDATE', payload: { [freshUser.id]: updatedUserCopy } });

            return { clientResponse: { redirectToTournament: type } };
        }

        default:
            return { error: `Action ${type} is not handled by tournamentActions.` };
    }
};