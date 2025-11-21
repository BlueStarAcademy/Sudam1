import React, { useMemo } from 'react';
import { Guild, GuildResearchId, GuildResearchCategory } from '../../types/index.js';
import DraggableWindow from '../DraggableWindow.js';
import { GUILD_RESEARCH_PROJECTS } from '../../constants/index.js';

interface GuildEffectsModalProps {
    guild: Guild;
    onClose: () => void;
    isTopmost?: boolean;
}

const GuildEffectsModal: React.FC<GuildEffectsModalProps> = ({ guild, onClose, isTopmost }) => {
    const effectsByCategory = useMemo(() => {
        const categories: Record<GuildResearchCategory, { name: string; description: string; value: string }[]> = {
            development: [],
            boss: [],
            stats: [],
            rewards: [],
        };

        if (guild.research) {
            for (const researchId in guild.research) {
                const id = researchId as GuildResearchId;
                const data = guild.research[id];
                if (data && data.level > 0) {
                    const project = GUILD_RESEARCH_PROJECTS[id];
                    if (project) {
                        const totalEffect = project.baseEffect * data.level;
                        const effectValue = `${totalEffect.toFixed(project.effectUnit === '%' ? 1 : 0).replace('.0', '')}${project.effectUnit}`;
                        
                        categories[project.category].push({
                            name: project.name,
                            description: project.description.replace(/(\d+(\.\d+)?)/, `+${effectValue}`),
                            value: `+${effectValue}`
                        });
                    }
                }
            }
        }
        return categories;
    }, [guild.research]);

    const categoryTitles: Record<GuildResearchCategory, { title: string, color: string }> = {
        development: { title: "길드 발전", color: "text-yellow-300" },
        boss: { title: "보스전", color: "text-red-400" },
        stats: { title: "능력치 증가", color: "text-blue-300" },
        rewards: { title: "보상 증가", color: "text-green-300" },
    };

    return (
        <DraggableWindow title="길드 효과 정보" onClose={onClose} windowId={`guild-effects-${guild.id}`} initialWidth={500} isTopmost={isTopmost}>
            <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
                {(Object.keys(effectsByCategory) as GuildResearchCategory[]).map(category => {
                    const effects = effectsByCategory[category];
                    if (effects.length === 0) return null;
                    const { title, color } = categoryTitles[category];

                    return (
                        <div key={category} className="bg-gray-900/50 p-3 rounded-lg">
                            <h3 className={`text-lg font-bold mb-2 border-b border-gray-700 pb-1 ${color}`}>{title}</h3>
                            <ul className="space-y-1.5 text-sm">
                                {effects.map(effect => (
                                    <li key={effect.name} className="flex justify-between items-center">
                                        <span className="text-gray-300">{effect.name}</span>
                                        <span className={`font-bold font-mono ${color}`}>{effect.value}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
                 {Object.values(effectsByCategory).every(arr => arr.length === 0) && (
                    <p className="text-center text-gray-500 py-8">아직 활성화된 길드 효과가 없습니다.</p>
                )}
            </div>
        </DraggableWindow>
    );
};

export default GuildEffectsModal;