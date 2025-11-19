import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { BoardState, Point, Player, GameStatus, Move, AnalysisResult, LiveGameSession, User, AnimationData, GameMode, RecommendedMove, ServerAction } from '../types.js';
import { WHITE_BASE_STONE_IMG, BLACK_BASE_STONE_IMG, WHITE_HIDDEN_STONE_IMG, BLACK_HIDDEN_STONE_IMG } from '../assets.js';
import { SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES } from '../constants';

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

                // 더 작고 고급스러운 사각형 (60% 크기, 더 작은 모서리 반경)
                const size = cellSize * prob * 0.6; // Max size is 60% of the cell (더 작게)
                const opacity = Math.min(0.85, prob * 0.8 + 0.15); // 더 선명하게
                const fill = value > 0 
                    ? `rgba(0, 0, 0, ${opacity})` 
                    : `rgba(255, 255, 255, ${opacity})`;
                const stroke = value > 0 
                    ? `rgba(0, 0, 0, ${opacity * 0.5})` 
                    : `rgba(255, 255, 255, ${opacity * 0.5})`;

                return (
                    <rect
                        key={`${x}-${y}`}
                        x={cx - size / 2}
                        y={cy - size / 2}
                        width={size}
                        height={size}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={size * 0.05}
                        rx={size * 0.15} // 더 작은 모서리 반경 (더 고급스럽게)
                        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
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
    const { from, to, player, duration } = animation;
    const fromCoords = toSvgCoords(from);
    const toCoords = toSvgCoords(to);

    const style: React.CSSProperties & {
      '--from-x': string;
      '--from-y': string;
      '--to-x': string;
      '--to-y': string;
      '--animation-duration': string;
    } = {
        '--from-x': `${fromCoords.cx}px`,
        '--from-y': `${fromCoords.cy}px`,
        '--to-x': `${toCoords.cx}px`,
        '--to-y': `${toCoords.cy}px`,
        '--animation-duration': `${duration}ms`,
        animationFillMode: 'forwards',
    };

    const angle = Math.atan2(toCoords.cy - fromCoords.cy, toCoords.cx - fromCoords.cx) * 180 / Math.PI;
    // 불꽃은 이동 방향의 반대 방향으로 나와야 함
    // 돌의 뒤쪽(이동 방향 반대)에 위치시킴
    const fireAngle = angle + 180;

    return (
        <g style={style} className="missile-flight-group">
            <g transform={`translate(0, 0)`}>
                {/* Fire Trail - 이동 방향의 반대 방향으로 */}
                <ellipse
                    cx={0}
                    cy={0}
                    rx={stone_radius * 1.5}
                    ry={stone_radius * 0.7}
                    fill="url(#missile_fire)"
                    className="missile-fire-trail"
                    transform={`rotate(${fireAngle}) translate(${-stone_radius}, 0)`}
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
      '--animation-duration': string;
    } = {
        '--from-x': `${fromCoords.cx}px`,
        '--from-y': `${fromCoords.cy}px`,
        '--to-x': `${toCoords.cx}px`,
        '--to-y': `${toCoords.cy}px`,
        '--animation-duration': `${duration}ms`,
        animationFillMode: 'forwards',
    };

    const specialImageSize = stone_radius * 2 * 0.7;
    const specialImageOffset = specialImageSize / 2;
    const angle = Math.atan2(toCoords.cy - fromCoords.cy, toCoords.cx - fromCoords.cx) * 180 / Math.PI;
    // 불꽃은 이동 방향의 반대 방향으로 나와야 함
    // 돌의 뒤쪽(이동 방향 반대)에 위치시킴
    const fireAngle = angle + 180;

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
                    transform={`rotate(${fireAngle}) translate(${-stone_radius}, 0)`}
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
    const preservedBoardStateRef = useRef<BoardState | null>(null);
    const missileAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const boardSizePx = 840;
    
    // scoring 상태일 때 boardState를 보존하여 초기화 방지
    // 유효한 boardState가 있으면 보존
    useEffect(() => {
        const isBoardStateValid = boardState && 
            Array.isArray(boardState) && 
            boardState.length > 0 && 
            boardState[0] && 
            Array.isArray(boardState[0]) && 
            boardState[0].length > 0 &&
            boardState.some((row: Player[]) => 
                row && Array.isArray(row) && row.some((cell: Player) => cell !== Player.None && cell !== null && cell !== undefined)
            );
        
        if (isBoardStateValid) {
            preservedBoardStateRef.current = boardState;
        }
    }, [boardState]);
    
    // scoring 상태일 때는 보존된 boardState 사용, 아니면 현재 boardState 사용
    const displayBoardState = useMemo(() => {
        const isBoardStateValid = boardState && 
            Array.isArray(boardState) && 
            boardState.length > 0 && 
            boardState[0] && 
            Array.isArray(boardState[0]) && 
            boardState[0].length > 0 &&
            boardState.some((row: Player[]) => 
                row && Array.isArray(row) && row.some((cell: Player) => cell !== Player.None && cell !== null && cell !== undefined)
            );
        
        // scoring 상태일 때는 보존된 boardState를 우선 사용
        if (gameStatus === 'scoring') {
            if (preservedBoardStateRef.current) {
                return preservedBoardStateRef.current;
            }
            // 보존된 boardState가 없으면 현재 boardState 사용 (빈 보드 생성 안 함)
            if (isBoardStateValid) {
                return boardState;
            }
            // scoring 상태에서는 빈 보드 상태를 생성하지 않고 보존된 것을 우선 사용
            // 만약 아무것도 없으면 기존 boardState를 그대로 사용
            return boardState || [];
        }
        
        const result = isBoardStateValid ? boardState : (preservedBoardStateRef.current || boardState);
        
        // scoring이 아닌 경우에만 결과가 유효한 배열이 아니면 빈 보드 상태를 생성
        if (!result || !Array.isArray(result) || result.length === 0) {
            const safeSize = boardSize > 0 ? boardSize : 19;
            return Array(safeSize).fill(null).map(() => Array(safeSize).fill(Player.None));
        }
        
        return result;
    }, [boardState, gameStatus, boardSize]);

    const safeBoardSize = boardSize > 0 ? boardSize : 19;
    const cell_size = boardSizePx / safeBoardSize;
    const padding = cell_size / 2;
    const stone_radius = cell_size * 0.47;
    
    useEffect(() => {
        const checkIsMobile = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    // 미사일 애니메이션 완료 감지 및 처리
    useEffect(() => {
        // 이전 타임아웃 정리
        if (missileAnimationTimeoutRef.current) {
            clearTimeout(missileAnimationTimeoutRef.current);
            missileAnimationTimeoutRef.current = null;
        }

        // 미사일 애니메이션이 있고 게임 상태가 missile_animating이면 애니메이션 완료 감지
        if (animation && (animation.type === 'missile' || animation.type === 'hidden_missile') && gameStatus === 'missile_animating') {
            const now = Date.now();
            const elapsed = now - animation.startTime;
            const remaining = Math.max(0, animation.duration - elapsed);
            const maxDuration = 5000; // 최대 5초
            const timeout = Math.min(remaining + 200, maxDuration); // 약간의 여유 시간 추가 (200ms)

            console.log(`[GoBoard] Missile animation detected: type=${animation.type}, startTime=${animation.startTime}, now=${now}, elapsed=${elapsed}ms, duration=${animation.duration}ms, remaining=${remaining}ms, timeout=${timeout}ms`);

            // 이미 애니메이션이 완료되었으면 타임아웃을 설정하지 않음
            if (remaining <= 0) {
                console.log(`[GoBoard] Missile animation already completed (elapsed=${elapsed}ms >= duration=${animation.duration}ms)`);
                return;
            }

            missileAnimationTimeoutRef.current = setTimeout(() => {
                console.log(`[GoBoard] Missile animation timeout - animation should be complete. Expected end time: ${animation.startTime + animation.duration}, current time: ${Date.now()}`);
                missileAnimationTimeoutRef.current = null;
                // 서버에서 게임 루프를 통해 자동으로 처리될 것이지만, 추가 확인을 위해 로그를 남김
            }, timeout);
        }

        return () => {
            if (missileAnimationTimeoutRef.current) {
                clearTimeout(missileAnimationTimeoutRef.current);
                missileAnimationTimeoutRef.current = null;
            }
        };
    }, [animation, gameStatus, onAction]);

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
            if (displayBoardState[boardPos.y][boardPos.x] === myPlayerEnum) {
                const neighbors = getNeighbors(boardPos);
                const hasLiberty = neighbors.some(n => displayBoardState[n.y][n.x] === Player.None);
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
        displayBoardState[hoverPos.y][hoverPos.x] === Player.None || 
        isOpponentHiddenStoneAtPos(hoverPos)
    );
    
    const renderDeadStoneMarkers = () => {
        if (!showTerritoryOverlay || !analysisResult || !analysisResult.deadStones) return null;

        return (
            <g style={{ pointerEvents: 'none' }} className="animate-fade-in">
                {analysisResult.deadStones.map((p, i) => {
                    const { cx, cy } = toSvgCoords(p);
                    // 사석의 색상 확인 (잡은 쪽의 색상)
                    const deadStonePlayer = displayBoardState[p.y][p.x];
                    const capturingPlayer = deadStonePlayer === Player.Black ? Player.White : Player.Black;
                    
                    // 영토 표시 사각형 (잡은 쪽의 색상)
                    const cellSize = (boardSizePx - padding * 2) / safeBoardSize;
                    const size = cellSize * 0.6; // 영토 표시와 동일한 크기
                    const opacity = 0.85;
                    const fill = capturingPlayer === Player.Black 
                        ? `rgba(0, 0, 0, ${opacity})` 
                        : `rgba(255, 255, 255, ${opacity})`;
                    const stroke = capturingPlayer === Player.Black 
                        ? `rgba(0, 0, 0, ${opacity * 0.5})` 
                        : `rgba(255, 255, 255, ${opacity * 0.5})`;

                    return (
                        <g key={`ds-${i}`} style={{ zIndex: 10 }}>
                            {/* 영토 표시 사각형 (잡은 쪽의 색상) - 돌 위에 표시 */}
                            <rect
                                x={cx - size / 2}
                                y={cy - size / 2}
                                width={size}
                                height={size}
                                fill={fill}
                                stroke={stroke}
                                strokeWidth={size * 0.05}
                                rx={size * 0.15}
                                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
                            />
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
        const neighbors = getNeighbors(selectedMissileStone).filter(n => displayBoardState[n.y][n.x] === Player.None);
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
                    
                    // 각 방향에 맞는 화살표 경로
                    let arrowPath = '';
                    if (dir === 'up') {
                        arrowPath = `M ${cx} ${cy - arrowSize} L ${cx - arrowSize * 0.6} ${cy + arrowSize * 0.3} L ${cx - arrowSize * 0.3} ${cy} L ${cx + arrowSize * 0.3} ${cy} L ${cx + arrowSize * 0.6} ${cy + arrowSize * 0.3} Z`;
                    } else if (dir === 'down') {
                        arrowPath = `M ${cx} ${cy + arrowSize} L ${cx - arrowSize * 0.6} ${cy - arrowSize * 0.3} L ${cx - arrowSize * 0.3} ${cy} L ${cx + arrowSize * 0.3} ${cy} L ${cx + arrowSize * 0.6} ${cy - arrowSize * 0.3} Z`;
                    } else if (dir === 'left') {
                        arrowPath = `M ${cx - arrowSize} ${cy} L ${cx + arrowSize * 0.3} ${cy - arrowSize * 0.6} L ${cx} ${cy - arrowSize * 0.3} L ${cx} ${cy + arrowSize * 0.3} L ${cx + arrowSize * 0.3} ${cy + arrowSize * 0.6} Z`;
                    } else { // right
                        arrowPath = `M ${cx + arrowSize} ${cy} L ${cx - arrowSize * 0.3} ${cy - arrowSize * 0.6} L ${cx} ${cy - arrowSize * 0.3} L ${cx} ${cy + arrowSize * 0.3} L ${cx - arrowSize * 0.3} ${cy + arrowSize * 0.6} Z`;
                    }
                    
                    return (
                        <path
                            key={dir}
                            d={arrowPath}
                            fill="rgba(239, 68, 68, 0.8)"
                            stroke="white"
                            strokeWidth="1.5"
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

                {displayBoardState.map((row, y) => row.map((player, x) => {
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
                    // 싱글플레이어에서 유저의 히든 돌은 반투명으로 표시 (비공개 상태)
                    // PVP에서는 스캔한 히든 돌만 반투명으로 표시
                    const isFaint = !isSpectator && (
                        (myRevealedStones?.some(p => p.x === x && p.y === y) && !isPermanentlyRevealed) ||
                        (isHiddenMove && player === myPlayerEnum && !isPermanentlyRevealed && !isNewlyRevealedForAnim)
                    );

                    const isBaseStone = baseStones?.some(stone => stone.x === x && stone.y === y && stone.player === player);
                    // 히든 돌은 공개되어도 히든 문양을 유지해야 함
                    // isKnownHidden: 히든 돌인지 여부 (공개 여부와 관계없이)
                    const isKnownHidden = isHiddenMove; // 공개 여부와 관계없이 히든 돌이면 true
                    const isSelectedMissileForRender = selectedMissileStone?.x === x && selectedMissileStone?.y === y;
                    const isHoverSelectableMissile = gameStatus === 'missile_selecting' && !selectedMissileStone && player === myPlayerEnum;
                    
                    // 문양 결정: 히든 돌이 아닌 경우에만 패턴 문양 표시
                    // 히든 돌(공개 여부와 관계없이)은 히든 문양을 우선 표시하므로 패턴 문양을 표시하지 않음
                    let isPatternStone = false;
                    if (!isHiddenMove) {
                        // 히든 돌이 아닌 경우에만 패턴 문양 확인
                        isPatternStone = (player === Player.Black && blackPatternStones?.some(p => p.x === x && p.y === y)) || (player === Player.White && whitePatternStones?.some(p => p.x === x && p.y === y));
                    }

                    
                    return <Stone key={`${x}-${y}`} player={player} cx={cx} cy={cy} isLastMove={isLast} isKnownHidden={isKnownHidden as boolean} isBaseStone={isBaseStone} isPatternStone={isPatternStone} isNewlyRevealed={isNewlyRevealedForAnim} animationClass={isNewlyRevealedForAnim ? 'sparkle-animation' : ''} isSelectedMissile={isSelectedMissileForRender} isHoverSelectableMissile={isHoverSelectableMissile} radius={stone_radius} isFaint={isFaint} />;
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
                        {animation.type === 'missile' && (
                            <AnimatedMissileStone 
                                key={`missile-${animation.from.x}-${animation.from.y}-${animation.to.x}-${animation.to.y}-${animation.startTime}`}
                                animation={animation} 
                                stone_radius={stone_radius} 
                                toSvgCoords={toSvgCoords} 
                            />
                        )}
                        {animation.type === 'hidden_missile' && (
                            <AnimatedHiddenMissile 
                                key={`hidden-missile-${animation.from.x}-${animation.from.y}-${animation.to.x}-${animation.to.y}-${animation.startTime}`}
                                animation={animation} 
                                stone_radius={stone_radius} 
                                toSvgCoords={toSvgCoords} 
                            />
                        )}
                        {animation.type === 'scan' && !isSpectator && animation.playerId === currentUser.id && <AnimatedScanMarker animation={animation} toSvgCoords={toSvgCoords} stone_radius={stone_radius} />}
                        {animation.type === 'hidden_reveal' && animation.stones.map((s, i) => ( <Stone key={`reveal-${i}`} player={s.player} cx={toSvgCoords(s.point).cx} cy={toSvgCoords(s.point).cy} isKnownHidden animationClass="sparkle-animation" radius={stone_radius} /> ))}
                        {animation.type === 'bonus_text' && <AnimatedBonusText animation={animation} toSvgCoords={toSvgCoords} cellSize={cell_size} />}
                    </>
                )}
                {renderDeadStoneMarkers()}
                {showHintOverlay && !isBoardDisabled && analysisResult?.recommendedMoves?.map(move => ( <RecommendedMoveMarker key={`rec-${move.order}`} move={move} toSvgCoords={toSvgCoords} cellSize={cell_size} onClick={onBoardClick} /> ))}
                {gameStatus === 'scoring' && !analysisResult && (
                    <g>
                        <rect 
                            x={boardSizePx / 2 - 100} 
                            y={boardSizePx / 2 - 30} 
                            width={200} 
                            height={60} 
                            fill="rgba(0, 0, 0, 0.7)" 
                            rx={10}
                            stroke="rgba(255, 255, 255, 0.3)"
                            strokeWidth="2"
                        />
                        <text 
                            x={boardSizePx / 2} 
                            y={boardSizePx / 2} 
                            textAnchor="middle" 
                            dominantBaseline="middle"
                            fill="white"
                            fontSize="24"
                            fontWeight="bold"
                            className="animate-pulse"
                        >
                            계가 중...
                        </text>
                    </g>
                )}
            </svg>
        </div>
    );
};

export default GoBoard;