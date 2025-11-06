import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { UserWithStatus, TournamentState, PlayerForTournament, ServerAction, User, CoreStat, Match, Round, CommentaryLine, TournamentType, LeagueTier } from '../types.js';
import Button from './Button.js';
import { TOURNAMENT_DEFINITIONS, BASE_TOURNAMENT_REWARDS, CONSUMABLE_ITEMS, AVATAR_POOL, BORDER_POOL, CORE_STATS_DATA } from '../constants';
import Avatar from './Avatar.js';
import RadarChart from './RadarChart.js';
import SgfViewer from './SgfViewer.js';
import { audioService } from '../services/audioService.js';
import ConditionPotionModal from './ConditionPotionModal.js';
import { calculateTotalStats } from '../services/statService.js';

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
    tournament: TournamentState;
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
    isUserMatch?: boolean;
    onUseConditionPotion?: () => void;
    onOpenShop?: () => void;
    timeElapsed?: number;
    tournamentStatus?: string;
}> = ({ player, initialPlayer, allUsers, currentUserId, onViewUser, highlightPhase, isUserMatch, onUseConditionPotion, onOpenShop, timeElapsed = 0, tournamentStatus }) => {
    
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
    const isCurrentUser = player.id === currentUserId;
    
    // 컨디션 회복제 보유 개수 확인
    const potionCounts = useMemo(() => {
        const counts: Record<string, number> = { small: 0, medium: 0, large: 0 };
        if (fullUserData?.inventory) {
            fullUserData.inventory
                .filter(item => item.type === 'consumable' && item.name.startsWith('컨디션회복제'))
                .forEach(item => {
                    if (item.name === '컨디션회복제(소)') {
                        counts.small += item.quantity || 1;
                    } else if (item.name === '컨디션회복제(중)') {
                        counts.medium += item.quantity || 1;
                    } else if (item.name === '컨디션회복제(대)') {
                        counts.large += item.quantity || 1;
                    }
                });
        }
        return counts;
    }, [fullUserData?.inventory]);
    
    const totalPotionCount = potionCounts.small + potionCounts.medium + potionCounts.large;
    
    // Track stat changes for animation
    const [statChanges, setStatChanges] = useState<Record<CoreStat, number>>({} as Record<CoreStat, number>);
    const prevStatsRef = useRef<Record<CoreStat, number>>({} as Record<CoreStat, number>);
    
    useEffect(() => {
        if (!player || timeElapsed === 0) {
            prevStatsRef.current = { ...player.stats } as Record<CoreStat, number>;
            return;
        }
        
        const changes: Record<CoreStat, number> = {} as Record<CoreStat, number>;
        Object.values(CoreStat).forEach(stat => {
            const prev = prevStatsRef.current[stat] ?? player.stats[stat];
            const curr = player.stats[stat];
            if (prev !== curr) {
                changes[stat] = curr - prev;
            }
        });
        
        if (Object.keys(changes).length > 0) {
            setStatChanges(changes);
            // Clear changes after 2 seconds
            setTimeout(() => {
                setStatChanges({} as Record<CoreStat, number>);
            }, 2000);
        }
        
        prevStatsRef.current = { ...player.stats } as Record<CoreStat, number>;
    }, [player?.stats, timeElapsed]);

    const isStatHighlighted = (stat: CoreStat) => {
        if (highlightPhase === 'none') return false;
        return KEY_STATS_BY_PHASE[highlightPhase].includes(stat);
    };
    
    // 경기 시작 전에는 홈 화면과 동일한 능력치 계산 (calculateTotalStats 사용)
    // 경기 중에는 player.stats를 사용 (컨디션으로 인한 변화 반영)
    const displayStats = useMemo(() => {
        if (tournamentStatus === 'round_in_progress') {
            // 경기 중에는 현재 능력치 사용 (컨디션 변화 반영)
            return player.stats;
        } else {
            // 경기 시작 전에는 홈 화면과 동일한 능력치 계산
            if (fullUserData) {
                return calculateTotalStats(fullUserData);
            }
            // fullUserData가 없으면 player.stats 사용 (봇 등)
            return player.stats;
        }
    }, [player.stats, fullUserData, tournamentStatus]);
    
    return (
        <div className={`bg-gray-900/50 p-3 rounded-lg flex flex-col items-center gap-2 h-full ${isClickable ? 'cursor-pointer hover:bg-gray-700/50' : ''}`} onClick={isClickable ? () => onViewUser(player.id) : undefined} title={isClickable ? `${player.nickname} 프로필 보기` : ''}>
            <div className="flex items-center gap-2">
                 <Avatar userId={player.id} userName={player.nickname} avatarUrl={avatarUrl} borderUrl={borderUrl} size={40} />
                 <div>
                    <h4 className="font-bold text-base truncate">{player.nickname}</h4>
                    <p className="text-xs text-gray-400">({cumulativeStats.wins}승 {cumulativeStats.losses}패)</p>
                 </div>
            </div>
            <div className="font-bold text-sm mt-1 relative flex items-center gap-2">
                컨디션: <span className="text-yellow-300">{player.condition === 1000 ? '-' : player.condition}</span>
                {isCurrentUser && player.condition !== 1000 && player.condition < 100 && tournamentStatus !== 'round_in_progress' && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            // 컨디션 회복제가 0개면 상점 열기, 있으면 사용 모달 열기
                            if (totalPotionCount === 0 && onOpenShop) {
                                onOpenShop();
                            } else if (onUseConditionPotion) {
                                onUseConditionPotion();
                            }
                        }}
                        className="w-6 h-6 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                        title={totalPotionCount === 0 ? "컨디션 회복제가 없습니다. 상점에서 구매하세요." : "컨디션 물약 사용 (경기 시작 전에만 사용 가능)"}
                    >
                        +
                    </button>
                )}
                {isCurrentUser && player.condition !== 1000 && player.condition >= 100 && onUseConditionPotion && tournamentStatus !== 'round_in_progress' && (
                    <button 
                        disabled
                        className="w-6 h-6 bg-gray-600 text-gray-400 rounded-full flex items-center justify-center text-xs font-bold cursor-not-allowed"
                        title="컨디션이 최대치입니다"
                    >
                        +
                    </button>
                )}
            </div>
            <div className="w-full grid grid-cols-2 gap-x-1 sm:gap-x-3 gap-y-0.5 text-xs mt-2 border-t border-gray-600 pt-2">
                {Object.values(CoreStat).map(stat => {
                    const initialValue = initialPlayer?.stats?.[stat] ?? displayStats[stat];
                    const currentValue = displayStats[stat];
                    const change = currentValue - initialValue;

                    return (
                        <React.Fragment key={stat}>
                            <span className={`text-gray-400 ${isStatHighlighted(stat) ? 'text-yellow-400 font-bold' : ''}`}>{stat}</span>
                            <div className="flex justify-end items-baseline relative min-w-[120px]">
                                <span className={`font-mono text-white ${isStatHighlighted(stat) ? 'text-yellow-400 font-bold' : ''} min-w-[40px] text-right`}>{displayStats[stat]}</span>
                                {/* [N]: 항상 보이는 누적된 변화값 (초기값 대비 현재까지 누적된 변화) */}
                                <span className="ml-1 font-bold text-xs min-w-[45px] text-right">
                                    {initialPlayer && change !== 0 && tournamentStatus === 'round_in_progress' ? (
                                        <span className={`${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            [{change > 0 ? '+' : ''}{change}]
                                        </span>
                                    ) : null}
                                </span>
                                {/* (N): 1초마다 발생한 즉각적인 변화값을 잠시 보여주는 용도 (애니메이션으로 사라짐) */}
                                {/* 애니메이션이 레이아웃에 영향을 주지 않도록 absolute positioning 사용 및 고정 공간 확보 */}
                                <span className="ml-1 font-bold text-sm min-w-[50px] text-right relative">
                                    <span 
                                        className="absolute right-0 top-0 whitespace-nowrap"
                                        style={{ 
                                            animation: statChanges[stat] !== undefined && statChanges[stat] !== 0 && tournamentStatus === 'round_in_progress' ? 'statChangeFade 2s ease-out forwards' : 'none',
                                            opacity: statChanges[stat] !== undefined && statChanges[stat] !== 0 && tournamentStatus === 'round_in_progress' ? 1 : 0,
                                            pointerEvents: 'none' // 클릭 이벤트 방지
                                        }}
                                    >
                                        {statChanges[stat] !== undefined && statChanges[stat] !== 0 && tournamentStatus === 'round_in_progress' ? (
                                            <span className={statChanges[stat] > 0 ? 'text-green-300' : 'text-red-300'}>
                                                ({statChanges[stat] > 0 ? '+' : ''}{statChanges[stat]})
                                            </span>
                                        ) : null}
                                    </span>
                                    {/* 공간 확보를 위한 투명한 플레이스홀더 */}
                                    <span className="invisible whitespace-nowrap">
                                        (+99)
                                    </span>
                                </span>
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
    // totalDuration에 맞게 동적으로 계산 (초반 15초, 중반 20초, 종반 15초 비율 유지)
    const EARLY_GAME_DURATION = 15;
    const MID_GAME_DURATION = 20;
    const END_GAME_DURATION = 15;
    const BASE_TOTAL = EARLY_GAME_DURATION + MID_GAME_DURATION + END_GAME_DURATION; // 50
    
    // totalDuration이 BASE_TOTAL과 다를 경우 비율로 스케일링
    const earlyDuration = (EARLY_GAME_DURATION / BASE_TOTAL) * totalDuration;
    const midDuration = (MID_GAME_DURATION / BASE_TOTAL) * totalDuration;
    const endDuration = (END_GAME_DURATION / BASE_TOTAL) * totalDuration;
    
    const earlyStage = Math.min(progress, (earlyDuration / totalDuration) * 100);
    const midStage = Math.min(Math.max(0, progress - (earlyDuration / totalDuration) * 100), (midDuration / totalDuration) * 100);
    const endStage = Math.min(Math.max(0, progress - ((earlyDuration + midDuration) / totalDuration) * 100), (endDuration / totalDuration) * 100);

    return (
        <div>
            <div className="w-full bg-gray-900 rounded-full h-2 flex border border-gray-600">
                <div className="bg-green-500 h-full rounded-l-full" style={{ width: `${earlyStage}%` }} title="초반전"></div>
                <div className="bg-yellow-500 h-full" style={{ width: `${midStage}%` }} title="중반전"></div>
                <div className="bg-red-500 h-full rounded-r-full" style={{ width: `${endStage}%` }} title="끝내기"></div>
            </div>
            <div className="flex text-xs text-gray-400 mt-1">
                <div style={{ width: `${(earlyDuration / totalDuration) * 100}%` }}>초반</div>
                <div style={{ width: `${(midDuration / totalDuration) * 100}%` }} className="text-center">중반</div>
                <div style={{ width: `${(endDuration / totalDuration) * 100}%` }} className="text-right">종반</div>
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
            <div className="flex justify-between text-xs px-1 mt-1 font-bold">
                <span className="text-gray-300">{p1Percent.toFixed(1)}%</span>
                <span className="text-gray-300">{p2Percent.toFixed(1)}%</span>
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
        if (!player) return <div className="h-10 flex items-center px-2"><span className="text-gray-500 truncate italic">경기 대기중...</span></div>;
        
        const avatarUrl = AVATAR_POOL.find(a => a.id === player.avatarId)?.url;
        const borderUrl = BORDER_POOL.find(b => b.id === player.borderId)?.url;

        return (
            <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-all ${
                isWinner 
                    ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-400/50 shadow-lg shadow-yellow-500/20' 
                    : match.isFinished 
                        ? 'opacity-50' 
                        : 'hover:bg-gray-700/30'
            }`}>
                <Avatar userId={player.id} userName={player.nickname} avatarUrl={avatarUrl} borderUrl={borderUrl} size={32} />
                <span className={`truncate font-semibold text-sm ${
                    isWinner 
                        ? 'text-yellow-300 font-bold' 
                        : match.isFinished 
                            ? 'text-gray-400' 
                            : 'text-gray-200'
                }`}>
                    {player.nickname}
                </span>
            </div>
        );
    };
    
    const p1IsWinner = match.isFinished && match.winner?.id === p1?.id;
    const p2IsWinner = match.isFinished && match.winner?.id === p2?.id;
    const isMyMatch = p1?.id === currentUser.id || p2?.id === currentUser.id;
    const isFinished = match.isFinished;

    // finalScore에서 집 차이 계산 (finishMatch 함수의 로직과 동일)
    const calculateWinMargin = (): string => {
        if (!isFinished || !match.finalScore) return '';
        const p1Percent = match.finalScore.player1;
        const diffPercent = Math.abs(p1Percent - 50) * 2;
        const scoreDiff = diffPercent / 2;
        const roundedDiff = Math.round(scoreDiff);
        const finalDiff = roundedDiff + 0.5;
        return finalDiff < 0.5 ? '0.5' : finalDiff.toFixed(1);
    };

    const winMargin = calculateWinMargin();

    return (
        <div className={`relative rounded-xl overflow-hidden transition-all duration-300 ${
            isMyMatch 
                ? 'bg-gradient-to-br from-blue-900/60 via-blue-800/50 to-indigo-900/60 border-2 border-blue-500/70 shadow-lg shadow-blue-500/20' 
                : 'bg-gradient-to-br from-gray-800/80 via-gray-700/70 to-gray-800/80 border border-gray-600/50 shadow-md'
        } ${isFinished ? '' : 'hover:scale-[1.02] hover:shadow-xl'}`}>
            {/* 승리 배지 */}
            {isFinished && (
                <div className="absolute top-2 right-2 flex gap-1">
                    {p1IsWinner && (
                        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold text-xs px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                            <span>🏆</span>
                            <span>{winMargin}집 승</span>
                        </div>
                    )}
                    {p2IsWinner && (
                        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold text-xs px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                            <span>🏆</span>
                            <span>{winMargin}집 승</span>
                        </div>
                    )}
                </div>
            )}
            
            <div className="p-3 space-y-2">
                <PlayerDisplay player={p1} isWinner={p1IsWinner} />
                {!isFinished && (
                    <div className="flex items-center justify-center py-1">
                        <div className="text-xs text-gray-400 font-semibold">VS</div>
                    </div>
                )}
                <PlayerDisplay player={p2} isWinner={p2IsWinner} />
            </div>
        </div>
    );
};

const RoundColumn: React.FC<{ name: string; matches: Match[] | undefined; currentUser: UserWithStatus }> = ({ name, matches, currentUser }) => {
    const isFinalRound = name.includes('결승') || name.includes('3,4위전');
    
    return (
        <div className="flex flex-col justify-around h-full gap-4 flex-shrink-0 min-w-[200px]">
            <div className={`text-center font-bold text-base py-2 px-4 rounded-lg ${
                isFinalRound
                    ? 'bg-gradient-to-r from-purple-600/80 to-pink-600/80 text-white shadow-lg shadow-purple-500/30 border-2 border-purple-400/50'
                    : 'bg-gradient-to-r from-gray-700/80 to-gray-600/80 text-gray-200 shadow-md border border-gray-500/50'
            }`}>
                {name}
            </div>
            <div className="flex flex-col justify-around h-full gap-4">
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
    const [activeTab, setActiveTab] = useState<'round' | 'ranking'>('round');
    const [selectedRound, setSelectedRound] = useState<number>(1);
    const { players, rounds, status, currentRoundRobinRound, type: tournamentType } = tournamentState;
    
    // 모든 매치를 수집 (5회차 전체)
    const allMatches = useMemo(() => {
        return rounds.flatMap(round => round.matches);
    }, [rounds]);

    const playerStats = useMemo(() => {
        const stats: Record<string, { wins: number; losses: number }> = {};
        players.forEach(p => { stats[p.id] = { wins: 0, losses: 0 }; });
        allMatches.forEach(match => {
            if (match.isFinished && match.winner) {
                const winnerId = match.winner.id;
                if (stats[winnerId]) stats[winnerId].wins++;
                const loser = match.players.find(p => p && p.id !== winnerId);
                if (loser && stats[loser.id]) stats[loser.id].losses++;
            }
        });
        return stats;
    }, [players, allMatches]);

    const sortedPlayers = useMemo(() => {
        return [...players].sort((a, b) => {
            const aWins = playerStats[a.id]?.wins || 0;
            const bWins = playerStats[b.id]?.wins || 0;
            if (aWins !== bWins) return bWins - aWins;
            // 승수가 같으면 패수로 정렬 (패수가 적을수록 좋음)
            const aLosses = playerStats[a.id]?.losses || 0;
            const bLosses = playerStats[b.id]?.losses || 0;
            return aLosses - bLosses;
        });
    }, [players, playerStats]);

    // 현재 표시할 회차 결정
    // 동네바둑리그: 
    // - round_complete 상태일 때는 완료된 회차를 표시 (1회차 완료 후 1회차 표시)
    // - bracket_ready 상태일 때는 현재 회차를 표시 (다음 경기 버튼을 눌러 2회차로 넘어간 후 2회차 표시)
    const roundForDisplay = currentRoundRobinRound || 1;
    
    // rounds 배열에서 선택된 회차의 라운드 찾기 (name이 "1회차", "2회차" 등인 라운드)
    const currentRoundObj = useMemo(() => {
        return rounds.find(round => round.name === `${selectedRound}회차`);
    }, [rounds, selectedRound]);
    
    const currentRoundMatches = currentRoundObj?.matches || [];

    // 현재 회차가 변경되면 선택된 회차도 업데이트
    useEffect(() => {
        if (roundForDisplay && selectedRound !== roundForDisplay) {
            setSelectedRound(roundForDisplay);
        }
    }, [roundForDisplay, selectedRound]);

    return (
        <div className="h-full flex flex-col min-h-0">
            <h4 className="font-bold text-center mb-2 flex-shrink-0 text-gray-300">풀리그 대진표</h4>
            <div className="flex bg-gray-900/70 p-1 rounded-lg mb-2 flex-shrink-0">
                <button onClick={() => setActiveTab('round')} className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${activeTab === 'round' ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}>대진표</button>
                <button onClick={() => setActiveTab('ranking')} className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${activeTab === 'ranking' ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}>{status === 'complete' ? '최종 순위' : '현재 순위'}</button>
            </div>
            <div className="overflow-y-auto pr-2 flex-grow min-h-0">
                {activeTab === 'round' ? (
                    <div className="flex flex-col h-full">
                        {/* 회차 선택 탭 */}
                        <div className="flex gap-1 mb-2 flex-shrink-0">
                            {[1, 2, 3, 4, 5].map(roundNum => (
                                <button
                                    key={roundNum}
                                    onClick={() => setSelectedRound(roundNum)}
                                    className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${
                                        selectedRound === roundNum
                                            ? 'bg-blue-700 text-white'
                                            : roundNum <= roundForDisplay
                                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    }`}
                                    disabled={roundNum > roundForDisplay}
                                >
                                    {roundNum}회차
                                </button>
                            ))}
                        </div>
                        {/* 선택된 회차의 매치 표시 */}
                        <div className="flex flex-col items-center justify-around flex-grow gap-4 min-h-0 px-2">
                            {currentRoundMatches.length > 0 ? (
                                currentRoundMatches.map(match => (
                                    <div key={match.id} className="w-full max-w-md">
                                        <MatchBox match={match} currentUser={currentUser} />
                                    </div>
                                ))
                            ) : (
                                <div className="text-gray-400 text-sm italic">경기가 없습니다.</div>
                            )}
                        </div>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {sortedPlayers.map((player, index) => {
                             const stats = playerStats[player.id];
                             const isCurrentUser = player.id === currentUser.id;
                             const isTopThree = index < 3;
                             const avatarUrl = AVATAR_POOL.find(a => a.id === player.avatarId)?.url;
                             const borderUrl = BORDER_POOL.find(b => b.id === player.borderId)?.url;
                             
                             return (
                                 <li key={player.id} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                                     isCurrentUser 
                                         ? 'bg-gradient-to-r from-blue-600/60 to-indigo-600/60 border-2 border-blue-400/70 shadow-lg' 
                                         : isTopThree
                                             ? 'bg-gradient-to-r from-yellow-900/40 to-amber-900/40 border border-yellow-600/50 shadow-md'
                                             : 'bg-gray-700/50 border border-gray-600/30 hover:bg-gray-700/70'
                                 }`}>
                                     <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm flex-shrink-0 ${
                                         index === 0 
                                             ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-lg'
                                             : index === 1
                                                 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800 shadow-md'
                                                 : index === 2
                                                     ? 'bg-gradient-to-br from-amber-600 to-orange-600 text-white shadow-md'
                                                     : 'bg-gray-600 text-gray-200'
                                     }`}>
                                         {index + 1}
                                     </div>
                                     <Avatar userId={player.id} userName={player.nickname} avatarUrl={avatarUrl} borderUrl={borderUrl} size={36} />
                                     <span className={`flex-grow font-semibold text-sm truncate ${
                                         isCurrentUser ? 'text-blue-200' : 'text-gray-200'
                                     }`}>
                                         {player.nickname}
                                     </span>
                                     <div className="flex items-baseline gap-2 text-xs font-semibold">
                                         <span className="text-green-400">{stats.wins}승</span>
                                         <span className="text-gray-400">/</span>
                                         <span className="text-red-400">{stats.losses}패</span>
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
                <div className="flex flex-col justify-center items-center h-full gap-8 p-4">
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
            <h4 className="font-bold text-center mb-3 flex-shrink-0 text-gray-200 text-lg">대진표</h4>
            <div className="flex bg-gradient-to-r from-gray-800/90 to-gray-700/90 p-1 rounded-xl mb-3 flex-shrink-0 border border-gray-600/50 shadow-lg">
                {getRoundsForTabs.map((tab, index) => (
                    <button
                        key={tab.name}
                        onClick={() => setActiveTab(index)}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                            activeTab === index 
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105' 
                                : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                        }`}
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
    const { tournament, currentUser, onBack, allUsersForRanking, onViewUser, onAction, onStartNextRound, onReset, onSkip, onOpenShop, isMobile } = props;
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [lastUserMatchSgfIndex, setLastUserMatchSgfIndex] = useState<number | null>(null);
    const [initialMatchPlayers, setInitialMatchPlayers] = useState<{ p1: PlayerForTournament | null, p2: PlayerForTournament | null }>({ p1: null, p2: null });
    const [showConditionPotionModal, setShowConditionPotionModal] = useState(false);
    const prevStatusRef = useRef(tournament.status);
    
    const safeRounds = useMemo(() => 
        Array.isArray(tournament.rounds) ? tournament.rounds : [], 
        [tournament.rounds]
    );

    useEffect(() => {
        onAction({ type: 'ENTER_TOURNAMENT_VIEW' });
        return () => {
            onAction({ type: 'LEAVE_TOURNAMENT_VIEW' });
        };
    }, [onAction]);

    useEffect(() => {
        const status = tournament.status;
        const prevStatus = prevStatusRef.current;
    
        // 경기가 완료되면 마지막 유저 경기의 SGF 인덱스 저장 (모든 회차에서 동일하게 적용)
        if (status === 'round_complete' || status === 'eliminated' || status === 'complete') {
            const lastFinishedUserMatch = [...safeRounds].reverse().flatMap(r => r.matches).find(m => m.isUserMatch && m.isFinished);
            if (lastFinishedUserMatch && lastFinishedUserMatch.sgfFileIndex !== undefined) {
                setLastUserMatchSgfIndex(lastFinishedUserMatch.sgfFileIndex);
            }
        } else if (status === 'bracket_ready') {
            // bracket_ready 상태일 때는 다음 회차로 넘어간 상태이므로 SGF 인덱스 초기화 (빈 바둑판 표시)
            // 동네바둑리그에서 prevStatus가 round_complete였던 경우는 다음 경기 버튼을 눌러 넘어온 상태
            setLastUserMatchSgfIndex(null);
        } else if (status === 'round_in_progress' && tournament.timeElapsed === 1) {
             const matchInfo = tournament.currentSimulatingMatch;
            if (matchInfo) {
                const match = safeRounds[matchInfo.roundIndex].matches[matchInfo.matchIndex];
                const p1 = tournament.players.find(p => p.id === match.players[0]?.id) || null;
                const p2 = tournament.players.find(p => p.id === match.players[1]?.id) || null;
                setInitialMatchPlayers({
                    p1: p1 ? JSON.parse(JSON.stringify(p1)) : null,
                    p2: p2 ? JSON.parse(JSON.stringify(p2)) : null,
                });
            }
        } else if (status !== 'round_in_progress') {
            setInitialMatchPlayers({ p1: null, p2: null });
        }
    
        prevStatusRef.current = status;
    }, [tournament, safeRounds]);
    
    const handleBackClick = useCallback(() => {
        if (tournament.status === 'round_in_progress') {
            if (window.confirm('경기가 진행 중입니다. 현재 경기를 기권하시겠습니까? 현재 경기는 패배 처리됩니다.')) {
                onAction({ type: 'FORFEIT_CURRENT_MATCH', payload: { type: tournament.type } });
            }
        } else {
            onBack();
        }
    }, [onBack, onAction, tournament.status, tournament.type]);

    const handleForfeitClick = useCallback(() => {
        if (window.confirm('토너먼트를 포기하고 나가시겠습니까? 오늘의 참가 기회는 사라집니다.')) {
            onAction({ type: 'FORFEIT_TOURNAMENT', payload: { type: tournament.type } });
        }
    }, [onAction, tournament.type]);

    const isSimulating = tournament.status === 'round_in_progress';
    const currentSimMatch = isSimulating && tournament.currentSimulatingMatch 
        ? safeRounds[tournament.currentSimulatingMatch.roundIndex].matches[tournament.currentSimulatingMatch.matchIndex]
        : null;
        
    const lastFinishedUserMatch = useMemo(() => {
        return [...safeRounds].reverse().flatMap(r => r.matches).find(m => m.isUserMatch && m.isFinished);
    }, [safeRounds]);
    
    // 동네바둑리그에서 round_complete 상태일 때는 마지막 완료된 경기를 표시
    const matchForDisplay = useMemo(() => {
        if (isSimulating) {
            return currentSimMatch;
        }
        
        // 동네바둑리그에서 round_complete 상태일 때는 마지막 완료된 경기를 표시
        // bracket_ready 상태일 때는 다음 회차로 넘어간 상태이므로 다음 경기를 표시
        if (tournament.type === 'neighborhood' && tournament.status === 'round_complete' && lastFinishedUserMatch) {
            return lastFinishedUserMatch;
        }
        
        // 그 외의 경우: 다음 경기, 마지막 완료된 경기, 또는 첫 경기 순서로 표시
        return safeRounds.flatMap(r => r.matches).find(m => m.isUserMatch && !m.isFinished) 
            || lastFinishedUserMatch 
            || safeRounds.flatMap(r => r.matches).find(m => m.isUserMatch) 
            || safeRounds[0]?.matches[0];
    }, [isSimulating, currentSimMatch, tournament.type, tournament.status, safeRounds, lastFinishedUserMatch]);
    
    // 유저의 다음 경기 찾기 (경기 시작 전 상태 확인용)
    const upcomingUserMatch = useMemo(() => {
        return safeRounds.flatMap(r => r.matches).find(m => m.isUserMatch && !m.isFinished);
    }, [safeRounds]);

    // 현재 유저의 컨디션 찾기
    const userPlayer = useMemo(() => {
        return tournament.players.find(p => p.id === currentUser.id);
    }, [tournament.players, currentUser.id]);
    
    const winner = useMemo(() => {
        if (tournament.status !== 'complete') return null;
        if (tournament.type === 'neighborhood') {
             const wins: Record<string, number> = {};
            tournament.players.forEach(p => wins[p.id] = 0);
            safeRounds[0].matches.forEach(m => { if(m.winner) wins[m.winner.id]++; });
            return [...tournament.players].sort((a,b) => wins[b.id] - wins[a.id])[0];
        } else {
            const finalMatch = safeRounds.find(r => r.name === '결승');
            return finalMatch?.matches[0]?.winner;
        }
    }, [tournament.status, tournament.type, tournament.players, safeRounds]);
    
    const myResultText = useMemo(() => {
        if (tournament.status === 'complete' || tournament.status === 'eliminated') {
            if (tournament.type === 'neighborhood') {
                const allMyMatches = safeRounds.flatMap(r => r.matches).filter(m => m.isUserMatch && m.isFinished);
                const winsCount = allMyMatches.filter(m => m.winner?.id === currentUser.id).length;
                const lossesCount = allMyMatches.length - winsCount;

                const playerWins: Record<string, number> = {};
                tournament.players.forEach(p => { playerWins[p.id] = 0; });
                safeRounds[0].matches.forEach(m => {
                    if (m.winner) playerWins[m.winner.id] = (playerWins[m.winner.id] || 0) + 1;
                });

                const sortedPlayers = [...tournament.players].sort((a, b) => playerWins[b.id] - playerWins[a.id]);
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

        if (tournament.status === 'round_complete' || tournament.status === 'bracket_ready') {
            const lastFinishedUserMatch = [...safeRounds].reverse().flatMap(r => r.matches).find(m => m.isUserMatch && m.isFinished);
            if (lastFinishedUserMatch) {
                const userWonLastMatch = lastFinishedUserMatch.winner?.id === currentUser.id;
                if (tournament.type === 'neighborhood') {
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
    }, [currentUser.id, tournament, winner, safeRounds]);
    
    const p1_from_match = matchForDisplay?.players[0] || null;
    const p2_from_match = matchForDisplay?.players[1] || null;

    const p1 = p1_from_match ? tournament.players.find(p => p.id === p1_from_match.id) || p1_from_match : null;
    const p2 = p2_from_match ? tournament.players.find(p => p.id === p2_from_match.id) || p2_from_match : null;

    // 경기 시작 전에는 홈 화면과 동일한 능력치 계산 (calculateTotalStats 사용)
    // 경기 중에는 player.stats를 사용 (컨디션으로 인한 변화 반영)
    const p1Stats = useMemo(() => {
        if (tournament.status === 'round_in_progress') {
            return p1?.stats || {};
        } else {
            // 경기 시작 전에는 홈 화면과 동일한 능력치 계산
            const p1User = allUsersForRanking.find(u => u.id === p1?.id);
            if (p1User) {
                return calculateTotalStats(p1User);
            }
            return p1?.stats || {};
        }
    }, [p1?.stats, p1?.id, tournament.status, allUsersForRanking]);

    const p2Stats = useMemo(() => {
        if (tournament.status === 'round_in_progress') {
            return p2?.stats || {};
        } else {
            // 경기 시작 전에는 홈 화면과 동일한 능력치 계산
            const p2User = allUsersForRanking.find(u => u.id === p2?.id);
            if (p2User) {
                return calculateTotalStats(p2User);
            }
            return p2?.stats || {};
        }
    }, [p2?.stats, p2?.id, tournament.status, allUsersForRanking]);

    const radarDatasets = useMemo(() => [
        { stats: p1Stats, color: '#60a5fa', fill: 'rgba(59, 130, 246, 0.4)' },
        { stats: p2Stats, color: '#f87171', fill: 'rgba(239, 68, 68, 0.4)' },
    ], [p1Stats, p2Stats]);

    const maxStatValue = useMemo(() => {
        if (!p1Stats || !p2Stats || Object.keys(p1Stats).length === 0 || Object.keys(p2Stats).length === 0) {
            return 200; // A reasonable default
        }
        const allStats = [
            ...Object.values(p1Stats),
            ...Object.values(p2Stats)
        ];
        const maxStat = Math.max(...allStats, 0);
        return Math.ceil((maxStat + 50) / 50) * 50; // Round up to nearest 50
    }, [p1Stats, p2Stats]);

    const currentPhase = useMemo((): 'early' | 'mid' | 'end' | 'none' => {
        if (tournament.status !== 'round_in_progress') return 'none';
        const time = tournament.timeElapsed;
        if (time <= 15) return 'early';
        if (time <= 35) return 'mid';
        if (time <= 50) return 'end';
        return 'none';
    }, [tournament.timeElapsed, tournament.status]);

    // 서버에서 매초 누적된 능력치 점수를 가져옴
    // 초반(1-15초): 초반전 능력치 합계 누적
    // 중반(16-35초): 중반전 능력치 합계 누적
    // 종반(36-50초): 종반전 능력치 합계 누적
    const p1Cumulative = tournament.currentMatchScores?.player1 || 0;
    const p2Cumulative = tournament.currentMatchScores?.player2 || 0;
    const totalCumulative = p1Cumulative + p2Cumulative;
    
    // 누적 점수를 비율로 변환하여 그래프에 표시
    const p1Percent = totalCumulative > 0 ? (p1Cumulative / totalCumulative) * 100 : 50;
    const p2Percent = totalCumulative > 0 ? (p2Cumulative / totalCumulative) * 100 : 50;

    const renderFooterButton = () => {
        const { status } = tournament;

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

        // 동네바둑리그: round_complete 상태일 때는 현재 회차가 완료된 상태이므로 다음 회차로 넘어갈 준비가 되면 "다음경기" 버튼 표시
        if (tournament.type === 'neighborhood' && status === 'round_complete') {
            const currentRound = tournament.currentRoundRobinRound || 1;
            const hasNextRound = currentRound < 5;
            
            // round_complete 상태는 현재 회차의 모든 경기가 완료된 상태이므로, 다음 회차가 있으면 "다음경기" 버튼 표시
            if (hasNextRound) {
                return (
                    <div className="flex items-center justify-center gap-4">
                        <Button 
                            onClick={async () => {
                                console.log('[TournamentBracket] 다음경기 버튼 클릭');
                                try {
                                    await onStartNextRound();
                                } catch (error) {
                                    console.error('[TournamentBracket] 다음경기 버튼 오류:', error);
                                }
                            }} 
                            colorScheme="blue" 
                            className="animate-pulse"
                        >
                            다음경기
                        </Button>
                        <Button onClick={handleForfeitClick} colorScheme="red">포기</Button>
                    </div>
                );
            }
        }

        const hasUnfinishedUserMatch = safeRounds.some(r =>
            r.matches.some(m => m.isUserMatch && !m.isFinished)
        );

        if ((status === 'round_complete' || status === 'bracket_ready') && hasUnfinishedUserMatch) {
            return (
                <div className="flex items-center justify-center gap-4">
                    <Button 
                        onClick={() => onAction({ type: 'START_TOURNAMENT_MATCH', payload: { type: tournament.type } })} 
                        colorScheme="green" 
                        className="animate-pulse"
                    >
                        경기 시작
                    </Button>
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

    const sidebarContent = (
        <div className="h-full flex flex-col min-h-0 overflow-y-auto">
            {tournament.type === 'neighborhood' ? (
                <RoundRobinDisplay tournamentState={tournament} currentUser={currentUser} />
            ) : (
                <TournamentRoundViewer rounds={safeRounds} currentUser={currentUser} tournamentType={tournament.type} />
            )}
        </div>
    );

    const mainContent = (
        <main className="flex-1 flex flex-col lg:flex-row gap-2 min-h-0 overflow-hidden">
            {!isMobile && (
                <aside className="hidden lg:flex flex-col lg:w-[320px] xl:w-[380px] flex-shrink-0 min-h-0 overflow-y-auto">
                    {sidebarContent}
                </aside>
            )}

            <div className="flex-1 flex flex-col gap-2 min-h-0 min-w-0 overflow-hidden">
                {/* 플레이어 프로필 섹션 */}
                <section className="flex-shrink-0 flex flex-row gap-1 md:gap-2 items-stretch p-1.5 md:p-2 bg-gray-800/50 rounded-lg max-h-[200px] md:max-h-[240px]">
                    <div className="flex-1 min-w-0">
                        <PlayerProfilePanel 
                            player={p1} 
                            initialPlayer={initialMatchPlayers.p1} 
                            allUsers={allUsersForRanking} 
                            currentUserId={currentUser.id} 
                            onViewUser={onViewUser} 
                            highlightPhase={currentPhase}
                            isUserMatch={(currentSimMatch?.isUserMatch || (upcomingUserMatch && upcomingUserMatch.players.some(p => p?.id === p1?.id))) || false}
                            onUseConditionPotion={() => {
                                setShowConditionPotionModal(true);
                            }}
                            timeElapsed={tournament.timeElapsed}
                            tournamentStatus={tournament.status}
                        />
                    </div>
                    <div className="flex-shrink-0 w-32 sm:w-40 md:w-44 xl:w-52 flex flex-col items-center justify-center min-w-0">
                        <RadarChart datasets={radarDatasets} maxStatValue={maxStatValue} size={isMobile ? 120 : undefined} />
                        <div className="flex justify-center gap-1 sm:gap-2 text-[9px] sm:text-[10px] md:text-xs mt-1">
                            <span className="flex items-center gap-0.5"><div className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-sm" style={{backgroundColor: 'rgba(59, 130, 246, 0.6)'}}></div><span className="truncate max-w-[40px] sm:max-w-none">{p1?.nickname || '선수 1'}</span></span>
                            <span className="flex items-center gap-0.5"><div className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-sm" style={{backgroundColor: 'rgba(239, 68, 68, 0.6)'}}></div><span className="truncate max-w-[40px] sm:max-w-none">{p2?.nickname || '선수 2'}</span></span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <PlayerProfilePanel 
                            player={p2} 
                            initialPlayer={initialMatchPlayers.p2} 
                            allUsers={allUsersForRanking} 
                            currentUserId={currentUser.id} 
                            onViewUser={onViewUser} 
                            highlightPhase={currentPhase}
                            isUserMatch={(currentSimMatch?.isUserMatch || (upcomingUserMatch && upcomingUserMatch.players.some(p => p?.id === p2?.id))) || false}
                            onUseConditionPotion={() => {
                                setShowConditionPotionModal(true);
                            }}
                            timeElapsed={tournament.timeElapsed}
                            tournamentStatus={tournament.status}
                        />
                    </div>
                </section>
                
                {/* SGF뷰어 및 중계패널 섹션 */}
                <div className="flex-1 flex flex-col lg:flex-row gap-2 min-h-0 overflow-hidden">
                    {/* SGF뷰어 */}
                    <div className="w-full lg:w-2/5 flex-1 min-h-0 bg-gray-800/50 rounded-lg p-1 md:p-2 flex items-center justify-center overflow-auto">
                        <SgfViewer 
                            timeElapsed={isSimulating ? tournament.timeElapsed : 0} 
                            fileIndex={
                                isSimulating 
                                    ? currentSimMatch?.sgfFileIndex 
                                    : (() => {
                                        // 동네바둑리그에서 round_complete 상태일 때는 마지막 완료된 경기의 SGF 표시
                                        // bracket_ready 상태일 때는 다음 회차로 넘어간 상태이므로 빈 바둑판 표시
                                        if (tournament.type === 'neighborhood') {
                                            if (tournament.status === 'round_complete') {
                                                return lastUserMatchSgfIndex !== null ? lastUserMatchSgfIndex : (matchForDisplay?.sgfFileIndex !== undefined ? matchForDisplay.sgfFileIndex : null);
                                            } else if (tournament.status === 'bracket_ready') {
                                                // 다음 회차 준비 상태이므로 빈 바둑판 표시
                                                return null;
                                            }
                                        }
                                        // 경기 시작 전에는 빈 바둑판
                                        if (tournament.status === 'bracket_ready' && !upcomingUserMatch?.sgfFileIndex) {
                                            return null;
                                        }
                                        // 그 외의 경우: 마지막 완료된 경기 또는 다음 경기
                                        return lastUserMatchSgfIndex !== null ? lastUserMatchSgfIndex : (matchForDisplay?.sgfFileIndex !== undefined ? matchForDisplay.sgfFileIndex : null);
                                    })()
                            }
                            showLastMoveOnly={!isSimulating && (tournament.status === 'round_complete' || tournament.status === 'complete' || tournament.status === 'eliminated')}
                        />
                    </div>
                    
                    {/* 중계패널 (점수 그래프 + 해설) */}
                    <div className="w-full lg:w-3/5 flex flex-col gap-2 min-h-0 overflow-hidden">
                        <section className="flex-shrink-0 bg-gray-800/50 rounded-lg p-2 md:p-3">
                            <ScoreGraph p1Percent={p1Percent} p2Percent={p2Percent} p1Nickname={p1?.nickname} p2Nickname={p2?.nickname}/>
                            <div className="mt-2"><SimulationProgressBar timeElapsed={tournament.timeElapsed} totalDuration={50} /></div>
                        </section>
                        <div className="flex-1 min-h-0 bg-gray-800/50 rounded-lg p-1 md:p-2 flex flex-col overflow-y-auto">
                            <CommentaryPanel commentary={tournament.currentMatchCommentary} isSimulating={tournament.status === 'round_in_progress'} />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
    
    const renderFooter = () => (
        <footer className="flex-shrink-0 bg-gray-800/50 rounded-lg p-3 grid grid-cols-1 md:grid-cols-4 items-center gap-2">
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
                <FinalRewardPanel tournamentState={tournament} currentUser={currentUser} onAction={onAction} />
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center flex flex-col items-center justify-center border border-gray-600/50">
                <img src="/images/championship/Ranking.png" alt="Trophy" className="w-16 h-16 mb-2" />
                <h4 className="font-bold text-gray-400 text-sm">우승자</h4>
                {winner ? <p className="text-lg font-semibold text-yellow-300">{winner.nickname}</p> : <p className="text-xs text-gray-500">진행 중...</p>}
            </div>
        </footer>
    );

    return (
        <div className="w-full h-full flex flex-col gap-1 sm:gap-2 bg-gray-900 text-white relative overflow-hidden">
            {isMobile ? (
                <>
                    <div className="flex-1 flex flex-col gap-1 sm:gap-2 min-h-0 relative overflow-hidden p-1 sm:p-2">
                        <div className="absolute top-1/2 -translate-y-1/2 right-2 z-20">
                            <button 
                                onClick={() => setIsMobileSidebarOpen(true)} 
                                className="w-8 h-12 bg-gray-800/80 backdrop-blur-sm rounded-l-lg flex items-center justify-center text-white shadow-lg hover:bg-gray-700/80"
                                aria-label="메뉴 열기"
                            >
                                <span className="relative font-bold text-lg">{'<<'}</span>
                            </button>
                        </div>
                        <div className="flex-1 min-h-0 overflow-hidden">
                            {mainContent}
                        </div>
                        <div className="flex-shrink-0">
                            {renderFooter()}
                        </div>
                    </div>
                    <div className={`fixed top-0 right-0 h-full w-[320px] bg-gray-800 shadow-2xl z-50 transition-transform duration-300 ease-in-out ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                        <div className="flex justify-between items-center p-2 border-b border-gray-600 flex-shrink-0">
                            <h3 className="text-lg font-bold">대진표</h3>
                            <button onClick={() => setIsMobileSidebarOpen(false)} className="text-2xl font-bold text-gray-300 hover:text-white">×</button>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto p-2">
                            {sidebarContent}
                        </div>
                    </div>
                    {isMobileSidebarOpen && <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setIsMobileSidebarOpen(false)}></div>}
                </>
            ) : (
                <>
                    <div className="flex-1 min-h-0 overflow-hidden p-1 sm:p-2">
                        {mainContent}
                    </div>
                    <div className="flex-shrink-0 p-1 sm:p-2">
                        {renderFooter()}
                    </div>
                </>
            )}
            {showConditionPotionModal && userPlayer && (
                <ConditionPotionModal
                    currentUser={currentUser}
                    currentCondition={userPlayer.condition}
                    onClose={() => setShowConditionPotionModal(false)}
                    onConfirm={(potionType) => {
                        onAction({ type: 'USE_CONDITION_POTION', payload: { tournamentType: tournament.type, potionType } });
                    }}
                    onAction={onAction}
                    isTopmost={true}
                />
            )}
        </div>
    );
};