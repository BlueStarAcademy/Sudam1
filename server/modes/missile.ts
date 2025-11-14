
import * as types from '../../types.js';
import { getGoLogic } from '../goLogic.js';

type HandleActionResult = types.HandleActionResult;

export const initializeMissile = (game: types.LiveGameSession) => {
    const isMissileMode = game.mode === types.GameMode.Missile || (game.mode === types.GameMode.Mix && game.settings.mixedModes?.includes(types.GameMode.Missile));
    if (isMissileMode) {
        game.missiles_p1 = game.settings.missileCount;
        game.missiles_p2 = game.settings.missileCount;
    }
};

export const updateMissileState = (game: types.LiveGameSession, now: number) => {
    if (game.gameStatus === 'missile_selecting' && game.itemUseDeadline && now > game.itemUseDeadline) {
        // Item use timed out. Cancel item mode, but keep the turn with the current player.
        const timedOutPlayerEnum = game.currentPlayer;
        const timedOutPlayerId = timedOutPlayerEnum === types.Player.Black ? game.blackPlayerId! : game.whitePlayerId!;
        
        // 미사일 1개 소모
        const missileKey = timedOutPlayerId === game.player1.id ? 'missiles_p1' : 'missiles_p2';
        const currentMissiles = game[missileKey] ?? game.settings.missileCount ?? 0;
        if (currentMissiles > 0) {
            game[missileKey] = currentMissiles - 1;
        }
        
        game.foulInfo = { message: `${game.player1.id === timedOutPlayerId ? game.player1.nickname : game.player2.nickname}님의 아이템 시간 초과!`, expiry: now + 4000 };
        game.gameStatus = 'playing';
        // currentPlayer remains timedOutPlayerEnum

        // Restore the timer for the current player
        if (game.settings.timeLimit > 0 && game.pausedTurnTimeLeft) {
            const currentPlayerTimeKey = timedOutPlayerEnum === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
            game[currentPlayerTimeKey] = game.pausedTurnTimeLeft;
            game.turnDeadline = now + game[currentPlayerTimeKey] * 1000;
            game.turnStartTime = now;
        } else {
            // 시간 제한이 없는 경우에도 게임이 계속 진행되도록 함
            game.turnDeadline = undefined;
            game.turnStartTime = undefined;
        }
        
        // 아이템 사용 시간 초과 상태를 명확히 정리
        game.itemUseDeadline = undefined;
        game.pausedTurnTimeLeft = undefined;
        
        // 선택된 미사일 돌이 있다면 초기화 (클라이언트 동기화를 위해)
        // 이는 게임 상태에 직접 저장되지 않지만, 클라이언트에서 처리되므로 서버에서는 상태만 복원
        
        return;
    }

    if (game.gameStatus === 'missile_animating') {
        if (game.animation && now > game.animation.startTime + game.animation.duration) {
            const playerWhoMoved = game.currentPlayer;
            const previousStatus = game.gameStatus;
            game.animation = null;
            
            // Restore the timer for the current player
            if (game.pausedTurnTimeLeft) {
                if (playerWhoMoved === types.Player.Black) {
                    game.blackTimeLeft = game.pausedTurnTimeLeft;
                } else {
                    game.whiteTimeLeft = game.pausedTurnTimeLeft;
                }
            }
            
            // Do not switch turn. Resume timer for the current player.
            game.gameStatus = 'playing';
            if (game.settings.timeLimit > 0) {
                const currentPlayerTimeKey = playerWhoMoved === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
                // pausedTurnTimeLeft가 없으면 현재 시간을 사용
                if (!game.pausedTurnTimeLeft && game[currentPlayerTimeKey] > 0) {
                    game.turnDeadline = now + game[currentPlayerTimeKey] * 1000;
                } else if (game.pausedTurnTimeLeft) {
                    game.turnDeadline = now + game[currentPlayerTimeKey] * 1000;
                } else {
                    game.turnDeadline = undefined;
                }
                game.turnStartTime = now;
            } else {
                game.turnDeadline = undefined;
                game.turnStartTime = undefined;
            }
            
            // Clean up item use deadline and paused time
            game.itemUseDeadline = undefined;
            game.pausedTurnTimeLeft = undefined;
            
            // 싱글플레이에서 게임 상태가 변경된 경우 즉시 저장하고 브로드캐스트
            if (game.isSinglePlayer && previousStatus !== game.gameStatus) {
                // 게임 상태 변경을 명시적으로 표시하기 위해 serverRevision 증가
                game.serverRevision = (game.serverRevision || 0) + 1;
                // lastSyncedAt도 업데이트하여 게임 루프에서 변경을 확실히 감지하도록 함
                game.lastSyncedAt = now;
                
                // 싱글플레이에서는 즉시 저장하고 브로드캐스트하여 클라이언트가 상태 변경을 즉시 받을 수 있도록 함
                const saveAndBroadcast = async () => {
                    const db = await import('../db.js');
                    const { broadcast } = await import('../socket.js');
                    await db.saveGame(game);
                    broadcast({ type: 'GAME_UPDATE', payload: { [game.id]: game } });
                };
                // 비동기로 실행하되 await하지 않음 (게임 루프를 블로킹하지 않기 위해)
                saveAndBroadcast().catch(err => {
                    console.error(`[Missile Go] Failed to save and broadcast single player game ${game.id} after animation:`, err);
                });
            }
        }
    }
};

export const handleMissileAction = (game: types.LiveGameSession, action: types.ServerAction & { userId: string }, user: types.User): HandleActionResult | null => {
    const { type, payload } = action;
    const now = Date.now();
    const myPlayerEnum = user.id === game.blackPlayerId ? types.Player.Black : (user.id === game.whitePlayerId ? types.Player.White : types.Player.None);
    const isMyTurn = myPlayerEnum === game.currentPlayer;

    switch (type) {
        case 'START_MISSILE_SELECTION': {
            if (!isMyTurn || game.gameStatus !== 'playing') return { error: "Not your turn to use an item." };
            if (game.missileUsedThisTurn) return { error: "You have already used a missile this turn." };
            
            // 미사일 개수 확인
            const missileKey = user.id === game.player1.id ? 'missiles_p1' : 'missiles_p2';
            const myMissilesLeft = game[missileKey] ?? game.settings.missileCount ?? 0;
            if (myMissilesLeft <= 0) return { error: "No missiles left." };
            
            game.gameStatus = 'missile_selecting';
            if(game.turnDeadline) {
                game.pausedTurnTimeLeft = (game.turnDeadline - now) / 1000;
            }
            game.turnDeadline = undefined;
            game.turnStartTime = undefined;
            game.itemUseDeadline = now + 30000;
            return {};
        }
        case 'LAUNCH_MISSILE': {
            if (game.gameStatus !== 'missile_selecting') return { error: "Not in missile selection mode." };
            
            // Immediately disable the timeout timer to prevent race conditions.
            game.itemUseDeadline = undefined;
            
            const { from, direction } = payload;
            if (game.boardState[from.y][from.x] !== myPlayerEnum) return { error: "Not your stone." };

            let to: types.Point = from;
            let dir: types.Point = { x: 0, y: 0 };
            if(direction === 'up') dir.y = -1;
            else if(direction === 'down') dir.y = 1;
            else if(direction === 'left') dir.x = -1;
            else if(direction === 'right') dir.x = 1;

            let current = from;
            while(true) {
                const next = { x: current.x + dir.x, y: current.y + dir.y };
                if (next.x < 0 || next.x >= game.settings.boardSize || next.y < 0 || next.y >= game.settings.boardSize || game.boardState[next.y][next.x] !== types.Player.None) {
                    break;
                }
                current = next;
            }
            to = current;
            
            if (to.x === from.x && to.y === from.y) return { error: "Cannot move stone." };
            
            if (game.baseStones) {
                const baseStoneIndex = game.baseStones.findIndex(bs => bs.x === from.x && bs.y === from.y);
                if (baseStoneIndex !== -1) {
                    game.baseStones[baseStoneIndex].x = to.x;
                    game.baseStones[baseStoneIndex].y = to.y;
                }
            }

            // Find and update the move in history for KataGo analysis.
            let moveIndexToUpdate = -1;
            for (let i = game.moveHistory.length - 1; i >= 0; i--) {
                const move = game.moveHistory[i];
                if (move.x === from.x && move.y === from.y) {
                    if (game.boardState[from.y][from.x] === move.player) {
                        moveIndexToUpdate = i;
                        break;
                    }
                }
            }

            if (moveIndexToUpdate === -1) {
                console.warn(`[Missile Go] Could not find move in history for stone at ${JSON.stringify(from)} in game ${game.id}. KataGo analysis may fail.`);
            } else {
                game.moveHistory[moveIndexToUpdate].x = to.x;
                game.moveHistory[moveIndexToUpdate].y = to.y;
            }

            const wasHiddenStone = moveIndexToUpdate !== -1 && game.hiddenMoves?.[moveIndexToUpdate];

            if (wasHiddenStone) {
                game.animation = { type: 'hidden_missile', from, to, player: myPlayerEnum, startTime: now, duration: 3000 };
            } else {
                game.animation = { type: 'missile', from, to, player: myPlayerEnum, startTime: now, duration: 2000 };
            }

            game.boardState[from.y][from.x] = types.Player.None;
            game.boardState[to.y][to.x] = myPlayerEnum;

            const logic = getGoLogic(game);
            const opponentEnum = myPlayerEnum === types.Player.Black ? types.Player.White : types.Player.Black;
            let totalCapturedStones: types.Point[] = [];

            const neighbors = logic.getNeighbors(to.x, to.y);
            for (const n of neighbors) {
                if (game.boardState[n.y]?.[n.x] === opponentEnum) {
                    const group = logic.findGroup(n.x, n.y, opponentEnum, game.boardState);
                    if (group && group.liberties === 0) {
                        totalCapturedStones.push(...group.stones);
                    }
                }
            }
            
            if (totalCapturedStones.length > 0) {
                const uniqueCaptured = Array.from(new Set(totalCapturedStones.map(p => `${p.x},${p.y}`))).map(s => {
                    const [x, y] = s.split(',').map(Number);
                    return { x, y };
                });

                for (const stone of uniqueCaptured) {
                    game.captures[myPlayerEnum]++;
                    const isBaseStone = game.baseStones?.some(bs => bs.x === stone.x && bs.y === stone.y);
                    let wasHidden = false;
                    for (let i = game.moveHistory.length - 2; i >= 0; i--) { // -2 because current move is already pushed
                        if (game.moveHistory[i].x === stone.x && game.moveHistory[i].y === stone.y) {
                            if (game.hiddenMoves?.[i]) wasHidden = true;
                            break;
                        }
                    }

                    if (isBaseStone) game.baseStoneCaptures[myPlayerEnum]++;
                    else if (wasHidden) game.hiddenStoneCaptures[myPlayerEnum]++;
                    
                    game.boardState[stone.y][stone.x] = types.Player.None;
                }
            }

            const missileKey = user.id === game.player1.id ? 'missiles_p1' : 'missiles_p2';
            game[missileKey] = (game[missileKey] ?? 0) - 1;

            game.gameStatus = 'missile_animating';
            game.missileUsedThisTurn = true;
            return {};
        }
        case 'MISSILE_INVALID_SELECTION': {
            if (game.gameStatus !== 'missile_selecting') return { error: "Not in missile selection mode." };
            game.foulInfo = { message: '움직일 수 없는 돌입니다.', expiry: now + 4000 };
            return {};
        }
        case 'CANCEL_MISSILE_SELECTION': {
            if (game.gameStatus !== 'missile_selecting') return { error: "Not in missile selection mode." };
            if (!isMyTurn) return { error: "Not your turn." };
            
            // 미사일 1개 소모
            const missileKey = user.id === game.player1.id ? 'missiles_p1' : 'missiles_p2';
            const currentMissiles = game[missileKey] ?? game.settings.missileCount ?? 0;
            if (currentMissiles > 0) {
                game[missileKey] = currentMissiles - 1;
            }
            
            game.gameStatus = 'playing';
            
            // Restore the timer for the current player
            if (game.settings.timeLimit > 0 && game.pausedTurnTimeLeft) {
                const currentPlayerTimeKey = myPlayerEnum === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
                game[currentPlayerTimeKey] = game.pausedTurnTimeLeft;
                game.turnDeadline = now + game[currentPlayerTimeKey] * 1000;
                game.turnStartTime = now;
            } else {
                game.turnDeadline = undefined;
                game.turnStartTime = undefined;
            }
            
            game.itemUseDeadline = undefined;
            game.pausedTurnTimeLeft = undefined;
            
            return {};
        }
    }
    return null;
};
