import React, { useMemo, useState, useCallback } from 'react';
import { User, UserWithStatus, GameMode } from '../../types.js';
import Avatar from '../Avatar.js';
import { RANKING_TIERS, AVATAR_POOL, BORDER_POOL, SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES } from '../../constants';
import { useAppContext } from '../../hooks/useAppContext.js';
import Button from '../Button.js';

interface RankingListProps {
    currentUser: UserWithStatus;
    mode: GameMode | 'strategic' | 'playful';
    onViewUser: (userId: string) => void;
    onShowTierInfo: () => void;
    onShowPastRankings: (info: { user: UserWithStatus; mode: GameMode | 'strategic' | 'playful' }) => void;
    lobbyType: 'strategic' | 'playful';
}

const getTier = (score: number, rank: number, totalGames: number) => {
    for (const tier of RANKING_TIERS) {
        if (tier.threshold(score, rank, totalGames)) {
            return tier;
        }
    }
    return RANKING_TIERS[RANKING_TIERS.length - 1];
};

const getCurrentSeasonName = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = now.getMonth(); // 0-11
    let season;
    if (month < 3) season = 1;      // Jan, Feb, Mar
    else if (month < 6) season = 2; // Apr, May, Jun
    else if (month < 9) season = 3; // Jul, Aug, Sep
    else season = 4;                // Oct, Nov, Dec
    return `${year}-${season}시즌`;
};


const RankingList: React.FC<RankingListProps> = ({ currentUser, mode, onViewUser, onShowTierInfo, onShowPastRankings, lobbyType }) => {
    const { allUsers } = useAppContext();

    const allRankedUsers = useMemo(() => {
        const gameModes = lobbyType === 'strategic' ? SPECIAL_GAME_MODES : PLAYFUL_GAME_MODES;
        const scoreMode = lobbyType === 'strategic' ? 'standard' : 'playful';
        const mode = lobbyType;
        
        // 10판 이상의 대국을 한 유저는 모두 표시 (점수가 없어도 포함)
        return allUsers
            .filter(u => {
                if (!u || !u.id) return false;
                // 총 게임 수 계산 (모든 종류의 전략바둑 또는 놀이바둑 경기의 누적 판수)
                let totalGames = 0;
                if (u.stats) {
                    for (const gameMode of gameModes) {
                        const gameStats = u.stats[gameMode.mode];
                        if (gameStats) {
                            totalGames += (gameStats.wins || 0) + (gameStats.losses || 0);
                        }
                    }
                }
                // 10판 이상이면 포함 (점수와 무관)
                return totalGames >= 10;
            })
            .map(u => {
                // dailyRankings가 있으면 우선 사용 (현재 시즌 랭킹점수)
                // dailyRankings.score는 1200에서의 차이값이므로 1200을 더해서 실제 점수로 표시
                if (u.dailyRankings?.[mode]) {
                    return {
                        ...u,
                        avgScore: 1200 + u.dailyRankings[mode].score,
                        rank: u.dailyRankings[mode].rank
                    };
                } else {
                    // 없으면 시즌 시작 시 초기값인 1200점 사용 (현재 시즌 랭킹점수)
                    return { ...u, avgScore: 1200 };
                }
            })
            .sort((a, b) => {
                // rank가 있으면 rank 기준으로 정렬, 없으면 점수 기준으로 정렬
                if ((a as any).rank !== undefined && (b as any).rank !== undefined) {
                    return (a as any).rank - (b as any).rank;
                }
                return b.avgScore - a.avgScore;
            });
    }, [allUsers, lobbyType]);

    const eligibleRankedUsers = useMemo(() => {
        const gameModes = lobbyType === 'strategic' ? SPECIAL_GAME_MODES : PLAYFUL_GAME_MODES;
        return allRankedUsers.filter(u => {
            let totalGames = 0;
            for (const game of gameModes) {
                const gameStats = u.stats?.[game.mode];
                if (gameStats) {
                    totalGames += (gameStats.wins || 0) + (gameStats.losses || 0);
                }
            }
            return totalGames >= 10;
        });
    }, [allRankedUsers, lobbyType]);
    
    const totalEligiblePlayers = eligibleRankedUsers.length;
    const sproutTier = RANKING_TIERS[RANKING_TIERS.length - 1];

    const myRankIndex = allRankedUsers.findIndex(u => u.id === currentUser.id);
    const myRankData = myRankIndex !== -1 ? { 
        user: allRankedUsers[myRankIndex], 
        rank: (allRankedUsers[myRankIndex] as any).rank || (myRankIndex + 1), 
        score: allRankedUsers[myRankIndex].avgScore 
    } : null;

    const topUsers = allRankedUsers.slice(0, 50);

    const getTierForUser = useCallback((user: User & { avgScore: number }) => {
        const rankAmongEligible = eligibleRankedUsers.findIndex(u => u.id === user.id) + 1;
        if (rankAmongEligible === 0) { // Should not happen if they are eligible, but as a fallback
            return sproutTier;
        }

        const gameModes = lobbyType === 'strategic' ? SPECIAL_GAME_MODES : PLAYFUL_GAME_MODES;
        let totalGames = 0;
        for (const game of gameModes) {
            const gameStats = user.stats?.[game.mode];
            if (gameStats) {
                totalGames += (gameStats.wins || 0) + (gameStats.losses || 0);
            }
        }

        return getTier(user.avgScore, rankAmongEligible, totalGames);
    }, [lobbyType, eligibleRankedUsers, sproutTier]);


    const renderRankItem = useCallback((user: User & { avgScore: number }, rank: number, isMyRankDisplay: boolean) => {
        const gameModes = lobbyType === 'strategic' ? SPECIAL_GAME_MODES : PLAYFUL_GAME_MODES;
        let wins = 0;
        let losses = 0;
        for (const game of gameModes) {
            const gameStats = user.stats?.[game.mode];
            if (gameStats) {
                wins += gameStats.wins || 0;
                losses += gameStats.losses || 0;
            }
        }

        const winRate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
        const score = user.avgScore;
        const tier = getTierForUser(user);
        
        const isCurrentUserInList = !isMyRankDisplay && user.id === currentUser.id;
        const baseClass = 'flex items-center gap-2 rounded-lg';
        const myRankClass = 'bg-yellow-900/40 border border-yellow-700';
        const highlightClass = 'bg-blue-900/60 border border-blue-600';
        const defaultClass = 'bg-tertiary/50';

        const isClickable = !isMyRankDisplay && user.id !== currentUser.id;
        const finalClass = `${baseClass} ${isMyRankDisplay ? myRankClass : (isCurrentUserInList ? highlightClass : defaultClass)} p-1.5 ${isClickable ? 'cursor-pointer hover:bg-secondary/50' : ''}`;
        const avatarUrl = AVATAR_POOL.find(a => a.id === user.avatarId)?.url;
        const borderUrl = BORDER_POOL.find(b => b.id === user.borderId)?.url;
        
        return (
            <li 
                key={user.id} 
                className={finalClass}
                onClick={isClickable ? () => onViewUser(user.id) : undefined}
                title={isClickable ? `${user.nickname} 프로필 보기` : ''}
            >
                <span className="w-8 text-center font-mono text-sm">{rank}</span>
                <img src={tier.icon} alt={tier.name} className="w-8 h-8 flex-shrink-0" title={tier.name}/>
                <Avatar userId={user.id} userName={user.nickname} size={32} avatarUrl={avatarUrl} borderUrl={borderUrl} />
                <div className="flex-grow overflow-hidden">
                    <p className="font-semibold text-sm truncate">{user.nickname}</p>
                    <p className="text-xs text-highlight font-mono">{Math.round(score)}점</p>
                </div>
                <div className="text-right text-[10px] lg:text-xs flex-shrink-0 w-20 text-tertiary">
                    <p>{wins}승 {losses}패</p>
                    <p className="font-semibold">{winRate}%</p>
                </div>
            </li>
        );
    }, [lobbyType, currentUser.id, getTierForUser, onViewUser]);

    const rankingTitle = lobbyType === 'strategic' ? '전략바둑 랭킹' : lobbyType === 'playful' ? '놀이바둑 랭킹' : `${mode} 랭킹`;

    return (
        <div className="p-4 flex flex-col text-on-panel">
            <div className="flex justify-between items-center mb-3 border-b border-color pb-2 flex-shrink-0 flex-wrap gap-2">
                <h2 className="text-xl font-semibold">{rankingTitle} ({getCurrentSeasonName()})</h2>
                <div className="flex items-center gap-2">
                    <Button 
                        onClick={() => onShowPastRankings({ user: currentUser, mode })}
                        colorScheme="none"
                        className="!text-xs !py-1 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white font-bold rounded-lg shadow-lg transition-all duration-200"
                    >
                        지난 랭킹
                    </Button>
                    <Button 
                        onClick={onShowTierInfo}
                        colorScheme="none"
                        className="!text-xs !py-1 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white font-bold rounded-lg shadow-lg transition-all duration-200"
                    >
                        티어 안내
                    </Button>
                </div>
            </div>
            
            {myRankData && (
                <div className="flex-shrink-0 mb-3">
                    {renderRankItem(myRankData.user, myRankData.rank, true)}
                </div>
            )}

            <ul className="space-y-2 overflow-y-auto pr-2 h-72">
                 {topUsers.length > 0 ? topUsers.map((user, index) => {
                     const rank = (user as any).rank || (index + 1);
                     return renderRankItem(user, rank, false);
                 }) : (
                     <p className="text-center text-tertiary pt-8">랭킹 정보가 없습니다.</p>
                 )}
            </ul>
        </div>
    );
};

export default RankingList;