
import React, { useState, useMemo } from 'react';
import { InventoryItem, ServerAction, ItemGrade, EquipmentSlot, UserWithStatus } from '../../types.js';
import Button from '../Button.js';
import { BLACKSMITH_COMBINATION_GREAT_SUCCESS_RATES } from '../../constants/rules.js';

const gradeStyles: Record<ItemGrade, { name: string; color: string; background: string; }> = {
    normal: { name: '일반', color: 'text-gray-300', background: '/images/equipments/normalbgi.png' },
    uncommon: { name: '고급', color: 'text-green-400', background: '/images/equipments/uncommonbgi.png' },
    rare: { name: '희귀', color: 'text-blue-400', background: '/images/equipments/rarebgi.png' },
    epic: { name: '에픽', color: 'text-purple-400', background: '/images/equipments/epicbgi.png' },
    legendary: { name: '전설', color: 'text-red-500', background: '/images/equipments/legendarybgi.png' },
    mythic: { name: '신화', color: 'text-orange-400', background: '/images/equipments/mythicbgi.png' },
};

const ALL_SLOTS: EquipmentSlot[] = ['fan', 'board', 'top', 'bottom', 'bowl', 'stones'];
const SLOT_NAMES_KO: Record<EquipmentSlot, string> = {
    fan: '부채',
    board: '바둑판',
    top: '상의',
    bottom: '하의',
    bowl: '바둑통',
    stones: '바둑돌',
};

const ItemSlot: React.FC<{ item: InventoryItem | null; onRemove: () => void; }> = ({ item, onRemove }) => {
    if (!item) {
        return (
            <div className="w-1/3 h-32 border-2 border-dashed border-gray-500 rounded-lg flex items-center justify-center bg-black/20">
                <span className="text-gray-400">재료</span>
            </div>
        );
    }

    const styles = gradeStyles[item.grade];

    return (
        <div className="w-1/3 h-32 rounded-lg bg-black/20 p-2 flex flex-col items-center justify-center text-center relative">
            <button onClick={onRemove} className="absolute top-1 right-1 text-red-500 hover:text-red-400 z-10">
                &times;
            </button>
            <div className="relative w-16 h-16 rounded-lg flex-shrink-0">
                <img src={styles.background} alt={item.grade} className="absolute inset-0 w-full h-full object-cover rounded-lg" />
                {item.image && <img src={item.image} alt={item.name} className="relative w-full h-full object-contain p-1"/>}
            </div>
            <p className={`text-sm font-bold ${styles.color} truncate w-full`}>{item.name}</p>
            <p className="text-xs text-gray-400">{SLOT_NAMES_KO[item.slot!] || '기타'}</p>
        </div>
    );
};

const OutcomeProbability: React.FC<{ items: (InventoryItem | null)[], isRandom: boolean }> = ({ items, isRandom }) => {
    const probabilities = useMemo(() => {
        const validItems = items.filter((i): i is InventoryItem => i !== null);
        if (validItems.length !== 3) return [];

        const probs = new Map<EquipmentSlot, number>();

        if (isRandom) {
            const prob = 1 / ALL_SLOTS.length;
            for (const slot of ALL_SLOTS) {
                probs.set(slot, prob);
            }
        } else {
            const slotCounts = new Map<EquipmentSlot, number>();
            for (const item of validItems) {
                if (item.slot) {
                    slotCounts.set(item.slot, (slotCounts.get(item.slot) || 0) + 1);
                }
            }
            for (const [slot, count] of slotCounts.entries()) {
                probs.set(slot, count / 3);
            }
        }
        return Array.from(probs.entries()).sort((a, b) => b[1] - a[1]);
    }, [items, isRandom]);

    if (probabilities.length === 0) return null;

    return (
        <div className="w-full bg-black/20 p-3 rounded-lg mt-4">
            <h4 className="font-semibold text-center mb-2">결과물 종류 확률</h4>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
                {probabilities.map(([slot, prob]) => (
                    <div key={slot} className="flex justify-between">
                        <span className="text-gray-400">{SLOT_NAMES_KO[slot]}:</span>
                        <span className="font-bold text-white">{(prob * 100).toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

const GradeProbability: React.FC<{ items: (InventoryItem | null)[], currentUser: UserWithStatus }> = ({ items, currentUser }) => {
    const { blacksmithLevel } = currentUser;
    const probabilities = useMemo(() => {
        const validItems = items.filter((i): i is InventoryItem => i !== null);
        if (validItems.length !== 3 || new Set(validItems.map(i => i.grade)).size !== 1) return null;

        const grade = validItems[0].grade;
        const levelIndex = (blacksmithLevel ?? 1) - 1;
        const greatSuccessRate = BLACKSMITH_COMBINATION_GREAT_SUCCESS_RATES[levelIndex]?.[grade] ?? 0;
        const successRate = 100 - greatSuccessRate;

        return { successRate, greatSuccessRate };
    }, [items, blacksmithLevel]);

    if (!probabilities) return null;

    return (
        <div className="w-full bg-black/20 p-3 rounded-lg mt-2">
            <h4 className="font-semibold text-center mb-2">결과물 등급 확률</h4>
            <div className="grid grid-cols-2 gap-x-4 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-400">성공:</span>
                    <span className="font-bold text-white">{probabilities.successRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-yellow-400">대성공:</span>
                    <span className="font-bold text-yellow-300">{probabilities.greatSuccessRate.toFixed(1)}%</span>
                </div>
            </div>
        </div>
    );
}

interface CombinationViewProps {
    items: (InventoryItem | null)[];
    onRemoveItem: (index: number) => void;
    onAction: (action: ServerAction) => Promise<void>;
    currentUser: UserWithStatus;
}

const CombinationView: React.FC<CombinationViewProps> = ({ items, onRemoveItem, onAction, currentUser }) => {
    const [isRandom, setIsRandom] = useState(false);

    const handleCombine = () => {
        const itemIds = items.map(i => i?.id).filter((id): id is string => !!id);
        if (itemIds.length === 3) {
            onAction({ type: 'COMBINE_ITEMS', payload: { itemIds, isRandom } });
        }
    };
    
    const canCombine = items.every(item => item !== null) && new Set(items.map(i => i?.grade)).size === 1;

    return (
        <div className="h-full flex flex-col items-center justify-between">
            <div className="w-full flex justify-around items-stretch gap-2">
                {items.map((item, index) => (
                    <ItemSlot key={index} item={item} onRemove={() => onRemoveItem(index)} />
                ))}
            </div>

            <div className="w-full">
                <OutcomeProbability items={items} isRandom={isRandom} />
                <GradeProbability items={items} currentUser={currentUser} />
            </div>

            <div className="w-full space-y-4 mt-4">
                <div className="flex items-center justify-center">
                    <input 
                        type="checkbox" 
                        id="random-combine" 
                        checked={isRandom} 
                        onChange={(e) => setIsRandom(e.target.checked)} 
                        className="h-4 w-4 rounded text-accent bg-gray-700 border-gray-600 focus:ring-accent"
                    />
                    <label htmlFor="random-combine" className="ml-2 text-sm text-gray-300">완전 랜덤 종류로 받기</label>
                </div>

                <Button onClick={handleCombine} disabled={!canCombine} colorScheme="blue" className="w-full">
                    합성
                </Button>
            </div>
        </div>
    );
};

export default CombinationView;
