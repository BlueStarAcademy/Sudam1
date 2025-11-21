import React, { useState, useEffect, useMemo } from 'react';
import { Guild, GuildMember, GuildMemberRole, GuildResearchId, GuildResearchCategory } from '../../types/index.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import Button from '../Button.js';
import { GUILD_RESEARCH_PROJECTS } from '../../constants/index.js';
import DraggableWindow from '../DraggableWindow.js';

interface GuildResearchPanelProps {
    guild: Guild;
    myMemberInfo: GuildMember | undefined;
    onClose: () => void;
}

const getResearchCost = (researchId: GuildResearchId, level: number): number => {
    const project = GUILD_RESEARCH_PROJECTS[researchId];
    if (!project) return Infinity;
    return Math.floor(project.baseCost * Math.pow(project.costMultiplier, level));
};

const getResearchTimeMs = (researchId: GuildResearchId, level: number): number => {
    const project = GUILD_RESEARCH_PROJECTS[researchId];
    if(!project) return 0;
    const hours = project.baseTimeHours + (project.timeIncrementHours * level);
    return hours * 60 * 60 * 1000;
};

const formatTimeLeft = (ms: number): string => {
    if (ms <= 0) return "완료";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const getResearchSkillDisplay = (researchId: GuildResearchId, level: number): { chance?: number; description: string; } | null => {
    if (level === 0) return null;
    const project = GUILD_RESEARCH_PROJECTS[researchId];
    if (!project) return null;

    const totalEffect = project.baseEffect * level;

    switch (researchId) {
        case GuildResearchId.boss_hp_increase:
            return { description: `[${totalEffect}% 증가]` };
        case GuildResearchId.boss_skill_heal_block: {
            const chance = 10 + (15 * level);
            const reduction = 10 * level; // baseEffect is 10
            return { chance, description: `회복 불가 또는 회복량 ${reduction}% 감소` };
        }
        case GuildResearchId.boss_skill_regen: { // '회복'
            const chance = 10 + (15 * level);
            const increase = 10 * level; // baseEffect is 10
            return { chance, description: `회복, 회복량 +${increase}%` };
        }
        case GuildResearchId.boss_skill_ignite: {
            const chance = 10 + (15 * level);
            const increasePercent = level * 10; // baseEffect is 10
            return { chance, description: `고정피해, 피해량 +${increasePercent}%` };
        }
        default:
            return null;
    }
};

const ResearchItemPanel: React.FC<{
    researchId: GuildResearchId;
    project: typeof GUILD_RESEARCH_PROJECTS[GuildResearchId];
    guild: Guild;
    myMemberInfo: GuildMember | undefined;
    isResearchingThis: boolean;
    isAnyResearchActive: boolean;
}> = ({ researchId, project, guild, myMemberInfo, isResearchingThis, isAnyResearchActive }) => {
    const { handlers } = useAppContext();
    const [timeLeft, setTimeLeft] = useState(0);

    const currentLevel = guild.research?.[researchId]?.level ?? 0;
    const isMaxLevel = currentLevel >= project.maxLevel;
    
    const nextLevel = currentLevel + 1;
    const cost = getResearchCost(researchId, currentLevel);
    const timeMs = getResearchTimeMs(researchId, currentLevel);

    const canAfford = (guild.researchPoints ?? 0) >= cost;
    const canManage = myMemberInfo?.role === 'leader' || myMemberInfo?.role === 'officer';
    const meetsGuildLevel = guild.level >= (project.requiredGuildLevel?.[currentLevel] ?? nextLevel);
    
    const canStartResearch = canManage && !isAnyResearchActive && !isMaxLevel && canAfford && meetsGuildLevel;

    useEffect(() => {
        if (isResearchingThis && guild.researchTask) {
            const completionTime = guild.researchTask.completedAt || guild.researchTask.completionTime;
            if (completionTime) {
                const update = () => {
                    const remaining = Math.max(0, completionTime - Date.now());
                    setTimeLeft(remaining);
                };
                update();
                const interval = setInterval(update, 1000);
                return () => clearInterval(interval);
            }
        }
    }, [isResearchingThis, guild.researchTask]);

    const handleStartResearch = () => {
        if (!canStartResearch) return;
        if (window.confirm(`[${project.name}] ${nextLevel}레벨 연구를 시작하시겠습니까?\n\n필요 포인트: ${cost.toLocaleString()} RP\n예상 시간: ${formatTimeLeft(timeMs)}`)) {
            handlers.handleAction({ type: 'GUILD_START_RESEARCH', payload: { guildId: guild.id, researchId } });
        }
    };
    
    const currentEffectDisplay = getResearchSkillDisplay(researchId, currentLevel);
    const nextEffectDisplay = getResearchSkillDisplay(researchId, nextLevel);

    const defaultEffectText = `+${(project.baseEffect * currentLevel).toFixed(project.effectUnit === '%' ? 1 : 0).replace('.0', '')}${project.effectUnit}`;
    const defaultNextEffectText = `+${(project.baseEffect * nextLevel).toFixed(project.effectUnit === '%' ? 1 : 0).replace('.0', '')}${project.effectUnit}`;
    
    let currentEffectString = '효과 없음';
    if (currentLevel > 0) {
        currentEffectString = currentEffectDisplay ? `${currentEffectDisplay.chance ? `[${currentEffectDisplay.chance}% 확률] ` : ''}${currentEffectDisplay.description}` : defaultEffectText;
    }

    let nextEffectString = '';
    if (!isMaxLevel) {
        nextEffectString = nextEffectDisplay ? `${nextEffectDisplay.chance ? `[${nextEffectDisplay.chance}% 확률] ` : ''}${nextEffectDisplay.description}` : defaultNextEffectText;
    }


    return (
         <div className={`flex items-stretch gap-4 bg-gray-900/50 p-3 rounded-lg transition-all duration-300 border-2 ${isResearchingThis ? 'border-blue-500 ring-2 ring-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'border-gray-700/50 hover:border-gray-600/70'}`}>
            <div className="flex-shrink-0 w-20 h-20 bg-gray-800 rounded-md flex items-center justify-center border border-gray-700/50 shadow-lg">
                <img src={project.image} alt={project.name} className="w-16 h-16 object-contain drop-shadow-lg" />
            </div>
            <div className="flex-grow flex flex-col justify-between gap-1 min-w-0">
                <div>
                    <h4 className="font-bold text-white truncate">{project.name}</h4>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{project.description}</p>
                </div>
                <div className="text-xs space-y-0.5">
                    <p>현재 레벨: <span className="font-bold text-yellow-300">{currentLevel} / {project.maxLevel}</span></p>
                    <p>
                        현재 효과: <span className="font-bold text-green-400">{currentEffectString}</span>
                    </p>
                    {!isMaxLevel && (
                        <p>다음 레벨: <span className="font-bold text-blue-400">{nextEffectString}</span></p>
                    )}
                </div>
            </div>
            <div className="w-48 flex-shrink-0 flex flex-col justify-between gap-2">
                {isResearchingThis ? (
                    <div className="text-center bg-gradient-to-br from-blue-900/60 to-blue-800/40 p-3 rounded-md h-full flex flex-col justify-center border border-blue-500/50 shadow-lg">
                        <p className="text-xs text-blue-300 mb-2">연구 진행 중...</p>
                        <p className="font-mono font-bold text-2xl text-blue-200">{formatTimeLeft(timeLeft)}</p>
                    </div>
                ) : (
                    <div className="bg-gray-800/60 p-2 rounded-md text-xs space-y-1 h-full flex flex-col justify-center border border-gray-700/50">
                        {isMaxLevel ? (
                            <p className="text-center font-bold text-green-400">최고 레벨 달성</p>
                        ) : (
                            <>
                                <p>필요 포인트: <span className={`font-semibold ${canAfford ? 'text-yellow-300' : 'text-red-400'}`}>{cost.toLocaleString()} RP</span></p>
                                <p>소요 시간: <span className="font-semibold text-gray-300">{formatTimeLeft(timeMs)}</span></p>
                                <p>필요 길드 Lv: <span className={`font-semibold ${meetsGuildLevel ? 'text-gray-300' : 'text-red-400'}`}>{project.requiredGuildLevel?.[currentLevel] ?? nextLevel}</span></p>
                            </>
                        )}
                    </div>
                )}
                 <Button onClick={handleStartResearch} disabled={!canStartResearch} colorScheme={canStartResearch ? 'blue' : 'gray'} className="w-full !text-sm !py-2">
                    {isMaxLevel ? '최고 레벨' : '연구 시작'}
                </Button>
            </div>
        </div>
    );
};

const GuildResearchPanel: React.FC<GuildResearchPanelProps & { onClose: () => void }> = ({ guild, myMemberInfo, onClose }) => {
    // FIX: Replaced string literal with GuildResearchCategory enum member for initial state.
    const [activeTab, setActiveTab] = useState<GuildResearchCategory>(GuildResearchCategory.development);
    const researchInProgressId = guild.researchTask?.researchId;

    const researchProjectsForTab = useMemo(() => {
        return (Object.entries(GUILD_RESEARCH_PROJECTS) as [GuildResearchId, typeof GUILD_RESEARCH_PROJECTS[GuildResearchId]][])
            .filter(([, project]) => project.category === activeTab)
            .map(([id, project]) => ({ id, project }));
    }, [activeTab]);
    
    const tabs: { id: GuildResearchCategory; label: string }[] = [
        // FIX: Replaced string literals with GuildResearchCategory enum members.
        { id: GuildResearchCategory.development, label: '길드 발전' },
        { id: GuildResearchCategory.boss, label: '보스전' },
        { id: GuildResearchCategory.stats, label: '능력치 증가' },
        { id: GuildResearchCategory.rewards, label: '보상 증가' },
    ];

    return (
        <DraggableWindow title="길드 연구소" onClose={onClose} windowId="guild-research" initialWidth={900} variant="store">
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 className="text-xl font-bold text-highlight">길드 연구</h3>
                    <div className="bg-gradient-to-br from-gray-900/80 via-gray-800/70 to-gray-900/80 p-3 rounded-lg text-center border border-accent/30 shadow-lg backdrop-blur-sm">
                        <p className="text-xs text-gray-400 mb-1">보유 연구 포인트</p>
                        <p className="font-bold text-xl text-yellow-300">{(guild.researchPoints ?? 0).toLocaleString()} RP</p>
                    </div>
                </div>
                <div className="flex bg-gray-900/70 p-1 rounded-lg mb-4 flex-shrink-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === tab.id ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="space-y-3 overflow-y-auto pr-2 flex-1">
                    {researchProjectsForTab.map(({ id, project }) => (
                        <ResearchItemPanel
                            key={id}
                            researchId={id}
                            project={project}
                            guild={guild}
                            myMemberInfo={myMemberInfo}
                            isResearchingThis={researchInProgressId === id}
                            isAnyResearchActive={!!researchInProgressId}
                        />
                    ))}
                </div>
            </div>
        </DraggableWindow>
    );
};

export default GuildResearchPanel;