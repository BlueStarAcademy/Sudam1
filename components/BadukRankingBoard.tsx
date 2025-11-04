import React, { useState, useMemo } from 'react';
import { useAppContext } from '../hooks/useAppContext.js';
import { User } from '../types.js';
import Avatar from './Avatar.js';
import { AVATAR_POOL, BORDER_POOL } from '../constants';

interface BadukRankingBoardProps {
    isTopmost?: boolean;
}

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

const BadukRankingBoard: React.FC<BadukRankingBoardProps> = ({ isTopmost }) => {
    const { allUsers, currentUserWithStatus } = useAppContext();
    const [activeTab, setActiveTab] = useState<'strategic' | 'playful' | 'championship'>('strategic');

    const rankings = useMemo(() => {
        if (activeTab === 'championship') {
            return allUsers
                .filter(user => user && typeof user.tournamentScore === 'number')
                .map(user => ({ user, value: user.tournamentScore }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 100);
        } else {
            const mode = activeTab === 'strategic' ? 'standard' : 'playful'; // Assuming 'standard' for strategic and 'playful' for playful
            return allUsers
                .filter(user => user)
                .map(user => ({ user, value: user.cumulativeRankingScore?.[mode] || 0 }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 100);
        }
    }, [allUsers, activeTab]);

    const currentUserRanking = useMemo(() => {
        if (!currentUserWithStatus) return null;
        let value;
        if (activeTab === 'championship') {
            value = currentUserWithStatus.tournamentScore;
        } else {
            const mode = activeTab === 'strategic' ? 'standard' : 'playful';
            value = currentUserWithStatus.cumulativeRankingScore?.[mode] || 0;
        }
        const rank = rankings.findIndex(r => r.user && r.user.id === currentUserWithStatus.id);
        if (rank !== -1) {
            return { ...rankings[rank], rank: rank + 1 };
        }
        return { user: currentUserWithStatus, value, rank: 'N/A' };
    }, [rankings, currentUserWithStatus, activeTab]);

    return (
        <div className="bg-panel border border-color text-on-panel rounded-lg p-2 flex flex-col gap-2 h-full">
            <h3 className="text-center font-semibold text-secondary text-sm flex-shrink-0">바둑 랭킹</h3>
            <div className="flex bg-gray-900/70 p-1 rounded-lg flex-shrink-0">
                <button 
                    onClick={() => setActiveTab('strategic')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'strategic' ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}
                >
                    전략 바둑
                </button>
                <button 
                    onClick={() => setActiveTab('playful')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'playful' ? 'bg-yellow-600' : 'text-gray-400 hover:bg-gray-700/50'}`}
                >
                    놀이 바둑
                </button>
                <button 
                    onClick={() => setActiveTab('championship')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'championship' ? 'bg-purple-600' : 'text-gray-400 hover:bg-gray-700/50'}`}
                >
                    챔피언십
                </button>
            </div>
            <div className="flex-grow overflow-y-auto pr-1 text-xs flex flex-col gap-1 min-h-0 h-48">
                <>
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
                </>
            </div>
        </div>
    );
};

export default BadukRankingBoard;