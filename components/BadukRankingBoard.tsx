import React, { useState, useMemo } from 'react';
import { useAppContext } from '../hooks/useAppContext.js';
import { User } from '../types.js';
import Avatar from './Avatar.js';
import { AVATAR_POOL, BORDER_POOL, SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES } from '../constants';

interface BadukRankingBoardProps {
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

const BadukRankingBoard: React.FC<BadukRankingBoardProps> = ({ isTopmost }) => {
    const { allUsers, currentUserWithStatus, handlers } = useAppContext();
    const [activeTab, setActiveTab] = useState<'strategic' | 'playful' | 'championship'>('strategic');

    const rankings = useMemo(() => {
        if (!allUsers || allUsers.length === 0) {
            return [];
        }
        
        if (activeTab === 'championship') {
            // 챔피언십: 누적랭킹점수(cumulativeTournamentScore) 사용
            const result = allUsers
                .filter(user => user && user.id)
                .map(user => ({
                    user,
                    value: user.cumulativeTournamentScore || 0
                }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 50)
                .map((entry, index) => ({
                    ...entry,
                    rank: index + 1
                }));
            if (IS_DEV) {
                console.debug('[BadukRankingBoard] Championship rankings (cumulative):', result.length, 'users');
            }
            return result;
        } else {
            const mode = activeTab === 'strategic' ? 'strategic' : 'playful';
            const gameModes = mode === 'strategic' ? SPECIAL_GAME_MODES : PLAYFUL_GAME_MODES;
            const scoreMode = mode === 'strategic' ? 'standard' : 'playful';
            
            // 10판 이상의 대국을 한 유저는 모두 표시 (점수가 없어도 포함)
            const result = allUsers
                .filter(user => {
                    if (!user || !user.id) return false;
                    // 총 게임 수 계산 (모든 종류의 전략바둑 또는 놀이바둑 경기의 누적 판수)
                    let totalGames = 0;
                    if (user.stats) {
                        for (const gameMode of gameModes) {
                            const gameStats = user.stats[gameMode.mode];
                            if (gameStats) {
                                totalGames += (gameStats.wins || 0) + (gameStats.losses || 0);
                            }
                        }
                    }
                    // 10판 이상이면 포함 (점수와 무관)
                    return totalGames >= 10;
                })
                .map(user => {
                    // dailyRankings가 있으면 우선 사용
                    if (user.dailyRankings?.[mode]) {
                        return {
                            user,
                            value: user.dailyRankings[mode].score,
                            rank: user.dailyRankings[mode].rank
                        };
                    } else {
                        // 없으면 cumulativeRankingScore 사용 (차이값 그대로 표시)
                        return {
                            user,
                            value: user.cumulativeRankingScore?.[scoreMode] ?? 0
                        };
                    }
                })
                .sort((a, b) => {
                    // rank가 있으면 rank 기준으로 정렬, 없으면 점수 기준으로 정렬
                    if (a.rank !== undefined && b.rank !== undefined) {
                        return a.rank - b.rank;
                    }
                    return b.value - a.value;
                })
                .slice(0, 50)
                .map((entry, index) => ({
                    ...entry,
                    rank: entry.rank ?? (index + 1)
                }));
            
            if (IS_DEV) {
                console.debug('[BadukRankingBoard]', mode, 'rankings:', result.length, 'users');
            }
            return result;
        }
    }, [allUsers, activeTab]);

    const currentUserRanking = useMemo(() => {
        if (!currentUserWithStatus) return null;
        
        // rankings에서 현재 유저 찾기
        const rank = rankings.findIndex(r => r.user && r.user.id === currentUserWithStatus.id);
        if (rank !== -1) {
            return { user: currentUserWithStatus, value: rankings[rank].value, rank: rankings[rank].rank };
        }
        
        // rankings에 없으면 값만 계산 (10판 이상이어야 표시)
        if (activeTab === 'championship') {
            // 누적랭킹점수 사용
            const cumulativeScore = currentUserWithStatus.cumulativeTournamentScore || 0;
            // 전체 유저 중에서 순위 계산
            const allScores = allUsers
                .filter(u => u && u.id)
                .map(u => u.cumulativeTournamentScore || 0)
                .sort((a, b) => b - a);
            const rank = allScores.findIndex(score => score <= cumulativeScore) + 1;
            return { user: currentUserWithStatus, value: cumulativeScore, rank: rank || 'N/A' };
        } else {
            const mode = activeTab === 'strategic' ? 'strategic' : 'playful';
            const scoreMode = mode === 'strategic' ? 'standard' : 'playful';
            const gameModes = mode === 'strategic' ? SPECIAL_GAME_MODES : PLAYFUL_GAME_MODES;
            
            // 총 게임 수 계산
            let totalGames = 0;
            if (currentUserWithStatus.stats) {
                for (const gameMode of gameModes) {
                    const gameStats = currentUserWithStatus.stats[gameMode.mode];
                    if (gameStats) {
                        totalGames += (gameStats.wins || 0) + (gameStats.losses || 0);
                    }
                }
            }
            
            // 10판 미만이면 null 반환 (표시하지 않음)
            if (totalGames < 10) {
                return null;
            }
            
            const dailyRanking = currentUserWithStatus.dailyRankings?.[mode];
            if (dailyRanking) {
                return { user: currentUserWithStatus, value: dailyRanking.score, rank: dailyRanking.rank };
            }
            // cumulativeRankingScore는 차이값 그대로 표시
            return { user: currentUserWithStatus, value: currentUserWithStatus.cumulativeRankingScore?.[scoreMode] || 0, rank: 'N/A' };
        }
    }, [currentUserWithStatus, activeTab, rankings, allUsers]);

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