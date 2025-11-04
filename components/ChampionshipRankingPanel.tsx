import React, { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../hooks/useAppContext.js';
import { LeagueTier, User } from '../types.js';
import { LEAGUE_DATA, RANKING_TIERS, AVATAR_POOL, BORDER_POOL } from '../constants.js';
import Avatar from './Avatar.js';
import LeagueTierInfoModal from './LeagueTierInfoModal.js';

interface RankItemProps {
    user: User;
    rank: number;
    isMyRankDisplay: boolean;
}

const RankItem: React.FC<RankItemProps> = ({ user, rank, isMyRankDisplay }) => {
    const { currentUserWithStatus, handlers } = useAppContext();
    if (!currentUserWithStatus) return null;

    const score = user.tournamentScore || 0;

    const rankDisplay = useMemo(() => {
        if (rank === 1) return <span className="text-3xl" role="img" aria-label="Gold Trophy">🥇</span>;
        if (rank === 2) return <span className="text-3xl" role="img" aria-label="Silver Trophy">🥈</span>;
        if (rank === 3) return <span className="text-3xl" role="img" aria-label="Bronze Trophy">🥉</span>;
        return <span className="text-2xl font-bold text-gray-300">{rank}</span>;
    }, [rank]);

    const isCurrentUserInList = !isMyRankDisplay && user.id === currentUserWithStatus.id;
    const baseClass = 'flex items-center rounded-lg';
    const myRankClass = 'bg-yellow-900/40 border border-yellow-700';
    const highlightClass = 'bg-blue-900/60 border border-blue-600';
    const defaultClass = 'bg-gray-900/50';
    
    const isClickable = !isMyRankDisplay && user.id !== currentUserWithStatus.id;
    const finalClass = `${baseClass} ${isMyRankDisplay ? myRankClass : (isCurrentUserInList ? highlightClass : defaultClass)} p-1.5 lg:p-2 ${isClickable ? 'cursor-pointer hover:bg-gray-700/50' : ''}`;
    const avatarUrl = AVATAR_POOL.find(a => a.id === user.avatarId)?.url;
    const borderUrl = BORDER_POOL.find(b => b.id === user.borderId)?.url;
    const leagueInfo = LEAGUE_DATA.find(l => l.tier === user.league);
    const tierImage = leagueInfo?.icon;

    return (
        <li
            className={finalClass}
            onClick={isClickable ? () => handlers.openViewingUser(user.id) : undefined}
            title={isClickable ? `${user.nickname} 프로필 보기` : ''}
        >
            <div className="w-12 text-center flex-shrink-0 flex flex-col items-center justify-center">
                {rankDisplay}
            </div>
            {tierImage && <img src={tierImage} alt={user.league} className="w-8 h-8 mr-2 flex-shrink-0" title={user.league} />}
            <Avatar userId={user.id} userName={user.nickname} size={32} avatarUrl={avatarUrl} borderUrl={borderUrl} />
            <div className="ml-2 lg:ml-3 flex-grow overflow-hidden">
                <p className="font-semibold text-sm truncate">{user.nickname}</p>
                <p className="text-xs text-yellow-400 font-mono">{score.toLocaleString()}점</p>
            </div>
        </li>
    );
};

const ChampionshipRankingPanel: React.FC = () => {
    const { currentUserWithStatus, allUsers, handlers } = useAppContext();
    const [selectedTier, setSelectedTier] = useState<LeagueTier>(LEAGUE_DATA[0].tier);
    const [isLeagueTierInfoModalOpen, setIsLeagueTierInfoModalOpen] = useState(false);

    useEffect(() => {
        if (currentUserWithStatus?.league) {
            setSelectedTier(currentUserWithStatus.league);
        }
    }, [currentUserWithStatus?.league]);

    const sortedUsers = useMemo(() => {
        if (!currentUserWithStatus) return [];
        return [...allUsers]
            .filter(u => u.league === selectedTier && typeof u.tournamentScore === 'number')
            .sort((a, b) => b.tournamentScore - a.tournamentScore);
    }, [allUsers, selectedTier, currentUserWithStatus]);
    
    const myOwnLeagueData = useMemo(() => {
        if (!currentUserWithStatus) return { rank: -1, user: null };
        const usersInMyLeague = [...allUsers]
            .filter(u => u.league === currentUserWithStatus.league && typeof u.tournamentScore === 'number')
            .sort((a, b) => b.tournamentScore - a.tournamentScore);
        const myRankIndex = usersInMyLeague.findIndex(u => u.id === currentUserWithStatus.id);
        return {
            rank: myRankIndex !== -1 ? myRankIndex + 1 : -1,
            user: myRankIndex !== -1 ? usersInMyLeague[myRankIndex] : null
        };
    }, [allUsers, currentUserWithStatus]);
    
    if (!currentUserWithStatus) {
        return (
             <div className="bg-gray-800 rounded-lg p-4 flex flex-col shadow-lg h-full min-h-0 items-center justify-center text-gray-500">
                랭킹 정보를 불러오는 중...
            </div>
        );
    }

    const topUsers = sortedUsers.slice(0, 100);

    return (
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col shadow-lg h-full min-h-0">
            {isLeagueTierInfoModalOpen && <LeagueTierInfoModal onClose={() => setIsLeagueTierInfoModalOpen(false)} />}
            <div className="flex justify-between items-center mb-3 border-b border-gray-700 pb-2 flex-shrink-0">
                <h2 className="text-xl font-bold">챔피언십 랭킹</h2>
                <button 
                    onClick={() => setIsLeagueTierInfoModalOpen(true)}
                    className="text-xs bg-gray-600 hover:bg-gray-500 text-white font-bold px-2 py-1 rounded-md transition-colors"
                >
                    티어 안내
                </button>
            </div>
            <div className="flex flex-nowrap justify-start bg-gray-900/50 p-1 rounded-lg mb-3 flex-shrink-0 gap-1 tier-tabs-container overflow-x-auto">
                {LEAGUE_DATA.map(league => (
                    <button
                        key={league.tier}
                        onClick={() => setSelectedTier(league.tier)}
                        className={`p-1 rounded-md transition-all duration-200 flex-shrink-0 ${selectedTier === league.tier ? 'bg-purple-600 ring-2 ring-purple-400' : 'hover:bg-gray-600'}`}
                        title={league.name}
                    >
                        <img src={league.icon} alt={league.name} className="w-10 h-10" />
                    </button>
                ))}
            </div>
            {myOwnLeagueData.user && (
              <div className="flex-shrink-0 mb-3">
                  <RankItem user={myOwnLeagueData.user} rank={myOwnLeagueData.rank} isMyRankDisplay={true} />
              </div>
            )}
            <ul key={selectedTier} className="space-y-2 overflow-y-auto pr-2 flex-grow min-h-0">
                 {topUsers.length > 0 ? topUsers.map((user, index) => <RankItem key={user.id} user={user} rank={index + 1} isMyRankDisplay={false} />) : (
                    <p className="text-center text-gray-500 pt-8">{selectedTier} 리그에 랭크된 유저가 없습니다.</p>
                 )}
            </ul>
        </div>
    );
};

export default ChampionshipRankingPanel;
