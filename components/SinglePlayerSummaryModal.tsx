import React, { useEffect, useMemo, useState } from 'react';
import { LiveGameSession, UserWithStatus, ServerAction, Player } from '../types.js';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import Avatar from './Avatar.js';
import { SINGLE_PLAYER_STAGES, AVATAR_POOL, BORDER_POOL } from '../constants';

interface SinglePlayerSummaryModalProps {
    session: LiveGameSession;
    currentUser: UserWithStatus;
    onAction: (action: ServerAction) => void;
    onClose: () => void;
}

const handleClose = (session: LiveGameSession, onClose: () => void) => {
    // 게임이 종료된 상태이고, 싱글플레이 게임인 경우 싱글플레이 로비로 리다이렉트
    if (session.gameStatus === 'ended' && session.isSinglePlayer) {
        sessionStorage.setItem('postGameRedirect', '#/singleplayer');
    }
    onClose();
};

const RewardItemDisplay: React.FC<{ item: any; isMobile: boolean }> = ({ item, isMobile }) => (
    <div
        className="flex flex-col items-center justify-center text-center p-1 bg-gray-900/50 rounded-md"
        title={item.name}
    >
        <img
            src={item.image}
            alt={item.name}
            className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} object-contain`}
        />
        <span className="text-xs mt-1 text-gray-300 truncate w-full">
            {item.name}
            {item.quantity > 1 ? ` x${item.quantity}` : ''}
        </span>
    </div>
);

const getXpRequirementForLevel = (level: number): number => {
    if (level < 1) return 0;
    if (level > 100) return Infinity; // Max level
    
    // 레벨 1~10: 200 + (레벨 x 100)
    if (level <= 10) {
        return 200 + (level * 100);
    }
    
    // 레벨 11~20: 300 + (레벨 x 150)
    if (level <= 20) {
        return 300 + (level * 150);
    }
    
    // 레벨 21~50: 이전 필요경험치 x 1.2
    // 레벨 51~100: 이전 필요경험치 x 1.3
    // 레벨 20의 필요 경험치를 먼저 계산
    let xp = 300 + (20 * 150); // 레벨 20의 필요 경험치
    
    // 레벨 21부터 현재 레벨까지 반복
    for (let l = 21; l <= level; l++) {
        if (l <= 50) {
            xp = Math.round(xp * 1.2);
        } else {
            xp = Math.round(xp * 1.3);
        }
    }
    
    return xp;
};

const SinglePlayerSummaryModal: React.FC<SinglePlayerSummaryModalProps> = ({ session, currentUser, onAction, onClose }) => {
    const [viewportWidth, setViewportWidth] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleResize = () => setViewportWidth(window.innerWidth);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const effectiveViewportWidth = viewportWidth ?? 1024;
    const isMobileView = effectiveViewportWidth <= 768;
    const initialWidth = isMobileView ? Math.max(Math.min(effectiveViewportWidth - 32, 420), 320) : 500;
    const isWinner = session.winner === Player.Black; // Human is always Black
    const summary = session.summary?.[currentUser.id];

    const currentStageIndex = SINGLE_PLAYER_STAGES.findIndex(s => s.id === session.stageId);
    const currentStage = SINGLE_PLAYER_STAGES.find(s => s.id === session.stageId);
    const nextStage = SINGLE_PLAYER_STAGES[currentStageIndex + 1];
    const highestClearedStageIndex = currentUser.singlePlayerProgress ?? -1;
    const canTryNext = isWinner && !!nextStage && highestClearedStageIndex >= currentStageIndex;
    
    const retryActionPointCost = currentStage?.actionPointCost ?? 0;
    const nextStageActionPointCost = nextStage?.actionPointCost ?? 0;

    const failureReason = useMemo(() => {
        if (isWinner) return null;
        switch (session.winReason) {
            case 'timeout':
                if (currentStage?.blackTurnLimit) {
                    return '제한 턴이 부족하여 미션에 실패했습니다.';
                }
                return '제한시간이 초과되어 미션에 실패했습니다.';
            case 'capture_limit':
                return currentStage?.survivalTurns
                    ? '백이 정해진 턴을 모두 버텨 미션에 실패했습니다.'
                    : '상대가 목표 점수를 먼저 달성했습니다.';
            case 'score':
                return '계가 결과 상대가 더 많은 집을 차지했습니다.';
            case 'resign':
                return '기권하여 미션이 종료되었습니다.';
            case 'disconnect':
                return '연결이 끊어져 미션이 실패 처리되었습니다.';
            case 'total_score':
                return '총 점수 합계에서 상대에게 밀렸습니다.';
            case 'dice_win':
                return '주사위 점수에서 뒤처졌습니다.';
            case 'foul_limit':
                return '반칙 한도를 초과했습니다.';
            case 'thief_captured':
                return '도둑 돌이 모두 잡혔습니다.';
            case 'police_win':
                return '경찰이 더 많은 점수를 획득했습니다.';
            case 'omok_win':
                return '상대가 먼저 다섯 줄을 완성했습니다.';
            case 'alkkagi_win':
                return '알까기 승부에서 뒤졌습니다.';
            case 'curling_win':
                return '컬링 총점에서 상대에게 뒤졌습니다.';
            default:
                return null;
        }
    }, [isWinner, session.winReason, currentStage]);

    const handleRetry = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            // onAction이 완료될 때까지 기다림 (gameId 반환 가능)
            const result = await onAction({ type: 'START_SINGLE_PLAYER_GAME', payload: { stageId: session.stageId! } });
            const gameId = (result as any)?.gameId;
            
            if (gameId) {
                // gameId를 받았으면 즉시 라우팅 업데이트
                const targetHash = `#/game/${gameId}`;
                if (window.location.hash !== targetHash) {
                    window.location.hash = targetHash;
                }
                // 라우팅 업데이트 후 모달 닫기
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                // gameId가 없으면 WebSocket 업데이트를 기다림
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            onClose();
        } catch (error) {
            console.error('[SinglePlayerSummaryModal] Failed to retry stage:', error);
            setIsProcessing(false);
        }
    };

    const handleNextStage = async () => {
        if (!canTryNext || !nextStage || isProcessing) return;
        setIsProcessing(true);
        try {
            // onAction이 완료될 때까지 기다림 (gameId 반환 가능)
            const result = await onAction({ type: 'START_SINGLE_PLAYER_GAME', payload: { stageId: nextStage.id } });
            const gameId = (result as any)?.gameId;
            
            if (gameId) {
                // gameId를 받았으면 즉시 라우팅 업데이트
                const targetHash = `#/game/${gameId}`;
                if (window.location.hash !== targetHash) {
                    window.location.hash = targetHash;
                }
                // 라우팅 업데이트 후 모달 닫기
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                // gameId가 없으면 WebSocket 업데이트를 기다림
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            onClose();
        } catch (error) {
            console.error('[SinglePlayerSummaryModal] Failed to start next stage:', error);
            setIsProcessing(false);
        }
    };

    const handleExitToLobby = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        sessionStorage.setItem('postGameRedirect', '#/singleplayer');
        try {
            // onAction이 완료될 때까지 기다림 (Promise 반환)
            await onAction({ type: 'LEAVE_AI_GAME', payload: { gameId: session.id } });
            // 상태 업데이트를 위한 짧은 지연 (WebSocket 업데이트 대기)
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            console.error('[SinglePlayerSummaryModal] Failed to leave AI game:', error);
            setIsProcessing(false);
        } finally {
            onClose();
            setTimeout(() => {
                window.location.hash = '#/singleplayer';
            }, 100);
        }
    };

    const avatarUrl = useMemo(() => AVATAR_POOL.find(a => a.id === currentUser.avatarId)?.url, [currentUser.avatarId]);
    const borderUrl = useMemo(() => BORDER_POOL.find(b => b.id === currentUser.borderId)?.url, [currentUser.borderId]);
    const xpRequirement = getXpRequirementForLevel(Math.max(1, currentUser.strategyLevel));
    const clampedXp = Math.min(currentUser.strategyXp, xpRequirement);
    const xpPercent = Math.min(100, (clampedXp / (xpRequirement || 1)) * 100);
    const xpChange = summary?.xp?.change ?? 0;

    return (
        <DraggableWindow 
            title={isWinner ? "미션 클리어" : "미션 실패"} 
            onClose={() => handleClose(session, onClose)} 
            windowId="sp-summary-redesigned"
            initialWidth={initialWidth}
        >
            <div
                className={`relative text-center ${isMobileView ? 'p-3' : 'p-4'} rounded-lg ${
                    isWinner ? 'bg-gradient-to-br from-blue-900/50 to-gray-900' : 'bg-gradient-to-br from-red-900/50 to-gray-900'
                } ${isMobileView ? 'overflow-y-auto' : 'overflow-hidden'}`}
                style={{ maxHeight: isMobileView ? '75vh' : undefined }}
            >
                {isWinner && (
                    <div className="absolute -top-1/2 -left-1/4 w-full h-full bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
                )}
                <h1
                    className={`${isMobileView ? 'text-3xl' : 'text-5xl'} font-black ${
                        isWinner ? (isMobileView ? 'mb-4' : 'mb-6') : (isMobileView ? 'mb-3' : 'mb-4')
                    } tracking-widest ${isWinner ? 'text-yellow-300' : 'text-red-400'}`}
                    style={{ textShadow: isWinner ? '0 0 15px rgba(250, 204, 21, 0.5)' : '0 0 10px rgba(220, 38, 38, 0.5)' }}
                >
                    {isWinner ? 'MISSION CLEAR' : 'MISSION FAILED'}
                </h1>
                {!isWinner && failureReason && (
                    <p className="mb-4 text-sm text-red-200 font-medium">{failureReason}</p>
                )}

                <div
                    className={`flex items-center ${
                        isMobileView ? 'flex-col text-center gap-3' : 'gap-4 text-left'
                    } bg-black/40 backdrop-blur-sm border border-gray-700/60 rounded-2xl ${isMobileView ? 'p-3' : 'p-4'} mb-6`}
                >
                    <Avatar
                        userId={currentUser.id}
                        userName={currentUser.nickname}
                        avatarUrl={avatarUrl}
                        borderUrl={borderUrl}
                        size={isMobileView ? 64 : 80}
                        className={isMobileView ? '' : 'flex-shrink-0'}
                    />
                    <div className="flex-1 w-full">
                        <div className={`flex ${isMobileView ? 'flex-col items-center gap-1' : 'items-center justify-between flex-wrap gap-2'} mb-2`}>
                            <div className="text-lg font-bold text-white truncate max-w-full">{currentUser.nickname}</div>
                            <div className="text-sm font-semibold text-primary-200 bg-primary/20 px-3 py-1 rounded-full border border-primary/40">
                                전략 Lv.{currentUser.strategyLevel}
                            </div>
                        </div>
                        <div className="w-full bg-gray-800/70 border border-gray-700/70 rounded-full h-4 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 transition-all duration-700 ease-out"
                                style={{ width: `${xpPercent}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-300 mt-2">
                            <span className="font-mono">
                                {clampedXp.toLocaleString()} {xpChange >= 0 ? `+${xpChange.toLocaleString()}` : xpChange.toLocaleString()} / {xpRequirement.toLocaleString()} XP
                            </span>
                            <span className={`font-semibold ${xpChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {xpChange >= 0 ? `+${xpChange.toLocaleString()}` : xpChange.toLocaleString()} XP
                            </span>
                        </div>
                    </div>
                </div>

                {summary && (
                    <div className={`bg-black/30 backdrop-blur-sm ${isMobileView ? 'p-3' : 'p-4'} rounded-lg my-4 space-y-3 border border-gray-700/50`}>
                        <div className="flex justify-center items-center gap-6 text-lg">
                            {summary.xp && summary.xp.change > 0 && 
                                <div>
                                    <p className="text-sm text-gray-400">전략 경험치</p>
                                    <p className="font-bold text-green-400 sparkle-animation">+{summary.xp.change} XP</p>
                                </div>
                            }
                            {summary.gold && summary.gold > 0 &&
                                <div className="flex items-center gap-2">
                                    <img src="/images/icon/Gold.png" alt="골드" className="w-8 h-8" />
                                    <span className="font-bold text-yellow-400 sparkle-animation">+{summary.gold.toLocaleString()}</span>
                                </div>
                            }
                        </div>

                        {summary.items && summary.items.length > 0 && (
                            <div className="pt-3 border-t border-gray-700/50">
                                <h3 className="text-sm text-gray-400 mb-2">획득 보상</h3>
                                <div className={`grid ${isMobileView ? 'grid-cols-4 gap-2' : 'grid-cols-5 gap-2'} justify-items-center`}>
                                    {summary.items.map(item => (
                                        <RewardItemDisplay key={item.id} item={item} isMobile={isMobileView} />
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {!isWinner && (!summary || (summary.gold === 0 && summary.xp?.change === 0 && summary.items?.length === 0)) && (
                            <p className="text-gray-500">획득한 보상이 없습니다.</p>
                        )}
                    </div>
                )}
                
                <div className={`mt-6 grid ${isMobileView ? 'grid-cols-2 gap-2.5' : 'grid-cols-2 gap-3.5'}`}>
                    <Button
                        onClick={handleNextStage}
                        colorScheme="none"
                        style={{ fontSize: isMobileView ? 'clamp(0.68rem,2vw,0.8rem)' : 'clamp(0.82rem,1.5vw,0.95rem)' }}
                        className={`group relative w-full flex flex-col items-center justify-center rounded-xl border-2 backdrop-blur-sm font-semibold leading-tight tracking-wide whitespace-normal break-keep transition-all duration-200 ${isMobileView ? 'px-2 py-1.5 gap-0.5' : 'px-3.5 py-2.5 gap-1'} ${canTryNext && !isProcessing ? 'border-indigo-300/60 bg-gradient-to-br from-indigo-600/85 via-sky-500/80 to-cyan-400/80 text-white shadow-[0_18px_34px_-20px_rgba(59,130,246,0.6)] hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-18px_rgba(56,189,248,0.55)]' : 'border-slate-500/60 bg-slate-800/70 text-slate-300 opacity-70 cursor-not-allowed'}`}
                        disabled={!canTryNext || isProcessing}
                    >
                        <span className="uppercase tracking-[0.12em] text-[0.88em] text-white drop-shadow-sm">다음 단계</span>
                        {nextStage && (
                            <span className="text-[0.74em] font-medium text-sky-50/95 flex items-center gap-1 drop-shadow">
                                {nextStage.name.replace('스테이지 ', '')}
                                {nextStageActionPointCost > 0 && (
                                    <span className="flex items-center gap-0.5 bg-sky-900/60 px-1.5 py-0.5 rounded-full border border-sky-400/50 shadow-inner text-[0.75em] font-semibold text-sky-100">
                                        ⚡
                                        <span>{nextStageActionPointCost}</span>
                                    </span>
                                )}
                            </span>
                        )}
                    </Button>
                    <Button
                        onClick={handleRetry}
                        colorScheme="none"
                        style={{ fontSize: isMobileView ? 'clamp(0.68rem,2vw,0.8rem)' : 'clamp(0.82rem,1.5vw,0.95rem)' }}
                        className={`group relative w-full flex flex-col items-center justify-center rounded-xl border-2 backdrop-blur-sm font-semibold leading-tight tracking-wide whitespace-normal break-keep transition-all duration-200 ${isMobileView ? 'px-2 py-1.5 gap-0.5' : 'px-3.5 py-2.5 gap-1'} ${!isProcessing ? 'border-amber-300/70 bg-gradient-to-br from-amber-400/85 via-yellow-400/75 to-orange-400/80 text-slate-900 shadow-[0_18px_34px_-18px_rgba(251,191,36,0.45)] hover:-translate-y-0.5 hover:shadow-[0_22px_42px_-18px_rgba(251,191,36,0.55)]' : 'border-slate-500/60 bg-slate-800/70 text-slate-300 opacity-70 cursor-not-allowed'}`}
                        disabled={isProcessing}
                    >
                        <span className="uppercase tracking-[0.12em] text-[0.88em] text-slate-900">재도전</span>
                        {retryActionPointCost > 0 && (
                            <span className="text-[0.74em] font-semibold text-amber-900 flex items-center gap-0.5 bg-amber-200/80 px-1.5 py-0.5 rounded-full border border-amber-400/70 shadow-inner">
                                ⚡
                                {retryActionPointCost}
                            </span>
                        )}
                    </Button>
                    <Button
                        onClick={handleExitToLobby}
                        colorScheme="none"
                        style={{ fontSize: isMobileView ? 'clamp(0.68rem,2vw,0.8rem)' : 'clamp(0.82rem,1.5vw,0.95rem)' }}
                        className={`group relative w-full flex flex-col items-center justify-center rounded-xl border-2 backdrop-blur-sm font-semibold leading-tight tracking-wide whitespace-normal break-keep transition-all duration-200 ${isMobileView ? 'px-2 py-1.5 gap-0.5' : 'px-3.5 py-2.5 gap-1'} ${!isProcessing ? 'border-slate-500/60 bg-gradient-to-br from-slate-700/80 via-slate-800/80 to-slate-900/85 text-slate-100 shadow-[0_18px_32px_-20px_rgba(148,163,184,0.45)] hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-20px_rgba(203,213,225,0.5)]' : 'border-slate-500/60 bg-slate-800/70 text-slate-300 opacity-70 cursor-not-allowed'}`}
                        disabled={isProcessing}
                    >
                        <span className="uppercase tracking-[0.12em] text-[0.88em]">나가기</span>
                        <span className="text-[0.74em] font-medium opacity-70">싱글플레이 로비</span>
                    </Button>
                    <Button
                        onClick={() => handleClose(session, onClose)}
                        colorScheme="none"
                        style={{ fontSize: isMobileView ? 'clamp(0.68rem,2vw,0.8rem)' : 'clamp(0.82rem,1.5vw,0.95rem)' }}
                        className={`group relative w-full flex flex-col items-center justify-center rounded-xl border-2 backdrop-blur-sm font-semibold leading-tight tracking-wide whitespace-normal break-keep transition-all duration-200 ${isMobileView ? 'px-2 py-1.5 gap-0.5' : 'px-3.5 py-2.5 gap-1'} border-emerald-300/70 bg-gradient-to-br from-emerald-500/85 via-lime-500/75 to-green-500/80 text-slate-900 shadow-[0_18px_34px_-18px_rgba(16,185,129,0.45)] hover:-translate-y-0.5 hover:shadow-[0_22px_42px_-18px_rgba(74,222,128,0.55)]`}
                    >
                        <span className="uppercase tracking-[0.12em] text-[0.88em]">확인</span>
                        <span className="text-[0.74em] font-medium opacity-80">결과 닫기</span>
                    </Button>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default SinglePlayerSummaryModal;