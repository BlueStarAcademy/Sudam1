import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { UserWithStatus, TournamentState, PlayerForTournament, ServerAction, User, CoreStat, Match, Round, CommentaryLine, TournamentType, LeagueTier } from '../types.js';
import Button from './Button.js';
import { TOURNAMENT_DEFINITIONS, BASE_TOURNAMENT_REWARDS, CONSUMABLE_ITEMS, AVATAR_POOL, BORDER_POOL, CORE_STATS_DATA } from '../constants.js';
import Avatar from './Avatar.js';
import RadarChart from './RadarChart.js';
import SgfViewer from './SgfViewer.js';
import { audioService } from '../services/audioService.js';

const KEY_STATS_BY_PHASE: Record<'early' | 'mid' | 'end', CoreStat[]> = {
    early: [CoreStat.CombatPower, CoreStat.ThinkingSpeed, CoreStat.Concentration],
    mid: [CoreStat.CombatPower, CoreStat.Judgment, CoreStat.Concentration, CoreStat.Stability],
    end: [CoreStat.Calculation, CoreStat.Stability, CoreStat.Concentration],
};

const getMaxStatValueForLeague = (league: LeagueTier): number => {
    switch (league) {
        case LeagueTier.Sprout:
        case LeagueTier.Rookie:
        case LeagueTier.Rising:
            return 250;
        case LeagueTier.Ace:
        case LeagueTier.Diamond:
            return 300;
        case LeagueTier.Master:
        case LeagueTier.Grandmaster:
            return 400;
        case LeagueTier.Challenger:
            return 500;
        default:
            return 250;
    }
};

interface TournamentBracketProps {
    tournamentState: TournamentState;
    currentUser: UserWithStatus;
    onBack: () => void;
    allUsersForRanking: User[];
    onViewUser: (userId: string) => void;
    onAction: (action: ServerAction) => void;
    onStartNextRound: () => void;
    onReset: () => void;
    onSkip: () => void;
    isMobile: boolean;
}

const PlayerProfilePanel: React.FC<{ 
    player: PlayerForTournament | null, 
    initialPlayer: PlayerForTournament | null,
    allUsers: User[], 
    currentUserId: string, 
    onViewUser: (userId: string) => void,
    highlightPhase: 'early' | 'mid' | 'end' | 'none';
}> = ({ player, initialPlayer, allUsers, currentUserId, onViewUser, highlightPhase }) => {
    
    if (!player) return <div className="p-2 text-center text-gray-500 flex items-center justify-center h-full bg-gray-900/50 rounded-lg">선수 대기 중...</div>;

    const fullUserData = useMemo(() => allUsers.find(u => u.id === player.id), [allUsers, player.id]);

    const cumulativeStats = useMemo(() => {
        const result = { wins: 0, losses: 0 };
        if (fullUserData?.stats) {
            Object.values(fullUserData.stats).forEach(s => {
                result.wins += s.wins;
                result.losses += s.losses;
            });
        }
        return result;
    }, [fullUserData]);

    const isClickable = !player.id.startsWith('bot-') && player.id !== currentUserId;
    const avatarUrl = AVATAR_POOL.find(a => a.id === player.avatarId)?.url;
    const borderUrl = BORDER_POOL.find(b => b.id === player.borderId)?.url;

    const isStatHighlighted = (stat: CoreStat) => {
        if (highlightPhase === 'none') return false;
        return KEY_STATS_BY_PHASE[highlightPhase].includes(stat);
    };
    
    return (
        <div className={`bg-gray-900/50 p-3 rounded-lg flex flex-col items-center gap-2 h-full ${isClickable ? 'cursor-pointer hover:bg-gray-700/50' : ''}`} onClick={isClickable ? () => onViewUser(player.id) : undefined} title={isClickable ? `${player.nickname} 프로필 보기` : ''}>
            <div className="flex items-center gap-2">
                 <Avatar userId={player.id} userName={player.nickname} avatarUrl={avatarUrl} borderUrl={borderUrl} size={40} />
                 <div>
                    <h4 className="font-bold text-base truncate">{player.nickname}</h4>
                    <p className="text-xs text-gray-400">({cumulativeStats.wins}승 {cumulativeStats.losses}패)</p>
                 </div>
            </div>
            <div className="font-bold text-sm mt-1 relative">
                컨디션: <span className="text-yellow-300">{player.condition === 1000 ? '-' : player.condition}</span>
            </div>
            <div className="w-full grid grid-cols-2 gap-x-1 sm:gap-x-3 gap-y-0.5 text-xs mt-2 border-t border-gray-600 pt-2">
                {Object.values(CoreStat).map(stat => {
                    const initialValue = initialPlayer?.stats?.[stat] ?? player.stats[stat];
                    const currentValue = player.stats[stat];
                    const change = currentValue - initialValue;

                    return (
                        <React.Fragment key={stat}>
                            <span className={`text-gray-400 ${isStatHighlighted(stat) ? 'text-yellow-400 font-bold' : ''}`}>{stat}</span>
                            <div className="flex justify-end items-baseline relative">
                                <span className={`font-mono text-white ${isStatHighlighted(stat) ? 'text-yellow-400 font-bold' : ''}`}>{player.stats[stat]}</span>
                                {initialPlayer && change !== 0 && (
                                     <span className={`ml-1 font-bold ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ({change > 0 ? '+' : ''}{change})
                                     </span>
                                )}
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

const SimulationProgressBar: React.FC<{ timeElapsed: number; totalDuration: number }> = ({ timeElapsed, totalDuration }) => {
    const progress = (timeElapsed / totalDuration) * 100;
    const earlyStage = Math.min(progress, (40 / 140) * 100);
    const midStage = Math.min(Math.max(0, progress - (40 / 140) * 100), (60 / 140) * 100);
    const endStage = Math.min(Math.max(0, progress - (100 / 140) * 100), (40 / 140) * 100);

    return (
        <div>
            <div className="w-full bg-gray-900 rounded-full h-2 flex border border-gray-600">
                <div className="bg-green-500 h-full rounded-l-full" style={{ width: `${earlyStage}%` }} title="초반전"></div>
                <div className="bg-yellow-500 h-full" style={{ width: `${midStage}%` }} title="중반전"></div>
                <div className="bg-red-500 h-full rounded-r-full" style={{ width: `${endStage}%` }} title="끝내기"></div>
            </div>
            <div className="flex text-xs text-gray-400 mt-1">
                <div style={{ width: `${(40/140)*100}%` }}>초반</div>
                <div style={{ width: `${(60/140)*100}%` }} className="text-center">중반</div>
                <div style={{ width: `${(40/140)*100}%` }} className="text-right">종반</div>
            </div>
        </div>
    );
};

const ScoreGraph: React.FC<{ p1Percent: number; p2Percent: number; p1Nickname?: string; p2Nickname?: string }> = ({ p1Percent, p2Percent, p1Nickname, p2Nickname }) => {
    return (
        <div>
            {p1Nickname && p2Nickname && (
                <div className="flex justify-between text-xs px-1 mb-1 font-bold">
                    <span className="truncate max-w-[45%]">흑: {p1Nickname}</span>
                    <span className="truncate max-w-[45%] text-right">백: {p2Nickname}</span>
                </div>
            )}
            <div className="flex w-full h-3 bg-gray-700 rounded-full overflow-hidden border-2 border-black/30 relative">
                <div className="bg-black transition-all duration-500 ease-in-out" style={{ width: `${p1Percent}%` }}></div>
                <div className="bg-white transition-all duration-500 ease-in-out" style={{ width: `${p2Percent}%` }}></div>
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gray-400/50" title="중앙"></div>
            </div>
        </div>
    );
};

const parseCommentary = (commentaryLine: CommentaryLine) => {
    const { text, isRandomEvent } = commentaryLine;
    if (text.startsWith('최종 결과 발표!') || text.startsWith('[최종결과]')) {
        return <strong className="text-yellow-400">{text}</strong>;
    }
    const leadRegex = /(\d+\.\d+집|\d+\.5집)/g;
    const parts = text.split(leadRegex);
    return <span className={isRandomEvent ? 'text-cyan-400' : ''}>{parts.map((part, index) => leadRegex.test(part) ? <strong key={index} className="text-yellow-400">{part}</strong> : part)}</span>;
};

const CommentaryPanel: React.FC<{ commentary: CommentaryLine[], isSimulating: boolean }> = ({ commentary, isSimulating }) => {
    const commentaryContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (commentaryContainerRef.current) {
            commentaryContainerRef.current.scrollTop = commentaryContainerRef.current.scrollHeight;
        }
    }, [commentary]);

    return (
        <div className="h-full flex flex-col min-h-0">
            <h4 className="text-center font-bold text-sm mb-2 text-gray-400 py-1 flex-shrink-0">
                실시간 중계
                {isSimulating && <span className="ml-2 text-yellow-400 animate-pulse">경기 진행 중...</span>}
            </h4>
            <div ref={commentaryContainerRef} className="flex-grow overflow-y-auto space-y-2 text-sm text-gray-300 p-2 bg-gray-900/40 rounded-md min-h-0">
                {commentary.length > 0 ? (
                    commentary.map((line, index) => <p key={index} className="animate-fade-in break-words">{parseCommentary(line)}</p>)
                ) : (
                    <p className="text-gray-500 text-center h-full flex items-center justify-center">경기 시작 대기 중...</p>
                )}
            </div>
        </div>
    );
};

const FinalRewardPanel: React.FC<{ tournamentState: TournamentState; currentUser: UserWithStatus; onAction: (action: ServerAction) => void }> = ({ tournamentState, currentUser, onAction }) => {
    const isTournamentFullyComplete = tournamentState.status === 'complete';
    const isUserEliminated = tournamentState.status === 'eliminated';

    if (!isTournamentFullyComplete) {
        if (isUserEliminated) {
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <h4 className="font-bold text-gray-400 mb-2">대회 종료</h4>
                    <p className="text-xs text-gray-500 mt-2 animate-pulse">다른 경기 결과를 기다리는 중...</p>
                </div>
            );
        }
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <h4 className="font-bold text-gray-400 mb-2">보상 내역</h4>
                <p className="text-xs text-gray-500 mt-2">경기 종료 후 표시됩니다.</p>
            </div>
        );
    }

    const { type, rounds } = tournamentState;
    const definition = TOURNAMENT_DEFINITIONS[type];
    const rewardInfo = BASE_TOURNAMENT_REWARDS[type];
    
    let userRank = -1;

    if (type === 'neighborhood') {
        const wins: Record<string, number> = {};
        tournamentState.players.forEach(p => { wins[p.id] = 0; });

        rounds[0].matches.forEach(m => {
            if (m.winner) {
                wins[m.winner.id] = (wins[m.winner.id] || 0) + 1;
            }
        });

        const sortedPlayers = [...tournamentState.players].sort((a, b) => wins[b.id] - wins[a.id]);
        
        let currentRank = -1;
        for (let i = 0; i < sortedPlayers.length; i++) {
            if (i === 0) {
                currentRank = 1;
            } else {
                if (wins[sortedPlayers[i].id] < wins[sortedPlayers[i-1].id]) {
                    currentRank = i + 1;
                }
            }
            if (sortedPlayers[i].id === currentUser.id) {
                userRank = currentRank;
                break;
            }
        }
    } else {
        const totalRounds = rounds.length;
        let lostInRound = -1;
        
        for (let i = 0; i < totalRounds; i++) {
            const round = rounds[i];
            const userMatch = round.matches.find(m => m.isUserMatch);
            if (userMatch && userMatch.winner?.id !== currentUser.id) {
                lostInRound = i;
                break;
            }
        }

        if (lostInRound === -1) {
            userRank = 1; // Winner
        } else {
            const playersInLostRound = definition.players / Math.pow(2, lostInRound);
            if (totalRounds === 3 && lostInRound === 1) { // 8-player, lost in semis
                 const thirdPlaceMatch = rounds.find(r => r.name === "3,4위전");
                 if (thirdPlaceMatch) {
                     const userWasIn3rdPlaceMatch = thirdPlaceMatch.matches.some(m => m.isUserMatch);
                     if (userWasIn3rdPlaceMatch) {
                         const won3rdPlace = thirdPlaceMatch.matches.some(m => m.isUserMatch && m.winner?.id === currentUser.id);
                         userRank = won3rdPlace ? 3 : 4;
                     } else {
                         userRank = 4;
                     }
                 } else {
                     userRank = 4;
                 }
            } else {
                 userRank = playersInLostRound;
            }
        }
    }

    let rewardKey: number;
    if (type === 'neighborhood') rewardKey = userRank <= 3 ? userRank : 4;
    else if (type === 'national') rewardKey = userRank <= 4 ? userRank : 5;
    else { // world
        if (userRank <= 4) rewardKey = userRank;
        else if (userRank <= 8) rewardKey = 5;
        else rewardKey = 9;
    }
    
    const reward = rewardInfo?.rewards[rewardKey];
    if (!reward) return <p className="text-gray-500 flex items-center justify-center h-full">획득한 보상이 없습니다.</p>;

    const rewardClaimedKey = `${type}RewardClaimed` as keyof User;
    const isClaimed = !!currentUser[rewardClaimedKey];

    const handleClaim = () => {
        if (!isClaimed && isTournamentFullyComplete) {
            audioService.claimReward();
            onAction({ type: 'CLAIM_TOURNAMENT_REWARD', payload: { tournamentType: type } })
        }
    };
    
    return (
        <div className="flex flex-col items-center justify-center h-full">
            <h4 className="font-bold text-gray-400 mb-2">보상 내역</h4>
            <div className="flex flex-row items-center justify-center gap-4">
                {(reward.items || []).map((item, index) => {
                    const itemName = 'itemId' in item ? item.itemId : (item as any).name;
                    const itemTemplate = CONSUMABLE_ITEMS.find(i => i.name === itemName);
                    const imageUrl = itemTemplate?.image || '';
                    return (
                        <div key={index} className="flex flex-col items-center gap-2">
                             <button
                                onClick={handleClaim}
                                disabled={isClaimed || !isTournamentFullyComplete}
                                className={`relative w-16 h-16 transition-transform hover:scale-105 disabled:cursor-not-allowed`}
                                title={isClaimed ? '수령 완료' : !isTournamentFullyComplete ? '모든 경기가 종료된 후 수령할 수 있습니다.' : '클릭하여 수령'}
                            >
                                <img 
                                    src={imageUrl} 
                                    alt={itemName} 
                                    className={`w-full h-full object-contain ${isClaimed || !isTournamentFullyComplete ? 'filter grayscale' : ''}`} 
                                />
                                {isClaimed && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-3xl text-green-400">✓</div>
                                )}
                            </button>
                            <span className="text-xs text-center">{itemName} x{item.quantity}</span>
                        </div>
                    );
                })}
            </div>
            {!isTournamentFullyComplete && !isClaimed && <p className="text-xs text-gray-500 mt-2">대회 종료 후 수령 가능</p>}
            {isClaimed && <p className="text-xs text-green-400 mt-2">보상을 수령했습니다.</p>}
        </div>
    );
};


const MatchBox: React.FC<{ match: Match; currentUser: UserWithStatus }> = ({ match, currentUser }) => {
    const p1 = match.players[0];
    const p2 = match.players[1];

    const PlayerDisplay: React.FC<{ player: PlayerForTournament | null, isWinner: boolean }> = ({ player, isWinner }) => {
        if (!player) return <div className="h-8 flex items-center"><span className="text-gray-600 truncate">...</span></div>;
        
        const playerClass = !isWinner && match.isFinished ? 'opacity-60' : '';
        const winnerClass = isWinner ? 'text-yellow-300' : '';
        const avatarUrl = AVATAR_POOL.find(a => a.id === player.avatarId)?.url;
        const borderUrl = BORDER_POOL.find(b => b.id === player.borderId)?.url;

        return (
            <div className={`flex items-center gap-2 ${playerClass}`}>
                <Avatar userId={player.id} userName={player.nickname} avatarUrl={avatarUrl} borderUrl={borderUrl} size={28} />
                <span className={`truncate font-semibold ${winnerClass}`}>{player.nickname}</span>
            </div>
        );
    };
    
    const p1IsWinner = match.isFinished && match.winner?.id === p1?.id;
    const p2IsWinner = match.isFinished && match.winner?.id === p2?.id;
    const isMyMatch = p1?.id === currentUser.id || p2?.id === currentUser.id;

    return (
        <div className={`p-1.5 rounded-lg text-sm space-y-1 ${isMyMatch ? 'bg-blue-900/40 border border-blue-700' : 'bg-gray-700/50'}`}>
            <div className="flex justify-between items-center">
                <PlayerDisplay player={p1} isWinner={p1IsWinner} />
                {p1IsWinner && <span className="font-bold text-green-400">W</span>}
            </div>
            <div className="flex justify-between items-center">
                <PlayerDisplay player={p2} isWinner={p2IsWinner} />
                {p2IsWinner && <span className="font-bold text-green-400">W</span>}
            </div>
        </div>
    );
};

const RoundColumn: React.FC<{ name: string; matches: Match[] | undefined; currentUser: UserWithStatus }> = ({ name, matches, currentUser }) => {
    return (
        <div className="flex flex-col justify-around h-full gap-4 flex-shrink-0 w-44">
            <h5 className="text-center font-bold text-sm text-gray-400">{name}</h5>
            <div className="flex flex-col justify-around h-full gap-6">
                {matches?.map(match => (
                    <MatchBox key={match.id} match={match} currentUser={currentUser} />
                ))}
            </div>
        </div>
    );
};

const RoundRobinDisplay: React.FC<{
    tournamentState: TournamentState;
    currentUser: UserWithStatus;
}> = ({ tournamentState, currentUser }) => {
    const [activeTab, setActiveTab] = useState<'matches' | 'ranking'>('matches');
    const { players, rounds, status, currentRoundRobinRound } = tournamentState;
    const matches = rounds[0]?.matches || [];

    const playerStats = useMemo(() => {
        const stats: Record<string, { wins: number; losses: number }> = {};
        players.forEach(p => { stats[p.id] = { wins: 0, losses: 0 }; });
        matches.forEach(match => {
            if (match.isFinished && match.winner) {
                const winnerId = match.winner.id;
                if (stats[winnerId]) stats[winnerId].wins++;
                const loser = match.players.find(p => p && p.id !== winnerId);
                if (loser && stats[loser.id]) stats[loser.id].losses++;
            }
        });
        return stats;
    }, [players, matches]);

    const sortedPlayers = useMemo(() => {
        return [...players].sort((a, b) => (playerStats[b.id]?.wins || 0) - (playerStats[a.id]?.wins || 0));
    }, [players, playerStats]);

    const schedule = [
        [[0, 5], [1, 4], [2, 3]], [[0, 4], [5, 3], [1, 2]], [[0, 3], [4, 2], [5, 1]],
        [[0, 2], [3, 1], [4, 5]], [[0, 1], [2, 5], [3, 4]],
    ];
    
    const roundForDisplay = status === 'bracket_ready' ? 1 : (currentRoundRobinRound || 1);
    const roundPairings = schedule[roundForDisplay - 1];

    const currentRoundMatches = useMemo(() => {
        if (!roundPairings) return [];
        return roundPairings.map(pair => {
            const p1Id = players[pair[0]].id;
            const p2Id = players[pair[1]].id;
            return matches.find(m =>
                (m.players[0]?.id === p1Id && m.players[1]?.id === p2Id) ||
                (m.players[0]?.id === p2Id && m.players[1]?.id === p1Id)
            );
        }).filter((m): m is Match => !!m);
    }, [roundPairings, players, matches]);

    return (
        <div className="h-full flex flex-col min-h-0">
            <h4 className="font-bold text-center mb-2 flex-shrink-0 text-gray-300">풀리그 대진표</h4>
            <div className="flex bg-gray-900/70 p-1 rounded-lg mb-2 flex-shrink-0">
                <button onClick={() => setActiveTab('matches')} className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${activeTab === 'matches' ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}>{roundForDisplay}회차</button>
                <button onClick={() => setActiveTab('ranking')} className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${activeTab === 'ranking' ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}>현재 순위</button>
            </div>
            <div className="overflow-y-auto pr-2 flex-grow min-h-0">
                {activeTab === 'matches' ? (
                    <div className="flex flex-col items-center justify-around h-full gap-4">
                        {currentRoundMatches.map(match => (<MatchBox key={match.id} match={match} currentUser={currentUser} />))}
                    </div>
                ) : (
                    <ul className="space-y-1.5">
                        {sortedPlayers.map((player, index) => {
                             const stats = playerStats[player.id];
                             const isCurrentUser = player.id === currentUser.id;
                             return (
                                 <li key={player.id} className={`flex items-center gap-3 p-1.5 rounded-md ${isCurrentUser ? 'bg-blue-900/50' : 'bg-gray-700/50'}`}>
                                     <span className="font-bold text-lg w-6 text-center flex-shrink-0">{index + 1}</span>
                                     <span className="flex-grow font-semibold text-sm truncate">{player.nickname}</span>
                                     <div className="flex items-baseline gap-2 text-xs">
                                         <span className="font-mono">{stats.wins}승 {stats.losses}패</span>
                                     </div>
                                 </li>
                             );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};


const TournamentRoundViewer: React.FC<{ rounds: Round[]; currentUser: UserWithStatus; tournamentType: TournamentType; }> = ({ rounds, currentUser, tournamentType }) => {
    // FIX: Define the type for tab data to help TypeScript's inference.
    type TabData = { name: string; matches: Match[]; isInProgress: boolean; };
    
    const getRoundsForTabs = useMemo((): TabData[] | null => {
        const roundMap = new Map<string, Match[]>();
        rounds.forEach(r => roundMap.set(r.name, r.matches));
        
        let availableTabs: string[] = [];
        if (tournamentType === 'world') {
            availableTabs = ["16강", "8강", "4강", "결승 및 3/4위전"];
        } else if (tournamentType === 'national') {
            availableTabs = ["8강", "4강", "결승 및 3/4위전"];
        } else {
            return null;
        }

        const tabData = availableTabs.map((tabName): TabData => {
            let roundMatches: Match[] = [];
            let roundNames: string[] = [];
            if (tabName === "결승 및 3/4위전") {
                roundNames = ["결승", "3,4위전"];
                roundMatches = (roundMap.get("결승") || []).concat(roundMap.get("3,4위전") || []);
            } else {
                roundNames = [tabName];
                roundMatches = roundMap.get(tabName) || [];
            }
            return {
                name: tabName,
                matches: roundMatches,
                isInProgress: roundMatches.length > 0 && roundMatches.some(m => !m.isFinished)
            };
        }).filter(tab => tab.matches.length > 0);
        
        return tabData;
    }, [rounds, tournamentType]);

    const initialTabIndex = useMemo(() => {
        if (!getRoundsForTabs) return 0;
        const inProgressIndex = getRoundsForTabs.findIndex(tab => tab.isInProgress);
        if (inProgressIndex !== -1) {
            return inProgressIndex;
        }
        return Math.max(0, getRoundsForTabs.length - 1);
    }, [getRoundsForTabs]);

    const [activeTab, setActiveTab] = useState(initialTabIndex);

    useEffect(() => {
        setActiveTab(initialTabIndex);
    }, [initialTabIndex]);

    if (!getRoundsForTabs) {
        const desiredOrder = ["16강", "8강", "4강", "3,4위전", "결승"];
        const sortedRounds = [...rounds].sort((a, b) => desiredOrder.indexOf(a.name) - desiredOrder.indexOf(b.name));
        return (
            <div className="h-full flex flex-col min-h-0">
                <h4 className="font-bold text-center mb-2 flex-shrink-0 text-gray-300">대진표</h4>
                <div className="flex-grow overflow-auto flex items-center justify-center p-2 space-x-4">
                    {sortedRounds.map((round) => (
                        <RoundColumn key={round.id} name={round.name} matches={round.matches} currentUser={currentUser} />
                    ))}
                </div>
            </div>
        );
    }
    
    const activeTabData = getRoundsForTabs[activeTab];

    const renderBracketForTab = (tab: typeof activeTabData) => {
        if (tab.name === "결승 및 3/4위전") {
             const finalMatch = tab.matches.filter(m => rounds.find(r => r.matches.includes(m))?.name === '결승');
             const thirdPlaceMatch = tab.matches.filter(m => rounds.find(r => r.matches.includes(m))?.name === '3,4위전');
             return (
                <div className="flex flex-col justify-center items-center h-full gap-12 p-4">
                    <RoundColumn name="결승" matches={finalMatch} currentUser={currentUser} />
                    {thirdPlaceMatch.length > 0 && <RoundColumn name="3,4위전" matches={thirdPlaceMatch} currentUser={currentUser} />}
                </div>
             );
        }

        return (
             <div className="flex justify-center items-center h-full gap-4 p-4">
                <RoundColumn name={tab.name} matches={tab.matches} currentUser={currentUser} />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col min-h-0">
            <h4 className="font-bold text-center mb-2 flex-shrink-0 text-gray-300">대진표</h4>
            <div className="flex bg-gray-900/70 p-1 rounded-lg mb-2 flex-shrink-0">
                {getRoundsForTabs.map((tab, index) => (
                    <button
                        key={tab.name}
                        onClick={() => setActiveTab(index)}
                        className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${activeTab === index ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}
                    >
                        {tab.name}
                    </button>
                ))}
            </div>
            <div className="flex-grow overflow-auto">
                {activeTabData && renderBracketForTab(activeTabData)}
            </div>
        </div>
    );
};

export const TournamentBracket: React.FC<TournamentBracketProps> = (props) => {
    const { tournamentState, currentUser, onBack, allUsersForRanking, onViewUser, onAction, onStartNextRound, onReset, onSkip, isMobile } = props;
    const [lastUserMatchSgfIndex, setLastUserMatchSgfIndex] = useState<number | null>(null);
    const [initialMatchPlayers, setInitialMatchPlayers] = useState<{ p1: PlayerForTournament | null, p2: PlayerForTournament | null }>({ p1: null, p2: null });
    const prevStatusRef = useRef(tournamentState.status);
    
    const safeRounds = useMemo(() => 
        Array.isArray(tournamentState.rounds) ? tournamentState.rounds : [], 
        [tournamentState.rounds]
    );

    useEffect(() => {
        onAction({ type: 'ENTER_TOURNAMENT_VIEW' });
        return () => {
            onAction({ type: 'LEAVE_TOURNAMENT_VIEW' });
        };
    }, [onAction]);

    useEffect(() => {
        const status = tournamentState.status;
        const prevStatus = prevStatusRef.current;
    
        if ((status === 'round_complete' || status === 'eliminated' || status === 'complete') && prevStatus === 'round_in_progress') {
            const lastFinishedUserMatch = [...safeRounds].reverse().flatMap(r => r.matches).find(m => m.isUserMatch && m.isFinished);
            if (lastFinishedUserMatch && lastFinishedUserMatch.sgfFileIndex) {
                setLastUserMatchSgfIndex(lastFinishedUserMatch.sgfFileIndex);
            }
        } else if (status === 'bracket_ready') {
            setLastUserMatchSgfIndex(null);
        } else if (status === 'round_in_progress' && tournamentState.timeElapsed === 1) {
             const matchInfo = tournamentState.currentSimulatingMatch;
            if (matchInfo) {
                const match = safeRounds[matchInfo.roundIndex].matches[matchInfo.matchIndex];
                const p1 = tournamentState.players.find(p => p.id === match.players[0]?.id) || null;
                const p2 = tournamentState.players.find(p => p.id === match.players[1]?.id) || null;
                setInitialMatchPlayers({
                    p1: p1 ? JSON.parse(JSON.stringify(p1)) : null,
                    p2: p2 ? JSON.parse(JSON.stringify(p2)) : null,
                });
            }
        } else if (status !== 'round_in_progress') {
            setInitialMatchPlayers({ p1: null, p2: null });
        }
    
        prevStatusRef.current = status;
    }, [tournamentState, safeRounds]);
    
    const handleBackClick = useCallback(() => {
        if (tournamentState.status === 'round_in_progress') {
            if (window.confirm('경기가 진행중입니다. 경기를 포기하시겠습니까? 남은 모든 경기는 패배 처리됩니다.')) {
                onAction({ type: 'FORFEIT_TOURNAMENT', payload: { type: tournamentState.type } });
            }
        } else {
            onBack();
        }
    }, [onBack, onAction, tournamentState.status, tournamentState.type]);

    const handleForfeitClick = useCallback(() => {
        if (window.confirm('토너먼트를 포기하고 나가시겠습니까? 오늘의 참가 기회는 사라집니다.')) {
            onAction({ type: 'FORFEIT_TOURNAMENT', payload: { type: tournamentState.type } });
        }
    }, [onAction, tournamentState.type]);

    const isSimulating = tournamentState.status === 'round_in_progress';
    const currentSimMatch = isSimulating && tournamentState.currentSimulatingMatch 
        ? safeRounds[tournamentState.currentSimulatingMatch.roundIndex].matches[tournamentState.currentSimulatingMatch.matchIndex]
        : null;
        
    const lastFinishedUserMatch = useMemo(() => {
        return [...safeRounds].reverse().flatMap(r => r.matches).find(m => m.isUserMatch && m.isFinished);
    }, [safeRounds]);
    
    const matchForDisplay = isSimulating 
        ? currentSimMatch 
        : (lastFinishedUserMatch || safeRounds.flatMap(r => r.matches).find(m => m.isUserMatch) || safeRounds[0]?.matches[0]);
    
    const winner = useMemo(() => {
        if (tournamentState.status !== 'complete') return null;
        if (tournamentState.type === 'neighborhood') {
             const wins: Record<string, number> = {};
            tournamentState.players.forEach(p => wins[p.id] = 0);
            safeRounds[0].matches.forEach(m => { if(m.winner) wins[m.winner.id]++; });
            return [...tournamentState.players].sort((a,b) => wins[b.id] - wins[a.id])[0];
        } else {
            const finalMatch = safeRounds.find(r => r.name === '결승');
            return finalMatch?.matches[0]?.winner;
        }
    }, [tournamentState.status, tournamentState.type, tournamentState.players, safeRounds]);
    
    const myResultText = useMemo(() => {
        if (tournamentState.status === 'complete' || tournamentState.status === 'eliminated') {
            if (tournamentState.type === 'neighborhood') {
                const allMyMatches = safeRounds.flatMap(r => r.matches).filter(m => m.isUserMatch && m.isFinished);
                const winsCount = allMyMatches.filter(m => m.winner?.id === currentUser.id).length;
                const lossesCount = allMyMatches.length - winsCount;

                const playerWins: Record<string, number> = {};
                tournamentState.players.forEach(p => { playerWins[p.id] = 0; });
                safeRounds[0].matches.forEach(m => {
                    if (m.winner) playerWins[m.winner.id] = (playerWins[m.winner.id] || 0) + 1;
                });

                const sortedPlayers = [...tournamentState.players].sort((a, b) => playerWins[b.id] - playerWins[a.id]);
                let myRank = -1; let currentRankValue = 1;
                for (let i = 0; i < sortedPlayers.length; i++) {
                    if (i > 0 && playerWins[sortedPlayers[i].id] < playerWins[sortedPlayers[i-1].id]) currentRankValue = i + 1;
                    if (sortedPlayers[i].id === currentUser.id) { myRank = currentRankValue; break; }
                }
                return `${winsCount}승 ${lossesCount}패! ${myRank}위`;
            }

            if (winner?.id === currentUser.id) return "🏆 우승!";

            const lastUserMatch = [...safeRounds].reverse().flatMap(r => r.matches).find(m => m.isUserMatch && m.isFinished);
            if (lastUserMatch) {
                const roundOfLastMatch = safeRounds.find(r => r.matches.some(m => m.id === lastUserMatch.id));
                if (roundOfLastMatch?.name === '결승') return "준우승!";

                if (roundOfLastMatch?.name === '4강') {
                    const thirdPlaceMatch = safeRounds.flatMap(r => r.matches).find(m => {
                        const round = safeRounds.find(r => r.matches.some(match => match.id === m.id));
                        return m.isUserMatch && round?.name === '3,4위전';
                    });
                    if (thirdPlaceMatch) {
                        const won3rdPlace = thirdPlaceMatch.winner?.id === currentUser.id;
                        return won3rdPlace ? "3위" : "4위";
                    }
                }
                return `${roundOfLastMatch?.name || ''}에서 탈락`;
            }
            return "토너먼트 탈락";
        }

        if (tournamentState.status === 'round_complete' || tournamentState.status === 'bracket_ready') {
            const lastFinishedUserMatch = [...safeRounds].reverse().flatMap(r => r.matches).find(m => m.isUserMatch && m.isFinished);
            if (lastFinishedUserMatch) {
                const userWonLastMatch = lastFinishedUserMatch.winner?.id === currentUser.id;
                if (tournamentState.type === 'neighborhood') {
                    const allMyMatches = safeRounds.flatMap(r => r.matches).filter(m => m.isUserMatch && m.isFinished);
                    const wins = allMyMatches.filter(m => m.winner?.id === currentUser.id).length;
                    const losses = allMyMatches.length - wins;
                    return `${allMyMatches.length}차전 ${userWonLastMatch ? '승리' : '패배'}! (${wins}승 ${losses}패)`;
                } else if (userWonLastMatch) {
                    const nextUnplayedRound = safeRounds.find(r => r.matches.some(m => !m.isFinished && m.players.some(p => p?.id === currentUser.id)));
                    if (nextUnplayedRound) return `${nextUnplayedRound.name} 진출!`;
                }
            }
        }
        
        const currentRound = safeRounds.find(r => r.matches.some(m => m.isUserMatch && !m.isFinished));
        return currentRound ? `${currentRound.name} 진행 중` : "대회 준비 중";
    }, [currentUser.id, tournamentState, winner, safeRounds]);
    
    const p1_from_match = matchForDisplay?.players[0] || null;
    const p2_from_match = matchForDisplay?.players[1] || null;

    const p1 = p1_from_match ? tournamentState.players.find(p => p.id === p1_from_match.id) || p1_from_match : null;
    const p2 = p2_from_match ? tournamentState.players.find(p => p.id === p2_from_match.id) || p2_from_match : null;

    const radarDatasets = useMemo(() => [
        { stats: p1?.stats || {}, color: '#60a5fa', fill: 'rgba(59, 130, 246, 0.4)' },
        { stats: p2?.stats || {}, color: '#f87171', fill: 'rgba(239, 68, 68, 0.4)' },
    ], [p1, p2]);

    const maxStatValue = useMemo(() => {
        if (!p1 || !p2) {
            return 200; // A reasonable default
        }
        const allStats = [
            ...Object.values(p1.stats),
            ...Object.values(p2.stats)
        ];
        const maxStat = Math.max(...allStats, 0);
        return Math.ceil((maxStat + 50) / 50) * 50; // Round up to nearest 50
    }, [p1, p2]);

    const currentPhase = useMemo((): 'early' | 'mid' | 'end' | 'none' => {
        if (tournamentState.status !== 'round_in_progress') return 'none';
        const time = tournamentState.timeElapsed;
        if (time <= 40) return 'early';
        if (time <= 100) return 'mid';
        if (time <= 140) return 'end';
        return 'none';
    }, [tournamentState.timeElapsed, tournamentState.status]);

    const p1Cumulative = tournamentState.currentMatchScores?.player1 || 0;
    const p2Cumulative = tournamentState.currentMatchScores?.player2 || 0;
    const totalCumulative = p1Cumulative + p2Cumulative;
    const p1Percent = totalCumulative > 0 ? (p1Cumulative / totalCumulative) * 100 : 50;
    const p2Percent = totalCumulative > 0 ? (p2Cumulative / totalCumulative) * 100 : 50;

    const renderFooterButton = () => {
        const { status } = tournamentState;

        if (status === 'round_in_progress') {
            return (
                <div className="flex items-center justify-center gap-4">
                    <Button disabled colorScheme="green">경기 진행 중...</Button>
                    <Button onClick={handleForfeitClick} colorScheme="red">포기</Button>
                </div>
            );
        }
        
        if (status === 'complete') {
            return <button onClick={onBack} className="p-0 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-100 active:shadow-inner active:scale-95 active:translate-y-0.5"><img src="/images/button/back.png" alt="Back" className="w-6 h-6" /></button>;
        }

        if (status === 'eliminated') {
             return (
                <div className="flex items-center justify-center gap-4">
                    <button onClick={onBack} className="p-0 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-100 active:shadow-inner active:scale-95 active:translate-y-0.5"><img src="/images/button/back.png" alt="Back" className="w-6 h-6" /></button>
                    <Button onClick={onSkip} colorScheme="yellow">결과 스킵</Button>
                </div>
            );
        }

        const hasUnfinishedUserMatch = safeRounds.some(r =>
            r.matches.some(m => m.isUserMatch && !m.isFinished)
        );

        if ((status === 'round_complete' || status === 'bracket_ready') && hasUnfinishedUserMatch) {
            return (
                <div className="flex items-center justify-center gap-4">
                    <Button onClick={onStartNextRound} colorScheme="green" className="animate-pulse">경기 시작</Button>
                    <Button onClick={handleForfeitClick} colorScheme="red">포기</Button>
                </div>
            );
        }
        
        // This is the default case, meaning user's matches are done but tournament isn't 'complete' or 'eliminated'
        return (
            <div className="flex items-center justify-center gap-4">
                <Button disabled colorScheme="gray">경기 완료</Button>
                <Button onClick={onSkip} colorScheme="yellow">결과 스킵</Button>
            </div>
        );
    };

    const mainContent = (
        <main className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
            <aside className="w-full lg:w-[35%] xl:w-[25%] flex-shrink-0 flex flex-col gap-2">
                <div className="flex-1 bg-gray-800/50 rounded-lg p-2 min-h-0">
                    {tournamentState.type === 'neighborhood' ? (
                        <RoundRobinDisplay tournamentState={tournamentState} currentUser={currentUser} />
                    ) : (
                        <TournamentRoundViewer rounds={safeRounds} currentUser={currentUser} tournamentType={tournamentState.type} />
                    )}
                </div>
                <div className="h-48 flex-shrink-0 bg-gray-800/50 rounded-lg p-3 text-center flex flex-col items-center justify-center">
                    <img src="/images/Ranking.png" alt="Trophy" className="w-20 h-20 mb-2" />
                    <h4 className="font-bold text-gray-400">우승자</h4>
                    {winner ? <p className="text-xl font-semibold text-yellow-300">{winner.nickname}</p> : <p className="text-sm text-gray-500">진행 중...</p>}
                </div>
            </aside>

            <div className="flex-grow flex flex-col gap-2 min-h-0 min-w-0">
                <section className="flex flex-row gap-1 md:gap-2 items-stretch p-2 bg-gray-800/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                        <PlayerProfilePanel player={p1} initialPlayer={initialMatchPlayers.p1} allUsers={allUsersForRanking} currentUserId={currentUser.id} onViewUser={onViewUser} highlightPhase={currentPhase} />
                    </div>
                    <div className="flex-shrink-0 w-44 sm:w-52 flex flex-col items-center justify-center min-w-0">
                        <RadarChart datasets={radarDatasets} maxStatValue={maxStatValue} size={isMobile ? 140 : undefined} />
                        <div className="flex justify-center gap-2 sm:gap-4 text-[10px] sm:text-xs mt-1">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 sm:w-3 sm:h-3 rounded-sm" style={{backgroundColor: 'rgba(59, 130, 246, 0.6)'}}></div>{p1?.nickname || '선수 1'}</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 sm:w-3 sm:h-3 rounded-sm" style={{backgroundColor: 'rgba(239, 68, 68, 0.6)'}}></div>{p2?.nickname || '선수 2'}</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <PlayerProfilePanel player={p2} initialPlayer={initialMatchPlayers.p2} allUsers={allUsersForRanking} currentUserId={currentUser.id} onViewUser={onViewUser} highlightPhase={currentPhase} />
                    </div>
                </section>
                
                <div className="flex-1 flex flex-col lg:flex-row gap-2 min-h-0">
                    <div className="w-full h-80 lg:h-full lg:w-2/5 bg-gray-800/50 rounded-lg p-2 flex items-center justify-center">
                        <SgfViewer 
                            timeElapsed={isSimulating ? tournamentState.timeElapsed : 0} 
                            fileIndex={isSimulating ? currentSimMatch?.sgfFileIndex : lastUserMatchSgfIndex}
                            showLastMoveOnly={!isSimulating}
                        />
                    </div>
                    
                    <div className="w-full lg:w-3/5 flex-1 flex flex-col gap-2 min-h-0">
                        <section className="flex-shrink-0 bg-gray-800/50 rounded-lg p-3">
                            <ScoreGraph p1Percent={p1Percent} p2Percent={p2Percent} p1Nickname={p1?.nickname} p2Nickname={p2?.nickname}/>
                            <div className="mt-2"><SimulationProgressBar timeElapsed={tournamentState.timeElapsed} totalDuration={140} /></div>
                        </section>
                        <div className="h-64 lg:h-auto lg:flex-1 min-h-0 bg-gray-800/50 rounded-lg p-2 flex flex-col">
                            <CommentaryPanel commentary={tournamentState.currentMatchCommentary} isSimulating={tournamentState.status === 'round_in_progress'} />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
    
    const renderFooter = () => (
        <footer className="flex-shrink-0 bg-gray-800/50 rounded-lg p-3 grid grid-cols-1 md:grid-cols-3 items-center gap-2">
            <div className="flex items-center gap-2">
                 <Avatar userId={currentUser.id} userName={currentUser.nickname} size={40} />
                 <div className="text-left">
                    <h4 className="font-bold">{currentUser.nickname}</h4>
                    <p className="text-xs text-yellow-300">{myResultText}</p>
                 </div>
            </div>
            <div className="text-center order-first md:order-none">
                {renderFooterButton()}
            </div>
             <div className="text-right">
                <FinalRewardPanel tournamentState={tournamentState} currentUser={currentUser} onAction={onAction} />
            </div>
        </footer>
    );

    return (
        <div className="w-full p-2 flex flex-col gap-2 bg-gray-900 text-white min-h-full">
            <header className="flex items-center justify-between flex-shrink-0">
                <button onClick={handleBackClick} className="p-0 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-100 active:shadow-inner active:scale-95 active:translate-y-0.5">
                    <img src="/images/button/back.png" alt="Back" className="w-6 h-6" />
                </button>
                <h1 className="text-xl md:text-2xl font-bold">{tournamentState.title}</h1>
                <div className="w-28" />
            </header>

            {isMobile ? (
                <div className="flex-1 flex flex-col gap-4 min-h-0">
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        {mainContent}
                    </div>
                    {renderFooter()}
                </div>
            ) : (
                <>
                    {mainContent}
                    {renderFooter()}
                </>
            )}
        </div>
    );
};