import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { BoardState, Point, Player, GameStatus, Move, AnalysisResult, LiveGameSession, User, AnimationData, GameMode, RecommendedMove, ServerAction } from '../types.js';
import { WHITE_BASE_STONE_IMG, BLACK_BASE_STONE_IMG, WHITE_HIDDEN_STONE_IMG, BLACK_HIDDEN_STONE_IMG } from '../assets.js';
import { SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES } from '../constants.js';

const AnimatedBonusText: React.FC<{
    animation: Extract<AnimationData, { type: 'bonus_text' }>;
    toSvgCoords: (p: Point) => { cx: number; cy: number };
    cellSize: number;
}> = ({ animation, toSvgCoords, cellSize }) => {
    const { text, point } = animation;
    const { cx, cy } = toSvgCoords(point);
    const fontSize = cellSize * 1.5;

    return (
        <g style={{ pointerEvents: 'none' }} className="bonus-text-animation">
            <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dy=".35em"
                fontSize={fontSize}
                fontWeight="bold"
                fill="url(#bonus-gradient)"
                stroke="black"
                strokeWidth="1.5px"
                paintOrder="stroke"
            >
                {text}
            </text>
        </g>
    );
};

const OwnershipOverlay: React.FC<{
    ownershipMap: number[][];
    toSvgCoords: (p: Point) => { cx: number; cy: number };
    cellSize: number;
}> = ({ ownershipMap, toSvgCoords, cellSize }) => {
    return (
        <g style={{ pointerEvents: 'none' }} className="animate-fade-in">
            {ownershipMap.map((row, y) => row.map((value, x) => {
                // value is from -10 to 10. Corresponds to -1.0 to 1.0 probability.
                const { cx, cy } = toSvgCoords({ x, y });
                const absValue = Math.abs(value);
                const prob = absValue / 10; // Probability from 0 to 1

                if (prob < 0.3) return null; // Don't render low probabilities to reduce clutter

                const size = cellSize * prob * 0.9; // Max size is 90% of the cell for better visual separation
                const opacity = prob * 0.7;
                const fill = value > 0 ? `rgba(0, 0, 0, ${opacity})` : `rgba(255, 255, 255, ${opacity})`;

                return (
                    <rect
                        key={`${x}-${y}`}
                        x={cx - size / 2}
                        y={cy - size / 2}
                        width={size}
                        height={size}
                        fill={fill}
                        rx={size * 0.3} // Add rounding to the corners for a softer look
                    />
                );
            }))}
        </g>
    );
};


// --- Animated Components ---
const AnimatedMissileStone: React.FC<{
    animation: Extract<AnimationData, { type: 'missile' }>;
    stone_radius: number;
    toSvgCoords: (p: Point) => { cx: number; cy: number };
}> = ({ animation, stone_radius, toSvgCoords }) => {
    const { from, to, player } = animation;
    const fromCoords = toSvgCoords(from);
    const toCoords = toSvgCoords(to);

    const style: React.CSSProperties & {
      '--from-x': string;
      '--from-y': string;
      '--to-x': string;
      '--to-y': string;
    } = {
        '--from-x': `${fromCoords.cx}px`,
        '--from-y': `${fromCoords.cy}px`,
        '--to-x': `${toCoords.cx}px`,
        '--to-y': `${toCoords.cy}px`,
    };

    const angle = Math.atan2(toCoords.cy - fromCoords.cy, toCoords.cx - fromCoords.cx) * 180 / Math.PI;

    return (
        <g style={style} className="missile-flight-group">
            <g transform={`translate(0, 0)`}>
                {/* Fire Trail */}
                <ellipse
                    cx={0}
                    cy={0}
                    rx={stone_radius * 1.5}
                    ry={stone_radius * 0.7}
                    fill="url(#missile_fire)"
                    className="missile-fire-trail"
                    transform={`rotate(${angle}) translate(${-stone_radius}, 0)`}
                />
                {/* Stone */}
                <circle
                    cx={0}
                    cy={0}
                    r={stone_radius}
                    fill={player === Player.Black ? "#111827" : "#f5f2e8"}
                />
                <circle cx={0} cy={0} r={stone_radius} fill={player === Player.Black ? 'url(#slate_highlight)' : 'url(#clamshell_highlight)'} />
            </g>
        </g>
    );
};

const AnimatedHiddenMissile: React.FC<{
    animation: Extract<AnimationData, { type: 'hidden_missile' }>;
    stone_radius: number;
    toSvgCoords: (p: Point) => { cx: number; cy: number };
}> = ({ animation, stone_radius, toSvgCoords }) => {
    const { from, to, player, duration } = animation;
    const fromCoords = toSvgCoords(from);
    const toCoords = toSvgCoords(to);

    const flightStyle: React.CSSProperties & {
      '--from-x': string;
      '--from-y': string;
      '--to-x': string;
      '--to-y': string;
    } = {
        '--from-x': `${fromCoords.cx}px`,
        '--from-y': `${fromCoords.cy}px`,
        '--to-x': `${toCoords.cx}px`,
        '--to-y': `${toCoords.cy}px`,
        animationDuration: `${duration}ms`,
        animationFillMode: 'forwards',
    };

    const specialImageSize = stone_radius * 2 * 0.7;
    const specialImageOffset = specialImageSize / 2;
    const angle = Math.atan2(toCoords.cy - fromCoords.cy, toCoords.cx - fromCoords.cx) * 180 / Math.PI;

    const flightEffect = (
        <g style={flightStyle} className="hidden-missile-flight-group">
            <g transform={`translate(0, 0)`}>
                <ellipse
                    cx={0}
                    cy={0}
                    rx={stone_radius * 1.5}
                    ry={stone_radius * 0.7}
                    fill="url(#missile_fire)"
                    className="missile-fire-trail"
                    transform={`rotate(${angle}) translate(${-stone_radius}, 0)`}
                />
                <circle cx={0} cy={0} r={stone_radius} fill={player === Player.Black ? "#111827" : "#f5f2e8"} />
                <circle cx={0} cy={0} r={stone_radius} fill={player === Player.Black ? 'url(#slate_highlight)' : 'url(#clamshell_highlight)'} />
                <image href={player === Player.Black ? BLACK_HIDDEN_STONE_IMG : WHITE_HIDDEN_STONE_IMG} x={-specialImageOffset} y={-specialImageOffset} width={specialImageSize} height={specialImageSize} />
            </g>
        </g>
    );

    return (
        <g style={{ pointerEvents: 'none' }}>
            {flightEffect}
        </g>
    );
};

const AnimatedScanMarker: React.FC<{
    animation: Extract<AnimationData, { type: 'scan' }>;
    toSvgCoords: (p: Point) => { cx: number; cy: number };
    stone_radius: number;
}> = ({ animation, toSvgCoords, stone_radius }) => {
    const { point, success } = animation;
    const { cx, cy } = toSvgCoords(point);
    const size = stone_radius * 2.5;

    return (
        <g style={{ pointerEvents: 'none' }}>
            {success ? (
                <>
                    <circle cx={cx} cy={cy} r={size * 0.2} fill="none" stroke="#34d399" className="scan-success-circle" style={{ animationDelay: '0s' }} />
                    <circle cx={cx} cy={cy} r={size * 0.2} fill="none" stroke="#34d399" className="scan-success-circle" style={{ animationDelay: '0.2s' }} />
                    <circle cx={cx} cy={cy} r={size * 0.2} fill="none" stroke="#34d399" className="scan-success-circle" style={{ animationDelay: '0.4s' }} />
                </>
            ) : (
                <>
                    <line x1={cx - size/2} y1={cy - size/2} x2={cx + size/2} y2={cy + size/2} stroke="#f87171" strokeWidth="4" strokeLinecap="round" className="scan-fail-line" />
                    <line x1={cx + size/2} y1={cy - size/2} x2={cx - size/2} y2={cy + size/2} stroke="#f87171" strokeWidth="4" strokeLinecap="round" className="scan-fail-line" style={{ animationDelay: '0.2s' }}/>
                </>
            )}
        </g>
    );
};

const RecommendedMoveMarker: React.FC<{
    move: RecommendedMove;
    toSvgCoords: (p: Point) => { cx: number; cy: number };
    cellSize: number;
    onClick: (x: number, y: number) => void;
}> = ({ move, toSvgCoords, cellSize, onClick }) => {
    const { cx, cy } = toSvgCoords({ x: move.x, y: move.y });
    const radius = cellSize * 0.45;
    const colors = ['#3b82f6', '#16a34a', '#f59e0b']; // Blue, Green, Amber for 1, 2, 3
    const color = colors[move.order - 1] || '#6b7280';

    return (
        <g
            onClick={(e) => { e.stopPropagation(); onClick(move.x, move.y); }}
            className="cursor-pointer recommended-move-marker"
        >
            <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={color}
                fillOpacity="0.7"
                stroke="white"
                strokeWidth="2"
            />
            <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dy=".35em"
                fontSize={radius * 1.2}
                fontWeight="bold"
                fill="white"
                style={{ pointerEvents: 'none', textShadow: '0 0 3px black' }}
            >
                {move.order}
            </text>
        </g>
    );
};

const Stone: React.FC<{ player: Player, cx: number, cy: number, isLastMove?: boolean, isSelectedMissile?: boolean, isHoverSelectableMissile?: boolean, isKnownHidden?: boolean, isNewlyRevealed?: boolean, animationClass?: string, isPending?: boolean, isBaseStone?: boolean, isPatternStone?: boolean, radius: number, isFaint?: boolean }> = ({ player, cx, cy, isLastMove, isSelectedMissile, isHoverSelectableMissile, isKnownHidden, isNewlyRevealed, animationClass, isPending, isBaseStone, isPatternStone, radius, isFaint }) => {
    const specialImageSize = radius * 2 * 0.7;
    const specialImageOffset = specialImageSize / 2;

    const strokeColor = isPending ? 'rgb(34, 197, 94)'
        : isSelectedMissile ? 'rgb(239, 68, 68)'
        : 'none';
    
    const strokeWidth = isSelectedMissile || isPending ? 3.5 : 0;

    return (
        <g className={`${animationClass || ''} ${isHoverSelectableMissile ? 'missile-selectable-stone' : ''}`} opacity={isPending ? 0.6 : (isFaint ? 0.4 : 1)}>
            <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={player === Player.Black ? "#111827" : "#f5f2e8"}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
            />
            {player === Player.White && <circle cx={cx} cy={cy} r={radius} fill="url(#clam_grain)" />}
            <circle cx={cx} cy={cy} r={radius} fill={player === Player.Black ? 'url(#slate_highlight)' : 'url(#clamshell_highlight)'} />
            {isBaseStone && (
                <image href={player === Player.Black ? BLACK_BASE_STONE_IMG : WHITE_BASE_STONE_IMG} x={cx - specialImageOffset} y={cy - specialImageOffset} width={specialImageSize} height={specialImageSize} />
            )}
            {isKnownHidden && (
                <image href={player === Player.Black ? BLACK_HIDDEN_STONE_IMG : WHITE_HIDDEN_STONE_IMG} x={cx - specialImageOffset} y={cy - specialImageOffset} width={specialImageSize} height={specialImageSize} />
            )}
            {isPatternStone && (
                <image href={player === Player.Black ? '/images/single/BlackDouble.png' : '/images/single/WhiteDouble.png'} x={cx - specialImageOffset} y={cy - specialImageOffset} width={specialImageSize} height={specialImageSize} />
            )}
            {isNewlyRevealed && (
                <circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="none"
                    stroke="rgba(0, 255, 255, 0.8)"
                    strokeWidth="4"
                    className="sparkle-animation"
                    style={{ pointerEvents: 'none', transformOrigin: 'center' }}
                />
            )}
            {isLastMove && (
                <circle
                    cx={cx}
                    cy={cy}
                    r={radius * 0.25}
                    fill="rgba(239, 68, 68, 0.9)"
                    className="animate-pulse"
                    style={{ pointerEvents: 'none' }}
                />
            )}
        </g>
    );
};

// --- Go Board Component ---
interface GoBoardProps {
  boardState: BoardState;
  boardSize: number;
  onBoardClick: (x: number, y: number) => void;
  onMissileLaunch?: (from: Point, direction: 'up' | 'down' | 'left' | 'right') => void;
  onAction?: (action: ServerAction) => void;
  gameId?: string;
  lastMove: Point | null;
  lastTurnStones?: Point[] | null;
  isBoardDisabled: boolean;
  stoneColor: Player;
  winningLine?: Point[] | null;
  moveHistory?: Move[];
  isSpectator: boolean;
  // Special mode props
  mode: GameMode;
  mixedModes?: GameMode[];
  hiddenMoves?: { [moveIndex: number]: boolean };
  baseStones?: { x: number, y: number, player: Player }[];
  baseStones_p1?: Point[];
  baseStones_p2?: Point[];
  myPlayerEnum: Player;
  gameStatus: GameStatus;
  currentPlayer: Player;
  highlightedPoints?: Point[];
  highlightStyle?: 'circle' | 'ring';
  myRevealedStones?: Point[];
  allRevealedStones?: { [playerId: string]: Point[] };
  newlyRevealed?: { point: Point, player: Player }[];
  justCaptured?: { point: Point; player: Player; wasHidden: boolean }[];
  permanentlyRevealedStones?: Point[];
  blackPatternStones?: Point[];
  whitePatternStones?: Point[];
  // Analysis props
  analysisResult?: AnalysisResult | null;
  showTerritoryOverlay?: boolean;
  showHintOverlay?: boolean;
  showLastMoveMarker: boolean;
  // Missile mode specific
  currentUser: User;
  blackPlayerNickname: string;
  whitePlayerNickname: string;
  animation?: AnimationData | null;
  isItemModeActive: boolean;
  sgf?: string;
  isMobile?: boolean;
}

const GoBoard: React.FC<GoBoardProps> = (props) => {
    const { 
        boardState, boardSize, onBoardClick, onMissileLaunch, lastMove, lastTurnStones, isBoardDisabled, 
        stoneColor, winningLine, hiddenMoves, moveHistory, baseStones, baseStones_p1, baseStones_p2,
        myPlayerEnum, gameStatus, highlightedPoints, highlightStyle = 'circle', myRevealedStones, allRevealedStones, newlyRevealed, isSpectator,
        analysisResult, showTerritoryOverlay = false, showHintOverlay = false, currentUser, blackPlayerNickname, whitePlayerNickname,
        currentPlayer, isItemModeActive, animation, mode, mixedModes, justCaptured, permanentlyRevealedStones, onAction, gameId,
        showLastMoveMarker, blackPatternStones, whitePatternStones
    } = props;
    const [hoverPos, setHoverPos] = useState<Point | null>(null);
    const [selectedMissileStone, setSelectedMissileStone] = useState<Point | null>(null);
    const [isDraggingMissile, setIsDraggingMissile] = useState(false);
    const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);
    const [dragEndPoint, setDragEndPoint] = useState<Point | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const dragStartBoardPoint = useRef<Point | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const boardSizePx = 840;

    const safeBoardSize = boardSize > 0 ? boardSize : 19;
    const cell_size = boardSizePx / safeBoardSize;
    const padding = cell_size / 2;
    const stone_radius = cell_size * 0.47;
    
    useEffect(() => {
        const checkIsMobile = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    const isLastMoveMarkerEnabled = useMemo(() => {
        const strategicModes = SPECIAL_GAME_MODES.map(m => m.mode);
        const enabledPlayfulModes = [GameMode.Omok, GameMode.Ttamok, GameMode.Dice, GameMode.Thief];
        return strategicModes.includes(mode) || enabledPlayfulModes.includes(mode) || gameStatus.startsWith('single_player');
    }, [mode, gameStatus]);

    useEffect(() => {
        if (gameStatus !== 'missile_selecting') {
            setSelectedMissileStone(null);
        }
    }, [gameStatus]);

    const starPoints = useMemo(() => {
        if (safeBoardSize === 19) return [{ x: 3, y: 3 }, { x: 9, y: 3 }, { x: 15, y: 3 }, { x: 3, y: 9 }, { x: 9, y: 9 }, { x: 15, y: 9 }, { x: 3, y: 15 }, { x: 9, y: 15 }, { x: 15, y: 15 }];
        if (safeBoardSize === 15) return [{ x: 3, y: 3 }, { x: 11, y: 3 }, { x: 7, y: 7 }, { x: 3, y: 11 }, { x: 11, y: 11 }];
        if (safeBoardSize === 13) return [{ x: 3, y: 3 }, { x: 9, y: 3 }, { x: 3, y: 9 }, { x: 9, y: 9 }, { x: 6, y: 6 }];
        if (safeBoardSize === 11) return [{ x: 2, y: 2 }, { x: 8, y: 2 }, { x: 5, y: 5 }, { x: 2, y: 8 }, { x: 8, y: 8 }];
        if (safeBoardSize === 9) return [{ x: 2, y: 2 }, { x: 6, y: 2 }, { x: 4, y: 4 }, { x: 2, y: 6 }, { x: 6, y: 6 }];
        if (safeBoardSize === 7) return [{ x: 3, y: 3 }];
        return [];
    }, [safeBoardSize]);

    const toSvgCoords = (p: Point) => ({
      cx: padding + p.x * cell_size,
      cy: padding + p.y * cell_size,
    });
    
    const getBoardCoordinates = (e: React.MouseEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement>): Point | null => {
        const svg = svgRef.current;
        if (!svg) return null;
        
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        
        const ctm = svg.getScreenCTM();
        if (ctm) {
            const transformedPt = pt.matrixTransform(ctm.inverse());
            const x = Math.round((transformedPt.x - padding) / cell_size);
            const y = Math.round((transformedPt.y - padding) / cell_size);

            if (x >= 0 && x < safeBoardSize && y >= 0 && y < safeBoardSize) {
                return { x, y };
            }
        }
        return null;
    };
    
    const getNeighbors = useCallback((p: Point): Point[] => {
        const neighbors: Point[] = [];
        if (p.x > 0) neighbors.push({ x: p.x - 1, y: p.y });
        if (p.x < safeBoardSize - 1) neighbors.push({ x: p.x + 1, y: p.y });
        if (p.y > 0) neighbors.push({ x: p.x, y: p.y - 1 });
        if (p.y < safeBoardSize - 1) neighbors.push({ x: p.x, y: p.y + 1 });
        return neighbors;
    }, [safeBoardSize]);
    
    const handleBoardPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
        const boardPos = getBoardCoordinates(e);
        if (!boardPos) return;
        setHoverPos(boardPos);
    
        if (gameStatus === 'missile_selecting' && !isBoardDisabled) {
            if (boardState[boardPos.y][boardPos.x] === myPlayerEnum) {
                const neighbors = getNeighbors(boardPos);
                const hasLiberty = neighbors.some(n => boardState[n.y][n.x] === Player.None);
                if (hasLiberty) {
                    setSelectedMissileStone(boardPos);
                    setIsDraggingMissile(true);
                    setDragStartPoint({ x: e.clientX, y: e.clientY });
                    dragStartBoardPoint.current = boardPos;
                    (e.target as SVGSVGElement).setPointerCapture(e.pointerId);
                }
            }
        }
    };

    const handleBoardPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
        const pos = getBoardCoordinates(e);
        setHoverPos(pos);
        if (isDraggingMissile) {
            setDragEndPoint({ x: e.clientX, y: e.clientY });
        }
    };
    
    const handleBoardPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
        (e.target as SVGSVGElement).releasePointerCapture(e.pointerId);
        const boardPos = getBoardCoordinates(e);

        if (isDraggingMissile) {
            const dragDistance = dragStartPoint && dragEndPoint ? Math.hypot(dragEndPoint.x - dragStartPoint.x, dragEndPoint.y - dragStartPoint.y) : 0;
            const startStone = dragStartBoardPoint.current;

            setIsDraggingMissile(false);
            setDragStartPoint(null);
            setDragEndPoint(null);

            if (!isMobile && dragDistance < 10) {
                // It's a click, leave the stone selected for the arrow-based launch.
                return;
            } else if (startStone && boardPos && onMissileLaunch) {
                const dx = boardPos.x - startStone.x;
                const dy = boardPos.y - startStone.y;

                if (dx !== 0 || dy !== 0) {
                    let direction: 'up' | 'down' | 'left' | 'right';
                    if (Math.abs(dx) > Math.abs(dy)) {
                        direction = dx > 0 ? 'right' : 'left';
                    } else {
                        direction = dy > 0 ? 'down' : 'up';
                    }
                    onMissileLaunch(startStone, direction);
                    setSelectedMissileStone(null);
                }
            }
        } else if (!isBoardDisabled && boardPos) {
            onBoardClick(boardPos.x, boardPos.y);
        }
    };

    const myBaseStonesForPlacement = useMemo(() => {
        if (gameStatus !== 'base_placement') return null;
        return myPlayerEnum === Player.Black ? baseStones_p1 : baseStones_p2;
    }, [gameStatus, myPlayerEnum, baseStones_p1, baseStones_p2]);


    const isOpponentHiddenStoneAtPos = (pos: Point): boolean => {
        if (!hiddenMoves || !moveHistory) return false;
        if (gameStatus !== 'playing' && gameStatus !== 'hidden_placing') return false;

        const opponentPlayer = myPlayerEnum === Player.Black ? Player.White : Player.Black;
        for (let i = moveHistory.length - 1; i >= 0; i--) {
            const move = moveHistory[i];
            if (move.x === pos.x && move.y === pos.y) {
                return !!hiddenMoves[i] && move.player === opponentPlayer;
            }
        }
        return false;
    };
    
    const isGameFinished = gameStatus === 'ended' || gameStatus === 'no_contest';

    const showHoverPreview = hoverPos && !isBoardDisabled && gameStatus !== 'scanning' && gameStatus !== 'missile_selecting' && (
        boardState[hoverPos.y][hoverPos.x] === Player.None || 
        isOpponentHiddenStoneAtPos(hoverPos)
    );
    
    const renderDeadStoneMarkers = () => {
        if (!showTerritoryOverlay || !analysisResult || !analysisResult.deadStones) return null;

        return (
            <g style={{ pointerEvents: 'none' }} className="animate-fade-in">
                {analysisResult.deadStones.map((p, i) => {
                    const { cx, cy } = toSvgCoords(p);
                    const crossSize = stone_radius * 0.7;
                    return (
                        <g key={`ds-${i}`}>
                            <line x1={cx - crossSize} y1={cy - crossSize} x2={cx + crossSize} y2={cy + crossSize} stroke="red" strokeWidth="3" strokeLinecap="round" />
                            <line x1={cx - crossSize} y1={cy + crossSize} x2={cx + crossSize} y2={cy - crossSize} stroke="red" strokeWidth="3" strokeLinecap="round" />
                        </g>
                    );
                })}
            </g>
        );
    };

    const findMoveIndexAt = (game: Pick<LiveGameSession, 'moveHistory'>, x: number, y: number): number => {
        const moveHistory = game.moveHistory || [];
        if (!Array.isArray(moveHistory)) {
            return -1;
        }
        for (let i = moveHistory.length - 1; i >= 0; i--) {
            if (moveHistory[i].x === x && moveHistory[i].y === y) {
                return i;
            }
        }
        return -1;
    };
    
    const renderMissileLaunchPreview = () => {
        if (gameStatus !== 'missile_selecting' || !selectedMissileStone || !onMissileLaunch) return null;

        if (isDraggingMissile && dragStartPoint && dragEndPoint) {
            const svg = svgRef.current;
            if (!svg) return null;
            const ctm = svg.getScreenCTM()?.inverse();
            if (!ctm) return null;
            
            const startCoords = toSvgCoords(selectedMissileStone);

            const pt = svg.createSVGPoint();
            pt.x = dragEndPoint.x;
            pt.y = dragEndPoint.y;
            const svgDragEnd = pt.matrixTransform(ctm);
            
            const dx = svgDragEnd.x - startCoords.cx;
            const dy = svgDragEnd.y - startCoords.cy;

            let endCoords = { cx: startCoords.cx, cy: startCoords.cy };
            if (Math.abs(dx) > Math.abs(dy)) {
                endCoords.cx += Math.sign(dx) * cell_size * 2;
            } else {
                endCoords.cy += Math.sign(dy) * cell_size * 2;
            }

            return (
                 <g style={{ pointerEvents: 'none' }}>
                    <line x1={startCoords.cx} y1={startCoords.cy} x2={endCoords.cx} y2={endCoords.cy} stroke="rgba(239, 68, 68, 0.7)" strokeWidth="4" strokeDasharray="8 4" markerEnd="url(#arrowhead-missile)" />
                </g>
            );
        }

        // Existing click-based arrow logic
        const neighbors = getNeighbors(selectedMissileStone).filter(n => boardState[n.y][n.x] === Player.None);
        if (neighbors.length === 0) return null;

        const arrowSize = cell_size * 0.4;
        const directions = [
            { dir: 'up', point: { x: selectedMissileStone.x, y: selectedMissileStone.y - 1 } },
            { dir: 'down', point: { x: selectedMissileStone.x, y: selectedMissileStone.y + 1 } },
            { dir: 'left', point: { x: selectedMissileStone.x - 1, y: selectedMissileStone.y } },
            { dir: 'right', point: { x: selectedMissileStone.x + 1, y: selectedMissileStone.y } },
        ];

        return (
            <g>
                {directions.map(({ dir, point }) => {
                    const isValidTarget = neighbors.some(n => n.x === point.x && n.y === point.y);
                    if (!isValidTarget) return null;
                    const { cx, cy } = toSvgCoords(point);
                    return (
                        <polygon
                            key={dir}
                            points={`${cx},${cy - arrowSize} ${cx + arrowSize},${cy} ${cx},${cy + arrowSize} ${cx - arrowSize},${cy}`}
                            fill="rgba(239, 68, 68, 0.8)"
                            stroke="white"
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-100 opacity-80"
                            onClick={() => onMissileLaunch(selectedMissileStone, dir as any)}
                        />
                    );
                })}
            </g>
        );
    };

    return (
        <div className={`relative w-full h-full shadow-2xl rounded-lg overflow-hidden p-0 border-4 ${isItemModeActive ? 'prism-border' : 'border-gray-800'}`}>
            <svg
                ref={svgRef}
                viewBox={`0 0 ${boardSizePx} ${boardSizePx}`}
                className="w-full h-full touch-none"
                onPointerDown={handleBoardPointerDown}
                onPointerMove={handleBoardPointerMove}
                onPointerUp={handleBoardPointerUp}
                onPointerLeave={() => { setHoverPos(null); }}
            >
                <defs>
                    <radialGradient id="slate_highlight" cx="35%" cy="35%" r="60%" fx="30%" fy="30%">
                        <stop offset="0%" stopColor="#6b7280" stopOpacity="0.8"/>
                        <stop offset="100%" stopColor="#111827" stopOpacity="0.2"/>
                    </radialGradient>
                    <radialGradient id="clamshell_highlight" cx="35%" cy="35%" r="60%" fx="30%" fy="30%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9"/>
                        <stop offset="100%" stopColor="#e5e7eb" stopOpacity="0.1"/>
                    </radialGradient>
                    <filter id="clam_grain_filter">
                        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
                        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.1 0" />
                    </filter>
                    <pattern id="clam_grain" patternUnits="userSpaceOnUse" width="100" height="100">
                        <rect width="100" height="100" fill="#f5f2e8"/>
                        <rect width="100" height="100" filter="url(#clam_grain_filter)"/>
                    </pattern>
                    <radialGradient id="missile_fire" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fca5a5" />
                        <stop offset="50%" stopColor="#f87171" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="bonus-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                    <filter id="blue-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                     <marker id="arrowhead-missile" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="rgba(239, 68, 68, 0.9)" /></marker>
                </defs>
                <rect width={boardSizePx} height={boardSizePx} fill="#e0b484" />
                {Array.from({ length: safeBoardSize }).map((_, i) => (
                    <g key={i}>
                        <line x1={padding + i * cell_size} y1={padding} x2={padding + i * cell_size} y2={boardSizePx - padding} stroke="#54432a" strokeWidth="1.5" />
                        <line x1={padding} y1={padding + i * cell_size} x2={boardSizePx - padding} y2={padding + i * cell_size} stroke="#54432a" strokeWidth="1.5" />
                    </g>
                ))}
                {starPoints.map((p, i) => <circle key={i} {...toSvgCoords(p)} r={safeBoardSize > 9 ? 6 : 4} fill="#54432a" />)}
                
                {showTerritoryOverlay && analysisResult?.ownershipMap && (
                     <OwnershipOverlay ownershipMap={analysisResult.ownershipMap} toSvgCoords={toSvgCoords} cellSize={cell_size} />
                )}

                {boardState.map((row, y) => row.map((player, x) => {
                    if (player === Player.None) return null;
                    const { cx, cy } = toSvgCoords({ x, y });
                    
                    const isSingleLastMove = showLastMoveMarker && isLastMoveMarkerEnabled && lastMove && lastMove.x === x && lastMove.y === y;
                    const isMultiLastMove = showLastMoveMarker && isLastMoveMarkerEnabled && lastTurnStones && lastTurnStones.some(p => p.x === x && p.y === y);
                    const isLast = !!(isSingleLastMove || isMultiLastMove);
                    
                    const moveIndex = moveHistory ? findMoveIndexAt({ moveHistory } as LiveGameSession, x, y) : -1;
                    const isHiddenMove = hiddenMoves && moveIndex !== -1 && hiddenMoves[moveIndex];
                    const isPermanentlyRevealed = permanentlyRevealedStones?.some(p => p.x === x && p.y === y);
                    
                    let isVisible = true;
                    if (isHiddenMove) {
                        if (isSpectator) {
                            isVisible = isGameFinished || !!isPermanentlyRevealed;
                        } else {
                            const isMyScanned = !isSpectator && myRevealedStones?.some(p => p.x === x && p.y === y);
                            const isNewlyRevealed = newlyRevealed?.some(nr => nr.point.x === x && nr.point.y === y);
                            isVisible = isGameFinished || !!isPermanentlyRevealed || player === myPlayerEnum || !!isMyScanned || !!isNewlyRevealed;
                        }
                    }

                    if (!isVisible) return null;
                    if (animation?.type === 'missile' && animation.from.x === x && animation.from.y === y) return null;
                    if (animation?.type === 'hidden_missile' && animation.from.x === x && animation.from.y === y) return null;
                    
                    const isNewlyRevealedForAnim = newlyRevealed?.some(nr => nr.point.x === x && nr.point.y === y);
                    const isFaint = !isSpectator && myRevealedStones?.some(p => p.x === x && p.y === y) && !isPermanentlyRevealed;

                    const isBaseStone = baseStones?.some(stone => stone.x === x && stone.y === y && stone.player === player);
                    const isKnownHidden = isHiddenMove; // Pattern is shown if it's a hidden move and visible.
                    const isSelectedMissileForRender = selectedMissileStone?.x === x && selectedMissileStone?.y === y;
                    const isHoverSelectableMissile = gameStatus === 'missile_selecting' && !selectedMissileStone && player === myPlayerEnum;
                    const isPatternStone = (player === Player.Black && blackPatternStones?.some(p => p.x === x && p.y === y)) || (player === Player.White && whitePatternStones?.some(p => p.x === x && p.y === y));

                    
                    return <Stone key={`${x}-${y}`} player={player} cx={cx} cy={cy} isLastMove={isLast} isKnownHidden={isKnownHidden} isBaseStone={isBaseStone} isPatternStone={isPatternStone} isNewlyRevealed={isNewlyRevealedForAnim} animationClass={isNewlyRevealedForAnim ? 'sparkle-animation' : ''} isSelectedMissile={isSelectedMissileForRender} isHoverSelectableMissile={isHoverSelectableMissile} radius={stone_radius} isFaint={isFaint} />;
                }))}
                {myBaseStonesForPlacement?.map((stone, i) => {
                    const { cx, cy } = toSvgCoords(stone);
                    return (
                        <g key={`my-base-${i}`} opacity={0.7} className="animate-fade-in">
                            <Stone player={myPlayerEnum} cx={cx} cy={cy} isBaseStone radius={stone_radius} />
                        </g>
                    );
                })}
                {winningLine && winningLine.length > 0 && ( <path d={`M ${toSvgCoords(winningLine[0]).cx} ${toSvgCoords(winningLine[0]).cy} L ${toSvgCoords(winningLine[winningLine.length - 1]).cx} ${toSvgCoords(winningLine[winningLine.length - 1]).cy}`} stroke="rgba(239, 68, 68, 0.8)" strokeWidth="10" strokeLinecap="round" className="animate-fade-in" /> )}
                
                {highlightedPoints && highlightedPoints.map((p, i) => {
                    const { cx, cy } = toSvgCoords(p);
                    if (highlightStyle === 'ring') {
                        return (
                            <circle
                                key={`highlight-ring-${i}`}
                                cx={cx}
                                cy={cy}
                                r={stone_radius * 0.9}
                                fill="none"
                                stroke="#0ea5e9"
                                strokeWidth="3"
                                strokeDasharray="5 3"
                                className="animate-pulse"
                                style={{ pointerEvents: 'none' }}
                            />
                        );
                    }
                    return (
                        <circle
                            key={`highlight-circle-${i}`}
                            cx={cx}
                            cy={cy}
                            r={stone_radius * 0.3}
                            fill={currentPlayer === Player.Black ? "black" : "white"}
                            opacity="0.3"
                        />
                    );
                })}

                {showHoverPreview && hoverPos && ( <g opacity="0.5"> <Stone player={stoneColor} cx={toSvgCoords(hoverPos).cx} cy={toSvgCoords(hoverPos).cy} radius={stone_radius} /> </g> )}
                {renderMissileLaunchPreview()}
                {animation && (
                    <>
                        {animation.type === 'missile' && <AnimatedMissileStone animation={animation} stone_radius={stone_radius} toSvgCoords={toSvgCoords} />}
                        {animation.type === 'hidden_missile' && animation.player === myPlayerEnum && !isSpectator && <AnimatedHiddenMissile animation={animation} stone_radius={stone_radius} toSvgCoords={toSvgCoords} />}
                        {animation.type === 'scan' && !isSpectator && animation.playerId === currentUser.id && <AnimatedScanMarker animation={animation} toSvgCoords={toSvgCoords} stone_radius={stone_radius} />}
                        {animation.type === 'hidden_reveal' && animation.stones.map((s, i) => ( <Stone key={`reveal-${i}`} player={s.player} cx={toSvgCoords(s.point).cx} cy={toSvgCoords(s.point).cy} isKnownHidden animationClass="sparkle-animation" radius={stone_radius} /> ))}
                        {animation.type === 'bonus_text' && <AnimatedBonusText animation={animation} toSvgCoords={toSvgCoords} cellSize={cell_size} />}
                    </>
                )}
                {renderDeadStoneMarkers()}
                {showHintOverlay && !isBoardDisabled && analysisResult?.recommendedMoves?.map(move => ( <RecommendedMoveMarker key={`rec-${move.order}`} move={move} toSvgCoords={toSvgCoords} cellSize={cell_size} onClick={onBoardClick} /> ))}
            </svg>
        </div>
    );
};

export default GoBoard;