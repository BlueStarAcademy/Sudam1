
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
        if (game.animation && now > game.animation.startTime + game.animation.duration) {
            const playerWhoMoved = game.currentPlayer;
            game.animation = null;
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
                game.turnDeadline = now + game[currentPlayerTimeKey] * 1000;
                game.turnStartTime = now;
            }
            game.pausedTurnTimeLeft = undefined;
        }
    }
};

export const handleMissileAction = (game: types.LiveGameSession, action: types.ServerAction & { userId: string }, user: types.User): HandleActionResult | null => {
    const { type, payload } = action;
    const now = Date.now();
    const myPlayerEnum = user.id === game.blackPlayerId ? types.Player.Black : (user.id === game.whitePlayerId ? types.Player.White : types.Player.None);
    const isMyTurn = myPlayerEnum === game.currentPlayer;

    switch (type) {
        case 'START_MISSILE_SELECTION':
            if (!isMyTurn || game.gameStatus !== 'playing') return { error: "Not your turn to use an item." };
            if (game.missileUsedThisTurn) return { error: "You have already used a missile this turn." };
            game.gameStatus = 'missile_selecting';
            if(game.turnDeadline) {
                game.pausedTurnTimeLeft = (game.turnDeadline - now) / 1000;
            }
            game.turnDeadline = undefined;
            game.turnStartTime = undefined;
            game.itemUseDeadline = now + 30000;
            return {};
        case 'LAUNCH_MISSILE':
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
        case 'MISSILE_INVALID_SELECTION': {
            if (game.gameStatus !== 'missile_selecting') return { error: "Not in missile selection mode." };
            game.foulInfo = { message: '움직일 수 없는 돌입니다.', expiry: now + 4000 };
            return {};
        }
    }
    return null;
};
