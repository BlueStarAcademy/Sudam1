import React, { useEffect, useMemo, useState } from 'react';
import { UserWithStatus, EquipmentSlot, InventoryItem, ItemGrade, GameMode, CoreStat } from '../types.js';
import Avatar from './Avatar.js';
import DraggableWindow from './DraggableWindow.js';
import { AVATAR_POOL, BORDER_POOL, emptySlotImages, SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES, LEAGUE_DATA, CORE_STATS_DATA } from '../constants';
import { getMannerScore, getMannerRank, getMannerStyle } from '../services/manner.js';
import { calculateTotalStats } from '../services/statService.js';
import MbtiInfoModal from './MbtiInfoModal.js';
import MbtiComparisonModal from './MbtiComparisonModal.js';
import { useAppContext } from '../hooks/useAppContext.js';

// Re-using components from Profile.tsx for consistency.
const getXpRequirementForLevel = (level: number): number => {
    if (level < 1) return 0;
    if (level > 100) return Infinity; // Max level
    
    // 레벨 1~10: 200 + (레벨 x 100)
    if (level <= 10) {
        return 200 + (level * 100);
    }
    
    // 레벨 11~20: 300 + (레벨 x 150)
    if (level <= 20) {
        return 300 + (level * 150);
    }
    
    // 레벨 21~50: 이전 필요경험치 x 1.2
    // 레벨 51~100: 이전 필요경험치 x 1.3
    // 레벨 20의 필요 경험치를 먼저 계산
    let xp = 300 + (20 * 150); // 레벨 20의 필요 경험치
    
    // 레벨 21부터 현재 레벨까지 반복
    for (let l = 21; l <= level; l++) {
        if (l <= 50) {
            xp = Math.round(xp * 1.2);
        } else {
            xp = Math.round(xp * 1.3);
        }
    }
    
    return xp;
};

const XpBar: React.FC<{ level: number, currentXp: number, label: string, colorClass: string }> = ({ level, currentXp, label, colorClass }) => {
    const maxXp = getXpRequirementForLevel(level);
    const percentage = Math.min((currentXp / maxXp) * 100, 100);
    return (
        <div>
            <div className="flex justify-between items-baseline mb-1 text-sm">
                <span className="font-semibold">{label} <span className="text-lg font-bold">Lv.{level}</span></span>
                <span className="text-xs font-mono text-gray-400">{currentXp} / {maxXp}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4 border border-gray-900">
                <div className={`${colorClass} h-full rounded-full transition-width duration-500`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

const gradeBackgrounds: Record<ItemGrade, string> = {
    normal: '/images/equipments/normalbgi.png',
    uncommon: '/images/equipments/uncommonbgi.png',
    rare: '/images/equipments/rarebgi.png',
    epic: '/images/equipments/epicbgi.png',
    legendary: '/images/equipments/legendarybgi.png',
    mythic: '/images/equipments/mythicbgi.png',
};

const getStarDisplay = (stars: number) => {
    let starImage = '';
    let numberColor = '';

    if (stars >= 10) {
        starImage = '/images/equipments/Star4.png';
        numberColor = "prism-text-effect";
    } else if (stars >= 7) {
        starImage = '/images/equipments/Star3.png';
        numberColor = "text-purple-400";
    } else if (stars >= 4) {
        starImage = '/images/equipments/Star2.png';
        numberColor = "text-amber-400";
    } else if (stars >= 1) {
        starImage = '/images/equipments/Star1.png';
        numberColor = "text-white";
    } else {
        return <img src="/images/equipments/Star1.png" alt="star" className="w-4 h-4 inline-block opacity-30" title="미강화" />;
    }

    // Add text shadow here for consistency across all usages
    return (
        <span className="flex items-center gap-0.5" style={{ textShadow: '1px 1px 2px black, 0 0 5px black' }}>
            <img src={starImage} alt="star" className="w-4 h-4" />
            <span className={`font-bold ${numberColor}`}>{stars}</span>
        </span>
    );
};

const EquipmentSlotDisplay: React.FC<{ slot: EquipmentSlot; item?: InventoryItem; onClick?: () => void; }> = ({ slot, item, onClick }) => {
    const clickableClass = item && onClick ? 'cursor-pointer hover:scale-105 transition-transform' : '';
    
    if (item) {
        const isDivineMythic = item.isDivineMythic === true;
        return (
            <div
                className={`relative w-full aspect-square rounded-lg border-2 border-gray-700/50 bg-gray-900/50 ${clickableClass} ${isDivineMythic ? 'divine-mythic-border' : ''}`}
                title={item.name}
                onClick={onClick}
                style={{ border: isDivineMythic ? undefined : undefined }}
            >
                <img src={gradeBackgrounds[item.grade]} alt={item.grade} className="absolute inset-0 w-full h-full object-cover rounded-md" />
                <div className="absolute top-1 right-1 text-sm font-bold z-10">
                    {getStarDisplay(item.stars)}
                </div>
                {item.image && <img src={item.image} alt={item.name} className="relative w-full h-full object-contain p-3"/>}
            </div>
        );
    } else {
        return (
             <img src={emptySlotImages[slot]} alt={`${slot} empty slot`} className="w-full aspect-square rounded-lg bg-gray-900/50 border-2 border-gray-700/50" />
        );
    }
};

interface UserProfileModalProps {
  user: UserWithStatus;
  onClose: () => void;
  onViewItem: (item: InventoryItem, isOwnedByCurrentUser: boolean) => void;
  isTopmost?: boolean;
}

const StatsTab: React.FC<{ user: UserWithStatus, type: 'strategic' | 'playful', isMobile?: boolean }> = ({ user, type, isMobile = false }) => {
    const modes = type === 'strategic' ? SPECIAL_GAME_MODES : PLAYFUL_GAME_MODES;
    const stats = user.stats || {};
    
    let totalWins = 0;
    let totalLosses = 0;

    const gameStats = modes.map(m => {
        const s = stats[m.mode];
        if (s) {
            totalWins += s.wins;
            totalLosses += s.losses;
            return { mode: m.mode, ...s };
        }
        return { mode: m.mode, wins: 0, losses: 0, rankingScore: 1200 };
    });
    
    const totalGames = totalWins + totalLosses;
    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    const textSizeClass = isMobile ? 'text-sm' : 'text-xs';
    const spacingClass = isMobile ? 'space-y-2' : 'space-y-1';

    return (
        <div className={`${spacingClass} ${textSizeClass}`}>
            <div className={`bg-gray-700/50 ${isMobile ? 'px-2 py-1.5' : 'px-1.5 py-1'} rounded-md text-center`}>
                <span className="font-bold text-gray-100">총 전적: {totalWins}승 {totalLosses}패 ({winRate}%)</span>
            </div>
            <div className={isMobile ? 'space-y-1.5' : 'space-y-1'}>
                {gameStats.map(stat => {
                    const gameTotal = stat.wins + stat.losses;
                    const gameWinRate = gameTotal > 0 ? Math.round((stat.wins / gameTotal) * 100) : 0;
                    return (
                        <div key={stat.mode} className={`bg-gray-900/40 rounded ${isMobile ? 'px-2 py-1' : 'px-1.5 py-0.5'} flex items-center justify-between ${isMobile ? 'gap-2' : 'gap-1.5'}`}>
                            <span className="font-semibold text-gray-200 truncate">{stat.mode}</span>
                            <span className="text-right text-gray-300 whitespace-nowrap">{stat.wins}승 {stat.losses}패 ({gameWinRate}%)</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onClose, onViewItem, isTopmost }) => {
    const { inventory, stats, nickname, avatarId, borderId, equipment } = user;
    const [showMbtiHelp, setShowMbtiHelp] = useState(false);
    const [showMbtiComparison, setShowMbtiComparison] = useState(false);
    const { allUsers, currentUserWithStatus } = useAppContext();
    
    const avatarUrl = useMemo(() => AVATAR_POOL.find(a => a.id === avatarId)?.url, [avatarId]);
    const borderUrl = useMemo(() => BORDER_POOL.find(b => b.id === borderId)?.url, [borderId]);
    const leagueData = useMemo(() => LEAGUE_DATA.find(l => l.tier === user.league), [user.league]);
    
    // 챔피언십 전체 순위 계산 (누적 점수 합계 기준)
    const championshipRank = useMemo(() => {
        if (!allUsers || allUsers.length === 0) return null;
        const sortedUsers = [...allUsers]
            .filter(u => u && u.id && typeof u.cumulativeTournamentScore === 'number')
            .sort((a, b) => {
                const scoreA = a.cumulativeTournamentScore || 0;
                const scoreB = b.cumulativeTournamentScore || 0;
                if (scoreB !== scoreA) return scoreB - scoreA;
                // 동점일 경우 ID로 정렬 (일관성 유지)
                return a.id.localeCompare(b.id);
            });
        
        // 동점자 처리: 같은 점수면 같은 순위
        let currentRank = 1;
        let prevScore = sortedUsers[0]?.cumulativeTournamentScore ?? 0;
        for (let i = 0; i < sortedUsers.length; i++) {
            const currentScore = sortedUsers[i].cumulativeTournamentScore || 0;
            if (currentScore < prevScore) {
                currentRank = i + 1;
            }
            if (sortedUsers[i].id === user.id) {
                return currentRank;
            }
            prevScore = currentScore;
        }
        return null;
    }, [allUsers, user.id]);

    // equipment 필드와 inventory를 매칭하여 장착된 아이템 찾기
    const equippedItems = useMemo(() => {
        const items: InventoryItem[] = [];
        const equipmentObj = equipment || {};
        const inventoryList = inventory || [];
        
        // equipment 필드의 각 슬롯에 대해 아이템 찾기
        for (const [slot, itemId] of Object.entries(equipmentObj)) {
            const item = inventoryList.find(i => i.id === itemId && i.slot === slot);
            if (item) {
                items.push(item);
            }
        }
        
        return items;
    }, [inventory, equipment]);

    const getItemForSlot = (slot: EquipmentSlot) => {
        // equipment 필드에서 해당 슬롯의 아이템 ID 찾기
        const itemId = equipment?.[slot];
        if (!itemId) return undefined;
        
        // inventory에서 해당 아이템 찾기
        return (inventory || []).find(item => item.id === itemId && item.slot === slot);
    };

    const totalMannerScore = getMannerScore(user);
    const mannerRank = getMannerRank(totalMannerScore);
    const mannerStyle = getMannerStyle(totalMannerScore);
    const totalStats = calculateTotalStats(user);

    const DESKTOP_WIDTH = 900;
    const MOBILE_BREAKPOINT = 768;

    const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = windowWidth < MOBILE_BREAKPOINT;
    const scale = isMobile ? Math.max(0.4, Math.min(1, (windowWidth - 24) / DESKTOP_WIDTH)) : 1;
    const containerWidth = DESKTOP_WIDTH;
    const scaledWidth = containerWidth * scale;
    const scaledHeight = 800 * scale; // 모바일 창 높이 증가 (640 -> 800)
    // 모바일에서는 창 너비를 화면에 맞추되, 스케일된 컨텐츠가 모두 보이도록 여유 공간 확보
    const windowWidthForMobile = isMobile ? windowWidth - 8 : containerWidth;

    return (
        <DraggableWindow title={`${user.nickname}님의 프로필`} onClose={onClose} windowId={`view-user-${user.id}`} initialWidth={isMobile ? windowWidthForMobile : containerWidth} initialHeight={isMobile ? scaledHeight : 800} isTopmost={isTopmost}>
            {showMbtiHelp && <MbtiInfoModal onClose={() => setShowMbtiHelp(false)} isTopmost={true} />}
            {showMbtiComparison && <MbtiComparisonModal opponentUser={user} onClose={() => setShowMbtiComparison(false)} isTopmost={true} />}
            {isMobile ? (
                <div 
                    className="flex justify-center items-start"
                    style={{ 
                        width: '100%',
                        height: `${scaledHeight}px`,
                        overflow: 'visible',
                        padding: '0 10px'
                    }}
                >
                    <div
                        className="flex flex-row gap-4 flex-nowrap"
                        style={{ 
                            width: `${containerWidth}px`,
                            height: '800px',
                            transform: `scale(${scale})`,
                            transformOrigin: 'top center',
                            flexShrink: 0
                        }}
                    >
                        {/* Left Column */}
                        <div
                            className="flex flex-col gap-3"
                            style={{ width: '300px', flexShrink: 0, height: '100%' }}
                        >
                    <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col items-center text-center flex-shrink-0">
                        <Avatar userId={user.id} userName={nickname} size={80} avatarUrl={avatarUrl} borderUrl={borderUrl} />
                        <h2 className="text-2xl font-bold mt-2">{nickname}</h2>
                        <div className="flex items-center gap-2 text-base text-gray-400 mt-1">
                            <span>매너: </span>
                            <span className={`font-semibold ${mannerRank.color}`}>{totalMannerScore}점 ({mannerRank.rank})</span>
                        </div>
                         <div className="flex items-center gap-2 text-base text-gray-400 mt-1">
                            <span>MBTI:</span>
                            {user.mbti ? (
                                <button
                                    onClick={() => {
                                        if (currentUserWithStatus?.mbti) {
                                            setShowMbtiComparison(true);
                                        } else {
                                            setShowMbtiHelp(true);
                                        }
                                    }}
                                    className="font-semibold text-gray-200 hover:text-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                    {user.mbti}
                                    <span className="w-5 h-5 text-sm bg-gray-600 rounded-full text-white flex items-center justify-center hover:bg-gray-500">?</span>
                                </button>
                            ) : (
                                <span className="font-semibold text-gray-200 flex items-center gap-1">
                                    미설정
                                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                </span>
                            )}
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2 border border-gray-900">
                            <div className={`${mannerStyle.colorClass} h-full rounded-full`} style={{ width: `${mannerStyle.percentage}%` }}></div>
                        </div>
                    </div>

                    {leagueData && (
                        <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col items-center text-center flex-shrink-0">
                             <img src={leagueData.icon} alt={leagueData.name} className="w-16 h-16" />
                             <h3 className="text-xl font-bold text-purple-300 mt-1">{leagueData.name}</h3>
                             <p className="text-base text-gray-300 mt-1">누적 점수: {(user.cumulativeTournamentScore || 0).toLocaleString()} 점</p>
                             {championshipRank !== null && (
                                 <p className="text-base text-yellow-300 mt-1">전체 순위: {championshipRank}위</p>
                             )}
                        </div>
                    )}

                    <div className="bg-gray-800/50 rounded-lg p-3 flex-1 flex flex-col min-h-0">
                        <div className="grid grid-cols-3 gap-2 w-full max-w-[240px] mx-auto mb-3 flex-shrink-0">
                            <EquipmentSlotDisplay slot="fan" item={getItemForSlot('fan')} onClick={() => getItemForSlot('fan') && onViewItem(getItemForSlot('fan')!, false)} />
                            <EquipmentSlotDisplay slot="board" item={getItemForSlot('board')} onClick={() => getItemForSlot('board') && onViewItem(getItemForSlot('board')!, false)} />
                            <EquipmentSlotDisplay slot="top" item={getItemForSlot('top')} onClick={() => getItemForSlot('top') && onViewItem(getItemForSlot('top')!, false)} />
                            <EquipmentSlotDisplay slot="bottom" item={getItemForSlot('bottom')} onClick={() => getItemForSlot('bottom') && onViewItem(getItemForSlot('bottom')!, false)} />
                            <EquipmentSlotDisplay slot="bowl" item={getItemForSlot('bowl')} onClick={() => getItemForSlot('bowl') && onViewItem(getItemForSlot('bowl')!, false)} />
                            <EquipmentSlotDisplay slot="stones" item={getItemForSlot('stones')} onClick={() => getItemForSlot('stones') && onViewItem(getItemForSlot('stones')!, false)} />
                        </div>
                        <div className="border-t border-gray-700 pt-3 flex-1 flex flex-col min-h-0">
                            <div className="space-y-1 bg-gray-900/50 p-2 rounded-lg text-base flex-1 overflow-y-auto">
                                {Object.entries(totalStats).map(([stat, value]) => (
                                    <div key={stat} className="flex items-center justify-between text-gray-200">
                                        <span>{CORE_STATS_DATA[stat as CoreStat]?.name || stat}</span>
                                        <span className="font-mono text-right text-gray-100">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-3" style={{ width: '560px', flexShrink: 0, height: '100%' }}>
                     <div className="bg-gray-800/50 rounded-lg p-3 flex flex-col" style={{ flex: '1 1 0', minHeight: 0 }}>
                        <h4 className="font-semibold mb-2 text-blue-400 text-base flex-shrink-0">전략 전적</h4>
                        <div className="flex-1 pr-1 overflow-y-auto min-h-0">
                           <StatsTab user={user} type="strategic" isMobile={true} />
                        </div>
                     </div>
                     <div className="bg-gray-800/50 rounded-lg p-3 flex flex-col" style={{ flex: '1 1 0', minHeight: 0 }}>
                        <h4 className="font-semibold mb-2 text-yellow-400 text-base flex-shrink-0">놀이 전적</h4>
                        <div className="flex-1 pr-1 overflow-y-auto min-h-0">
                           <StatsTab user={user} type="playful" isMobile={true} />
                        </div>
                     </div>
                </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col md:flex-row gap-3 h-full">
                    {/* Left Column */}
                    <div className="w-full md:w-1/3 flex-shrink-0 flex flex-col gap-3">
                        <div className="bg-gray-800/50 rounded-lg p-3 flex flex-col items-center text-center">
                            <Avatar userId={user.id} userName={nickname} size={60} avatarUrl={avatarUrl} borderUrl={borderUrl} />
                            <h2 className="text-lg font-bold mt-1.5">{nickname}</h2>
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                                <span>매너: </span>
                                <span className={`font-semibold ${mannerRank.color}`}>{totalMannerScore}점 ({mannerRank.rank})</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                                <span>MBTI:</span>
                                {user.mbti ? (
                                    <button
                                        onClick={() => {
                                            if (currentUserWithStatus?.mbti) {
                                                setShowMbtiComparison(true);
                                            } else {
                                                setShowMbtiHelp(true);
                                            }
                                        }}
                                        className="font-semibold text-gray-200 hover:text-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                        {user.mbti}
                                        <span className="w-3.5 h-3.5 text-[10px] bg-gray-600 rounded-full text-white flex items-center justify-center hover:bg-gray-500">?</span>
                                    </button>
                                ) : (
                                    <span className="font-semibold text-gray-200 flex items-center gap-1">
                                        미설정
                                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                    </span>
                                )}
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2 mt-1.5 border border-gray-900">
                                <div className={`${mannerStyle.colorClass} h-full rounded-full`} style={{ width: `${mannerStyle.percentage}%` }}></div>
                            </div>
                        </div>

                        {leagueData && (
                            <div className="bg-gray-800/50 rounded-lg p-3 flex flex-col items-center text-center">
                                <img src={leagueData.icon} alt={leagueData.name} className="w-12 h-12" />
                                <h3 className="font-bold text-purple-300 mt-0.5 text-sm">{leagueData.name}</h3>
                                <p className="text-xs text-gray-300 mt-0.5">누적 점수: {(user.cumulativeTournamentScore || 0).toLocaleString()} 점</p>
                                {championshipRank !== null && (
                                    <p className="text-xs text-yellow-300 mt-0.5">전체 순위: {championshipRank}위</p>
                                )}
                            </div>
                        )}

                        <div className="bg-gray-800/50 rounded-lg p-3">
                            <div className="grid grid-cols-3 gap-2 w-full max-w-xs mx-auto mb-3">
                                <EquipmentSlotDisplay slot="fan" item={getItemForSlot('fan')} onClick={() => getItemForSlot('fan') && onViewItem(getItemForSlot('fan')!, false)} />
                                <EquipmentSlotDisplay slot="board" item={getItemForSlot('board')} onClick={() => getItemForSlot('board') && onViewItem(getItemForSlot('board')!, false)} />
                                <EquipmentSlotDisplay slot="top" item={getItemForSlot('top')} onClick={() => getItemForSlot('top') && onViewItem(getItemForSlot('top')!, false)} />
                                <EquipmentSlotDisplay slot="bottom" item={getItemForSlot('bottom')} onClick={() => getItemForSlot('bottom') && onViewItem(getItemForSlot('bottom')!, false)} />
                                <EquipmentSlotDisplay slot="bowl" item={getItemForSlot('bowl')} onClick={() => getItemForSlot('bowl') && onViewItem(getItemForSlot('bowl')!, false)} />
                                <EquipmentSlotDisplay slot="stones" item={getItemForSlot('stones')} onClick={() => getItemForSlot('stones') && onViewItem(getItemForSlot('stones')!, false)} />
                            </div>
                            <div className="border-t border-gray-700 pt-3">
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs bg-gray-900/50 p-1.5 rounded-lg justify-between">
                                    {Object.entries(totalStats).map(([stat, value]) => (
                                        <div key={stat} className="flex items-center gap-1.5 min-w-[100px]">
                                            <span className="font-semibold text-gray-300">{CORE_STATS_DATA[stat as CoreStat]?.name || stat}:</span>
                                            <span className="font-mono text-right">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="w-full md:w-2/3 flex flex-col gap-3 min-h-0">
                        <div className="bg-gray-800/50 rounded-lg p-3 flex flex-col flex-1 min-h-0">
                            <h4 className="font-semibold mb-2 text-blue-400 text-xs flex-shrink-0">전략 전적</h4>
                            <div className="flex-1 pr-2 min-h-0">
                                <StatsTab user={user} type="strategic" />
                            </div>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3 flex flex-col flex-1 min-h-0">
                            <h4 className="font-semibold mb-2 text-yellow-400 text-xs flex-shrink-0">놀이 전적</h4>
                            <div className="flex-1 pr-2 min-h-0">
                                <StatsTab user={user} type="playful" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DraggableWindow>
    );
};

export default UserProfileModal;