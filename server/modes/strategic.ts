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
import { aiUserId } from '../aiPlayer.js';
import { getCaptureTarget, NO_CAPTURE_TARGET } from '../utils/captureTargets.ts';


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
    // AI 턴일 때는 타임아웃 체크를 건너뛰기 (AI는 시간 제한이 없음)
    const isAiTurn = game.isAiGame && game.currentPlayer !== types.Player.None && 
                    (game.currentPlayer === types.Player.Black ? game.blackPlayerId === aiUserId : game.whitePlayerId === aiUserId);
    
    // AI 턴일 때는 시간을 멈춤
    if (isAiTurn && game.gameStatus === 'playing') {
        game.turnDeadline = undefined;
        game.turnStartTime = undefined;
    }
    
    if (game.gameStatus === 'playing' && game.turnDeadline && now > game.turnDeadline && !isAiTurn) {
        const timedOutPlayer = game.currentPlayer;
        const timeKey = timedOutPlayer === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
        const byoyomiKey = timedOutPlayer === types.Player.Black ? 'blackByoyomiPeriodsLeft' : 'whiteByoyomiPeriodsLeft';
        const isFischer = game.mode === types.GameMode.Speed || (game.mode === types.GameMode.Mix && game.settings.mixedModes?.includes(types.GameMode.Speed));

        // turnDeadline이 지났으므로 실제 남은 시간 계산
        const timeRemaining = Math.max(0, (game.turnDeadline - now) / 1000);
        
        // turnStartTime을 기반으로 실제 경과 시간 계산
        const elapsedSinceTurnStart = game.turnStartTime ? (now - game.turnStartTime) / 1000 : 0;
        const initialTimeForThisTurn = game.turnStartTime && game.turnDeadline ? (game.turnDeadline - game.turnStartTime) / 1000 : 0;
        
        // 초읽기 상태 확인: 이번 턴의 초기 시간이 byoyomiTime과 같거나 작으면 초읽기 중
        const wasInByoyomi = initialTimeForThisTurn > 0 && initialTimeForThisTurn <= (game.settings.byoyomiTime || 0) + 0.1; // 0.1초 오차 허용
        
        // 또는 game[timeKey]가 0 이하이면 초읽기 중
        const isInByoyomiByTimeKey = (game[timeKey] || 0) <= 0;

        if (isFischer) {
            // Fischer timeout is an immediate loss.
        } else if (!wasInByoyomi && !isInByoyomiByTimeKey && timeRemaining <= 0) {
            // Main time expired -> enter byoyomi without consuming a period
            game[timeKey] = 0;
            if (game.settings.byoyomiCount > 0) {
                // 초읽기 기간 초기화
                if (game[byoyomiKey] === undefined || game[byoyomiKey] === null) {
                    game[byoyomiKey] = game.settings.byoyomiCount;
                }
                // Do not decrement period on entering byoyomi
                game.turnDeadline = now + game.settings.byoyomiTime * 1000;
                game.turnStartTime = now;
                console.log(`[Strategic] Player ${timedOutPlayer} entered byoyomi. Periods left: ${game[byoyomiKey]}`);
                return;
            }
        } else if ((wasInByoyomi || isInByoyomiByTimeKey) && timeRemaining <= 0) {
            // Byoyomi expired
            if (game[byoyomiKey] === undefined || game[byoyomiKey] === null) {
                game[byoyomiKey] = game.settings.byoyomiCount;
            }
            if (game[byoyomiKey] > 0) {
                game[byoyomiKey]--;
                game.turnDeadline = now + game.settings.byoyomiTime * 1000;
                game.turnStartTime = now;
                console.log(`[Strategic] Player ${timedOutPlayer} byoyomi period consumed. Periods left: ${game[byoyomiKey]}`);
                return;
            }
        }
        
        // No time or byoyomi left
        const winner = timedOutPlayer === types.Player.Black ? types.Player.White : types.Player.Black;
        game.lastTimeoutPlayerId = game.currentPlayer === types.Player.Black ? game.blackPlayerId! : game.whitePlayerId!;
        game.lastTimeoutPlayerIdClearTime = now + 5000;
        
        console.log(`[Strategic] Player ${timedOutPlayer} timed out. Winner: ${winner}, wasInByoyomi: ${wasInByoyomi}, isInByoyomiByTimeKey: ${isInByoyomiByTimeKey}, byoyomiPeriods: ${game[byoyomiKey]}`);
        summaryService.endGame(game, winner, 'timeout');
    }

    // 살리기 바둑 모드 승리 조건 체크 (백의 남은 턴이 0인지 확인)
    const isSurvivalMode = (game.settings as any)?.isSurvivalMode === true;
    if (isSurvivalMode && game.gameStatus === 'playing') {
        const whiteTurnsPlayed = (game as any).whiteTurnsPlayed || 0;
        const survivalTurns = (game.settings as any)?.survivalTurns || 0;
        
        // 백이 목표점수를 달성했는지 먼저 체크 (목표 달성 시 백 승리)
        const target = getCaptureTarget(game, types.Player.White);
        if (target !== undefined && target !== NO_CAPTURE_TARGET && game.captures[types.Player.White] >= target) {
            console.log(`[Survival Go] White reached target score in update loop (${target}), White wins`);
            await summaryService.endGame(game, types.Player.White, 'capture_limit');
            return;
        }
        
        // 백의 남은 턴이 0이 되면 흑 승리 (백이 목표점수를 달성하지 못함)
        // 백의 남은 턴 = survivalTurns - whiteTurnsPlayed
        // 백의 남은 턴이 0이 되었다는 것은 whiteTurnsPlayed >= survivalTurns
        const remainingTurns = survivalTurns - whiteTurnsPlayed;
        if (remainingTurns <= 0 && survivalTurns > 0) {
            console.log(`[Survival Go] White ran out of turns in update loop (${whiteTurnsPlayed}/${survivalTurns}, remaining: ${remainingTurns}), Black wins. Game status before endGame: ${game.gameStatus}`);
            if (game.gameStatus === 'playing') {
                await summaryService.endGame(game, types.Player.Black, 'capture_limit');
                console.log(`[Survival Go] endGame called in update loop. Game status after: ${game.gameStatus}`);
            } else {
                console.log(`[Survival Go] Game already ended in update loop (status: ${game.gameStatus}), skipping endGame`);
            }
            return;
        }
    }

    // scoring 상태인 게임은 업데이트하지 않음 (계가 진행 중)
    if (game.gameStatus === 'scoring' || (game as any).isScoringProtected) {
        return;
    }
    
    // 도전의 탑 또는 싱글플레이: 흑돌 턴 제한 체크 및 자동 계가 트리거
    const isTower = game.gameCategory === 'tower';
    const isSinglePlayer = game.isSinglePlayer && !isTower; // 도전의 탑과 싱글플레이 명확히 분리
    if ((isSinglePlayer || isTower) && game.gameStatus === 'playing' && game.stageId) {
        const { TOWER_STAGES } = await import('../../constants/towerConstants.js');
        const { SINGLE_PLAYER_STAGES } = await import('../../constants/singlePlayerConstants.js');
        const stage = isTower 
            ? TOWER_STAGES.find(s => s.id === game.stageId)
            : SINGLE_PLAYER_STAGES.find(s => s.id === game.stageId);
        
        // 자동 계가 트리거 체크 (싱글플레이어만)
        if (isSinglePlayer && stage?.autoScoringTurns) {
            const validMoves = game.moveHistory.filter(m => m.x !== -1 && m.y !== -1);
            const totalTurns = game.totalTurns ?? validMoves.length;
            
            if (totalTurns >= stage.autoScoringTurns) {
                console.log(`[Strategic] Auto-scoring triggered in update loop at ${totalTurns} turns (stage: ${game.stageId})`);
                // 게임 상태를 먼저 scoring으로 변경하여 다른 로직이 게임을 재시작하지 않도록 함
                game.gameStatus = 'scoring';
                await db.saveGame(game);
                const { broadcast } = await import('../socket.js');
                broadcast({ type: 'GAME_UPDATE', payload: { [game.id]: game } });
                const { getGameResult } = await import('../gameModes.js');
                await getGameResult(game);
                return;
            }
        }
        
        if (stage?.blackTurnLimit) {
            const blackMovesCount = game.moveHistory.filter(m => m.player === types.Player.Black && m.x !== -1).length;
            const blackTurnLimitBonus = (game as any).blackTurnLimitBonus || 0;
            const effectiveBlackTurnLimit = stage.blackTurnLimit + blackTurnLimitBonus;
            const remainingTurns = effectiveBlackTurnLimit - blackMovesCount;
            
            if (remainingTurns <= 0 && effectiveBlackTurnLimit > 0) {
                console.log(`[Tower/SinglePlayer] Black ran out of turns in update loop (${blackMovesCount}/${effectiveBlackTurnLimit}), White wins. Game status before endGame: ${game.gameStatus}`);
                if (game.gameStatus === 'playing') {
                    await summaryService.endGame(game, types.Player.White, 'timeout');
                    console.log(`[Tower/SinglePlayer] endGame called in update loop. Game status after: ${game.gameStatus}`);
                } else {
                    console.log(`[Tower/SinglePlayer] Game already ended in update loop (status: ${game.gameStatus}), skipping endGame`);
                }
                return;
            }
        }
    }

    // Delegate to mode-specific update logic
    updateNigiriState(game, now);
    updateCaptureState(game, now);
    updateBaseState(game, now);
    await updateHiddenState(game, now);
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
            if (!isMyTurn || (game.gameStatus !== 'playing' && game.gameStatus !== 'hidden_placing')) {
                return { error: '내 차례가 아닙니다.' };
            }

            // 살리기 바둑 모드: 흑이 수를 두기 전에 백의 남은 턴 체크
            const isSurvivalMode = (game.settings as any)?.isSurvivalMode === true;
            const isSinglePlayer = game.isSinglePlayer && !isTower;
            if (isSurvivalMode && (game.mode === types.GameMode.Capture && isSinglePlayer) && myPlayerEnum === types.Player.Black) {
                const whiteTurnsPlayed = (game as any).whiteTurnsPlayed || 0;
                const survivalTurns = (game.settings as any)?.survivalTurns || 0;
                const remainingTurns = survivalTurns - whiteTurnsPlayed;
                
                if (remainingTurns <= 0 && survivalTurns > 0 && game.gameStatus === 'playing') {
                    console.log(`[Survival Go] White ran out of turns before Black move (${whiteTurnsPlayed}/${survivalTurns}), Black wins immediately`);
                    await summaryService.endGame(game, types.Player.Black, 'capture_limit');
                    return {};
                }
            }

            const { x, y, isHidden } = payload;
            const opponentPlayerEnum = myPlayerEnum === types.Player.Black ? types.Player.White : (myPlayerEnum === types.Player.White ? types.Player.Black : types.Player.None);
            const stoneAtTarget = game.boardState[y][x];

            const moveIndexAtTarget = game.moveHistory.findIndex(m => m.x === x && m.y === y);
            const isTargetHiddenOpponentStone =
                stoneAtTarget === opponentPlayerEnum &&
                moveIndexAtTarget !== -1 &&
                game.hiddenMoves?.[moveIndexAtTarget] &&
                !game.permanentlyRevealedStones?.some(p => p.x === x && p.y === y);

            if (stoneAtTarget !== types.Player.None && !isTargetHiddenOpponentStone) {
                return {}; // Silently fail if placing on a visible stone
            }

            if (isTargetHiddenOpponentStone) {
                game.captures[myPlayerEnum] += 5; // Hidden stones are worth 5 points
                game.hiddenStoneCaptures[myPlayerEnum]++;
                
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
                
                return {};
            }

            const move = { x, y, player: myPlayerEnum };
            
            if (isHidden) {
                const hiddenKey = user.id === game.player1.id ? 'hidden_stones_used_p1' : 'hidden_stones_used_p2';
                const usedCount = game[hiddenKey] || 0;
                if (usedCount >= game.settings.hiddenStoneCount!) {
                    return { error: "No hidden stones left." };
                }
                game[hiddenKey] = usedCount + 1;
            }

            const result = processMove(game.boardState, move, game.koInfo, game.moveHistory.length);

            if (!result.isValid) {
                return { error: `Invalid move: ${result.reason}` };
            }

            const prunePatternStones = () => {
                if (game.blackPatternStones) {
                    game.blackPatternStones = game.blackPatternStones.filter(point => {
                        const occupant = game.boardState?.[point.y]?.[point.x];
                        // 히든 돌이 공개된 경우에도 문양 유지 (permanentlyRevealedStones에 있으면 유지)
                        const isPermanentlyRevealed = game.permanentlyRevealedStones?.some(p => p.x === point.x && p.y === point.y);
                        return occupant === types.Player.Black || isPermanentlyRevealed;
                    });
                }
                if (game.whitePatternStones) {
                    game.whitePatternStones = game.whitePatternStones.filter(point => {
                        const occupant = game.boardState?.[point.y]?.[point.x];
                        // 히든 돌이 공개된 경우에도 문양 유지 (permanentlyRevealedStones에 있으면 유지)
                        const isPermanentlyRevealed = game.permanentlyRevealedStones?.some(p => p.x === point.x && p.y === point.y);
                        return occupant === types.Player.White || isPermanentlyRevealed;
                    });
                }
            };
            
            const contributingHiddenStones: { point: types.Point, player: types.Player }[] = [];
            if (result.capturedStones.length > 0) {
                const boardAfterMove = JSON.parse(JSON.stringify(game.boardState));
                boardAfterMove[y][x] = myPlayerEnum;
                const logic = getGoLogic({ ...game, boardState: boardAfterMove });
                const checkedStones = new Set<string>();

                for (const captured of result.capturedStones) {
                    const neighbors = logic.getNeighbors(captured.x, captured.y);
                    for (const n of neighbors) {
                        const neighborKey = `${n.x},${n.y}`;
                        if (checkedStones.has(neighborKey) || boardAfterMove[n.y][n.x] !== myPlayerEnum) continue;
                        checkedStones.add(neighborKey);
                        const isCurrentMove = n.x === x && n.y === y;
                        let isHiddenStone = isCurrentMove ? isHidden : false;
                        if (!isCurrentMove) {
                            const moveIndex = game.moveHistory.findIndex(m => m.x === n.x && m.y === n.y);
                            isHiddenStone = moveIndex !== -1 && !!game.hiddenMoves?.[moveIndex];
                        }
                        if (isHiddenStone) {
                            if (!game.permanentlyRevealedStones || !game.permanentlyRevealedStones.some(p => p.x === n.x && p.y === n.y)) {
                                contributingHiddenStones.push({ point: { x: n.x, y: n.y }, player: myPlayerEnum });
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
                                patternStones.splice(patternIndex, 1); // consume the pattern
                            }
                        }
                    } else { // PvP logic
                        const isBaseStone = game.baseStones?.some(bs => bs.x === stone.x && bs.y === stone.y);
                        const moveIndex = game.moveHistory.findIndex(m => m.x === stone.x && m.y === stone.y);
                        const wasHidden = moveIndex !== -1 && !!game.hiddenMoves?.[moveIndex];
                        wasHiddenForJustCaptured = wasHidden; // pass to justCaptured
                        
                        if (isBaseStone) {
                            game.baseStoneCaptures[myPlayerEnum]++;
                            points = 5;
                        } else if (wasHidden) {
                             game.hiddenStoneCaptures[myPlayerEnum]++;
                             points = 5;
                             if (!game.permanentlyRevealedStones) game.permanentlyRevealedStones = [];
                             game.permanentlyRevealedStones.push(stone);
                        }
                    }

                    game.captures[myPlayerEnum] += points;
                    game.justCaptured.push({ point: stone, player: capturedPlayerEnum, wasHidden: wasHiddenForJustCaptured });
                }
            }
            prunePatternStones();

            // 도전의 탑 또는 싱글플레이: 승리 조건 및 턴 제한 체크 (수를 둔 직후, 턴 변경 전)
            const isTower = game.gameCategory === 'tower';
            const isSinglePlayer = game.isSinglePlayer && !isTower; // 도전의 탑과 싱글플레이 명확히 분리
            
            // 1. 승리 조건 체크 (목표 점수 달성)
            // 도전의 탑은 클라이언트 사이드에서 승리 조건을 체크하므로 서버에서는 체크하지 않음
            // 싱글플레이만 서버에서 승리 조건을 체크
            if (game.mode === types.GameMode.Capture && isSinglePlayer) {
                const isSurvivalMode = (game.settings as any)?.isSurvivalMode === true;
                
                if (!isSurvivalMode) {
                    // 일반 따내기 바둑 모드 (싱글플레이만)
                    const target = getCaptureTarget(game, myPlayerEnum);
                    const currentCaptures = game.captures[myPlayerEnum];
                    console.log(`[Capture] Single player - Player ${myPlayerEnum} - target: ${target}, currentCaptures: ${currentCaptures}, effectiveTargets: ${JSON.stringify(game.effectiveCaptureTargets)}`);
                    
                    if (target !== undefined && target !== NO_CAPTURE_TARGET && currentCaptures >= target) {
                        console.log(`[Capture] Single player - Player ${myPlayerEnum} reached target score (${currentCaptures} >= ${target}), ending game`);
                        await summaryService.endGame(game, myPlayerEnum, 'capture_limit');
                        return {};
                    }
                }
            }
            
            // 2. 도전의 탑 또는 싱글플레이: 흑돌 턴 제한 체크
            if ((isSinglePlayer || isTower) && game.gameStatus === 'playing' && game.stageId && myPlayerEnum === types.Player.Black) {
                const { TOWER_STAGES } = await import('../../constants/towerConstants.js');
                const { SINGLE_PLAYER_STAGES } = await import('../../constants/singlePlayerConstants.js');
                const stage = isTower 
                    ? TOWER_STAGES.find(s => s.id === game.stageId)
                    : SINGLE_PLAYER_STAGES.find(s => s.id === game.stageId);
                
                if (stage?.blackTurnLimit) {
                    const blackMovesCount = game.moveHistory.filter(m => m.player === types.Player.Black && m.x !== -1).length;
                    const blackTurnLimitBonus = (game as any).blackTurnLimitBonus || 0;
                    const effectiveBlackTurnLimit = stage.blackTurnLimit + blackTurnLimitBonus;
                    const remainingTurns = effectiveBlackTurnLimit - blackMovesCount;
                    
                    console.log(`[Tower/SinglePlayer] After Black move - moves: ${blackMovesCount}/${effectiveBlackTurnLimit}, remaining: ${remainingTurns}`);
                    
                    if (remainingTurns <= 0 && effectiveBlackTurnLimit > 0) {
                        console.log(`[Tower/SinglePlayer] Black ran out of turns after move (${blackMovesCount}/${effectiveBlackTurnLimit}), White wins. Game status: ${game.gameStatus}`);
                        if (game.gameStatus === 'playing') {
                            await summaryService.endGame(game, types.Player.White, 'timeout');
                            console.log(`[Tower/SinglePlayer] endGame called after Black move. Game status after: ${game.gameStatus}`);
                            return {};
                        }
                    }
                }
            }

            const playerWhoMoved = myPlayerEnum;
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

            // 살리기 바둑 모드 승리 조건 체크 (턴 변경 후)
            // 도전의 탑은 클라이언트에서 승리 조건을 체크하므로 서버에서는 체크하지 않음
            const isSurvivalMode = (game.settings as any)?.isSurvivalMode === true;
            const isSinglePlayer = game.isSinglePlayer && !isTower; // 도전의 탑과 싱글플레이 명확히 분리
            if (isSurvivalMode && (game.mode === types.GameMode.Capture && isSinglePlayer)) {
                // 살리기 바둑 모드: 백의 남은 턴 체크는 백이 수를 둔 직후 goAiBot.ts에서 처리됨
                // 여기서는 흑이 수를 둔 후 백의 상태를 체크
                if (myPlayerEnum === types.Player.Black) {
                    const whiteTurnsPlayed = (game as any).whiteTurnsPlayed || 0;
                    const survivalTurns = (game.settings as any)?.survivalTurns || 0;
                    
                    // 백이 목표점수를 달성했는지 먼저 체크 (목표 달성 시 백 승리)
                    const target = getCaptureTarget(game, types.Player.White);
                    if (target !== undefined && target !== NO_CAPTURE_TARGET && game.captures[types.Player.White] >= target) {
                        console.log(`[Survival Go] White reached target score after Black move (${target}), White wins`);
                        await summaryService.endGame(game, types.Player.White, 'capture_limit');
                        return {};
                    }
                    
                    // 백의 남은 턴이 0이 되면 흑 승리 (백이 목표점수를 달성하지 못함)
                    const remainingTurns = survivalTurns - whiteTurnsPlayed;
                    if (remainingTurns <= 0 && survivalTurns > 0) {
                        console.log(`[Survival Go] White ran out of turns after Black move (${whiteTurnsPlayed}/${survivalTurns}), Black wins`);
                        if (game.gameStatus === 'playing') {
                            await summaryService.endGame(game, types.Player.Black, 'capture_limit');
                            return {};
                        }
                    }
                }
            }
            
            return {};
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
    }

    return null;
};