import * as types from '../types.js';
// This is the new pure function for calculating move results.
// It does not depend on the 'game' closure and does not mutate any state.
export const processMove = (boardState, move, koInfo, moveHistoryLength, options) => {
    const { x, y, player } = move;
    const boardSize = boardState.length;
    const opponent = player === types.Player.Black ? types.Player.White : types.Player.Black;
    if (y < 0 || y >= boardSize || x < 0 || x >= boardSize || boardState[y][x] !== types.Player.None) {
        return { isValid: false, reason: 'occupied', newBoardState: boardState, capturedStones: [], newKoInfo: koInfo };
    }
    if (koInfo && koInfo.point.x === x && koInfo.point.y === y && koInfo.turn === moveHistoryLength) {
        return { isValid: false, reason: 'ko', newBoardState: boardState, capturedStones: [], newKoInfo: koInfo };
    }
    const tempBoard = JSON.parse(JSON.stringify(boardState));
    tempBoard[y][x] = player;
    const getNeighbors = (px, py) => {
        const neighbors = [];
        if (px > 0)
            neighbors.push({ x: px - 1, y: py });
        if (px < boardSize - 1)
            neighbors.push({ x: px + 1, y: py });
        if (py > 0)
            neighbors.push({ x: px, y: py - 1 });
        if (py < boardSize - 1)
            neighbors.push({ x: px, y: py + 1 });
        return neighbors;
    };
    const findGroup = (startX, startY, playerColor, currentBoard) => {
        if (currentBoard[startY]?.[startX] !== playerColor)
            return null;
        const q = [{ x: startX, y: startY }];
        const visitedStones = new Set([`${startX},${startY}`]);
        const libertyPoints = new Set();
        const stones = [{ x: startX, y: startY }];
        while (q.length > 0) {
            const { x: cx, y: cy } = q.shift();
            for (const n of getNeighbors(cx, cy)) {
                const key = `${n.x},${n.y}`;
                const neighborContent = currentBoard[n.y][n.x];
                if (neighborContent === types.Player.None) {
                    libertyPoints.add(key);
                }
                else if (neighborContent === playerColor) {
                    if (!visitedStones.has(key)) {
                        visitedStones.add(key);
                        q.push(n);
                        stones.push(n);
                    }
                }
            }
        }
        return { stones, liberties: libertyPoints.size };
    };
    let capturedStones = [];
    let singleCapturePoint = null;
    const checkedOpponentNeighbors = new Set();
    for (const n of getNeighbors(x, y)) {
        const key = `${n.x},${n.y}`;
        if (tempBoard[n.y][n.x] === opponent && !checkedOpponentNeighbors.has(key)) {
            const group = findGroup(n.x, n.y, opponent, tempBoard);
            if (group && group.liberties === 0) {
                capturedStones.push(...group.stones);
                if (group.stones.length === 1) {
                    singleCapturePoint = group.stones[0];
                }
                group.stones.forEach(s => checkedOpponentNeighbors.add(`${s.x},${s.y}`));
            }
        }
    }
    if (capturedStones.length > 0) {
        for (const stone of capturedStones) {
            tempBoard[stone.y][stone.x] = types.Player.None;
        }
    }
    const myGroup = findGroup(x, y, player, tempBoard);
    if (!options?.ignoreSuicide && myGroup && myGroup.liberties === 0) {
        return { isValid: false, reason: 'suicide', newBoardState: boardState, capturedStones: [], newKoInfo: koInfo };
    }
    let newKoInfo = null;
    if (myGroup && capturedStones.length === 1 && myGroup.stones.length === 1 && myGroup.liberties === 1) {
        newKoInfo = { point: singleCapturePoint, turn: moveHistoryLength + 1 };
    }
    return { isValid: true, newBoardState: tempBoard, capturedStones, newKoInfo };
};
export const getGoLogic = (game) => {
    const { boardState, settings: { boardSize } } = game;
    // This method is now impure and directly mutates the game object.
    // It's used by AI and other server logic that needs to directly manipulate the session.
    // The main player action handler should prefer the pure `processMove`.
    const placeStone = (x, y) => {
        const player = game.currentPlayer;
        const result = processMove(game.boardState, { x, y, player }, game.koInfo, game.moveHistory.length);
        if (result.isValid) {
            game.boardState = result.newBoardState;
            game.captures[player] += result.capturedStones.length;
            game.koInfo = result.newKoInfo;
        }
        return result;
    };
    const getNeighbors = (x, y) => {
        const neighbors = [];
        if (x > 0)
            neighbors.push({ x: x - 1, y });
        if (x < boardSize - 1)
            neighbors.push({ x: x + 1, y });
        if (y > 0)
            neighbors.push({ x, y: y - 1 });
        if (y < boardSize - 1)
            neighbors.push({ x, y: y + 1 });
        return neighbors;
    };
    const findGroup = (startX, startY, playerColor, currentBoard) => {
        if (startY < 0 || startY >= boardSize || startX < 0 || startX >= boardSize)
            return null;
        if (currentBoard[startY]?.[startX] !== playerColor)
            return null;
        const q = [{ x: startX, y: startY }];
        const visitedStones = new Set([`${startX},${startY}`]);
        const libertyPoints = new Set();
        const stones = [{ x: startX, y: startY }];
        while (q.length > 0) {
            const { x: cx, y: cy } = q.shift();
            for (const n of getNeighbors(cx, cy)) {
                const key = `${n.x},${n.y}`;
                const neighborContent = currentBoard[n.y][n.x];
                if (neighborContent === types.Player.None) {
                    libertyPoints.add(key);
                }
                else if (neighborContent === playerColor) {
                    if (!visitedStones.has(key)) {
                        visitedStones.add(key);
                        q.push(n);
                        stones.push(n);
                    }
                }
            }
        }
        return { stones, liberties: libertyPoints.size, libertyPoints, player: playerColor };
    };
    const getAllGroups = (playerColor, currentBoard) => {
        // FIX: The return type for this function was incorrect, causing a type error in aiPlayer.ts.
        // The type now correctly includes the `libertyPoints` property returned by `findGroup`.
        const groups = [];
        const visited = new Set();
        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                if (currentBoard[y][x] === playerColor && !visited.has(`${x},${y}`)) {
                    const group = findGroup(x, y, playerColor, currentBoard);
                    if (group) {
                        groups.push(group);
                        group.stones.forEach(s => visited.add(`${s.x},${s.y}`));
                    }
                }
            }
        }
        return groups;
    };
    const getAllLibertiesOfPlayer = (playerColor, currentBoard) => {
        const allLibertyPoints = new Set();
        const visited = new Set();
        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                const stoneKey = `${x},${y}`;
                if (currentBoard[y][x] === playerColor && !visited.has(stoneKey)) {
                    const group = findGroup(x, y, playerColor, currentBoard);
                    if (group) {
                        group.stones.forEach(s => visited.add(`${s.x},${s.y}`));
                        group.libertyPoints.forEach(l => allLibertyPoints.add(l));
                    }
                }
            }
        }
        return Array.from(allLibertyPoints).map(key => {
            const [x, y] = key.split(',').map(Number);
            return { x, y };
        });
    };
    const getScore = () => {
        const territory = { [types.Player.Black]: 0, [types.Player.White]: 0, [types.Player.None]: 0 };
        const visited = Array(boardSize).fill(0).map(() => Array(boardSize).fill(false));
        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                if (boardState[y][x] !== types.Player.None) {
                    territory[boardState[y][x]]++;
                }
                else if (!visited[y][x]) {
                    const q = [{ x, y }];
                    visited[y][x] = true;
                    const region = [{ x, y }];
                    let touchesBlack = false;
                    let touchesWhite = false;
                    while (q.length > 0) {
                        const current = q.shift();
                        for (const n of getNeighbors(current.x, current.y)) {
                            if (!visited[n.y][n.x]) {
                                if (boardState[n.y][n.x] === types.Player.None) {
                                    visited[n.y][n.x] = true;
                                    q.push(n);
                                    region.push(n);
                                }
                                else if (boardState[n.y][n.x] === types.Player.Black) {
                                    touchesBlack = true;
                                }
                                else {
                                    touchesWhite = true;
                                }
                            }
                        }
                    }
                    if (touchesBlack && !touchesWhite) {
                        territory[types.Player.Black] += region.length;
                    }
                    else if (touchesWhite && !touchesBlack) {
                        territory[types.Player.White] += region.length;
                    }
                }
            }
        }
        // Add captures to the score
        territory[types.Player.Black] += game.captures[types.Player.Black];
        territory[types.Player.White] += game.captures[types.Player.White];
        return { score: { black: territory[types.Player.Black], white: territory[types.Player.White] } };
    };
    return {
        getScore,
        findGroup,
        getAllLibertiesOfPlayer,
        getNeighbors,
        getAllGroups,
        placeStone,
    };
};
