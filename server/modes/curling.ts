import * as types from '../../types/index.js';
import * as db from '../db.js';
import { handleSharedAction, updateSharedGameState, handleTimeoutFoul } from './shared.js';
import { aiUserId } from '../aiPlayer.js';
import { CURLING_TURN_TIME_LIMIT, PLAYFUL_MODE_FOUL_LIMIT } from '../../constants';
import { endGame } from '../summaryService.js';
import * as effectService from '../effectService.js';

// --- Simulation & Scoring Logic ---
const runServerSimulation = (initialStones: types.AlkkagiStone[], flickedStone: types.AlkkagiStone, velocity: types.Point): { finalStones: types.AlkkagiStone[], stonesFallen: types.AlkkagiStone[] } => {
    let simStones: types.AlkkagiStone[] = JSON.parse(JSON.stringify(initialStones || []));
    let stoneToAnimate = { ...flickedStone, vx: velocity.x, vy: velocity.y, onBoard: true };
    simStones.push(stoneToAnimate);

    const boardSizePx = 840;
    const friction = 0.98;
    const maxIterations = 1000;
    let iterations = 0;
    const stonesFallen: types.AlkkagiStone[] = [];

    while (iterations < maxIterations) {
        let stonesAreMoving = false;
        
        for (const stone of simStones) {
            if (!stone.onBoard) continue;
            
            // Use fixed time step logic to match server simulation
            stone.x += stone.vx;
            stone.y += stone.vy;
            stone.vx *= friction;
            stone.vy *= friction;

            if (Math.abs(stone.vx) < 0.01) stone.vx = 0;
            if (Math.abs(stone.vy) < 0.01) stone.vy = 0;
            if (stone.vx !== 0 || stone.vy !== 0) {
                stonesAreMoving = true;
            }

            if (stone.x < 0 || stone.x > boardSizePx || stone.y < 0 || stone.y > boardSizePx) {
                if (stone.onBoard) {
                    stone.onBoard = false;
                    stonesFallen.push(stone);
                }
            }
        }
        for (let i = 0; i < simStones.length; i++) {
            for (let j = i + 1; j < simStones.length; j++) {
                const s1 = simStones[i];
                const s2 = simStones[j];
                if (!s1.onBoard || !s2.onBoard) continue;
                const dx = s2.x - s1.x;
                const dy = s2.y - s1.y;
                const distance = Math.hypot(dx,dy);
                const radiiSum = s1.radius + s2.radius;
                if (distance < radiiSum) {
                    const nx = dx / distance;
                    const ny = dy / distance;
                    const dvx = s2.vx - s1.vx;
                    const dvy = s2.vy - s1.vy;
                    const dot = dvx * nx + dvy * ny;
                    if (dot < 0) {
                        const impulse = dot;
                        s1.vx += impulse * nx;
                        s1.vy += impulse * ny;
                        s2.vx -= impulse * nx;
                        s2.vy -= impulse * ny;
                    }
                    const overlap = (radiiSum - distance) / 2;
                    s1.x -= overlap * nx;
                    s1.y -= overlap * ny;
                    s2.x += overlap * nx;
                    s2.y += overlap * ny;
                }
            }
        }
        
        if (!stonesAreMoving) break;
        iterations++;
    }

    return { finalStones: simStones, stonesFallen };
};


const endCurlingRound = (game: types.LiveGameSession, now: number) => {
    const boardSizePx = 840;
    const center = { x: boardSizePx / 2, y: boardSizePx / 2 };
    const cellSize = boardSizePx / 19;
    
    let houseScoreBlack = 0;
    let houseScoreWhite = 0;
    const scoredStones: { [stoneId: number]: number } = {};

    const onBoardStones = (game.curlingStones || []).filter(s => s.onBoard);
    
    // Score all stones in the house for both players
    for (const stone of onBoardStones) {
        const dist = Math.hypot(stone.x - center.x, stone.y - center.y);
        let score = 0;
        if (dist <= cellSize * 0.5) score = 5;
        else if (dist <= cellSize * 2) score = 3;
        else if (dist <= cellSize * 4) score = 2;
        else if (dist <= cellSize * 6) score = 1;
        
        if (score > 0) {
            scoredStones[stone.id] = score;
            if (stone.player === types.Player.Black) houseScoreBlack += score;
            else houseScoreWhite += score;
        }
    }

    const blackCumulativeBeforeRound = game.curlingRoundSummary?.cumulativeScores[types.Player.Black] || 0;
    const whiteCumulativeBeforeRound = game.curlingRoundSummary?.cumulativeScores[types.Player.White] || 0;

    const blackKnockoutsThisRound = (game.curlingScores![types.Player.Black] || 0) - blackCumulativeBeforeRound;
    const whiteKnockoutsThisRound = (game.curlingScores![types.Player.White] || 0) - whiteCumulativeBeforeRound;

    game.curlingScores![types.Player.Black] += houseScoreBlack;
    game.curlingScores![types.Player.White] += houseScoreWhite;
    
    const blackTotal = houseScoreBlack + blackKnockoutsThisRound;
    const whiteTotal = houseScoreWhite + whiteKnockoutsThisRound;

    game.curlingRoundSummary = {
        round: game.curlingRound!,
        roundWinner: blackTotal > whiteTotal ? types.Player.Black : (whiteTotal > blackTotal ? types.Player.White : null),
        black: { houseScore: houseScoreBlack, knockoutScore: blackKnockoutsThisRound, total: blackTotal },
        white: { houseScore: houseScoreWhite, knockoutScore: whiteKnockoutsThisRound, total: whiteTotal },
        cumulativeScores: { ...game.curlingScores! },
        stonesState: game.curlingStones!,
        scoredStones: scoredStones
    };
    
    game.gameStatus = 'curling_round_end';
    game.revealEndTime = now + 20000;
    if (game.isAiGame) {
        if (!game.roundEndConfirmations) game.roundEndConfirmations = {};
        game.roundEndConfirmations[aiUserId] = now;
    }
};


// --- Game State Management ---

export const initializeCurling = (game: types.LiveGameSession, neg: types.Negotiation, now: number) => {
    const p1 = game.player1;
    const p2 = game.player2;
    
    game.curlingStones = [];
    game.activeCurlingItems = {};

    const p1Effects = effectService.calculateUserEffects(p1);
    const p2Effects = effectService.calculateUserEffects(p2);
    const p1SlowBonus = p1Effects.mythicStatBonuses[types.MythicStat.AlkkagiSlowBonus]?.flat || 0;
    const p1AimBonus = p1Effects.mythicStatBonuses[types.MythicStat.AlkkagiAimingBonus]?.flat || 0;
    const p2SlowBonus = p2Effects.mythicStatBonuses[types.MythicStat.AlkkagiSlowBonus]?.flat || 0;
    const p2AimBonus = p2Effects.mythicStatBonuses[types.MythicStat.AlkkagiAimingBonus]?.flat || 0;

    game.curlingItemUses = {
        [p1.id]: { slow: (neg.settings.curlingSlowItemCount || 0) + p1SlowBonus, aimingLine: (neg.settings.curlingAimingLineItemCount || 0) + p1AimBonus },
        [p2.id]: { slow: (neg.settings.curlingSlowItemCount || 0) + p2SlowBonus, aimingLine: (neg.settings.curlingAimingLineItemCount || 0) + p2AimBonus }
    };

    if (game.isAiGame) {
        const humanPlayerColor = neg.settings.player1Color || types.Player.Black;
        if (humanPlayerColor === types.Player.Black) {
            game.blackPlayerId = p1.id;
            game.whitePlayerId = p2.id;
        } else {
            game.whitePlayerId = p1.id;
            game.blackPlayerId = p2.id;
        }
        
        // Default: 백(후공) gets the hammer (last stone advantage)
        game.hammerPlayerId = game.whitePlayerId ?? undefined; 
        game.currentPlayer = types.Player.Black; // 선공 starts
        game.gameStatus = 'curling_playing';
        game.curlingRound = 1;
        game.curlingScores = { [types.Player.Black]: 0, [types.Player.White]: 0, [types.Player.None]: 0 };
        game.stonesThrownThisRound = { [game.player1.id]: 0, [game.player2.id]: 0 };
        game.curlingTurnDeadline = now + CURLING_TURN_TIME_LIMIT * 1000;
        game.turnStartTime = now;

    } else {
        game.gameStatus = 'turn_preference_selection';
        game.turnChoices = { [p1.id]: null, [p2.id]: null };
        game.turnChoiceDeadline = now + 30000;
        game.turnSelectionTiebreaker = 'rps';
    }
};

export const updateCurlingState = (game: types.LiveGameSession, now: number) => {
    if (updateSharedGameState(game, now)) return;

    const p1Id = game.player1.id;
    const p2Id = game.player2.id;
    
    switch (game.gameStatus) {
        case 'curling_start_confirmation': {
            const bothConfirmed = game.preGameConfirmations?.[p1Id] && game.preGameConfirmations?.[p2Id];
            const deadlinePassed = game.revealEndTime && now > game.revealEndTime;
            if (bothConfirmed || deadlinePassed) {
                game.hammerPlayerId = game.whitePlayerId ?? undefined; // White gets hammer
                game.currentPlayer = types.Player.Black;
                game.gameStatus = 'curling_playing';
                game.curlingRound = 1;
                game.curlingScores = { [types.Player.Black]: 0, [types.Player.White]: 0, [types.Player.None]: 0 };
                game.stonesThrownThisRound = { [p1Id]: 0, [p2Id]: 0 };
                game.curlingTurnDeadline = now + CURLING_TURN_TIME_LIMIT * 1000;
                game.turnStartTime = now;
                
                game.preGameConfirmations = {};
                game.revealEndTime = undefined;
                game.turnChoices = undefined;
                game.rpsState = undefined;
                game.rpsRound = undefined;
            }
            break;
        }
        case 'curling_playing': {
            // AI 턴일 때는 타임아웃 체크를 건너뛰기
            const isAiTurn = game.isAiGame && game.currentPlayer !== types.Player.None && 
                            (game.currentPlayer === types.Player.Black ? game.blackPlayerId === aiUserId : game.whitePlayerId === aiUserId);
            
            if (game.curlingTurnDeadline && now > game.curlingTurnDeadline && !isAiTurn) {
                const timedOutPlayerId = game.currentPlayer === types.Player.Black ? game.blackPlayerId! : game.whitePlayerId!;
                const gameEnded = handleTimeoutFoul(game, timedOutPlayerId, now);
                if (gameEnded) return;

                if (!game.curlingStonesLostToFoul) game.curlingStonesLostToFoul = {};
                game.curlingStonesLostToFoul[timedOutPlayerId] = (game.curlingStonesLostToFoul[timedOutPlayerId] || 0) + 1;

                game.stonesThrownThisRound![timedOutPlayerId]++;
                
                const bothPlayersHaveThrownAllStones = 
                    game.stonesThrownThisRound![p1Id] >= game.settings.curlingStoneCount! &&
                    game.stonesThrownThisRound![p2Id] >= game.settings.curlingStoneCount!;

                if (bothPlayersHaveThrownAllStones) {
                    endCurlingRound(game, now);
                } else {
                    game.currentPlayer = game.currentPlayer === types.Player.Black ? types.Player.White : types.Player.Black;
                    game.curlingTurnDeadline = now + CURLING_TURN_TIME_LIMIT * 1000;
                    game.turnStartTime = now;
                }
            }
            break;
        }
        case 'curling_animating': {
            if (game.animation && now > game.animation.startTime + game.animation.duration) {
                const { stone, velocity } = game.animation as types.AnimationData & { type: 'curling_flick' };
                const { finalStones, stonesFallen } = runServerSimulation(game.curlingStones!, stone, velocity);
                game.curlingStones = finalStones;
                
                const knockoutPlayerId = stone.player === types.Player.Black ? game.blackPlayerId! : game.whitePlayerId!;
                const knockoutPlayerEnum = stone.player;
                const opponentEnum = knockoutPlayerEnum === types.Player.Black ? types.Player.White : types.Player.Black;
                const knockoutScore = stonesFallen.filter(s => s.player === opponentEnum).length;
                if (knockoutScore > 0) {
                    game.curlingScores![knockoutPlayerEnum] += knockoutScore;
                }
                
                game.animation = null;
                
                const bothPlayersHaveThrownAllStones = 
                    game.stonesThrownThisRound![p1Id] >= game.settings.curlingStoneCount! &&
                    game.stonesThrownThisRound![p2Id] >= game.settings.curlingStoneCount!;
                
                if (bothPlayersHaveThrownAllStones) {
                    endCurlingRound(game, now);
                } else {
                    game.gameStatus = 'curling_playing';
                    game.currentPlayer = game.currentPlayer === types.Player.Black ? types.Player.White : types.Player.Black;
                    game.curlingTurnDeadline = now + CURLING_TURN_TIME_LIMIT * 1000;
                    game.turnStartTime = now;
                }
            }
            break;
        }
        case 'curling_round_end': {
            const bothConfirmed = game.roundEndConfirmations?.[p1Id] && game.roundEndConfirmations?.[p2Id];
            if ((game.revealEndTime && now > game.revealEndTime) || bothConfirmed) {
                const totalRounds = game.settings.curlingRounds || 3;
                if (game.curlingRound! >= totalRounds) {
                    // Check for a tie after the final round
                    const blackFinalScore = game.curlingScores![types.Player.Black];
                    const whiteFinalScore = game.curlingScores![types.Player.White];
                    
                    if (blackFinalScore === whiteFinalScore) {
                        // Tiebreaker logic here if needed, for now just end it
                        const finalWinner = Math.random() < 0.5 ? types.Player.Black : types.Player.White;
                        endGame(game, finalWinner, 'total_score');

                    } else {
                        const winner = blackFinalScore > whiteFinalScore ? types.Player.Black : types.Player.White;
                        endGame(game, winner, 'total_score');
                    }
                } else {
                    game.curlingRound!++;
                    game.curlingStones = [];
                    game.stonesThrownThisRound = { [p1Id]: 0, [p2Id]: 0 };
                    
                    const roundWinner = game.curlingRoundSummary?.roundWinner;
                    if (roundWinner === types.Player.Black) {
                        game.hammerPlayerId = game.whitePlayerId ?? undefined;
                    } else {
                        game.hammerPlayerId = game.blackPlayerId ?? undefined;
                    }
                    
                    game.currentPlayer = game.hammerPlayerId === game.blackPlayerId ? types.Player.White : types.Player.Black;
                    
                    game.gameStatus = 'curling_playing';
                    game.curlingTurnDeadline = now + CURLING_TURN_TIME_LIMIT * 1000;
                    game.turnStartTime = now;
                }
            }
            break;
        }
    }
};

export const handleCurlingAction = async (volatileState: types.VolatileState, game: types.LiveGameSession, action: types.ServerAction & { userId: string }, user: types.User): Promise<types.HandleActionResult | undefined> => {
    const { type, payload } = action;
    const now = Date.now();
    
    const myPlayerEnum = user.id === game.blackPlayerId ? types.Player.Black : (user.id === game.whitePlayerId ? types.Player.White : types.Player.None);
    const isMyTurn = myPlayerEnum === game.currentPlayer;

    const sharedResult = await handleSharedAction(volatileState, game, action, user);
    if (sharedResult) return sharedResult;
    
    switch(type) {
        case 'CONFIRM_CURLING_START': {
            if (game.mode !== types.GameMode.Curling) return undefined;
            if (game.gameStatus !== 'curling_start_confirmation') return { error: "Not in confirmation phase." };
            if (!game.preGameConfirmations) game.preGameConfirmations = {};
            if (game.isAiGame) game.preGameConfirmations[aiUserId] = true;
            
            game.preGameConfirmations[user.id] = true;
            return {};
        }
        case 'CURLING_FLICK_STONE': {
            if (game.gameStatus !== 'curling_playing' || !isMyTurn) return { error: "지금은 공격할 수 없습니다."};
            
            if (game.stonesThrownThisRound![user.id] >= game.settings.curlingStoneCount!) {
                return { error: "모든 돌을 사용했습니다." };
            }

            const { launchPosition, velocity } = payload;
            
            const newStone: types.AlkkagiStone = {
                id: Date.now(),
                player: myPlayerEnum,
                x: launchPosition.x, y: launchPosition.y,
                vx: 0, vy: 0,
                radius: (840 / 19) * 0.47,
                onBoard: false,
            };
            
            game.animation = { type: 'curling_flick', stone: newStone, velocity, startTime: now, duration: 8000 };
            game.gameStatus = 'curling_animating';
            if (game.activeCurlingItems) {
                delete game.activeCurlingItems[user.id];
            }
            game.stonesThrownThisRound![user.id]++;
            game.curlingTurnDeadline = undefined;
            game.turnStartTime = undefined;
            return {};
        }
        case 'USE_CURLING_ITEM': {
            if (game.gameStatus !== 'curling_playing' || !isMyTurn) return { error: "Not your turn to use an item." };
            const { itemType } = payload as { itemType: 'slow' | 'aimingLine' };

            if (game.activeCurlingItems?.[user.id]?.includes(itemType)) return { error: '아이템이 이미 활성화되어 있습니다.' };

            if (!game.curlingItemUses || !game.curlingItemUses[user.id] || game.curlingItemUses[user.id][itemType] <= 0) {
                return { error: '해당 아이템이 없습니다.' };
            }
            game.curlingItemUses[user.id][itemType]--;
            if (!game.activeCurlingItems) game.activeCurlingItems = {};
            if (!Array.isArray(game.activeCurlingItems[user.id])) {
                game.activeCurlingItems[user.id] = [];
            }
            game.activeCurlingItems[user.id].push(itemType);
            return {};
        }
        case 'CONFIRM_ROUND_END': {
            if (game.gameStatus !== 'curling_round_end') return { error: "라운드 종료 확인 단계가 아닙니다." };
            if (!game.roundEndConfirmations) game.roundEndConfirmations = {};
            game.roundEndConfirmations[user.id] = now;
            return {};
        }
    }
    
    return undefined;
};