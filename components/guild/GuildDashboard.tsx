import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Guild as GuildType, UserWithStatus, GuildBossInfo, QuestReward, GuildMember, GuildMemberRole, CoreStat, GuildResearchId, GuildResearchCategory, ItemGrade, ServerAction } from '../../types/index.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import BackButton from '../BackButton.js';
import Button from '../Button.js';
import GuildHomePanel from './GuildHomePanel.js';
import GuildMembersPanel from './GuildMembersPanel.js';
import GuildManagementPanel from './GuildManagementPanel.js';
import { GUILD_XP_PER_LEVEL, GUILD_BOSSES, GUILD_RESEARCH_PROJECTS, AVATAR_POOL, BORDER_POOL, emptySlotImages, slotNames, GUILD_BOSS_MAX_ATTEMPTS, GUILD_INITIAL_MEMBER_LIMIT, GUILD_DONATION_GOLD_LIMIT, GUILD_DONATION_DIAMOND_LIMIT, GUILD_DONATION_GOLD_COST, GUILD_DONATION_DIAMOND_COST, GUILD_CHECK_IN_MILESTONE_REWARDS, GUILD_DONATION_GOLD_REWARDS, GUILD_DONATION_DIAMOND_REWARDS } from '../../constants/index.js';
import DraggableWindow from '../DraggableWindow.js';
import GuildResearchPanel from './GuildResearchPanel.js';
import GuildMissionsPanel from './GuildMissionsPanel.js';
import NineSlicePanel from '../ui/NineSlicePanel.js';
import GuildShopModal from './GuildShopModal.js';
import { BOSS_SKILL_ICON_MAP } from '../../assets.js';
import HelpModal from '../HelpModal.js';
import { getTimeUntilNextMondayKST, isSameDayKST, isDifferentWeekKST } from '../../utils/timeUtils.js';

// 길드 아이콘 경로 수정 함수
const getGuildIconPath = (icon: string | undefined): string => {
    if (!icon) return '/images/guild/profile/icon1.png';
    // 기존 경로가 /images/guild/icon으로 시작하면 /images/guild/profile/icon으로 변환
    if (icon.startsWith('/images/guild/icon')) {
        return icon.replace('/images/guild/icon', '/images/guild/profile/icon');
    }
    // 이미 올바른 경로이거나 다른 경로인 경우 그대로 반환
    return icon;
};

const GuildDonationPanel: React.FC<{ guildDonationAnimation: { coins: number; research: number } | null; onDonationComplete?: (coins: number, research: number) => void }> = ({ guildDonationAnimation, onDonationComplete }) => {
    const { handlers, currentUserWithStatus } = useAppContext();
    const [isDonating, setIsDonating] = useState(false);
    const donationInFlight = useRef(false);
    const now = Date.now();
    const dailyDonations = (currentUserWithStatus?.dailyDonations && isSameDayKST(currentUserWithStatus.dailyDonations.date, now))
        ? currentUserWithStatus.dailyDonations
        : { gold: 0, diamond: 0, date: now };

    const goldDonationsLeft = GUILD_DONATION_GOLD_LIMIT - dailyDonations.gold;
    const diamondDonationsLeft = GUILD_DONATION_DIAMOND_LIMIT - dailyDonations.diamond;

    const canDonateGold = goldDonationsLeft > 0 && (currentUserWithStatus?.gold ?? 0) >= GUILD_DONATION_GOLD_COST;
    const canDonateDiamond = diamondDonationsLeft > 0 && (currentUserWithStatus?.diamonds ?? 0) >= GUILD_DONATION_DIAMOND_COST;

    const handleDonate = async (type: 'GUILD_DONATE_GOLD' | 'GUILD_DONATE_DIAMOND') => {
        console.log('handleDonate called', type);
        if (donationInFlight.current) return;
        donationInFlight.current = true;
        setIsDonating(true);
        try {
            const result = await handlers.handleAction({ type });
            if (result?.clientResponse?.donationResult) {
                const { coins, research } = result.clientResponse.donationResult;
                if (onDonationComplete) {
                    onDonationComplete(coins, research);
                }
            }
        } catch(error) {
            console.error("Donation failed:", error);
        } finally {
            setIsDonating(false);
            donationInFlight.current = false;
        }
    };
    
    const animationElements = useMemo(() => {
        if (!guildDonationAnimation) return [];
        return Array.from({ length: 1 }).map((_, i) => {
            const delay = i * 100;
            return (
                <div key={i} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-float-up-and-fade" style={{ animationDelay: `${delay}ms` }}>
                    <div className="flex items-center gap-1 bg-black/50 p-1 rounded-lg">
                        <img src="/images/guild/tokken.png" alt="Coin" className="w-4 h-4" />
                        <span className="text-xs font-bold text-yellow-300">+{guildDonationAnimation.coins}</span>
                        <img src="/images/guild/button/guildlab.png" alt="Research" className="w-4 h-4 ml-2" />
                        <span className="text-xs font-bold text-blue-300">+{guildDonationAnimation.research}</span>
                    </div>
                </div>
            );
        });
    }, [guildDonationAnimation]);


    return (
        <div className="bg-gradient-to-br from-yellow-900/95 via-amber-800/90 to-orange-900/95 p-3 rounded-xl flex flex-col relative overflow-hidden border-3 border-yellow-400/80 shadow-2xl backdrop-blur-md flex-shrink-0" style={{ height: '180px', minHeight: '180px', maxHeight: '180px' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-amber-400/10 to-orange-500/15 pointer-events-none"></div>
            <h3 className="font-bold text-base text-highlight mb-2 text-center relative z-10 flex items-center justify-center gap-2 drop-shadow-lg flex-shrink-0">
                <span className="text-lg">💎</span>
                <span>길드 기부</span>
            </h3>
            {animationElements}
            <div className="grid grid-cols-2 gap-3 relative z-10 flex-1 min-h-0" style={{ height: '100%' }}>
                {/* 골드 기부 버튼 */}
                <div className="flex flex-col justify-center h-full">
                    <Button 
                        onClick={() => handleDonate('GUILD_DONATE_GOLD')}
                        disabled={!canDonateGold || isDonating}
                        colorScheme="none"
                        className={`w-full h-full justify-center rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-400/90 via-amber-300/90 to-amber-500/90 text-slate-900 font-semibold tracking-wide shadow-[0_12px_32px_-18px_rgba(251,191,36,0.85)] hover:from-amber-300 hover:to-amber-500 ${!canDonateGold || isDonating ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={{ minHeight: '80px', height: '80px' }}
                    >
                        <div className="flex flex-col items-center justify-center gap-0.5 h-full">
                            {isDonating ? (
                                <div className="flex items-center justify-center gap-1 h-full">
                                    <span className="animate-spin text-sm">⏳</span>
                                    <span className="text-sm">기부 중...</span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-center gap-2 text-sm sm:text-base">
                                        <img src="/images/icon/Gold.png" alt="골드" className="w-5 h-5 drop-shadow-md" />
                                        <span>{GUILD_DONATION_GOLD_COST.toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5">
                                        <div className="flex items-center gap-1 text-[9px] text-slate-800/90">
                                            <img src="/images/guild/tokken.png" alt="길드코인" className="w-3 h-3" />
                                            <span className="font-semibold">{GUILD_DONATION_GOLD_REWARDS.guildCoins[0]}~{GUILD_DONATION_GOLD_REWARDS.guildCoins[1]}</span>
                                            <img src="/images/guild/button/guildlab.png" alt="연구포인트" className="w-3 h-3 ml-1" />
                                            <span className="font-semibold">{GUILD_DONATION_GOLD_REWARDS.researchPoints[0]}~{GUILD_DONATION_GOLD_REWARDS.researchPoints[1]}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-700/90 tracking-wide">
                                            일일 한도 {goldDonationsLeft}/{GUILD_DONATION_GOLD_LIMIT}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </Button>
                </div>

                {/* 다이아 기부 버튼 */}
                <div className="flex flex-col justify-center h-full">
                    <Button
                        onClick={() => handleDonate('GUILD_DONATE_DIAMOND')}
                        disabled={!canDonateDiamond || isDonating}
                        colorScheme="none"
                        className={`w-full h-full justify-center rounded-xl border border-sky-400/50 bg-gradient-to-r from-sky-400/90 via-blue-500/90 to-indigo-500/90 text-white font-semibold tracking-wide shadow-[0_12px_32px_-18px_rgba(56,189,248,0.85)] hover:from-sky-300 hover:to-indigo-500 ${!canDonateDiamond || isDonating ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={{ minHeight: '80px', height: '80px' }}
                    >
                        <div className="flex flex-col items-center justify-center gap-0.5 h-full">
                            {isDonating ? (
                                <div className="flex items-center justify-center gap-1 h-full">
                                    <span className="animate-spin text-sm">⏳</span>
                                    <span className="text-sm">기부 중...</span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-center gap-2 text-sm sm:text-base">
                                        <img src="/images/icon/Zem.png" alt="다이아" className="w-5 h-5 drop-shadow-md" />
                                        <span>{GUILD_DONATION_DIAMOND_COST.toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5">
                                        <div className="flex items-center gap-1 text-[9px] text-white/90">
                                            <img src="/images/guild/tokken.png" alt="길드코인" className="w-3 h-3" />
                                            <span className="font-semibold">{GUILD_DONATION_DIAMOND_REWARDS.guildCoins[0]}~{GUILD_DONATION_DIAMOND_REWARDS.guildCoins[1]}</span>
                                            <img src="/images/guild/button/guildlab.png" alt="연구포인트" className="w-3 h-3 ml-1" />
                                            <span className="font-semibold">{GUILD_DONATION_DIAMOND_REWARDS.researchPoints[0]}~{GUILD_DONATION_DIAMOND_REWARDS.researchPoints[1]}</span>
                                        </div>
                                        <span className="text-[10px] text-white/70 tracking-wide">
                                            일일 한도 {diamondDonationsLeft}/{GUILD_DONATION_DIAMOND_LIMIT}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </Button>
                </div>
            </div>
        </div>
    );
};

const ActivityPanel: React.FC<{ onOpenMissions: () => void; onOpenResearch: () => void; onOpenShop: () => void; missionNotification: boolean; onOpenBossGuide: () => void; }> = ({ onOpenMissions, onOpenResearch, onOpenShop, missionNotification, onOpenBossGuide }) => {
    const activities = [
        { name: '길드 미션', icon: '/images/guild/button/guildmission.png', action: onOpenMissions, notification: missionNotification, color: 'from-purple-500/20 to-purple-600/10' },
        { name: '길드 연구소', icon: '/images/guild/button/guildlab.png', action: onOpenResearch, color: 'from-green-500/20 to-green-600/10' },
        { name: '길드 상점', icon: '/images/guild/button/guildstore.png', action: onOpenShop, color: 'from-orange-500/20 to-orange-600/10' },
        { name: '보스 도감', icon: '/images/guild/button/bossraid1.png', action: onOpenBossGuide, color: 'from-red-500/20 to-red-600/10' },
    ];
    return (
        <div className="bg-gradient-to-br from-purple-900/95 via-indigo-800/90 to-blue-900/95 p-3 rounded-xl border-3 border-purple-400/80 shadow-2xl backdrop-blur-md flex-shrink-0">
            <h3 className="font-bold text-base text-highlight mb-2 text-center flex items-center justify-center gap-2 flex-shrink-0">
                <span className="text-xl">⚡</span>
                <span>길드 활동</span>
            </h3>
            <div className="flex justify-around items-center gap-2">
                {activities.map(act => (
                    <button 
                        key={act.name} 
                        onClick={act.action}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl bg-gradient-to-br ${act.color || 'from-gray-800/40 to-gray-700/20'} border border-accent/20 transition-all hover:brightness-110 hover:shadow-lg relative group flex-1`}
                    >
                        <div className="w-12 h-12 bg-gradient-to-br from-tertiary/80 to-tertiary/60 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-xl transition-shadow">
                            <img src={act.icon} alt={act.name} className="w-10 h-10 drop-shadow-lg" />
                        </div>
                        <span className="text-[10px] font-semibold text-highlight">{act.name}</span>
                        {act.notification && (
                            <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-secondary shadow-lg flex items-center justify-center">
                                <span className="text-[7px] text-white">!</span>
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

const BossPanel: React.FC<{ guild: GuildType, className?: string }> = ({ guild, className }) => {
    const currentBoss = useMemo(() => {
        if (!guild.guildBossState) return GUILD_BOSSES[0];
        return GUILD_BOSSES.find(b => b.id === guild.guildBossState!.currentBossId) || GUILD_BOSSES[0];
    }, [guild.guildBossState]);
    
    const currentHp = guild.guildBossState?.currentBossHp ?? guild.guildBossState?.hp ?? currentBoss?.maxHp ?? 0;
    const hpPercent = (currentHp / currentBoss.maxHp) * 100;
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const msLeft = getTimeUntilNextMondayKST();
            const days = Math.floor(msLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
            setTimeLeft(`${days}일 ${String(hours).padStart(2, '0')}시간 ${String(minutes).padStart(2, '0')}분`);
        };
        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 60000);
        return () => clearInterval(interval);
    }, []);

    // 보스 속성에 따른 색상 테마
    const getBossTheme = (bossId: string) => {
        switch (bossId) {
            case 'boss_1': // 청해 (물)
                return {
                    bg: 'from-blue-900/95 via-cyan-800/90 to-blue-900/95',
                    border: 'border-blue-400/80',
                    shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]',
                    overlay: 'from-blue-500/20 via-cyan-400/10 to-blue-500/15',
                    iconBg: 'from-blue-600/40 to-cyan-800/30',
                    iconBorder: 'border-blue-500/40',
                    hpBar: 'from-blue-500 via-cyan-400 to-blue-500',
                    hpShadow: 'shadow-[0_0_8px_rgba(59,130,246,0.5)]',
                    text: 'text-blue-300',
                };
            case 'boss_2': // 홍염 (불)
                return {
                    bg: 'from-red-900/95 via-orange-800/90 to-red-900/95',
                    border: 'border-red-400/80',
                    shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.4)]',
                    overlay: 'from-red-500/20 via-orange-400/10 to-red-500/15',
                    iconBg: 'from-red-600/40 to-orange-800/30',
                    iconBorder: 'border-red-500/40',
                    hpBar: 'from-red-500 via-orange-600 to-red-700',
                    hpShadow: 'shadow-[0_0_8px_rgba(239,68,68,0.5)]',
                    text: 'text-red-300',
                };
            case 'boss_3': // 녹수 (풀)
                return {
                    bg: 'from-green-900/95 via-emerald-800/90 to-green-900/95',
                    border: 'border-green-400/80',
                    shadow: 'shadow-[0_0_20px_rgba(34,197,94,0.4)]',
                    overlay: 'from-green-500/20 via-emerald-400/10 to-green-500/15',
                    iconBg: 'from-green-600/40 to-emerald-800/30',
                    iconBorder: 'border-green-500/40',
                    hpBar: 'from-green-500 via-emerald-600 to-green-700',
                    hpShadow: 'shadow-[0_0_8px_rgba(34,197,94,0.5)]',
                    text: 'text-green-300',
                };
            case 'boss_4': // 현묘 (어둠)
                return {
                    bg: 'from-purple-900/95 via-indigo-800/90 to-purple-900/95',
                    border: 'border-purple-400/80',
                    shadow: 'shadow-[0_0_20px_rgba(168,85,247,0.4)]',
                    overlay: 'from-purple-500/20 via-indigo-400/10 to-purple-500/15',
                    iconBg: 'from-purple-600/40 to-indigo-800/30',
                    iconBorder: 'border-purple-500/40',
                    hpBar: 'from-purple-500 via-indigo-600 to-purple-700',
                    hpShadow: 'shadow-[0_0_8px_rgba(168,85,247,0.5)]',
                    text: 'text-purple-300',
                };
            case 'boss_5': // 백광 (빛)
                return {
                    bg: 'from-yellow-900/95 via-amber-800/90 to-yellow-900/95',
                    border: 'border-yellow-400/80',
                    shadow: 'shadow-[0_0_20px_rgba(234,179,8,0.4)]',
                    overlay: 'from-yellow-500/20 via-amber-400/10 to-yellow-500/15',
                    iconBg: 'from-yellow-600/40 to-amber-800/30',
                    iconBorder: 'border-yellow-500/40',
                    hpBar: 'from-yellow-500 via-amber-600 to-yellow-700',
                    hpShadow: 'shadow-[0_0_8px_rgba(234,179,8,0.5)]',
                    text: 'text-yellow-300',
                };
            default:
                return {
                    bg: 'from-gray-900/95 via-gray-800/90 to-gray-900/95',
                    border: 'border-gray-400/80',
                    shadow: 'shadow-[0_0_20px_rgba(156,163,175,0.4)]',
                    overlay: 'from-gray-500/20 via-gray-400/10 to-gray-500/15',
                    iconBg: 'from-gray-600/40 to-gray-800/30',
                    iconBorder: 'border-gray-500/40',
                    hpBar: 'from-gray-500 via-gray-600 to-gray-700',
                    hpShadow: 'shadow-[0_0_8px_rgba(156,163,175,0.5)]',
                    text: 'text-gray-300',
                };
        }
    };

    const theme = getBossTheme(currentBoss.id);

    return (
        <button 
            onClick={() => window.location.hash = '#/guildboss'}
            className={`bg-gradient-to-br ${theme.bg} p-3 rounded-xl border-3 ${theme.border} ${theme.shadow} flex flex-col items-center text-center transition-all hover:brightness-110 w-full relative overflow-hidden h-full ${className || ''}`}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.overlay} pointer-events-none`}></div>
            <div className="relative z-10 w-full flex flex-col h-full">
                <h3 className="font-bold text-base text-highlight mb-2 flex items-center justify-center gap-2 flex-shrink-0">
                    <span className="text-xl">⚔️</span>
                    <span>길드 보스전</span>
                </h3>
                <div className={`w-28 h-28 bg-gradient-to-br ${theme.iconBg} rounded-xl flex items-center justify-center my-2 mx-auto border ${theme.iconBorder} shadow-lg flex-shrink-0`}>
                    <img src={currentBoss.image} alt={currentBoss.name} className="w-24 h-24 drop-shadow-lg" />
                </div>
                <div className="w-full flex-1 flex flex-col justify-end">
                    <p className="text-sm font-bold text-highlight mb-1.5">{currentBoss.name}</p>
                    <div className="w-full bg-gray-700/50 rounded-full h-2 border border-gray-600/50 overflow-hidden shadow-inner">
                        <div 
                            className={`bg-gradient-to-r ${theme.hpBar} h-full rounded-full transition-all duration-500 ${theme.hpShadow}`}
                            style={{ width: `${hpPercent}%` }}
                        ></div>
                    </div>
                    <p className={`text-[10px] ${theme.text} mt-1 font-semibold`}>{hpPercent.toFixed(1)}% 남음</p>
                    <p className="text-[9px] text-tertiary mt-1.5 bg-gray-800/50 px-1.5 py-0.5 rounded-md inline-block">교체까지: {timeLeft}</p>
                </div>
            </div>
        </button>
    );
};

const WarPanel: React.FC<{ className?: string }> = ({ className }) => (
    <button 
        onClick={() => window.location.hash = '#/guildwar'}
        className={`bg-gradient-to-br from-purple-900/40 via-purple-800/20 to-purple-900/40 p-3 rounded-xl border-2 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)] flex flex-col items-center text-center transition-all hover:brightness-110 w-full relative overflow-hidden h-full ${className || ''}`}
    >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative z-10 w-full flex flex-col h-full">
            <h3 className="font-bold text-base text-highlight mb-2 flex items-center justify-center gap-2 flex-shrink-0">
                <span className="text-xl">🛡️</span>
                <span>길드 전쟁</span>
            </h3>
            <div className="w-28 h-28 bg-gradient-to-br from-purple-600/30 to-purple-800/20 rounded-xl flex items-center justify-center my-2 mx-auto border border-purple-500/30 shadow-lg flex-shrink-0">
                <img src="/images/guild/button/guildwar.png" alt="길드 전쟁" className="w-24 h-24 drop-shadow-lg" />
            </div>
            <div className="flex-1 flex items-end justify-center">
                <span className="text-sm font-semibold text-highlight bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">입장하기</span>
            </div>
        </div>
    </button>
);

const GuildBossGuideModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [selectedBoss, setSelectedBoss] = useState<GuildBossInfo>(GUILD_BOSSES[0]);

    return (
        <DraggableWindow title="길드 보스 도감" onClose={onClose} windowId="guild-boss-guide" initialWidth={800} variant="store">
            <div className="flex gap-4 h-[60vh]">
                <div className="w-1/3 flex flex-col gap-2 overflow-y-auto pr-2">
                    {GUILD_BOSSES.map(boss => (
                        <button
                            key={boss.id}
                            onClick={() => setSelectedBoss(boss)}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-all w-full border-2 ${
                                selectedBoss.id === boss.id 
                                    ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/30' 
                                    : 'bg-gray-900/50 border-gray-700/50 hover:bg-gray-800/70 hover:border-gray-600/70'
                            }`}
                        >
                            <img src={boss.image} alt={boss.name} className="w-12 h-12 rounded-md border border-gray-700/50" />
                            <span className="font-bold text-white">{boss.name}</span>
                        </button>
                    ))}
                </div>
                <div className="w-2/3 bg-gradient-to-br from-gray-900/80 via-gray-800/70 to-gray-900/80 p-4 rounded-lg overflow-y-auto border border-gray-700/50 shadow-lg">
                    <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-700/50">
                        <img src={selectedBoss.image} alt={selectedBoss.name} className="w-20 h-20 rounded-lg border-2 border-gray-700/50 shadow-lg" />
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-1">{selectedBoss.name}</h3>
                            <p className="text-sm text-gray-400">{selectedBoss.description}</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                            <h4 className="font-semibold text-yellow-300 mb-2">공략 가이드</h4>
                            <p className="text-sm text-gray-300 leading-relaxed">{selectedBoss.strategyGuide}</p>
                        </div>
                        <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                            <h4 className="font-semibold text-yellow-300 mb-2">주요 스킬</h4>
                            <ul className="space-y-3 mt-2">
                                {selectedBoss.skills.map(skill => (
                                    <li key={skill.id} className="flex items-start gap-3 bg-gray-900/50 p-2 rounded-md border border-gray-700/30">
                                        <img src={skill.image || ''} alt={skill.name} className="w-10 h-10 flex-shrink-0 rounded-md border border-gray-700/50" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-white text-sm">{skill.name}</p>
                                            <p className="text-xs text-gray-400 mt-1">{skill.description}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                            <h4 className="font-semibold text-yellow-300 mb-2">추천 능력치</h4>
                            <p className="text-sm text-gray-300">{selectedBoss.recommendedStats.join(', ')}</p>
                        </div>
                        <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                            <h4 className="font-semibold text-yellow-300 mb-2">추천 연구</h4>
                            <p className="text-sm text-gray-300">
                                {selectedBoss.recommendedResearch.length > 0 
                                    ? selectedBoss.recommendedResearch.map(id => GUILD_RESEARCH_PROJECTS[id]?.name).join(', ')
                                    : '없음'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};

interface GuildDashboardProps {
    guild: GuildType;
    guildDonationAnimation: { coins: number; research: number } | null;
    onDonationComplete?: (coins: number, research: number) => void;
}

type GuildTab = 'home' | 'members' | 'management';

export const GuildDashboard: React.FC<GuildDashboardProps> = ({ guild, guildDonationAnimation, onDonationComplete }) => {
    const { currentUserWithStatus, handlers } = useAppContext();
    const [activeTab, setActiveTab] = useState<GuildTab>('home');
    const [isMissionsOpen, setIsMissionsOpen] = useState(false);
    const [isResearchOpen, setIsResearchOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isBossGuideOpen, setIsBossGuideOpen] = useState(false);
    const [isShopOpen, setIsShopOpen] = useState(false);

    const myMemberInfo = useMemo(() => {
        if (!currentUserWithStatus?.id) return undefined;
        let member = guild.members?.find(m => m.userId === currentUserWithStatus.id);

        // Workaround for admin user ID mismatch
        if (!member && currentUserWithStatus.id === 'user-admin-static-id') {
            member = guild.members?.find(m => m.nickname === '관리자');
        }
        return member;
    }, [guild.members, currentUserWithStatus?.id, currentUserWithStatus?.nickname]);

    const canManage = myMemberInfo?.role === 'leader' || myMemberInfo?.role === 'officer';



    const xpForNextLevel = GUILD_XP_PER_LEVEL(guild.level);
    const xpProgress = Math.min(((guild.xp ?? 0) / xpForNextLevel) * 100, 100);
    const myGuildCoins = currentUserWithStatus?.guildCoins ?? 0;
    const myBossTickets = currentUserWithStatus?.guildBossAttempts !== undefined ? GUILD_BOSS_MAX_ATTEMPTS - currentUserWithStatus.guildBossAttempts : GUILD_BOSS_MAX_ATTEMPTS;
    
    const missionTabNotification = useMemo(() => {
        if (!currentUserWithStatus || !myMemberInfo || !guild.weeklyMissions) return false;
        
        const now = Date.now();
        const isExpired = guild.lastMissionReset && isDifferentWeekKST(guild.lastMissionReset, now);
        if (isExpired) return false; // 초기화된 경우 보상 받을 수 없음
        
        // 초기화 전 보상 받을 내역이 있는지 확인
        return guild.weeklyMissions.some(m => {
            const isComplete = (m.progress ?? 0) >= (m.target ?? 0);
            const isClaimed = m.claimedBy?.includes(currentUserWithStatus.id) ?? false;
            return isComplete && !isClaimed;
        });
    }, [guild.weeklyMissions, guild.lastMissionReset, myMemberInfo, currentUserWithStatus]);

    const tabs = [
        { id: 'home' as GuildTab, label: '길드홈' },
        { id: 'members' as GuildTab, label: '길드원' },
    ];
    if (canManage) {
        tabs.push({ id: 'management' as GuildTab, label: '관리' });
    }
    
    const RightPanel: React.FC<{ guildDonationAnimation: { coins: number; research: number } | null; onDonationComplete?: (coins: number, research: number) => void }> = ({ guildDonationAnimation, onDonationComplete }) => (
        <div className="lg:col-span-2 flex flex-col gap-3 h-full min-h-0 overflow-hidden">
            <GuildDonationPanel guildDonationAnimation={guildDonationAnimation} onDonationComplete={onDonationComplete} />
            <ActivityPanel 
                onOpenMissions={() => setIsMissionsOpen(true)} 
                onOpenResearch={() => setIsResearchOpen(true)} 
                onOpenShop={() => setIsShopOpen(true)} 
                missionNotification={missionTabNotification} 
                onOpenBossGuide={() => setIsBossGuideOpen(true)} 
            />
            <div className="flex gap-3 flex-1 min-h-0 overflow-hidden">
                <BossPanel guild={guild} className="flex-1" />
                <WarPanel className="flex-1" />
            </div>
        </div>
    );    return (
        <div 
            className="p-4 max-w-7xl mx-auto h-full flex flex-col w-full relative"
        >
            <div className="relative z-10 h-full flex flex-col">
            {isMissionsOpen && <GuildMissionsPanel guild={guild} myMemberInfo={myMemberInfo} onClose={() => setIsMissionsOpen(false)} />}
            {isResearchOpen && <GuildResearchPanel guild={guild} myMemberInfo={myMemberInfo} onClose={() => setIsResearchOpen(false)} />}
            {isShopOpen && <GuildShopModal onClose={() => setIsShopOpen(false)} isTopmost={true} />}
            {isHelpOpen && <HelpModal mode="strategic" onClose={() => setIsHelpOpen(false)} />}
            {isBossGuideOpen && <GuildBossGuideModal onClose={() => setIsBossGuideOpen(false)} />}
            
            <header className="relative flex justify-center items-center mb-4 flex-shrink-0 py-3 bg-gradient-to-r from-secondary/80 via-secondary/60 to-secondary/80 rounded-xl border border-accent/20 shadow-lg">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <BackButton onClick={() => window.location.hash = '#/profile'} />
                </div>
                
                <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3">
                        <div className="relative group flex-shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-accent/10 rounded-xl blur-sm"></div>
                            <img src={getGuildIconPath(guild.icon)} alt="Guild Icon" className="w-16 h-16 bg-tertiary rounded-xl border-2 border-accent/30 shadow-lg relative z-10" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-highlight to-accent bg-clip-text text-transparent">{guild.name}</h1>
                            <div className="text-sm text-secondary">레벨 {guild.level}</div>
                        </div>
                    </div>
                    <div className="w-64">
                        <div className="flex justify-between text-xs text-secondary mb-1.5">
                            <span className="font-semibold">경험치</span>
                            <span className="font-semibold">{(guild.xp ?? 0).toLocaleString()} / {xpForNextLevel.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-700/50 rounded-full h-3 border border-gray-600/50 overflow-hidden shadow-inner">
                            <div 
                                className="bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                                style={{ width: `${xpProgress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="flex flex-col items-end gap-2">
                        <button 
                            onClick={() => setIsHelpOpen(true)} 
                            className="p-2 rounded-xl bg-tertiary/50 hover:bg-tertiary/70 transition-all hover:scale-110 border border-accent/20 shadow-md" 
                            title="길드 도움말"
                        >
                            <img src="/images/button/help.png" alt="도움말" className="h-6 w-6" />
                        </button>
                        <div className="flex items-center gap-3 bg-gradient-to-br from-tertiary/80 to-tertiary/60 p-3 rounded-xl border border-accent/20 shadow-lg">
                            <div className="flex items-center gap-2 pr-3 border-r border-color/50" title="나의 길드 코인">
                                <img src="/images/guild/tokken.png" alt="Guild Coin" className="w-7 h-7 drop-shadow-md" />
                                <span className="font-bold text-lg text-yellow-300">{myGuildCoins.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2" title="나의 보스전 참여 티켓">
                                <img src="/images/guild/ticket.png" alt="Boss Ticket" className="w-7 h-7 drop-shadow-md" />
                                <span className="font-bold text-lg text-blue-300">{myBossTickets} / {GUILD_BOSS_MAX_ATTEMPTS}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 flex flex-col gap-4 min-h-0">
                    <div className="flex-shrink-0">
                        <div className="flex bg-gradient-to-r from-tertiary/80 to-tertiary/60 p-1 rounded-xl w-full max-w-sm border border-accent/20 shadow-md">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                                        activeTab === tab.id 
                                            ? 'bg-gradient-to-r from-accent to-accent/80 text-white shadow-lg' 
                                            : 'text-tertiary hover:bg-secondary/50 hover:text-highlight'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        {activeTab === 'home' && <GuildHomePanel guild={guild} myMemberInfo={myMemberInfo} />}
                        {activeTab === 'members' && (
                            <NineSlicePanel className="h-full">
                                <GuildMembersPanel guild={guild} myMemberInfo={myMemberInfo} />
                            </NineSlicePanel>
                        )}
                        {activeTab === 'management' && canManage && (
                            <NineSlicePanel className="h-full">
                                <GuildManagementPanel guild={guild} />
                            </NineSlicePanel>
                        )}
                    </div>
                </div>

                <RightPanel guildDonationAnimation={guildDonationAnimation} onDonationComplete={onDonationComplete} />
            </main>
            </div>
        </div>
    );
};