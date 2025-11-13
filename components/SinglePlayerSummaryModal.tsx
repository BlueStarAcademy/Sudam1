import React, { useEffect, useMemo, useState } from 'react';
import { LiveGameSession, UserWithStatus, ServerAction, Player, AnalysisResult, GameMode } from '../types.js';
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

// 계가 결과 표시 컴포넌트 (GameSummaryModal에서 가져옴)
const ScoreDetailsComponent: React.FC<{ analysis: AnalysisResult, session: LiveGameSession, isMobile?: boolean, mobileTextScale?: number }> = ({ analysis, session, isMobile = false, mobileTextScale = 1 }) => {
    const { scoreDetails } = analysis;
    const { mode, settings } = session;

    if (!scoreDetails) return <p className={`text-center text-gray-400 ${isMobile ? 'text-xs' : ''}`} style={{ fontSize: isMobile ? `${10 * mobileTextScale}px` : undefined }}>점수 정보가 없습니다.</p>;
    
    const isSpeedMode = mode === GameMode.Speed || (mode === GameMode.Mix && settings.mixedModes?.includes(GameMode.Speed));
    const isBaseMode = mode === GameMode.Base || (mode === GameMode.Mix && settings.mixedModes?.includes(GameMode.Base));
    const isHiddenMode = mode === GameMode.Hidden || (mode === GameMode.Mix && settings.mixedModes?.includes(GameMode.Hidden));

    return (
        <div className={`space-y-2 ${isMobile ? 'p-2' : 'p-3'} bg-gray-800/50 rounded-lg`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div className={`space-y-0.5 sm:space-y-1 bg-gray-800/50 ${isMobile ? 'p-1.5' : 'p-2'} rounded-md`}>
                    <h3 className={`font-bold text-center mb-0.5 sm:mb-1 ${isMobile ? 'text-xs' : ''}`} style={{ fontSize: isMobile ? `${10 * mobileTextScale}px` : undefined }}>흑</h3>
                    <div className="flex justify-between" style={{ fontSize: isMobile ? `${9 * mobileTextScale}px` : undefined }}><span>영토:</span> <span>{scoreDetails.black.territory.toFixed(0)}</span></div>
                    <div className="flex justify-between" style={{ fontSize: isMobile ? `${9 * mobileTextScale}px` : undefined }}><span>따낸 돌:</span> <span>{scoreDetails.black.liveCaptures ?? 0}</span></div>
                    <div className="flex justify-between" style={{ fontSize: isMobile ? `${9 * mobileTextScale}px` : undefined }}><span>사석:</span> <span>{scoreDetails.black.deadStones ?? 0}</span></div>
                    {isBaseMode && <div className="flex justify-between text-blue-300" style={{ fontSize: isMobile ? `${9 * mobileTextScale}px` : undefined }}><span>베이스 보너스:</span> <span>{scoreDetails.black.baseStoneBonus}</span></div>}
                    {isHiddenMode && <div className="flex justify-between text-purple-300" style={{ fontSize: isMobile ? `${9 * mobileTextScale}px` : undefined }}><span>히든 보너스:</span> <span>{scoreDetails.black.hiddenStoneBonus}</span></div>}
                    {isSpeedMode && <div className="flex justify-between text-green-300" style={{ fontSize: isMobile ? `${9 * mobileTextScale}px` : undefined }}><span>시간 보너스:</span> <span>{scoreDetails.black.timeBonus.toFixed(1)}</span></div>}
                    <div className={`flex justify-between border-t border-gray-600 pt-0.5 sm:pt-1 mt-0.5 sm:mt-1 font-bold ${isMobile ? 'text-xs' : 'text-base'}`} style={{ fontSize: isMobile ? `${10 * mobileTextScale}px` : undefined }}><span>총점:</span> <span className="text-yellow-300">{scoreDetails.black.total.toFixed(1)}</span></div>
                </div>
                <div className={`space-y-0.5 sm:space-y-1 bg-gray-800/50 ${isMobile ? 'p-1.5' : 'p-2'} rounded-md`}>
                    <h3 className={`font-bold text-center mb-0.5 sm:mb-1 ${isMobile ? 'text-xs' : ''}`} style={{ fontSize: isMobile ? `${10 * mobileTextScale}px` : undefined }}>백</h3>
                    <div className="flex justify-between" style={{ fontSize: isMobile ? `${9 * mobileTextScale}px` : undefined }}><span>영토:</span> <span>{scoreDetails.white.territory.toFixed(0)}</span></div>
                    <div className="flex justify-between" style={{ fontSize: isMobile ? `${9 * mobileTextScale}px` : undefined }}><span>따낸 돌:</span> <span>{scoreDetails.white.liveCaptures ?? 0}</span></div>
                    <div className="flex justify-between" style={{ fontSize: isMobile ? `${9 * mobileTextScale}px` : undefined }}><span>사석:</span> <span>{scoreDetails.white.deadStones ?? 0}</span></div>
                    <div className="flex justify-between" style={{ fontSize: isMobile ? `${9 * mobileTextScale}px` : undefined }}><span>덤:</span> <span>{scoreDetails.white.komi}</span></div>
                    {isBaseMode && <div className="flex justify-between text-blue-300" style={{ fontSize: isMobile ? `${9 * mobileTextScale}px` : undefined }}><span>베이스 보너스:</span> <span>{scoreDetails.white.baseStoneBonus}</span></div>}
                    {isHiddenMode && <div className="flex justify-between text-purple-300" style={{ fontSize: isMobile ? `${9 * mobileTextScale}px` : undefined }}><span>히든 보너스:</span> <span>{scoreDetails.white.hiddenStoneBonus}</span></div>}
                    {isSpeedMode && <div className="flex justify-between text-green-300" style={{ fontSize: isMobile ? `${9 * mobileTextScale}px` : undefined }}><span>시간 보너스:</span> <span>{scoreDetails.white.timeBonus.toFixed(1)}</span></div>}
                    <div className={`flex justify-between border-t border-gray-600 pt-0.5 sm:pt-1 mt-0.5 sm:mt-1 font-bold ${isMobile ? 'text-xs' : 'text-base'}`} style={{ fontSize: isMobile ? `${10 * mobileTextScale}px` : undefined }}><span>총점:</span> <span className="text-yellow-300">{scoreDetails.white.total.toFixed(1)}</span></div>
                </div>
            </div>
        </div>
    );
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
    const isScoring = session.gameStatus === 'scoring';
    const isEnded = session.gameStatus === 'ended';
    const analysisResult = session.analysisResult?.['system'];
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

    const winReasonText = useMemo(() => {
        if (!isWinner) return null;
        switch (session.winReason) {
            case 'capture_limit':
                return currentStage?.survivalTurns
                    ? '백이 정해진 턴을 모두 버텼습니다.'
                    : '목표 점수를 달성했습니다.';
            case 'score':
                return '계가 결과 승리했습니다.';
            case 'timeout':
                return '시간초과 시간패입니다.';
            case 'resign':
                return '상대방이 기권했습니다.';
            case 'disconnect':
                return '상대방의 연결이 끊어졌습니다.';
            case 'total_score':
                return '총 점수 합계에서 승리했습니다.';
            case 'dice_win':
                return '주사위 점수에서 승리했습니다.';
            case 'foul_limit':
                return '상대방이 반칙 한도를 초과했습니다.';
            case 'thief_captured':
                return '도둑 돌을 모두 잡았습니다.';
            case 'police_win':
                return '경찰로서 더 많은 점수를 획득했습니다.';
            case 'omok_win':
                return '먼저 다섯 줄을 완성했습니다.';
            case 'alkkagi_win':
                return '알까기 승부에서 승리했습니다.';
            case 'curling_win':
                return '컬링 총점에서 승리했습니다.';
            default:
                return '승리했습니다.';
        }
    }, [isWinner, session.winReason, currentStage]);

    const gameDuration = useMemo(() => {
        const startTime = session.createdAt;
        const endTime = session.turnStartTime ?? Date.now();
        const elapsedMs = Math.max(0, endTime - startTime);
        const totalSeconds = Math.floor(elapsedMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, [session.createdAt, session.turnStartTime]);

    const handleRetry = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            // onAction이 완료될 때까지 기다림 (gameId 반환 가능)
            // handleAction에서 이미 라우팅을 업데이트하므로 여기서는 모달만 닫으면 됨
            const result = await onAction({ type: 'START_SINGLE_PLAYER_GAME', payload: { stageId: session.stageId! } });
            const gameId = (result as any)?.gameId;
            
            if (gameId) {
                // gameId를 받았으면 handleAction에서 이미 라우팅이 업데이트되었으므로
                // WebSocket 업데이트를 기다리면서 모달 닫기
                await new Promise(resolve => setTimeout(resolve, 200));
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
            // handleAction에서 이미 라우팅을 업데이트하므로 여기서는 모달만 닫으면 됨
            const result = await onAction({ type: 'START_SINGLE_PLAYER_GAME', payload: { stageId: nextStage.id } });
            const gameId = (result as any)?.gameId;
            
            if (gameId) {
                // gameId를 받았으면 handleAction에서 이미 라우팅이 업데이트되었으므로
                // WebSocket 업데이트를 기다리면서 모달 닫기
                await new Promise(resolve => setTimeout(resolve, 200));
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

    const modalTitle = isScoring && !analysisResult 
        ? "계가 중..." 
        : (isScoring && analysisResult) 
            ? (isWinner ? "미션 클리어" : "미션 실패")
            : (isEnded ? (isWinner ? "미션 클리어" : "미션 실패") : "게임 결과");

    const isMobile = isMobileView;
    const mobileTextScale = isMobileView ? 0.9 : 1;

    return (
        <DraggableWindow 
            title={modalTitle}
            onClose={() => handleClose(session, onClose)} 
            windowId="sp-summary-redesigned"
            initialWidth={isMobile ? 600 : 900}
            initialHeight={isMobile ? 560 : 760}
        >
            <div className={`text-white ${isMobile ? 'text-xs' : 'text-[clamp(0.75rem,2.5vw,1rem)]'} flex flex-col ${isMobile ? 'max-h-[85vh]' : 'h-full'} overflow-y-auto`}>
                {/* Title */}
                {(isEnded || (isScoring && analysisResult)) && (
                    <h1 className={`${isMobile ? 'text-lg' : 'text-[clamp(2.25rem,10vw,3rem)]'} font-black text-center mb-2 sm:mb-4 tracking-widest flex-shrink-0 ${isWinner ? 'text-yellow-300' : 'text-red-400'}`} style={{ fontSize: isMobile ? `${16 * mobileTextScale}px` : undefined }}>
                        {isWinner ? 'MISSION CLEAR' : 'MISSION FAILED'}
                    </h1>
                )}
                {isScoring && !analysisResult && (
                    <h1 className={`${isMobile ? 'text-lg' : 'text-[clamp(2.25rem,10vw,3rem)]'} font-black text-center mb-2 sm:mb-4 tracking-widest flex-shrink-0 text-blue-300`} style={{ fontSize: isMobile ? `${16 * mobileTextScale}px` : undefined }}>
                        계가 중...
                    </h1>
                )}
                {!isEnded && !isScoring && (
                    <h1 className={`${isMobile ? 'text-lg' : 'text-[clamp(2.25rem,10vw,3rem)]'} font-black text-center mb-2 sm:mb-4 tracking-widest flex-shrink-0 text-gray-300`} style={{ fontSize: isMobile ? `${16 * mobileTextScale}px` : undefined }}>
                        게임 결과
                    </h1>
                )}
                
                <div className={`flex flex-row gap-2 sm:gap-4 overflow-hidden flex-1 min-h-0`}>
                    {/* Left Panel: 경기 결과 */}
                    <div className={`w-1/2 bg-gray-900/50 ${isMobile ? 'p-1.5' : 'p-4'} rounded-lg overflow-y-auto flex flex-col`}>
                        <h2 className={`${isMobile ? 'text-xs' : 'text-lg'} font-bold text-center text-gray-200 mb-1 sm:mb-3 border-b border-gray-700 pb-0.5 sm:pb-2 flex-shrink-0`} style={{ fontSize: isMobile ? `${10 * mobileTextScale}px` : undefined }}>경기 결과</h2>
                        <div className="flex-1 min-h-0 flex flex-col gap-2">
                            {/* 경기 정보 */}
                            {(isEnded || (isScoring && analysisResult)) && (
                                <div className={`${isMobile ? 'p-1.5' : 'p-2'} bg-gray-800/50 rounded-lg space-y-1 flex-shrink-0`}>
                                    <div className="flex justify-between items-center" style={{ fontSize: isMobile ? `${9 * mobileTextScale}px` : undefined }}>
                                        <span className="text-gray-400">총 걸린 시간:</span>
                                        <span className="text-gray-200 font-semibold">{gameDuration}</span>
                                    </div>
                                    {(winReasonText || failureReason) && (
                                        <div className="flex flex-col gap-0.5" style={{ fontSize: isMobile ? `${9 * mobileTextScale}px` : undefined }}>
                                            <span className="text-gray-400">{isWinner ? '승리 이유:' : '패배 이유:'}</span>
                                            <span className={`font-semibold ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                                                {winReasonText || failureReason}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* 계가 결과 */}
                            {isScoring && !analysisResult && (
                                <div className="flex flex-col items-center justify-center flex-1">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4"></div>
                                    <p className="text-gray-400 text-center">계가 중...</p>
                                </div>
                            )}
                            {(isScoring && analysisResult) || (isEnded && analysisResult) ? (
                                <ScoreDetailsComponent 
                                    analysis={analysisResult} 
                                    session={session} 
                                    isMobile={isMobile}
                                    mobileTextScale={mobileTextScale}
                                />
                            ) : !isScoring && !isEnded ? (
                                <p className="text-center text-gray-400">계가 결과가 없습니다.</p>
                            ) : null}
                        </div>
                    </div>
                    
                    {/* Right Panel: 미션 결과 및 보상 */}
                    <div className={`w-1/2 flex flex-col gap-1.5 sm:gap-4`}>
                        {/* 미션 결과 */}
                        <div className={`bg-gray-900/50 ${isMobile ? 'p-1.5' : 'p-4'} rounded-lg flex flex-col gap-1`}>
                            <h2 className={`${isMobile ? 'text-xs' : 'text-lg'} font-bold text-center text-gray-200 mb-1 sm:mb-2 border-b border-gray-700 pb-0.5`} style={{ fontSize: isMobile ? `${10 * mobileTextScale}px` : undefined }}>미션 결과</h2>
                            {!isWinner && failureReason && (
                                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-red-200 font-medium mb-2`} style={{ fontSize: isMobile ? `${9 * mobileTextScale}px` : undefined }}>{failureReason}</p>
                            )}
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <Avatar
                                    userId={currentUser.id}
                                    userName={currentUser.nickname}
                                    avatarUrl={avatarUrl}
                                    borderUrl={borderUrl}
                                    size={isMobile ? Math.round(24 * 1) : 48}
                                />
                                <div>
                                    <p className={`font-bold`} style={{ fontSize: isMobile ? `${10 * mobileTextScale}px` : undefined }}>{currentUser.nickname}</p>
                                    <p className={`text-gray-400`} style={{ fontSize: isMobile ? `${8 * mobileTextScale}px` : undefined }}>
                                        전략 Lv.{currentUser.strategyLevel}
                                    </p>
                                </div>
                            </div>
                            {summary?.xp && (
                                <div className="flex-shrink-0 mt-2">
                                    <div className="w-full bg-gray-800/70 border border-gray-700/70 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 transition-all duration-700 ease-out"
                                            style={{ width: `${xpPercent}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-300 mt-1">
                                        <span className="font-mono" style={{ fontSize: isMobile ? `${7 * mobileTextScale}px` : undefined }}>
                                            {clampedXp.toLocaleString()} / {xpRequirement.toLocaleString()} XP
                                        </span>
                                        <span className={`font-semibold ${xpChange >= 0 ? 'text-green-400' : 'text-red-400'}`} style={{ fontSize: isMobile ? `${7 * mobileTextScale}px` : undefined }}>
                                            {xpChange >= 0 ? `+${xpChange.toLocaleString()}` : xpChange.toLocaleString()} XP
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* 획득 보상 */}
                        {summary && (
                            <div className={`bg-gray-900/50 ${isMobile ? 'p-1.5' : 'p-4'} rounded-lg space-y-1 sm:space-y-2 flex-shrink-0`}>
                                <h2 className={`${isMobile ? 'text-xs' : 'text-lg'} font-bold text-center text-gray-200 border-b border-gray-700 pb-0.5`} style={{ fontSize: isMobile ? `${10 * mobileTextScale}px` : undefined }}>획득 보상</h2>
                                <div className={`flex gap-1.5 sm:gap-3 justify-center items-stretch`}>
                                    {/* Gold Reward */}
                                    {summary.gold && summary.gold > 0 && (
                                        <div className={`${isMobile ? 'w-16 h-16' : 'w-32 h-32'} bg-gradient-to-br from-yellow-600/30 to-yellow-800/30 border-2 border-yellow-500/50 rounded-lg flex flex-col items-center justify-center ${isMobile ? 'p-1' : 'p-2'} shadow-lg`}>
                                            <img src="/images/icon/Gold.png" alt="골드" className={`${isMobile ? 'w-5 h-5' : 'w-12 h-12'} mb-0.5`} />
                                            <p className={`font-bold text-yellow-300 text-center`} style={{ fontSize: isMobile ? `${7 * mobileTextScale}px` : undefined }}>
                                                {summary.gold.toLocaleString()}
                                            </p>
                                        </div>
                                    )}
                                    {/* XP Reward */}
                                    {summary.xp && summary.xp.change > 0 && (
                                        <div className={`${isMobile ? 'w-16 h-16' : 'w-32 h-32'} bg-gradient-to-br from-green-600/30 to-green-800/30 border-2 border-green-500/50 rounded-lg flex flex-col items-center justify-center ${isMobile ? 'p-1' : 'p-2'} shadow-lg`}>
                                            <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-bold text-green-300 mb-0.5`} style={{ fontSize: isMobile ? `${8 * mobileTextScale}px` : undefined }}>전략</p>
                                            <p className={`font-bold text-green-300 text-center`} style={{ fontSize: isMobile ? `${7 * mobileTextScale}px` : undefined }}>
                                                +{summary.xp.change} XP
                                            </p>
                                        </div>
                                    )}
                                    {/* Item Rewards */}
                                    {summary.items && summary.items.length > 0 && summary.items.slice(0, 2).map((item, idx) => (
                                        <div key={item.id} className={`${isMobile ? 'w-16 h-16' : 'w-32 h-32'} bg-gradient-to-br from-purple-600/30 to-purple-800/30 border-2 border-purple-500/50 rounded-lg flex flex-col items-center justify-center ${isMobile ? 'p-1' : 'p-2'} shadow-lg`}>
                                            {item.image && (
                                                <img 
                                                    src={item.image} 
                                                    alt={item.name} 
                                                    className={`${isMobile ? 'w-8 h-8' : 'w-16 h-16'} mb-0.5 object-contain`}
                                                />
                                            )}
                                            <p className={`font-semibold text-purple-300 text-center leading-tight`} style={{ fontSize: isMobile ? `${6 * mobileTextScale}px` : undefined }}>
                                                {item.name}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                {summary.items && summary.items.length > 2 && (
                                    <p className={`text-center text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`} style={{ fontSize: isMobile ? `${8 * mobileTextScale}px` : undefined }}>
                                        외 {summary.items.length - 2}개 아이템
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                 
                {/* Buttons */}
                <div className={`mt-2 sm:mt-4 flex-shrink-0 grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-4 gap-2'}`}>
                    <Button
                        onClick={handleNextStage}
                        className={`w-full ${isMobile ? 'py-1.5' : 'py-3 text-sm'} ${canTryNext && !isProcessing ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                        disabled={!canTryNext || isProcessing}
                        style={{ fontSize: isMobile ? `${11 * mobileTextScale}px` : undefined }}
                    >
                        {nextStage ? `다음 단계 (${nextStage.name.replace('스테이지 ', '')})` : '다음 단계'} {nextStageActionPointCost > 0 && `⚡${nextStageActionPointCost}`}
                    </Button>
                    <Button
                        onClick={handleRetry}
                        className={`w-full ${isMobile ? 'py-1.5' : 'py-3 text-sm'} ${!isProcessing ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                        disabled={isProcessing}
                        style={{ fontSize: isMobile ? `${11 * mobileTextScale}px` : undefined }}
                    >
                        재도전 {retryActionPointCost > 0 && `⚡${retryActionPointCost}`}
                    </Button>
                    <Button
                        onClick={handleExitToLobby}
                        className={`w-full ${isMobile ? 'py-1.5 text-xs' : 'py-3'} ${!isProcessing ? 'bg-slate-600 hover:bg-slate-700 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                        disabled={isProcessing}
                        style={{ fontSize: isMobile ? `${9 * mobileTextScale}px` : undefined }}
                    >
                        나가기
                    </Button>
                    <Button
                        onClick={() => handleClose(session, onClose)}
                        className={`w-full ${isMobile ? 'py-1.5 text-xs' : 'py-3'} bg-emerald-600 hover:bg-emerald-700 text-white`}
                        style={{ fontSize: isMobile ? `${9 * mobileTextScale}px` : undefined }}
                    >
                        확인
                    </Button>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default SinglePlayerSummaryModal;