import { randomUUID } from 'crypto';
import * as db from './db.js';
// FIX: Import GameMode to resolve TS2304 error.
import { type ServerAction, type User, type VolatileState, InventoryItem, Quest, QuestLog, Negotiation, Player, LeagueTier, TournamentType, GameMode } from '../types.js';
import * as types from '../types.js';
import { isDifferentDayKST, isDifferentWeekKST, isDifferentMonthKST } from '../utils/timeUtils.js';
import * as effectService from './effectService.js';
import { regenerateActionPoints } from './effectService.js';
import { updateGameStates } from './gameModes.js';
import { DAILY_QUESTS, WEEKLY_QUESTS, MONTHLY_QUESTS, SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES, ACTION_POINT_REGEN_INTERVAL_MS, ITEM_SELL_PRICES, MATERIAL_SELL_PRICES } from '../constants';
import { initializeGame } from './gameModes.js';
import { handleStrategicGameAction } from './modes/standard.js';
import { handlePlayfulGameAction } from './modes/playful.js';
import { createDefaultUser, createDefaultQuests } from './initialData.ts';
import { containsProfanity } from '../profanity.js';
import * as mannerService from './mannerService.js';

// Import new action handlers
import { handleAdminAction } from './actions/adminActions.js';
import { handleInventoryAction } from './actions/inventoryActions.js';
import { handleNegotiationAction } from './actions/negotiationActions.js';
import { handleRewardAction } from './actions/rewardActions.js';
import { handleShopAction } from './actions/shopActions.js';
import { handleSocialAction } from './actions/socialActions.js';
import { handleTournamentAction } from './actions/tournamentActions.js';
import { handleUserAction } from './actions/userActions.js';
import { handleSinglePlayerAction } from './actions/singlePlayerActions.js';
import { handleTowerAction } from './actions/towerActions.js';
import { broadcast } from './socket.js';


export type HandleActionResult = { 
    clientResponse?: any;
    error?: string;
};

// --- Helper Functions (moved from the old gameActions) ---

export const resetAndGenerateQuests = async (user: User): Promise<User> => {
    const now = Date.now();
    const updatedUser = JSON.parse(JSON.stringify(user));
    let modified = false;

    // Ensure the quests object and its properties exist for older users.
    if (!updatedUser.quests || typeof updatedUser.quests.daily === 'undefined' || typeof updatedUser.quests.weekly === 'undefined' || typeof updatedUser.quests.monthly === 'undefined') {
        const existingQuests = updatedUser.quests || {};
        updatedUser.quests = {
            daily: existingQuests.daily || createDefaultQuests().daily,
            weekly: existingQuests.weekly || createDefaultQuests().weekly,
            monthly: existingQuests.monthly || createDefaultQuests().monthly,
        };
        modified = true;
    }

    // Daily Quests
    if (isDifferentDayKST(updatedUser.quests.daily?.lastReset, now)) {
        updatedUser.quests.daily = {
            quests: [],
            activityProgress: 0,
            claimedMilestones: [false, false, false, false, false],
            lastReset: now,
        };
        const newQuests: Quest[] = DAILY_QUESTS.map((q, i) => ({
            ...q, id: `q-d-${i}-${now}`, progress: 0, isClaimed: false,
        }));
        updatedUser.quests.daily.quests = newQuests;
        // Daily login quest progress
        updateQuestProgress(updatedUser, 'login', undefined, 1);
        modified = true;
    }

    // Weekly Quests
    if (isDifferentWeekKST(updatedUser.quests.weekly?.lastReset, now)) {
        updatedUser.quests.weekly = {
            quests: [],
            activityProgress: 0,
            claimedMilestones: [false, false, false, false, false],
            lastReset: now,
        };
        const newQuests: Quest[] = WEEKLY_QUESTS.map((q, i) => ({
            ...q, id: `q-w-${i}-${now}`, progress: 0, isClaimed: false,
        }));
        updatedUser.quests.weekly.quests = newQuests;
        modified = true;
    }
    
    // Monthly Quests
    if (isDifferentMonthKST(updatedUser.quests.monthly?.lastReset, now)) {
        updatedUser.quests.monthly = {
            quests: [],
            activityProgress: 0,
            claimedMilestones: [false, false, false, false, false],
            lastReset: now,
        };
         const newQuests: Quest[] = MONTHLY_QUESTS.map((q, i) => ({
            ...q, id: `q-m-${i}-${now}`, progress: 0, isClaimed: false,
        }));
        updatedUser.quests.monthly.quests = newQuests;
        modified = true;
    }

    const tournamentTypes: TournamentType[] = ['neighborhood', 'national', 'world'];
    for (const type of tournamentTypes) {
        const playedDateKey = `last${type.charAt(0).toUpperCase() + type.slice(1)}PlayedDate` as keyof User;
        const rewardClaimedKey = `${type}RewardClaimed` as keyof User;
        const tournamentKey = `last${type.charAt(0).toUpperCase() + type.slice(1)}Tournament` as keyof User;

        if (isDifferentDayKST((user as any)[playedDateKey], now)) {
            (updatedUser as any)[playedDateKey] = undefined;
            (updatedUser as any)[rewardClaimedKey] = undefined;
            (updatedUser as any)[tournamentKey] = null;
            modified = true;
        }
    }

    return modified ? updatedUser : user;
};

export const updateQuestProgress = (user: User, type: 'win' | 'participate' | 'action_button' | 'tournament_participate' | 'enhancement_attempt' | 'craft_attempt' | 'chat_greeting' | 'tournament_complete' | 'login' | 'claim_daily_milestone_100' | 'claim_weekly_milestone_100', mode?: GameMode, amount: number = 1) => {
    if (!user.quests) return;
    const isStrategic = mode ? SPECIAL_GAME_MODES.some(m => m.mode === mode) : false;
    const isPlayful = mode ? PLAYFUL_GAME_MODES.some(m => m.mode === mode) : false;

    const questsToUpdate: Quest[] = [
        ...(user.quests.daily?.quests || []),
        ...(user.quests.weekly?.quests || []),
        ...(user.quests.monthly?.quests || [])
    ];

    for (const quest of questsToUpdate) {
        if (quest.isClaimed) continue;

        let shouldUpdate = false;
        switch (quest.title) {
            case '출석하기': if (type === 'login') shouldUpdate = true; break;
            case '채팅창에 인사하기': if (type === 'chat_greeting') shouldUpdate = true; break;
            case '전략바둑 플레이하기': if (type === 'participate' && isStrategic) shouldUpdate = true; break;
            case '놀이바둑 플레이하기': if (type === 'participate' && isPlayful) shouldUpdate = true; break;
            case '전략바둑 승리하기': if (type === 'win' && isStrategic) shouldUpdate = true; break;
            case '놀이바둑 승리하기': if (type === 'win' && isPlayful) shouldUpdate = true; break;
            case '액션버튼 사용하기': if (type === 'action_button') shouldUpdate = true; break;
            case '자동대국 토너먼트 완료하기': if (type === 'tournament_complete') shouldUpdate = true; break;
            case '자동대국 토너먼트 참여하기': if (type === 'tournament_participate') shouldUpdate = true; break;
            case '장비 강화시도': if (type === 'enhancement_attempt') shouldUpdate = true; break;
            case '재료 합성시도': if (type === 'craft_attempt') shouldUpdate = true; break;
            case '일일퀘스트 활약도100보상 받기(3/3)': if (type === 'claim_daily_milestone_100') shouldUpdate = true; break;
            case '일일 퀘스트 활약도100 보상받기 10회': if (type === 'claim_daily_milestone_100') shouldUpdate = true; break;
            case '주간퀘스트 활약도100보상 받기(2/2)': if (type === 'claim_weekly_milestone_100') shouldUpdate = true; break;
        }

        if (shouldUpdate) {
            quest.progress = Math.min(quest.target, quest.progress + amount);
        }
    }
};

export const handleAction = async (volatileState: VolatileState, action: ServerAction & { userId: string }): Promise<HandleActionResult> => {
    const user = await db.getUser(action.userId);
    if (!user) {
        return { error: 'User not found.' };
    }
    const { type, payload } = action;
    const gameId = payload?.gameId;
    

    // 타워 게임 관련 액션은 먼저 처리 (gameId가 있어도 타워 액션은 여기서 처리)
    if (type === 'START_TOWER_GAME' || type === 'CONFIRM_TOWER_GAME_START' || type === 'TOWER_REFRESH_PLACEMENT' || type === 'TOWER_ADD_TURNS' || type === 'END_TOWER_GAME') {
        const { handleTowerAction } = await import('./actions/towerActions.js');
        return handleTowerAction(volatileState, action, user);
    }

    // Game Actions (require gameId)
    // 도전의 탑은 클라이언트에서만 실행되므로 서버에서 착수 액션을 처리하지 않음
    if (gameId && type !== 'LEAVE_AI_GAME') {
        // 캐시를 사용하여 DB 조회 최소화
        const { getCachedGame, updateGameCache } = await import('./gameCache.js');
        const game = await getCachedGame(gameId);
        if (!game) return { error: 'Game not found.' };
        
        // 타워 게임의 착수 액션은 클라이언트에서만 처리
        if (game.gameCategory === 'tower') {
            // 타워 게임 관련 특수 액션만 서버에서 처리 (TOWER_REFRESH_PLACEMENT, TOWER_ADD_TURNS 등은 이미 위에서 처리됨)
            // 착수 액션(PLACE_STONE 등)은 클라이언트에서만 처리하므로 여기서는 조용히 무시
            return {};
        }
        
        let result: HandleActionResult | null | undefined = null;
        if (SPECIAL_GAME_MODES.some(m => m.mode === game.mode)) {
            result = await handleStrategicGameAction(volatileState, game, action, user);
        } else if (PLAYFUL_GAME_MODES.some(m => m.mode === game.mode)) {
            result = await handlePlayfulGameAction(volatileState, game, action, user);
        }

        if (result !== null && result !== undefined) {
            // 캐시 업데이트
            updateGameCache(game);
            // DB 저장은 비동기로 처리하여 응답 지연 최소화
            db.saveGame(game).catch(err => {
                console.error(`[GameActions] Failed to save game ${game.id}:`, err);
            });
            // 게임 상태 변경 후 실시간 브로드캐스트
            broadcast({ type: 'GAME_UPDATE', payload: { [game.id]: game } });
            return result;
        }
    }

    // Non-Game actions
    if (type.startsWith('ADMIN_')) return handleAdminAction(volatileState, action, user);
    if (type.includes('NEGOTIATION') || type === 'START_AI_GAME' || type === 'REQUEST_REMATCH' || type === 'CHALLENGE_USER' || type === 'SEND_CHALLENGE') return handleNegotiationAction(volatileState, action, user);
    if (type === 'CLAIM_SINGLE_PLAYER_MISSION_REWARD' || type === 'CLAIM_ALL_TRAINING_QUEST_REWARDS' || type === 'START_SINGLE_PLAYER_MISSION' || type === 'LEVEL_UP_TRAINING_QUEST') {
        return handleSinglePlayerAction(volatileState, action, user);
    }
    // 타워 액션은 위에서 이미 처리됨 (중복 제거)
    if (type.startsWith('CLAIM_') || type.startsWith('DELETE_MAIL') || type === 'DELETE_ALL_CLAIMED_MAIL' || type === 'MARK_MAIL_AS_READ') return handleRewardAction(volatileState, action, user);
    if (type.startsWith('BUY_') || type === 'PURCHASE_ACTION_POINTS' || type === 'EXPAND_INVENTORY' || type === 'BUY_TOWER_ITEM') return handleShopAction(volatileState, action, user);
    if (type.startsWith('TOURNAMENT') || 
        type.startsWith('START_TOURNAMENT') || 
        type.startsWith('SKIP_TOURNAMENT') || 
        type.startsWith('FORFEIT_TOURNAMENT') || 
        type.startsWith('FORFEIT_CURRENT_MATCH') || 
        type.startsWith('SAVE_TOURNAMENT') || 
        type.startsWith('CLEAR_TOURNAMENT') || 
        type.startsWith('ADVANCE_TOURNAMENT') || 
        type === 'USE_CONDITION_POTION' || 
        type === 'BUY_CONDITION_POTION' ||
        type === 'START_TOURNAMENT_MATCH' || 
        type === 'ENTER_TOURNAMENT_VIEW' || 
        type === 'LEAVE_TOURNAMENT_VIEW' ||
        type === 'CLAIM_TOURNAMENT_REWARD' ||
        type === 'COMPLETE_TOURNAMENT_SIMULATION') {
        return handleTournamentAction(volatileState, action, user);
    }
    if (['TOGGLE_EQUIP_ITEM', 'SELL_ITEM', 'ENHANCE_ITEM', 'DISASSEMBLE_ITEM', 'USE_ITEM', 'USE_ALL_ITEMS_OF_TYPE', 'CRAFT_MATERIAL', 'COMBINE_ITEMS'].includes(type)) return handleInventoryAction(volatileState, action, user);
    if (['UPDATE_AVATAR', 'UPDATE_BORDER', 'CHANGE_NICKNAME', 'RESET_STAT_POINTS', 'CONFIRM_STAT_ALLOCATION', 'UPDATE_MBTI', 'SAVE_PRESET', 'APPLY_PRESET', 'UPDATE_REJECTION_SETTINGS'].includes(type)) return handleUserAction(volatileState, action, user);
    if (type.includes('SINGLE_PLAYER')) return handleSinglePlayerAction(volatileState, action, user);
    if (type === 'MANNER_ACTION') return mannerService.handleMannerAction(volatileState, action, user);
    // LEAVE_AI_GAME은 gameId를 가지지만 소셜 액션으로 처리해야 함
    if (type === 'LEAVE_AI_GAME') return handleSocialAction(volatileState, action, user);
    
    // Social actions can be game-related (chat in game) or not (logout)
    const socialResult = await handleSocialAction(volatileState, action, user);
    if (socialResult) return socialResult;

    return { error: `Unhandled action type: ${type}` };
};