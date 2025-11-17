import * as types from '../../types.js';
import * as db from '../db.js';
import { getGameResult } from '../gameModes.js';

type HandleActionResult = types.HandleActionResult;

export const initializeHidden = (game: types.LiveGameSession) => {
    const isHiddenMode = game.mode === types.GameMode.Hidden || (game.mode === types.GameMode.Mix && game.settings.mixedModes?.includes(types.GameMode.Hidden));
    if (isHiddenMode) {
        game.scans_p1 = (game.settings.scanCount || 0);
        game.scans_p2 = (game.settings.scanCount || 0);
        game.hidden_stones_used_p1 = 0;
        game.hidden_stones_used_p2 = 0;
    }
};

export const updateHiddenState = (game: types.LiveGameSession, now: number) => {
    const isItemMode = ['hidden_placing', 'scanning'].includes(game.gameStatus);

    if (isItemMode && game.itemUseDeadline && now > game.itemUseDeadline) {
        // Item use timed out. Cancel item mode and switch turn.
        const timedOutPlayerEnum = game.currentPlayer;
        const timedOutPlayerId = timedOutPlayerEnum === types.Player.Black ? game.blackPlayerId! : game.whitePlayerId!;
        
        game.foulInfo = { message: `${game.player1.id === timedOutPlayerId ? game.player1.nickname : game.player2.nickname}님의 아이템 시간 초과!`, expiry: now + 4000 };
        game.gameStatus = 'playing';
        game.currentPlayer = timedOutPlayerEnum === types.Player.Black ? types.Player.White : types.Player.Black;
        
        const nextPlayerTimeKey = game.currentPlayer === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
        game.turnDeadline = now + game[nextPlayerTimeKey] * 1000;
        game.turnStartTime = now;
        game.itemUseDeadline = undefined;
        game.pausedTurnTimeLeft = undefined;
        
        return;
    }

    switch (game.gameStatus) {
        case 'scanning_animating':
            if (game.animation && now > game.animation.startTime + game.animation.duration) {
                game.animation = null;
                // After animation, the game is already in 'playing' state with timer running for the correct player.
                // We just need to ensure the status is clean.
                game.gameStatus = 'playing';
            }
            break;
        case 'hidden_reveal_animating':
            if (game.revealAnimationEndTime && now >= game.revealAnimationEndTime) {
                const pendingCaptureBeforeClear = game.pendingCapture; // pendingCapture를 null로 설정하기 전에 저장
                
                if (pendingCaptureBeforeClear) {
                    const myPlayerEnum = pendingCaptureBeforeClear.move.player;
                    const opponentPlayerEnum = myPlayerEnum === types.Player.Black ? types.Player.White : types.Player.Black;
        
                    if (!game.justCaptured) game.justCaptured = [];
                    
                    // 공개되지 않은 히든 돌이 따내진 경우 (capturedHiddenStones)
                    const capturedHiddenStones = (pendingCaptureBeforeClear as any).capturedHiddenStones || [];
                    const hasUnrevealedHiddenStones = capturedHiddenStones.length > 0;
                    
                    // 3. 따낸 돌 제거 (또는 히든 돌 포함해 따내기)
                    for (const stone of pendingCaptureBeforeClear.stones) {
                        game.boardState[stone.y][stone.x] = types.Player.None; // Remove stone from board
        
                        const isBaseStone = game.baseStones?.some(bs => bs.x === stone.x && bs.y === stone.y);
                        const moveIndex = game.moveHistory.findIndex(m => m.x === stone.x && m.y === stone.y);
                        const wasHidden = moveIndex !== -1 && !!game.hiddenMoves?.[moveIndex];
                        const isUnrevealedHidden = capturedHiddenStones.some((p: types.Point) => p.x === stone.x && p.y === stone.y);
                        
                        let points = 1;
                        if (isBaseStone) {
                            game.baseStoneCaptures[myPlayerEnum]++;
                            points = 5;
                        } else if (wasHidden) {
                            game.hiddenStoneCaptures[myPlayerEnum]++;
                            // 공개되지 않은 히든 돌이 따내진 경우: 2점 (문양 돌처럼)
                            if (isUnrevealedHidden) {
                                points = 2;
                            } else {
                                points = 5;
                            }
                        }
                        game.captures[myPlayerEnum] += points;
        
                        game.justCaptured.push({ point: stone, player: opponentPlayerEnum, wasHidden });
                    }
                    
                    if (!game.newlyRevealed) game.newlyRevealed = [];
                    game.newlyRevealed.push(...pendingCaptureBeforeClear.hiddenContributors.map(p => ({ point: p, player: myPlayerEnum })));
                    
                    // 싱글플레이 AI 게임에서의 처리
                    if (game.isSinglePlayer && (game as any).isAiGame) {
                        // 히든 돌이 따내는데 역할을 한 경우 (contributingHiddenStones만 있고 capturedHiddenStones가 없는 경우)
                        const hasContributingHidden = pendingCaptureBeforeClear.hiddenContributors.length > 0;
                        const isAiMove = myPlayerEnum === types.Player.White;
                        const isUserMove = myPlayerEnum === types.Player.Black;
                        
                        if (hasContributingHidden && isAiMove && !hasUnrevealedHiddenStones) {
                            // 케이스 2: AI가 히든 돌을 사용해서 상대방 돌을 따내거나 따내는데 역할을 한 경우
                            // 4. 대국 재개를 시킨다 (AI 턴)
                            game.currentPlayer = types.Player.White; // AI 턴 유지
                            
                            if (game.settings.timeLimit > 0) {
                                const nextTimeKey = game.currentPlayer === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
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
                            
                            game.pausedTurnTimeLeft = undefined;
                            
                            // AI 수를 두도록 aiProcessingQueue에 추가
                            import('../aiProcessingQueue.js').then(({ aiProcessingQueue: queue }) => {
                                queue.enqueue(game.id, Date.now() + 1000); // 1초 후 처리
                            }).catch(err => {
                                console.error('[Hidden Mode] Failed to enqueue AI move after capture:', err);
                            });
                        } else if (hasContributingHidden && isUserMove && !hasUnrevealedHiddenStones) {
                            // 케이스 2-2: 유저가 히든 돌을 사용해서 상대방 돌을 따내거나 따내는데 역할을 한 경우
                            // 4. 대국 재개를 시킨다 (AI 턴으로 넘어감)
                            game.currentPlayer = types.Player.White; // AI 턴으로 넘어감
                            
                            if (game.settings.timeLimit > 0) {
                                const nextTimeKey = game.currentPlayer === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
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
                            
                            game.pausedTurnTimeLeft = undefined;
                            
                            // AI 수를 두도록 aiProcessingQueue에 추가
                            import('../aiProcessingQueue.js').then(({ aiProcessingQueue: queue }) => {
                                queue.enqueue(game.id, Date.now() + 1000); // 1초 후 처리
                            }).catch(err => {
                                console.error('[Hidden Mode] Failed to enqueue AI move after user capture:', err);
                            });
                        } else if (hasUnrevealedHiddenStones && isAiMove) {
                            // 케이스 3: AI가 히든 돌이 공개되지 않은 상태에서 따내진 경우
                            // 4. 대국 재개를 시킨다 (유저 턴)
                            game.currentPlayer = types.Player.Black; // 유저 턴으로 넘어감
                            
                            if (game.settings.timeLimit > 0) {
                                const nextTimeKey = game.currentPlayer === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
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
                            
                            game.pausedTurnTimeLeft = undefined;
                        }
                        
                        // 보드 상태 저장 및 브로드캐스트
                        import('../db.js').then(({ saveGame }) => {
                            saveGame(game).catch(err => {
                                console.error('[Hidden Mode] Failed to save game after capture:', err);
                            });
                        });
                        import('../socket.js').then(({ broadcast }) => {
                            broadcast({ type: 'GAME_UPDATE', payload: { [game.id]: game } });
                        });
                        
                        return; // 싱글플레이 AI 게임에서는 여기서 종료
                    }
                }

                game.animation = null;
                game.gameStatus = 'playing';
                game.revealAnimationEndTime = undefined;
                game.pendingCapture = null;
                
                // 싱글플레이에서 AI가 히든 돌 위에 착점을 시도한 경우 (pendingCaptureBeforeClear가 없음)
                if (!pendingCaptureBeforeClear && game.isSinglePlayer && (game as any).isAiGame) {
                    const isAiTurnCancelled = (game as any).isAiTurnCancelledAfterReveal;
                    
                    if (isAiTurnCancelled) {
                        // 히든 돌이 공개된 위치의 문양을 원래 플레이어(유저)의 문양으로 유지
                        // AI가 유저의 히든 돌 위에 착점을 시도한 경우, 공개된 히든 돌은 유저(흑)의 문양이어야 함
                        if (game.permanentlyRevealedStones && game.permanentlyRevealedStones.length > 0) {
                            const lastRevealedStone = game.permanentlyRevealedStones[game.permanentlyRevealedStones.length - 1];
                            const moveIndexAtRevealed = game.moveHistory.findIndex(m => m.x === lastRevealedStone.x && m.y === lastRevealedStone.y);
                            
                            if (moveIndexAtRevealed !== -1) {
                                const originalMove = game.moveHistory[moveIndexAtRevealed];
                                const originalPlayer = originalMove.player; // 원래 플레이어 (유저 = Black)
                                
                                // 원래 플레이어가 흑인 경우
                                if (originalPlayer === types.Player.Black) {
                                    // blackPatternStones에 추가 (이미 있으면 유지)
                                    if (!game.blackPatternStones) game.blackPatternStones = [];
                                    if (!game.blackPatternStones.some(p => p.x === lastRevealedStone.x && p.y === lastRevealedStone.y)) {
                                        game.blackPatternStones.push({ x: lastRevealedStone.x, y: lastRevealedStone.y });
                                    }
                                    // whitePatternStones에서 제거 (잘못 추가된 경우)
                                    if (game.whitePatternStones) {
                                        game.whitePatternStones = game.whitePatternStones.filter(p => !(p.x === lastRevealedStone.x && p.y === lastRevealedStone.y));
                                    }
                                } else {
                                    // 원래 플레이어가 백인 경우
                                    if (!game.whitePatternStones) game.whitePatternStones = [];
                                    if (!game.whitePatternStones.some(p => p.x === lastRevealedStone.x && p.y === lastRevealedStone.y)) {
                                        game.whitePatternStones.push({ x: lastRevealedStone.x, y: lastRevealedStone.y });
                                    }
                                    // blackPatternStones에서 제거 (잘못 추가된 경우)
                                    if (game.blackPatternStones) {
                                        game.blackPatternStones = game.blackPatternStones.filter(p => !(p.x === lastRevealedStone.x && p.y === lastRevealedStone.y));
                                    }
                                }
                            }
                        }
                        
                        // 3. 애니메이션 종료 후 자동계가까지 남은 턴을 1회복시킨다 (턴 사용 취소)
                        // moveHistory에서 마지막 AI 수 제거 (턴 복구)
                        if (game.moveHistory.length > 0) {
                            const lastMove = game.moveHistory[game.moveHistory.length - 1];
                            if (lastMove && lastMove.player === types.Player.White) {
                                game.moveHistory.pop();
                                // totalTurns도 감소
                                if (game.isSinglePlayer && game.stageId) {
                                    game.totalTurns = game.moveHistory.length;
                                }
                            }
                        }
                        
                        // 4. 히든 돌이 공개된 상태의 바둑판 상황에서 유저가 차례를 패스 했다고 인식시킨다
                        // (유저의 통과로 계가까지 남은 턴이 줄지 않도록 함)
                        game.passCount = (game.passCount || 0) + 1;
                        game.lastMove = { x: -1, y: -1 };
                        game.lastTurnStones = null;
                        game.moveHistory.push({ player: types.Player.Black, x: -1, y: -1 }); // 유저 패스
                        
                        // totalTurns는 패스도 카운팅하므로 증가
                        if (game.isSinglePlayer && game.stageId) {
                            game.totalTurns = game.moveHistory.length;
                        }
                        
                        // AI 턴 유지 (히든 돌이 공개된 상태에서 AI가 다시 수를 둘 수 있도록)
                        game.currentPlayer = types.Player.White;
                        
                        // 플래그 제거
                        (game as any).isAiTurnCancelledAfterReveal = false;
                        
                        // 시간 설정 (AI 턴 유지)
                        if (game.settings.timeLimit > 0) {
                            const nextTimeKey = game.currentPlayer === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
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
                        
                        game.pausedTurnTimeLeft = undefined;
                        
                        // AI 수를 두도록 aiProcessingQueue에 추가
                        import('../aiProcessingQueue.js').then(({ aiProcessingQueue: queue }) => {
                            queue.enqueue(game.id, Date.now() + 1000); // 1초 후 처리
                        }).catch(err => {
                            console.error('[Hidden Mode] Failed to enqueue AI move after reveal:', err);
                        });
                        
                        // 보드 상태 저장 및 브로드캐스트
                        import('../db.js').then(({ saveGame }) => {
                            saveGame(game).catch(err => {
                                console.error('[Hidden Mode] Failed to save game after AI turn cancel:', err);
                            });
                        });
                        import('../socket.js').then(({ broadcast }) => {
                            broadcast({ type: 'GAME_UPDATE', payload: { [game.id]: game } });
                        });
                        
                        return;
                    }
                }
                
                // pendingCaptureBeforeClear가 있는 경우에만 턴 넘기기 로직 실행
                // 단, 싱글플레이 AI 게임에서는 턴을 넘기지 않음 (standard.ts에서 이미 처리됨)
                if (pendingCaptureBeforeClear && !(game.isSinglePlayer && (game as any).isAiGame)) {
                    // 보드 상태 저장 및 브로드캐스트 (돌 제거 후)
                    import('../db.js').then(({ saveGame }) => {
                        saveGame(game).catch(err => {
                            console.error('[Hidden Mode] Failed to save game after capture:', err);
                        });
                    });
                    import('../socket.js').then(({ broadcast }) => {
                        broadcast({ type: 'GAME_UPDATE', payload: { [game.id]: game } });
                    });
                    
                    // Resume timer for the next player
                    const playerWhoMoved = pendingCaptureBeforeClear.move.player;
                    const nextPlayer = playerWhoMoved === types.Player.Black ? types.Player.White : types.Player.Black;
                
                    if (game.settings.timeLimit > 0) {
                        const timeKey = playerWhoMoved === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
                        const fischerIncrement = (game.mode === types.GameMode.Speed || (game.mode === types.GameMode.Mix && game.settings.mixedModes?.includes(types.GameMode.Speed))) ? (game.settings.timeIncrement || 0) : 0;
                        
                        if (game.pausedTurnTimeLeft) {
                            game[timeKey] = game.pausedTurnTimeLeft + fischerIncrement;
                        }
                    }
                    
                    game.currentPlayer = nextPlayer;
                    
                    if (game.settings.timeLimit > 0) {
                        const nextTimeKey = game.currentPlayer === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
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

                     game.pausedTurnTimeLeft = undefined;
                } else if (pendingCaptureBeforeClear && game.isSinglePlayer && (game as any).isAiGame) {
                    // 싱글플레이 AI 게임: 보드 상태 저장 및 브로드캐스트만 (턴은 넘기지 않음)
                    import('../db.js').then(({ saveGame }) => {
                        saveGame(game).catch(err => {
                            console.error('[Hidden Mode] Failed to save game after capture:', err);
                        });
                    });
                    import('../socket.js').then(({ broadcast }) => {
                        broadcast({ type: 'GAME_UPDATE', payload: { [game.id]: game } });
                    });
                }
            }
            break;
        case 'hidden_final_reveal':
            if (game.revealAnimationEndTime && now >= game.revealAnimationEndTime) {
                game.animation = null;
                game.revealAnimationEndTime = undefined;
                getGameResult(game).catch(err => {
                    console.error('[Hidden Mode] Failed to finalize game result after final reveal:', err);
                }); // Now trigger scoring asynchronously
            }
            break;
    }
};

export const handleHiddenAction = (volatileState: types.VolatileState, game: types.LiveGameSession, action: types.ServerAction & { userId: string }, user: types.User): HandleActionResult | null => {
    const { type, payload } = action;
    const now = Date.now();
    const myPlayerEnum = user.id === game.blackPlayerId ? types.Player.Black : (user.id === game.whitePlayerId ? types.Player.White : types.Player.None);
    const isMyTurn = myPlayerEnum === game.currentPlayer;

    switch(type) {
        case 'START_HIDDEN_PLACEMENT':
            if (!isMyTurn || game.gameStatus !== 'playing') return { error: "Not your turn to use an item." };
            game.gameStatus = 'hidden_placing';
            if(game.turnDeadline) {
                game.pausedTurnTimeLeft = (game.turnDeadline - now) / 1000;
            }
            game.turnDeadline = undefined;
            game.turnStartTime = undefined;
            game.itemUseDeadline = now + 30000;
            return {};
        case 'START_SCANNING':
            if (!isMyTurn || game.gameStatus !== 'playing') return { error: "Not your turn to use an item." };
            game.gameStatus = 'scanning';
             if(game.turnDeadline) {
                game.pausedTurnTimeLeft = (game.turnDeadline - now) / 1000;
            }
            game.turnDeadline = undefined;
            game.turnStartTime = undefined;
            game.itemUseDeadline = now + 30000;
            return {};
        case 'SCAN_BOARD':
            if (game.gameStatus !== 'scanning') return { error: "Not in scanning mode." };
            const { x, y } = payload;
            const scanKey = user.id === game.player1.id ? 'scans_p1' : 'scans_p2';
            if ((game[scanKey] ?? 0) <= 0) return { error: "No scans left." };
            game[scanKey] = (game[scanKey] ?? 0) - 1;

            const moveIndex = game.moveHistory.findIndex(m => m.x === x && m.y === y);
            const success = moveIndex !== -1 && !!game.hiddenMoves?.[moveIndex];

            if (success) {
                if (!game.revealedHiddenMoves) game.revealedHiddenMoves = {};
                if (!game.revealedHiddenMoves[user.id]) game.revealedHiddenMoves[user.id] = [];
                if (!game.revealedHiddenMoves[user.id].includes(moveIndex)) {
                    game.revealedHiddenMoves[user.id].push(moveIndex);
                }
            }
            game.animation = { type: 'scan', point: { x, y }, success, startTime: now, duration: 2000, playerId: user.id };
            game.gameStatus = 'scanning_animating';

            // After using the item, restore my time, reset timers and KEEP THE TURN
            if (game.pausedTurnTimeLeft) {
                if (myPlayerEnum === types.Player.Black) {
                    game.blackTimeLeft = game.pausedTurnTimeLeft;
                } else {
                    game.whiteTimeLeft = game.pausedTurnTimeLeft;
                }
            }
            game.itemUseDeadline = undefined;
            game.pausedTurnTimeLeft = undefined;

            const currentPlayerTimeKey = myPlayerEnum === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
            game.turnDeadline = now + game[currentPlayerTimeKey] * 1000;
            game.turnStartTime = now;
            
            // The `updateHiddenState` will transition from 'scanning_animating' to 'playing'
            // after the animation, but the timer is already correctly running for the current player.
            return {};
    }

    return null;
}
