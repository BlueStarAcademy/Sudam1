import { NO_CONTEST_MOVE_THRESHOLD, SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES, STRATEGIC_ACTION_BUTTONS_EARLY, STRATEGIC_ACTION_BUTTONS_MID, STRATEGIC_ACTION_BUTTONS_LATE, PLAYFUL_ACTION_BUTTONS_EARLY, PLAYFUL_ACTION_BUTTONS_MID, PLAYFUL_ACTION_BUTTONS_LATE, RANDOM_DESCRIPTIONS, TIME_BONUS_SECONDS_PER_POINT } from '../constants.js';
import * as types from '../types.js';
import { analyzeGame } from './kataGoService.js';
import { aiUserId, makeAiMove, getAiUser } from './aiPlayer.js';
// FIX: The imported functions were not found. They are now exported from `standard.ts` with the correct names.
import { initializeStrategicGame, updateStrategicGameState } from './modes/standard.js';
import { initializePlayfulGame, updatePlayfulGameState } from './modes/playful.js';
import { randomUUID } from 'crypto';
import * as db from './db.js';
import * as effectService from './effectService.js';
import { endGame } from './summaryService.js';
export const finalizeAnalysisResult = (baseAnalysis, session) => {
    const finalAnalysis = JSON.parse(JSON.stringify(baseAnalysis)); // Deep copy
    // Base stone bonus
    finalAnalysis.scoreDetails.black.baseStoneBonus = 0;
    finalAnalysis.scoreDetails.white.baseStoneBonus = 0;
    // Hidden stone bonus
    finalAnalysis.scoreDetails.black.hiddenStoneBonus = 0;
    finalAnalysis.scoreDetails.white.hiddenStoneBonus = 0;
    // Time bonus
    if (session.mode === types.GameMode.Speed || (session.mode === types.GameMode.Mix && session.settings.mixedModes?.includes(types.GameMode.Speed))) {
        finalAnalysis.scoreDetails.black.timeBonus = Math.floor((session.blackTimeLeft || 0) / TIME_BONUS_SECONDS_PER_POINT);
        finalAnalysis.scoreDetails.white.timeBonus = Math.floor((session.whiteTimeLeft || 0) / TIME_BONUS_SECONDS_PER_POINT);
    }
    else {
        finalAnalysis.scoreDetails.black.timeBonus = 0;
        finalAnalysis.scoreDetails.white.timeBonus = 0;
    }
    // Item bonus (currently none, placeholder)
    finalAnalysis.scoreDetails.black.itemBonus = 0;
    finalAnalysis.scoreDetails.white.itemBonus = 0;
    // Recalculate totals
    finalAnalysis.scoreDetails.black.total = finalAnalysis.scoreDetails.black.territory + finalAnalysis.scoreDetails.black.captures + (finalAnalysis.scoreDetails.black.deadStones ?? 0) + finalAnalysis.scoreDetails.black.baseStoneBonus + finalAnalysis.scoreDetails.black.hiddenStoneBonus + finalAnalysis.scoreDetails.black.timeBonus + finalAnalysis.scoreDetails.black.itemBonus;
    finalAnalysis.scoreDetails.white.total = finalAnalysis.scoreDetails.white.territory + finalAnalysis.scoreDetails.white.captures + finalAnalysis.scoreDetails.white.komi + (finalAnalysis.scoreDetails.white.deadStones ?? 0) + finalAnalysis.scoreDetails.white.baseStoneBonus + finalAnalysis.scoreDetails.white.hiddenStoneBonus + finalAnalysis.scoreDetails.white.timeBonus + finalAnalysis.scoreDetails.white.itemBonus;
    finalAnalysis.areaScore.black = finalAnalysis.scoreDetails.black.total;
    finalAnalysis.areaScore.white = finalAnalysis.scoreDetails.white.total;
    return finalAnalysis;
};
export const getGameResult = (game) => {
    const isMissileMode = game.mode === types.GameMode.Missile || (game.mode === types.GameMode.Mix && game.settings.mixedModes?.includes(types.GameMode.Missile));
    const p1MissilesUsed = (game.settings.missileCount ?? 0) - (game.missiles_p1 ?? game.settings.missileCount ?? 0);
    const p2MissilesUsed = (game.settings.missileCount ?? 0) - (game.missiles_p2 ?? game.settings.missileCount ?? 0);
    const hasUsedMissile = isMissileMode && (p1MissilesUsed > 0 || p2MissilesUsed > 0);
    const isHiddenMode = game.mode === types.GameMode.Hidden || (game.mode === types.GameMode.Mix && game.settings.mixedModes?.includes(types.GameMode.Hidden));
    const p1ScansUsed = (game.settings.scanCount ?? 0) - (game.scans_p1 ?? game.settings.scanCount ?? 0);
    const p2ScansUsed = (game.settings.scanCount ?? 0) - (game.scans_p2 ?? game.settings.scanCount ?? 0);
    const hasUsedScan = isHiddenMode && (p1ScansUsed > 0 || p2ScansUsed > 0);
    if (SPECIAL_GAME_MODES.some(m => m.mode === game.mode) && game.moveHistory.length < NO_CONTEST_MOVE_THRESHOLD && !hasUsedMissile && !hasUsedScan) {
        game.gameStatus = 'no_contest';
        if (!game.noContestInitiatorIds)
            game.noContestInitiatorIds = [];
        if (!game.noContestInitiatorIds.includes(game.player1.id))
            game.noContestInitiatorIds.push(game.player1.id);
        if (!game.noContestInitiatorIds.includes(game.player2.id))
            game.noContestInitiatorIds.push(game.player2.id);
        return game;
    }
    const isGoBased = SPECIAL_GAME_MODES.some(m => m.mode === game.mode);
    if (!isGoBased) {
        game.gameStatus = 'ended';
        return game;
    }
    game.gameStatus = 'scoring';
    game.winReason = 'score';
    game.isAnalyzing = true;
    analyzeGame(game)
        .then(async (baseAnalysis) => {
        const freshGame = await db.getLiveGame(game.id);
        if (!freshGame || freshGame.gameStatus !== 'scoring')
            return;
        const finalAnalysis = finalizeAnalysisResult(baseAnalysis, freshGame);
        if (!freshGame.analysisResult)
            freshGame.analysisResult = {};
        freshGame.analysisResult['system'] = finalAnalysis;
        freshGame.finalScores = {
            black: finalAnalysis.scoreDetails.black.total,
            white: finalAnalysis.scoreDetails.white.total
        };
        freshGame.isAnalyzing = false;
        const winner = finalAnalysis.scoreDetails.black.total > finalAnalysis.scoreDetails.white.total
            ? types.Player.Black
            : types.Player.White;
        await endGame(freshGame, winner, 'score');
    })
        .catch(error => {
        console.error(`[AI Analysis] scoring failed for game ${game.id}.`, error);
        db.getLiveGame(game.id).then(async (failedGame) => {
            if (failedGame) {
                failedGame.isAnalyzing = false;
                // Decide a winner randomly as a fallback
                const winner = Math.random() < 0.5 ? types.Player.Black : types.Player.White;
                // End the game properly to process summaries and rewards
                await endGame(failedGame, winner, 'score'); // Re-use 'score' reason, as it's a scoring failure
            }
        });
    });
    return game;
};
export const getNewActionButtons = (game) => {
    const { mode, moveHistory } = game;
    let phase;
    const isPlayful = PLAYFUL_GAME_MODES.some((m) => m.mode === mode);
    if (isPlayful) {
        // Use round-based phase for most playful games
        const currentRound = game.alkkagiRound || game.curlingRound || game.round || 1;
        const totalRounds = game.settings.alkkagiRounds || game.settings.curlingRounds || game.settings.diceGoRounds || 2;
        if (currentRound === 1) {
            phase = 'early';
        }
        else if (currentRound === totalRounds) {
            phase = 'late';
        }
        else {
            phase = 'mid';
        }
    }
    else { // Strategic
        const moveCount = moveHistory.length;
        if (moveCount <= 30) {
            phase = 'early';
        }
        else if (moveCount >= 31 && moveCount <= 150) {
            phase = 'mid';
        }
        else { // moveCount >= 151
            phase = 'late';
        }
    }
    let sourceDeck;
    if (isPlayful) {
        switch (phase) {
            case 'early':
                sourceDeck = PLAYFUL_ACTION_BUTTONS_EARLY;
                break;
            case 'mid':
                sourceDeck = PLAYFUL_ACTION_BUTTONS_MID;
                break;
            case 'late':
                sourceDeck = PLAYFUL_ACTION_BUTTONS_LATE;
                break;
        }
    }
    else { // Strategic
        switch (phase) {
            case 'early':
                sourceDeck = STRATEGIC_ACTION_BUTTONS_EARLY;
                break;
            case 'mid':
                sourceDeck = STRATEGIC_ACTION_BUTTONS_MID;
                break;
            case 'late':
                sourceDeck = STRATEGIC_ACTION_BUTTONS_LATE;
                break;
        }
    }
    const shuffledButtons = [...sourceDeck].sort(() => 0.5 - Math.random());
    const manners = shuffledButtons.filter(b => b.type === 'manner');
    const unmanners = shuffledButtons.filter(b => b.type === 'unmannerly');
    const mannerCount = Math.random() > 0.5 ? 1 : 2;
    const selectedManners = manners.slice(0, mannerCount);
    const neededUnmanners = 3 - selectedManners.length;
    const selectedUnmanners = unmanners.slice(0, neededUnmanners);
    let result = [...selectedManners, ...selectedUnmanners];
    if (result.length < 3) {
        const existingNames = new Set(result.map(b => b.name));
        const filler = shuffledButtons.filter(b => !existingNames.has(b.name));
        result.push(...filler.slice(0, 3 - result.length));
    }
    return result.slice(0, 3).sort(() => 0.5 - Math.random());
};
export const initializeGame = async (neg) => {
    const gameId = `game-${randomUUID()}`;
    const { settings, mode } = neg;
    const now = Date.now();
    const challenger = await db.getUser(neg.challenger.id);
    const opponent = neg.opponent.id === aiUserId ? getAiUser(neg.mode) : await db.getUser(neg.opponent.id);
    if (!challenger || !opponent) {
        throw new Error(`Could not find one or more players to start the game: ${neg.challenger.id}, ${neg.opponent.id}`);
    }
    const isAiGame = opponent.id === aiUserId;
    const descriptions = RANDOM_DESCRIPTIONS[mode] || [`${mode} 한 판!`];
    const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
    const game = {
        id: gameId,
        mode, settings, description: randomDescription, player1: challenger, player2: opponent, isAiGame,
        boardState: Array(settings.boardSize).fill(0).map(() => Array(settings.boardSize).fill(types.Player.None)),
        moveHistory: [], captures: { [types.Player.None]: 0, [types.Player.Black]: 0, [types.Player.White]: 0 },
        baseStoneCaptures: { [types.Player.None]: 0, [types.Player.Black]: 0, [types.Player.White]: 0 },
        hiddenStoneCaptures: { [types.Player.None]: 0, [types.Player.Black]: 0, [types.Player.White]: 0 },
        winner: null, winReason: null, createdAt: now, lastMove: null, passCount: 0, koInfo: null,
        winningLine: null, statsUpdated: false, blackTimeLeft: settings.timeLimit * 60, whiteTimeLeft: settings.timeLimit * 60,
        blackByoyomiPeriodsLeft: settings.byoyomiCount, whiteByoyomiPeriodsLeft: settings.byoyomiCount,
        disconnectionState: null, disconnectionCounts: { [challenger.id]: 0, [opponent.id]: 0 },
        currentActionButtons: { [challenger.id]: [], [opponent.id]: [] },
        actionButtonCooldownDeadline: {},
        actionButtonUsedThisCycle: { [challenger.id]: false, [opponent.id]: false },
        missileUsedThisTurn: false,
        maxActionButtonUses: 5, actionButtonUses: { [challenger.id]: 0, [opponent.id]: 0 },
        round: 1, turnInRound: 1, newlyRevealed: [], scores: { [challenger.id]: 0, [opponent.id]: 0 },
        analysisResult: null, isAnalyzing: false,
        gameStatus: 'pending', blackPlayerId: null, whitePlayerId: null, currentPlayer: types.Player.None,
    };
    if (SPECIAL_GAME_MODES.some(m => m.mode === mode)) {
        await initializeStrategicGame(game, neg, now);
    }
    else if (PLAYFUL_GAME_MODES.some((m) => m.mode === mode)) {
        await initializePlayfulGame(game, neg, now);
    }
    if (game.gameStatus === 'playing' && game.currentPlayer === types.Player.None) {
        game.currentPlayer = types.Player.Black;
        if (settings.timeLimit > 0)
            game.turnDeadline = now + game.blackTimeLeft * 1000;
        game.turnStartTime = now;
    }
    return game;
};
export const resetGameForRematch = (game, negotiation) => {
    const newGame = { ...game, id: `game-${randomUUID()}` };
    newGame.mode = negotiation.mode;
    newGame.settings = negotiation.settings;
    const now = Date.now();
    const baseFields = {
        winner: null, winReason: null, statsUpdated: false, summary: undefined, finalScores: undefined,
        winningLine: null,
        boardState: Array(newGame.settings.boardSize).fill(0).map(() => Array(newGame.settings.boardSize).fill(types.Player.None)),
        moveHistory: [], captures: { [types.Player.None]: 0, [types.Player.Black]: 0, [types.Player.White]: 0 },
        baseStoneCaptures: { [types.Player.None]: 0, [types.Player.Black]: 0, [types.Player.White]: 0 },
        hiddenStoneCaptures: { [types.Player.None]: 0, [types.Player.Black]: 0, [types.Player.White]: 0 },
        lastMove: null, passCount: 0, koInfo: null,
        blackTimeLeft: newGame.settings.timeLimit * 60, whiteTimeLeft: newGame.settings.timeLimit * 60,
        blackByoyomiPeriodsLeft: newGame.settings.byoyomiCount, whiteByoyomiPeriodsLeft: newGame.settings.byoyomiCount,
        currentActionButtons: { [game.player1.id]: [], [game.player2.id]: [] },
        actionButtonCooldownDeadline: {},
        actionButtonUsedThisCycle: { [game.player1.id]: false, [game.player2.id]: false },
        missileUsedThisTurn: false,
        actionButtonUses: { [game.player1.id]: 0, [game.player2.id]: 0 },
        isAnalyzing: false, analysisResult: null, round: 1, turnInRound: 1,
        scores: { [game.player1.id]: 0, [game.player2.id]: 0 },
        rematchRejectionCount: undefined,
    };
    Object.assign(newGame, baseFields);
    if (SPECIAL_GAME_MODES.some(m => m.mode === newGame.mode)) {
        initializeStrategicGame(newGame, negotiation, now);
    }
    else if (PLAYFUL_GAME_MODES.some((m) => m.mode === newGame.mode)) {
        initializePlayfulGame(newGame, negotiation, now);
    }
    return newGame;
};
export const updateGameStates = async (games, now) => {
    const updatedGames = [];
    for (const game of games) {
        if (game.disconnectionState && (now - game.disconnectionState.timerStartedAt > 90000)) {
            game.winner = game.blackPlayerId === game.disconnectionState.disconnectedPlayerId ? types.Player.White : types.Player.Black;
            game.winReason = 'disconnect';
            game.gameStatus = 'ended';
            game.disconnectionState = null;
        }
        if (game.lastTimeoutPlayerIdClearTime && now >= game.lastTimeoutPlayerIdClearTime) {
            game.lastTimeoutPlayerId = null;
            game.lastTimeoutPlayerIdClearTime = undefined;
        }
        // Add null checks for players to prevent crashes on corrupted game data.
        if (!game.player1 || !game.player2) {
            console.warn(`[Game Loop] Skipping corrupted game ${game.id} with missing player data.`);
            continue;
        }
        const p1 = await db.getUser(game.player1.id);
        const p2 = game.player2.id === aiUserId ? getAiUser(game.mode) : await db.getUser(game.player2.id);
        if (p1)
            game.player1 = p1;
        if (p2)
            game.player2 = p2;
        const p1Id = game.player1.id;
        const p2Id = game.player2.id;
        const players = [game.player1, game.player2].filter(p => p.id !== aiUserId);
        const playableStatuses = [
            'playing', 'hidden_placing', 'scanning', 'missile_selecting',
            'alkkagi_playing',
            'curling_playing',
            'dice_rolling',
            'dice_placing',
            'thief_rolling',
            'thief_placing',
        ];
        if (playableStatuses.includes(game.gameStatus)) {
            for (const player of players) {
                const deadline = game.actionButtonCooldownDeadline?.[player.id];
                if (typeof deadline !== 'number' || now >= deadline) {
                    game.currentActionButtons[player.id] = getNewActionButtons(game);
                    const effects = effectService.calculateUserEffects(player);
                    const cooldown = (5 * 60 - (effects.mythicStatBonuses[types.MythicStat.MannerActionCooldown]?.flat || 0)) * 1000;
                    if (!game.actionButtonCooldownDeadline)
                        game.actionButtonCooldownDeadline = {};
                    game.actionButtonCooldownDeadline[player.id] = now + cooldown;
                    if (game.actionButtonUsedThisCycle) {
                        game.actionButtonUsedThisCycle[player.id] = false;
                    }
                }
            }
        }
        const isAiTurn = game.isAiGame && game.currentPlayer !== types.Player.None &&
            (game.currentPlayer === types.Player.Black ? game.blackPlayerId === aiUserId : game.whitePlayerId === aiUserId);
        if (isAiTurn && game.gameStatus !== 'ended' && !['missile_animating', 'hidden_reveal_animating', 'alkkagi_animating', 'curling_animating'].includes(game.gameStatus)) {
            if (!game.aiTurnStartTime) {
                game.aiTurnStartTime = now + (1000 + Math.random() * 1500);
            }
            if (now >= game.aiTurnStartTime) {
                await makeAiMove(game);
                game.aiTurnStartTime = undefined;
            }
        }
        if (SPECIAL_GAME_MODES.some(m => m.mode === game.mode) || game.isSinglePlayer) {
            await updateStrategicGameState(game, now);
        }
        else if (PLAYFUL_GAME_MODES.some((m) => m.mode === game.mode)) {
            await updatePlayfulGameState(game, now);
        }
        updatedGames.push(game);
    }
    return updatedGames;
};
