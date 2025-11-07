import React, { useState, useMemo } from 'react';
import { useAppContext } from '../hooks/useAppContext.js';
import { User } from '../types.js';
import Avatar from './Avatar.js';
import { AVATAR_POOL, BORDER_POOL } from '../constants';

interface BadukRankingBoardProps {
    isTopmost?: boolean;
}

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
            className={`flex items-center p-1 rounded-md ${isCurrentUser ? 'bg-blue-500/30' : onViewUser ? 'cursor-pointer hover:bg-secondary/50' : ''}`}
            onClick={handleClick}
            title={!isCurrentUser && onViewUser ? `${user.nickname} 프로필 보기` : ''}
        >
            <span className="w-8 text-center font-bold">{rank}</span>
            <Avatar userId={user.id} userName={user.nickname} avatarUrl={avatarUrl} borderUrl={borderUrl} size={24} />
            <span className="flex-1 truncate font-semibold ml-2">{user.nickname}</span>
            <span className="w-16 text-right font-mono">{value.toLocaleString()}</span>
        </div>
    );
};

const BadukRankingBoard: React.FC<BadukRankingBoardProps> = ({ isTopmost }) => {
    const { allUsers, currentUserWithStatus, handlers } = useAppContext();
    const [activeTab, setActiveTab] = useState<'strategic' | 'playful' | 'championship'>('strategic');

    const rankings = useMemo(() => {
        if (!allUsers || allUsers.length === 0) {
            console.log('[BadukRankingBoard] No users available');
            return [];
        }
        
        if (activeTab === 'championship') {
            // 챔피언십: dailyRankings에 저장된 순위 사용 (매일 0시 정산된 값)
            const result = allUsers
                .filter(user => user && user.id && user.dailyRankings?.championship)
                .map(user => ({
                    user,
                    value: user.dailyRankings!.championship!.score,
                    rank: user.dailyRankings!.championship!.rank
                }))
                .sort((a, b) => a.rank - b.rank) // 순위 순으로 정렬
                .slice(0, 50); // 상위 50위까지만 표시
            console.log('[BadukRankingBoard] Championship rankings (daily):', result.length, 'users');
            return result;
        } else {
            const mode = activeTab === 'strategic' ? 'strategic' : 'playful';
            // 전략바둑/놀이바둑: dailyRankings에 저장된 순위 사용 (매일 0시 정산된 값)
            const result = allUsers
                .filter(user => user && user.id && user.dailyRankings?.[mode])
                .map(user => ({
                    user,
                    value: user.dailyRankings![mode]!.score,
                    rank: user.dailyRankings![mode]!.rank
                }))
                .sort((a, b) => a.rank - b.rank) // 순위 순으로 정렬
                .slice(0, 50); // 상위 50위까지만 표시
            console.log('[BadukRankingBoard]', mode, 'rankings (daily):', result.length, 'users');
            return result;
        }
    }, [allUsers, activeTab]);

    const currentUserRanking = useMemo(() => {
        if (!currentUserWithStatus) return null;
        
        if (activeTab === 'championship') {
            const dailyRanking = currentUserWithStatus.dailyRankings?.championship;
            if (dailyRanking) {
                return { user: currentUserWithStatus, value: dailyRanking.score, rank: dailyRanking.rank };
            }
            return { user: currentUserWithStatus, value: 0, rank: 'N/A' };
        } else {
            const mode = activeTab === 'strategic' ? 'strategic' : 'playful';
            const dailyRanking = currentUserWithStatus.dailyRankings?.[mode];
            if (dailyRanking) {
                return { user: currentUserWithStatus, value: dailyRanking.score, rank: dailyRanking.rank };
            }
            return { user: currentUserWithStatus, value: 0, rank: 'N/A' };
        }
    }, [currentUserWithStatus, activeTab]);

    return (
        <div className="bg-panel border border-color text-on-panel rounded-lg p-2 flex flex-col gap-2 h-full">
            <h3 className="text-center font-semibold text-secondary text-sm flex-shrink-0">바둑 랭킹</h3>
            <div className="flex bg-gray-900/70 p-1 rounded-lg flex-shrink-0">
                <button 
                    onClick={() => setActiveTab('strategic')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'strategic' ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}
                >
                    전략바둑
                </button>
                <button 
                    onClick={() => setActiveTab('playful')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'playful' ? 'bg-yellow-600' : 'text-gray-400 hover:bg-gray-700/50'}`}
                >
                    놀이바둑
                </button>
                <button 
                    onClick={() => setActiveTab('championship')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'championship' ? 'bg-purple-600' : 'text-gray-400 hover:bg-gray-700/50'}`}
                >
                    챔피언십
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

export default BadukRankingBoard;