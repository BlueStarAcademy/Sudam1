
// FIX: Import missing types from the centralized types file.
import { LiveGameSession, Player, User, GameSummary, StatChange, GameMode, InventoryItem, SpecialStat, WinReason, SinglePlayerStageInfo, QuestReward } from '../types.js';
import * as db from './db.js';
import { SPECIAL_GAME_MODES, NO_CONTEST_MANNER_PENALTY, NO_CONTEST_RANKING_PENALTY, CONSUMABLE_ITEMS, PLAYFUL_GAME_MODES, SINGLE_PLAYER_STAGES } from '../constants';
import { updateQuestProgress } from './questService.js';
import * as mannerService from './mannerService.js';
import { openEquipmentBox1 } from './shop.js';
import * as effectService from './effectService.js';
import { randomUUID } from 'crypto';
// FIX: Correctly import aiUser and getAiUser.
import { aiUserId, getAiUser } from './aiPlayer.js';
import { createItemInstancesFromReward, addItemsToInventory } from '../utils/inventoryUtils.js';

const getXpForLevel = (level: number): number => 1000 + (level - 1) * 200;

const processSinglePlayerGameSummary = async (game: LiveGameSession) => {
    const user = game.player1; // Human is always player1 in single player
    const isWinner = game.winner === Player.Black; // Human is always black
    const stage = SINGLE_PLAYER_STAGES.find(s => s.id === game.stageId);

    if (!stage) {
        console.error(`[SP Summary] Could not find stage with id: ${game.stageId}`);
        return;
    }

    // Initialize with a base structure
    const summary: GameSummary = {
        xp: { initial: user.strategyXp, change: 0, final: user.strategyXp },
        rating: { initial: 1200, change: 0, final: 1200 }, // Not applicable
        manner: { initial: user.mannerScore, change: 0, final: user.mannerScore },
        gold: 0,
        items: [],
    };
    
    if (isWinner) {
        const stageIndex = SINGLE_PLAYER_STAGES.findIndex(s => s.id === stage.id);
        const currentProgress = user.singlePlayerProgress ?? 0;
        
        // clearedSinglePlayerStages 배열 초기화 (없는 경우)
        if (!user.clearedSinglePlayerStages) {
            user.clearedSinglePlayerStages = [];
        }
        
        // 최초 클리어 여부 확인: clearedSinglePlayerStages에 스테이지 ID가 없으면 최초 클리어
        const isFirstClear = !user.clearedSinglePlayerStages.includes(stage.id);
        
        const rewards = isFirstClear 
            ? stage.rewards.firstClear 
            : stage.rewards.repeatClear;
        
        // 최초 클리어인 경우 clearedSinglePlayerStages에 추가
        if (isFirstClear) {
            user.clearedSinglePlayerStages.push(stage.id);
        }
        
        // singlePlayerProgress는 순차 진행 여부를 추적 (다음 스테이지 언락용)
        if (currentProgress === stageIndex) {
            user.singlePlayerProgress = currentProgress + 1;
        }

        const itemsToCreate = rewards.items ? createItemInstancesFromReward(rewards.items) : [];
        const { success } = addItemsToInventory([...user.inventory], user.inventorySlots, itemsToCreate);
        
        if (!success) {
            console.error(`[SP Summary] Insufficient inventory space for user ${user.id} on stage ${stage.id}. Items not granted.`);
            // Optionally, send items via mail here in the future
        } else {
            user.gold += rewards.gold;
            const initialXp = user.strategyXp;
            user.strategyXp += rewards.exp;

            addItemsToInventory(user.inventory, user.inventorySlots, itemsToCreate);
            
            summary.gold = rewards.gold;
            summary.xp = { initial: initialXp, change: rewards.exp, final: user.strategyXp };
            summary.items = itemsToCreate;

            if (rewards.bonus && rewards.bonus.startsWith('스탯')) {
                const points = parseInt(rewards.bonus.replace('스탯', ''), 10);
                if (!isNaN(points)) {
                    user.bonusStatPoints = (user.bonusStatPoints || 0) + points;
                    if (!summary.items) summary.items = [];
                    summary.items.push({
                        id: `stat-points-${Date.now()}`,
                        name: `보너스 스탯`,
                        image: '/images/icons/stat_point.png',
                        type: 'consumable',
                        grade: 'rare',
                        quantity: points
                    } as any);
                }
            }
        }
    }

    // Always create a summary object, even on loss (with no rewards)
    if (!game.summary) game.summary = {};
    game.summary[user.id] = summary;
    
    // Handle level up logic after potentially adding XP
    let currentLevel = user.strategyLevel;
    let currentXp = user.strategyXp;
    let requiredXp = getXpForLevel(currentLevel);
    while (currentXp >= requiredXp) {
        currentXp -= requiredXp;
        currentLevel++;
        requiredXp = getXpForLevel(currentLevel);
    }
    user.strategyLevel = currentLevel;
    user.strategyXp = currentXp;

    await db.updateUser(user);
    
    // 사용자 업데이트를 클라이언트에 브로드캐스트 (clearedSinglePlayerStages 업데이트 포함)
    const { broadcast } = await import('./socket.js');
    broadcast({ type: 'USER_UPDATE', payload: { [user.id]: user } });
};


export const endGame = async (game: LiveGameSession, winner: Player, winReason: WinReason): Promise<void> => {
    if (game.gameStatus === 'ended' || game.gameStatus === 'no_contest') {
        return; // Game already ended, do nothing
    }
    game.winner = winner;
    game.winReason = winReason;
    game.gameStatus = 'ended';

    if (game.isSinglePlayer) {
        await processSinglePlayerGameSummary(game);
    } else {
        const isPlayful = PLAYFUL_GAME_MODES.some(m => m.mode === game.mode);
        const isStrategic = SPECIAL_GAME_MODES.some(m => m.mode === game.mode);
        if ((isPlayful || isStrategic) && !game.statsUpdated) {
            await processGameSummary(game);
        }
    }

    game.statsUpdated = true;
    await db.saveGame(game);
};

const createConsumableItemInstance = (name: string): InventoryItem | null => {
    const template = CONSUMABLE_ITEMS.find(item => item.name === name);
    if (!template) {
        console.error(`[Reward] Consumable item template not found for: ${name}`);
        return null;
    }

    return {
        ...template,
        id: `item-${randomUUID()}`,
        quantity: 1,
        createdAt: Date.now(),
        isEquipped: false,
        level: 1,
        stars: 0,
    };
};

// --- START NEW REWARD CONSTANTS ---

// Strategic Loot Table
const STRATEGIC_LOOT_TABLE: { name: string; chance: number; type: 'equipment' | 'material' }[] = [
    { name: '재료 상자 IV', chance: 0.1, type: 'material' },
    { name: '장비 상자 IV', chance: 0.1, type: 'equipment' },
    { name: '재료 상자 III', chance: 1, type: 'material' },
    { name: '장비 상자 III', chance: 1, type: 'equipment' },
    { name: '재료 상자 II', chance: 3, type: 'material' },
    { name: '장비 상자 II', chance: 3, type: 'equipment' },
    { name: '재료 상자 I', chance: 15, type: 'material' },
    { name: '장비 상자 I', chance: 15, type: 'equipment' },
];

// Playful Loot Tables
const PLAYFUL_LOOT_TABLE_3_ROUNDS: { name: string; chance: number; type: 'equipment' | 'material' }[] = [
    { name: '재료 상자 IV', chance: 0.05, type: 'material' },
    { name: '장비 상자 IV', chance: 0.05, type: 'equipment' },
    { name: '재료 상자 III', chance: 0.1, type: 'material' },
    { name: '장비 상자 III', chance: 0.1, type: 'equipment' },
    { name: '재료 상자 II', chance: 1, type: 'material' },
    { name: '장비 상자 II', chance: 1, type: 'equipment' },
    { name: '재료 상자 I', chance: 10, type: 'material' },
    { name: '장비 상자 I', chance: 10, type: 'equipment' },
];

const PLAYFUL_LOOT_TABLE_2_ROUNDS: { name: string; chance: number; type: 'equipment' | 'material' }[] = [
    { name: '재료 상자 IV', chance: 0.03, type: 'material' },
    { name: '장비 상자 IV', chance: 0.03, type: 'equipment' },
    { name: '재료 상자 III', chance: 0.05, type: 'material' },
    { name: '장비 상자 III', chance: 0.05, type: 'equipment' },
    { name: '재료 상자 II', chance: 0.5, type: 'material' },
    { name: '장비 상자 II', chance: 0.5, type: 'equipment' },
    { name: '재료 상자 I', chance: 5, type: 'material' },
    { name: '장비 상자 I', chance: 5, type: 'equipment' },
];

const PLAYFUL_LOOT_TABLE_1_ROUND: { name: string; chance: number; type: 'equipment' | 'material' }[] = [
    { name: '재료 상자 IV', chance: 0.01, type: 'material' },
    { name: '장비 상자 IV', chance: 0.01, type: 'equipment' },
    { name: '재료 상자 III', chance: 0.03, type: 'material' },
    { name: '장비 상자 III', chance: 0.03, type: 'equipment' },
    { name: '재료 상자 II', chance: 0.1, type: 'material' },
    { name: '장비 상자 II', chance: 0.1, type: 'equipment' },
    { name: '재료 상자 I', chance: 2, type: 'material' },
    { name: '장비 상자 I', chance: 2, type: 'equipment' },
];

// Strategic Gold Map
const STRATEGIC_GOLD_REWARDS: Record<number, number> = {
    19: 1500, 17: 1300, 15: 1100, 13: 900, 11: 700, 9: 500, 7: 300
};

// Playful Gold Map
const PLAYFUL_GOLD_REWARDS: Record<number, number> = {
    3: 800, 2: 500, 1: 200,
};

// --- END NEW REWARD CONSTANTS ---


const calculateGameRewards = (
    game: LiveGameSession, 
    player: User,
    isWinner: boolean, 
    isDraw: boolean,
    itemDropBonus: number,
    materialDropBonus: number,
    rewardMultiplier: number
): { gold: number; items: InventoryItem[] } => {
    const { mode, settings, isAiGame } = game;

    let baseGold = 0;
    let lootTable: { name: string; chance: number; type: 'equipment' | 'material' }[] = [];
    
    if (SPECIAL_GAME_MODES.some(m => m.mode === mode)) {
        baseGold = STRATEGIC_GOLD_REWARDS[settings.boardSize as keyof typeof STRATEGIC_GOLD_REWARDS] || STRATEGIC_GOLD_REWARDS[19];
        lootTable = STRATEGIC_LOOT_TABLE;
    } else {
        let rounds = 1; // Default for Omok/Ttamok
        if (mode === GameMode.Dice) rounds = settings.diceGoRounds || 3;
        else if (mode === GameMode.Alkkagi) rounds = settings.alkkagiRounds || 1;
        else if (mode === GameMode.Curling) rounds = settings.curlingRounds || 3;
        else if (mode === GameMode.Thief) rounds = 2;

        baseGold = PLAYFUL_GOLD_REWARDS[rounds as keyof typeof PLAYFUL_GOLD_REWARDS] || PLAYFUL_GOLD_REWARDS[1];
        if (rounds === 3) lootTable = PLAYFUL_LOOT_TABLE_3_ROUNDS;
        else if (rounds === 2) lootTable = PLAYFUL_LOOT_TABLE_2_ROUNDS;
        else lootTable = PLAYFUL_LOOT_TABLE_1_ROUND;
    }

    // Determine gold multiplier
    const outcomeMultiplier = isWinner ? 1.0 : isDraw ? 0 : 0.25;
    let goldReward = Math.round(baseGold * outcomeMultiplier);
    
    // Apply monthly gold buff
    if (player.monthlyGoldBuffExpiresAt && player.monthlyGoldBuffExpiresAt > Date.now()) {
        goldReward = Math.round(goldReward * 1.5);
    }
    
    // Apply AI game penalty
    if (isAiGame) {
        goldReward = Math.round(goldReward * 0.2);
    }
    
    // Apply reward multiplier for all games
    goldReward = Math.round(goldReward * rewardMultiplier);

    // Determine item drop logic
    const itemsDropped: InventoryItem[] = [];
    // No items from AI games
    const canDropItem = (isWinner || !isDraw) && !isAiGame; 
    
    if (canDropItem && lootTable.length > 0) {
        const dropChanceMultiplier = (isWinner ? 1.0 : 0.5) * rewardMultiplier;

        for (const loot of lootTable) {
            const bonus = loot.type === 'equipment' ? itemDropBonus : materialDropBonus;
            const baseChance = loot.chance * dropChanceMultiplier;
            const effectiveChance = baseChance * (1 + bonus / 100);
            
            if (Math.random() * 100 < effectiveChance) {
                const droppedItem = createConsumableItemInstance(loot.name);
                if (droppedItem) itemsDropped.push(droppedItem);
                break; // only one item can be dropped
            }
        }
    }
    
    return { gold: goldReward, items: itemsDropped };
};


const calculateEloChange = (playerRating: number, opponentRating: number, result: 'win' | 'loss' | 'draw'): number => {
    const K = 32;
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    const actualScore = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
    const ratingChange = K * (actualScore - expectedScore);
    return Math.round(ratingChange);
};

const processPlayerSummary = async (
    player: User,
    opponent: User,
    isWinner: boolean,
    isDraw: boolean,
    game: LiveGameSession,
    isNoContest: boolean,
    isInitiator: boolean
): Promise<{ summary: GameSummary; updatedPlayer: User }> => {
    
    const updatedPlayer: User = JSON.parse(JSON.stringify(player)); // Create a deep mutable copy
    const { mode, winReason, isAiGame } = game;

    // --- XP and Level ---
    const isStrategic = SPECIAL_GAME_MODES.some(m => m.mode === mode);
    const isPlayful = PLAYFUL_GAME_MODES.some(m => m.mode === mode);
    const initialLevel = isStrategic ? updatedPlayer.strategyLevel : updatedPlayer.playfulLevel;
    const opponentLevel = isStrategic ? opponent.strategyLevel : opponent.playfulLevel;
    const initialXp = isStrategic ? updatedPlayer.strategyXp : updatedPlayer.playfulXp;
    let xpGain = isNoContest ? 0 : (isWinner ? 100 : (isDraw ? 0 : 25)); // Loss XP increased to 25

    // Apply AI game penalty before other multipliers
    if (isAiGame) {
        xpGain = Math.round(xpGain * 0.2);
    }

    // Level difference multiplier
    const levelDiff = opponentLevel - initialLevel;
    let levelMultiplier = 1 + (levelDiff * 0.1); // 10% per level difference
    levelMultiplier = Math.max(0.5, Math.min(1.5, levelMultiplier)); // Cap between 50% and 150%
    xpGain = Math.round(xpGain * levelMultiplier);

    const effects = effectService.calculateUserEffects(updatedPlayer);

    const xpBonusPercent = isStrategic 
        ? effects.specialStatBonuses[SpecialStat.StrategyXpBonus].percent 
        : effects.specialStatBonuses[SpecialStat.PlayfulXpBonus].percent;

    if (xpBonusPercent > 0) {
        xpGain = Math.round(xpGain * (1 + xpBonusPercent / 100));
    }

    // --- Reward Multiplier ---
    let rewardMultiplier = 1.0;
    if (isStrategic && !isNoContest) {
        // Base move count for 100% reward, scaled by board size. 19x19 is 100 moves.
        const baseMoveCount = Math.round(100 * Math.pow(game.settings.boardSize / 19, 2));
        const actualMoveCount = game.moveHistory.length;
        
        // Calculate the reward multiplier, capped at 100%
        rewardMultiplier = Math.min(1, actualMoveCount / baseMoveCount);
    } else if (isPlayful && !isNoContest) {
        const gameDurationSeconds = (Date.now() - game.createdAt) / 1000;
        if (gameDurationSeconds < 30) {
            rewardMultiplier = 0.05;
        } else {
            rewardMultiplier = Math.min(1, gameDurationSeconds / 300);
        }
    }
    
    // Apply the multiplier to XP
    xpGain = Math.round(xpGain * rewardMultiplier);
    // --- END NEW LOGIC ---

    let currentXp = initialXp + xpGain;
    let currentLevel = initialLevel;
    const requiredXpForInitialLevel = getXpForLevel(currentLevel);

    let requiredXpForCurrentLevel = requiredXpForInitialLevel;
    while (currentXp >= requiredXpForCurrentLevel) {
        currentXp -= requiredXpForCurrentLevel;
        currentLevel++;
        requiredXpForCurrentLevel = getXpForLevel(currentLevel);
    }
    
    const xpSummary: StatChange = { initial: initialXp, change: xpGain, final: currentXp };
    const levelSummary = {
        initial: initialLevel,
        final: currentLevel,
        progress: { 
            initial: initialXp, 
            final: currentXp, 
            max: requiredXpForInitialLevel 
        }
    };

    if (isStrategic) {
        updatedPlayer.strategyLevel = currentLevel;
        updatedPlayer.strategyXp = currentXp;
    } else {
        updatedPlayer.playfulLevel = currentLevel;
        updatedPlayer.playfulXp = currentXp;
    }

    // --- Rating ---
    if (!updatedPlayer.stats) updatedPlayer.stats = {};
    const gameStats = updatedPlayer.stats[mode] ?? { wins: 0, losses: 0, rankingScore: 1200 };
    
    const initialRating = gameStats.rankingScore;
    const opponentStats = opponent.stats?.[mode] ?? { wins: 0, losses: 0, rankingScore: 1200 };
    const opponentRating = opponent.id === aiUserId ? (initialRating - 50 + Math.random() * 100) : opponentStats.rankingScore;
    
    let ratingChange = 0;
    if (!isNoContest && !isAiGame) {
        const result = isWinner ? 'win' : isDraw ? 'draw' : 'loss';
        ratingChange = calculateEloChange(initialRating, opponentRating, result);
    }
    
    gameStats.rankingScore = Math.max(0, initialRating + ratingChange);
    const ratingSummary: StatChange = { initial: initialRating, change: ratingChange, final: gameStats.rankingScore };
    
    // --- Manner Score ---
    const isDisconnectLoss = winReason === 'disconnect' && !isWinner && !isDraw;
    const mannerChangeFromActions = game.mannerScoreChanges?.[player.id] || 0;
    const initialMannerBeforeGame = player.mannerScore - mannerChangeFromActions;

    let mannerChangeFromGameEnd = 0;
    if (isDisconnectLoss) {
        mannerChangeFromGameEnd = -20;
    } else if (!isNoContest) {
        // mannerChangeFromGameEnd = 2; // +2 for completing a game (win, loss, or draw)
    }

    const finalMannerScore = player.mannerScore + mannerChangeFromGameEnd;
    updatedPlayer.mannerScore = Math.max(0, finalMannerScore);
    
    const totalMannerChange = mannerChangeFromActions + mannerChangeFromGameEnd;

    const mannerSummary: StatChange = {
        initial: initialMannerBeforeGame,
        change: totalMannerChange,
        final: updatedPlayer.mannerScore
    };

    await mannerService.applyMannerRankChange(updatedPlayer, initialMannerBeforeGame);

    // --- Wins/Losses ---
    if (!isNoContest) {
        if (isWinner) gameStats.wins++;
        else if (!isDraw) gameStats.losses++;
    }
    
    updatedPlayer.stats[mode] = gameStats;
    
    // Apply rewards
    const itemDropBonus = effects.specialStatBonuses[SpecialStat.ItemDropRate].percent;
    const materialDropBonus = effects.specialStatBonuses[SpecialStat.MaterialDropRate].percent;
    const rewards = isNoContest ? { gold: 0, items: [] } : calculateGameRewards(game, updatedPlayer, isWinner, isDraw, itemDropBonus, materialDropBonus, rewardMultiplier);

    updatedPlayer.gold += rewards.gold;

    // Add dropped items to inventory
    if (rewards.items.length > 0) {
        const { success, finalItemsToAdd } = addItemsToInventory(updatedPlayer.inventory, updatedPlayer.inventorySlots, rewards.items);
        if (success) {
            updatedPlayer.inventory.push(...finalItemsToAdd);
        } else {
            console.error(`[Summary] Insufficient inventory space for user ${updatedPlayer.id}. Items not granted.`);
            // Optionally, send items via mail here in the future
        }
    }
    
    // Update Quests
    if (!isNoContest && !isAiGame) {
        updateQuestProgress(updatedPlayer, 'participate', mode, 1);
        if (isWinner) {
            updateQuestProgress(updatedPlayer, 'win', mode, 1);
        }
    }

    const summary: GameSummary = {
        xp: xpSummary,
        rating: ratingSummary,
        manner: mannerSummary,
        mannerActionChange: mannerChangeFromActions,
        overallRecord: {
            wins: gameStats.wins,
            losses: gameStats.losses,
        },
        gold: rewards.gold,
        items: rewards.items,
        level: levelSummary
    };

    return { summary, updatedPlayer };
};

export const processGameSummary = async (game: LiveGameSession): Promise<void> => {
    const { winner, player1, player2, blackPlayerId, whitePlayerId, noContestInitiatorIds } = game;
    if (!player1 || !player2) {
        console.error(`[Summary] Missing player data for game ${game.id}`);
        return;
    }
    
    const isDraw = winner === Player.None;
    const isNoContest = game.gameStatus === 'no_contest';

    const p1 = player1.id === aiUserId ? getAiUser(game.mode) : await db.getUser(player1.id);
    const p2 = player2.id === aiUserId ? getAiUser(game.mode) : await db.getUser(player2.id);

    if (!p1 || !p2) {
        console.error(`[Summary] Could not find one or more users from DB for game ${game.id}`);
        // Still save the game so we don't retry this every tick
        game.statsUpdated = true;
        await db.saveGame(game);
        return;
    }

    const p1IsWinner = !isDraw && !isNoContest && ((winner === Player.Black && p1.id === blackPlayerId) || (winner === Player.White && p1.id === whitePlayerId));
    const p2IsWinner = !isDraw && !isNoContest && ((winner === Player.Black && p2.id === blackPlayerId) || (winner === Player.White && p2.id === whitePlayerId));
    
    const p1IsNoContestInitiator = isNoContest && (noContestInitiatorIds?.includes(p1.id) ?? false);
    const p2IsNoContestInitiator = isNoContest && (noContestInitiatorIds?.includes(p2.id) ?? false);

    if (!game.summary) game.summary = {}; // Initialize summary object

    try {
        if (p1.id !== aiUserId) {
            const { summary: p1Summary, updatedPlayer: updatedP1 } = await processPlayerSummary(p1, p2, p1IsWinner, isDraw, game, isNoContest, p1IsNoContestInitiator);
            await db.updateUser(updatedP1);
            game.summary[p1.id] = p1Summary;
        }
    } catch (e) {
        console.error(`[Summary] Error processing summary for player 1 (${p1.id}) in game ${game.id}:`, e);
    }
    
    try {
        if (p2.id !== aiUserId) {
            const { summary: p2Summary, updatedPlayer: updatedP2 } = await processPlayerSummary(p2, p1, p2IsWinner, isDraw, game, isNoContest, p2IsNoContestInitiator);
            await db.updateUser(updatedP2);
            game.summary[p2.id] = p2Summary;
        }
    } catch (e) {
        console.error(`[Summary] Error processing summary for player 2 (${p2.id}) in game ${game.id}:`, e);
    }
    
    game.statsUpdated = true;
    await db.saveGame(game);
};