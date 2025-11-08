import React, { useMemo } from 'react';
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

const RewardItemDisplay: React.FC<{ item: any }> = ({ item }) => (
    <div className="flex flex-col items-center justify-center text-center p-1 bg-gray-900/50 rounded-md" title={item.name}>
        <img src={item.image} alt={item.name} className="w-12 h-12 object-contain" />
        <span className="text-xs mt-1 text-gray-300 truncate w-full">{item.name}{item.quantity > 1 ? ` x${item.quantity}` : ''}</span>
    </div>
);

const getXpRequirementForLevel = (level: number): number => 1000 + (level - 1) * 200;

const SinglePlayerSummaryModal: React.FC<SinglePlayerSummaryModalProps> = ({ session, currentUser, onAction, onClose }) => {
    const isWinner = session.winner === Player.Black; // Human is always Black
    const summary = session.summary?.[currentUser.id];

    const currentStageIndex = SINGLE_PLAYER_STAGES.findIndex(s => s.id === session.stageId);
    const nextStage = SINGLE_PLAYER_STAGES[currentStageIndex + 1];
    const highestClearedStageIndex = currentUser.singlePlayerProgress ?? -1;
    const canTryNext = isWinner && !!nextStage && highestClearedStageIndex >= currentStageIndex;

    const handleRetry = () => {
        onAction({ type: 'START_SINGLE_PLAYER_GAME', payload: { stageId: session.stageId! } });
        onClose();
    };

    const handleNextStage = () => {
        if (canTryNext) {
            onAction({ type: 'START_SINGLE_PLAYER_GAME', payload: { stageId: nextStage.id } });
            onClose();
        }
    };

    const handleExitToLobby = () => {
        sessionStorage.setItem('postGameRedirect', '#/singleplayer');
        onAction({ type: 'LEAVE_AI_GAME', payload: { gameId: session.id } });
        onClose();
        // 즉시 싱글플레이 로비로 이동 (WebSocket 업데이트를 기다리지 않음)
        setTimeout(() => {
            window.location.hash = '#/singleplayer';
        }, 100);
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
            initialWidth={500}
        >
            <div className={`relative text-center p-4 rounded-lg overflow-hidden ${isWinner ? 'bg-gradient-to-br from-blue-900/50 to-gray-900' : 'bg-gradient-to-br from-red-900/50 to-gray-900'}`}>
                {isWinner && (
                    <div className="absolute -top-1/2 -left-1/4 w-full h-full bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
                )}
                <h1 className={`text-5xl font-black mb-6 tracking-widest ${isWinner ? 'text-yellow-300' : 'text-red-400'}`} style={{ textShadow: isWinner ? '0 0 15px rgba(250, 204, 21, 0.5)' : '0 0 10px rgba(220, 38, 38, 0.5)' }}>
                    {isWinner ? 'MISSION CLEAR' : 'MISSION FAILED'}
                </h1>

                <div className="flex items-center gap-4 bg-black/40 backdrop-blur-sm border border-gray-700/60 rounded-2xl p-4 text-left mb-6">
                    <Avatar
                        userId={currentUser.id}
                        userName={currentUser.nickname}
                        avatarUrl={avatarUrl}
                        borderUrl={borderUrl}
                        size={80}
                        className="flex-shrink-0"
                    />
                    <div className="flex-1">
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                            <div className="text-lg font-bold text-white">{currentUser.nickname}</div>
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
                            <span className="font-mono">{clampedXp.toLocaleString()} / {xpRequirement.toLocaleString()} XP</span>
                            <span className={`font-semibold ${xpChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {xpChange >= 0 ? `+${xpChange}` : xpChange} XP
                            </span>
                        </div>
                    </div>
                </div>

                {summary && (
                    <div className="bg-black/30 backdrop-blur-sm p-4 rounded-lg my-4 space-y-3 border border-gray-700/50">
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
                                <div className="grid grid-cols-5 gap-2">
                                    {summary.items.map(item => <RewardItemDisplay key={item.id} item={item} />)}
                                </div>
                            </div>
                        )}
                        
                        {!isWinner && (!summary || (summary.gold === 0 && summary.xp?.change === 0 && summary.items?.length === 0)) && (
                            <p className="text-gray-500">획득한 보상이 없습니다.</p>
                        )}
                    </div>
                )}
                
                <div className="mt-8 grid grid-cols-2 gap-3">
                    <Button onClick={handleNextStage} colorScheme="blue" className="w-full" disabled={!canTryNext}>
                        다음 단계{nextStage ? `: ${nextStage.name.replace('스테이지 ', '')}` : ''}
                    </Button>
                    <Button onClick={handleRetry} colorScheme="yellow" className="w-full">재도전</Button>
                    <Button onClick={handleExitToLobby} colorScheme="gray" className="w-full">나가기</Button>
                    <Button onClick={() => handleClose(session, onClose)} colorScheme="green" className="w-full">확인</Button>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default SinglePlayerSummaryModal;