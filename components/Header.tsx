
import React, { memo, useEffect, useMemo, useState } from 'react';
import { UserWithStatus } from '../types.js';
import Button from './Button.js';
import Avatar from './Avatar.js';
import { getMannerEffects } from '../services/effectService.js';
import { AVATAR_POOL, BORDER_POOL } from '../constants';
import { useAppContext } from '../hooks/useAppContext.js';
import { resourceIcons, ResourceIconKey } from './resourceIcons.js';

const RESOURCE_LABEL: Record<ResourceIconKey, string> = {
    gold: '골드',
    diamonds: '다이아',
};

const ResourceDisplay = memo<{ icon: ResourceIconKey; value: number; className?: string }>(({ icon, value, className }) => {
    const formattedValue = useMemo(() => value.toLocaleString(), [value]);
    return (
        <div className={`flex items-center gap-1 sm:gap-2 bg-tertiary/50 rounded-full py-1 pl-1 pr-2 sm:pr-3 shadow-inner flex-shrink-0 ${className ?? ''}`}>
            <div className="bg-primary w-7 h-7 flex items-center justify-center rounded-full text-lg flex-shrink-0">
                <img src={resourceIcons[icon]} alt={RESOURCE_LABEL[icon]} className="w-5 h-5 object-contain" loading="lazy" decoding="async" />
            </div>
            <span className="font-bold text-[9px] sm:text-sm text-primary whitespace-nowrap">{formattedValue}</span>
        </div>
    );
});
ResourceDisplay.displayName = 'ResourceDisplay';

export const ActionPointTimer: React.FC<{ user: UserWithStatus }> = ({ user }) => {
    const { actionPoints, lastActionPointUpdate } = user;
    const [timeLeft, setTimeLeft] = useState('');
    
    // actionPoints가 없으면 타이머 표시 안 함
    if (!actionPoints) return null;
    
    const regenInterval = useMemo(() => getMannerEffects(user).actionPointRegenInterval, [user]);

    useEffect(() => {
        if (!actionPoints || actionPoints.current >= actionPoints.max) {
            setTimeLeft('');
            return;
        }

        const updateTimer = () => {
            const nextRegenTime = lastActionPointUpdate + regenInterval;
            const remainingMs = Math.max(0, nextRegenTime - Date.now());
            const totalSeconds = Math.floor(remainingMs / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            setTimeLeft(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        };

        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);
        return () => clearInterval(intervalId);
    }, [actionPoints.current, actionPoints.max, lastActionPointUpdate, regenInterval]);

    if (!timeLeft) return null;

    return <span className="text-[8px] sm:text-xs text-tertiary font-mono text-center whitespace-nowrap">({timeLeft})</span>;
};


const Header: React.FC = () => {
    const { currentUserWithStatus, handlers, unreadMailCount } = useAppContext();

    if (!currentUserWithStatus) return null;

    const { handleLogout, openShop, openSettingsModal, openProfileEditModal, openMailbox } = handlers;
    const { actionPoints, gold, diamonds, isAdmin, avatarId, borderId, mbti } = currentUserWithStatus;
    
    // actionPoints가 없으면 기본값 사용
    const safeActionPoints = actionPoints || { current: 0, max: 30 };
    // gold와 diamonds가 없으면 기본값 사용
    const safeGold = (gold !== undefined && gold !== null) ? gold : 0;
    const safeDiamonds = (diamonds !== undefined && diamonds !== null) ? diamonds : 0;
    
    const avatarUrl = useMemo(() => AVATAR_POOL.find(a => a.id === avatarId)?.url, [avatarId]);
    const borderUrl = useMemo(() => BORDER_POOL.find(b => b.id === borderId)?.url, [borderId]);

    return (
        <header className="flex-shrink-0 bg-primary/80 backdrop-blur-sm shadow-lg">
            <div className="p-2.5 sm:p-3 flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-2 sm:gap-3 min-h-[70px] sm:min-h-[75px]">
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0 cursor-pointer relative" onClick={openProfileEditModal}>
                     <Avatar userId={currentUserWithStatus.id} userName={currentUserWithStatus.nickname} avatarUrl={avatarUrl} borderUrl={borderUrl} size={40} />
                     <div className="hidden sm:block min-w-0">
                        <h1 className="font-bold text-primary truncate whitespace-nowrap">{currentUserWithStatus.nickname}</h1>
                        <p className="text-xs text-tertiary truncate whitespace-nowrap">전략 Lv.{currentUserWithStatus.strategyLevel} / 놀이 Lv.{currentUserWithStatus.playfulLevel}</p>
                     </div>
                     {!mbti && (
                        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                     )}
                </div>

                <div className="flex-1 w-full sm:w-auto flex flex-wrap sm:flex-nowrap items-center justify-end gap-1 sm:gap-2">
                    <div className="flex items-center flex-shrink-0 gap-1 bg-tertiary/60 rounded-full pl-2 pr-1 py-1 border border-tertiary/40 shadow-inner">
                        <span className="flex items-center gap-1 font-bold text-[9px] sm:text-xs text-primary whitespace-nowrap">
                            <span className="text-base leading-none">⚡</span>
                            {`${safeActionPoints.current}/${safeActionPoints.max}`}
                        </span>
                        <ActionPointTimer user={currentUserWithStatus} />
                        <button
                            onClick={() => openShop('misc')}
                            className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/70 hover:bg-primary transition-colors border border-primary/60 flex items-center justify-center"
                            title="행동력 충전 (상점)"
                        >
                            <img src={resourceIcons.actionPlus} alt="행동력 충전" className="w-4 h-4 sm:w-5 sm:h-5 object-contain" loading="lazy" decoding="async" />
                        </button>
                    </div>
                    <ResourceDisplay icon="gold" value={safeGold} className="flex-shrink-0" />
                    <ResourceDisplay icon="diamonds" value={safeDiamonds} className="flex-shrink-0" />
                    
                    <div className="h-9 w-px bg-border-color mx-1 sm:mx-2 flex-shrink-0"></div>
                    
                    {isAdmin && (
                        <Button
                            onClick={() => window.location.hash = '#/admin'}
                            colorScheme="none"
                            className="flex-shrink-0 whitespace-nowrap !px-3 !py-1.5 text-[9px] sm:text-xs rounded-lg border border-indigo-300/50 bg-gradient-to-r from-indigo-500/85 via-sky-500/80 to-cyan-400/80 text-white shadow-[0_10px_24px_-18px_rgba(59,130,246,0.55)] hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-18px_rgba(96,165,250,0.6)]"
                            style={{ letterSpacing: '0.08em' }}
                        >
                            관리자
                        </Button>
                    )}
                    <button
                        onClick={openMailbox}
                        className="relative p-2 rounded-lg text-xl hover:bg-secondary transition-colors"
                        title="우편함"
                    >
                        <img src="/images/icon/mail.png" alt="우편함" className="w-6 h-6" />
                        {unreadMailCount > 0 && (
                            <span className="absolute top-1 right-1 bg-red-500 rounded-full w-2.5 h-2.5 border-2 border-primary"></span>
                        )}
                    </button>
                    <button
                        onClick={openSettingsModal}
                        className="p-2 rounded-lg text-xl hover:bg-secondary transition-colors"
                        title="설정"
                    >
                        ⚙️
                    </button>
                    <Button
                        onClick={handleLogout}
                        colorScheme="none"
                        className="whitespace-nowrap !px-3 !py-1.5 text-[9px] sm:text-xs rounded-lg border border-rose-300/55 bg-gradient-to-r from-rose-500/85 via-red-500/80 to-orange-400/80 text-white shadow-[0_10px_22px_-18px_rgba(248,113,113,0.55)] hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-16px_rgba(248,113,113,0.6)]"
                        style={{ letterSpacing: '0.08em' }}
                    >
                        로그아웃
                    </Button>
                </div>
            </div>
        </header>
    );
};

export default Header;