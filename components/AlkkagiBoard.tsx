import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef, ReactNode, useMemo, useCallback } from 'react';
import { AlkkagiStone, GameSettings, GameStatus, Player, Point, AlkkagiLayoutType, LiveGameSession, UserWithStatus } from '../types.js';
import { BATTLE_PLACEMENT_ZONES } from '../constants';

export interface AlkkagiBoardHandle {
    updateLocalStones: (newStones: AlkkagiStone[]) => void;
    getSvg: () => SVGSVGElement | null;
}

interface AlkkagiBoardProps {
    stones: AlkkagiStone[];
    gameStatus: GameStatus;
    myPlayer: Player;
    isMyTurn: boolean;
    settings: GameSettings;
    onPlacementClick: (svgPoint: Point) => void;
    onStoneInteractionStart: (stone: AlkkagiStone, e: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>) => void;
    isSpectator: boolean;
    dragStartPoint: Point | null; // Screen coordinates
    dragEndPoint: Point | null; // Screen coordinates
    selectedStone: AlkkagiStone | null;
    myStonesCount: number;
    maxStones: number;
    session: LiveGameSession;
    currentUser: UserWithStatus;
}

const AlkkagiBoard = forwardRef<AlkkagiBoardHandle, AlkkagiBoardProps>((props, ref): ReactNode => {
    const { stones, gameStatus, myPlayer, isMyTurn, settings, onPlacementClick, onStoneInteractionStart, isSpectator, dragStartPoint, dragEndPoint, selectedStone, myStonesCount, maxStones, session, currentUser } = props;
    const [localStones, setLocalStones] = useState(stones);
    const [hoverPos, setHoverPos] = useState<Point | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const boardSizePx = 840;
    
    const safeBoardSize = settings.boardSize > 0 ? settings.boardSize : 19;
    const cellSize = boardSizePx / safeBoardSize;
    const padding = cellSize / 2;

    const starPoints = useMemo(() => {
        if (safeBoardSize === 19) return [{ x: 3, y: 3 }, { x: 9, y: 3 }, { x: 15, y: 3 }, { x: 3, y: 9 }, { x: 9, y: 9 }, { x: 15, y: 9 }, { x: 3, y: 15 }, { x: 9, y: 15 }, { x: 15, y: 15 }];
        if (safeBoardSize === 13) return [{ x: 3, y: 3 }, { x: 9, y: 3 }, { x: 3, y: 9 }, { x: 9, y: 9 }, { x: 6, y: 6 }];
        if (safeBoardSize === 11) return [{ x: 2, y: 2 }, { x: 8, y: 2 }, { x: 2, y: 8 }, { x: 8, y: 8 }, { x: 5, y: 5 }];
        if (safeBoardSize === 9) return [{ x: 2, y: 2 }, { x: 6, y: 2 }, { x: 2, y: 6 }, { x: 6, y: 6 }, { x: 4, y: 4 }];
        return [];
    }, [safeBoardSize]);

    const toSvgCoords = (p: Point) => ({
      cx: padding + p.x * cellSize,
      cy: padding + p.y * cellSize,
    });

    useEffect(() => {
        if (gameStatus !== 'alkkagi_animating') {
            setLocalStones(stones);
        }
    }, [stones, gameStatus]);

    useImperativeHandle(ref, () => ({
        updateLocalStones: (newStones) => {
            setLocalStones([...newStones]);
        },
        getSvg: () => svgRef.current,
    }));

    const getSvgCoordinates = (e: React.MouseEvent<SVGSVGElement>): Point | null => {
        const svg = svgRef.current;
        if (!svg) return null;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const ctm = svg.getScreenCTM();
        if (ctm) {
            const transformedPt = pt.matrixTransform(ctm.inverse());
            return { x: transformedPt.x, y: transformedPt.y };
        }
        return null;
    };
    
    const isPlacementValid = useCallback((point: Point | null): boolean => {
        if (!point || (gameStatus !== 'alkkagi_placement' && gameStatus !== 'alkkagi_simultaneous_placement') || myPlayer === Player.None) return false;

        const stoneRadius = (localStones && localStones.length > 0 && localStones[0].radius) ? localStones[0].radius : (840 / 19) * 0.47;
        
        const { x: svgX, y: svgY } = point;

        if (svgX < stoneRadius || svgX > boardSizePx - stoneRadius || svgY < stoneRadius || svgY > boardSizePx - stoneRadius) {
            return false;
        }
        
        let inZone = false;
        if (settings.alkkagiLayout === AlkkagiLayoutType.Battle) {
            const zones = BATTLE_PLACEMENT_ZONES[myPlayer];
            inZone = zones.some(zone => {
                 const zoneXStart = padding + (zone.x - 0.5) * cellSize;
                 const zoneYStart = padding + (zone.y - 0.5) * cellSize;
                 const zoneXEnd = zoneXStart + zone.width * cellSize;
                 const zoneYEnd = zoneYStart + zone.height * cellSize;
                 return svgX >= zoneXStart && svgX <= zoneXEnd && svgY >= zoneYStart && svgY <= zoneYEnd;
            });
        } else { // Normal layout
            const whiteZoneMinY = boardSizePx * 0.15;
            const whiteZoneMaxY = boardSizePx * 0.35;
            const blackZoneMinY = boardSizePx * 0.65;
            const blackZoneMaxY = boardSizePx * 0.85;

            if (myPlayer === Player.White) {
                if (svgY >= whiteZoneMinY && svgY <= whiteZoneMaxY) inZone = true;
            } else {
                if (svgY >= blackZoneMinY && svgY <= blackZoneMaxY) inZone = true;
            }
        }
        if (!inZone) return false;

        for (const stone of localStones) {
            if (stone.player === myPlayer) {
                const distance = Math.hypot(svgX - stone.x, svgY - stone.y);
                if (distance < stone.radius * 2) {
                    return false; // Overlapping
                }
            }
        }
        return true;
    }, [gameStatus, myPlayer, localStones, settings.alkkagiLayout, cellSize, padding]);
    
    const isHoverValid = useMemo(() => isPlacementValid(hoverPos), [hoverPos, isPlacementValid]);

    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if ((gameStatus !== 'alkkagi_placement' && gameStatus !== 'alkkagi_simultaneous_placement') || !isMyTurn) return;
        const svgPoint = getSvgCoordinates(e);
        if (svgPoint && isPlacementValid(svgPoint)) {
            onPlacementClick({ x: svgPoint.x, y: svgPoint.y });
        }
    };

    const canPlaceStone = isMyTurn && (gameStatus === 'alkkagi_placement' || gameStatus === 'alkkagi_simultaneous_placement') && myStonesCount < maxStones;
    
    const renderPlacementZone = () => {
        if ((gameStatus !== 'alkkagi_placement' && gameStatus !== 'alkkagi_simultaneous_placement') || isSpectator || myPlayer === Player.None) return null;
        
        const baseProps = {
            strokeWidth: "3",
            rx: "5",
            className: canPlaceStone ? 'animate-pulse-blue' : '',
            style: { pointerEvents: 'none' } as React.CSSProperties
        };

        if (settings.alkkagiLayout === AlkkagiLayoutType.Battle) {
            const myZones = BATTLE_PLACEMENT_ZONES[myPlayer];
            const color = myPlayer === Player.Black ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.35)';
            const strokeColor = myPlayer === Player.Black ? 'rgba(50, 50, 50, 0.8)' : 'rgba(220, 220, 220, 0.8)';
            return (
                <g>
                    {myZones.map((zone, i) => (
                        <rect
                            key={`zone-${i}`}
                            x={padding + (zone.x - 0.5) * cellSize}
                            y={padding + (zone.y - 0.5) * cellSize}
                            width={zone.width * cellSize}
                            height={zone.height * cellSize}
                            fill={color}
                            stroke={strokeColor}
                            {...baseProps}
                        />
                    ))}
                </g>
            );
        } else {
             const whiteZoneMinY = boardSizePx * 0.15;
            const whiteZoneMaxY = boardSizePx * 0.35;
            const blackZoneMinY = boardSizePx * 0.65;
            const blackZoneMaxY = boardSizePx * 0.85;

            const zoneY = myPlayer === Player.White ? whiteZoneMinY : blackZoneMinY;
            const zoneHeight = whiteZoneMaxY - whiteZoneMinY;
            const color = myPlayer === Player.Black ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.35)';
            const strokeColor = myPlayer === Player.Black ? 'rgba(50, 50, 50, 0.8)' : 'rgba(220, 220, 220, 0.8)';

            return (
                <rect
                    x={0}
                    y={zoneY}
                    width={boardSizePx}
                    height={zoneHeight}
                    fill={color}
                    stroke={strokeColor}
                    {...baseProps}
                />
            );
        }
    };

    const dragLine = useMemo(() => {
        if (!dragStartPoint || !dragEndPoint || !selectedStone || !svgRef.current) return null;
        const svg = svgRef.current;
        const ctm = svg.getScreenCTM()?.inverse();
        if (!ctm) return null;
        
        const pt = svg.createSVGPoint();
        pt.x = dragStartPoint.x;
        pt.y = dragStartPoint.y;
        const svgDragStart = pt.matrixTransform(ctm);

        pt.x = dragEndPoint.x;
        pt.y = dragEndPoint.y;
        const svgDragEnd = pt.matrixTransform(ctm);

        const dx = svgDragEnd.x - svgDragStart.x;
        const dy = svgDragEnd.y - svgDragStart.y;
        
        const currentStone = selectedStone;
        
        const svgStart = { x: currentStone.x, y: currentStone.y };
        let svgEnd = { x: svgStart.x - dx, y: svgStart.y - dy };
        
        const myActiveItems = session.activeAlkkagiItems?.[currentUser.id] || [];
        const isAimingLineActive = myActiveItems.includes('aimingLine');
        const baseArrowLength = 80 * 0.2;
        const maxArrowLength = isAimingLineActive ? baseArrowLength * 11 : baseArrowLength;

        const vectorX = svgEnd.x - svgStart.x;
        const vectorY = svgEnd.y - svgStart.y;
        const magnitude = Math.hypot(vectorX, vectorY);

        if (magnitude > maxArrowLength) {
            svgEnd.x = svgStart.x + (vectorX / magnitude) * maxArrowLength;
            svgEnd.y = svgStart.y + (vectorY / magnitude) * maxArrowLength;
        }
        
        return { start: svgStart, end: svgEnd };
    }, [dragStartPoint, dragEndPoint, selectedStone, session.activeAlkkagiItems, currentUser.id]);


    return (
        <div
            className={`relative w-full h-full shadow-2xl rounded-lg overflow-hidden border-4 border-gray-800`}
        >
            <svg
                ref={svgRef}
                viewBox={`0 0 ${boardSizePx} ${boardSizePx}`}
                className="w-full h-full touch-none"
                onClick={handleClick}
                onMouseMove={(e) => {
                    const svgPoint = getSvgCoordinates(e);
                    setHoverPos(svgPoint);
                }}
                onMouseLeave={() => setHoverPos(null)}
            >
                <defs>
                    <radialGradient id={`gloss-alkkagi-1`}><stop offset="10%" stopColor="#333"/><stop offset="95%" stopColor="#000"/></radialGradient>
                    <radialGradient id={`gloss-alkkagi-2`}><stop offset="10%" stopColor="#fff"/><stop offset="95%" stopColor="#ccc"/></radialGradient>
                    <marker id="arrowhead-alkkagi" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="rgba(239, 68, 68, 0.9)" /></marker>
                </defs>
                
                 <rect width={boardSizePx} height={boardSizePx} fill="#DDAA77" />

                 {Array.from({ length: safeBoardSize }).map((_, i) => (
                    <g key={i}>
                        <line x1={padding + i * cellSize} y1={padding} x2={padding + i * cellSize} y2={boardSizePx - padding} stroke="#54432a" strokeWidth="1.5" />
                        <line x1={padding} y1={padding + i * cellSize} x2={boardSizePx - padding} y2={padding + i * cellSize} stroke="#54432a" strokeWidth="1.5" />
                    </g>
                ))}
                {starPoints.map((p, i) => <circle key={i} {...toSvgCoords(p)} r={safeBoardSize > 9 ? 5 : 4} fill="#54432a" />)}

                {renderPlacementZone()}

                {localStones.map(stone => {
                    if (!stone.onBoard) return null;
                    const isMyStone = stone.player === myPlayer;
                    const canInteract = !isSpectator && isMyTurn && gameStatus === 'alkkagi_playing';
                    const cursorClass = canInteract && isMyStone ? 'cursor-pointer' : '';

                    return (
                        <g key={stone.id} className={cursorClass} onMouseDown={canInteract && isMyStone ? (e) => onStoneInteractionStart(stone, e) : undefined} onTouchStart={canInteract && isMyStone ? (e) => { e.preventDefault(); onStoneInteractionStart(stone, e); } : undefined}>
                            <circle cx={stone.x} cy={stone.y} r={stone.radius} fill={stone.player === Player.Black ? "#111827" : "#f9fafb"} />
                            <circle cx={stone.x} cy={stone.y} r={stone.radius} fill={`url(#gloss-alkkagi-${stone.player})`} />
                        </g>
                    );
                })}

                {canPlaceStone && hoverPos && isHoverValid && (
                    <g opacity="0.5" style={{ pointerEvents: 'none' }}>
                        <circle cx={hoverPos.x} cy={hoverPos.y} r={(localStones && localStones[0] ? localStones[0].radius : (840/19)*0.47)} fill={myPlayer === Player.Black ? "#111827" : "#f9fafb"} />
                    </g>
                )}

                {dragLine && (
                     <g style={{ pointerEvents: 'none' }}>
                        <line x1={dragLine.start.x} y1={dragLine.start.y} x2={dragLine.end.x} y2={dragLine.end.y} stroke="rgba(239, 68, 68, 0.7)" strokeWidth="4" strokeDasharray="8 4" markerEnd="url(#arrowhead-alkkagi)" />
                    </g>
                )}
            </svg>
        </div>
    );
});

export default AlkkagiBoard;