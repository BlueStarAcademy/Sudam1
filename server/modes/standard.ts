import * as summaryService from '../summaryService.js';
import * as types from '../../types.js';
import * as db from '../db.js';
import { getGoLogic, processMove } from '../goLogic.js';
import { getGameResult } from '../gameModes.js';
import { analyzeGame } from '../kataGoService.js';
import { initializeNigiri, updateNigiriState, handleNigiriAction } from './nigiri.js';
import { initializeBase, updateBaseState, handleBaseAction } from './base.js';
import { initializeCapture, updateCaptureState, handleCaptureAction } from './capture.js';
import { initializeHidden, updateHiddenState, handleHiddenAction } from './hidden.js';
import { initializeMissile, updateMissileState, handleMissileAction } from './missile.js';
import { transitionToPlaying, handleSharedAction } from './shared.js';
import { UserStatus } from '../../types.js';
import { getCaptureTarget, NO_CAPTURE_TARGET } from '../utils/captureTargets.ts';
import { aiUserId } from '../aiPlayer.js';
import { broadcast } from '../socket.js';


export const initializeStrategicGame = (game: types.LiveGameSession, neg: types.Negotiation, now: number) => {
    const p1 = game.player1;
    const p2 = game.player2;

    switch (game.mode) {
        case types.GameMode.Standard:
        case types.GameMode.Speed:
        case types.GameMode.Mix:
            if (game.isAiGame) {
                const humanPlayerColor = neg.settings.player1Color || types.Player.Black;
                if (humanPlayerColor === types.Player.Black) {
                    game.blackPlayerId = p1.id;
                    game.whitePlayerId = p2.id;
                } else {
                    game.whitePlayerId = p1.id;
                    game.blackPlayerId = p2.id;
                }
                transitionToPlaying(game, now);
            } else {
                initializeNigiri(game, now);
            }

            break;
        case types.GameMode.Capture:
            initializeCapture(game, now);
            break;
        case types.GameMode.Base:
            initializeBase(game, now);
            break;
        case types.GameMode.Hidden:
            initializeHidden(game);
            initializeNigiri(game, now); // Also uses nigiri
            break;
        case types.GameMode.Missile:
            initializeMissile(game);
            initializeNigiri(game, now); // Also uses nigiri
            break;
    }
};

export const updateStrategicGameState = async (game: types.LiveGameSession, now: number) => {
    // pending 상태의 게임은 처리하지 않음 (아직 시작되지 않음)
    if (game.gameStatus === 'pending') {
        return;
    }
    
    // This is the core update logic for all Go-based games.
    if (game.gameStatus === 'playing' && game.turnDeadline && now > game.turnDeadline) {
        const timedOutPlayer = game.currentPlayer;
        const timeKey = timedOutPlayer === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
        const byoyomiKey = timedOutPlayer === types.Player.Black ? 'blackByoyomiPeriodsLeft' : 'whiteByoyomiPeriodsLeft';
        const isFischer = game.mode === types.GameMode.Speed || (game.mode === types.GameMode.Mix && game.settings.mixedModes?.includes(types.GameMode.Speed));

        if (isFischer) {
            // Fischer timeout is an immediate loss.
        } else if (game[timeKey] > 0) { // Main time expired
            game[timeKey] = 0;
            if (game.settings.byoyomiCount > 0 && game[byoyomiKey] > 0) {
                game[byoyomiKey]--;
                game.turnDeadline = now + game.settings.byoyomiTime * 1000;
                game.turnStartTime = now;
                return;
            }
        } else { // Byoyomi expired
            if (game[byoyomiKey] > 0) {
                game[byoyomiKey]--;
                game.turnDeadline = now + game.settings.byoyomiTime * 1000;
                game.turnStartTime = now;
                return;
            }
        }
        
        // No time or byoyomi left
        const winner = timedOutPlayer === types.Player.Black ? types.Player.White : types.Player.Black;
        game.lastTimeoutPlayerId = game.currentPlayer === types.Player.Black ? game.blackPlayerId! : game.whitePlayerId!;
        game.lastTimeoutPlayerIdClearTime = now + 5000;
        
        summaryService.endGame(game, winner, 'timeout');
    }

    // Delegate to mode-specific update logic
    updateNigiriState(game, now);
    updateCaptureState(game, now);
    updateBaseState(game, now);
    updateHiddenState(game, now);
    updateMissileState(game, now);
};

export const handleStrategicGameAction = async (volatileState: types.VolatileState, game: types.LiveGameSession, action: types.ServerAction & { userId: string }, user: types.User): Promise<types.HandleActionResult | undefined> => {
    // Try shared actions first (e.g., USE_ACTION_BUTTON)
    const sharedResult = await handleSharedAction(volatileState, game, action, user);
    if (sharedResult) return sharedResult;
    
    // Try each specific handler. If one returns a result, we're done.
    let result: types.HandleActionResult | null = null;
    
    result = handleNigiriAction(game, action, user);
    if (result) return result;
    
    result = handleCaptureAction(game, action, user);
    if (result) return result;

    result = handleBaseAction(game, action, user);
    if (result) return result;

    result = handleHiddenAction(volatileState, game, action, user);
    if (result) return result;

    result = handleMissileAction(game, action, user);
    if (result) return result;
    
    // Fallback to standard actions if no other handler caught it.
    const standardResult = await handleStandardAction(volatileState, game, action, user);
    if(standardResult) return standardResult;
    
    return undefined;
};


// Keep the original standard action handler, but rename it to avoid conflicts.
const handleStandardAction = async (volatileState: types.VolatileState, game: types.LiveGameSession, action: types.ServerAction, user: types.User): Promise<types.HandleActionResult | null> => {
    const { type, payload } = action as any;
    const now = Date.now();
    const myPlayerEnum = user.id === game.blackPlayerId ? types.Player.Black : (user.id === game.whitePlayerId ? types.Player.White : types.Player.None);
    const isMyTurn = myPlayerEnum === game.currentPlayer;

    switch (type) {
        case 'PLACE_STONE': {
            try {
            const isClientAiMove = (payload as any).isClientAiMove === true;
            
            // 클라이언트가 계산한 AI 수인 경우 AI 차례인지 확인
            if (isClientAiMove) {
                const aiPlayerId = game.currentPlayer === types.Player.Black ? game.blackPlayerId : game.whitePlayerId;
                if (aiPlayerId !== aiUserId) {
                    return { error: 'AI 차례가 아닙니다.' };
                }
            } else {
                // 사용자 수인 경우 내 차례인지 확인
                if (!isMyTurn || (game.gameStatus !== 'playing' && game.gameStatus !== 'hidden_placing')) {
                    return { error: '내 차례가 아닙니다.' };
                }
            }

            // 동시성 제어: 이미 처리 중인 수가 있으면 거부 (싱글플레이에서 빠른 착수 방지)
            // 단, AI 수(isClientAiMove)인 경우에는 processingMove를 무시하고 진행 (AI는 빠르게 처리되어야 함)
            if (game.processingMove && !isClientAiMove) {
                const processingAge = now - game.processingMove.timestamp;
                // 3초 이상 지난 처리 중인 수는 타임아웃으로 간주하고 해제 (더 짧게 조정)
                if (processingAge > 3000) {
                    console.warn(`[PLACE_STONE] Clearing stale processingMove for game ${game.id} (age: ${processingAge}ms)`);
                    game.processingMove = null;
                } else {
                    // 사용자 차례이고 내 차례인 경우에만 에러 반환
                    if (isMyTurn) {
                        return { error: '이미 수를 처리 중입니다. 잠시 후 다시 시도해주세요.' };
                    } else {
                        // 내 차례가 아니면 무시
                        return {};
                    }
                }
            }

            const { x, y, isHidden = false } = payload;
            
            // 클라이언트 AI 수의 중복 처리 방지: 같은 위치에 이미 돌이 있으면 무시
            if (isClientAiMove) {
                const movePlayerEnum = game.currentPlayer;
                // 이미 같은 위치에 같은 플레이어의 돌이 있는지 확인
                if (game.boardState[y][x] === movePlayerEnum) {
                    // 이미 돌이 있으면 중복 요청으로 간주하고 무시
                    console.log(`[PLACE_STONE] Duplicate AI move ignored: ${movePlayerEnum} at (${x}, ${y}) already exists`);
                    return {};
                }
                // moveHistory에 이미 같은 수가 있는지 확인
                const existingMove = game.moveHistory.find(m => m.x === x && m.y === y && m.player === movePlayerEnum);
                if (existingMove) {
                    console.log(`[PLACE_STONE] Duplicate AI move ignored: move already in history at (${x}, ${y})`);
                    return {};
                }
            }
            
            // x, y 유효성 검사
            if (typeof x !== 'number' || typeof y !== 'number' || 
                x < 0 || y < 0 || x >= game.settings.boardSize || y >= game.settings.boardSize) {
                game.processingMove = null;
                return { error: 'Invalid coordinates.' };
            }
            
            // 클라이언트가 계산한 AI 수인 경우 AI 플레이어로 처리
            const movePlayerEnum = isClientAiMove 
                ? game.currentPlayer
                : myPlayerEnum;
            
            // movePlayerEnum 유효성 검사
            if (movePlayerEnum === types.Player.None) {
                game.processingMove = null;
                return { error: 'Invalid player.' };
            }
            
            const opponentPlayerEnum = movePlayerEnum === types.Player.Black ? types.Player.White : (movePlayerEnum === types.Player.White ? types.Player.Black : types.Player.None);
            
            // boardState 유효성 검사
            if (!game.boardState || !Array.isArray(game.boardState) || !game.boardState[y] || !Array.isArray(game.boardState[y])) {
                game.processingMove = null;
                console.error('[PLACE_STONE] Invalid boardState:', { gameId: game.id, boardState: game.boardState });
                return { error: 'Invalid board state.' };
            }
            
            const stoneAtTarget = game.boardState[y][x];

            // 처리 중인 수로 표시
            game.processingMove = { playerId: user.id, x, y, timestamp: now };

            const moveIndexAtTarget = game.moveHistory.findIndex(m => m.x === x && m.y === y);
            const isTargetHiddenOpponentStone =
                stoneAtTarget === opponentPlayerEnum &&
                moveIndexAtTarget !== -1 &&
                game.hiddenMoves?.[moveIndexAtTarget] &&
                !game.permanentlyRevealedStones?.some(p => p.x === x && p.y === y);

            if (stoneAtTarget !== types.Player.None && !isTargetHiddenOpponentStone) {
                if (game.isSinglePlayer) {
                    console.warn('[SinglePlayer][PLACE_STONE] Occupied point, rejecting move', {
                        gameId: game.id,
                        stageId: game.stageId,
                        moveIndex: game.moveHistory.length,
                        player: myPlayerEnum,
                        x,
                        y,
                        stoneAtTarget,
                        lastMove: game.lastMove,
                    });
                }
                game.processingMove = null; // 처리 중인 수 해제
                return {}; // Silently fail if placing on a visible stone
            }

            if (isTargetHiddenOpponentStone) {
                game.captures[movePlayerEnum] += 5; // Hidden stones are worth 5 points
                game.hiddenStoneCaptures[movePlayerEnum]++;
                
                if (!game.justCaptured) game.justCaptured = [];
                game.justCaptured.push({ point: { x, y }, player: opponentPlayerEnum, wasHidden: true });
                
                if (!game.permanentlyRevealedStones) game.permanentlyRevealedStones = [];
                game.permanentlyRevealedStones.push({ x, y });

                game.animation = { 
                    type: 'hidden_reveal', 
                    stones: [{ point: { x, y }, player: opponentPlayerEnum }], 
                    startTime: now, 
                    duration: 2000 
                };
                game.revealAnimationEndTime = now + 2000;
                
                if (game.isSinglePlayer) {
                    console.debug('[SinglePlayer][PLACE_STONE] Revealed hidden opponent stone', {
                        gameId: game.id,
                        stageId: game.stageId,
                        player: movePlayerEnum,
                        x,
                        y,
                        hiddenIndex: moveIndexAtTarget,
                    });
                }

                game.processingMove = null; // 처리 중인 수 해제
                return {};
            }

            const move = { x, y, player: movePlayerEnum };
            
            // 클라이언트가 계산한 AI 수는 히든 스톤 사용 불가
            if (isHidden && !isClientAiMove) {
                const hiddenKey = user.id === game.player1.id ? 'hidden_stones_used_p1' : 'hidden_stones_used_p2';
                const usedCount = game[hiddenKey] || 0;
                if (usedCount >= game.settings.hiddenStoneCount!) {
                    game.processingMove = null; // 처리 중인 수 해제
                    return { error: "No hidden stones left." };
                }
                game[hiddenKey] = usedCount + 1;
            }

            const result = processMove(game.boardState, move, game.koInfo, game.moveHistory.length);

            if (!result.isValid) {
                if (game.isSinglePlayer) {
                    console.warn('[SinglePlayer][PLACE_STONE] Invalid move rejected', {
                        gameId: game.id,
                        stageId: game.stageId,
                        player: myPlayerEnum,
                        x,
                        y,
                        reason: result.reason,
                        moveHistoryLength: game.moveHistory.length,
                    });
                }
                game.processingMove = null; // 처리 중인 수 해제
                return { error: `Invalid move: ${result.reason}` };
            }

        const prunePatternStones = () => {
            if (game.blackPatternStones) {
                game.blackPatternStones = game.blackPatternStones.filter(point => {
                    const occupant = game.boardState?.[point.y]?.[point.x];
                    return occupant === types.Player.Black;
                });
            }
            if (game.whitePatternStones) {
                game.whitePatternStones = game.whitePatternStones.filter(point => {
                    const occupant = game.boardState?.[point.y]?.[point.x];
                    return occupant === types.Player.White;
                });
            }
        };
            
            const contributingHiddenStones: { point: types.Point, player: types.Player }[] = [];
            if (result.capturedStones.length > 0) {
                const boardAfterMove = JSON.parse(JSON.stringify(game.boardState));
                boardAfterMove[y][x] = movePlayerEnum;
                const logic = getGoLogic({ ...game, boardState: boardAfterMove });
                const checkedStones = new Set<string>();

                for (const captured of result.capturedStones) {
                    const neighbors = logic.getNeighbors(captured.x, captured.y);
                    for (const n of neighbors) {
                        const neighborKey = `${n.x},${n.y}`;
                        if (checkedStones.has(neighborKey) || boardAfterMove[n.y][n.x] !== movePlayerEnum) continue;
                        checkedStones.add(neighborKey);
                        const isCurrentMove = n.x === x && n.y === y;
                        let isHiddenStone = isCurrentMove ? isHidden : false;
                        if (!isCurrentMove) {
                            const moveIndex = game.moveHistory.findIndex(m => m.x === n.x && m.y === n.y);
                            isHiddenStone = moveIndex !== -1 && !!game.hiddenMoves?.[moveIndex];
                        }
                        if (isHiddenStone) {
                            if (!game.permanentlyRevealedStones || !game.permanentlyRevealedStones.some(p => p.x === n.x && p.y === n.y)) {
                                contributingHiddenStones.push({ point: { x: n.x, y: n.y }, player: movePlayerEnum });
                            }
                        }
                    }
                }
            }

            const capturedHiddenStones: { point: types.Point; player: types.Player }[] = [];
            if (result.capturedStones.length > 0) {
                for (const capturedStone of result.capturedStones) {
                    const moveIndex = game.moveHistory.findIndex(m => m.x === capturedStone.x && m.y === capturedStone.y);
                    if (moveIndex !== -1 && game.hiddenMoves?.[moveIndex]) {
                        const isPermanentlyRevealed = game.permanentlyRevealedStones?.some(p => p.x === capturedStone.x && p.y === capturedStone.y);
                        if (!isPermanentlyRevealed) {
                            capturedHiddenStones.push({ point: capturedStone, player: opponentPlayerEnum });
                        }
                    }
                }
            }
            
            const allStonesToReveal = [...contributingHiddenStones, ...capturedHiddenStones];
            const uniqueStonesToReveal = Array.from(new Map(allStonesToReveal.map(item => [JSON.stringify(item.point), item])).values());
            
            if (uniqueStonesToReveal.length > 0) {
                game.gameStatus = 'hidden_reveal_animating';
                game.animation = {
                    type: 'hidden_reveal',
                    stones: uniqueStonesToReveal,
                    startTime: now,
                    duration: 2000
                };
                game.revealAnimationEndTime = now + 2000;
                game.pendingCapture = { stones: result.capturedStones, move, hiddenContributors: contributingHiddenStones.map(c => c.point) };
            
                game.lastMove = { x, y };
                game.lastTurnStones = null;
                game.moveHistory.push(move);
                if (isHidden) {
                    if (!game.hiddenMoves) game.hiddenMoves = {};
                    game.hiddenMoves[game.moveHistory.length - 1] = true;
                }
            
                game.boardState = result.newBoardState;
                for (const stone of result.capturedStones) {
                    game.boardState[stone.y][stone.x] = opponentPlayerEnum;
                }
            
                if (!game.permanentlyRevealedStones) game.permanentlyRevealedStones = [];
                uniqueStonesToReveal.forEach(s => {
                    if (!game.permanentlyRevealedStones!.some(p => p.x === s.point.x && p.y === s.point.y)) {
                        game.permanentlyRevealedStones!.push(s.point);
                    }
                });
                prunePatternStones();
            
                if (game.turnDeadline) {
                    game.pausedTurnTimeLeft = (game.turnDeadline - now) / 1000;
                    game.turnDeadline = undefined;
                    game.turnStartTime = undefined;
                }
                return {};
            }


            game.boardState = result.newBoardState;
            game.lastMove = { x, y };
            game.lastTurnStones = null;
            game.moveHistory.push(move);
            game.koInfo = result.newKoInfo;
            game.passCount = 0;

            if (isHidden) {
                if (!game.hiddenMoves) game.hiddenMoves = {};
                game.hiddenMoves[game.moveHistory.length - 1] = true;
            }

            if (result.capturedStones.length > 0) {
                if (!game.justCaptured) game.justCaptured = [];
                for (const stone of result.capturedStones) {
                    const capturedPlayerEnum = opponentPlayerEnum;
                    
                    let points = 1;
                    let wasHiddenForJustCaptured = false; // default for justCaptured

                    if (game.isSinglePlayer) {
                        const patternStones = capturedPlayerEnum === types.Player.Black ? game.blackPatternStones : game.whitePatternStones;
                        if (patternStones) {
                            const patternIndex = patternStones.findIndex(p => p.x === stone.x && p.y === stone.y);
                            if (patternIndex !== -1) {
                                points = 2; // Pattern stones are worth 2 points
                                // Remove the pattern from the list so it's a one-time bonus
                                patternStones.splice(patternIndex, 1);
                            }
                        }
                    } else { // PvP logic
                        const isBaseStone = game.baseStones?.some(bs => bs.x === stone.x && bs.y === stone.y);
                        const moveIndex = game.moveHistory.findIndex(m => m.x === stone.x && m.y === stone.y);
                        const wasHidden = moveIndex !== -1 && !!game.hiddenMoves?.[moveIndex];
                        wasHiddenForJustCaptured = wasHidden; // pass to justCaptured
                        
                        if (isBaseStone) {
                            game.baseStoneCaptures[movePlayerEnum]++;
                            points = 5;
                        } else if (wasHidden) {
                             game.hiddenStoneCaptures[movePlayerEnum]++;
                             points = 5;
                             if (!game.permanentlyRevealedStones) game.permanentlyRevealedStones = [];
                             game.permanentlyRevealedStones.push(stone);
                        }
                    }

                    game.captures[movePlayerEnum] += points;
                    game.justCaptured.push({ point: stone, player: capturedPlayerEnum, wasHidden: wasHiddenForJustCaptured });
                }
            }
            prunePatternStones();

            const playerWhoMoved = movePlayerEnum;
            if (game.settings.timeLimit > 0) {
                const timeKey = playerWhoMoved === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
                const fischerIncrement = game.mode === types.GameMode.Speed || (game.mode === types.GameMode.Mix && game.settings.mixedModes?.includes(types.GameMode.Speed)) ? (game.settings.timeIncrement || 0) : 0;
                
                if (game.turnDeadline) {
                    const timeRemaining = Math.max(0, (game.turnDeadline - now) / 1000);
                    game[timeKey] = timeRemaining + fischerIncrement;
                } else if(game.pausedTurnTimeLeft) {
                    game[timeKey] = game.pausedTurnTimeLeft + fischerIncrement;
                } else {
                    game[timeKey] += fischerIncrement;
                }
            }

            // 싱글플레이 턴 카운팅 및 자동 계가 트리거
            if (game.isSinglePlayer && game.stageId) {
                game.totalTurns = game.moveHistory.length;
                
                const { SINGLE_PLAYER_STAGES } = await import('../../constants/singlePlayerConstants.js');
                const stage = SINGLE_PLAYER_STAGES.find(s => s.id === game.stageId);
                
                // 살리기 바둑 모드: 백의 턴 수 체크
                const isSurvivalMode = (game.settings as any)?.isSurvivalMode === true;
                if (isSurvivalMode && stage?.survivalTurns) {
                    // 백이 수를 둔 경우 whiteTurnsPlayed 증가
                    if (movePlayerEnum === types.Player.White) {
                        const whiteTurnsPlayed = ((game as any).whiteTurnsPlayed || 0) + 1;
                        (game as any).whiteTurnsPlayed = whiteTurnsPlayed;
                        const survivalTurns = stage.survivalTurns;
                        
                        // 백이 목표점수를 달성했는지 먼저 체크 (목표 달성 시 백 승리)
                        const target = getCaptureTarget(game, types.Player.White);
                        if (target !== undefined && target !== NO_CAPTURE_TARGET && game.captures[types.Player.White] >= target) {
                            const { endGame } = await import('../summaryService.js');
                            await endGame(game, types.Player.White, 'capture_limit');
                            return {};
                        }
                        
                        // 백의 남은 턴이 0이 되면 흑 승리 (백이 목표점수를 달성하지 못함)
                        const remainingTurns = survivalTurns - whiteTurnsPlayed;
                        if (remainingTurns <= 0 && survivalTurns > 0) {
                            if (game.gameStatus === 'playing') {
                                const { endGame } = await import('../summaryService.js');
                                await endGame(game, types.Player.Black, 'capture_limit');
                                return {};
                            }
                        }
                    }
                }
                
                // 자동 계가 트리거 체크
                if (stage?.autoScoringTurns && game.totalTurns >= stage.autoScoringTurns) {
                    const { getGameResult } = await import('../gameModes.js');
                    await getGameResult(game);
                    return {};
                }
                
                // 유단자 1~5 스테이지: 흑돌 개수제한 체크
                if (stage?.blackTurnLimit && movePlayerEnum === types.Player.Black) {
                    const blackMovesCount = game.moveHistory.filter(m => m.player === types.Player.Black && m.x !== -1).length;
                    if (blackMovesCount >= stage.blackTurnLimit) {
                        // 흑돌 개수제한 도달 시 AI 승리
                        const { endGame } = await import('../summaryService.js');
                        await endGame(game, types.Player.White, 'timeout');
                        return {};
                    }
                }
            }
            
            game.currentPlayer = opponentPlayerEnum;
            game.missileUsedThisTurn = false;
            
            game.gameStatus = 'playing';
            game.itemUseDeadline = undefined;
            game.pausedTurnTimeLeft = undefined;


            if (game.settings.timeLimit > 0) {
                const nextPlayer = game.currentPlayer;
                const nextTimeKey = nextPlayer === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
                 const isFischer = game.mode === types.GameMode.Speed || (game.mode === types.GameMode.Mix && game.settings.mixedModes?.includes(types.GameMode.Speed));
                const isNextInByoyomi = game[nextTimeKey] <= 0 && game.settings.byoyomiCount > 0 && !isFischer;

                if (isNextInByoyomi) {
                    game.turnDeadline = now + game.settings.byoyomiTime * 1000;
                } else {
                    game.turnDeadline = now + game[nextTimeKey] * 1000;
                }
                game.turnStartTime = now;
            } else {
                 game.turnDeadline = undefined;
                 game.turnStartTime = undefined;
            }

            // After move logic
            if (game.mode === types.GameMode.Capture || game.isSinglePlayer) {
                const target = getCaptureTarget(game, movePlayerEnum);
                if (target !== undefined && target !== NO_CAPTURE_TARGET && game.captures[movePlayerEnum] >= target) {
                    await summaryService.endGame(game, movePlayerEnum, 'capture_limit');
                }
            }
            
            if (game.isSinglePlayer) {
                const boardSampleTop = game.boardState?.slice(0, 3)?.map(row => Array.isArray(row) ? row.join('') : row);
                const boardSampleMid = game.boardState?.slice(-3)?.map(row => Array.isArray(row) ? row.join('') : row);
                const recentMoves = game.moveHistory.slice(Math.max(0, game.moveHistory.length - 4));
                console.debug('[SinglePlayer][PLACE_STONE] Move applied', {
                    gameId: game.id,
                    stageId: game.stageId,
                    player: movePlayerEnum,
                    x,
                    y,
                    moveIndex: game.moveHistory.length - 1,
                    captures: game.captures[movePlayerEnum],
                    totalMoves: game.moveHistory.length,
                    currentPlayer: game.currentPlayer,
                    serverRevision: game.serverRevision,
                    boardSampleTop,
                    boardSampleMid,
                    recentMoves,
                    isClientAiMove,
                });
            }

            // 처리 중인 수 해제
            game.processingMove = null;

            // 싱글플레이인 경우 AI 수 처리
            if (game.isSinglePlayer && game.gameStatus === 'playing' && game.currentPlayer !== types.Player.None) {
                const aiPlayerId = game.currentPlayer === types.Player.Black ? game.blackPlayerId : game.whitePlayerId;
                const isAiTurn = aiPlayerId === aiUserId;
                
                if (isAiTurn) {
                    // 클라이언트가 계산한 AI 수인 경우 (isClientAiMove 플래그 확인)
                    const isClientAiMove = (payload as any).isClientAiMove === true;
                    
                    if (isClientAiMove) {
                        // 클라이언트가 계산한 AI 수를 검증만 수행 (서버 부하 없음)
                        // 이미 PLACE_STONE으로 처리되었으므로 추가 작업 불필요
                        // 단, 클라이언트가 잘못 계산한 경우를 대비해 검증은 이미 위에서 수행됨
                        // 클라이언트에서 AI 수를 보내는 경우 1초 대기는 클라이언트에서 처리하므로 서버에서는 대기하지 않음
                    } else {
                        // 클라이언트가 AI 수를 계산하지 않은 경우에만 서버에서 처리
                        // (하위 호환성을 위해 유지, 점진적으로 클라이언트 측 AI로 전환)
                        const { aiProcessingQueue } = await import('../aiProcessingQueue.js');
                        aiProcessingQueue.enqueue(game.id, Date.now());
                    }
                }
            }

            return {};
            } catch (error: any) {
                game.processingMove = null;
                console.error('[PLACE_STONE] Error:', error);
                console.error('[PLACE_STONE] Stack:', error?.stack);
                console.error('[PLACE_STONE] Game state:', { 
                    gameId: game.id, 
                    stageId: game.stageId,
                    currentPlayer: game.currentPlayer,
                    gameStatus: game.gameStatus,
                    boardState: game.boardState ? 'exists' : 'missing',
                    payload 
                });
                return { error: error?.message || 'An error occurred while placing stone.' };
            }
        }
        case 'PASS_TURN': {
            if (!isMyTurn || game.gameStatus !== 'playing') return { error: 'Not your turn to pass.' };
            game.passCount++;
            game.lastMove = { x: -1, y: -1 };
            game.lastTurnStones = null;
            game.moveHistory.push({ player: myPlayerEnum, x: -1, y: -1 });

            if (game.passCount >= 2) {
                const isHiddenMode = game.mode === types.GameMode.Hidden || (game.mode === types.GameMode.Mix && game.settings.mixedModes?.includes(types.GameMode.Hidden));

                if (isHiddenMode) {
                    const unrevealedStones: { point: types.Point, player: types.Player }[] = [];
                    if (game.hiddenMoves && game.moveHistory) {
                        for (const moveIndexStr in game.hiddenMoves) {
                            const moveIndex = parseInt(moveIndexStr, 10);
                            if (game.hiddenMoves[moveIndex]) {
                                const move = game.moveHistory[moveIndex];
                                if (move && move.x !== -1 && game.boardState[move.y]?.[move.x] === move.player) {
                                    const isPermanentlyRevealed = game.permanentlyRevealedStones?.some(p => p.x === move.x && p.y === move.y);
                                    if (!isPermanentlyRevealed) {
                                        unrevealedStones.push({ point: { x: move.x, y: move.y }, player: move.player });
                                    }
                                }
                            }
                        }
                    }

                    if (unrevealedStones.length > 0) {
                        game.gameStatus = 'hidden_final_reveal';
                        game.animation = {
                            type: 'hidden_reveal',
                            stones: unrevealedStones,
                            startTime: now,
                            duration: 3000
                        };
                        game.revealAnimationEndTime = now + 3000;
                        if (!game.permanentlyRevealedStones) game.permanentlyRevealedStones = [];
                        game.permanentlyRevealedStones.push(...unrevealedStones.map(s => s.point));
                    } else {
                        await getGameResult(game);
                    }
                } else {
                    await getGameResult(game);
                }
            } else {
                const playerWhoMoved = myPlayerEnum;
                if (game.settings.timeLimit > 0) {
                    const timeKey = playerWhoMoved === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
                    
                    if (game.turnDeadline) {
                        const timeRemaining = Math.max(0, (game.turnDeadline - now) / 1000);
                        game[timeKey] = timeRemaining;
                    }
                }
                game.currentPlayer = myPlayerEnum === types.Player.Black ? types.Player.White : types.Player.Black;
                if (game.settings.timeLimit > 0) {
                    const nextPlayer = game.currentPlayer;
                    const nextTimeKey = nextPlayer === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
                     const isFischer = game.mode === types.GameMode.Speed || (game.mode === types.GameMode.Mix && game.settings.mixedModes?.includes(types.GameMode.Speed));
                    const isNextInByoyomi = game[nextTimeKey] <= 0 && game.settings.byoyomiCount > 0 && !isFischer;
                    if (isNextInByoyomi) {
                        game.turnDeadline = now + game.settings.byoyomiTime * 1000;
                    } else {
                        game.turnDeadline = now + game[nextTimeKey] * 1000;
                    }
                    game.turnStartTime = now;
                }
            }
            return {};
        }
        case 'REQUEST_NO_CONTEST_LEAVE': {
            if (!game.canRequestNoContest?.[user.id]) {
                return { error: "무효 처리 요청을 할 수 없습니다." };
            }

            game.gameStatus = 'no_contest';
            game.winReason = 'disconnect';
            if(!game.noContestInitiatorIds) game.noContestInitiatorIds = [];
            game.noContestInitiatorIds.push(user.id);
            
            await summaryService.processGameSummary(game);

            if (volatileState.userStatuses[user.id]) {
                volatileState.userStatuses[user.id] = { status: UserStatus.Waiting, mode: game.mode };
            }

            return {};
        }
        case 'RESIGN_GAME': {
            const winner = myPlayerEnum === types.Player.Black ? types.Player.White : types.Player.Black;
            await summaryService.endGame(game, winner, 'resign');
            return {};
        }
    }

    return null;
};
