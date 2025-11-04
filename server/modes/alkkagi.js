import * as types from '../../types.js';
import { handleSharedAction, updateSharedGameState } from './shared.js';
import { aiUserId } from '../aiPlayer.js';
import { ALKKAGI_PLACEMENT_TIME_LIMIT, ALKKAGI_SIMULTANEOUS_PLACEMENT_TIME_LIMIT, ALKKAGI_TURN_TIME_LIMIT, BATTLE_PLACEMENT_ZONES, PLAYFUL_MODE_FOUL_LIMIT } from '../../constants';
import { endGame } from '../summaryService.js';
import * as effectService from '../effectService.js';
// --- Simulation & Scoring Logic ---
const runServerSimulation = (game) => {
    if (!game.animation || game.animation.type !== 'alkkagi_flick' || !game.alkkagiStones)
        return;
    const { stoneId, vx, vy } = game.animation;
    const stoneToAnimate = game.alkkagiStones.find(s => s.id === stoneId);
    if (!stoneToAnimate)
        return;
    stoneToAnimate.vx = vx;
    stoneToAnimate.vy = vy;
    const boardSizePx = 840;
    const friction = 0.98;
    const maxIterations = 500;
    for (let iter = 0; iter < maxIterations; iter++) {
        let stonesAreMoving = false;
        for (const stone of game.alkkagiStones) {
            if (!stone.onBoard)
                continue;
            stone.x += stone.vx;
            stone.y += stone.vy;
            stone.vx *= friction;
            stone.vy *= friction;
            if (Math.abs(stone.vx) < 0.01)
                stone.vx = 0;
            if (Math.abs(stone.vy) < 0.01)
                stone.vy = 0;
            if (stone.vx !== 0 || stone.vy !== 0)
                stonesAreMoving = true;
            if (stone.x < 0 || stone.x > boardSizePx || stone.y < 0 || stone.y > boardSizePx)
                stone.onBoard = false;
        }
        for (let i = 0; i < game.alkkagiStones.length; i++) {
            for (let j = i + 1; j < game.alkkagiStones.length; j++) {
                const s1 = game.alkkagiStones[i];
                const s2 = game.alkkagiStones[j];
                if (!s1.onBoard || !s2.onBoard)
                    continue;
                const dx = s2.x - s1.x;
                const dy = s2.y - s1.y;
                const distance = Math.hypot(dx, dy);
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
        if (!stonesAreMoving)
            break;
    }
};
const checkAndEndRound = (game, now) => {
    if (!game.alkkagiStones)
        return false;
    const blackStones = game.alkkagiStones.filter(s => s.player === types.Player.Black && s.onBoard).length;
    const whiteStones = game.alkkagiStones.filter(s => s.player === types.Player.White && s.onBoard).length;
    let roundWinnerId = null;
    if (blackStones === 0 && game.blackPlayerId)
        roundWinnerId = game.whitePlayerId;
    if (whiteStones === 0 && game.whitePlayerId)
        roundWinnerId = game.blackPlayerId;
    if (roundWinnerId) {
        const totalRounds = game.settings.alkkagiRounds || 1;
        if (game.alkkagiRound >= totalRounds) {
            endGame(game, roundWinnerId === game.blackPlayerId ? types.Player.Black : types.Player.White, 'alkkagi_win');
        }
        else {
            const loserId = roundWinnerId === game.player1.id ? game.player2.id : game.player1.id;
            game.alkkagiRoundSummary = {
                round: game.alkkagiRound,
                winnerId: roundWinnerId,
                loserId: loserId,
                refillsRemaining: {}
            };
            game.gameStatus = 'alkkagi_round_end';
            game.revealEndTime = now + 30000;
            game.roundEndConfirmations = { [game.player1.id]: 0, [game.player2.id]: 0 };
            if (game.isAiGame)
                game.roundEndConfirmations[aiUserId] = now;
        }
        return true;
    }
    return false;
};
const placeRandomStonesForPlayer = (game, playerEnum, playerId, count) => {
    const boardSizePx = 840;
    const stoneRadius = (840 / 19) * 0.47;
    const { settings } = game;
    let placedCount = 0;
    let attempts = 0;
    const maxAttempts = 200 * count;
    while (placedCount < count && attempts < maxAttempts) {
        attempts++;
        let x, y;
        if (settings.alkkagiLayout === types.AlkkagiLayoutType.Battle) {
            const zones = BATTLE_PLACEMENT_ZONES[playerEnum];
            const randomZone = zones[Math.floor(Math.random() * zones.length)];
            const cellSize = boardSizePx / 19;
            const padding = cellSize / 2;
            const zoneXStart = padding + (randomZone.x - 0.5) * cellSize;
            const zoneYStart = padding + (randomZone.y - 0.5) * cellSize;
            const zoneXEnd = zoneXStart + randomZone.width * cellSize;
            const zoneYEnd = zoneYStart + randomZone.height * cellSize;
            x = zoneXStart + Math.random() * (zoneXEnd - zoneXStart);
            y = zoneYStart + Math.random() * (zoneYEnd - zoneYStart);
        }
        else {
            const whiteZoneMinY = boardSizePx * 0.15;
            const whiteZoneMaxY = boardSizePx * 0.35;
            const blackZoneMinY = boardSizePx * 0.65;
            const blackZoneMaxY = boardSizePx * 0.85;
            x = stoneRadius + Math.random() * (boardSizePx - stoneRadius * 2);
            if (playerEnum === types.Player.White) {
                y = whiteZoneMinY + Math.random() * (whiteZoneMaxY - whiteZoneMinY);
            }
            else {
                y = blackZoneMinY + Math.random() * (blackZoneMaxY - blackZoneMinY);
            }
        }
        const point = { x, y };
        const allStones = [...(game.alkkagiStones || []), ...(game.alkkagiStones_p1 || []), ...(game.alkkagiStones_p2 || [])];
        const overlaps = allStones.some(stone => Math.hypot(point.x - stone.x, point.y - stone.y) < stoneRadius * 2);
        if (!overlaps) {
            const newStone = {
                id: Date.now() + Math.random(), player: playerEnum,
                x: point.x, y: point.y, vx: 0, vy: 0,
                radius: stoneRadius, onBoard: true
            };
            const isSimultaneous = game.gameStatus === 'alkkagi_simultaneous_placement';
            if (isSimultaneous) {
                const playerStonesKey = playerId === game.player1.id ? 'alkkagiStones_p1' : 'alkkagiStones_p2';
                if (!game[playerStonesKey])
                    game[playerStonesKey] = [];
                game[playerStonesKey].push(newStone);
            }
            else {
                if (!game.alkkagiStones)
                    game.alkkagiStones = [];
                game.alkkagiStones.push(newStone);
            }
            if (!game.alkkagiStonesPlacedThisRound)
                game.alkkagiStonesPlacedThisRound = {};
            game.alkkagiStonesPlacedThisRound[playerId] = (game.alkkagiStonesPlacedThisRound[playerId] || 0) + 1;
            placedCount++;
        }
    }
    if (placedCount < count) {
        console.warn(`[Alkkagi Timeout] Could only place ${placedCount}/${count} random stones for player ${playerId}`);
    }
};
export const initializeAlkkagi = (game, neg, now) => {
    const p1 = game.player1;
    const p2 = game.player2;
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
    if (game.isAiGame) {
        const humanPlayerColor = neg.settings.player1Color || types.Player.Black;
        if (humanPlayerColor === types.Player.Black) {
            game.blackPlayerId = p1.id;
            game.whitePlayerId = p2.id;
        }
        else {
            game.whitePlayerId = p1.id;
            game.blackPlayerId = p2.id;
        }
        const placementType = game.settings.alkkagiPlacementType;
        game.gameStatus = placementType === types.AlkkagiPlacementType.TurnByTurn
            ? 'alkkagi_placement'
            : 'alkkagi_simultaneous_placement';
        game.currentPlayer = placementType === types.AlkkagiPlacementType.TurnByTurn ? types.Player.Black : types.Player.None;
        game.alkkagiPlacementDeadline = now + (placementType === types.AlkkagiPlacementType.TurnByTurn ? ALKKAGI_PLACEMENT_TIME_LIMIT : ALKKAGI_SIMULTANEOUS_PLACEMENT_TIME_LIMIT) * 1000;
        // AI places stones immediately for simultaneous placement
        if (game.gameStatus === 'alkkagi_simultaneous_placement') {
            const aiPlayerEnum = humanPlayerColor === types.Player.Black ? types.Player.White : types.Player.Black;
            const targetStones = game.settings.alkkagiStoneCount || 5;
            placeRandomStonesForPlayer(game, aiPlayerEnum, aiUserId, targetStones);
        }
    }
    else {
        game.gameStatus = 'turn_preference_selection';
        game.turnChoices = { [p1.id]: null, [p2.id]: null };
        game.turnChoiceDeadline = now + 30000;
        game.turnSelectionTiebreaker = 'rps';
    }
};
export const updateAlkkagiState = (game, now) => {
    if (updateSharedGameState(game, now))
        return;
    const p1Id = game.player1.id;
    const p2Id = game.player2.id;
    switch (game.gameStatus) {
        case 'alkkagi_start_confirmation': {
            const bothConfirmed = game.preGameConfirmations?.[p1Id] && game.preGameConfirmations?.[p2Id];
            const deadlinePassed = game.revealEndTime && now > game.revealEndTime;
            if (bothConfirmed || deadlinePassed) {
                const placementType = game.settings.alkkagiPlacementType;
                game.gameStatus = placementType === types.AlkkagiPlacementType.TurnByTurn
                    ? 'alkkagi_placement'
                    : 'alkkagi_simultaneous_placement';
                game.currentPlayer = placementType === types.AlkkagiPlacementType.TurnByTurn ? types.Player.Black : types.Player.None;
                game.alkkagiPlacementDeadline = now + (placementType === types.AlkkagiPlacementType.TurnByTurn ? ALKKAGI_PLACEMENT_TIME_LIMIT : ALKKAGI_SIMULTANEOUS_PLACEMENT_TIME_LIMIT) * 1000;
                game.preGameConfirmations = {};
                game.revealEndTime = undefined;
                game.turnChoices = undefined;
                game.rpsState = undefined;
                game.rpsRound = undefined;
            }
            break;
        }
        case 'alkkagi_placement':
        case 'alkkagi_simultaneous_placement': {
            if (!game.alkkagiStonesPlacedThisRound)
                game.alkkagiStonesPlacedThisRound = {};
            if (game.alkkagiPlacementDeadline && now > game.alkkagiPlacementDeadline) {
                const targetStones = game.settings.alkkagiStoneCount || 5;
                if (game.gameStatus === 'alkkagi_placement') {
                    const timedOutPlayerId = game.currentPlayer === types.Player.Black ? game.blackPlayerId : game.whitePlayerId;
                    const timedOutPlayerEnum = game.currentPlayer;
                    if (!game.timeoutFouls)
                        game.timeoutFouls = {};
                    game.timeoutFouls[timedOutPlayerId] = (game.timeoutFouls[timedOutPlayerId] || 0) + 1;
                    game.foulInfo = { message: `타임오버 파울!`, expiry: now + 4000 };
                    if (game.timeoutFouls[timedOutPlayerId] >= PLAYFUL_MODE_FOUL_LIMIT) {
                        const winnerId = game.player1.id === timedOutPlayerId ? game.player2.id : game.player1.id;
                        const winnerEnum = winnerId === game.blackPlayerId ? types.Player.Black : types.Player.White;
                        endGame(game, winnerEnum, 'timeout');
                        return;
                    }
                    const placedCount = game.alkkagiStonesPlacedThisRound[timedOutPlayerId] || 0;
                    const stonesToPlace = targetStones - placedCount;
                    if (stonesToPlace > 0) {
                        placeRandomStonesForPlayer(game, timedOutPlayerEnum, timedOutPlayerId, stonesToPlace);
                    }
                    // Switch turn even after random placement
                    game.currentPlayer = game.currentPlayer === types.Player.Black ? types.Player.White : types.Player.Black;
                    game.alkkagiPlacementDeadline = now + ALKKAGI_PLACEMENT_TIME_LIMIT * 1000;
                }
                else { // simultaneous
                    const p1Enum = p1Id === game.blackPlayerId ? types.Player.Black : types.Player.White;
                    const p2Enum = p2Id === game.blackPlayerId ? types.Player.Black : types.Player.White;
                    const p1PlacedThisRound = game.alkkagiStonesPlacedThisRound?.[p1Id] || 0;
                    const p2PlacedThisRound = game.alkkagiStonesPlacedThisRound?.[p2Id] || 0;
                    const p1Missing = targetStones - p1PlacedThisRound;
                    const p2Missing = targetStones - p2PlacedThisRound;
                    let gameEnded = false;
                    if (p1Missing > 0) {
                        if (!game.timeoutFouls)
                            game.timeoutFouls = {};
                        game.timeoutFouls[p1Id] = (game.timeoutFouls[p1Id] || 0) + 1;
                        if (game.timeoutFouls[p1Id] >= PLAYFUL_MODE_FOUL_LIMIT) {
                            endGame(game, p2Enum, 'timeout');
                            gameEnded = true;
                        }
                        else {
                            placeRandomStonesForPlayer(game, p1Enum, p1Id, p1Missing);
                        }
                    }
                    if (p2Missing > 0 && !gameEnded) {
                        if (!game.timeoutFouls)
                            game.timeoutFouls = {};
                        game.timeoutFouls[p2Id] = (game.timeoutFouls[p2Id] || 0) + 1;
                        if (game.timeoutFouls[p2Id] >= PLAYFUL_MODE_FOUL_LIMIT) {
                            endGame(game, p1Enum, 'timeout');
                        }
                        else {
                            placeRandomStonesForPlayer(game, p2Enum, p2Id, p2Missing);
                        }
                    }
                    game.foulInfo = { message: `타임오버 파울!`, expiry: now + 4000 };
                }
            }
            const targetStones = game.settings.alkkagiStoneCount || 5;
            // This counts stones placed in the current placement phase
            const p1PlacedThisRound = game.alkkagiStonesPlacedThisRound?.[p1Id] || 0;
            const p2PlacedThisRound = game.alkkagiStonesPlacedThisRound?.[p2Id] || 0;
            const p1Done = p1PlacedThisRound >= targetStones;
            const p2Done = p2PlacedThisRound >= targetStones;
            if (p1Done && p2Done) {
                if (!game.alkkagiStones)
                    game.alkkagiStones = [];
                game.alkkagiStones.push(...(game.alkkagiStones_p1 || []), ...(game.alkkagiStones_p2 || []));
                game.alkkagiStones_p1 = [];
                game.alkkagiStones_p2 = [];
                game.gameStatus = 'alkkagi_playing';
                game.currentPlayer = types.Player.Black;
                game.alkkagiTurnDeadline = now + ALKKAGI_TURN_TIME_LIMIT * 1000;
                game.turnStartTime = now;
            }
            break;
        }
        case 'alkkagi_playing':
            if (game.alkkagiTurnDeadline && now > game.alkkagiTurnDeadline) {
                const timedOutPlayerId = game.currentPlayer === types.Player.Black ? game.blackPlayerId : game.whitePlayerId;
                if (!game.timeoutFouls)
                    game.timeoutFouls = {};
                game.timeoutFouls[timedOutPlayerId] = (game.timeoutFouls[timedOutPlayerId] || 0) + 1;
                game.foulInfo = { message: `타임오버 파울!`, expiry: now + 4000 };
                if (game.timeoutFouls[timedOutPlayerId] >= PLAYFUL_MODE_FOUL_LIMIT) {
                    const winnerId = game.player1.id === timedOutPlayerId ? game.player2.id : game.player1.id;
                    const winnerEnum = winnerId === game.blackPlayerId ? types.Player.Black : types.Player.White;
                    endGame(game, winnerEnum, 'timeout');
                }
                else {
                    game.currentPlayer = game.currentPlayer === types.Player.Black ? types.Player.White : types.Player.Black;
                    game.alkkagiTurnDeadline = now + ALKKAGI_TURN_TIME_LIMIT * 1000;
                    game.turnStartTime = now;
                }
            }
            break;
        case 'alkkagi_animating':
            if (game.animation && now > game.animation.startTime + game.animation.duration) {
                runServerSimulation(game);
                game.animation = null;
                const roundEnded = checkAndEndRound(game, now);
                if (!roundEnded) {
                    game.gameStatus = 'alkkagi_playing';
                    game.currentPlayer = game.currentPlayer === types.Player.Black ? types.Player.White : types.Player.Black;
                    game.alkkagiTurnDeadline = now + ALKKAGI_TURN_TIME_LIMIT * 1000;
                    game.turnStartTime = now;
                }
            }
            break;
        case 'alkkagi_round_end':
            if ((game.roundEndConfirmations?.[p1Id] && game.roundEndConfirmations?.[p2Id]) || (game.revealEndTime && now > game.revealEndTime)) {
                const totalRounds = game.settings.alkkagiRounds || 1;
                if (game.alkkagiRound >= totalRounds) {
                    const winnerId = game.alkkagiRoundSummary.winnerId;
                    endGame(game, winnerId === game.blackPlayerId ? types.Player.Black : types.Player.White, 'alkkagi_win');
                }
                else {
                    game.alkkagiRound++;
                    // Winner keeps their on-board stones. Loser's are already off-board.
                    if (!game.alkkagiStones)
                        game.alkkagiStones = [];
                    game.alkkagiStones = game.alkkagiStones.filter(s => s.onBoard);
                    const placementType = game.settings.alkkagiPlacementType;
                    const loserId = game.alkkagiRoundSummary.loserId;
                    const loserEnum = loserId === game.blackPlayerId ? types.Player.Black : types.Player.White;
                    if (placementType === types.AlkkagiPlacementType.TurnByTurn) {
                        game.gameStatus = 'alkkagi_placement';
                        game.currentPlayer = loserEnum; // Loser of the round places first
                        game.alkkagiPlacementDeadline = now + ALKKAGI_PLACEMENT_TIME_LIMIT * 1000;
                    }
                    else {
                        game.gameStatus = 'alkkagi_simultaneous_placement';
                        game.currentPlayer = types.Player.None;
                        game.alkkagiPlacementDeadline = now + ALKKAGI_SIMULTANEOUS_PLACEMENT_TIME_LIMIT * 1000;
                    }
                    game.alkkagiStonesPlacedThisRound = { [p1Id]: 0, [p2Id]: 0 };
                    game.alkkagiStones_p1 = [];
                    game.alkkagiStones_p2 = [];
                }
            }
            break;
    }
};
const isPlacementValid = (game, point, player) => {
    if (player === types.Player.None)
        return false;
    const { settings } = game;
    const boardSizePx = 840;
    const stoneRadius = (840 / 19) * 0.47;
    const { x: svgX, y: svgY } = point;
    if (svgX < stoneRadius || svgX > boardSizePx - stoneRadius || svgY < stoneRadius || svgY > boardSizePx - stoneRadius) {
        return false;
    }
    let inZone = false;
    if (settings.alkkagiLayout === types.AlkkagiLayoutType.Battle) {
        const zones = BATTLE_PLACEMENT_ZONES[player];
        inZone = zones.some(zone => {
            const cellSize = boardSizePx / 19;
            const padding = cellSize / 2;
            const zoneXStart = padding + (zone.x - 0.5) * cellSize;
            const zoneYStart = padding + (zone.y - 0.5) * cellSize;
            const zoneXEnd = zoneXStart + zone.width * cellSize;
            const zoneYEnd = zoneYStart + zone.height * cellSize;
            return svgX >= zoneXStart && svgX <= zoneXEnd && svgY >= zoneYStart && svgY <= zoneYEnd;
        });
    }
    else {
        const whiteZoneMinY = boardSizePx * 0.15;
        const whiteZoneMaxY = boardSizePx * 0.35;
        const blackZoneMinY = boardSizePx * 0.65;
        const blackZoneMaxY = boardSizePx * 0.85;
        if (player === types.Player.White) {
            if (svgY >= whiteZoneMinY && svgY <= whiteZoneMaxY)
                inZone = true;
        }
        else {
            if (svgY >= blackZoneMinY && svgY <= blackZoneMaxY)
                inZone = true;
        }
    }
    if (!inZone)
        return false;
    const allStones = [...(game.alkkagiStones || []), ...(game.alkkagiStones_p1 || []), ...(game.alkkagiStones_p2 || [])];
    for (const stone of allStones) {
        if (Math.hypot(svgX - stone.x, svgY - stone.y) < stoneRadius * 2) {
            return false;
        }
    }
    return true;
};
export const handleAlkkagiAction = async (volatileState, game, action, user) => {
    const { type, payload } = action;
    const now = Date.now();
    const myPlayerEnum = user.id === game.blackPlayerId ? types.Player.Black : (user.id === game.whitePlayerId ? types.Player.White : types.Player.None);
    const isMyTurn = myPlayerEnum === game.currentPlayer;
    const sharedResult = await handleSharedAction(volatileState, game, action, user);
    if (sharedResult)
        return sharedResult;
    switch (type) {
        case 'CONFIRM_ALKKAGI_START': {
            if (game.mode !== types.GameMode.Alkkagi)
                return undefined;
            if (game.gameStatus !== 'alkkagi_start_confirmation')
                return { error: "Not in confirmation phase." };
            if (!game.preGameConfirmations)
                game.preGameConfirmations = {};
            if (game.isAiGame)
                game.preGameConfirmations[aiUserId] = true;
            game.preGameConfirmations[user.id] = true;
            return {};
        }
        case 'ALKKAGI_PLACE_STONE': {
            const isSimultaneous = game.gameStatus === 'alkkagi_simultaneous_placement';
            if (game.gameStatus !== 'alkkagi_placement' && !isSimultaneous)
                return { error: '배치 단계가 아닙니다.' };
            if (!isSimultaneous && !isMyTurn)
                return { error: '당신의 차례가 아닙니다.' };
            const targetPlacements = game.settings.alkkagiStoneCount || 5;
            const placedThisRound = game.alkkagiStonesPlacedThisRound?.[user.id] || 0;
            if (placedThisRound >= targetPlacements) {
                return { error: '모든 돌을 배치했습니다.' };
            }
            if (isPlacementValid(game, payload.point, myPlayerEnum)) {
                const newStone = {
                    id: Date.now() + Math.random(), player: myPlayerEnum,
                    x: payload.point.x, y: payload.point.y, vx: 0, vy: 0,
                    radius: (840 / 19) * 0.47, onBoard: true
                };
                if (isSimultaneous) {
                    const playerStonesKey = user.id === game.player1.id ? 'alkkagiStones_p1' : 'alkkagiStones_p2';
                    if (!game[playerStonesKey])
                        game[playerStonesKey] = [];
                    game[playerStonesKey].push(newStone);
                }
                else {
                    if (!game.alkkagiStones)
                        game.alkkagiStones = [];
                    game.alkkagiStones.push(newStone);
                }
                if (!game.alkkagiStonesPlacedThisRound)
                    game.alkkagiStonesPlacedThisRound = {};
                game.alkkagiStonesPlacedThisRound[user.id] = placedThisRound + 1;
                if (game.gameStatus === 'alkkagi_placement') {
                    game.currentPlayer = game.currentPlayer === types.Player.Black ? types.Player.White : types.Player.Black;
                    game.alkkagiPlacementDeadline = now + ALKKAGI_PLACEMENT_TIME_LIMIT * 1000;
                }
            }
            else {
                return { error: '유효하지 않은 위치입니다.' };
            }
            return {};
        }
        case 'ALKKAGI_FLICK_STONE': {
            if (game.gameStatus !== 'alkkagi_playing' || !isMyTurn)
                return { error: "지금은 공격할 수 없습니다." };
            const { stoneId, vx, vy } = payload;
            game.animation = { type: 'alkkagi_flick', stoneId, vx, vy, startTime: now, duration: 5000 };
            game.gameStatus = 'alkkagi_animating';
            if (game.activeAlkkagiItems) {
                delete game.activeAlkkagiItems[user.id];
            }
            game.alkkagiTurnDeadline = undefined;
            game.turnStartTime = undefined;
            return {};
        }
        case 'USE_ALKKAGI_ITEM': {
            if (game.gameStatus !== 'alkkagi_playing' || !isMyTurn)
                return { error: "Not your turn to use an item." };
            const { itemType } = payload;
            if (game.activeAlkkagiItems?.[user.id]?.includes(itemType))
                return { error: '아이템이 이미 활성화되어 있습니다.' };
            if (!game.alkkagiItemUses || !game.alkkagiItemUses[user.id] || game.alkkagiItemUses[user.id][itemType] <= 0) {
                return { error: '해당 아이템이 없습니다.' };
            }
            game.alkkagiItemUses[user.id][itemType]--;
            if (!game.activeAlkkagiItems)
                game.activeAlkkagiItems = {};
            // FIX: Add a check to ensure the value is an array, protecting against data corruption.
            if (!Array.isArray(game.activeAlkkagiItems[user.id])) {
                game.activeAlkkagiItems[user.id] = [];
            }
            game.activeAlkkagiItems[user.id].push(itemType);
            return {};
        }
        case 'CONFIRM_ROUND_END': {
            if (game.gameStatus !== 'alkkagi_round_end')
                return { error: "라운드 종료 확인 단계가 아닙니다." };
            if (!game.roundEndConfirmations)
                game.roundEndConfirmations = {};
            game.roundEndConfirmations[user.id] = now;
            return {};
        }
    }
    return undefined;
};
