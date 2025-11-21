
import type { User, Guild, MannerEffects, InventoryItem } from '../types/index.js';
import { CoreStat, SpecialStat, MythicStat, GuildResearchId } from '../types/index.js';
import { GUILD_RESEARCH_PROJECTS, ACTION_POINT_REGEN_INTERVAL_MS } from '../constants/index.js';
import { getMannerEffects } from './mannerUtils.js';

// FIX: Add createDefaultBaseStats function and export it for shared use.
export const createDefaultBaseStats = (): Record<CoreStat, number> => ({
    [CoreStat.Concentration]: 100,
    [CoreStat.ThinkingSpeed]: 100,
    [CoreStat.Judgment]: 100,
    [CoreStat.Calculation]: 100,
    [CoreStat.CombatPower]: 100,
    [CoreStat.Stability]: 100,
});

export interface CalculatedEffects extends MannerEffects {
    maxActionPoints: number;
    actionPointRegenInterval: number;
    coreStatBonuses: Record<CoreStat, { flat: number; percent: number }>;
    specialStatBonuses: Record<SpecialStat, { flat: number; percent: number }>;
    mythicStatBonuses: Record<MythicStat, { flat: number; percent: number; }>,
    strategicGoldBonusPercent: number;
    playfulGoldBonusPercent: number;
    strategicXpBonusPercent: number;
    playfulXpBonusPercent: number;
}

const researchIdToCoreStat: Partial<Record<GuildResearchId, CoreStat>> = {
    [GuildResearchId.stat_concentration]: CoreStat.Concentration,
    [GuildResearchId.stat_thinking_speed]: CoreStat.ThinkingSpeed,
    [GuildResearchId.stat_judgment]: CoreStat.Judgment,
    [GuildResearchId.stat_calculation]: CoreStat.Calculation,
    [GuildResearchId.stat_combat_power]: CoreStat.CombatPower,
    [GuildResearchId.stat_stability]: CoreStat.Stability,
};

export const calculateUserEffects = (user: User, guild: Guild | null): CalculatedEffects => {
    const effects = getMannerEffects(user);

    const calculatedEffects: CalculatedEffects = {
        ...effects,
        coreStatBonuses: {} as Record<CoreStat, { flat: number; percent: number }>,
        specialStatBonuses: {} as Record<SpecialStat, { flat: number; percent: number }>,
        mythicStatBonuses: {} as Record<MythicStat, { flat: number; percent: number; }>,
        strategicGoldBonusPercent: 0,
        playfulGoldBonusPercent: 0,
        strategicXpBonusPercent: 0,
        playfulXpBonusPercent: 0,
    };

    for (const key of Object.values(CoreStat) as CoreStat[]) {
        calculatedEffects.coreStatBonuses[key] = { flat: 0, percent: 0 };
    }
    for (const key of Object.values(SpecialStat) as SpecialStat[]) {
        calculatedEffects.specialStatBonuses[key] = { flat: 0, percent: 0 };
    }
    for (const key of Object.values(MythicStat) as MythicStat[]) {
        calculatedEffects.mythicStatBonuses[key] = { flat: 0, percent: 0 };
    }

    const equippedItems = user.inventory.filter(i => i.isEquipped && i.type === 'equipment' && i.options);

    for (const item of equippedItems) {
        const allOptions = [item.options!.main, ...item.options!.combatSubs, ...item.options!.specialSubs, ...item.options!.mythicSubs];
        for (const opt of allOptions) {
            if (!opt) continue;

            const { type, value, isPercentage } = opt;

            if (Object.values(CoreStat).includes(type as CoreStat)) {
                if (isPercentage) {
                    calculatedEffects.coreStatBonuses[type as CoreStat].percent += value;
                } else {
                    calculatedEffects.coreStatBonuses[type as CoreStat].flat += value;
                }
            } else if (Object.values(SpecialStat).includes(type as SpecialStat)) {
                 if (isPercentage) {
                    calculatedEffects.specialStatBonuses[type as SpecialStat].percent += value;
                } else {
                    calculatedEffects.specialStatBonuses[type as SpecialStat].flat += value;
                }
            } else if (Object.values(MythicStat).includes(type as MythicStat)) {
                calculatedEffects.mythicStatBonuses[type as MythicStat].flat += value;
            }
        }
    }

    if (guild && guild.research) {
        for (const researchId in guild.research) {
            const id = researchId as GuildResearchId;
            const data = guild.research[id];
            const project = GUILD_RESEARCH_PROJECTS[id];
            if (data && data.level > 0 && project) {
                const totalEffect = project.baseEffect * data.level;
                const coreStat = researchIdToCoreStat[id];
                if (coreStat) {
                    calculatedEffects.coreStatBonuses[coreStat].percent += totalEffect;
                } else {
                    switch (id) {
                        case GuildResearchId.ap_regen_boost: calculatedEffects.specialStatBonuses[SpecialStat.ActionPointRegen].percent += totalEffect; break;
                        case GuildResearchId.reward_strategic_gold: calculatedEffects.strategicGoldBonusPercent += totalEffect; break;
                        case GuildResearchId.reward_playful_gold: calculatedEffects.playfulGoldBonusPercent += totalEffect; break;
                        case GuildResearchId.reward_strategic_xp: calculatedEffects.strategicXpBonusPercent += totalEffect; break;
                        case GuildResearchId.reward_playful_xp: calculatedEffects.playfulXpBonusPercent += totalEffect; break;
                        case GuildResearchId.boss_hp_increase:
                            break;
                    }
                }
            }
        }
    }
    
    calculatedEffects.maxActionPoints += calculatedEffects.specialStatBonuses[SpecialStat.ActionPointMax]?.flat ?? 0;
    const regenBonusPercent = calculatedEffects.specialStatBonuses[SpecialStat.ActionPointRegen]?.percent ?? 0;
    if (regenBonusPercent > 0) {
        calculatedEffects.actionPointRegenInterval = Math.floor(calculatedEffects.actionPointRegenInterval / (1 + regenBonusPercent / 100));
    }
    
    return calculatedEffects;
};

export const calculateTotalStats = (user: User, guild: Guild | null): Record<CoreStat, number> => {
    const finalStats: Record<CoreStat, number> = {} as any;
    
    const baseWithSpent: Record<CoreStat, number> = {} as any;
    for (const key of Object.values(CoreStat) as CoreStat[]) {
        baseWithSpent[key] = (user.baseStats?.[key] || 0) + (user.spentStatPoints?.[key] || 0);
    }

    const effects = calculateUserEffects(user, guild);
    const bonuses = effects.coreStatBonuses;

    for (const key of Object.values(CoreStat) as CoreStat[]) {
        const baseValue = baseWithSpent[key];
        const flatBonus = bonuses[key].flat;
        const percentBonus = bonuses[key].percent;
        const finalValue = Math.floor((Number(baseValue) + Number(flatBonus)) * (1 + Number(percentBonus) / 100));
        finalStats[key] = finalValue;
    }
    
    return finalStats;
};

export const calculateItemStats = (item: InventoryItem): Record<CoreStat | SpecialStat | MythicStat, number> => {
    const stats: Record<CoreStat | SpecialStat | MythicStat, number> = {} as any;

    if (item.options) {
        const allOptions = [item.options.main, ...item.options.combatSubs, ...item.options.specialSubs, ...item.options.mythicSubs];
        for (const opt of allOptions) {
            if (opt) {
                stats[opt.type] = (stats[opt.type] || 0) + opt.value;
            }
        }
    }

    return stats;
};