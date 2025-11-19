
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
             game.turnDeadline = undefined;
             game.turnStartTime = undefined;
        }
        
        game.itemUseDeadline = undefined;
        game.pausedTurnTimeLeft = undefined;
        return;
    }

    if (game.gameStatus === 'missile_animating') {
        // animation이 null인데 gameStatus가 여전히 missile_animating인 경우 정리 (이미 처리된 경우)
        if (!game.animation) {
            console.warn(`[updateMissileState] Game ${game.id} has missile_animating status but no animation, cleaning up...`);
            game.gameStatus = 'playing';
            const playerWhoMoved = game.currentPlayer;
            if (game.pausedTurnTimeLeft !== undefined) {
                if (playerWhoMoved === types.Player.Black) {
                    game.blackTimeLeft = game.pausedTurnTimeLeft;
                } else {
                    game.whiteTimeLeft = game.pausedTurnTimeLeft;
                }
            }
            if (game.settings.timeLimit > 0) {
                const currentPlayerTimeKey = playerWhoMoved === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
                const timeLeft = game[currentPlayerTimeKey] ?? 0;
                if (timeLeft > 0) {
                    game.turnDeadline = now + timeLeft * 1000;
                    game.turnStartTime = now;
                } else {
                    game.turnDeadline = undefined;
                    game.turnStartTime = undefined;
                }
            } else {
                game.turnDeadline = undefined;
                game.turnStartTime = undefined;
            }
            game.pausedTurnTimeLeft = undefined;
            return;
        }
        
        // 미사일 애니메이션인 경우에만 처리
        if (game.animation.type === 'missile' || game.animation.type === 'hidden_missile') {
            const elapsed = now - game.animation.startTime;
            const duration = game.animation.duration;
            
            if (elapsed >= duration) {
                const playerWhoMoved = game.currentPlayer;
                const { from, to } = game.animation;
                
                // 애니메이션 종료: 보드 상태 변경 (기존 자리의 돌 삭제, 이동된 자리에 돌 배치)
                console.log(`[updateMissileState] Missile animation ended for game ${game.id}, player=${playerWhoMoved === types.Player.Black ? 'Black' : 'White'}, elapsed=${elapsed}ms, duration=${duration}ms, from=${JSON.stringify(from)}, to=${JSON.stringify(to)}`);
                
                // 보드 상태 변경: 기존 자리의 돌 삭제, 이동된 자리에 돌 배치
                if (from && to) {
                    // from 위치에 내 돌이 있는지 확인 (이미 이동했을 수도 있음)
                    const stoneAtFrom = game.boardState[from.y]?.[from.x];
                    if (stoneAtFrom === playerWhoMoved) {
                        game.boardState[from.y][from.x] = types.Player.None;
                        console.log(`[updateMissileState] Removed stone from (${from.x},${from.y})`);
                    }
                    
                    // to 위치에 돌 배치 (이미 있으면 덮어쓰기)
                    game.boardState[to.y][to.x] = playerWhoMoved;
                    console.log(`[updateMissileState] Placed stone at (${to.x},${to.y})`);
                }
                
                // 애니메이션 제거 (중복 처리 방지)
                game.animation = null;
                
                // 타이머 복원
                if (game.pausedTurnTimeLeft !== undefined) {
                    if (playerWhoMoved === types.Player.Black) {
                        game.blackTimeLeft = game.pausedTurnTimeLeft;
                    } else {
                        game.whiteTimeLeft = game.pausedTurnTimeLeft;
                    }
                }
                
                // 턴 유지 (currentPlayer 변경 안 함), 게임 상태를 playing으로 변경
                game.gameStatus = 'playing';
                
                // 타이머 재개
                if (game.settings.timeLimit > 0) {
                    const currentPlayerTimeKey = playerWhoMoved === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
                    const timeLeft = game[currentPlayerTimeKey] ?? 0;
                    if (timeLeft > 0) {
                        game.turnDeadline = now + timeLeft * 1000;
                        game.turnStartTime = now;
                    } else {
                        game.turnDeadline = undefined;
                        game.turnStartTime = undefined;
                    }
                } else {
                    game.turnDeadline = undefined;
                    game.turnStartTime = undefined;
                }
                
                game.pausedTurnTimeLeft = undefined;
                
                console.log(`[updateMissileState] Game ${game.id} resumed: gameStatus=playing, currentPlayer=${playerWhoMoved === types.Player.Black ? 'Black' : 'White'}, turnDeadline=${game.turnDeadline ? new Date(game.turnDeadline).toISOString() : 'none'}`);
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
            if (!isMyTurn || game.gameStatus !== 'playing') {
                console.warn(`[Missile Go] START_MISSILE_SELECTION failed: isMyTurn=${isMyTurn}, gameStatus=${game.gameStatus}, gameId=${game.id}`);
                return { error: "Not your turn to use an item." };
            }
            if (game.missileUsedThisTurn) {
                console.warn(`[Missile Go] START_MISSILE_SELECTION failed: missileUsedThisTurn=true, gameId=${game.id}`);
                return { error: "You have already used a missile this turn." };
            }
            
            // 미사일 개수 확인
            const missileKey = user.id === game.player1.id ? 'missiles_p1' : 'missiles_p2';
            const myMissilesLeft = game[missileKey] ?? game.settings.missileCount ?? 0;
            if (myMissilesLeft <= 0) {
                console.warn(`[Missile Go] START_MISSILE_SELECTION failed: no missiles left, gameId=${game.id}`);
                return { error: "No missiles left." };
            }
            
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
            if (game.gameStatus !== 'missile_selecting') {
                console.warn(`[Missile Go] LAUNCH_MISSILE failed: gameStatus=${game.gameStatus}, expected=missile_selecting, gameId=${game.id}`);
                return { error: "Not in missile selection mode." };
            }
            
            if (game.missileUsedThisTurn) {
                console.warn(`[Missile Go] LAUNCH_MISSILE failed: missileUsedThisTurn=true, gameId=${game.id}`);
                return { error: "You have already used a missile this turn." };
            }
            
            // Immediately disable the timeout timer to prevent race conditions.
            game.itemUseDeadline = undefined;
            
            const { from, direction } = payload;
            if (!from || !direction) {
                console.warn(`[Missile Go] LAUNCH_MISSILE failed: missing from or direction, payload=${JSON.stringify(payload)}, gameId=${game.id}`);
                return { error: "Invalid payload: missing from or direction." };
            }
            
            if (from.x < 0 || from.x >= game.settings.boardSize || from.y < 0 || from.y >= game.settings.boardSize) {
                console.warn(`[Missile Go] LAUNCH_MISSILE failed: invalid from coordinates, from=${JSON.stringify(from)}, boardSize=${game.settings.boardSize}, gameId=${game.id}`);
                return { error: "Invalid stone position." };
            }
            
            const stoneAtFrom = game.boardState[from.y]?.[from.x];
            if (stoneAtFrom !== myPlayerEnum) {
                console.warn(`[Missile Go] LAUNCH_MISSILE failed: not your stone, from=${JSON.stringify(from)}, stoneAtFrom=${stoneAtFrom}, myPlayerEnum=${myPlayerEnum}, gameId=${game.id}`);
                return { error: "Not your stone." };
            }

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
            
            if (to.x === from.x && to.y === from.y) {
                console.warn(`[Missile Go] LAUNCH_MISSILE failed: cannot move stone, from=${JSON.stringify(from)}, to=${JSON.stringify(to)}, direction=${direction}, gameId=${game.id}`);
                return { error: "Cannot move stone." };
            }
            
            // 배치돌 업데이트: baseStones (일반), baseStones_p1, baseStones_p2 (싱글플레이) 모두 확인
            if (game.baseStones) {
                const baseStoneIndex = game.baseStones.findIndex(bs => bs.x === from.x && bs.y === from.y);
                if (baseStoneIndex !== -1) {
                    game.baseStones[baseStoneIndex].x = to.x;
                    game.baseStones[baseStoneIndex].y = to.y;
                }
            }
            
            // 싱글플레이에서 baseStones_p1, baseStones_p2도 확인
            const baseStonesKey = user.id === game.player1.id ? 'baseStones_p1' : 'baseStones_p2';
            const baseStonesArray = (game as any)[baseStonesKey] as types.Point[] | undefined;
            if (baseStonesArray) {
                const baseStoneIndex = baseStonesArray.findIndex(bs => bs.x === from.x && bs.y === from.y);
                if (baseStoneIndex !== -1) {
                    baseStonesArray[baseStoneIndex].x = to.x;
                    baseStonesArray[baseStoneIndex].y = to.y;
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

            // 애니메이션 설정
            if (wasHiddenStone) {
                game.animation = { type: 'hidden_missile', from, to, player: myPlayerEnum, startTime: now, duration: 3000 };
            } else {
                game.animation = { type: 'missile', from, to, player: myPlayerEnum, startTime: now, duration: 2000 };
            }

            // 잡힌 돌은 즉시 처리 (애니메이션 중에 보여야 함)
            // 이동한 돌의 위치는 애니메이션 종료 시 변경됨
            const logic = getGoLogic(game);
            const opponentEnum = myPlayerEnum === types.Player.Black ? types.Player.White : types.Player.Black;
            let totalCapturedStones: types.Point[] = [];

            // 이동할 위치(to)에서 잡힐 수 있는 돌 확인 (이동 전 상태 기준)
            // 임시로 보드 상태를 변경하여 잡힐 돌을 확인
            const originalFromState = game.boardState[from.y][from.x];
            const originalToState = game.boardState[to.y][to.x];
            
            // 임시로 이동한 상태로 가정
            game.boardState[from.y][from.x] = types.Player.None;
            game.boardState[to.y][to.x] = myPlayerEnum;

            const neighbors = logic.getNeighbors(to.x, to.y);
            for (const n of neighbors) {
                if (game.boardState[n.y]?.[n.x] === opponentEnum) {
                    const group = logic.findGroup(n.x, n.y, opponentEnum, game.boardState);
                    if (group && group.liberties === 0) {
                        totalCapturedStones.push(...group.stones);
                    }
                }
            }
            
            // 보드 상태 복원 (애니메이션 종료 시 실제로 변경됨)
            game.boardState[from.y][from.x] = originalFromState;
            game.boardState[to.y][to.x] = originalToState;
            
            // 잡힌 돌은 즉시 제거
            if (totalCapturedStones.length > 0) {
                const uniqueCaptured = Array.from(new Set(totalCapturedStones.map(p => `${p.x},${p.y}`))).map(s => {
                    const [x, y] = s.split(',').map(Number);
                    return { x, y };
                });

                for (const stone of uniqueCaptured) {
                    game.captures[myPlayerEnum]++;
                    
                    // 배치돌 확인: baseStones (일반), baseStones_p1, baseStones_p2 (싱글플레이) 모두 확인
                    let isBaseStone = game.baseStones?.some(bs => bs.x === stone.x && bs.y === stone.y) ?? false;
                    if (!isBaseStone) {
                        // baseStones_p1, baseStones_p2 확인
                        const baseStones_p1 = (game as any).baseStones_p1 as types.Point[] | undefined;
                        const baseStones_p2 = (game as any).baseStones_p2 as types.Point[] | undefined;
                        isBaseStone = baseStones_p1?.some(bs => bs.x === stone.x && bs.y === stone.y) ?? false;
                        if (!isBaseStone) {
                            isBaseStone = baseStones_p2?.some(bs => bs.x === stone.x && bs.y === stone.y) ?? false;
                        }
                    }
                    
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

            // totalTurns 증가 (자동계가 턴 카운트를 위해)
            // 미사일 이동도 턴으로 카운트되어야 함
            if (game.totalTurns === undefined) {
                game.totalTurns = 0;
            }
            game.totalTurns++;

            game.gameStatus = 'missile_animating';
            game.missileUsedThisTurn = true;
            
            // 타이머 일시정지
            if (game.settings.timeLimit > 0 && game.turnDeadline) {
                game.pausedTurnTimeLeft = (game.turnDeadline - now) / 1000;
            }
            game.turnDeadline = undefined;
            game.turnStartTime = undefined;
            
            return {};
        }
        case 'MISSILE_INVALID_SELECTION': {
            if (game.gameStatus !== 'missile_selecting') return { error: "Not in missile selection mode." };
            game.foulInfo = { message: '움직일 수 없는 돌입니다.', expiry: now + 4000 };
            return {};
        }
    }
    return null;
};
