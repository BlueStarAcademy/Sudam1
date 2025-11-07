
import React, { useEffect, useMemo, useState } from 'react';
import { UserWithStatus } from '../types.js';
import Button from './Button.js';
import Avatar from './Avatar.js';
import { getMannerEffects } from '../services/effectService.js';
import { AVATAR_POOL, BORDER_POOL } from '../constants';
import { useAppContext } from '../hooks/useAppContext.js';

const ResourceDisplay: React.FC<{ icon: React.ReactNode; value: string; className?: string }> = ({ icon, value, className }) => (
    <div className={`flex items-center gap-1 sm:gap-2 bg-tertiary/50 rounded-full py-1 pl-1 pr-2 sm:pr-3 shadow-inner flex-shrink-0 ${className}`}>
        <div className="bg-primary w-7 h-7 flex items-center justify-center rounded-full text-lg flex-shrink-0">{icon}</div>
        <span className="font-bold text-[9px] sm:text-sm text-primary whitespace-nowrap">{value}</span>
    </div>
);

const ActionPointTimer: React.FC<{ user: UserWithStatus }> = ({ user }) => {
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
            <div className="p-2 flex justify-between items-center gap-2 h-[60px] flex-nowrap overflow-x-auto">
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

                <div className="flex items-center justify-end flex-nowrap gap-1 sm:gap-2 flex-shrink-0">
                    <div className="flex items-center flex-shrink-0">
                        <ResourceDisplay icon="⚡" value={`${safeActionPoints.current}/${safeActionPoints.max}`} className="flex-shrink-0" />
                        <ActionPointTimer user={currentUserWithStatus} />
                        <button onClick={() => openShop()} className="ml-1 w-6 h-6 flex-shrink-0 rounded-full bg-green-600 hover:bg-green-500 text-white font-bold flex items-center justify-center text-lg shadow-md transition-transform hover:scale-110 active:scale-95" title="행동력 구매">+</button>
                    </div>
                    <ResourceDisplay icon={<img src="/images/icon/Gold.png" alt="골드" className="w-5 h-5 object-contain" />} value={safeGold.toLocaleString()} className="flex-shrink-0" />
                    <ResourceDisplay icon={<img src="/images/icon/Zem.png" alt="다이아" className="w-5 h-5 object-contain" />} value={safeDiamonds.toLocaleString()} className="flex-shrink-0" />
                    
                    <div className="h-9 w-px bg-border-color mx-1 sm:mx-2 flex-shrink-0"></div>
                    
                    {isAdmin && <Button onClick={() => window.location.hash = '#/admin'} colorScheme="purple" className="text-[9px] sm:text-sm flex-shrink-0 whitespace-nowrap">관리자</Button>}
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
                    <Button onClick={handleLogout} colorScheme="red" className="text-xs sm:text-sm">로그아웃</Button>
                </div>
            </div>
        </header>
    );
};

export default Header;