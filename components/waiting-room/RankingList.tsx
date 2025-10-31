import React, { useMemo, useState, useCallback } from 'react';
import { User, UserWithStatus, GameMode } from '../../types.js';
import Avatar from '../Avatar.js';
import { RANKING_TIERS, AVATAR_POOL, BORDER_POOL } from '../../constants.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import Button from '../Button.js';

interface RankingListProps {
    currentUser: UserWithStatus;
    mode: GameMode;
    onViewUser: (userId: string) => void;
    onShowTierInfo: () => void;
    onShowPastRankings: (info: { user: UserWithStatus; mode: GameMode }) => void;
}

const getTier = (rank: number, totalPlayers: number) => {
    if (totalPlayers === 0) return RANKING_TIERS[RANKING_TIERS.length - 1];
    for (const tier of RANKING_TIERS) {
        if (tier.threshold(rank, totalPlayers)) {
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


const RankingList: React.FC<RankingListProps> = ({ currentUser, mode, onViewUser, onShowTierInfo, onShowPastRankings }) => {
    const { allUsers } = useAppContext();

    const allRankedUsers = useMemo(() => {
        return [...allUsers]
            .filter(u => u.stats?.[mode])
            .sort((a, b) => (b.stats![mode].rankingScore || 0) - (a.stats![mode].rankingScore || 0));
    }, [allUsers, mode]);

    const eligibleRankedUsers = useMemo(() => {
        return allRankedUsers.filter(u => {
            const stats = u.stats?.[mode];
            return stats && (stats.wins + stats.losses) >= 20;
        });
    }, [allRankedUsers, mode]);
    
    const totalEligiblePlayers = eligibleRankedUsers.length;
    const sproutTier = RANKING_TIERS[RANKING_TIERS.length - 1];

    const myRankIndex = allRankedUsers.findIndex(u => u.id === currentUser.id);
    const myRankData = myRankIndex !== -1 ? { user: allRankedUsers[myRankIndex], rank: myRankIndex + 1 } : null;

    const topUsers = allRankedUsers.slice(0, 100);

    const getTierForUser = useCallback((user: User) => {
        const stats = user.stats?.[mode];
        if (!stats || (stats.wins + stats.losses) < 20) {
            return sproutTier;
        }
        
        const rankAmongEligible = eligibleRankedUsers.findIndex(u => u.id === user.id) + 1;
        if (rankAmongEligible === 0) { // Should not happen if they are eligible, but as a fallback
            return sproutTier;
        }

        return getTier(rankAmongEligible, totalEligiblePlayers);
    }, [mode, eligibleRankedUsers, totalEligiblePlayers, sproutTier]);


    const renderRankItem = useCallback((user: User, rank: number, isMyRankDisplay: boolean) => {
        const stats = user.stats?.[mode];
        if (!stats) return null;
        
        const winRate = (stats.wins + stats.losses) > 0 ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100) : 0;
        const score = stats.rankingScore || 1200;
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
                    <p className="text-xs text-highlight font-mono">{score}점</p>
                </div>
                <div className="text-right text-[10px] lg:text-xs flex-shrink-0 w-20 text-tertiary">
                    <p>{stats.wins}승 {stats.losses}패</p>
                    <p className="font-semibold">{winRate}%</p>
                </div>
            </li>
        );
    }, [mode, currentUser.id, getTierForUser, onViewUser]);

    return (
        <div className="p-4 flex flex-col text-on-panel">
            <div className="flex justify-between items-center mb-3 border-b border-color pb-2 flex-shrink-0 flex-wrap gap-2">
                <h2 className="text-xl font-semibold">{mode} 랭킹 ({getCurrentSeasonName()})</h2>
                <div className="flex items-center gap-2">
                    <Button 
                        onClick={() => onShowPastRankings({ user: currentUser, mode })}
                        className="!text-xs !py-1"
                        colorScheme='gray'
                    >
                        지난 랭킹
                    </Button>
                    <Button 
                        onClick={onShowTierInfo}
                        className="!text-xs !py-1"
                        colorScheme='gray'
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
                 {topUsers.length > 0 ? topUsers.map((user, index) => renderRankItem(user, index + 1, false)) : (
                     <p className="text-center text-tertiary pt-8">랭킹 정보가 없습니다.</p>
                 )}
            </ul>
        </div>
    );
};

export default RankingList;