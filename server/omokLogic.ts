import * as types from '../types.js';
import type { LiveGameSession, Point, Player, BoardState } from '../types.js';

export const getOmokLogic = (game: LiveGameSession) => {
    const { settings: { boardSize } } = game;
    const player = game.currentPlayer;
    const opponent = player === types.Player.Black ? types.Player.White : types.Player.Black;

    const getLine = (x: number, y: number, dx: number, dy: number, board: BoardState): Point[] => {
        const line: Point[] = [{x, y}];
        const p = board[y][x];
        if (p === types.Player.None) return [];

        for(let i = 1; i < 6; i++) {
            const nx = x + i * dx;
            const ny = y + i * dy;
            if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize || board[ny][nx] !== p) break;
            line.push({x: nx, y: ny});
        }
        for(let i = 1; i < 6; i++) {
            const nx = x - i * dx;
            const ny = y - i * dy;
            if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize || board[ny][nx] !== p) break;
            line.unshift({x: nx, y: ny});
        }
        return line;
    };
    
    const getLineInfo = (x: number, y: number, board: BoardState) => {
        const directions = [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }, { dx: 1, dy: -1 }];
        const result: { [key: string]: number } = {};
        let i = 0;
        for (const { dx, dy } of directions) {
            const line = getLine(x, y, dx, dy, board);
            result[i] = line.length;
            i++;
        }
        return result;
    }

    const checkWin = (x: number, y: number, board: BoardState): { line: Point[] } | null => {
        const p = board[y][x];
        if (p === types.Player.None) return null;

        const directions = [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }, { dx: 1, dy: -1 }];
        for (const { dx, dy } of directions) {
            const line = getLine(x, y, dx, dy, board);
            
            if (line.length >= 5) {
                // If overline is forbidden for black and it's an overline, it's not a win.
                if (game.settings.hasOverlineForbidden && p === types.Player.Black && line.length > 5) {
                    continue;
                }
                // Otherwise, it's a win (for White with >=5, or for Black with ==5, or for Black with >5 if allowed).
                return { line: line.slice(0, 5) };
            }
        }
        return null;
    };
    
    const checkOpenState = (line: (Player | null)[]) => {
        let openEnds = 0;
        if (line[0] === types.Player.None) openEnds++;
        if (line[line.length-1] === types.Player.None) openEnds++;
        return openEnds;
    };

    const is33 = (x: number, y: number, board: BoardState): boolean => {
        // The original logic was buggy and preventing valid moves.
        // As per the request, this check is disabled.
        return false;
    };


    const performTtamokCapture = (x: number, y: number): { capturedCount: number } => {
        let capturedCount = 0;
        const directions = [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }, { dx: 1, dy: -1 }];

        for (const { dx, dy } of directions) {
            for (const dir of [1, -1]) { // Check both ways on an axis
                const n1x = x + dir * dx; const n1y = y + dir * dy;
                const n2x = x + dir * 2 * dx; const n2y = y + dir * 2 * dy;
                const n3x = x + dir * 3 * dx; const n3y = y + dir * 3 * dy;

                if(n3x < 0 || n3x >= boardSize || n3y < 0 || n3y >= boardSize) continue;

                if (
                    game.boardState[n1y]?.[n1x] === opponent &&
                    game.boardState[n2y]?.[n2x] === opponent &&
                    game.boardState[n3y]?.[n3x] === player
                ) {
                    game.boardState[n1y][n1x] = types.Player.None;
                    game.boardState[n2y][n2x] = types.Player.None;
                    capturedCount += 2;
                }
            }
        }
        return { capturedCount };
    };

    const checkPotentialCaptures = (x: number, y: number, player: Player, board: BoardState): number => {
        let capturedCount = 0;
        const opponent = player === types.Player.Black ? types.Player.White : types.Player.Black;
        const directions = [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }, { dx: 1, dy: -1 }];
        const boardSize = board.length;

        for (const { dx, dy } of directions) {
            for (const dir of [1, -1]) {
                const n1x = x + dir * dx; const n1y = y + dir * dy;
                const n2x = x + dir * 2 * dx; const n2y = y + dir * 2 * dy;
                const n3x = x + dir * 3 * dx; const n3y = y + dir * 3 * dy;

                if (n3x < 0 || n3x >= boardSize || n3y < 0 || n3y >= boardSize) continue;

                if (
                    board[n1y]?.[n1x] === opponent &&
                    board[n2y]?.[n2x] === opponent &&
                    board[n3y]?.[n3x] === player
                ) {
                    capturedCount += 2;
                }
            }
        }
        return capturedCount;
    };
    
    const getLineStats = (x: number, y: number, player: Player, board: BoardState, dx: number, dy: number): { length: number; openEnds: number } => {
        const boardSize = board.length;
        let length = 1;
        
        let line: Point[] = [{x, y}];

        // Forward
        for (let i = 1; i < 6; i++) {
            const nx = x + i * dx;
            const ny = y + i * dy;
            if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize || board[ny][nx] !== player) break;
            length++;
            line.push({x: nx, y: ny});
        }
        // Backward
        for (let i = 1; i < 6; i++) {
            const nx = x - i * dx;
            const ny = y - i * dy;
            if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize || board[ny][nx] !== player) break;
            length++;
            line.unshift({x: nx, y: ny});
        }

        let openEnds = 0;
        // Check end of the line
        const end = line[line.length - 1];
        const endNextX = end.x + dx;
        const endNextY = end.y + dy;
        if (endNextX >= 0 && endNextX < boardSize && endNextY >= 0 && endNextY < boardSize && board[endNextY][endNextX] === types.Player.None) {
            openEnds++;
        }

        // Check start of the line
        const start = line[0];
        const startPrevX = start.x - dx;
        const startPrevY = start.y - dy;
        if (startPrevX >= 0 && startPrevX < boardSize && startPrevY >= 0 && startPrevY < boardSize && board[startPrevY][startPrevX] === types.Player.None) {
            openEnds++;
        }

        return { length, openEnds };
    };


    return {
        checkWin,
        is33,
        getLineInfo,
        performTtamokCapture,
        checkPotentialCaptures,
        getLineStats
    };
};