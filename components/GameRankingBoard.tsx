import React, { useState, useMemo } from 'react';
import { useAppContext } from '../hooks/useAppContext.js';
import { User, InventoryItem, ItemOptions, ItemOption } from '../types.js';
import Avatar from './Avatar.js';
import { AVATAR_POOL, BORDER_POOL } from '../constants.js';

interface GameRankingBoardProps {
    isTopmost?: boolean;
}

const calculateCombatPower = (user: User): number => {
    if (!user.inventory) return 0;

    const equippedItems = user.inventory.filter(item => item.isEquipped);

    let totalPower = 0;

    equippedItems.forEach((item: InventoryItem) => {
        if (item.options) {
            const { main, combatSubs, specialSubs, mythicSubs } = item.options;
            if (main) {
                totalPower += main.value;
            }
            combatSubs.forEach(option => totalPower += option.value);
            specialSubs.forEach(option => totalPower += option.value);
            mythicSubs.forEach(option => totalPower += option.value);
        }
    });

    return totalPower;
};

const RankingRow = ({ user, rank, value, isCurrentUser }: { user: User, rank: number, value: number, isCurrentUser: boolean }) => {
    const avatarUrl = useMemo(() => AVATAR_POOL.find(a => a.id === user.avatarId)?.url, [user.avatarId]);
    const borderUrl = useMemo(() => BORDER_POOL.find(b => b.id === user.borderId)?.url, [user.borderId]);

    return (
        <div className={`flex items-center p-1 rounded-md ${isCurrentUser ? 'bg-blue-500/30' : ''}`}>
            <span className="w-8 text-center font-bold">{rank}</span>
            <Avatar userId={user.id} userName={user.nickname} avatarUrl={avatarUrl} borderUrl={borderUrl} size={24} />
            <span className="flex-1 truncate font-semibold ml-2">{user.nickname}</span>
            <span className="w-16 text-right font-mono">{value.toLocaleString()}</span>
        </div>
    );
};

const GameRankingBoard: React.FC<GameRankingBoardProps> = ({ isTopmost }) => {
    const { allUsers, currentUserWithStatus } = useAppContext();
    const [activeTab, setActiveTab] = useState<'combat' | 'manner'>('combat');

    const rankings = useMemo(() => {
        if (activeTab === 'combat') {
            return allUsers
                .filter(user => user)
                .map(user => ({ user, value: calculateCombatPower(user) }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 100);
        } else {
            return allUsers
                .filter(user => user)
                .map(user => ({ user, value: user.mannerScore }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 100);
        }
    }, [allUsers, activeTab]);

    const currentUserRanking = useMemo(() => {
        if (!currentUserWithStatus) return null;
        const rank = rankings.findIndex(r => r.user && r.user.id === currentUserWithStatus.id);
        if (rank !== -1) {
            return { ...rankings[rank], rank: rank + 1 };
        }
        const value = activeTab === 'combat' ? calculateCombatPower(currentUserWithStatus) : currentUserWithStatus.mannerScore;
        return { user: currentUserWithStatus, value, rank: 'N/A' };
    }, [rankings, currentUserWithStatus, activeTab]);

    return (
        <div className="bg-panel border border-color text-on-panel rounded-lg p-2 flex flex-col gap-2 h-full">
            <h3 className="text-center font-semibold text-secondary text-sm flex-shrink-0">게임 랭킹</h3>
            <div className="flex bg-gray-900/70 p-1 rounded-lg flex-shrink-0">
                <button 
                    onClick={() => setActiveTab('combat')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'combat' ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}
                >
                    전투력
                </button>
                <button 
                    onClick={() => setActiveTab('manner')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'manner' ? 'bg-yellow-600' : 'text-gray-400 hover:bg-gray-700/50'}`}
                >
                    매너
                </button>
            </div>
            <div className="flex-grow overflow-y-auto pr-1 text-xs flex flex-col gap-1 min-h-0 h-48">
                {currentUserRanking && (
                    <div className="sticky top-0 bg-panel z-10">
                        <RankingRow user={currentUserRanking.user} rank={currentUserRanking.rank as number} value={currentUserRanking.value} isCurrentUser={true} />
                    </div>
                )}
                <div className="flex flex-col gap-1">
                    {rankings.filter(r => r && r.user).map((r, i) => (
                        <RankingRow key={r.user.id} user={r.user} rank={i + 1} value={r.value} isCurrentUser={false} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GameRankingBoard;