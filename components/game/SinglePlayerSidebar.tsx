import React from 'react';
import { LiveGameSession, GameProps } from '../../types.js';
import ProverbPanel from './SinglePlayerInfoPanel.js';
import { GameInfoPanel, ChatPanel } from './Sidebar.js';
import Button from '../Button.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import { ActionPointTimer } from '../Header.js';

interface SinglePlayerSidebarProps {
    session: LiveGameSession;
    gameChat?: GameProps['gameChat'];
    onAction?: GameProps['onAction'];
    currentUser?: GameProps['currentUser'];
    onTogglePause?: () => void;
    isPaused?: boolean;
    resumeCountdown?: number;
    pauseButtonCooldown?: number;
    onClose?: () => void;
    onOpenSettings?: () => void;
}

const SinglePlayerSidebar: React.FC<SinglePlayerSidebarProps> = ({
    session,
    gameChat = [],
    onAction,
    currentUser,
    onTogglePause,
    isPaused = false,
    resumeCountdown = 0,
    pauseButtonCooldown = 0,
    onClose,
    onOpenSettings
}) => {
    const { handlers, activeNegotiation, negotiations, onlineUsers, waitingRoomChats } = useAppContext();
    if (!currentUser) return null;
    const actionPoints = currentUser.actionPoints || { current: 0, max: 30 };
    const gold = currentUser.gold ?? 0;
    const diamonds = currentUser.diamonds ?? 0;

    const ResourceBadge: React.FC<{ icon: React.ReactNode; value: string; className?: string }> = ({ icon, value, className }) => (
        <div className={`flex items-center gap-1 bg-primary/40 rounded-full py-1 pl-1 pr-2 shadow-inner border border-white/5 ${className ?? ''}`}>
            <div className="bg-primary/80 w-6 h-6 flex items-center justify-center rounded-full text-xs">{icon}</div>
            <span className="font-semibold text-[11px] text-text-primary whitespace-nowrap">{value}</span>
        </div>
    );

    return (
        <div className="flex flex-col h-full gap-1.5 bg-gray-900/80 rounded-lg p-2 border border-color">
            {/* 사이드바 헤더: 설정 버튼 */}
            {onOpenSettings && (
                <div className="flex-shrink-0 flex justify-end mb-1">
                    <button 
                        onClick={onOpenSettings} 
                        className="text-xl p-1.5 rounded hover:bg-gray-700/50 transition-colors"
                        title="설정"
                    >
                        ⚙️
                    </button>
                </div>
            )}
            <div className="flex-shrink-0 space-y-2">
                <GameInfoPanel session={session} onClose={onClose} onOpenSettings={onOpenSettings} />
                <div className="flex items-center gap-2 bg-gray-800/80 rounded-xl border border-stone-700 px-3 py-2 overflow-x-auto">
                    <div className="flex items-center gap-1 bg-primary/30 rounded-full border border-primary/40 px-2 py-1 shadow-inner">
                        <span className="font-semibold text-[11px] text-text-primary whitespace-nowrap flex items-center gap-1">
                            <span className="text-sm leading-none">⚡</span>
                            {`${actionPoints.current}/${actionPoints.max}`}
                        </span>
                        <ActionPointTimer user={currentUser} />
                        <button
                            type="button"
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-primary/60 hover:bg-primary transition-colors border border-primary/60"
                            onClick={() => handlers.openShop('misc')}
                            title="행동력 충전 (상점 이동)"
                        >
                            <img src="/images/icon/applus.png" alt="행동력 충전" className="w-4 h-4 object-contain" />
                        </button>
                    </div>
                    <ResourceBadge icon={<img src="/images/icon/Gold.png" alt="골드" className="w-4 h-4 object-contain" />} value={gold.toLocaleString()} />
                    <ResourceBadge icon={<img src="/images/icon/Zem.png" alt="다이아" className="w-4 h-4 object-contain" />} value={diamonds.toLocaleString()} />
                </div>
                <ProverbPanel />
            </div>
            <div className="flex-1 mt-2 min-h-0">
                <ChatPanel 
                    session={session}
                    isSpectator={false}
                    onAction={onAction || (() => {})}
                    waitingRoomChat={waitingRoomChats['global'] || []}
                    gameChat={gameChat}
                    onViewUser={() => {}}
                    onlineUsers={onlineUsers}
                    currentUser={currentUser}
                    activeNegotiation={activeNegotiation}
                    negotiations={Array.isArray(negotiations) ? negotiations : Object.values(negotiations || {})}
                />
            </div>
            <div className="flex-shrink-0 pt-2">
                {onTogglePause && (
                    <Button
                        onClick={onTogglePause}
                        colorScheme={isPaused ? 'green' : 'yellow'}
                        className="w-full"
                        disabled={(isPaused && resumeCountdown > 0) || (!isPaused && pauseButtonCooldown > 0)}
                    >
                        {isPaused
                            ? (resumeCountdown > 0 ? `대국 재개 (${resumeCountdown})` : '대국 재개')
                            : (pauseButtonCooldown > 0 ? `일시 정지 (${pauseButtonCooldown})` : '일시 정지')}
                    </Button>
                )}
            </div>
        </div>
    );
};

export default SinglePlayerSidebar;

