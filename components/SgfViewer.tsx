import React, { useState, useEffect, useMemo } from 'react';
import { Player, Point } from '../types.js';

interface SgfViewerProps {
    timeElapsed?: number;
    fileIndex?: number | null;
    showLastMoveOnly?: boolean;
}

interface SgfData {
    boardSize: number;
    moves: { player: Player; x: number; y: number }[];
}

const parseSgf = (sgfText: string): SgfData | null => {
    try {
        const boardSizeMatch = sgfText.match(/SZ\[(\d+)\]/);
        const boardSize = boardSizeMatch ? parseInt(boardSizeMatch[1], 10) : 19;

        const moves: { player: Player; x: number; y: number }[] = [];
        const moveRegex = /;([BW])\[([a-s]{2})\]/g;
        let match;
        
        while ((match = moveRegex.exec(sgfText)) !== null) {
            const player = match[1] === 'B' ? Player.Black : Player.White;
            const coords = match[2];
            const x = coords.charCodeAt(0) - 'a'.charCodeAt(0);
            const y = coords.charCodeAt(1) - 'a'.charCodeAt(0);
            moves.push({ player, x, y });
        }
        
        return { boardSize, moves };
    } catch (error) {
        console.error("Failed to parse SGF:", error);
        return null;
    }
};

const getNeighbors = (x: number, y: number, boardSize: number) => {
    const neighbors = [];
    if (x > 0) neighbors.push({ x: x - 1, y });
    if (x < boardSize - 1) neighbors.push({ x: x + 1, y });
    if (y > 0) neighbors.push({ x, y: y - 1 });
    if (y < boardSize - 1) neighbors.push({ x, y: y + 1 });
    return neighbors;
};

const findGroup = (startX: number, startY: number, playerColor: Player, board: Player[][], boardSize: number) => {
    if (startY < 0 || startY >= boardSize || startX < 0 || startX >= boardSize || board[startY]?.[startX] !== playerColor) return null;
    
    const q: Point[] = [{ x: startX, y: startY }];
    const visitedStones = new Set([`${startX},${startY}`]);
    let liberties = 0;
    const stones: Point[] = [{ x: startX, y: startY }];

    while (q.length > 0) {
        const { x: cx, y: cy } = q.shift()!;
        for (const n of getNeighbors(cx, cy, boardSize)) {
            const key = `${n.x},${n.y}`;
            const neighborContent = board[n.y][n.x];

            if (neighborContent === Player.None) {
                liberties++;
            } else if (neighborContent === playerColor) {
                if (!visitedStones.has(key)) {
                    visitedStones.add(key);
                    q.push(n);
                    stones.push(n);
                }
            }
        }
    }
    return { stones, liberties };
};

const SgfViewer: React.FC<SgfViewerProps> = ({ timeElapsed = 0, fileIndex, showLastMoveOnly }) => {
    const [sgfData, setSgfData] = useState<SgfData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const totalDuration = 50;

    useEffect(() => {
        const fetchSgf = async () => {
            setLoading(true);
            setError(null);
            
            if (fileIndex === null || fileIndex === undefined) {
                setSgfData({ boardSize: 19, moves: [] });
                setLoading(false);
                return;
            }

            const url = `/sgf/Gibo${fileIndex}.sgf`;
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Failed to fetch SGF file: ${response.statusText}`);
                const text = await response.text();
                const parsed = parseSgf(text);
                if (!parsed) throw new Error("Failed to parse SGF data.");
                setSgfData(parsed);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchSgf();
    }, [fileIndex]);

    const currentMoveIndex = useMemo(() => {
        if (!sgfData) return 0;
        if (showLastMoveOnly) return sgfData.moves.length;
        // timeElapsed가 0이면 돌을 표시하지 않음 (경기 시작 전)
        // timeElapsed가 1 이상이면 진행 상황에 따라 돌 표시
        if (timeElapsed <= 0) return 0;
        // 진행률 계산: timeElapsed / totalDuration
        // 최소 1개는 표시 (timeElapsed >= 1일 때)
        const progress = Math.max(0, Math.min(1, timeElapsed / totalDuration));
        const moveCount = Math.max(1, Math.floor(progress * sgfData.moves.length));
        return Math.min(moveCount, sgfData.moves.length);
    }, [timeElapsed, sgfData, totalDuration, showLastMoveOnly]);
    
    const boardState = useMemo(() => {
        if (!sgfData) return [];
        const { boardSize, moves } = sgfData;
        const b = Array(boardSize).fill(null).map(() => Array(boardSize).fill(Player.None));

        for (let i = 0; i < currentMoveIndex; i++) {
            const move = moves[i];
            if (b[move.y] && b[move.y][move.x] !== undefined) {
                b[move.y][move.x] = move.player;
            }

            const opponent = move.player === Player.Black ? Player.White : Player.Black;
            const neighbors = getNeighbors(move.x, move.y, boardSize);

            for (const n of neighbors) {
                if (b[n.y][n.x] === opponent) {
                    const group = findGroup(n.x, n.y, opponent, b, boardSize);
                    if (group && group.liberties === 0) {
                        for (const stone of group.stones) {
                            b[stone.y][stone.x] = Player.None;
                        }
                    }
                }
            }
        }
        return b;
    }, [currentMoveIndex, sgfData]);

    const starPoints = useMemo(() => {
        const boardSize = sgfData?.boardSize;
        if (!boardSize) return [];
        if (boardSize === 19) return [{ x: 3, y: 3 }, { x: 9, y: 3 }, { x: 15, y: 3 }, { x: 3, y: 9 }, { x: 9, y: 9 }, { x: 15, y: 9 }, { x: 3, y: 15 }, { x: 9, y: 15 }, { x: 15, y: 15 }];
        if (boardSize === 13) return [{ x: 3, y: 3 }, { x: 9, y: 3 }, { x: 3, y: 9 }, { x: 9, y: 9 }, { x: 6, y: 6 }];
        if (boardSize === 11) return [{ x: 2, y: 2 }, { x: 8, y: 2 }, { x: 5, y: 5 }, { x: 2, y: 8 }, { x: 8, y: 8 }];
        if (boardSize === 9) return [{ x: 2, y: 2 }, { x: 6, y: 2 }, { x: 4, y: 4 }, { x: 2, y: 6 }, { x: 6, y: 6 }];
        return [];
    }, [sgfData]);


    if (loading) return <div className="flex items-center justify-center h-full text-gray-400">기보 로딩 중...</div>;
    if (error) return <div className="flex items-center justify-center h-full text-red-400">오류: {error}</div>;
    if (!sgfData) return null;

    const { boardSize, moves } = sgfData;
    const boardSizePx = 300;
    const cellSize = boardSizePx / boardSize;
    const padding = cellSize / 2;
    const stoneRadius = cellSize * 0.45;

    const toSvgCoords = (p: Point) => ({
      cx: padding + p.x * cellSize,
      cy: padding + p.y * cellSize,
    });
    
    const relevantMoves = moves.slice(0, currentMoveIndex);
    
    return (
        <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700 relative">
            <svg viewBox={`0 0 ${boardSizePx} ${boardSizePx}`} className="w-full h-full">
                <rect width={boardSizePx} height={boardSizePx} fill="#DDAA77" />
                {Array.from({ length: boardSize }).map((_, i) => (
                    <g key={i}>
                        <line x1={padding + i * cellSize} y1={padding} x2={padding + i * cellSize} y2={boardSizePx - padding} stroke="#54432a" strokeWidth="0.5" />
                        <line x1={padding} y1={padding + i * cellSize} x2={boardSizePx - padding} y2={padding + i * cellSize} stroke="#54432a" strokeWidth="0.5" />
                    </g>
                ))}
                {starPoints.map((p, i) => <circle key={`star-${i}`} {...toSvgCoords(p)} r={boardSize > 9 ? 3 : 2} fill="#54432a" />)}
                {boardState.map((row, y) => row.map((player, x) => {
                    if (player === Player.None) return null;
                    const { cx, cy } = toSvgCoords({ x, y });
                    
                    let moveIndex = -1;
                    for (let i = relevantMoves.length - 1; i >= 0; i--) {
                        if (relevantMoves[i].x === x && relevantMoves[i].y === y) {
                            moveIndex = i;
                            break;
                        }
                    }
                    
                    const isLastMove = moveIndex === currentMoveIndex - 1;

                    return (
                        <g key={`${x}-${y}`}>
                            <circle cx={cx} cy={cy} r={stoneRadius} fill={player === Player.Black ? 'black' : 'white'} />
                            {showLastMoveOnly && moveIndex !== -1 && (
                                <text x={cx} y={cy} textAnchor="middle" dy=".35em" fontSize={stoneRadius * 1.2} fontWeight="bold" fill={player === Player.Black ? 'white' : 'black'}>
                                    {moveIndex + 1}
                                </text>
                            )}
                             {isLastMove && <circle cx={cx} cy={cy} r={stoneRadius * 0.4} fill="rgba(239, 68, 68, 0.8)" className="animate-pulse" />}
                        </g>
                    );
                }))}
            </svg>
        </div>
    );
};

export default SgfViewer;