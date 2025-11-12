import React, { useState, useMemo } from 'react';
import { UserWithStatus, InventoryItem, ServerAction, ItemGrade } from '../../types.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import ResourceActionButton from '../ui/ResourceActionButton.js';
import DraggableWindow from '../DraggableWindow.js';
import { ENHANCEMENT_COSTS, MATERIAL_ITEMS } from '../../constants';
import { BLACKSMITH_DISASSEMBLY_JACKPOT_RATES } from '../../constants/rules';

const DisassemblyPreviewPanel: React.FC<{
    selectedIds: Set<string>;
    inventory: InventoryItem[];
    blacksmithLevel: number;
}> = ({ selectedIds, inventory, blacksmithLevel }) => {
    const { rangeMap, totalMaterials, itemCount } = useMemo(() => {
        const selectedItems = inventory.filter(item => selectedIds.has(item.id));
        const materials: Record<string, number> = {};
        const ranges: Record<string, { min: number; max: number }> = {};

        for (const item of selectedItems) {
            const enhancementIndex = Math.min(item.stars, 9);
            const costsForNextLevel = ENHANCEMENT_COSTS[item.grade]?.[enhancementIndex];
            if (costsForNextLevel) {
                for (const cost of costsForNextLevel) {
                    const minYield = Math.max(1, Math.floor(cost.amount * 0.20));
                    const maxYield = Math.max(minYield, Math.floor(cost.amount * 0.50));

                    if (!ranges[cost.name]) {
                        ranges[cost.name] = { min: 0, max: 0 };
                    }

                    ranges[cost.name].min += minYield;
                    ranges[cost.name].max += maxYield;
                }
            }
        }

        Object.entries(ranges).forEach(([name, value]) => {
            const minYield = Math.trunc(value.min);
            const maxYield = Math.trunc(value.max);
            const avgYield = Math.max(minYield, Math.round((minYield + maxYield) / 2));
            materials[name] = avgYield;
            ranges[name] = { min: minYield, max: maxYield };
        });

        return {
            rangeMap: ranges,
            totalMaterials: Object.entries(materials).map(([name, amount]) => ({ name, amount })),
            itemCount: selectedItems.length
        };
    }, [selectedIds, inventory]);

    return (
        <div className="w-full h-full bg-gradient-to-br from-[#1d243b] via-[#121a2d] to-[#0b1120] border border-cyan-300/20 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="text-left">
                    <p className="text-xs text-slate-300/80">선택된 장비</p>
                    <p className="text-lg font-semibold text-cyan-200">{itemCount.toLocaleString()}개</p>
                </div>
                <div className="text-right text-xs text-emerald-200/80">
                    평균 환급 재료
                </div>
            </div>

            <div className="rounded-xl border border-slate-600/30 bg-[#0f1627] p-4 shadow-inner flex-1 flex flex-col gap-3">
                {totalMaterials.length > 0 ? (
                    <div className="space-y-3">
                        {totalMaterials.map(({ name }) => {
                            const template = MATERIAL_ITEMS[name as keyof typeof MATERIAL_ITEMS];
                            const range = rangeMap[name];
                            return (
                                <div
                                    key={name}
                                    className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg bg-slate-800/40 border border-slate-600/30"
                                >
                                    <div className="flex items-center gap-3 text-sm text-slate-100">
                                        <div className="w-8 h-8 rounded-lg bg-slate-900/50 border border-slate-600/40 overflow-hidden flex items-center justify-center">
                                            {template?.image && <img src={template.image} alt={name} className="w-6 h-6 object-contain" />}
                                        </div>
                                        <span>{name}</span>
                                    </div>
                                    <span className="font-mono text-emerald-300 text-sm">
                                        {range ? `${range.min.toLocaleString()} ~ ${range.max.toLocaleString()}` : '0'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
                        분해 시 획득할 재료가 없습니다.
                    </div>
                )}
            </div>

            <div className="text-[11px] text-cyan-200/85 text-center bg-[#0f172a] border border-cyan-300/20 rounded-xl py-2 px-3">
                분해 시 <span className="text-emerald-300 font-semibold">{BLACKSMITH_DISASSEMBLY_JACKPOT_RATES[Math.max(0, blacksmithLevel - 1)]}%</span> 확률로
                <span className="text-amber-200 font-semibold"> '대박'</span>이 발생하여 모든 재료 획득량이 2배가 됩니다.
            </div>
        </div>
    );
};

const GRADES_FOR_SELECTION: ItemGrade[] = ['normal', 'uncommon', 'rare', 'epic', 'legendary'];

const GRADE_NAMES_KO: Record<ItemGrade, string> = {
    normal: '일반',
    uncommon: '고급',
    rare: '희귀',
    epic: '에픽',
    legendary: '전설',
    mythic: '신화',
};

const AutoSelectModal: React.FC<{ onClose: () => void; onConfirm: (selectedGrades: ItemGrade[]) => void; }> = ({ onClose, onConfirm }) => {
    const [selectedGrades, setSelectedGrades] = useState<ItemGrade[]>([]);

    const handleToggleGrade = (grade: ItemGrade) => {
        setSelectedGrades(prev =>
            prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
        );
    };

    const handleConfirmClick = () => {
        onConfirm(selectedGrades);
        onClose();
    };

    return (
        <DraggableWindow title="분해 자동 선택" onClose={onClose} windowId="disassembly-auto-select" initialWidth={400} isTopmost variant="store">
            <div className="text-on-panel">
                <p className="text-sm text-tertiary mb-4 text-center">분해할 장비 등급을 선택하세요. 신화 등급은 제외됩니다.</p>
                <div className="grid grid-cols-2 gap-3">
                    {GRADES_FOR_SELECTION.map(grade => {
                        return (
                            <label key={grade} className="flex items-center gap-3 p-3 bg-gradient-to-br from-[#1b243c] via-[#161f33] to-[#0f1626] rounded-lg cursor-pointer border border-slate-500/30 shadow-inner has-[:checked]:border-cyan-300/80">
                                <input
                                    type="checkbox"
                                    checked={selectedGrades.includes(grade)}
                                    onChange={() => handleToggleGrade(grade)}
                                    className="w-5 h-5 text-accent bg-secondary border-color rounded focus:ring-accent"
                                />
                                <span className={`font-semibold`}>{GRADE_NAMES_KO[grade]}</span>
                            </label>
                        );
                    })}
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-500/40">
                    <ResourceActionButton onClick={onClose} variant="neutral" className="!w-auto !px-5 !py-2 text-sm">
                        취소
                    </ResourceActionButton>
                    <ResourceActionButton onClick={handleConfirmClick} variant="accent" className="!w-auto !px-5 !py-2 text-sm" disabled={selectedGrades.length === 0}>
                        선택 완료
                    </ResourceActionButton>
                </div>
            </div>
        </DraggableWindow>
    );
};

interface DisassemblyViewProps {
    onAction: (action: ServerAction) => Promise<void>;
    selectedForDisassembly: Set<string>;
    onToggleDisassemblySelection: (itemId: string) => void;
}

const DisassemblyView: React.FC<DisassemblyViewProps> = ({ onAction, selectedForDisassembly = new Set(), onToggleDisassemblySelection }) => { // Added default value
    const { currentUserWithStatus } = useAppContext();
    const [isAutoSelectOpen, setIsAutoSelectOpen] = useState(false);

    if (!currentUserWithStatus) return null;

    const { inventory } = currentUserWithStatus;

    const handleDisassemble = () => {
        if (selectedForDisassembly.size === 0) return;

        const selectedItems = Array.from(selectedForDisassembly)
            .map(itemId => inventory.find((i: InventoryItem) => i.id === itemId))
            .filter((item): item is InventoryItem => item !== undefined);

        const hasHighGrade = selectedItems.some(item => 
            item.grade === 'legendary' || item.grade === 'mythic'
        );
        
        const hasHighStars = selectedItems.some(item => 
            (item.stars || 0) >= 7
        );
    
        if (hasHighGrade || hasHighStars) {
            const reasons: string[] = [];
            if (hasHighGrade) reasons.push('전설 등급 이상의 장비');
            if (hasHighStars) reasons.push('7강화 이상의 장비');
            
            if (!window.confirm(`${reasons.join(', ')}가 포함되어 있습니다. 정말 분해하시겠습니까?`)) {
                return;
            }
        }

        if (window.confirm(`${selectedForDisassembly.size}개의 아이템을 분해하시겠습니까?`)) {
            onAction({ type: 'DISASSEMBLE_ITEM', payload: { itemIds: Array.from(selectedForDisassembly) } });
            // No need to clear selectedForDisassembly here, as it's managed by BlacksmithModal
            // and will be cleared when the action is processed and state updates.
        }
    };

    const handleAutoSelectConfirm = (grades: ItemGrade[]) => {
        // 프리셋에 등록된 장비 ID 수집
        const presetItemIds = new Set<string>();
        if (currentUserWithStatus.equipmentPresets) {
            currentUserWithStatus.equipmentPresets.forEach(preset => {
                if (preset.equipment) {
                    Object.values(preset.equipment).forEach(itemId => {
                        if (itemId) presetItemIds.add(itemId);
                    });
                }
            });
        }

        const itemsToSelect = inventory.filter(item =>
            item.type === 'equipment' &&
            !item.isEquipped &&
            !presetItemIds.has(item.id) &&
            grades.includes(item.grade)
        ).map(item => item.id);

        itemsToSelect.forEach(id => onToggleDisassemblySelection(id)); // Use the prop function

        setIsAutoSelectOpen(false);
    };

    return (
        <div className="h-full flex flex-col min-h-0">
            {isAutoSelectOpen && (
                <AutoSelectModal
                    onClose={() => setIsAutoSelectOpen(false)}
                    onConfirm={handleAutoSelectConfirm}
                />
            )}
            <div className="flex-1 min-h-0">
                <DisassemblyPreviewPanel 
                    selectedIds={selectedForDisassembly} 
                    inventory={inventory} 
                    blacksmithLevel={currentUserWithStatus.blacksmithLevel ?? 1}
                />
            </div>
            <div className="flex-shrink-0 mt-3 px-2">
                <div className="flex items-center justify-between gap-3 bg-[#111a2f] border border-cyan-300/20 rounded-xl px-4 py-3">
                    <ResourceActionButton
                        onClick={() => setIsAutoSelectOpen(true)}
                        variant="accent"
                        className="!w-auto !px-5 !py-2 text-sm"
                    >
                        자동 선택
                    </ResourceActionButton>
                    <ResourceActionButton
                        onClick={handleDisassemble}
                        disabled={selectedForDisassembly.size === 0}
                        variant="materials"
                        className="!w-auto !px-5 !py-2 text-sm whitespace-nowrap"
                    >
                        선택 아이템 분해 ({selectedForDisassembly.size})
                    </ResourceActionButton>
                </div>
            </div>
        </div>
    );
};

export default DisassemblyView;
