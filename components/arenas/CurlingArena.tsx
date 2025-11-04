
import React, { forwardRef, useImperativeHandle, useState, useEffect, useRef, useMemo, ReactNode, useCallback } from 'react';
import { AlkkagiStone, GameStatus, Player, Point, LiveGameSession, UserWithStatus, GameProps } from '../../types.js';
import CurlingBoard, { CurlingBoardHandle } from '../CurlingBoard.js';
import { CURLING_TURN_TIME_LIMIT } from '../../constants';
import { audioService } from '../../services/audioService.js';

interface CurlingArenaProps extends GameProps {}

function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T | undefined>(undefined);
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current;
}

const CurlingArena = forwardRef<CurlingBoardHandle, CurlingArenaProps>((props, ref) => {
    const { session, onAction, currentUser, isSpectator } = props;
    const { id: gameId, settings, gameStatus, curlingStones, currentPlayer, activeCurlingItems } = session;

    const boardRef = useRef<CurlingBoardHandle>(null);
    const animationFrameRef = useRef<number | null>(null);
    const powerGaugeAnimFrameRef = useRef<number | null>(null);
    const gaugeStartTimeRef = useRef<number | null>(null);
    const powerGaugeRef = useRef<HTMLDivElement>(null);
    const lastAnimationTimestampRef = useRef(0);
    const powerRef = useRef(0);

    const isDraggingRef = useRef(false);
    const selectedStoneRef = useRef<AlkkagiStone | null>(null);
    const dragStartPointRef = useRef<Point | null>(null);
    
    const [simStones, setSimStones] = useState<AlkkagiStone[] | null>(null);
    const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);
    const [dragEndPoint, setDragEndPoint] = useState<Point | null>(null);
    const [power, setPower] = useState(0);
    const [flickPower, setFlickPower] = useState<number | null>(null);
    const [isRenderingPreviewStone, setIsRenderingPreviewStone] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    const latestProps = useRef(props);
    useEffect(() => {
        latestProps.current = props;
    });

    const myPlayerEnum = useMemo(() => (
        session.blackPlayerId === currentUser.id ? Player.Black : (session.whitePlayerId === currentUser.id ? Player.White : Player.None)
    ), [session.blackPlayerId, session.whitePlayerId, currentUser.id]);
    
    const isMyTurn = useMemo(() => {
        if (isSpectator) return false;
        return currentPlayer === myPlayerEnum;
    }, [currentPlayer, myPlayerEnum, isSpectator]);

    const shouldRotate = myPlayerEnum === Player.White;
    
    const prevGameStatus = usePrevious(session.gameStatus);
    const prevTurnStartTime = usePrevious(session.turnStartTime);

    useEffect(() => {
        if (session.turnStartTime !== prevTurnStartTime) {
            setFlickPower(null);
        }
    }, [session.turnStartTime, prevTurnStartTime]);

    useEffect(() => {
        if (prevGameStatus === 'curling_animating' && session.gameStatus !== 'curling_animating') {
            setSimStones(null);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        }
    }, [session.gameStatus, prevGameStatus]);

    useEffect(() => {
        const checkIsMobile = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);
    
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
        setDragStartPoint(null);
        setDragEndPoint(null);
        setPower(0);
        setFlickPower(null);
        setIsRenderingPreviewStone(false);
        powerRef.current = 0;
    }, [stopPowerGauge]);

    const startPowerGauge = useCallback(() => {
        stopPowerGauge();
        setFlickPower(null);
        gaugeStartTimeRef.current = performance.now();
    
        const animateGauge = (timestamp: number) => {
            if (!gaugeStartTimeRef.current) {
                gaugeStartTimeRef.current = timestamp;
            }
    
            const { session: currentSession, currentUser: user } = latestProps.current;
            const myActiveItems = currentSession.activeCurlingItems?.[user.id] || [];
            const isSlowActive = myActiveItems.includes('slow');
            
            const baseCycleDuration = currentSession.settings.curlingGaugeSpeed || 700;
            const cycleDuration = (isSlowActive ? baseCycleDuration * 2 : baseCycleDuration);
            const halfCycle = cycleDuration / 2;
    
            const elapsedTime = timestamp - gaugeStartTimeRef.current;
            const progressInCycle = (elapsedTime % cycleDuration) / halfCycle;
    
            let newPower;
            if (progressInCycle <= 1) {
                newPower = progressInCycle * 100;
            } else {
                newPower = (2 - progressInCycle) * 100;
            }
    
            if (powerGaugeRef.current) {
                powerGaugeRef.current.style.width = `${newPower}%`;
            }
            powerRef.current = newPower;
            powerGaugeAnimFrameRef.current = requestAnimationFrame(animateGauge);
        };
    
        powerGaugeAnimFrameRef.current = requestAnimationFrame(animateGauge);
    }, [stopPowerGauge]);
    
    const runClientAnimation = useCallback((initialStones: AlkkagiStone[], stoneToLaunch: AlkkagiStone, velocity: Point) => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

        let simStones: AlkkagiStone[] = JSON.parse(JSON.stringify(initialStones || []));
        let stoneToAnimate = { ...stoneToLaunch, vx: velocity.x, vy: velocity.y, onBoard: true };
        simStones.push(stoneToAnimate);
        setSimStones(simStones);

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
                if (Math.abs(stone.vx) > 0 || Math.abs(stone.vy) > 0) {
                    stonesAreMoving = true;
                }

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
                            s1.vx += impulse * nx;
                            s1.vy += impulse * ny;
                            s2.vx -= impulse * nx;
                            s2.vy -= impulse * ny;
                        }
                        const overlap = (radiiSum - distance) / 2;
                        s1.x -= overlap * nx;
                        s1.y -= overlap * ny;
                        s2.x += overlap * nx;
                        s2.y += overlap * ny;
                    }
                }
            }
            
            setSimStones([...simStones]);
            
            iterations++;
            if (stonesAreMoving && iterations < maxIterations) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                animationFrameRef.current = null;
                // Animation finished client-side, wait for server confirmation to clear simStones
            }
        };
        animationFrameRef.current = requestAnimationFrame(animate);
    }, []);
    
    const handleLaunchAreaInteractionStart = useCallback((e: React.MouseEvent | React.TouchEvent, area: { x: number; y: number; player: Player; }) => {
        const { session: currentSession, currentUser: user } = latestProps.current;
        const myPlayer = currentSession.blackPlayerId === user.id ? Player.Black : (currentSession.whitePlayerId === user.id ? Player.White : Player.None);
        const currentIsMyTurn = currentSession.currentPlayer === myPlayer;
        if (!currentIsMyTurn || currentSession.gameStatus !== 'curling_playing') return;

        isDraggingRef.current = true;
        const stoneRadius = (840 / 19) * 0.47;
        const newStone: AlkkagiStone = {
            id: Date.now(),
            player: myPlayer,
            x: area.x + stoneRadius,
            y: area.y + stoneRadius,
            vx: 0, vy: 0,
            radius: stoneRadius,
            onBoard: false 
        };
        selectedStoneRef.current = newStone;

        const point = 'touches' in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
        dragStartPointRef.current = point;

        setDragStartPoint(point);
        setDragEndPoint(point);
        setIsRenderingPreviewStone(true);
        startPowerGauge();
    }, [startPowerGauge]);
    
    useEffect(() => {
        const handleInteractionMove = (e: MouseEvent | TouchEvent) => {
            if (!isDraggingRef.current) return;
            if ('touches' in e) e.preventDefault();
            const point = 'touches' in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
            setDragEndPoint(point);
        };

        const handleInteractionEnd = () => {
            if (!isDraggingRef.current) return;
    
            const { session: currentSession, onAction: currentOnAction } = latestProps.current;

            const finalSelectedStone = selectedStoneRef.current;
            const finalDragStart = dragStartPointRef.current;
            
            stopPowerGauge();
            const finalPower = powerRef.current;
            setFlickPower(finalPower);

            setDragEndPoint(currentDragEnd => {
                if (finalSelectedStone && finalDragStart && currentDragEnd) {
                    const svg = boardRef.current?.getSvg();
                    if (!svg) {
                        console.error("SVG element not found for coordinate conversion.");
                        cancelFlick();
                        return null;
                    }
    
                    const ctm = svg.getScreenCTM()?.inverse();
                    if (!ctm) {
                        console.error("Could not get CTM for coordinate conversion.");
                        cancelFlick();
                        return null;
                    }
                    
                    const pt = svg.createSVGPoint();
    
                    pt.x = finalDragStart.x;
                    pt.y = finalDragStart.y;
                    const svgDragStart = pt.matrixTransform(ctm);
    
                    pt.x = currentDragEnd.x;
                    pt.y = currentDragEnd.y;
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
                        currentOnAction({ type: 'CURLING_FLICK_STONE', payload: { gameId: currentSession.id, launchPosition: { x: finalSelectedStone.x, y: finalSelectedStone.y }, velocity: { x: vx, y: vy } } });
                    }
                }
    
                // Reset
                isDraggingRef.current = false;
                selectedStoneRef.current = null;
                dragStartPointRef.current = null;
                setDragStartPoint(null);
                setIsRenderingPreviewStone(false);
                return null; // Reset drag end point state
            });
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
        
        window.addEventListener('mousemove', handleInteractionMove);
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
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [stopPowerGauge, cancelFlick]);

    useEffect(() => {
        const { session: currentSession } = latestProps.current;
        const animation = currentSession.animation;
        if (animation?.type === 'curling_flick' && animation.startTime > lastAnimationTimestampRef.current) {
            lastAnimationTimestampRef.current = animation.startTime;
            const { stone, velocity } = animation;
            runClientAnimation(currentSession.curlingStones || [], stone, velocity);
        }
    }, [session.animation, runClientAnimation]);

    const displayedPower = flickPower !== null ? flickPower : power;

    return (
        <div className="relative w-full h-full flex items-center justify-center px-4 sm:px-6 lg:px-0">
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 max-w-md z-10 pointer-events-none">
                {(dragStartPoint || flickPower !== null) && (
                    <div className={`bg-gray-900/50 rounded-full h-6 border-2 border-gray-500 ${flickPower !== null ? 'animate-flick-power-pulse' : ''}`}>
                        <div 
                            ref={powerGaugeRef}
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
                <CurlingBoard
                    ref={boardRef}
                    stones={simStones ?? curlingStones ?? []}
                    gameStatus={gameStatus}
                    myPlayer={myPlayerEnum}
                    currentPlayer={currentPlayer}
                    onLaunchAreaInteractionStart={handleLaunchAreaInteractionStart}
                    isSpectator={isSpectator}
                    dragStartPoint={dragStartPoint}
                    dragEndPoint={dragEndPoint}
                    selectedStone={isRenderingPreviewStone ? selectedStoneRef.current : null}
                    activeCurlingItems={session.activeCurlingItems}
                    currentUser={currentUser}
                    session={session}
                />
            </div>
        </div>
    );
});

export default CurlingArena;
