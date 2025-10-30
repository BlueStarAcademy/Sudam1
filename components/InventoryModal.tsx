import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UserWithStatus, InventoryItem, ServerAction, InventoryItemType, ItemGrade, ItemOption, CoreStat, SpecialStat, MythicStat, EquipmentSlot } from '../types.js';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import { emptySlotImages, ENHANCEMENT_COSTS, MATERIAL_ITEMS, GRADE_LEVEL_REQUIREMENTS, ITEM_SELL_PRICES, MATERIAL_SELL_PRICES } from '../constants.js';

interface InventoryModalProps {
    currentUser: UserWithStatus;
    onClose: () => void;
    onAction: (action: ServerAction) => void;
    onStartEnhance: (item: InventoryItem) => void;
    enhancementAnimationTarget: { itemId: string; stars: number } | null;
    onAnimationComplete: () => void;
    isTopmost?: boolean;
}

type Tab = 'all' | 'equipment' | 'consumable' | 'material';
type SortKey = 'createdAt' | 'type' | 'grade';

const MAX_SLOTS_PER_CATEGORY = 100;
const BASE_SLOTS_PER_CATEGORY = 30;
const EXPANSION_AMOUNT = 10;

const calculateExpansionCost = (currentCategorySlots: number): number => {
    const expansionsMade = Math.max(0, (currentCategorySlots - BASE_SLOTS_PER_CATEGORY) / EXPANSION_AMOUNT);
    return 100 + (expansionsMade * 20);
};

const gradeBackgrounds: Record<ItemGrade, string> = {
    normal: '/images/equipments/normalbgi.png',
    uncommon: '/images/equipments/uncommonbgi.png',
    rare: '/images/equipments/rarebgi.png',
    epic: '/images/equipments/epicbgi.png',
    legendary: '/images/equipments/legendarybgi.png',
    mythic: '/images/equipments/mythicbgi.png',
};

const gradeStyles: Record<ItemGrade, { name: string; color: string; }> = {
    normal: { name: '일반', color: 'text-gray-300' },
    uncommon: { name: '고급', color: 'text-green-400' },
    rare: { name: '희귀', color: 'text-blue-400' },
    epic: { name: '에픽', color: 'text-purple-400' },
    legendary: { name: '전설', color: 'text-red-500' },
    mythic: { name: '신화', color: 'text-orange-400' },
};

const gradeOrder: Record<ItemGrade, number> = {
    normal: 0,
    uncommon: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
    mythic: 5,
};

// ... (other helper components remain the same)

const EQUIPMENT_SLOTS: EquipmentSlot[] = ['fan', 'board', 'top', 'bottom', 'bowl', 'stones'];

const InventoryModal: React.FC<InventoryModalProps> = ({ currentUser, onClose, onAction, onStartEnhance, enhancementAnimationTarget, onAnimationComplete, isTopmost }) => {
    const { inventory, inventorySlots = { equipment: 30, consumable: 30, material: 30 } } = currentUser;
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('all');
    const [sortKey, setSortKey] = useState<SortKey>('createdAt');

    const renderStatComparison = useCallback((item1: InventoryItem, item2: InventoryItem | undefined) => {
        const getAllOptions = (item: InventoryItem | undefined): ItemOption[] => {
            if (!item || !item.options) return [];
            return [
                item.options.main,
                ...(item.options.combatSubs || []),
                ...(item.options.specialSubs || []),
                ...(item.options.mythicSubs || []),
            ].filter(Boolean) as ItemOption[];
        };

        const stats1 = getAllOptions(item1);
        const stats2 = getAllOptions(item2);

        const allStatTypes = Array.from(new Set([...stats1.map(s => s.type), ...stats2.map(s => s.type)]));

        return (
            <div className="text-xs mt-2 w-full">
                {allStatTypes.map(statType => {
                    const val1 = stats1.find(s => s.type === statType)?.value || 0;
                    const val2 = stats2.find(s => s.type === statType)?.value || 0;

                    let color = 'text-gray-300';
                    let indicator = '';
                    if (val1 > val2) {
                        color = 'text-green-400';
                        indicator = '▲';
                    } else if (val1 < val2) {
                        color = 'text-red-400';
                        indicator = '▼';
                    }

                    return (
                        <div key={statType} className="flex justify-between">
                            <span>{statType}:</span>
                            <span className={color}>{val1} {indicator}</span>
                        </div>
                    );
                })}
            </div>
        );
    }, []);

    const selectedItem = useMemo(() => {
        if (!selectedItemId) return null;
        return inventory.find(item => item.id === selectedItemId) || null;
    }, [selectedItemId, inventory]);

    const expansionCost = useMemo(() => {
        if (activeTab === 'all') return 0; // Or handle as an error/disabled state
        return calculateExpansionCost(inventorySlots[activeTab]);
    }, [activeTab, inventorySlots]);

    const handleExpand = () => {
        if (activeTab === 'all') return;
        if (window.confirm(`골드 ${expansionCost}개를 사용하여 ${activeTab} 가방을 ${EXPANSION_AMOUNT}칸 확장하시겠습니까?`)) {
            onAction({ type: 'EXPAND_INVENTORY', payload: { category: activeTab } });
        }
    };

    const filteredAndSortedInventory = useMemo(() => {
        let items = [...inventory];
        if (activeTab !== 'all') {
            items = items.filter((item: InventoryItem) => item.type === activeTab);
        }
        items.sort((a, b) => {
            if (sortKey === 'createdAt') return b.createdAt - a.createdAt;
            if (sortKey === 'grade') {
                const gradeA = gradeOrder[a.grade];
                const gradeB = gradeOrder[b.grade];
                if (gradeA !== gradeB) return gradeB - gradeA;
                return b.stars - a.stars;
            }
            if (sortKey === 'type') {
                const typeOrder: Record<InventoryItemType, number> = { equipment: 1, consumable: 2, material: 3 };
                return typeOrder[a.type] - typeOrder[b.type];
            }
            return 0;
        });
        return items;
    }, [inventory, activeTab, sortKey]);

    const currentSlots = useMemo(() => {
        const slots = inventorySlots || {};
        if (activeTab === 'all') {
            return (slots.equipment || BASE_SLOTS_PER_CATEGORY) + (slots.consumable || BASE_SLOTS_PER_CATEGORY) + (slots.material || BASE_SLOTS_PER_CATEGORY);
        } else {
            return slots[activeTab] || BASE_SLOTS_PER_CATEGORY;
        }
    }, [inventorySlots, activeTab]);
    
    const inventoryDisplayItems = filteredAndSortedInventory;
    
    const canExpand = useMemo(() => {
        return activeTab !== 'all' && inventorySlots[activeTab] < MAX_SLOTS_PER_CATEGORY;
    }, [activeTab, inventorySlots]);

    // ... (other functions remain the same)

    return (
        <DraggableWindow title="가방" onClose={onClose} windowId="inventory" initialWidth={950} isTopmost={isTopmost}>
            <div className="flex flex-col h-[calc(var(--vh,1vh)*85)]" style={{ '--item-size': '40px', '--gap-size': '4px' } as React.CSSProperties}>
                {/* Top Viewer Section */}
                <div className="flex-shrink-0 bg-gray-800 p-4 mb-2 rounded-md shadow-inner flex items-center justify-center h-64">
                    {/* ... */}
                </div>

                {/* Inventory Controls and Slots Section */}
                <div className="flex-grow flex flex-col h-0 min-h-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <h3 className="text-lg font-bold text-on-panel">인벤토리 ({filteredAndSortedInventory.length} / {currentSlots})</h3>
                             <div className="flex bg-tertiary/70 p-1 rounded-lg">
                                {(['all', 'equipment', 'consumable', 'material'] as Tab[]).map(tab => (
                                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${activeTab === tab ? 'bg-accent' : 'text-tertiary hover:bg-secondary/50'}`}>
                                        {tab === 'all' ? '전체' : tab === 'equipment' ? '장비' : tab === 'consumable' ? '소모품' : '재료'}
                                    </button>
                                ))}
                            </div>
                        </div>
                         <div className="flex items-center gap-2">
                             <span className="text-xs text-secondary">정렬:</span>
                            <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="bg-secondary border border-color text-xs rounded-md p-1 focus:ring-accent focus:border-accent">
                                <option value="createdAt">획득순</option>
                                <option value="grade">등급순</option>
                                <option value="type">종류순</option>
                            </select>
                         </div>
                    </div>
                    
                    <div className="grid grid-cols-10 gap-1 overflow-y-auto flex-grow h-0">

                        {Array.from({ length: currentSlots }).map((_, index) => {
                            const item = filteredAndSortedInventory[index];
                            const isLastSlot = index === currentSlots - 1;
                            const isMaxed = currentSlots >= MAX_SLOTS_PER_CATEGORY;

                            if (!item) {
                                return (
                                    <div
                                        key={`empty-${index}`}
                                        className="relative aspect-square rounded-md bg-tertiary/50 cursor-default"
                                    ></div>
                                );
                            }

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        setSelectedItemId(item.id);
                                    }}
                                    className={`relative aspect-square rounded-md transition-all duration-200 ${item ? 'hover:scale-105' : 'bg-tertiary/50'} cursor-pointer`}
                                >
                                    {item && (
                                        <>
                                            <div className={`absolute inset-0 rounded-md border-2 ${selectedItemId === item.id ? 'border-accent ring-2 ring-accent' : 'border-black/20'}`} />
                                            <img src={gradeBackgrounds[item.grade]} alt={item.grade} className="absolute inset-0 w-full h-full object-cover rounded-sm" />
                                            {item.image && <img src={item.image} alt={item.name} className="relative w-full h-full object-contain p-1" />}
                                            {item.isEquipped && <div className="absolute top-0.5 right-0.5 text-xs font-bold text-white bg-blue-600/80 px-1 rounded-bl-md">E</div>}
                                            {item.quantity && item.quantity > 1 && <span className="absolute bottom-0 right-0 text-xs font-bold text-white bg-black/60 px-1 rounded-tl-md">{item.quantity}</span>}
                                            
                                            {enhancementAnimationTarget?.itemId === item.id && <div className="absolute inset-0 animate-ping rounded-md bg-yellow-400/50"></div>}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                        {canExpand && activeTab !== 'all' && (
                            <div
                                key="expand-slot"
                                onClick={handleExpand}
                                className="relative aspect-square rounded-md bg-tertiary/50 cursor-pointer flex items-center justify-center text-accent text-4xl font-bold hover:bg-tertiary/70"
                            >
                                +
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end items-center mt-2 flex-shrink-0 text-sm">
                        {canExpand && activeTab !== 'all' && (
                            <Button onClick={handleExpand} colorScheme="blue" className="!text-xs !py-1" title={`비용: 💰 ${expansionCost}`}>
                                확장 (+{EXPANSION_AMOUNT})
                            </Button>
                        )}
                         {activeTab === 'all' && (
                            <p className="text-xs text-tertiary">각 탭에서 확장이 가능합니다.</p>
                        )}
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};
export default InventoryModal;
