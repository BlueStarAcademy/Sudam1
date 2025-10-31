import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { UserWithStatus, InventoryItem, ServerAction, InventoryItemType, ItemGrade, ItemOption, CoreStat, SpecialStat, MythicStat, EquipmentSlot, ItemOptionType } from '../types.js';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import { emptySlotImages, GRADE_LEVEL_REQUIREMENTS, ITEM_SELL_PRICES, MATERIAL_SELL_PRICES, gradeBackgrounds, gradeStyles } from '../constants/items.js';
import { calculateUserEffects } from '../services/effectService.js';
import { useAppContext } from '../hooks/useAppContext.js';

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

const MAX_EQUIPMENT_SLOTS = 100;
const MAX_CONSUMABLE_SLOTS = 50;
const MAX_MATERIAL_SLOTS = 50;
const BASE_SLOTS_PER_CATEGORY = 30;
const EXPANSION_AMOUNT = 10;

const calculateExpansionCost = (currentCategorySlots: number): number => {
    const expansionsMade = Math.max(0, (currentCategorySlots - BASE_SLOTS_PER_CATEGORY) / EXPANSION_AMOUNT);
    return 100 + (expansionsMade * 20);
};

const gradeOrder: Record<ItemGrade, number> = {
    normal: 0,
    uncommon: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
    mythic: 5,
};

const getStarDisplayInfo = (stars: number) => {
    if (stars >= 10) {
        return { text: `(★${stars})`, colorClass: "prism-text-effect" };
    } else if (stars >= 7) {
        return { text: `(★${stars})`, colorClass: "text-purple-400" };
    } else if (stars >= 4) {
        return { text: `(★${stars})`, colorClass: "text-amber-400" };
    } else if (stars >= 1) {
        return { text: `(★${stars})`, colorClass: "text-white" };
    }
    return { text: "", colorClass: "text-white" };
};

const EquipmentSlotDisplay: React.FC<{ slot: EquipmentSlot; item?: InventoryItem; }> = ({ slot, item }) => {
    if (item) {
        return (
            <div
                className={`relative w-full aspect-square rounded-lg border-2 border-color/50 bg-tertiary/50`}
                title={item.name}
            >
                <img src={gradeBackgrounds[item.grade]} alt={item.grade} className="absolute inset-0 w-full h-full object-cover rounded-md" />
                {item.image && <img src={item.image} alt={item.name} className="relative w-full h-full object-contain p-1.5"/>}
            </div>
        );
    } else {
         return (
             <img src={emptySlotImages[slot]} alt={`${slot} empty slot`} className="w-full aspect-square rounded-lg bg-tertiary/50 border-2 border-color/50" />
        );
    }
};

const EQUIPMENT_SLOTS: EquipmentSlot[] = ['fan', 'board', 'top', 'bottom', 'bowl', 'stones'];

const InventoryModal: React.FC<InventoryModalProps> = ({ currentUser, onClose, onAction, onStartEnhance, enhancementAnimationTarget, onAnimationComplete, isTopmost }) => {
    const { presets, setPresets, handlers } = useAppContext();

    const { inventorySlots = { equipment: 30, consumable: 10, material: 10 } } = currentUser;
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('all');
    const [sortKey, setSortKey] = useState<SortKey>('createdAt');
    const [selectedPreset, setSelectedPreset] = useState(0);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');

    const handlePresetChange = (presetIndex: number) => {
        setSelectedPreset(presetIndex);
        const preset = presets[presetIndex];
        if (preset) {
            handlers.applyPreset(preset);
        }
    };

    const selectedItem = useMemo(() => {
        if (!selectedItemId) return null;
        return currentUser.inventory.find(item => item.id === selectedItemId) || null;
    }, [selectedItemId, currentUser.inventory]);

    const expansionCost = useMemo(() => {
        if (activeTab === 'all') return 0;
        return calculateExpansionCost(inventorySlots[activeTab]);
    }, [activeTab, inventorySlots]);

    const { coreStatBonuses } = useMemo(() => calculateUserEffects(currentUser), [currentUser]);

    const handleExpand = () => {
        if (activeTab === 'all') return;
        if (window.confirm(`다이아 ${expansionCost}개를 사용하여 ${activeTab} 가방을 ${EXPANSION_AMOUNT}칸 확장하시겠습니까?`)) {
            onAction({ type: 'EXPAND_INVENTORY', payload: { category: activeTab } });
        }
    };

    const handleOpenRenameModal = () => {
        setNewPresetName(presets[selectedPreset].name);
        setIsRenameModalOpen(true);
    };

    const handleSavePreset = () => {
        const updatedPresets = [...presets];
        updatedPresets[selectedPreset].name = newPresetName;
        updatedPresets[selectedPreset].equipment = currentUser.equipment;

        setPresets(updatedPresets);
        setIsRenameModalOpen(false);
        alert('프리셋이 저장되었습니다.');
    };

    const handleEquipToggle = (itemId: string) => {
        const item = currentUser.inventory.find(i => i.id === itemId);
        if (!item) return;

        if (!item.isEquipped) {
            const requiredLevel = GRADE_LEVEL_REQUIREMENTS[item.grade];
            const userLevelSum = currentUser.strategyLevel + currentUser.playfulLevel;
            if (userLevelSum < requiredLevel) {
                alert(`착용 레벨 합이 부족합니다. (필요: ${requiredLevel}, 현재: ${userLevelSum})`);
                return;
            }
        }

        onAction({ type: 'TOGGLE_EQUIP_ITEM', payload: { itemId } });
    };

    const filteredAndSortedInventory = useMemo(() => {
        let items = [...currentUser.inventory];
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
    }, [currentUser.inventory, activeTab, sortKey]);

    const currentSlots = useMemo(() => {
        const slots = inventorySlots || {};
        if (activeTab === 'all') {
            return (slots.equipment || BASE_SLOTS_PER_CATEGORY) + (slots.consumable || BASE_SLOTS_PER_CATEGORY) + (slots.material || BASE_SLOTS_PER_CATEGORY);
        } else {
            return slots[activeTab] || BASE_SLOTS_PER_CATEGORY;
        }
    }, [inventorySlots, activeTab]);
    
    const maxSlotsForCurrentTab = useMemo(() => {
        let maxSlots = MAX_EQUIPMENT_SLOTS;
        if (activeTab === 'consumable') maxSlots = MAX_CONSUMABLE_SLOTS;
        else if (activeTab === 'material') maxSlots = MAX_MATERIAL_SLOTS;
        return maxSlots;
    }, [activeTab]);

    const canExpand = useMemo(() => {
        if (activeTab === 'all') return false;
        return inventorySlots[activeTab] < maxSlotsForCurrentTab;
    }, [activeTab, inventorySlots, maxSlotsForCurrentTab]);

    const getItemForSlot = useCallback((slot: EquipmentSlot) => {
        const itemId = currentUser.equipment[slot];
        if (!itemId) return undefined;
        return currentUser.inventory.find(item => item.id === itemId);
    }, [currentUser.equipment, currentUser.inventory]);

    const correspondingEquippedItem = useMemo(() => {
        if (!selectedItem || !selectedItem.slot) return null;
        return getItemForSlot(selectedItem.slot);
    }, [selectedItem, getItemForSlot]);

    return (
        <DraggableWindow title="가방" onClose={onClose} windowId="inventory" initialWidth={1200} isTopmost={isTopmost}>
            <div className="flex flex-col h-full">
                <div className="h-96 bg-gray-800 p-4 mb-2 rounded-md shadow-inner flex">
                    <div className="w-1/4 pr-4 border-r border-gray-700">
                        <h3 className="text-lg font-bold text-on-panel mb-2">장착 장비</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {EQUIPMENT_SLOTS.map(slot => (
                                <div key={slot} className="w-full">
                                    <EquipmentSlotDisplay slot={slot} item={getItemForSlot(slot)} />
                                </div>
                            ))}
                        </div>
                        <div className="mt-4">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
                                {Object.values(CoreStat).map(stat => {
                                    const baseValue = (currentUser.baseStats[stat] || 0) + (currentUser.spentStatPoints?.[stat] || 0);
                                    const bonus = Math.floor(baseValue * (coreStatBonuses[stat].percent / 100)) + coreStatBonuses[stat].flat;
                                    const finalValue = baseValue + bonus;
                                    return (
                                        <div key={stat} className="bg-tertiary/40 p-1 rounded-md flex items-center justify-between text-xs">
                                            <span className="font-semibold text-secondary whitespace-nowrap">{stat}</span>
                                            <span className="font-mono font-bold whitespace-nowrap" title={`기본: ${baseValue}, 장비: ${bonus}`}>
                                                {finalValue}
                                                {bonus > 0 && <span className="text-green-400 text-xs ml-0.5">(+{bonus})</span>}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedPreset}
                                    onChange={e => handlePresetChange(Number(e.target.value))}
                                    className="bg-secondary border border-color text-xs rounded-md p-1 focus:ring-accent focus:border-accent flex-grow"
                                >
                                    {presets.map((preset, index) => (
                                        <option key={index} value={index}>{preset.name}</option>
                                    ))}
                                </select>
                                <Button onClick={handleOpenRenameModal} colorScheme="blue" className="!text-xs !py-1">
                                    저장
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="flex-grow px-4 border-r border-gray-700 relative">
                        <h3 className="text-lg font-bold text-on-panel mb-2">현재 장비</h3>
                        <ItemDetailDisplay item={correspondingEquippedItem} title="장착된 아이템 없음" comparisonItem={selectedItem} gradeStyles={gradeStyles} />
                        {correspondingEquippedItem && (
                            <Button onClick={() => handleEquipToggle(correspondingEquippedItem.id)} colorScheme="red" className="absolute bottom-2 right-2">
                                장비 해제
                            </Button>
                        )}
                    </div>
                    <div className="flex-grow pl-4 relative">
                        <h3 className="text-lg font-bold text-on-panel mb-2">선택 장비</h3>
                        <ItemDetailDisplay item={selectedItem} title="선택된 아이템 없음" comparisonItem={correspondingEquippedItem} gradeStyles={gradeStyles} />
                        {selectedItem && (
                            <Button onClick={() => handleEquipToggle(selectedItem.id)} colorScheme={selectedItem.isEquipped ? "red" : "green"} className="absolute bottom-2 right-2">
                                {selectedItem.isEquipped ? '해제' : '장착'}
                            </Button>
                        )}
                    </div>
                </div>
                <div className="flex-grow flex-shrink-0 bg-gray-900 p-4 rounded-b-md overflow-y-auto">
                    <div className="flex-shrink-0 p-2 bg-gray-900/50 rounded-md mb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Button onClick={() => setActiveTab('all')} colorScheme={activeTab === 'all' ? 'blue' : 'gray'} className="!text-xs !py-1 !px-2">전체</Button>
                                <Button onClick={() => setActiveTab('equipment')} colorScheme={activeTab === 'equipment' ? 'blue' : 'gray'} className="!text-xs !py-1 !px-2">장비</Button>
                                <Button onClick={() => setActiveTab('consumable')} colorScheme={activeTab === 'consumable' ? 'blue' : 'gray'} className="!text-xs !py-1 !px-2">소모품</Button>
                                <Button onClick={() => setActiveTab('material')} colorScheme={activeTab === 'material' ? 'blue' : 'gray'} className="!text-xs !py-1 !px-2">재료</Button>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-sm">정렬:</span>
                                <select onChange={(e) => setSortKey(e.target.value as SortKey)} value={sortKey} className="bg-gray-700 text-white text-sm rounded-md p-1">
                                    <option value="createdAt">최신순</option>
                                    <option value="grade">등급순</option>
                                    <option value="type">종류순</option>
                                </select>
                                <div className="text-sm text-gray-400">
                                    {`${filteredAndSortedInventory.length} / ${currentSlots}`}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-y-auto pr-2" style={{ height: '116px' }}>
                        <div className="grid grid-cols-10 gap-2">
                        {filteredAndSortedInventory.map(item => (
                            <InventoryItemCard
                                key={item.id}
                                item={item}
                                onClick={() => setSelectedItemId(item.id)}
                                isSelected={selectedItemId === item.id}
                                isEquipped={item.isEquipped || false}
                                enhancementStars={enhancementAnimationTarget?.itemId === item.id ? enhancementAnimationTarget.stars : undefined}
                            />
                        ))}
                        {Array.from({ length: Math.max(0, currentSlots - filteredAndSortedInventory.length) }).map((_, index) => (
                            <div key={`empty-${index}`} className="w-full aspect-square rounded-lg bg-gray-800/50 border-2 border-gray-700/50" />
                        ))}
                    </div>
                    </div>
                    {activeTab !== 'all' && canExpand && (
                        <div className="pt-2 mt-2 border-t border-gray-700">
                            <Button onClick={handleExpand} colorScheme="green" className="w-full">
                                {`${activeTab} 가방 확장 (${expansionCost} 다이아)`}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </DraggableWindow>
    );
};

const InventoryItemCard: React.FC<{
    item: InventoryItem;
    onClick: () => void;
    isSelected: boolean;
    isEquipped: boolean;
    enhancementStars: number | undefined;
}> = ({ item, onClick, isSelected, isEquipped, enhancementStars }) => {
    const starInfo = getStarDisplayInfo(enhancementStars || item.stars || 0);

    return (
        <div
            onClick={onClick}
            className={`relative w-full aspect-square rounded-lg cursor-pointer transition-all duration-200 ${isSelected ? 'ring-2 ring-accent' : 'ring-1 ring-transparent'} hover:ring-2 hover:ring-accent/70`}
            title={item.name}
        >
            <img src={gradeBackgrounds[item.grade]} alt={item.grade} className="absolute inset-0 w-full h-full object-cover rounded-md" />
            {item.image && <img src={item.image} alt={item.name} className="relative w-full h-full object-contain p-1.5" />}
            {isEquipped && (
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-green-500 text-white text-xs flex items-center justify-center rounded-full border-2 border-gray-800">
                    E
                </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 text-center text-xs font-bold text-white bg-black/50 py-0.5">
                <span className={starInfo.colorClass}>{starInfo.text}</span>
            </div>
        </div>
    );
};

const ItemDetailDisplay: React.FC<{
    item: InventoryItem | null | undefined;
    title: string;
    comparisonItem?: InventoryItem | null;
    gradeStyles: Record<ItemGrade, { name: string; color: string; background: string; }>;
}> = ({ item, title, comparisonItem, gradeStyles }) => {
    if (!item) {
        return <div className="h-full flex items-center justify-center text-tertiary">{title}</div>;
    }

    const renderStarDisplay = (stars: number) => {
        if (stars === 0) return null;

        let starImage = '';
        let numberColor = '';

        if (stars >= 10) {
            starImage = '/images/equipments/Star4.png';
            numberColor = "prism-text-effect";
        } else if (stars >= 7) {
            starImage = '/images/equipments/Star3.png';
            numberColor = "text-purple-400";
        } else if (stars >= 4) {
            starImage = '/images/equipments/Star2.png';
            numberColor = "text-amber-400";
        } else if (stars >= 1) {
            starImage = '/images/equipments/Star1.png';
            numberColor = "text-white";
        }

        return (
            <div className="absolute top-0.5 left-0.5 flex items-center gap-0.5 bg-black/40 rounded-br-md px-1 py-0.5 z-10" style={{ textShadow: '1px 1px 2px black' }}>
                <img src={starImage} alt="star" className="w-3 h-3" />
                <span className={`font-bold text-xs leading-none ${numberColor}`}>{stars}</span>
            </div>
        );
    };

    const requiredLevel = GRADE_LEVEL_REQUIREMENTS[item.grade];

    const getAllOptions = (invItem: InventoryItem | null | undefined): ItemOption[] => {
        if (!invItem || !invItem.options) return [];
        return [
            ...(invItem.options.main ? [invItem.options.main] : []),
            ...(invItem.options.combatSubs || []),
            ...(invItem.options.specialSubs || []),
            ...(invItem.options.mythicSubs || []),
        ].filter(Boolean) as ItemOption[];
    };

    const getOptionValue = (invItem: InventoryItem | null | undefined, optionType: ItemOptionType): number => {
        if (!invItem || !invItem.options) return 0;
        const allOptions = getAllOptions(invItem);
        const foundOption = allOptions.find(opt => opt.type === optionType);
        return foundOption ? foundOption.value : 0;
    };

    const currentItemOptions = getAllOptions(item);
    const comparisonItemOptions = getAllOptions(comparisonItem);

    const optionMap = new Map<ItemOptionType, { current?: ItemOption; comparison?: ItemOption }>();

    currentItemOptions.forEach(opt => {
        optionMap.set(opt.type, { current: opt });
    });

    comparisonItemOptions.forEach(opt => {
        const existing = optionMap.get(opt.type);
        if (existing) {
            existing.comparison = opt;
        } else {
            optionMap.set(opt.type, { comparison: opt });
        }
    });

    const sortedOptionTypes = Array.from(optionMap.keys()).sort();

    return (
        <div className="flex flex-col h-full text-xs">
            {/* Top Section: Image (left), Name & Main Option (right) */}
            <div className="flex items-start justify-between mb-4">
                {/* Left: Image */}
                <div className="relative w-24 h-24 rounded-lg flex-shrink-0">
                    <img src={gradeStyles[item.grade].background} alt={item.grade} className="absolute inset-0 w-full h-full object-cover rounded-lg" />
                    {item.image && <img src={item.image} alt={item.name} className="relative w-full h-full object-contain p-2"/>}
                    {renderStarDisplay(item.stars)}
                </div>
                {/* Right: Name & Main Option */}
                <div className="flex-grow text-right ml-4">
                    <div className="flex items-baseline justify-end gap-1">
                        <h3 className={`text-xl font-bold ${gradeStyles[item.grade].color}`}>{item.name}</h3>
                    </div>
                    <p className="text-gray-400 text-sm">[{gradeStyles[item.grade].name}]</p>
                    <p className={`text-xs text-gray-500`}> (착용레벨: {requiredLevel})</p>
                    {item.options?.main && (
                        <p className="font-semibold text-yellow-300 text-sm">
                            {item.options.main.type}: {item.options.main.value}
                            {comparisonItem && item.options.main.type && (
                                (() => {
                                    const comparisonValue = getOptionValue(comparisonItem, item.options.main.type);
                                    const difference = item.options.main.value - comparisonValue;
                                    const differenceText = difference > 0 ? ` (+${difference})` : (difference < 0 ? ` (${difference})` : '');
                                    const differenceColorClass = difference > 0 ? 'text-green-400' : (difference < 0 ? 'text-red-400' : '');
                                    return difference !== 0 && <span className={`font-bold ${differenceColorClass}`}>{differenceText}</span>;
                                })()
                            )}
                        </p>
                    )}
                </div>
            </div>

            {/* Bottom Section: Sub Options */}
            <div className="w-full text-sm text-left space-y-2 bg-gray-900/50 p-3 rounded-lg flex-grow overflow-y-auto">
                {sortedOptionTypes.map(type => {
                    const { current, comparison } = optionMap.get(type)!;

                    // Skip main option as it's handled in the top section
                    if (item.options?.main?.type === type) return null;

                    if (current && comparison) {
                        // Stat exists in both, show difference
                        const difference = current.value - comparison.value;
                        const differenceText = difference > 0 ? ` (+${difference})` : (difference < 0 ? ` (${difference})` : '');
                        const differenceColorClass = difference > 0 ? 'text-green-400' : (difference < 0 ? 'text-red-400' : '');
                        let colorClass = 'text-blue-300'; // Default for combat subs
                        if (current.type in SpecialStat) colorClass = 'text-green-300';
                        if (current.type in MythicStat) colorClass = 'text-red-400';

                        return (
                            <p key={type} className={colorClass}>
                                {current.type}: {current.value}
                                {difference !== 0 && (
                                    <span className={`font-bold ${differenceColorClass}`}>{differenceText}</span>
                                )}
                            </p>
                        );
                    } else if (current && !comparison) {
                        // Stat is new
                        let colorClass = 'text-green-400';
                        if (current.type in SpecialStat) colorClass = 'text-green-300';
                        if (current.type in MythicStat) colorClass = 'text-red-400';
                        return (
                            <p key={type} className={colorClass}>
                                {current.type}: {current.value} <span className="font-bold">(New)</span>
                            </p>
                        );
                    } else if (!current && comparison) {
                        // Stat is removed
                        let colorClass = 'text-red-400';
                        if (comparison.type in SpecialStat) colorClass = 'text-green-300';
                        if (comparison.type in MythicStat) colorClass = 'text-red-400';
                        return (
                            <p key={type} className={`${colorClass} line-through`}>
                                {comparison.type}: {comparison.value}
                            </p>
                        );
                    }
                    return null;
                })}
            </div>
        </div>
    );
};
export default InventoryModal;