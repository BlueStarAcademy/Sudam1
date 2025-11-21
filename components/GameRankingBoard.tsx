import React, { useState, useMemo } from 'react';
import { useAppContext } from '../hooks/useAppContext.js';
import { User } from '../types.js';
import Avatar from './Avatar.js';
import { AVATAR_POOL, BORDER_POOL } from '../constants';
import { calculateTotalStats } from '../services/statService.js';

interface GameRankingBoardProps {
    isTopmost?: boolean;
}

const IS_DEV = import.meta.env.DEV;

const RankingRow = ({ user, rank, value, isCurrentUser, onViewUser }: { user: User, rank: number, value: number, isCurrentUser: boolean, onViewUser?: (userId: string) => void }) => {
    const avatarUrl = useMemo(() => AVATAR_POOL.find(a => a.id === user.avatarId)?.url, [user.avatarId]);
    const borderUrl = useMemo(() => BORDER_POOL.find(b => b.id === user.borderId)?.url, [user.borderId]);

    const handleClick = () => {
        if (!isCurrentUser && onViewUser) {
            onViewUser(user.id);
        }
    };

    return (
        <div 
            className={`flex items-center p-2 rounded-md ${isCurrentUser ? 'bg-blue-500/30' : onViewUser ? 'cursor-pointer hover:bg-secondary/50' : ''}`}
            onClick={handleClick}
            title={!isCurrentUser && onViewUser ? `${user.nickname} 프로필 보기` : ''}
        >
            <span className="w-10 text-center font-bold text-sm">{rank}</span>
            <Avatar userId={user.id} userName={user.nickname} avatarUrl={avatarUrl} borderUrl={borderUrl} size={32} />
            <span className="flex-1 truncate font-semibold ml-2 text-sm">{user.nickname}</span>
            <span className="w-20 text-right font-mono text-sm">{value.toLocaleString()}</span>
        </div>
    );
};

const GameRankingBoard: React.FC<GameRankingBoardProps> = ({ isTopmost }) => {
    const { allUsers, currentUserWithStatus, handlers } = useAppContext();
    const [activeTab, setActiveTab] = useState<'combat' | 'manner'>('combat');

    const rankings = useMemo(() => {
        if (!allUsers || allUsers.length === 0) {
            return [];
        }
        
        if (activeTab === 'combat') {
            const result = allUsers
                .filter(user => user && user.id && user.inventory !== undefined)
                .map(user => {
                    try {
                        const totalStats = calculateTotalStats(user);
                        const sum = Object.values(totalStats).reduce((acc, value) => acc + value, 0);
                        return { user, value: sum };
                    } catch (error) {
                        console.error('[GameRankingBoard] Error calculating stats for user:', user?.id, error);
                        return { user, value: 0 };
                    }
                })
                .filter(item => item.value >= 0) // 에러가 발생한 경우 제외
                .sort((a, b) => b.value - a.value)
                .slice(0, 50); // 상위 50위까지만 표시
            if (IS_DEV) {
                console.debug('[GameRankingBoard] Combat rankings:', result.length, 'users');
            }
            return result;
        } else {
            const result = allUsers
                .filter(user => user && user.id)
                .map(user => ({ user, value: user.mannerScore || 0 }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 50); // 상위 50위까지만 표시
            if (IS_DEV) {
                console.debug('[GameRankingBoard] Manner rankings:', result.length, 'users');
            }
            return result;
        }
    }, [allUsers, activeTab]);

    const currentUserRanking = useMemo(() => {
        if (!currentUserWithStatus) return null;
        const rank = rankings.findIndex(r => r.user && r.user.id === currentUserWithStatus.id);
        if (rank !== -1) {
            return { ...rankings[rank], rank: rank + 1 };
        }
        
        let value;
        if (activeTab === 'combat') {
            const totalStats = calculateTotalStats(currentUserWithStatus);
            value = Object.values(totalStats).reduce((acc, val) => acc + val, 0);
        } else {
            value = currentUserWithStatus.mannerScore;
        }
        
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
                    바둑능력
                </button>
                <button 
                    onClick={() => setActiveTab('manner')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'manner' ? 'bg-yellow-600' : 'text-gray-400 hover:bg-gray-700/50'}`}
                >
                    매너
                </button>
            </div>
            <div className="flex-grow overflow-y-auto pr-1 text-xs flex flex-col gap-1 min-h-0 h-48">
                {rankings.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                        {allUsers.length === 0 ? '데이터 로딩 중...' : '랭킹 데이터가 없습니다.'}
                    </div>
                ) : (
                    <>
                        {currentUserRanking && (
                            <div className="sticky top-0 bg-panel z-10">
                                <RankingRow user={currentUserRanking.user} rank={currentUserRanking.rank as number} value={currentUserRanking.value} isCurrentUser={true} />
                            </div>
                        )}
                        <div className="flex flex-col gap-1">
                            {rankings.filter(r => r && r.user && r.user.id).map((r, i) => (
                                <RankingRow key={r.user.id} user={r.user} rank={i + 1} value={r.value} isCurrentUser={false} onViewUser={handlers.openViewingUser} />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default GameRankingBoard;