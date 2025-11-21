import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Guild as GuildType, UserWithStatus, GuildBossInfo, QuestReward, GuildMember, GuildMemberRole, CoreStat, GuildResearchId, GuildResearchCategory, ItemGrade, ServerAction } from '../../types/index.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import BackButton from '../BackButton.js';
import Button from '../Button.js';
import GuildHomePanel from './GuildHomePanel.js';
import GuildMembersPanel from './GuildMembersPanel.js';
import GuildManagementPanel from './GuildManagementPanel.js';
import { GUILD_XP_PER_LEVEL, GUILD_BOSSES, GUILD_RESEARCH_PROJECTS, AVATAR_POOL, BORDER_POOL, emptySlotImages, slotNames, GUILD_BOSS_MAX_ATTEMPTS, GUILD_INITIAL_MEMBER_LIMIT, GUILD_DONATION_GOLD_LIMIT, GUILD_DONATION_DIAMOND_LIMIT, GUILD_DONATION_GOLD_COST, GUILD_DONATION_DIAMOND_COST, GUILD_CHECK_IN_MILESTONE_REWARDS } from '../../constants/index.js';
import DraggableWindow from '../DraggableWindow.js';
import GuildResearchPanel from './GuildResearchPanel.js';
import GuildMissionsPanel from './GuildMissionsPanel.js';
import NineSlicePanel from '../ui/NineSlicePanel.js';
import GuildShopModal from './GuildShopModal.js';
import { BOSS_SKILL_ICON_MAP } from '../../assets.js';
import HelpModal from '../HelpModal.js';
import { getTimeUntilNextMondayKST, isSameDayKST } from '../../utils/timeUtils.js';

const GuildDonationPanel: React.FC<{ guildDonationAnimation: { coins: number; research: number } | null }> = ({ guildDonationAnimation }) => {
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
            await handlers.handleAction({ type });
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
                        <img src="/images/guild/guildlab.png" alt="Research" className="w-4 h-4 ml-2" />
                        <span className="text-xs font-bold text-blue-300">+{guildDonationAnimation.research}</span>
                    </div>
                </div>
            );
        });
    }, [guildDonationAnimation]);

    return (
        <div className="bg-secondary p-2 rounded-lg flex flex-col relative overflow-hidden">
            <h3 className="font-bold text-base text-highlight mb-2 text-center">길드 기부</h3>
            {animationElements}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-tertiary p-3 rounded-md text-center">
                    <img src="/images/Gold.png" alt="골드 기부" className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-xs text-secondary">골드 기부 ({goldDonationsLeft}/{GUILD_DONATION_GOLD_LIMIT})</p>
                    <Button 
                        onClick={() => handleDonate('GUILD_DONATE_GOLD')}
                        disabled={!canDonateGold || isDonating}
                        colorScheme="yellow"
                        className="w-full mt-2 !text-xs !py-1"
                    >
                        {isDonating ? '기부 중...' : `${GUILD_DONATION_GOLD_COST.toLocaleString()} 골드 기부`}
                    </Button>
                </div>
                <div className="bg-tertiary p-3 rounded-md text-center">
                    <img src="/images/Zem.png" alt="다이아 기부" className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-xs text-secondary">다이아 기부 ({diamondDonationsLeft}/{GUILD_DONATION_DIAMOND_LIMIT})</p>
                    <Button
                        onClick={() => handleDonate('GUILD_DONATE_DIAMOND')}
                        disabled={!canDonateDiamond || isDonating}
                        colorScheme="blue"
                        className="w-full mt-2 !text-xs !py-1"
                    >
                        {isDonating ? '기부 중...' : `${GUILD_DONATION_DIAMOND_COST.toLocaleString()} 다이아 기부`}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const ActivityPanel: React.FC<{ onOpenMissions: () => void; onOpenResearch: () => void; onOpenShop: () => void; missionNotification: boolean; onOpenBossGuide: () => void; }> = ({ onOpenMissions, onOpenResearch, onOpenShop, missionNotification, onOpenBossGuide }) => {
    const activities = [
        { name: '길드 미션', icon: '/images/guild/guildmission.png', action: onOpenMissions, notification: missionNotification },
        { name: '길드 연구소', icon: '/images/guild/guildlab.png', action: onOpenResearch },
        { name: '길드 상점', icon: '/images/guild/guildstore.png', action: onOpenShop },
        { name: '보스 도감', icon: '/images/guild/bossraid1.png', action: onOpenBossGuide },
    ];
    return (
        <div className="bg-secondary p-2 rounded-lg">
            <h3 className="font-bold text-base text-highlight mb-2 text-center">길드 활동</h3>
            <div className="flex justify-around">
                {activities.map(act => (
                    <button 
                        key={act.name} 
                        onClick={act.action}
                        className={`flex flex-col items-center gap-1 text-center transition-transform hover:scale-105 relative`}
                    >
                        <div className="w-14 h-14 bg-tertiary rounded-lg flex items-center justify-center">
                            <img src={act.icon} alt={act.name} className="w-12 h-12" />
                        </div>
                        <span className="text-sm font-semibold">{act.name}</span>
                        {act.notification && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-secondary"></div>}
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

    return (
        <button 
            onClick={() => window.location.hash = '#/guildboss'}
            className={`bg-secondary p-2 rounded-lg flex flex-col items-center text-center transition-all hover:bg-tertiary/70 w-full ${className || ''}`}
        >
            <h3 className="font-bold text-base text-highlight mb-1">길드 보스전</h3>
            <div className="w-20 h-20 bg-tertiary rounded-lg flex items-center justify-center my-1">
                <img src="/images/guild/bossraid.png" alt="길드 보스전" className="w-16 h-16" />
            </div>
            <div className="w-full mt-auto">
                <p className="text-base font-semibold">{currentBoss.name}</p>
                <div className="w-full bg-tertiary rounded-full h-2 border border-color mt-1">
                    <div className="bg-gradient-to-r from-red-500 to-red-700 h-full rounded-full" style={{ width: `${hpPercent}%` }}></div>
                </div>
                <p className="text-xs text-tertiary mt-1">{hpPercent.toFixed(1)}%</p>
                 <p className="text-xs text-tertiary mt-1">교체까지: {timeLeft}</p>
            </div>
        </button>
    );
};

const WarPanel: React.FC<{ className?: string }> = ({ className }) => (
    <button 
        onClick={() => window.location.hash = '#/guildwar'}
        className={`bg-secondary p-2 rounded-lg flex flex-col items-center text-center transition-all hover:bg-tertiary/70 w-full ${className || ''}`}
    >
        <h3 className="font-bold text-base text-highlight mb-1">길드 전쟁</h3>
        <div className="w-20 h-20 bg-tertiary rounded-lg flex items-center justify-center my-1">
            <img src="/images/guild/guildwar.png" alt="길드 전쟁" className="w-16 h-16" />
        </div>
        <span className="text-base text-secondary mt-auto">입장하기</span>
    </button>
);

const GuildBossGuideModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [selectedBoss, setSelectedBoss] = useState<GuildBossInfo>(GUILD_BOSSES[0]);

    return (
        <DraggableWindow title="길드 보스 도감" onClose={onClose} windowId="guild-boss-guide" initialWidth={700}>
            <div className="flex gap-4 h-[60vh]">
                <div className="w-1/3 flex flex-col gap-2 overflow-y-auto pr-2">
                    {GUILD_BOSSES.map(boss => (
                        <button
                            key={boss.id}
                            onClick={() => setSelectedBoss(boss)}
                            className={`flex items-center gap-3 p-2 rounded-lg transition-colors w-full ${selectedBoss.id === boss.id ? 'bg-blue-800' : 'bg-secondary hover:bg-tertiary'}`}
                        >
                            <img src={boss.image} alt={boss.name} className="w-12 h-12 rounded-md" />
                            <span className="font-bold">{boss.name}</span>
                        </button>
                    ))}
                </div>
                <div className="w-2/3 bg-tertiary/50 p-3 rounded-lg overflow-y-auto">
                    <h3 className="text-xl font-bold text-highlight text-center mb-2">{selectedBoss.name}</h3>
                    <p className="text-sm text-tertiary text-center mb-4">{selectedBoss.description}</p>
                    <div className="space-y-3">
                        <div>
                            <h4 className="font-semibold text-primary">공략 가이드</h4>
                            <p className="text-xs text-secondary">{selectedBoss.strategyGuide}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-primary">주요 스킬</h4>
                            <ul className="space-y-2 mt-1">
                                {selectedBoss.skills.map(skill => (
                                    <li key={skill.id} className="flex items-start gap-2 text-xs">
                                        <img src={skill.image || ''} alt={skill.name} className="w-8 h-8 flex-shrink-0" />
                                        <div>
                                            <p className="font-bold text-highlight">{skill.name}</p>
                                            <p className="text-secondary">{skill.description}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-primary">추천 능력치</h4>
                            <p className="text-xs text-secondary">{selectedBoss.recommendedStats.join(', ')}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-primary">추천 연구</h4>
                            <p className="text-xs text-secondary">{selectedBoss.recommendedResearch.map(id => GUILD_RESEARCH_PROJECTS[id]?.name).join(', ')}</p>
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
}

type GuildTab = 'home' | 'members' | 'management';

export const GuildDashboard: React.FC<GuildDashboardProps> = ({ guild, guildDonationAnimation }) => {
    const { currentUserWithStatus, handlers } = useAppContext();
    const [activeTab, setActiveTab] = useState<GuildTab>('home');
    const [isMissionsOpen, setIsMissionsOpen] = useState(false);
    const [isResearchOpen, setIsResearchOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isBossGuideOpen, setIsBossGuideOpen] = useState(false);

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
        if (!currentUserWithStatus || !myMemberInfo) return false;
        return guild.weeklyMissions?.some(m => (m.progress ?? 0) >= (m.target ?? 0) && (m.claimedBy?.includes(currentUserWithStatus.id) ?? false)) ?? false;
    }, [guild.weeklyMissions, myMemberInfo, currentUserWithStatus]);

    const tabs = [
        { id: 'home' as GuildTab, label: '길드홈' },
        { id: 'members' as GuildTab, label: '길드원' },
    ];
    if (canManage) {
        tabs.push({ id: 'management' as GuildTab, label: '관리' });
    }
    
    const RightPanel: React.FC<{ guildDonationAnimation: { coins: number; research: number } | null }> = ({ guildDonationAnimation }) => (
        <div className="lg:col-span-2 flex flex-col gap-4 overflow-y-auto h-full min-h-0">
            <GuildDonationPanel guildDonationAnimation={guildDonationAnimation} />
            <ActivityPanel 
                onOpenMissions={() => setIsMissionsOpen(true)} 
                onOpenResearch={() => setIsResearchOpen(true)} 
                onOpenShop={handlers.openGuildShop} 
                missionNotification={missionTabNotification} 
                onOpenBossGuide={() => setIsBossGuideOpen(true)} 
            />
            <div className="flex-grow flex gap-4">
                <BossPanel guild={guild} className="flex-1 h-full" />
                <WarPanel className="flex-1 h-full" />
            </div>
        </div>
    );    return (
        <div className="p-2 max-w-7xl mx-auto h-full flex flex-col w-full relative">
            {isMissionsOpen && <GuildMissionsPanel guild={guild} myMemberInfo={myMemberInfo} onClose={() => setIsMissionsOpen(false)} />}
            {isResearchOpen && <GuildResearchPanel guild={guild} myMemberInfo={myMemberInfo} onClose={() => setIsResearchOpen(false)} />}
            {isHelpOpen && <HelpModal mode="strategic" onClose={() => setIsHelpOpen(false)} />}
            {isBossGuideOpen && <GuildBossGuideModal onClose={() => setIsBossGuideOpen(false)} />}
            
            <header className="relative flex justify-center items-center mb-2 flex-shrink-0 py-1">
                <div className="absolute left-0 top-1/2 -translate-y-1/2">
                    <BackButton onClick={() => window.location.hash = '#/profile'} />
                </div>
                
                <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2">
                        <div className="relative group flex-shrink-0">
                            <img src={guild.icon} alt="Guild Icon" className="w-12 h-12 bg-tertiary rounded-md" />
                        </div>
                        <h1 className="text-2xl font-bold">{guild.name}</h1>
                    </div>
                    <div className="w-48">
                        <div className="flex justify-between text-xs text-secondary mb-0.5">
                            <span>Lv.{guild.level}</span>
                            <span>{(guild.xp ?? 0).toLocaleString()} / {xpForNextLevel.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-tertiary rounded-full h-2.5 border border-color">
                            <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full" style={{ width: `${xpProgress}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <div className="flex flex-col items-end gap-1">
                                                <button onClick={() => setIsHelpOpen(true)} className="p-1 rounded-full text-2xl hover:bg-tertiary transition-colors" title="길드 도움말">
                            <img src="/images/button/help.png" alt="도움말" className="h-6" />
                        </button>
                        <div className="flex items-center gap-2 bg-tertiary/70 p-2 rounded-lg">
                            <div className="flex items-center gap-1 pr-2 border-r border-color" title="나의 길드 코인">
                                <img src="/images/guild/tokken.png" alt="Guild Coin" className="w-6 h-6" />
                                <span className="font-bold text-lg">{myGuildCoins.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2" title="나의 보스전 참여 티켓">
                                <img src="/images/guild/ticket.png" alt="Boss Ticket" className="w-6 h-6" />
                                <span className="font-bold text-lg">{myBossTickets} / {GUILD_BOSS_MAX_ATTEMPTS}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 flex flex-col gap-4 min-h-0">
                    <div className="flex-shrink-0">
                        <div className="flex bg-tertiary/70 p-1 rounded-lg w-full max-w-sm">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === tab.id ? 'bg-accent' : 'text-tertiary hover:bg-secondary/50'}`}
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

                <RightPanel guildDonationAnimation={guildDonationAnimation} />
            </main>
        </div>
    );
};