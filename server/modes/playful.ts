import * as types from '../../types/index.js';
import * as db from '../db.js';
import { handleSharedAction, updateSharedGameState, handleTimeoutFoul } from './shared.js';
import { initializeAlkkagi, updateAlkkagiState, handleAlkkagiAction } from './alkkagi.js';
import { initializeCurling, updateCurlingState, handleCurlingAction } from './curling.js';
import { initializeDiceGo, updateDiceGoState, handleDiceGoAction } from './diceGo.js';
import { initializeOmok, updateOmokState, handleOmokAction } from './omok.js';
import { initializeThief, updateThiefState, handleThiefAction } from './thief.js';
import { ALKKAGI_TURN_TIME_LIMIT, ALKKAGI_PLACEMENT_TIME_LIMIT, CURLING_TURN_TIME_LIMIT, DICE_GO_MAIN_ROLL_TIME } from '../../constants.js';
import * as effectService from '../effectService.js';
import { aiUserId, getAiUser } from '../aiPlayer.js';
import { randomUUID } from 'crypto';


export const initializePlayfulGame = async (game: types.LiveGameSession, neg: types.Negotiation, now: number) => {
    const p1 = game.player1;
    const p2 = game.player2;

    switch (game.mode) {
        case types.GameMode.Dice:
            game.blackTimeLeft = DICE_GO_MAIN_ROLL_TIME;
            game.whiteTimeLeft = DICE_GO_MAIN_ROLL_TIME;
            initializeDiceGo(game, neg, now);
            break;
        case types.GameMode.Thief:
            game.blackTimeLeft = DICE_GO_MAIN_ROLL_TIME;
            game.whiteTimeLeft = DICE_GO_MAIN_ROLL_TIME;
            initializeThief(game, neg, now);
            break;
        case types.GameMode.Alkkagi:
            game.blackTimeLeft = ALKKAGI_TURN_TIME_LIMIT;
            game.whiteTimeLeft = ALKKAGI_TURN_TIME_LIMIT;
            
            // Comprehensive initialization to prevent null values on DB load
            game.alkkagiStones = [];
            game.alkkagiStones_p1 = [];
            game.alkkagiStones_p2 = [];
            game.alkkagiStonesPlacedThisRound = { [p1.id]: 0, [p2.id]: 0 };
            game.alkkagiRound = 1;
            game.activeAlkkagiItems = {};
            game.alkkagiRefillsUsed = { [p1.id]: 0, [p2.id]: 0 };
            game.alkkagiRoundSummary = undefined;
            game.timeoutFouls = { [p1.id]: 0, [p2.id]: 0 };
            
            const p1Effects = effectService.calculateUserEffects(p1);
            const p2Effects = effectService.calculateUserEffects(p2);
            const p1SlowBonus = p1Effects.mythicStatBonuses[types.MythicStat.AlkkagiSlowBonus]?.flat || 0;
            const p1AimBonus = p1Effects.mythicStatBonuses[types.MythicStat.AlkkagiAimingBonus]?.flat || 0;
            const p2SlowBonus = p2Effects.mythicStatBonuses[types.MythicStat.AlkkagiSlowBonus]?.flat || 0;
            const p2AimBonus = p2Effects.mythicStatBonuses[types.MythicStat.AlkkagiAimingBonus]?.flat || 0;

            game.alkkagiItemUses = {
                [p1.id]: { slow: (game.settings.alkkagiSlowItemCount || 0) + p1SlowBonus, aimingLine: (game.settings.alkkagiAimingLineItemCount || 0) + p1AimBonus },
                [p2.id]: { slow: (game.settings.alkkagiSlowItemCount || 0) + p2SlowBonus, aimingLine: (game.settings.alkkagiAimingLineItemCount || 0) + p2AimBonus }
            };

            initializeAlkkagi(game, neg, now);
            break;
        case types.GameMode.Curling:
            game.blackTimeLeft = CURLING_TURN_TIME_LIMIT;
            game.whiteTimeLeft = CURLING_TURN_TIME_LIMIT;
            initializeCurling(game, neg, now);
            break;
        case types.GameMode.Omok:
        case types.GameMode.Ttamok:
            initializeOmok(game, neg, now);
            break;
    }
};

export const updatePlayfulGameState = async (game: types.LiveGameSession, now: number) => {
    switch (game.mode) {
        case types.GameMode.Dice:
            updateDiceGoState(game, now);
            break;
        case types.GameMode.Thief:
            updateThiefState(game, now);
            break;
        case types.GameMode.Alkkagi:
            updateAlkkagiState(game, now);
            break;
        case types.GameMode.Curling:
            updateCurlingState(game, now);
            break;
        case types.GameMode.Omok:
        case types.GameMode.Ttamok:
            updateOmokState(game, now);
            break;
    }

    // Playful Gold Bonus Logic (runs for all playful modes in progress)
    const playableStatuses: types.GameStatus[] = [
        'alkkagi_playing', 'curling_playing', 'dice_rolling', 'dice_placing', 'thief_rolling', 'thief_placing', 'playing'
    ];
    if (playableStatuses.includes(game.gameStatus)) {
        const players = [game.player1, game.player2];
        for (const player of players) {
            if (!player || player.id.startsWith('bot-') || player.id === aiUserId) continue;

            const effects = effectService.calculateUserEffects(player);
            const playfulGoldBonusScore = effects.mythicStatBonuses[types.MythicStat.PlayfulGoldBonus]?.flat || 0;

            if (playfulGoldBonusScore > 0) {
                if (!game.lastPlayfulGoldCheck) game.lastPlayfulGoldCheck = {};
                const lastCheck = game.lastPlayfulGoldCheck[player.id] || game.createdAt;

                if (now - lastCheck >= 60000) {
                    game.lastPlayfulGoldCheck[player.id] = now;

                    if (!game.mythicBonuses) game.mythicBonuses = {};
                    if (!game.mythicBonuses[player.id]) {
                        game.mythicBonuses[player.id] = { strategicGoldTriggers: 0, playfulGoldTriggers: 0 };
                    }
                    
                    const triggers = game.mythicBonuses[player.id].playfulGoldTriggers;
                    if (triggers < 5) {
                        const baseChance = 0.20;
                        const bonusChance = playfulGoldBonusScore * 0.001;
                        const finalChance = baseChance + bonusChance;

                        if (Math.random() < finalChance) {
                            const baseMinGold = 10;
                            const baseMaxGold = 50;
                            const goldRoll = Math.random();
                            const skewedRoll = Math.pow(goldRoll, 1 / (1 + playfulGoldBonusScore * 0.02));
                            const goldAmount = Math.floor(baseMinGold + (baseMaxGold - baseMinGold) * skewedRoll);

                            player.gold += goldAmount;
                            game.mythicBonuses[player.id].playfulGoldTriggers++;
                            await db.updateUser(player);

                            const newTriggers = game.mythicBonuses[player.id].playfulGoldTriggers;
                            const messageText = `${player.nickname}님이 신화 옵션으로 ${goldAmount}골드를 획득했습니다(${newTriggers}/5)`;
                            const message: types.ChatMessage = {
                                id: `msg-${randomUUID()}`,
                                user: { id: 'system', nickname: '시스템' },
                                system: true, text: messageText, timestamp: now,
                            };
                            
                            if (!game.pendingSystemMessages) game.pendingSystemMessages = [];
                            game.pendingSystemMessages.push(message);
                        }
                    }
                }
            }
        }
    }
};

export const handlePlayfulGameAction = async (volatileState: types.VolatileState, game: types.LiveGameSession, action: types.ServerAction & { userId: string }, user: types.User): Promise<types.HandleActionResult | undefined> => {
    switch (game.mode) {
        case types.GameMode.Dice:
            return handleDiceGoAction(volatileState, game, action, user);
        case types.GameMode.Thief:
            return handleThiefAction(volatileState, game, action, user);
        case types.GameMode.Alkkagi:
            return handleAlkkagiAction(volatileState, game, action, user);
        case types.GameMode.Curling:
            return handleCurlingAction(volatileState, game, action, user);
        case types.GameMode.Omok:
        case types.GameMode.Ttamok:
            return handleOmokAction(volatileState, game, action, user);
        default:
             // Handle shared actions like resign, chat, etc. that might apply to all playful modes
            const result = await handleSharedAction(volatileState, game, action, user);
            return result ?? undefined;
    }
};
