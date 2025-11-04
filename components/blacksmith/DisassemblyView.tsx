import React, { useState, useMemo } from 'react';
import { UserWithStatus, InventoryItem, ServerAction, ItemGrade } from '../../types.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import Button from '../Button.js';
import DraggableWindow from '../DraggableWindow.js';
import { ENHANCEMENT_COSTS, MATERIAL_ITEMS, ITEM_SELL_PRICES } from '../../constants.js';

const calculateSellPrice = (item: InventoryItem): number => {
    if (item.type === 'equipment') {
        const basePrice = ITEM_SELL_PRICES[item.grade] || 0;
        const enhancementMultiplier = Math.pow(1.2, item.stars);
        return Math.floor(basePrice * enhancementMultiplier);
    }
    return 0;
};

const DisassemblyPreviewPanel: React.FC<{
    selectedIds: Set<string>;
    inventory: InventoryItem[];
}> = ({ selectedIds, inventory }) => {
    const { totalMaterials, totalSellPrice, itemCount } = useMemo(() => {
        const selectedItems = inventory.filter(item => selectedIds.has(item.id));
        const materials: Record<string, number> = {};
        let price = 0;

        for (const item of selectedItems) {
            price += calculateSellPrice(item);

            const enhancementIndex = Math.min(item.stars, 9);
            const costsForNextLevel = ENHANCEMENT_COSTS[item.grade]?.[enhancementIndex];
            if (costsForNextLevel) {
                for (const cost of costsForNextLevel) {
                    const yieldAmount = Math.floor(cost.amount * 0.25);
                    if (yieldAmount > 0) {
                        materials[cost.name] = (materials[cost.name] || 0) + yieldAmount;
                    }
                }
            }
        }
        
        return {
            totalMaterials: Object.entries(materials).map(([name, amount]) => ({ name, amount })),
            totalSellPrice: price,
            itemCount: selectedItems.length
        };
    }, [selectedIds, inventory]);

    return (
        <div className="w-full h-full bg-secondary/50 rounded-lg p-4 flex flex-col text-center">
            <h3 className="font-bold text-lg text-tertiary mb-2">분해 미리보기</h3>
            <p className="text-sm text-tertiary mb-4">선택된 아이템: {itemCount}개</p>
            <div className="flex-grow w-full bg-tertiary/30 p-3 rounded-md overflow-y-auto space-y-2">
                <h4 className="font-semibold text-highlight text-left border-b border-color pb-1">예상 획득 재료</h4>
                {totalMaterials.length > 0 ? (
                    totalMaterials.map(({ name, amount }) => {
                        const template = MATERIAL_ITEMS[name as keyof typeof MATERIAL_ITEMS];
                        return (
                            <div key={name} className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                    {template?.image && <img src={template.image} alt={name} className="w-6 h-6" />}
                                    {name}
                                </span>
                                <span className="font-mono text-primary">x {amount.toLocaleString()}</span>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-sm text-tertiary pt-4">획득할 재료가 없습니다.</p>
                )}
                 <p className="text-xs text-cyan-300 text-center pt-4">분해 시 30% 확률로 '대박'이 발생하여 모든 재료 획득량이 2배가 됩니다!</p>
            </div>
            <div className="mt-4 text-sm text-tertiary">
                <p>선택 아이템 판매 시: <span className="font-bold text-yellow-300">{totalSellPrice.toLocaleString()} 골드</span></p>
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
        <DraggableWindow title="분해 자동 선택" onClose={onClose} windowId="disassembly-auto-select" initialWidth={400} isTopmost>
            <div className="text-on-panel">
                <p className="text-sm text-tertiary mb-4 text-center">분해할 장비 등급을 선택하세요. 신화 등급은 제외됩니다.</p>
                <div className="grid grid-cols-2 gap-3">
                    {GRADES_FOR_SELECTION.map(grade => {
                        return (
                            <label key={grade} className="flex items-center gap-3 p-3 bg-tertiary/50 rounded-lg cursor-pointer border-2 border-transparent has-[:checked]:border-accent">
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
                <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-color">
                    <Button onClick={onClose} colorScheme="gray">취소</Button>
                    <Button onClick={handleConfirmClick} colorScheme="blue">선택 완료</Button>
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

        const hasHighGrade = Array.from(selectedForDisassembly).some(itemId => {
            const item = inventory.find((i: InventoryItem) => i.id === itemId);
            return item && (item.grade === 'legendary' || item.grade === 'mythic');
        });
    
        if (hasHighGrade) {
            if (!window.confirm("높은 등급의 장비가 포함되어 있습니다. 그래도 분해하시겠습니까?")) {
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
        const itemsToSelect = inventory.filter(item =>
            item.type === 'equipment' &&
            !item.isEquipped &&
            grades.includes(item.grade)
        ).map(item => item.id);

        itemsToSelect.forEach(id => onToggleDisassemblySelection(id)); // Use the prop function

        setIsAutoSelectOpen(false);
    };

    return (
        <div className="h-full flex flex-col">
            {isAutoSelectOpen && (
                <AutoSelectModal
                    onClose={() => setIsAutoSelectOpen(false)}
                    onConfirm={handleAutoSelectConfirm}
                />
            )}
            <div className="flex-grow">
                <DisassemblyPreviewPanel selectedIds={selectedForDisassembly} inventory={inventory} />
            </div>
            <div className="flex-shrink-0 border-t border-color py-3 px-2 my-2 flex flex-wrap justify-center items-center gap-2">
                <Button onClick={() => setIsAutoSelectOpen(true)} colorScheme="blue">자동 선택</Button>
                <Button onClick={handleDisassemble} colorScheme="red" disabled={selectedForDisassembly.size === 0}>
                    선택 아이템 분해 ({selectedForDisassembly.size})
                </Button>
            </div>
        </div>
    );
};

export default DisassemblyView;
