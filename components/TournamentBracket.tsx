import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { UserWithStatus, TournamentState, PlayerForTournament, ServerAction, User, CoreStat, Match, Round, CommentaryLine, TournamentType, LeagueTier } from '../types.js';
import Button from './Button.js';
import { TOURNAMENT_DEFINITIONS, BASE_TOURNAMENT_REWARDS, TOURNAMENT_SCORE_REWARDS, CONSUMABLE_ITEMS, MATERIAL_ITEMS, AVATAR_POOL, BORDER_POOL, CORE_STATS_DATA } from '../constants';
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

// 서버의 STAT_WEIGHTS와 동일한 가중치 정의
const STAT_WEIGHTS: Record<'early' | 'mid' | 'end', Partial<Record<CoreStat, number>>> = {
    early: {
        [CoreStat.CombatPower]: 0.4,
        [CoreStat.ThinkingSpeed]: 0.3,
        [CoreStat.Concentration]: 0.3,
    },
    mid: {
        [CoreStat.CombatPower]: 0.3,
        [CoreStat.Judgment]: 0.3,
        [CoreStat.Concentration]: 0.2,
        [CoreStat.Stability]: 0.2,
    },
    end: {
        [CoreStat.Calculation]: 0.5,
        [CoreStat.Stability]: 0.3,
        [CoreStat.Concentration]: 0.2,
    },
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
    onOpenShop?: () => void;
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
    
    // 바둑능력 점수 계산 (모든 능력치의 합계, 정수로 반올림)
    const totalAbilityScore = useMemo(() => {
        return Math.round(Object.values(displayStats).reduce((sum, stat) => sum + (stat || 0), 0));
    }, [displayStats]);
    
    // 초반/중반/종반 능력치 계산 (서버의 calculatePower와 동일한 로직)
    // 각 능력치에 가중치를 곱한 후 합산
    const phaseStats = useMemo(() => {
        const calculatePhasePower = (phase: 'early' | 'mid' | 'end') => {
            const weights = STAT_WEIGHTS[phase];
            let power = 0;
            for (const stat in weights) {
                const statKey = stat as CoreStat;
                const weight = weights[statKey]!;
                power += (displayStats[statKey] || 0) * weight;
            }
            return power;
        };
        
        return {
            early: Math.round(calculatePhasePower('early')),
            mid: Math.round(calculatePhasePower('mid')),
            end: Math.round(calculatePhasePower('end'))
        };
    }, [displayStats]);
    
    return (
        <div className={`bg-gray-900/50 p-2 md:p-3 rounded-lg flex flex-col items-center gap-1 md:gap-2 h-full ${isClickable ? 'cursor-pointer hover:bg-gray-700/50' : ''}`} onClick={isClickable ? () => onViewUser(player.id) : undefined} title={isClickable ? `${player.nickname} 프로필 보기` : ''}>
            <div className="flex items-center gap-1 md:gap-2 w-full">
                 <Avatar userId={player.id} userName={player.nickname} avatarUrl={avatarUrl} borderUrl={borderUrl} size={32} className="md:w-10 md:h-10 flex-shrink-0" />
                 <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 md:gap-1.5 flex-wrap">
                        <h4 className="font-bold text-xs md:text-base truncate">{player.nickname}</h4>
                        <span className="text-[10px] md:text-xs text-blue-300 font-semibold">바둑능력: {totalAbilityScore}</span>
                    </div>
                    <p className="text-[10px] md:text-xs text-gray-400 truncate">({cumulativeStats.wins}승 {cumulativeStats.losses}패)</p>
                 </div>
            </div>
            {/* 경기가 종료된 후에는 컨디션 표시하지 않음 (물약 낭비 방지) */}
            {tournamentStatus !== 'complete' && tournamentStatus !== 'eliminated' && (
                <div className="font-bold text-xs md:text-sm mt-1 relative flex items-center gap-1 md:gap-2 w-full justify-center">
                    <span className="text-[10px] md:text-sm">컨디션:</span> <span className="text-yellow-300 text-xs md:text-sm">{player.condition === 1000 ? '-' : player.condition}</span>
                    {isCurrentUser && player.condition !== 1000 && player.condition < 100 && tournamentStatus !== 'round_in_progress' && tournamentStatus !== 'complete' && tournamentStatus !== 'eliminated' && (
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
                            className="w-5 h-5 md:w-6 md:h-6 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold transition-colors"
                            title={totalPotionCount === 0 ? "컨디션 회복제가 없습니다. 상점에서 구매하세요." : "컨디션 물약 사용 (경기 시작 전에만 사용 가능)"}
                        >
                            +
                        </button>
                    )}
                    {isCurrentUser && player.condition !== 1000 && player.condition < 100 && (tournamentStatus === 'complete' || tournamentStatus === 'eliminated') && (
                        <button 
                            disabled
                            className="w-5 h-5 md:w-6 md:h-6 bg-gray-600 text-gray-400 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold cursor-not-allowed"
                            title="경기가 종료되어 사용할 수 없습니다"
                        >
                            +
                        </button>
                    )}
                    {isCurrentUser && player.condition !== 1000 && player.condition >= 100 && onUseConditionPotion && tournamentStatus !== 'round_in_progress' && (
                        <button 
                            disabled
                            className="w-5 h-5 md:w-6 md:h-6 bg-gray-600 text-gray-400 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold cursor-not-allowed"
                            title="컨디션이 최대치입니다"
                        >
                            +
                        </button>
                    )}
                </div>
            )}
            <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-x-0.5 md:gap-x-1 lg:gap-x-3 gap-y-0.5 text-[10px] md:text-xs mt-1 md:mt-2 border-t border-gray-600 pt-1 md:pt-2">
                {Object.values(CoreStat).map(stat => {
                    const initialValue = initialPlayer?.stats?.[stat] ?? displayStats[stat];
                    const currentValue = displayStats[stat];
                    const change = currentValue - initialValue;

                    return (
                        <React.Fragment key={stat}>
                            <span className={`text-gray-400 truncate ${isStatHighlighted(stat) ? 'text-yellow-400 font-bold' : ''}`}>{stat}</span>
                            <div className="flex justify-end items-baseline relative min-w-0">
                                <span className={`font-mono text-white ${isStatHighlighted(stat) ? 'text-yellow-400 font-bold' : ''} min-w-[30px] md:min-w-[40px] text-right text-[10px] md:text-xs`}>{displayStats[stat]}</span>
                                {/* [N]: 항상 보이는 누적된 변화값 (초기값 대비 현재까지 누적된 변화) */}
                                <span className="ml-0.5 md:ml-1 font-bold text-[9px] md:text-xs min-w-[35px] md:min-w-[45px] text-right">
                                    {initialPlayer && change !== 0 ? (
                                        <span className={`${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            [{change > 0 ? '+' : ''}{change}]
                                        </span>
                                    ) : null}
                                </span>
                                {/* (N): 1초마다 발생한 즉각적인 변화값을 잠시 보여주는 용도 (애니메이션으로 사라짐) */}
                                {/* 애니메이션이 레이아웃에 영향을 주지 않도록 absolute positioning 사용 및 고정 공간 확보 */}
                                <span className="ml-0.5 md:ml-1 font-bold text-[10px] md:text-sm min-w-[40px] md:min-w-[50px] text-right relative">
                                    <span 
                                        className="absolute right-0 top-0 whitespace-nowrap"
                                        style={{ 
                                            animation: statChanges[stat] !== undefined && statChanges[stat] !== 0 && tournamentStatus === 'round_in_progress' ? 'statChangeFade 2s ease-out forwards' : 'none',
                                            opacity: statChanges[stat] !== undefined && statChanges[stat] !== 0 && tournamentStatus === 'round_in_progress' ? 1 : 0,
                                            pointerEvents: 'none' // 클릭 이벤트 방지
                                        }}
                                    >
                                        {statChanges[stat] !== undefined && statChanges[stat] !== 0 && tournamentStatus === 'round_in_progress' ? (
                                            <span className={`text-[10px] md:text-sm ${statChanges[stat] > 0 ? 'text-green-300' : 'text-red-300'}`}>
                                                ({statChanges[stat] > 0 ? '+' : ''}{statChanges[stat]})
                                            </span>
                                        ) : null}
                                    </span>
                                    {/* 공간 확보를 위한 투명한 플레이스홀더 */}
                                    <span className="invisible whitespace-nowrap text-[10px] md:text-sm">
                                        (+99)
                                    </span>
                                </span>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
            {/* 초반/중반/종반 능력치 표시 */}
            <div className="w-full border-t border-gray-600 mt-1 md:mt-2 pt-1 md:pt-2">
                <div className="grid grid-cols-3 gap-1 md:gap-2 text-[9px] md:text-xs">
                    <div className="bg-blue-900/30 rounded px-1 md:px-2 py-0.5 md:py-1 text-center border border-blue-700/50">
                        <div className="text-gray-300 font-semibold mb-0.5">초반</div>
                        <div className="text-blue-300 font-bold text-[10px] md:text-sm">{phaseStats.early}</div>
                    </div>
                    <div className="bg-purple-900/30 rounded px-1 md:px-2 py-0.5 md:py-1 text-center border border-purple-700/50">
                        <div className="text-gray-300 font-semibold mb-0.5">중반</div>
                        <div className="text-purple-300 font-bold text-[10px] md:text-sm">{phaseStats.mid}</div>
                    </div>
                    <div className="bg-orange-900/30 rounded px-1 md:px-2 py-0.5 md:py-1 text-center border border-orange-700/50">
                        <div className="text-gray-300 font-semibold mb-0.5">종반</div>
                        <div className="text-orange-300 font-bold text-[10px] md:text-sm">{phaseStats.end}</div>
                    </div>
                </div>
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

const ScoreGraph: React.FC<{ 
    p1Percent: number; 
    p2Percent: number; 
    p1Nickname?: string; 
    p2Nickname?: string;
    lastScoreIncrement?: { 
        player1: { base: number; actual: number; isCritical: boolean } | null;
        player2: { base: number; actual: number; isCritical: boolean } | null;
    } | null;
}> = ({ p1Percent, p2Percent, p1Nickname, p2Nickname, lastScoreIncrement }) => {
    const [p1Animation, setP1Animation] = useState<{ value: number; isCritical: boolean; key: number; startX: number; graphRect?: DOMRect } | null>(null);
    const [p2Animation, setP2Animation] = useState<{ value: number; isCritical: boolean; key: number; startX: number; graphRect?: DOMRect } | null>(null);
    const prevP1ValueRef = useRef<number | null>(null);
    const prevP2ValueRef = useRef<number | null>(null);
    const graphRef = useRef<HTMLDivElement>(null);
    
    // lastScoreIncrement가 변경되면 애니메이션 트리거
    useEffect(() => {
        if (lastScoreIncrement?.player1 && graphRef.current) {
            const currentValue = lastScoreIncrement.player1.actual;
            // 이전 값과 다르면 애니메이션 트리거
            if (prevP1ValueRef.current !== currentValue) {
                const rect = graphRef.current.getBoundingClientRect();
                setP1Animation({ 
                    value: currentValue, 
                    isCritical: lastScoreIncrement.player1.isCritical,
                    key: Date.now(),
                    startX: p1Percent,
                    graphRect: rect
                });
                // 1.5초 후 애니메이션 제거
                setTimeout(() => setP1Animation(null), 1500);
                prevP1ValueRef.current = currentValue;
            }
        } else if (!lastScoreIncrement?.player1) {
            // player1 데이터가 없으면 애니메이션 제거
            setP1Animation(null);
        }
    }, [lastScoreIncrement?.player1?.actual, p1Percent]);
    
    useEffect(() => {
        if (lastScoreIncrement?.player2 && graphRef.current) {
            const currentValue = lastScoreIncrement.player2.actual;
            // 이전 값과 다르면 애니메이션 트리거
            if (prevP2ValueRef.current !== currentValue) {
                const rect = graphRef.current.getBoundingClientRect();
                setP2Animation({ 
                    value: currentValue, 
                    isCritical: lastScoreIncrement.player2.isCritical,
                    key: Date.now(),
                    startX: p2Percent,
                    graphRect: rect
                });
                // 1.5초 후 애니메이션 제거
                setTimeout(() => setP2Animation(null), 1500);
                prevP2ValueRef.current = currentValue;
            }
        } else if (!lastScoreIncrement?.player2) {
            // player2 데이터가 없으면 애니메이션 제거
            setP2Animation(null);
        }
    }, [lastScoreIncrement?.player2?.actual, p2Percent]);
    
    return (
        <div>
            {p1Nickname && p2Nickname && (
                <div className="flex justify-between text-xs px-1 mb-0.5 font-bold">
                    <span className="truncate max-w-[45%]">흑: {p1Nickname}</span>
                    <span className="truncate max-w-[45%] text-right">백: {p2Nickname}</span>
                </div>
            )}
            <div className="relative">
                <div className="flex justify-between text-xs px-1 mb-0.5 font-bold">
                    <span className="text-gray-300">{p1Percent.toFixed(1)}%</span>
                    <span className="text-gray-300">{p2Percent.toFixed(1)}%</span>
                </div>
                <div className="relative" style={{ paddingTop: '40px' }}>
                    <div ref={graphRef} className="flex w-full h-3 bg-gray-700 rounded-full overflow-hidden border-2 border-black/30 relative">
                        <div className="bg-black transition-all duration-500 ease-in-out" style={{ width: `${p1Percent}%` }}></div>
                        <div className="bg-white transition-all duration-500 ease-in-out" style={{ width: `${p2Percent}%` }}></div>
                        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gray-400/50" title="중앙"></div>
                    </div>
                    
                    {/* 점수 증가 애니메이션 (흑/백 함께 표시) */}
                    {((p1Animation && p1Animation.graphRect) || (p2Animation && p2Animation.graphRect)) && graphRef.current && (
                        <div
                            key={`${p1Animation?.key || 0}-${p2Animation?.key || 0}`}
                            className="absolute pointer-events-none"
                            style={{
                                left: '50%',
                                top: '0px',
                                transform: 'translateX(-50%)',
                                animation: `slideToCenter 1.5s ease-out forwards`,
                                zIndex: 99999,
                            }}
                        >
                            <div className="flex items-center gap-2">
                                {/* 흑 (P1) */}
                                {p1Animation && (
                                    <div className={`px-3 py-1.5 rounded-lg ${
                                        p1Animation.isCritical 
                                            ? 'bg-black border-2 border-yellow-400 shadow-lg shadow-yellow-500/50' 
                                            : 'bg-black border-2 border-gray-600 shadow-lg'
                                    }`}>
                                        <span className={`font-bold ${
                                            p1Animation.isCritical 
                                                ? 'text-yellow-300 text-xl animate-pulse' 
                                                : 'text-white text-lg'
                                        }`}>
                                            {p1Animation.isCritical ? `+${Math.round(p1Animation.value)}! ⚡` : `+${Math.round(p1Animation.value)}`}
                                        </span>
                                    </div>
                                )}
                                
                                {/* 백 (P2) */}
                                {p2Animation && (
                                    <div className={`px-3 py-1.5 rounded-lg ${
                                        p2Animation.isCritical 
                                            ? 'bg-white border-2 border-red-500 shadow-lg shadow-red-500/50' 
                                            : 'bg-white border-2 border-gray-400 shadow-lg'
                                    }`}>
                                        <span className={`font-bold ${
                                            p2Animation.isCritical 
                                                ? 'text-red-600 text-xl animate-pulse' 
                                                : 'text-black text-lg'
                                        }`}>
                                            {p2Animation.isCritical ? `+${Math.round(p2Animation.value)}! ⚡` : `+${Math.round(p2Animation.value)}`}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                @keyframes slideToCenter {
                    0% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0) scale(1);
                        filter: brightness(1);
                    }
                    30% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(-15px) scale(1.15);
                        filter: brightness(1.1);
                    }
                    60% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(-25px) scale(1.25);
                        filter: brightness(1.2);
                    }
                    100% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-40px) scale(0.7);
                        filter: brightness(0.8);
                    }
                }
            `}</style>
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
        <div className="h-full flex flex-col min-h-0" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h4 className="text-center font-bold text-sm mb-2 text-gray-400 py-1 flex-shrink-0">
                실시간 중계
                {isSimulating && <span className="ml-2 text-yellow-400 animate-pulse">경기 진행 중...</span>}
            </h4>
            <div 
                ref={commentaryContainerRef} 
                className="flex-1 min-h-0 overflow-y-auto space-y-2 text-sm text-gray-300 p-2 bg-gray-900/40 rounded-md"
                style={{ 
                    overflowY: 'auto', 
                    WebkitOverflowScrolling: 'touch',
                    flex: '1 1 0',
                    minHeight: 0,
                    maxHeight: '100%'
                }}
            >
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
    const isInProgress = tournamentState.status === 'round_in_progress' || tournamentState.status === 'bracket_ready';

    const { type, rounds } = tournamentState;
    const definition = TOURNAMENT_DEFINITIONS[type];
    const rewardInfo = BASE_TOURNAMENT_REWARDS[type];
    
    // 현재 순위 계산 (경기 진행 중에도 업데이트)
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
    
    // 동네바둑리그: 누적 골드 표시 (경기 진행 중에도 표시)
    const accumulatedGold = tournamentState.type === 'neighborhood' ? (tournamentState.accumulatedGold || 0) : 0;
    
    // 전국바둑대회: 누적 재료 표시 (경기 진행 중에도 표시)
    const accumulatedMaterials = tournamentState.type === 'national' ? (tournamentState.accumulatedMaterials || {}) : {};
    
    // 월드챔피언십: 누적 장비상자 표시 (경기 진행 중에도 표시)
    const accumulatedEquipmentBoxes = tournamentState.type === 'world' ? (tournamentState.accumulatedEquipmentBoxes || {}) : {};
    
    // 랭킹 점수 계산 (현재 순위 기준, 경기 진행 중에도 표시)
    const scoreRewardInfo = TOURNAMENT_SCORE_REWARDS[type];
    let scoreRewardKey: number = 9; // 기본값 (최하위)
    if (userRank > 0) {
        if (type === 'neighborhood') {
            scoreRewardKey = userRank;
        } else if (type === 'national') {
            scoreRewardKey = userRank <= 4 ? userRank : 5;
        } else { // world
            if (userRank <= 4) scoreRewardKey = userRank;
            else if (userRank <= 8) scoreRewardKey = 5;
            else scoreRewardKey = 9;
        }
    }
    const scoreReward = scoreRewardInfo?.[scoreRewardKey] || 0;
    
    // 최종 순위 보상 (경기 종료 후에만 표시)
    let rewardKey: number;
    if (userRank > 0) {
        if (type === 'neighborhood') rewardKey = userRank <= 3 ? userRank : 4;
        else if (type === 'national') rewardKey = userRank <= 4 ? userRank : 5;
        else { // world
            if (userRank <= 4) rewardKey = userRank;
            else if (userRank <= 8) rewardKey = 5;
            else rewardKey = 9;
        }
    } else {
        rewardKey = type === 'neighborhood' ? 4 : type === 'national' ? 5 : 9;
    }
    
    const reward = rewardInfo?.rewards[rewardKey];
    const rewardClaimedKey = `${type}RewardClaimed` as keyof User;
    const isClaimed = !!currentUser[rewardClaimedKey];
    const canClaimReward = (isTournamentFullyComplete || isUserEliminated) && !isClaimed;

    const handleClaim = () => {
        if (canClaimReward) {
            audioService.claimReward();
            onAction({ type: 'CLAIM_TOURNAMENT_REWARD', payload: { tournamentType: type } });
        }
    };
    
    return (
        <div className="h-full flex flex-col min-h-0" style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <h4 className="text-center font-bold text-base mb-2 text-gray-400 py-1 flex-shrink-0">획득 보상</h4>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 p-2 bg-gray-900/40 rounded-md" style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', flex: '1 1 0', minHeight: 0, maxHeight: '100%' }}>
            {/* 수령 완료 메시지 */}
            {isClaimed && (
                <div className="mb-2 px-2 py-1.5 bg-green-900/30 rounded-lg border border-green-700/50">
                    <p className="text-xs text-green-400 text-center font-semibold">✓ 보상을 수령했습니다.</p>
                </div>
            )}
            
            {/* 경기 진행 중 안내 */}
            {isInProgress && (
                <div className="mb-2 px-2 py-1.5 bg-blue-900/30 rounded-lg border border-blue-700/50">
                    <p className="text-xs text-blue-400 text-center">경기 진행 중 - 누적 보상 표시</p>
                </div>
            )}
            
            {/* 랭킹 점수 (경기 진행 중에도 표시) */}
            {scoreReward > 0 && (
                <div className={`mb-2 bg-green-900/30 px-2 py-2 rounded-lg border border-green-700/50 ${isClaimed ? 'opacity-75' : ''}`}>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🏆</span>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-green-300">랭킹 점수: +{scoreReward}점</div>
                            {userRank > 0 && (
                                <div className="text-xs text-gray-400">(현재 순위: {userRank}위)</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* 누적 골드 (동네바둑리그, 경기 진행 중에도 표시) */}
            {accumulatedGold > 0 && (
                <div className={`mb-2 bg-yellow-900/30 px-2 py-2 rounded-lg border border-yellow-700/50 ${isClaimed ? 'opacity-75' : ''}`}>
                    <div className="flex items-center gap-2">
                        <img src="/images/icon/Gold.png" alt="골드" className="w-6 h-6 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-yellow-300">경기 보상: {accumulatedGold.toLocaleString()} 골드</div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* 누적 재료 (전국바둑대회, 경기 진행 중에도 표시) */}
            {Object.keys(accumulatedMaterials).length > 0 && (
                <div className={`mb-2 ${isClaimed ? 'opacity-75' : ''}`}>
                    <div className="text-sm font-semibold text-blue-300 mb-1.5">
                        경기 보상 (재료):
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {Object.entries(accumulatedMaterials).map(([materialName, quantity]) => {
                            const materialTemplate = MATERIAL_ITEMS[materialName];
                            const imageUrl = materialTemplate?.image || '';
                            return (
                                <div key={materialName} className="flex items-center gap-2 bg-blue-900/30 px-2 py-1.5 rounded-lg border border-blue-700/50">
                                    <img src={imageUrl} alt={materialName} className="w-6 h-6 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-blue-300 truncate">{materialName} x{quantity}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {/* 누적 장비상자 (월드챔피언십, 경기 진행 중에도 표시) */}
            {Object.keys(accumulatedEquipmentBoxes).length > 0 && (
                <div className={`mb-2 ${isClaimed ? 'opacity-75' : ''}`}>
                    <div className="text-sm font-semibold text-purple-300 mb-1.5">
                        경기 보상 (장비상자):
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {Object.entries(accumulatedEquipmentBoxes).map(([boxName, quantity]) => {
                            const boxTemplate = CONSUMABLE_ITEMS.find(i => i.name === boxName);
                            const imageUrl = boxTemplate?.image || '';
                            return (
                                <div key={boxName} className="flex items-center gap-2 bg-purple-900/30 px-2 py-1.5 rounded-lg border border-purple-700/50">
                                    <img src={imageUrl} alt={boxName} className="w-6 h-6 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-purple-300 truncate">{boxName} x{quantity}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {/* 최종 순위 보상 (경기 종료 후에만 표시) */}
            {(isTournamentFullyComplete || isUserEliminated) && reward && (
                <>
                    <div className="mt-3 pt-3 border-t border-gray-700">
                        <div className="text-sm font-semibold text-gray-300 mb-2 text-center">최종 순위 보상</div>
                        <div className="flex flex-row items-center justify-center gap-2 flex-wrap">
                            {(reward.items || []).map((item, index) => {
                                const itemName = 'itemId' in item ? item.itemId : (item as any).name;
                                const itemTemplate = CONSUMABLE_ITEMS.find(i => i.name === itemName);
                                const imageUrl = itemTemplate?.image || '';
                                return (
                                    <div key={index} className="flex flex-col items-center gap-1">
                                        <button
                                            onClick={handleClaim}
                                            disabled={isClaimed || !canClaimReward}
                                            className={`relative w-16 h-16 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50`}
                                            title={isClaimed ? '수령 완료' : !canClaimReward ? '경기 종료 후 수령 가능' : '클릭하여 수령'}
                                        >
                                            <img 
                                                src={imageUrl} 
                                                alt={itemName} 
                                                className={`w-full h-full object-contain ${isClaimed || !canClaimReward ? 'filter grayscale' : ''}`} 
                                            />
                                            {isClaimed && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-2xl text-green-400">✓</div>
                                            )}
                                        </button>
                                        <div className="text-xs text-center max-w-[80px] truncate" title={itemName}>{itemName}</div>
                                        <div className="text-xs text-gray-400">x{item.quantity}</div>
                                    </div>
                                );
                            })}
                        </div>
                        {!canClaimReward && !isClaimed && (
                            <p className="text-xs text-gray-500 mt-2 text-center">경기 종료 후 수령 가능</p>
                        )}
                    </div>
                </>
            )}
            
            {/* 경기 진행 중이면서 최종 보상이 아직 없는 경우 */}
            {isInProgress && (!reward || (reward.items || []).length === 0) && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-500 text-center">최종 순위 보상은 경기 종료 후 표시됩니다.</p>
                </div>
            )}
            
            {/* 보상이 하나도 없는 경우 */}
            {scoreReward === 0 && accumulatedGold === 0 && Object.keys(accumulatedMaterials).length === 0 && Object.keys(accumulatedEquipmentBoxes).length === 0 && (!reward || (reward.items || []).length === 0) && (
                <div className="flex items-center justify-center h-full">
                    <p className="text-xs text-gray-500 text-center">획득한 보상이 없습니다.</p>
                </div>
            )}
            </div>
        </div>
    );
};


const MatchBox: React.FC<{ match: Match; currentUser: UserWithStatus; tournamentState?: TournamentState }> = ({ match, currentUser, tournamentState }) => {
    const p1 = match.players[0];
    const p2 = match.players[1];

    // 사용자 진행상태 계산
    const getUserProgressStatus = (playerId: string): string | null => {
        if (playerId !== currentUser.id || !tournamentState) return null;
        
        const isNationalTournament = tournamentState.type === 'national';
        const isWorldTournament = tournamentState.type === 'world';
        
        if (isNationalTournament || isWorldTournament) {
            // 전국바둑대회/월드챔피언십: 토너먼트 형식 (N강 진출, 결승 진출 등)
            const currentRound = tournamentState.rounds.find(r => r.matches.some(m => m.id === match.id));
            if (!currentRound || !match.isFinished) return null;
            
            const isWinner = match.winner?.id === playerId;
            if (!isWinner) return null; // 패자는 표시하지 않음
            
            const roundName = currentRound.name;
            if (roundName === '16강') {
                return '8강 진출';
            } else if (roundName === '8강') {
                return '4강 진출';
            } else if (roundName === '4강') {
                return '결승 진출';
            } else if (roundName === '결승') {
                return '우승';
            } else if (roundName === '3,4위전') {
                return '3/4위전 진출';
            }
            return null;
        } else {
            // 동네바둑리그: 기존 형식
            const allUserMatches = tournamentState.rounds.flatMap(r => r.matches).filter(m => 
                m.isUserMatch && m.players.some(p => p?.id === playerId)
            );
            const finishedMatches = allUserMatches.filter(m => m.isFinished);
            const wins = finishedMatches.filter(m => m.winner?.id === playerId).length;
            const losses = finishedMatches.length - wins;
            
            if (finishedMatches.length === 0) return null;
            
            const lastMatch = finishedMatches[finishedMatches.length - 1];
            const lastMatchWon = lastMatch.winner?.id === playerId;
            const matchNumber = finishedMatches.length;
            
            return `${matchNumber}차전 ${lastMatchWon ? '승리' : '패배'}! (${wins}승 ${losses}패)`;
        }
    };

    // 결승전 우승자 확인
    const isFinalMatch = useMemo(() => {
        if (!tournamentState) return false;
        const finalRound = tournamentState.rounds.find(r => r.name === '결승');
        return finalRound?.matches.some(m => m.id === match.id) || false;
    }, [tournamentState, match.id]);
    
    const isTournamentComplete = tournamentState?.status === 'complete';

    const PlayerDisplay: React.FC<{ player: PlayerForTournament | null, isWinner: boolean }> = ({ player, isWinner }) => {
        const isNationalTournament = tournamentState?.type === 'national';
        const isWorldTournament = tournamentState?.type === 'world';
        const isTournamentFormat = isNationalTournament || isWorldTournament;
        
        if (!player) {
            return (
                <div className={`${isTournamentFormat ? 'h-16' : 'h-10'} flex items-center justify-center ${isTournamentFormat ? 'px-4' : 'px-2'}`}>
                    <span className={`text-gray-500 italic ${isTournamentFormat ? 'text-base' : 'text-sm'}`}>경기 대기중...</span>
                </div>
            );
        }
        
        const avatarUrl = AVATAR_POOL.find(a => a.id === player.avatarId)?.url;
        const borderUrl = BORDER_POOL.find(b => b.id === player.borderId)?.url;
        const progressStatus = getUserProgressStatus(player.id);
        const showTrophy = isFinalMatch && isTournamentComplete && isWinner && player.id === match.winner?.id && match.isFinished;

        if (isTournamentFormat) {
            // 전국바둑대회/월드챔피언십: 가로 배치용 컴팩트 레이아웃
            const winMarginText = isWinner && match.isFinished ? (() => {
                if (!match.finalScore) return '승';
                const p1Percent = match.finalScore.player1;
                const diffPercent = Math.abs(p1Percent - 50) * 2;
                const scoreDiff = diffPercent / 2;
                const roundedDiff = Math.round(scoreDiff);
                const finalDiff = roundedDiff + 0.5;
                const winMargin = finalDiff < 0.5 ? '0.5' : finalDiff.toFixed(1);
                return `${winMargin}집 승`;
            })() : null;
            
            return (
                <div className={`flex flex-col items-center justify-center ${isWinner ? 'px-3 py-2' : 'px-2 py-1.5'} rounded-lg transition-all ${
                    isWinner 
                        ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-400/50 shadow-lg shadow-yellow-500/20' 
                        : match.isFinished 
                            ? 'opacity-50' 
                            : 'hover:bg-gray-700/30'
                }`}>
                    {/* Avatar */}
                    <div className="flex-shrink-0 mb-1.5">
                        <Avatar userId={player.id} userName={player.nickname} avatarUrl={avatarUrl} borderUrl={borderUrl} size={36} />
                    </div>
                    
                    {/* 텍스트 영역 */}
                    <div className="flex flex-col items-center justify-center gap-1 w-full min-w-0">
                        {/* 닉네임과 트로피 */}
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span className={`text-center font-semibold text-sm break-words ${
                                isWinner 
                                    ? 'text-yellow-300 font-bold' 
                                    : match.isFinished 
                                        ? 'text-gray-400' 
                                        : 'text-gray-200'
                            }`}>
                                {player.nickname}
                            </span>
                            {showTrophy && (
                                <img 
                                    src="/images/championship/Ranking.png" 
                                    alt="Trophy" 
                                    className="w-4 h-4 flex-shrink-0" 
                                />
                            )}
                        </div>
                        
                        {/* 승리 배지 (전국바둑대회/월드챔피언십: 승자에게만 표시, 한 줄로) */}
                        {winMarginText && (
                            <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold text-xs px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                                <span>🏆</span>
                                <span>{winMarginText}</span>
                            </div>
                        )}
                        
                        {/* 진행 상태 (전국바둑대회/월드챔피언십: 승자에게만 표시) */}
                        {progressStatus && (
                            <div className="text-yellow-400 font-semibold text-xs text-center break-words">
                                {progressStatus}
                            </div>
                        )}
                    </div>
                </div>
            );
        } else {
            // 동네바둑리그: 기본 레이아웃
            return (
                <div className={`flex items-center gap-2 ${isWinner ? 'px-2 py-2' : 'px-2 py-1.5'} rounded-md transition-all ${
                    isWinner 
                        ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-400/50 shadow-lg shadow-yellow-500/20' 
                        : match.isFinished 
                            ? 'opacity-50' 
                            : 'hover:bg-gray-700/30'
                }`}>
                    <Avatar userId={player.id} userName={player.nickname} avatarUrl={avatarUrl} borderUrl={borderUrl} size={32} />
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                            <span className={`truncate font-semibold text-sm ${
                                isWinner 
                                    ? 'text-yellow-300 font-bold' 
                                    : match.isFinished 
                                        ? 'text-gray-400' 
                                        : 'text-gray-200'
                            }`}>
                                {player.nickname}
                            </span>
                            {showTrophy && (
                                <img 
                                    src="/images/championship/Ranking.png" 
                                    alt="Trophy" 
                                    className="w-4 h-4 flex-shrink-0" 
                                />
                            )}
                        </div>
                        {progressStatus && (
                            <span className="text-yellow-400 font-semibold text-xs truncate">
                                {progressStatus}
                            </span>
                        )}
                    </div>
                </div>
            );
        }
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

    // 전국바둑대회/월드챔피언십인지 확인 (tournamentState의 type으로 판단)
    const isNationalTournament = tournamentState?.type === 'national';
    const isWorldTournament = tournamentState?.type === 'world';
    const isTournamentFormat = isNationalTournament || isWorldTournament;
    
    return (
        <div className={`relative w-full rounded-xl overflow-hidden transition-all duration-300 ${
            isMyMatch 
                ? 'bg-gradient-to-br from-blue-900/60 via-blue-800/50 to-indigo-900/60 border-2 border-blue-500/70 shadow-lg shadow-blue-500/20' 
                : 'bg-gradient-to-br from-gray-800/80 via-gray-700/70 to-gray-800/80 border border-gray-600/50 shadow-md'
        } ${isFinished ? '' : 'hover:scale-[1.02] hover:shadow-xl'}`}>
            {/* 승리 배지 (동네바둑리그만 표시, 전국바둑대회/월드챔피언십은 PlayerDisplay에 표시) */}
            {isFinished && !isTournamentFormat && (
                <div className={`absolute top-2 right-2 flex gap-1`}>
                    {p1IsWinner && (
                        <div className={`bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold text-xs px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1`}>
                            <span>🏆</span>
                            <span>{winMargin}집 승</span>
                        </div>
                    )}
                    {p2IsWinner && (
                        <div className={`bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold text-xs px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1`}>
                            <span>🏆</span>
                            <span>{winMargin}집 승</span>
                        </div>
                    )}
                </div>
            )}
            
            {isTournamentFormat ? (
                // 전국바둑대회/월드챔피언십: 가로 배치 (1번선수 vs 2번선수)
                <div className="p-3">
                    <div className="flex items-center justify-center gap-3">
                        <div className="flex-1 min-w-0 flex justify-center">
                            <PlayerDisplay player={p1} isWinner={p1IsWinner} />
                        </div>
                        {!isFinished && (
                            <div className="text-sm text-gray-400 font-semibold flex-shrink-0">VS</div>
                        )}
                        <div className="flex-1 min-w-0 flex justify-center">
                            <PlayerDisplay player={p2} isWinner={p2IsWinner} />
                        </div>
                    </div>
                </div>
            ) : (
                // 동네바둑리그: 세로 배치
                <div className="p-3 space-y-2">
                    <PlayerDisplay player={p1} isWinner={p1IsWinner} />
                    {!isFinished && (
                        <div className="flex items-center justify-center py-1">
                            <div className="text-xs text-gray-400 font-semibold">VS</div>
                        </div>
                    )}
                    <PlayerDisplay player={p2} isWinner={p2IsWinner} />
                </div>
            )}
        </div>
    );
};

const RoundColumn: React.FC<{ name: string; matches: Match[] | undefined; currentUser: UserWithStatus; tournamentState?: TournamentState }> = ({ name, matches, currentUser, tournamentState }) => {
    const isFinalRound = name.includes('결승') || name.includes('3,4위전');
    const isNationalTournament = tournamentState?.type === 'national';
    const isWorldTournament = tournamentState?.type === 'world';
    const isTournamentFormat = isNationalTournament || isWorldTournament;
    
    return (
        <div className={`flex flex-col justify-around h-full ${isTournamentFormat ? 'gap-6' : 'gap-4'} flex-shrink-0 ${isTournamentFormat ? 'min-w-[280px]' : 'min-w-[200px]'}`}>
            <div className={`text-center font-bold ${isTournamentFormat ? 'text-lg py-3 px-5' : 'text-base py-2 px-4'} rounded-lg ${
                isFinalRound
                    ? 'bg-gradient-to-r from-purple-600/80 to-pink-600/80 text-white shadow-lg shadow-purple-500/30 border-2 border-purple-400/50'
                    : 'bg-gradient-to-r from-gray-700/80 to-gray-600/80 text-gray-200 shadow-md border border-gray-500/50'
            }`}>
                {name}
            </div>
            <div className={`flex flex-col justify-around h-full ${isTournamentFormat ? 'gap-6' : 'gap-4'}`}>
                {matches?.map(match => (
                    <MatchBox key={match.id} match={match} currentUser={currentUser} tournamentState={tournamentState} />
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
    const { players, rounds, status, currentRoundRobinRound, type: tournamentType } = tournamentState;
    
    // 경기가 완료된 경우 마지막 회차(5회차)를 초기값으로 설정
    const initialRound = status === 'complete' ? 5 : (currentRoundRobinRound || 1);
    const [selectedRound, setSelectedRound] = useState<number>(initialRound);
    
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
    // - complete 상태일 때는 마지막 회차(5회차)를 표시 (경기 종료 후 재입장 시)
    const roundForDisplay = status === 'complete' ? 5 : (currentRoundRobinRound || 1);
    
    // rounds 배열에서 선택된 회차의 라운드 찾기 (name이 "1회차", "2회차" 등인 라운드)
    const currentRoundObj = useMemo(() => {
        return rounds.find(round => round.name === `${selectedRound}회차`);
    }, [rounds, selectedRound]);
    
    const currentRoundMatches = currentRoundObj?.matches || [];

    // 현재 회차가 변경되고 사용자가 수동으로 선택하지 않은 경우에만 선택된 회차 업데이트
    // 사용자가 지난 회차 탭을 클릭한 경우에는 그대로 유지
    const isManualSelection = useRef(false);
    useEffect(() => {
        if (!isManualSelection.current && roundForDisplay && selectedRound !== roundForDisplay) {
            setSelectedRound(roundForDisplay);
        }
        isManualSelection.current = false;
    }, [roundForDisplay, selectedRound]);
    
    const handleRoundSelect = (roundNum: number) => {
        isManualSelection.current = true;
        setSelectedRound(roundNum);
    };

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
                                    onClick={() => handleRoundSelect(roundNum)}
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
                                        <MatchBox match={match} currentUser={currentUser} tournamentState={tournamentState} />
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
                             const isWinner = status === 'complete' && index === 0;
                             
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
                                     {isWinner && (
                                         <img 
                                             src="/images/championship/Ranking.png" 
                                             alt="Trophy" 
                                             className="w-6 h-6 flex-shrink-0" 
                                         />
                                     )}
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


const TournamentRoundViewer: React.FC<{ 
    rounds: Round[]; 
    currentUser: UserWithStatus; 
    tournamentType: TournamentType; 
    tournamentState?: TournamentState;
    nextRoundTrigger?: number;
}> = ({ rounds, currentUser, tournamentType, tournamentState, nextRoundTrigger }) => {
    // FIX: Define the type for tab data to help TypeScript's inference.
    type TabData = { name: string; matches: Match[]; isInProgress: boolean; };
    
    const getRoundsForTabs = useMemo((): TabData[] | null => {
        const roundMap = new Map<string, Match[]>();
        rounds.forEach(r => roundMap.set(r.name, r.matches));
        
        let availableTabs: string[] = [];
        if (tournamentType === 'world') {
            availableTabs = ["16강", "8강", "4강전", "결승&3/4위전"];
        } else if (tournamentType === 'national') {
            availableTabs = ["8강", "4강전", "결승&3/4위전"];
        } else {
            return null;
        }

        const tabData = availableTabs.map((tabName): TabData => {
            let roundMatches: Match[] = [];
            let roundNames: string[] = [];
            if (tabName === "결승 및 3/4위전" || tabName === "결승&3/4위전") {
                roundNames = ["결승", "3,4위전"];
                roundMatches = (roundMap.get("결승") || []).concat(roundMap.get("3,4위전") || []);
            } else if (tabName === "4강전") {
                roundNames = ["4강"];
                roundMatches = roundMap.get("4강") || [];
            } else {
                roundNames = [tabName];
                roundMatches = roundMap.get(tabName) || [];
            }
            return {
                name: tabName,
                matches: roundMatches,
                isInProgress: roundMatches.length > 0 && roundMatches.some(m => !m.isFinished)
            };
        });
        // 경기가 없어도 탭을 표시하도록 filter 제거
        
        return tabData;
    }, [rounds, tournamentType]);

    // 초기 탭 인덱스 계산 (컴포넌트 마운트 시 한 번만 사용)
    // useState의 초기값 함수는 첫 렌더링 시에만 실행되므로 안전함
    const getInitialTabIndex = () => {
        if (!getRoundsForTabs) return 0;
        
        // 경기가 완료된 경우(complete 또는 eliminated) 마지막 탭을 선택
        if (tournamentState && (tournamentState.status === 'complete' || tournamentState.status === 'eliminated')) {
            return Math.max(0, getRoundsForTabs.length - 1);
        }
        
        // 진행 중인 경기가 있는 탭을 찾음 (초기 입장 시에만)
        const inProgressIndex = getRoundsForTabs.findIndex(tab => tab.isInProgress);
        if (inProgressIndex !== -1) {
            return inProgressIndex;
        }
        
        // 그 외의 경우 첫 번째 탭 선택
        return 0;
    };

    const [activeTab, setActiveTab] = useState(getInitialTabIndex);

    // nextRoundTrigger가 변경되면 다음 탭으로 이동
    const prevNextRoundTrigger = useRef(nextRoundTrigger || 0);
    useEffect(() => {
        if (nextRoundTrigger !== undefined && nextRoundTrigger > prevNextRoundTrigger.current && getRoundsForTabs) {
            const currentTabName = getRoundsForTabs[activeTab]?.name;
            
            // 전국바둑대회
            if (tournamentType === 'national') {
                if (currentTabName === "8강") {
                    // 8강 탭에서 다음경기 버튼을 누르면 4강전 탭으로 이동
                    const nextTabIndex = getRoundsForTabs.findIndex(tab => tab.name === "4강전");
                    if (nextTabIndex !== -1) {
                        setActiveTab(nextTabIndex);
                    }
                } else if (currentTabName === "4강전") {
                    // 4강전 탭에서 다음경기 버튼을 누르면 결승&3/4위전 탭으로 이동
                    const nextTabIndex = getRoundsForTabs.findIndex(tab => tab.name === "결승&3/4위전");
                    if (nextTabIndex !== -1) {
                        setActiveTab(nextTabIndex);
                    }
                }
            }
            // 월드챔피언십
            else if (tournamentType === 'world') {
                if (currentTabName === "16강") {
                    // 16강 탭에서 다음경기 버튼을 누르면 8강 탭으로 이동
                    const nextTabIndex = getRoundsForTabs.findIndex(tab => tab.name === "8강");
                    if (nextTabIndex !== -1) {
                        setActiveTab(nextTabIndex);
                    }
                } else if (currentTabName === "8강") {
                    // 8강 탭에서 다음경기 버튼을 누르면 4강전 탭으로 이동
                    const nextTabIndex = getRoundsForTabs.findIndex(tab => tab.name === "4강전");
                    if (nextTabIndex !== -1) {
                        setActiveTab(nextTabIndex);
                    }
                } else if (currentTabName === "4강전") {
                    // 4강전 탭에서 다음경기 버튼을 누르면 결승&3/4위전 탭으로 이동
                    const nextTabIndex = getRoundsForTabs.findIndex(tab => tab.name === "결승&3/4위전");
                    if (nextTabIndex !== -1) {
                        setActiveTab(nextTabIndex);
                    }
                }
            }
            
            prevNextRoundTrigger.current = nextRoundTrigger;
        } else if (nextRoundTrigger !== undefined) {
            // nextRoundTrigger가 변경되었지만 탭 변경 조건을 만족하지 않으면 ref만 업데이트
            prevNextRoundTrigger.current = nextRoundTrigger;
        }
    }, [nextRoundTrigger, activeTab, getRoundsForTabs, tournamentType]);

    if (!getRoundsForTabs) {
        const desiredOrder = ["16강", "8강", "4강", "3,4위전", "결승"];
        const sortedRounds = [...rounds].sort((a, b) => desiredOrder.indexOf(a.name) - desiredOrder.indexOf(b.name));
        return (
            <div className="h-full flex flex-col min-h-0">
                <h4 className="font-bold text-center mb-2 flex-shrink-0 text-gray-300">대진표</h4>
                <div className="flex-grow overflow-auto flex items-center justify-center p-2 space-x-4">
                    {sortedRounds.map((round) => (
                        <RoundColumn key={round.id} name={round.name} matches={round.matches} currentUser={currentUser} tournamentState={tournamentState} />
                    ))}
                </div>
            </div>
        );
    }
    
    const activeTabData = getRoundsForTabs[activeTab];

    // 전국바둑대회 전체 토너먼트 브래킷 렌더링 (8강 → 4강 → 결승)
    const renderNationalTournamentBracket = () => {
        const roundMap = new Map<string, Match[]>();
        rounds.forEach(r => roundMap.set(r.name, r.matches));
        
        const quarterFinals = roundMap.get("8강") || [];
        const semiFinals = roundMap.get("4강") || [];
        const final = roundMap.get("결승") || [];
        const thirdPlace = roundMap.get("3,4위전") || [];
        
        const containerRef = useRef<HTMLDivElement>(null);
        const [lines, setLines] = useState<React.ReactNode[]>([]);
        const matchRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
        
        const setMatchRef = useCallback((matchId: string) => (el: HTMLDivElement | null) => {
            matchRefs.current.set(matchId, el);
        }, []);
        
        useEffect(() => {
            const calculateLines = () => {
                const containerElem = containerRef.current;
                if (!containerElem) return;
                
                const containerRect = containerElem.getBoundingClientRect();
                const newLines: React.ReactNode[] = [];
                
                // 8강 → 4강 연결선 (왼쪽 8강 → 오른쪽 4강, V자 형태로 가운데에서 만남)
                quarterFinals.forEach((qfMatch, qfIndex) => {
                    if (!qfMatch.isFinished || !qfMatch.winner) return;
                    
                    // 위쪽 8강(0,1) → 첫 번째 4강(0), 아래쪽 8강(2,3) → 두 번째 4강(1)
                    const semiIndex = Math.floor(qfIndex / 2);
                    const semiMatch = semiFinals[semiIndex];
                    if (!semiMatch) return;
                    
                    const qfElem = matchRefs.current.get(qfMatch.id);
                    const semiElem = matchRefs.current.get(semiMatch.id);
                    
                    if (qfElem && semiElem) {
                        const qfRect = qfElem.getBoundingClientRect();
                        const semiRect = semiElem.getBoundingClientRect();
                        
                        // 승자 위치 계산 (MatchBox 내부에서 위쪽/아래쪽 플레이어)
                        const qfWinnerIsP1 = qfMatch.winner.id === qfMatch.players[0]?.id;
                        const qfY = qfRect.top + (qfWinnerIsP1 ? qfRect.height * 0.25 : qfRect.height * 0.75) - containerRect.top;
                        
                        // 4강의 위치: 위쪽 8강이면 4강의 위쪽, 아래쪽 8강이면 4강의 아래쪽
                        const isUpperQuarter = qfIndex < 2;
                        const semiY = semiRect.top + (isUpperQuarter ? semiRect.height * 0.25 : semiRect.height * 0.75) - containerRect.top;
                        
                        const startX = qfRect.right - containerRect.left;
                        const endX = semiRect.left - containerRect.left;
                        const midX = startX + (endX - startX) * 0.5; // 가운데 지점
                        const midY = qfRect.top + qfRect.height / 2 - containerRect.top; // 8강 박스의 중간 높이
                        const targetMidY = semiRect.top + semiRect.height / 2 - containerRect.top; // 4강 박스의 중간 높이
                        
                        // V자 형태: 8강에서 아래로 내려가서 가운데에서 만나고, 다시 4강으로 올라감
                        newLines.push(
                            <path key={`qf-${qfMatch.id}`} 
                                d={`M ${startX} ${qfY} V ${midY} H ${midX} V ${targetMidY} H ${endX} V ${semiY}`} 
                                stroke="rgba(251, 146, 60, 0.8)" 
                                strokeWidth="3" 
                                fill="none" 
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        );
                    }
                });
                
                // 4강 → 결승 연결선 (역 V자 형태로 가운데에서 나뉨)
                semiFinals.forEach((semiMatch, semiIndex) => {
                    if (!semiMatch.isFinished || !semiMatch.winner) return;
                    
                    const finalMatch = final[0];
                    if (!finalMatch) return;
                    
                    const semiElem = matchRefs.current.get(semiMatch.id);
                    const finalElem = matchRefs.current.get(finalMatch.id);
                    
                    if (semiElem && finalElem) {
                        const semiRect = semiElem.getBoundingClientRect();
                        const finalRect = finalElem.getBoundingClientRect();
                        
                        const semiWinnerIsP1 = semiMatch.winner.id === semiMatch.players[0]?.id;
                        const semiY = semiRect.top + (semiWinnerIsP1 ? semiRect.height * 0.25 : semiRect.height * 0.75) - containerRect.top;
                        const finalY = finalRect.top + finalRect.height * 0.5 - containerRect.top;
                        
                        const startX = semiRect.left + semiRect.width / 2 - containerRect.left;
                        const endX = finalRect.left + finalRect.width / 2 - containerRect.left;
                        const midX = (startX + endX) / 2; // 가운데 지점
                        const midY = semiRect.bottom - containerRect.top; // 4강 박스 아래
                        const targetMidY = finalRect.top - containerRect.top; // 결승 박스 위
                        
                        // 역 V자 형태: 4강에서 아래로 내려가서 가운데에서 나뉘고, 다시 결승으로 올라감
                        newLines.push(
                            <path key={`semi-${semiMatch.id}`} 
                                d={`M ${startX} ${semiY} V ${midY} H ${midX} V ${targetMidY} H ${endX} V ${finalY}`} 
                                stroke="rgba(251, 146, 60, 0.8)" 
                                strokeWidth="3" 
                                fill="none" 
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        );
                    }
                });
                
                setLines(newLines);
            };
            
            const timeoutId = setTimeout(calculateLines, 50);
            const resizeObserver = new ResizeObserver(calculateLines);
            if (containerRef.current) {
                resizeObserver.observe(containerRef.current);
            }
            
            return () => {
                clearTimeout(timeoutId);
                resizeObserver.disconnect();
            };
        }, [quarterFinals, semiFinals, final]);
        
        // 이 함수는 더 이상 사용되지 않음 - 탭별로 개별 렌더링
        return null;
    };

    const renderBracketForTab = (tab: typeof activeTabData) => {
        // 전국바둑대회/월드챔피언십: 탭별로 세로 배치
        if (tournamentType === 'national' || tournamentType === 'world') {
            if (tab.name === "결승&3/4위전") {
                const finalMatch = tab.matches.filter(m => rounds.find(r => r.matches.includes(m))?.name === '결승');
                const thirdPlaceMatch = tab.matches.filter(m => rounds.find(r => r.matches.includes(m))?.name === '3,4위전');
                // 부모 컨테이너의 높이가 자동으로 조정되므로 h-full 사용
                return (
                    <div className="flex flex-col items-center justify-start gap-4 p-4 overflow-y-auto h-full">
                        {finalMatch.length > 0 && (
                            <div className="w-full max-w-[280px]">
                                <MatchBox match={finalMatch[0]} currentUser={currentUser} tournamentState={tournamentState} />
                            </div>
                        )}
                        {thirdPlaceMatch.length > 0 && (
                            <div className="w-full max-w-[280px]">
                                <MatchBox match={thirdPlaceMatch[0]} currentUser={currentUser} tournamentState={tournamentState} />
                            </div>
                        )}
                    </div>
                );
            }
            
            // 16강, 8강, 4강전: 세로로 배치
            // 부모 컨테이너의 높이가 자동으로 조정되므로 h-full 사용하여 모든 공간 활용
            // 보상 패널은 사이드바 레이아웃에서 flex-shrink-0으로 고정되어 있어 자동으로 공간 확보됨
            return (
                <div className="flex flex-col items-center justify-start gap-4 p-4 overflow-y-auto h-full">
                    {tab.matches.map((match) => (
                        <div key={match.id} className="w-full max-w-[280px]">
                            <MatchBox match={match} currentUser={currentUser} tournamentState={tournamentState} />
                        </div>
                    ))}
                </div>
            );
        }

        // 동네바둑리그: 기존 방식 유지
        if (tab.name === "결승 및 3/4위전") {
             const finalMatch = tab.matches.filter(m => rounds.find(r => r.matches.includes(m))?.name === '결승');
             const thirdPlaceMatch = tab.matches.filter(m => rounds.find(r => r.matches.includes(m))?.name === '3,4위전');
             return (
                <div className="flex flex-col justify-center items-center h-full gap-8 p-4">
                    {finalMatch.length > 0 && (
                        <div className="w-full max-w-[200px]">
                            <MatchBox match={finalMatch[0]} currentUser={currentUser} tournamentState={tournamentState} />
                        </div>
                    )}
                    {thirdPlaceMatch.length > 0 && (
                        <div className="w-full max-w-[200px]">
                            <MatchBox match={thirdPlaceMatch[0]} currentUser={currentUser} tournamentState={tournamentState} />
                        </div>
                    )}
                </div>
             );
        }

        return (
             <div className="flex justify-center items-center h-full gap-4 p-4">
                <RoundColumn name={tab.name} matches={tab.matches} currentUser={currentUser} tournamentState={tournamentState} />
            </div>
        );
    }

    // 보상 패널이 표시될 때 대진표가 적절히 조정되도록 함
    // 사이드바의 flex 레이아웃이 자동으로 높이를 조정하므로, 내부에서 추가로 높이 제한하지 않음
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
            {/* 대진표 내용 영역 - flex-grow로 남은 공간을 모두 사용하고, 스크롤 가능하도록 설정 */}
            <div className="flex-1 overflow-hidden min-h-0">
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
    const [nextRoundTrigger, setNextRoundTrigger] = useState(0);
    const [sgfViewerSize, setSgfViewerSize] = useState<25 | 50>(50); // 모바일에서 SGF 뷰어 크기 (25=50% 표시, 50=100% 표시)
    
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
        const allStats: number[] = [
            ...(Object.values(p1Stats) as number[]),
            ...(Object.values(p2Stats) as number[])
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
                <>
                    <Button disabled colorScheme="green" className="!text-sm !py-2 !px-4">경기 진행 중...</Button>
                    <Button onClick={handleForfeitClick} colorScheme="red" className="!text-sm !py-2 !px-4">포기</Button>
                </>
            );
        }
        
        if (status === 'complete') {
            return null; // 이미 헤더에 뒤로가기 버튼이 있으므로 버튼 제거
        }

        if (status === 'eliminated') {
            return null; // 이미 헤더에 뒤로가기 버튼이 있으므로 버튼 제거
        }

        // 동네바둑리그: round_complete 상태일 때는 현재 회차가 완료된 상태이므로 다음 회차로 넘어갈 준비가 되면 "다음경기" 버튼 표시
        if (tournament.type === 'neighborhood' && status === 'round_complete') {
            const currentRound = tournament.currentRoundRobinRound || 1;
            const hasNextRound = currentRound < 5;
            
            // round_complete 상태는 현재 회차의 모든 경기가 완료된 상태이므로, 다음 회차가 있으면 "다음경기" 버튼 표시
            if (hasNextRound) {
                return (
                    <>
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
                            className="animate-pulse !text-sm !py-2 !px-4"
                        >
                            다음경기
                        </Button>
                        <Button onClick={handleForfeitClick} colorScheme="red" className="!text-sm !py-2 !px-4">포기</Button>
                    </>
                );
            }
        }

        // 전국바둑대회/월드챔피언십: round_complete 상태일 때 다음 라운드가 준비되면 "다음경기" 버튼 표시
        if ((tournament.type === 'national' || tournament.type === 'world') && status === 'round_complete') {
            // 유저가 다음 경기에 참가하는지 확인
            const hasNextUserMatch = safeRounds.some(r => 
                r.matches.some(m => !m.isFinished && m.isUserMatch)
            );
            
            // 다음 라운드가 준비되었거나 유저의 다음 경기가 있으면 "다음경기" 버튼 표시
            if (hasNextUserMatch || safeRounds.some(r => r.matches.some(m => !m.isFinished))) {
                return (
                    <>
                        <Button 
                            onClick={async () => {
                                console.log('[TournamentBracket] 다음경기 버튼 클릭 (전국바둑대회)');
                                try {
                                    await onStartNextRound();
                                    // 다음 라운드로 넘어갔으므로 탭 변경 트리거
                                    setNextRoundTrigger(prev => prev + 1);
                                } catch (error) {
                                    console.error('[TournamentBracket] 다음경기 버튼 오류:', error);
                                }
                            }} 
                            colorScheme="blue" 
                            className="animate-pulse !text-sm !py-2 !px-4"
                        >
                            다음경기
                        </Button>
                        <Button onClick={handleForfeitClick} colorScheme="red" className="!text-sm !py-2 !px-4">포기</Button>
                    </>
                );
            }
        }

        const hasUnfinishedUserMatch = safeRounds.some(r =>
            r.matches.some(m => m.isUserMatch && !m.isFinished)
        );

        if ((status === 'round_complete' || status === 'bracket_ready') && hasUnfinishedUserMatch) {
            return (
                <>
                    <Button 
                        onClick={() => onAction({ type: 'START_TOURNAMENT_MATCH', payload: { type: tournament.type } })} 
                        colorScheme="green" 
                        className="animate-pulse !text-sm !py-2 !px-4"
                    >
                        경기 시작
                    </Button>
                    <Button onClick={handleForfeitClick} colorScheme="red" className="!text-sm !py-2 !px-4">포기</Button>
                </>
            );
        }
        
        // 시뮬레이션이 끝나고 경기가 초기화되기 전에 다시 입장한 경우, 버튼을 표시하지 않음 (나가기 전 화면과 동일)
        // This is the default case, meaning user's matches are done but tournament isn't 'complete' or 'eliminated'
        return null;
    };

    const footerButtons = renderFooterButton();

    const sidebarContent = (
        <div className="h-full w-full flex flex-col" style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            {/* 대진표/라운드 뷰어 - 스크롤 가능 영역 (버튼 패널 공간 확보) */}
            <div 
                className="overflow-y-auto" 
                style={{ 
                    flex: footerButtons ? '1 1 0' : '1 1 auto', 
                    minHeight: 0, 
                    maxHeight: footerButtons ? 'calc(100% - 100px)' : '100%',
                    overflowY: 'auto', 
                    overflowX: 'hidden', 
                    width: '100%',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
            {tournament.type === 'neighborhood' ? (
                <RoundRobinDisplay tournamentState={tournament} currentUser={currentUser} />
            ) : (
                <TournamentRoundViewer 
                    rounds={safeRounds} 
                    currentUser={currentUser} 
                    tournamentType={tournament.type} 
                    tournamentState={tournament}
                    nextRoundTrigger={nextRoundTrigger}
                />
            )}
            </div>
            {/* 버튼 패널 - 대진표 하단에 고정된 작은 패널 */}
            {footerButtons && (
                <div 
                    className="flex-shrink-0 bg-gray-800/95 rounded-lg p-2 sm:p-3 mt-2 mb-2 border-2 border-gray-600 shadow-xl flex items-center justify-center" 
                    style={{ 
                        flexShrink: 0, 
                        flexGrow: 0, 
                        width: '100%', 
                        minHeight: '60px',
                        maxHeight: '90px',
                        position: 'relative',
                        zIndex: 10,
                        marginTop: '8px',
                        marginBottom: '8px'
                    }}
                >
                    <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap h-full w-full">
                        {footerButtons}
                    </div>
                </div>
            )}
        </div>
    );

    const mainContent = (
        <div className={`${isMobile ? 'w-full' : 'flex-1'} flex flex-col lg:flex-row gap-2 ${isMobile ? '' : 'min-h-0 overflow-hidden'}`} style={isMobile ? {} : { height: '100%', display: 'flex' }}>
            <div className={`${isMobile ? 'w-full' : 'flex-1'} flex flex-col gap-2 ${isMobile ? '' : 'min-h-0 min-w-0 overflow-hidden'}`}>
                {/* 플레이어 프로필 섹션 */}
                <section className={`flex-shrink-0 flex flex-row gap-1 md:gap-2 items-stretch p-1.5 md:p-2 bg-gray-800/50 rounded-lg ${isMobile ? 'mt-2 mb-2 max-h-none' : 'max-h-[200px] md:max-h-[240px]'}`}>
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
                <div className={`${isMobile ? 'w-full mt-4' : 'flex-1'} flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2 ${isMobile ? '' : 'min-h-0 max-h-full overflow-hidden'}`}>
                    {/* SGF뷰어 */}
                    <div 
                        className={`${isMobile ? 'flex-shrink-0' : 'lg:w-2/5'} bg-gray-800/50 rounded-lg p-1 md:p-2 flex flex-col items-center justify-center overflow-auto relative`}
                        style={isMobile ? { 
                            height: sgfViewerSize === 25 ? '30vh' : '50vh',
                            minHeight: '200px',
                            maxHeight: 'none'
                        } : undefined}
                    >
                        <div className="flex-1 w-full flex items-center justify-center min-h-0 relative">
                            {isMobile && (
                                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex gap-1 opacity-50 hover:opacity-100 transition-opacity">
                                    {([
                                        { value: 25, label: '50%' },
                                        { value: 50, label: '100%' }
                                    ] as const).map(({ value, label }) => (
                                        <button
                                            key={value}
                                            onClick={() => setSgfViewerSize(value)}
                                            className={`px-2 py-1 text-xs rounded transition-colors ${
                                                sgfViewerSize === value
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-700/80 text-gray-300 hover:bg-gray-600/80'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}
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
                    </div>
                    
                    {/* 중계패널 (점수 그래프 + 실시간 중계 + 획득 보상) */}
                    <div 
                        className={`${isMobile ? 'w-full' : 'w-full lg:w-3/5'} flex flex-col gap-2 ${isMobile ? '' : 'overflow-hidden'}`}
                        style={isMobile ? {} : { height: '100%', minHeight: 0 }}
                    >
                        <section className="flex-shrink-0 bg-gray-800/50 rounded-lg p-1.5 md:p-2">
                            <ScoreGraph 
                                p1Percent={p1Percent} 
                                p2Percent={p2Percent} 
                                p1Nickname={p1?.nickname} 
                                p2Nickname={p2?.nickname}
                                lastScoreIncrement={tournament.lastScoreIncrement}
                            />
                            <div className="mt-1.5"><SimulationProgressBar timeElapsed={tournament.timeElapsed} totalDuration={50} /></div>
                        </section>
                        {/* 실시간 중계 + 획득 보상 (가로 분할) */}
                        <div 
                            className={`${isMobile ? 'flex-col' : 'flex-row'} ${isMobile ? 'w-full' : 'flex-1 min-h-0'} gap-2 ${isMobile ? '' : 'overflow-hidden'}`}
                            style={isMobile ? {} : { display: 'flex' }}
                        >
                            {/* 왼쪽: 실시간 중계 (넓은 패널) */}
                            <div 
                                className={`${isMobile ? 'w-full' : 'flex-[2] min-w-0'} bg-gray-800/50 rounded-lg p-1 md:p-2 flex flex-col ${isMobile ? '' : 'overflow-hidden'}`}
                                style={isMobile ? { height: '400px', minHeight: '400px', maxHeight: '500px', display: 'flex', flexDirection: 'column' } : { display: 'flex', flexDirection: 'column' }}
                            >
                                <CommentaryPanel commentary={tournament.currentMatchCommentary} isSimulating={tournament.status === 'round_in_progress'} />
                            </div>
                            {/* 오른쪽: 획득 보상 (좁은 패널) */}
                            <div 
                                className={`${isMobile ? 'w-full' : 'flex-[1] min-w-0'} bg-gray-800/50 rounded-lg p-1 md:p-2 flex flex-col ${isMobile ? '' : 'overflow-hidden'}`}
                                style={isMobile ? { height: '400px', minHeight: '400px', maxHeight: '500px', display: 'flex', flexDirection: 'column' } : { display: 'flex', flexDirection: 'column' }}
                            >
                                <FinalRewardPanel tournamentState={tournament} currentUser={currentUser} onAction={onAction} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {!isMobile && (
                <aside className="flex flex-col w-[320px] xl:w-[380px] flex-shrink-0 bg-gray-800 rounded-lg p-2 border-2 border-gray-600 shadow-lg" style={{ height: '100%', minHeight: 0, maxHeight: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {sidebarContent}
                </aside>
            )}
        </div>
    );
    
    return (
        <div className="w-full h-full flex flex-col gap-1 sm:gap-2 bg-gray-900 text-white relative overflow-hidden" style={{ height: '100%', minHeight: 0 }}>
            {isMobile ? (
                <>
                    <div className="flex-1 flex flex-col gap-1 sm:gap-2 min-h-0 relative overflow-y-auto p-1 sm:p-2 pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <div className="absolute top-1/2 -translate-y-1/2 right-2 z-20">
                            <button 
                                onClick={() => setIsMobileSidebarOpen(true)} 
                                className="w-8 h-12 bg-gray-800/80 backdrop-blur-sm rounded-l-lg flex items-center justify-center text-white shadow-lg hover:bg-gray-700/80"
                                aria-label="메뉴 열기"
                            >
                                <span className="relative font-bold text-lg">{'<<'}</span>
                            </button>
                        </div>
                        <div className="w-full pb-2" style={{ minHeight: 'min-content' }}>
                            {mainContent}
                        </div>
                    </div>
                    <div className={`fixed top-0 right-0 h-full w-[320px] bg-gray-800 shadow-2xl z-50 transition-transform duration-300 ease-in-out ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`} style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                        <div className="flex justify-between items-center p-2 border-b border-gray-600 flex-shrink-0">
                            <h3 className="text-lg font-bold">대진표</h3>
                            <button onClick={() => setIsMobileSidebarOpen(false)} className="text-2xl font-bold text-gray-300 hover:text-white">×</button>
                        </div>
                        <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-2 pt-2 pb-0" style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            {sidebarContent}
                        </div>
                    </div>
                    {isMobileSidebarOpen && <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setIsMobileSidebarOpen(false)}></div>}
                </>
            ) : (
                <div className="flex-1 min-h-0 overflow-hidden p-1 sm:p-2 pb-2">
                    {mainContent}
                </div>
            )}
            {showConditionPotionModal && userPlayer && tournament.status !== 'complete' && tournament.status !== 'eliminated' && (
                <ConditionPotionModal
                    currentUser={currentUser}
                    currentCondition={userPlayer.condition}
                    onClose={() => setShowConditionPotionModal(false)}
                    onConfirm={(potionType) => {
                        onAction({ type: 'USE_CONDITION_POTION', payload: { tournamentType: tournament.type, potionType } });
                    }}
                    isTopmost={true}
                />
            )}
        </div>
    );
};