import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { AlkkagiStone, GameProps, Player, Point, GameStatus } from '../types.js';
import AlkkagiBoard, { AlkkagiBoardHandle } from './AlkkagiBoard.js';
import { ALKKAGI_PLACEMENT_TIME_LIMIT, ALKKAGI_TURN_TIME_LIMIT } from '../constants';
import { audioService } from '../services/audioService.js';

interface AlkkagiArenaProps extends GameProps {}

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

const AlkkagiArena: React.FC<AlkkagiArenaProps> = (props) => {
    const { session, onAction, currentUser, isSpectator } = props;
    const { id: gameId, settings, gameStatus, alkkagiStones, currentPlayer, player1, alkkagiStones_p1, alkkagiStones_p2, activeAlkkagiItems } = session;
    
    const boardRef = useRef<AlkkagiBoardHandle>(null);
    const animationFrameRef = useRef<number | null>(null);
    const powerGaugeAnimFrameRef = useRef<number | null>(null);
    const gaugeStartTimeRef = useRef<number | null>(null);
    const lastAnimationTimestampRef = useRef(0);
    
    const isDraggingRef = useRef(false);
    const selectedStoneRef = useRef<AlkkagiStone | null>(null);
    const dragStartPointRef = useRef<Point | null>(null);
    const powerRef = useRef(0);
    
    const [selectedStoneId, setSelectedStoneId] = useState<number | null>(null);
    const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);
    const [dragEndPoint, setDragEndPoint] = useState<Point | null>(null);
    const [power, setPower] = useState(0);
    const [flickPower, setFlickPower] = useState<number | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    const latestProps = useRef(props);
    useEffect(() => {
        latestProps.current = props;
    });
    
    const prevTurnStartTime = usePrevious(session.turnStartTime);
    const prevGameStatus = usePrevious(session.gameStatus);

    const stopPowerGauge = useCallback(() => {
        if (powerGaugeAnimFrameRef.current) {
            cancelAnimationFrame(powerGaugeAnimFrameRef.current);
            powerGaugeAnimFrameRef.current = null;
        }
        gaugeStartTimeRef.current = null;
    }, []);
    
    const cancelFlick = useCallback(() => {
        isDraggingRef.current = false;
        selectedStoneRef.current = null;
        dragStartPointRef.current = null;
        stopPowerGauge();
        setSelectedStoneId(null);
        setDragStartPoint(null);
        setDragEndPoint(null);
        setPower(0);
        powerRef.current = 0;
    }, [stopPowerGauge]);

    useEffect(() => {
        if (session.turnStartTime !== prevTurnStartTime) {
            cancelFlick();
        }
    }, [session.turnStartTime, prevTurnStartTime, cancelFlick]);
    
     useEffect(() => {
        if (prevGameStatus === 'alkkagi_animating' && session.gameStatus !== 'alkkagi_animating') {
            setFlickPower(null);
        }
    }, [session.gameStatus, prevGameStatus]);

    useEffect(() => {
        const checkIsMobile = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    const myPlayerEnum = useMemo(() => (
        session.blackPlayerId === currentUser.id ? Player.Black : (session.whitePlayerId === currentUser.id ? Player.White : Player.None)
    ), [session.blackPlayerId, session.whitePlayerId, currentUser.id]);
    
    const isMyTurn = useMemo(() => {
        if (isSpectator) return false;
        if (gameStatus === 'alkkagi_simultaneous_placement') return true;
        return currentPlayer === myPlayerEnum;
    }, [gameStatus, currentPlayer, myPlayerEnum, isSpectator]);
    
    const shouldRotate = myPlayerEnum === Player.White;

    const stonesForBoard = useMemo(() => {
        if (gameStatus === 'alkkagi_simultaneous_placement' || gameStatus === 'alkkagi_placement') {
             const myStonesInPlacement = currentUser.id === player1.id ? alkkagiStones_p1 : alkkagiStones_p2;
             return [...(alkkagiStones || []), ...(myStonesInPlacement || [])];
        }
        return alkkagiStones || [];
    }, [gameStatus, alkkagiStones, alkkagiStones_p1, alkkagiStones_p2, currentUser.id, player1.id]);

    const myStonesCount = useMemo(() => {
        const stonesInMainArray = (session.alkkagiStones || []).filter(s => s.player === myPlayerEnum).length;
        if (session.gameStatus === 'alkkagi_simultaneous_placement' || session.gameStatus === 'alkkagi_placement') {
            const stonesInTempArray = (currentUser.id === session.player1.id ? session.alkkagiStones_p1 : session.alkkagiStones_p2)?.length || 0;
            return stonesInMainArray + stonesInTempArray;
        }
        return stonesInMainArray;
    }, [session, currentUser.id, myPlayerEnum]);


    const handlePlacementClick = useCallback((svgPoint: Point) => {
        const { session: currentSession, onAction: currentOnAction } = latestProps.current;
        currentOnAction({ type: 'ALKKAGI_PLACE_STONE', payload: { gameId: currentSession.id, point: svgPoint } });
    }, []);
    
    const startPowerGauge = useCallback(() => {
        stopPowerGauge();
        setFlickPower(null);
        gaugeStartTimeRef.current = performance.now();
    
        const animateGauge = (timestamp: number) => {
            if (!gaugeStartTimeRef.current) {
                gaugeStartTimeRef.current = timestamp;
            }
    
            const { session: currentSession, currentUser: user } = latestProps.current;
            const myActiveItems = currentSession.activeAlkkagiItems?.[user.id] || [];
            const isSlowActive = myActiveItems.includes('slow');
            
            const baseCycleDuration = currentSession.settings.alkkagiGaugeSpeed || 900;
            const cycleDuration = isSlowActive ? baseCycleDuration * 2 : baseCycleDuration;
            const halfCycle = cycleDuration / 2;
    
            const elapsedTime = timestamp - gaugeStartTimeRef.current;
            const progressInCycle = (elapsedTime % cycleDuration) / halfCycle;
    
            let newPower;
            if (progressInCycle <= 1) {
                newPower = progressInCycle * 100;
            } else {
                newPower = (2 - progressInCycle) * 100;
            }
    
            setPower(newPower);
            powerRef.current = newPower;
            powerGaugeAnimFrameRef.current = requestAnimationFrame(animateGauge);
        };
    
        powerGaugeAnimFrameRef.current = requestAnimationFrame(animateGauge);
    }, [stopPowerGauge]);
    
    const runClientAnimation = useCallback((stones: AlkkagiStone[], flickedStoneId: number, vx: number, vy: number) => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

        let simStones: AlkkagiStone[] = JSON.parse(JSON.stringify(stones || []));
        let stoneToAnimate = simStones.find(s => s.id === flickedStoneId);
        if (stoneToAnimate) {
            stoneToAnimate.vx = vx;
            stoneToAnimate.vy = vy;
        } else { return; }

        const boardSizePx = 840;
        const friction = 0.98;
        let iterations = 0;
        const maxIterations = 1000;

        const animate = () => {
            let stonesAreMoving = false;
            
            for (const stone of simStones) {
                if (!stone.onBoard) continue;
                // Use fixed time step logic to match server simulation
                stone.x += stone.vx;
                stone.y += stone.vy;
                stone.vx *= friction;
                stone.vy *= friction;

                if (Math.abs(stone.vx) < 0.01) stone.vx = 0;
                if (Math.abs(stone.vy) < 0.01) stone.vy = 0;
                if (Math.abs(stone.vx) > 0 || Math.abs(stone.vy) > 0) stonesAreMoving = true;
                if (stone.x < 0 || stone.x > boardSizePx || stone.y < 0 || stone.y > boardSizePx) {
                    if (stone.onBoard) { 
                        stone.onBoard = false; 
                        stone.timeOffBoard = Date.now(); 
                        audioService.stoneFallOff(); 
                    }
                }
            }

            for (let i = 0; i < simStones.length; i++) {
                for (let j = i + 1; j < simStones.length; j++) {
                    const s1 = simStones[i]; const s2 = simStones[j];
                    if (!s1.onBoard || !s2.onBoard) continue;
                    const dx = s2.x - s1.x; const dy = s2.y - s1.y;
                    const distance = Math.hypot(dx,dy);
                    const radiiSum = s1.radius + s2.radius;
                    if (distance < radiiSum) {
                        audioService.stoneCollision();
                        const nx = dx / distance; const ny = dy / distance;
                        const dvx = s2.vx - s1.vx; const dvy = s2.vy - s1.vy;
                        const dot = dvx * nx + dvy * ny;
                        if (dot < 0) {
                            const impulse = dot;
                            s1.vx += impulse * nx; s1.vy += impulse * ny;
                            s2.vx -= impulse * nx; s2.vy -= impulse * ny;
                        }
                        const overlap = (radiiSum - distance) / 2;
                        s1.x -= overlap * nx; s1.y -= overlap * ny;
                        s2.x += overlap * nx; s2.y += overlap * ny;
                    }
                }
            }
            
            boardRef.current?.updateLocalStones(simStones);
            iterations++;
            if (stonesAreMoving && iterations < maxIterations) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                animationFrameRef.current = null;
            }
        };
        animationFrameRef.current = requestAnimationFrame(animate);
    }, []);


    const handleStoneInteractionStart = useCallback((stone: AlkkagiStone, e: React.MouseEvent<SVGGElement> | React.TouchEvent<SVGGElement>) => {
        e.preventDefault();
        const { session: currentSession, currentUser: user } = latestProps.current;
        const myPlayer = currentSession.blackPlayerId === user.id ? Player.Black : (currentSession.whitePlayerId === user.id ? Player.White : Player.None);
        const currentIsMyTurn = currentSession.currentPlayer === myPlayer;
        if (!currentIsMyTurn || currentSession.gameStatus !== 'alkkagi_playing') return;

        const point = 'touches' in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
        
        isDraggingRef.current = true;
        selectedStoneRef.current = stone;
        dragStartPointRef.current = point;
        
        setSelectedStoneId(stone.id);
        setDragStartPoint(point);
        setDragEndPoint(point);
        startPowerGauge();
    }, [startPowerGauge]);
    
    useEffect(() => {
        const handleInteractionMove = (e: MouseEvent | TouchEvent) => {
            if (!isDraggingRef.current) return;
            if ('preventDefault' in e) e.preventDefault();
            const point = 'touches' in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
            setDragEndPoint(point);
        };

        const handleInteractionEnd = (e: MouseEvent | TouchEvent) => {
            if (!isDraggingRef.current) return;
            
            const { session: currentSession, onAction: currentOnAction } = latestProps.current;

            const finalSelectedStone = selectedStoneRef.current;
            const finalDragStart = dragStartPointRef.current;
            const finalDragEnd = 'touches' in e ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY } : { x: e.clientX, y: e.clientY };

            stopPowerGauge();
            const finalPower = powerRef.current;
            setFlickPower(finalPower);
            
            if (finalSelectedStone && finalDragStart && finalDragEnd) {
                const svg = boardRef.current?.getSvg();
                if (!svg) {
                    console.error("SVG element not found for coordinate conversion.");
                    cancelFlick();
                    return;
                }

                const ctm = svg.getScreenCTM()?.inverse();
                if (!ctm) {
                    console.error("Could not get CTM for coordinate conversion.");
                    cancelFlick();
                    return;
                }
                
                const pt = svg.createSVGPoint();

                pt.x = finalDragStart.x;
                pt.y = finalDragStart.y;
                const svgDragStart = pt.matrixTransform(ctm);

                pt.x = finalDragEnd.x;
                pt.y = finalDragEnd.y;
                const svgDragEnd = pt.matrixTransform(ctm);

                const dx = svgDragEnd.x - svgDragStart.x;
                const dy = svgDragEnd.y - svgDragStart.y;
                
                const velocityX = -dx;
                const velocityY = -dy;

                const launchStrength = finalPower / 100 * 25;
                const mag = Math.hypot(velocityX, velocityY);
                
                if (mag > 0) {
                    const vx = (velocityX / mag) * launchStrength;
                    const vy = (velocityY / mag) * launchStrength;
                    currentOnAction({ type: 'ALKKAGI_FLICK_STONE', payload: { gameId: currentSession.id, stoneId: finalSelectedStone.id, vx, vy } });
                }
            }
            
            isDraggingRef.current = false;
            selectedStoneRef.current = null;
            dragStartPointRef.current = null;
            setSelectedStoneId(null);
            setDragStartPoint(null);
            setDragEndPoint(null);
            setPower(0);
            powerRef.current = 0;
            setTimeout(() => setFlickPower(null), 1500);
        };

        const handleContextMenu = (e: MouseEvent) => {
            if (isDraggingRef.current) {
                e.preventDefault();
                cancelFlick();
            }
        };
        
        window.addEventListener('mousemove', handleInteractionMove, { passive: false });
        window.addEventListener('touchmove', handleInteractionMove, { passive: false });
        window.addEventListener('mouseup', handleInteractionEnd);
        window.addEventListener('touchend', handleInteractionEnd);
        window.addEventListener('contextmenu', handleContextMenu);
        
        return () => {
            window.removeEventListener('mousemove', handleInteractionMove);
            window.removeEventListener('touchmove', handleInteractionMove);
            window.removeEventListener('mouseup', handleInteractionEnd);
            window.removeEventListener('touchend', handleInteractionEnd);
            window.removeEventListener('contextmenu', handleContextMenu);
            stopPowerGauge();
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [stopPowerGauge, cancelFlick]);

    useEffect(() => {
        const { session: currentSession } = latestProps.current;
        const animation = currentSession.animation;
        if (animation?.type === 'alkkagi_flick' && animation.startTime > lastAnimationTimestampRef.current) {
            lastAnimationTimestampRef.current = animation.startTime;
            const { stoneId, vx, vy } = animation;
            runClientAnimation(currentSession.alkkagiStones || [], stoneId, vx, vy);
        }
    }, [session.animation, runClientAnimation]);
    
    const displayedPower = flickPower !== null ? flickPower : power;
    const maxStones = session.settings.alkkagiStoneCount || 5;

    const selectedStoneForRender = useMemo(() => {
        if (!selectedStoneId) return null;
        return alkkagiStones?.find(s => s.id === selectedStoneId) || null;
    }, [selectedStoneId, alkkagiStones]);

    return (
        <div className="relative w-full h-full flex items-center justify-center px-4 sm:px-6 lg:px-0">
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 max-w-md z-10 pointer-events-none">
                {(dragStartPoint || flickPower !== null) && (
                    <div className={`bg-gray-900/50 rounded-full h-6 border-2 border-gray-500 ${flickPower !== null ? 'animate-flick-power-pulse' : ''}`}>
                        <div 
                            className="bg-gradient-to-r from-yellow-400 to-red-500 h-full rounded-full" 
                            style={{ width: `${displayedPower}%` }}
                        />
                        <span className="absolute inset-0 w-full h-full flex items-center justify-center text-white font-bold text-sm drop-shadow-md">
                            POWER
                        </span>
                    </div>
                )}
            </div>

            <div className={`w-full h-full transition-transform duration-500 ${shouldRotate ? 'rotate-180' : ''}`}>
                <AlkkagiBoard
                    ref={boardRef}
                    stones={stonesForBoard}
                    gameStatus={gameStatus}
                    myPlayer={myPlayerEnum}
                    isMyTurn={isMyTurn}
                    settings={settings}
                    onPlacementClick={handlePlacementClick}
                    onStoneInteractionStart={handleStoneInteractionStart}
                    isSpectator={isSpectator}
                    dragStartPoint={dragStartPoint}
                    dragEndPoint={dragEndPoint}
                    selectedStone={selectedStoneForRender}
                    myStonesCount={myStonesCount}
                    maxStones={maxStones}
                    session={session}
                    currentUser={currentUser}
                />
            </div>
        </div>
    );
};

export default AlkkagiArena;