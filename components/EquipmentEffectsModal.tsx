import React from 'react';
import DraggableWindow from './DraggableWindow.js';
import { CoreStat, SpecialStat, MythicStat } from '../types.js';
import { CORE_STATS_DATA, SPECIAL_STATS_DATA, MYTHIC_STATS_DATA } from '../constants';

interface EquipmentEffectsModalProps {
    onClose: () => void;
    isTopmost?: boolean;
    mainOptionBonuses: Record<string, { value: number; isPercentage: boolean }>;
    combatSubOptionBonuses: Record<string, { value: number; isPercentage: boolean }>;
    specialStatBonuses: Record<string, { flat: number; percent: number }>;
    aggregatedMythicStats: Record<MythicStat, { count: number, totalValue: number }>;
}

const StatSummaryPanel: React.FC<{ title: string; color: string; children: React.ReactNode }> = ({ title, color, children }) => {
    const childrenArray = React.Children.toArray(children).filter(Boolean); // Filter out null/undefined children
    return (
        <div className="flex-1 bg-gray-800/30 p-2 rounded-md flex flex-col min-h-0">
            <h4 className={`text-center font-semibold mb-1 text-sm flex-shrink-0 ${color}`}>{title}</h4>
            <div className="flex-grow overflow-y-auto pr-1 space-y-1 text-xs">
                {childrenArray.length > 0 ? childrenArray : <p className="text-xs text-gray-400 text-center">해당 없음</p>}
            </div>
        </div>
    );
};

const formatMythicStat = (stat: MythicStat, data: { count: number, totalValue: number }): React.ReactNode => {
    const baseDescription = MYTHIC_STATS_DATA[stat].description;

    switch (stat) {
        case MythicStat.StrategicGoldBonus:
        case MythicStat.PlayfulGoldBonus: {
            const newPercentage = 20 * data.count;
            return <span className="w-full">{baseDescription.replace(/20%/, `${newPercentage}%`)}</span>;
        }
        case MythicStat.MannerActionCooldown: {
             return (
                <div className="flex justify-between items-center w-full">
                    <span>{baseDescription}</span>
                    <span className="font-mono font-semibold">+{data.totalValue}</span>
                </div>
            );
        }
        case MythicStat.DiceGoOddBonus:
        case MythicStat.AlkkagiSlowBonus:
        case MythicStat.AlkkagiAimingBonus: {
            return <span className="w-full">{baseDescription.replace(/1개/g, `${data.totalValue}개`)}</span>;
        }
        default:
            return <span className="w-full">{baseDescription}</span>;
    }
};

const EquipmentEffectsModal: React.FC<EquipmentEffectsModalProps> = ({ 
    onClose, 
    isTopmost, 
    mainOptionBonuses, 
    combatSubOptionBonuses, 
    specialStatBonuses, 
    aggregatedMythicStats 
}) => {
    const coreStatAbbreviations: Record<CoreStat, string> = {
        [CoreStat.Concentration]: '집중',
        [CoreStat.ThinkingSpeed]: '사고',
        [CoreStat.Judgment]: '판단',
        [CoreStat.Calculation]: '계산',
        [CoreStat.CombatPower]: '전투',
        [CoreStat.Stability]: '안정',
    };
    
    const specialStatAbbreviations: Record<SpecialStat, string> = {
        [SpecialStat.ActionPointMax]: '최대 AP',
        [SpecialStat.ActionPointRegen]: 'AP 회복',
        [SpecialStat.StrategyXpBonus]: '전략 XP',
        [SpecialStat.PlayfulXpBonus]: '놀이 XP',
        [SpecialStat.GoldBonus]: '골드 보상',
        [SpecialStat.ItemDropRate]: '장비 드랍',
        [SpecialStat.MaterialDropRate]: '재료 드랍',
    };

    return (
        <DraggableWindow title="장비 장착 효과" onClose={onClose} windowId="equipment-effects" initialWidth={600} isTopmost={isTopmost}>
            <div className="flex flex-col gap-4 p-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <StatSummaryPanel title="주옵션 합계" color="text-yellow-300">
                        {Object.values(CoreStat).map(stat => {
                            const bonus = mainOptionBonuses[stat];
                            const displayValue = bonus
                                ? `+${bonus.value.toFixed(bonus.isPercentage ? 1 : 0).replace(/\.0$/, '')}${bonus.isPercentage ? '%' : ''}`
                                : `+0`;
                            return (
                                 <div key={stat} className="flex justify-between items-baseline">
                                    <span className="text-gray-300">{coreStatAbbreviations[stat] || stat}</span>
                                    <span className={`font-mono font-semibold text-right ${!bonus ? 'text-gray-400' : ''}`}>
                                        {displayValue}
                                    </span>
                                </div>
                            );
                        })}
                    </StatSummaryPanel>
                    <StatSummaryPanel title="전투 부옵션 합계" color="text-blue-300">
                        {Object.values(CoreStat).map(stat => {
                            const bonus = combatSubOptionBonuses[stat];
                            const displayValue = bonus
                                ? `+${bonus.value.toFixed(bonus.isPercentage ? 1 : 0).replace(/\.0$/, '')}${bonus.isPercentage ? '%' : ''}`
                                : `+0`;
                            return (
                                <div key={stat} className="flex justify-between items-baseline">
                                    <span className="text-gray-300">{coreStatAbbreviations[stat] || stat}</span>
                                    <span className={`font-mono font-semibold text-right ${!bonus ? 'text-gray-400' : ''}`}>
                                        {displayValue}
                                    </span>
                                </div>
                            );
                        })}
                    </StatSummaryPanel>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <StatSummaryPanel title="특수 능력치 합계" color="text-green-300">
                        {Object.entries(specialStatBonuses).map(([stat, bonus]) => {
                            if (bonus.flat === 0 && bonus.percent === 0) return null;
                            const statEnum = stat as SpecialStat;
                            const statData = SPECIAL_STATS_DATA[statEnum];
                            if (!statData) return null; // 유효하지 않은 stat인 경우 무시
                            const name = statData.name;
                            const abbr = specialStatAbbreviations[statEnum] || stat;
                            return (
                                <div key={stat} className="flex justify-between items-baseline" title={name}>
                                    <span className="text-gray-300 truncate">{abbr}</span>
                                    <span className="font-mono font-semibold text-right text-green-300">
                                        {bonus.flat > 0 && `+${bonus.flat.toFixed(0)}`}
                                        {bonus.percent > 0 && (bonus.flat > 0 ? ', ' : '') + `+${bonus.percent.toFixed(1)}%`}
                                    </span>
                                </div>
                            )
                        })}
                    </StatSummaryPanel>
                    <StatSummaryPanel title="신화 능력치 합계" color="text-red-400">
                        {Object.entries(aggregatedMythicStats).map(([stat, data]) => {
                            if (data.count === 0) return null;
                            return (
                                <div key={stat} className="text-red-300 text-[10px] leading-tight">
                                    {formatMythicStat(stat as MythicStat, data)}
                                </div>
                            )
                        })}
                    </StatSummaryPanel>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default EquipmentEffectsModal;
