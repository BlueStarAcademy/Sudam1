import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { UserWithStatus, InventoryItem, ServerAction, InventoryItemType, ItemGrade, ItemOption, CoreStat, SpecialStat, MythicStat, EquipmentSlot, ItemOptionType } from '../types.js';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import { emptySlotImages, GRADE_LEVEL_REQUIREMENTS, ITEM_SELL_PRICES, MATERIAL_SELL_PRICES, gradeBackgrounds, gradeStyles, BASE_SLOTS_PER_CATEGORY, EXPANSION_AMOUNT, MAX_EQUIPMENT_SLOTS, MAX_CONSUMABLE_SLOTS, MAX_MATERIAL_SLOTS, ENHANCEMENT_COSTS } from '../constants/items';

import { calculateUserEffects } from '../services/effectService.js';
import { calculateTotalStats } from '../services/statService.js';
import { useAppContext } from '../hooks/useAppContext.js';
import PurchaseQuantityModal from './PurchaseQuantityModal.js';
import SellItemConfirmModal from './SellItemConfirmModal.js';
import SellMaterialBulkModal from './SellMaterialBulkModal.js';
import UseQuantityModal from './UseQuantityModal.js';

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

const EquipmentSlotDisplay: React.FC<{ slot: EquipmentSlot; item?: InventoryItem; scaleFactor?: number }> = ({ slot, item, scaleFactor = 1 }) => {
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

        const starSize = Math.max(8, Math.round(10 * scaleFactor));
        const fontSize = Math.max(8, Math.round(10 * scaleFactor));
        const gap = Math.max(2, Math.round(2 * scaleFactor));
        const padding = Math.max(2, Math.round(2 * scaleFactor));

        return (
            <div 
                className="absolute flex items-center bg-black/40 rounded-bl-md z-10" 
                style={{ 
                    textShadow: '1px 1px 2px black',
                    top: `${Math.max(2, Math.round(2 * scaleFactor))}px`,
                    right: `${Math.max(2, Math.round(2 * scaleFactor))}px`,
                    gap: `${gap}px`,
                    padding: `${padding}px`
                }}
            >
                <img src={starImage} alt="star" style={{ width: `${starSize}px`, height: `${starSize}px` }} />
                <span className={`font-bold leading-none ${numberColor}`} style={{ fontSize: `${fontSize}px` }}>{stars}</span>
            </div>
        );
    };

    if (item) {
        const padding = Math.max(4, Math.round(6 * scaleFactor));
        const borderWidth = Math.max(1, Math.round(2 * scaleFactor));
        return (
            <div
                className={`relative aspect-square rounded-lg bg-tertiary/50`}
                title={item.name}
                style={{ 
                    width: '100%', 
                    height: '100%', 
                    minWidth: 0, 
                    minHeight: 0, 
                    maxWidth: '100%', 
                    maxHeight: '100%',
                    border: `${borderWidth}px solid rgba(255, 255, 255, 0.1)`,
                    boxSizing: 'border-box'
                }}
            >
                <img 
                    src={gradeBackgrounds[item.grade]} 
                    alt={item.grade} 
                    className="absolute inset-0 object-cover rounded-md" 
                    style={{ 
                        width: '100%', 
                        height: '100%', 
                        maxWidth: '100%', 
                        maxHeight: '100%',
                        objectFit: 'cover'
                    }} 
                />
                {item.image && (
                    <img 
                        src={item.image} 
                        alt={item.name} 
                        className="relative object-contain" 
                        style={{ 
                            width: '100%', 
                            height: '100%', 
                            padding: `${padding}px`, 
                            maxWidth: '100%', 
                            maxHeight: '100%',
                            boxSizing: 'border-box',
                            objectFit: 'contain'
                        }}
                    />
                )}
                {renderStarDisplay(item.stars)}
            </div>
        );
    } else {
        const borderWidth = Math.max(1, Math.round(2 * scaleFactor));
         return (
             <img 
                 src={emptySlotImages[slot]} 
                 alt={`${slot} empty slot`} 
                 className="aspect-square rounded-lg bg-tertiary/50" 
                 style={{ 
                     width: '100%', 
                     height: '100%', 
                     maxWidth: '100%', 
                     maxHeight: '100%', 
                     objectFit: 'contain',
                     border: `${borderWidth}px solid rgba(255, 255, 255, 0.1)`,
                     boxSizing: 'border-box'
                 }} 
             />
        );
    }
};

const LocalItemDetailDisplay: React.FC<{
    item: InventoryItem | null | undefined;
    title: string;
    comparisonItem?: InventoryItem | null;
    scaleFactor?: number;
}> = ({ item, title, comparisonItem, scaleFactor = 1 }) => {
    if (!item) {
        return <div className="h-full flex items-center justify-center text-tertiary text-sm">{title}</div>;
    }

    const styles = gradeStyles[item.grade];

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

        const starSize = Math.max(8, Math.round(10 * scaleFactor));
        const fontSize = Math.max(8, Math.round(10 * scaleFactor));
        const gap = Math.max(2, Math.round(2 * scaleFactor));
        const padding = Math.max(2, Math.round(2 * scaleFactor));

        return (
            <div 
                className="absolute flex items-center bg-black/40 rounded-bl-md z-10" 
                style={{ 
                    textShadow: '1px 1px 2px black',
                    top: `${Math.max(2, Math.round(2 * scaleFactor))}px`,
                    right: `${Math.max(2, Math.round(2 * scaleFactor))}px`,
                    gap: `${gap}px`,
                    padding: `${padding}px`
                }}
            >
                <img src={starImage} alt="star" style={{ width: `${starSize}px`, height: `${starSize}px` }} />
                <span className={`font-bold leading-none ${numberColor}`} style={{ fontSize: `${fontSize}px` }}>{stars}</span>
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
            <div className="flex items-start justify-between mb-2">
                {/* Left: Image */}
                <div 
                    className="relative rounded-lg flex-shrink-0"
                    style={{
                        width: `${Math.max(60, Math.round(80 * scaleFactor))}px`,
                        height: `${Math.max(60, Math.round(80 * scaleFactor))}px`
                    }}
                >
                    <img src={styles.background} alt={item.grade} className="absolute inset-0 w-full h-full object-cover rounded-lg" />
                    {item.image && <img src={item.image} alt={item.name} className="relative w-full h-full object-contain" style={{ padding: `${Math.max(2, Math.round(4 * scaleFactor))}px` }} />}
                    {renderStarDisplay(item.stars)}
                </div>
                {/* Right: Name & Main Option */}
                <div className="flex-grow text-right ml-2">
                    <div className="flex items-baseline justify-end gap-0.5">
                        <h3 className={`text-lg font-bold ${styles.color}`}>{item.name}</h3>
                    </div>
                    <p className="text-gray-400 text-xs">[{styles.name}]</p>
                    <p className={`text-[10px] text-gray-500`}> (착용레벨: {requiredLevel})</p>
                    {item.options?.main && ( // Only display main option if it exists
                        <p className="font-semibold text-yellow-300 text-xs flex justify-between items-center">
                            <span>
                                {item.options.main.display}
                                {item.options.main.range && ` [${item.options.main.range[0]}~${item.options.main.range[1]}]`}
                            </span>
                            {comparisonItem && item.options.main.type && (
                                (() => {
                                    const comparisonValue = getOptionValue(comparisonItem, item.options.main.type);
                                    const difference = item.options.main.value - comparisonValue;
                                    const differenceText = difference > 0 ? ` (+${difference})` : (difference < 0 ? ` (${difference})` : '');
                                    const differenceColorClass = difference > 0 ? 'text-green-400' : (difference < 0 ? 'text-red-400' : '');
                                    return difference !== 0 && <span className={`font-bold ${differenceColorClass} text-right`}>{differenceText}</span>;
                                })()
                            )}
                        </p>
                    )}
                </div>
            </div>

            {/* Bottom Section: Sub Options */}
            <div className="w-full text-xs text-left space-y-1 bg-gray-900/50 p-2 rounded-lg flex-grow overflow-y-auto">
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
                            <p key={type} className={`${colorClass} flex justify-between items-center`}>
                                <span>
                                    {current.display}
                                </span>
                                {difference !== 0 && (
                                    <span className={`font-bold ${differenceColorClass} text-right`}>{differenceText}</span>
                                )}
                            </p>
                        );
                    } else if (current && !comparison) {
                        // Stat is new
                        let colorClass = 'text-green-400';
                        if (current.type in SpecialStat) colorClass = 'text-green-300';
                        if (current.type in MythicStat) colorClass = 'text-red-400';
                        return (
                            <p key={type} className={`${colorClass} flex justify-between items-center`}>
                                <span>
                                    {current.display}
                                </span> <span className="font-bold text-right">(New)</span>
                            </p>
                        );
                    } else if (!current && comparison) {
                        // Stat is removed
                        let colorClass = 'text-red-400';
                        if (comparison.type in SpecialStat) colorClass = 'text-green-300';
                        if (comparison.type in MythicStat) colorClass = 'text-red-400';
                        return (
                            <p key={type} className={`${colorClass} line-through flex justify-between items-center`}>
                                <span>{comparison.display}</span>
                            </p>
                        );
                    }
                    return null;
                })}
            </div>
        </div>
    );
};

const EQUIPMENT_SLOTS: EquipmentSlot[] = ['fan', 'board', 'top', 'bottom', 'bowl', 'stones'];

const InventoryModal: React.FC<InventoryModalProps> = ({ currentUser: propCurrentUser, onClose, onAction, onStartEnhance, enhancementAnimationTarget, onAnimationComplete, isTopmost }) => {
    const { presets, handlers, currentUserWithStatus, updateTrigger } = useAppContext();
    
    // useAppContext의 currentUserWithStatus를 우선 사용 (최신 상태 보장)
    const currentUser = currentUserWithStatus || propCurrentUser;

    const { inventorySlots = { equipment: 30, consumable: 10, material: 10 } } = currentUser;
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('all');
    const [sortKey, setSortKey] = useState<SortKey>('createdAt');
    const [selectedPreset, setSelectedPreset] = useState(0);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [showUseQuantityModal, setShowUseQuantityModal] = useState(false);
    const [itemToUseBulk, setItemToUseBulk] = useState<InventoryItem | null>(null);
    const [itemToSell, setItemToSell] = useState<InventoryItem | null>(null);
    const [itemToSellBulk, setItemToSellBulk] = useState<InventoryItem | null>(null);
    
    // 브라우저 크기 감지
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [windowHeight, setWindowHeight] = useState(window.innerHeight);
    
    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
            setWindowHeight(window.innerHeight);
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    // 뷰포트 크기에 비례한 창 크기 계산 (85% 너비, 최소 400px, 최대 950px)
    // 브라우저가 작아질수록 창도 함께 작아지도록 비율 기반 계산
    const calculatedWidth = useMemo(() => {
        const baseWidth = windowWidth * 0.85;
        return Math.max(400, Math.min(950, baseWidth));
    }, [windowWidth]);
    
    // 뷰포트 크기에 비례한 창 높이 계산 (80% 높이, 최소 450px, 최대 900px) - 인벤토리 슬롯 2줄 이상 보이도록
    const calculatedHeight = useMemo(() => {
        const baseHeight = windowHeight * 0.80;
        return Math.max(450, Math.min(900, baseHeight));
    }, [windowHeight]);
    
    // 창 크기에 비례한 스케일 팩터 계산 (기준: 950px 너비, 최소 0.4까지 허용)
    // 브라우저가 작아질수록 모든 요소가 비례적으로 줄어들도록
    const baseWidth = 950;
    const scaleFactor = useMemo(() => {
        const rawScale = calculatedWidth / baseWidth;
        return Math.max(0.4, Math.min(1.0, rawScale));
    }, [calculatedWidth]);

    const handlePresetChange = (presetIndex: number) => {
        setSelectedPreset(presetIndex);
        const preset = presets[presetIndex];
        // 프리셋이 있으면 적용하고, 없으면(빈 프리셋) 빈 장비 세트를 적용
        handlers.applyPreset(preset || { name: presets[presetIndex]?.name || `프리셋 ${presetIndex + 1}`, equipment: {} });
    };

    const selectedItem = useMemo(() => {
        if (!selectedItemId) return null;
        // 현재 인벤토리에서 아이템이 사라졌을 경우 선택 해제
        const found = currentUser.inventory.find(item => item.id === selectedItemId);
        if (!found && selectedItemId) {
            // 아이템이 사라진 경우 선택 해제 (다음 렌더링에서 처리)
            setTimeout(() => setSelectedItemId(null), 0);
        }
        return found || null;
    }, [selectedItemId, currentUser.inventory, updateTrigger]);

    const expansionCost = useMemo(() => {
        if (activeTab === 'all') return 0;
        return calculateExpansionCost(inventorySlots[activeTab]);
    }, [activeTab, inventorySlots]);

    const { coreStatBonuses } = useMemo(() => calculateUserEffects(currentUser), [currentUser]);

    const enhancementMaterialDetails = useMemo(() => {
        if (!selectedItem || selectedItem.type !== 'material') return [];
        const groupedDetails: Record<ItemGrade, number[]> = {
            normal: [],
            uncommon: [],
            rare: [],
            epic: [],
            legendary: [],
            mythic: [],
        };

        for (const grade in ENHANCEMENT_COSTS) {
            const costsForGrade = ENHANCEMENT_COSTS[grade as ItemGrade];
            costsForGrade.forEach((costArray, starIndex) => {
                costArray.forEach(cost => {
                    if (cost.name === selectedItem.name) {
                        if (!groupedDetails[grade as ItemGrade]) {
                            groupedDetails[grade as ItemGrade] = [];
                        }
                        groupedDetails[grade as ItemGrade].push(starIndex + 1);
                    }
                });
            });
        }

        const details: string[] = [];
        for (const grade in groupedDetails) {
            const starLevels = groupedDetails[grade as ItemGrade].sort((a, b) => a - b);
            if (starLevels.length > 0) {
                details.push(`${gradeStyles[grade as ItemGrade].name} 등급 장비 강화: +${starLevels.join('강/+')}강`);
            }
        }
        return details;
    }, [selectedItem]);

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
        const updatedPreset = {
            ...presets[selectedPreset],
            name: newPresetName,
            equipment: currentUser.equipment,
        };
        onAction({ type: 'SAVE_PRESET', payload: { preset: updatedPreset, index: selectedPreset } });
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
        // Log for debugging: Check if materials are present and filtered correctly
        if (activeTab === 'material') {
            console.log('Filtered materials:', items);
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
    }, [currentUser.inventory, activeTab, sortKey, updateTrigger]);

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

    const isItemInAnyPreset = useCallback((itemId: string) => {
        return presets.some(preset => Object.values(preset.equipment).includes(itemId));
    }, [presets]);

    const getItemForSlot = useCallback((slot: EquipmentSlot) => {
        const itemId = currentUser.equipment[slot];
        if (!itemId) return undefined;
        return currentUser.inventory.find(item => item.id === itemId);
    }, [currentUser.equipment, currentUser.inventory, updateTrigger]);

    const correspondingEquippedItem = useMemo(() => {
        if (!selectedItem || !selectedItem.slot) return null;
        return getItemForSlot(selectedItem.slot);
    }, [selectedItem, getItemForSlot]);

    const canEquip = useMemo(() => {
        if (!selectedItem || selectedItem.type !== 'equipment') return false;
        const requiredLevel = GRADE_LEVEL_REQUIREMENTS[selectedItem.grade];
        const userLevelSum = currentUser.strategyLevel + currentUser.playfulLevel;
        return userLevelSum >= requiredLevel;
    }, [selectedItem, currentUser.strategyLevel, currentUser.playfulLevel]);

    // 바둑능력 변화 계산 (선택한 장비를 장착했을 때의 바둑능력 변화 - 6가지 능력치 합계)
    const combatPowerChange = useMemo(() => {
        if (!selectedItem || selectedItem.type !== 'equipment' || !selectedItem.slot) return null;
        
        // 현재 바둑능력 계산 (현재 장착된 장비 기준) - 6가지 능력치 합계
        const currentStats = calculateTotalStats(currentUser);
        const currentBadukPower = Object.values(currentStats).reduce((acc, val) => acc + val, 0);
        
        // 현재 해당 슬롯에 장착된 아이템 ID 찾기
        const currentEquippedItemId = currentUser.equipment[selectedItem.slot];
        
        // 선택한 장비를 장착한 상태로 가정한 User 생성
        const hypotheticalEquipment = { ...currentUser.equipment };
        hypotheticalEquipment[selectedItem.slot] = selectedItem.id;
        
        // 인벤토리에서 아이템의 isEquipped 상태 업데이트
        const hypotheticalInventory = currentUser.inventory.map(item => {
            // 선택한 아이템은 장착
            if (item.id === selectedItem.id) {
                return { ...item, isEquipped: true };
            }
            // 현재 해당 슬롯에 장착된 아이템은 해제
            if (currentEquippedItemId && item.id === currentEquippedItemId) {
                return { ...item, isEquipped: false };
            }
            // 나머지는 그대로 유지
            return item;
        });
        
        const hypotheticalUser = {
            ...currentUser,
            equipment: hypotheticalEquipment,
            inventory: hypotheticalInventory
        };
        
        // 선택한 장비를 장착했을 때의 바둑능력 계산 - 6가지 능력치 합계
        const newStats = calculateTotalStats(hypotheticalUser);
        const newBadukPower = Object.values(newStats).reduce((acc, val) => acc + val, 0);
        
        // 차이 계산 (선택한 장비 장착 시 - 현재 장착 장비 기준)
        const change = newBadukPower - currentBadukPower;
        return change;
    }, [selectedItem, currentUser]);

    return (
        <DraggableWindow title="가방" onClose={onClose} windowId="inventory" isTopmost={isTopmost} initialWidth={calculatedWidth} initialHeight={calculatedHeight}>
            <div 
                className="flex flex-col h-full w-full overflow-hidden"
                style={{ margin: 0, padding: 0 }}
            >
                {/* Top section: Equipped items (left) and Selected item details (right) */}
                <div className="bg-gray-800 mb-2 rounded-md shadow-inner flex flex-shrink-0 overflow-auto" style={{ maxHeight: `${Math.min(400 * scaleFactor, windowHeight * 0.5)}px`, padding: `${Math.max(12, Math.round(16 * scaleFactor))}px` }}>
                    {/* Left panel: Equipped items */}
                    <div className="w-1/3 border-r border-gray-700" style={{ paddingRight: `${Math.max(12, Math.round(16 * scaleFactor))}px` }}>
                        <h3 className="font-bold text-on-panel" style={{ fontSize: `${Math.max(14, Math.round(18 * scaleFactor))}px`, marginBottom: `${Math.max(6, Math.round(8 * scaleFactor))}px` }}>장착 장비</h3>
                        <div 
                            className="grid" 
                            style={{ 
                                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                                gap: `${Math.max(6, Math.round(8 * scaleFactor))}px`
                            }}
                        >
                            {EQUIPMENT_SLOTS.map(slot => (
                                <div key={slot} style={{ width: '100%', minWidth: 0 }}>
                                    <EquipmentSlotDisplay slot={slot} item={getItemForSlot(slot)} scaleFactor={scaleFactor} />
                                </div>
                            ))}
                        </div>
                        <div className="mt-4">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
                                {Object.values(CoreStat).map(stat => {
                                    const baseStats = currentUser.baseStats || {};
                                    const spentStatPoints = currentUser.spentStatPoints || {};
                                    const baseValue = (baseStats[stat] || 0) + (spentStatPoints[stat] || 0);
                                    const bonusInfo = coreStatBonuses[stat] || { percent: 0, flat: 0 };
                                    const bonus = Math.floor(baseValue * (bonusInfo.percent / 100)) + bonusInfo.flat;
                                    const finalValue = baseValue + bonus;
                                    return (
                                        <div key={stat} className="bg-tertiary/40 p-1 rounded-md flex items-center justify-between text-xs">
                                            <span className="font-semibold text-secondary whitespace-nowrap">{stat}</span>
                                            <span className="font-mono font-bold whitespace-nowrap" title={`기본: ${baseValue}, 장비: ${bonus}`}>
                                                {isNaN(finalValue) ? 0 : finalValue}
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

                    {/* Conditional middle and right panels */}
                    {selectedItem && selectedItem.type === 'equipment' ? (
                        <>
                            {/* Middle panel: Currently equipped item for comparison */}
                            <div className="flex flex-col w-1/3 h-full bg-panel-secondary rounded-lg p-3 relative overflow-hidden ml-4 border-r border-gray-700">
                                <h3 className="text-lg font-bold text-on-panel mb-2">현재 장착 장비</h3>
                                {correspondingEquippedItem ? (
                                    <LocalItemDetailDisplay item={correspondingEquippedItem} title="장착된 장비 없음" comparisonItem={selectedItem} scaleFactor={scaleFactor} />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-tertiary text-sm">장착된 장비 없음</div>
                                )}
                            </div>

                            {/* Right panel: Selected equipment item */}
                            <div className="flex flex-col w-1/3 h-full bg-panel-secondary rounded-lg p-3 relative overflow-hidden ml-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-lg font-bold text-on-panel">선택 장비</h3>
                                    {combatPowerChange !== null && combatPowerChange !== 0 && (
                                        <span className={`text-sm font-bold ${combatPowerChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            바둑능력{combatPowerChange > 0 ? '+' : ''}{combatPowerChange}
                                        </span>
                                    )}
                                </div>
                                <LocalItemDetailDisplay item={selectedItem} title="선택된 아이템 없음" comparisonItem={correspondingEquippedItem} scaleFactor={scaleFactor} />
                                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 px-4">
                                    {selectedItem.id === correspondingEquippedItem?.id ? (
                                        <Button
                                            onClick={() => handleEquipToggle(selectedItem.id)}
                                            colorScheme="red"
                                            className="w-full !text-xs !py-1"
                                        >
                                            해제
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => handleEquipToggle(selectedItem.id)}
                                            colorScheme="green"
                                            className="w-full !text-xs !py-1"
                                            disabled={!canEquip}
                                        >
                                            장착
                                        </Button>
                                    )}
                                    <Button
                                        onClick={() => onStartEnhance(selectedItem)}
                                        disabled={selectedItem.stars >= 10}
                                        colorScheme="yellow"
                                        className="w-full !text-xs !py-1"
                                    >
                                        {selectedItem.stars >= 10 ? '최대 강화' : '강화'}
                                    </Button>
                                    <Button onClick={() => setItemToSell(selectedItem)} colorScheme="red" className="w-full !text-xs !py-1">
                                        판매
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Single right panel for non-equipment items or no selection */
                        <div className="flex flex-col w-2/3 h-full bg-panel-secondary rounded-lg p-3 relative overflow-hidden ml-4">
                            {selectedItem ? (
                                (selectedItem.type === 'consumable' || selectedItem.type === 'material') ? (
                                    <>
                                        <h3 className="text-lg font-bold text-on-panel mb-2">
                                            선택 {selectedItem.type === 'consumable' ? '소모품' : '재료'}
                                        </h3>
                                        <div className="flex flex-col h-full text-xs">
                                            <div className="flex items-start justify-between mb-2">
                                                <div 
                                                    className="relative rounded-lg flex-shrink-0"
                                                    style={{
                                                        width: `${Math.max(60, Math.round(80 * scaleFactor))}px`,
                                                        height: `${Math.max(60, Math.round(80 * scaleFactor))}px`
                                                    }}
                                                >
                                                    <img src={gradeBackgrounds[selectedItem.grade]} alt={selectedItem.grade} className="absolute inset-0 w-full h-full object-cover rounded-lg" />
                                                    {selectedItem.image && <img src={selectedItem.image} alt={selectedItem.name} className="relative w-full h-full object-contain" style={{ padding: `${Math.max(2, Math.round(4 * scaleFactor))}px` }} />}
                                                </div>
                                                <div className="flex-grow text-right ml-2">
                                                    <h3 className={`text-lg font-bold ${gradeStyles[selectedItem.grade].color}`}>{selectedItem.name}</h3>
                                                    <p className="text-gray-400 text-xs">[{gradeStyles[selectedItem.grade].name}]</p>
                                                    <p className="text-gray-300 text-xs mt-1">{selectedItem.description}</p>
                                                    <p className="text-gray-300 text-xs mt-1">보유 수량: {selectedItem.quantity}</p>
                                                </div>
                                            </div>
                                            {selectedItem.type === 'material' && (
                                                <div className="mt-2 p-2 bg-gray-800/50 rounded-lg flex-grow" style={{ maxHeight: '4em' }}>
                                                    <p className="font-semibold text-secondary mb-1">강화 필요 정보:</p>
                                                    {enhancementMaterialDetails.length > 0 ? (
                                                        enhancementMaterialDetails.slice(0, 2).map((detail, index) => (
                                                            <p key={index} className="text-gray-300 text-xs">
                                                                {detail}
                                                            </p>
                                                        ))
                                                    ) : (
                                                        <p className="text-gray-300 text-xs">이 재료는 현재 어떤 장비 강화에도 사용되지 않습니다.</p>
                                                    )}
                                                    {enhancementMaterialDetails.length > 2 && (
                                                        <p className="text-gray-400 text-xs mt-1">...</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 px-4">
                                            {selectedItem.type === 'consumable' && (
                                                <>
                                                    <Button onClick={() => onAction({ type: 'USE_ITEM', payload: { itemId: selectedItem.id } })} colorScheme="blue" className="w-full !text-xs !py-1">
                                                        사용
                                                    </Button>
                                                    {selectedItem.quantity && selectedItem.quantity > 1 && (
                                                        <Button
                                                            onClick={() => { setItemToUseBulk(selectedItem); setShowUseQuantityModal(true); }}
                                                            colorScheme="purple"
                                                            className="w-full !text-xs !py-1"
                                                        >
                                                            일괄 사용
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                            {selectedItem.type === 'material' && (
                                                <>
                                                    <Button onClick={() => setItemToSell(selectedItem)} colorScheme="red" className="w-full !text-xs !py-1">
                                                        판매
                                                    </Button>
                                                    <Button onClick={() => setItemToSellBulk(selectedItem)} colorScheme="orange" className="w-full !text-xs !py-1">
                                                        일괄 판매
                                                    </Button>
                                                </>
                                            )}
                                            {selectedItem.type !== 'material' && (
                                                <Button onClick={() => setItemToSell(selectedItem)} colorScheme="red" className="w-full !text-xs !py-1">
                                                    판매
                                                </Button>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-tertiary text-sm">선택된 아이템 없음</div>
                                )
                            ) : (
                                <div className="h-full flex items-center justify-center text-tertiary text-sm">아이템을 선택해주세요</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom section: Inventory grid */}
                <div className="bg-gray-900 overflow-hidden flex flex-col" style={{ flex: '1 1 0', minHeight: `${Math.max(250 * scaleFactor, windowHeight * 0.35)}px`, padding: `${Math.max(12, Math.round(16 * scaleFactor))}px`, paddingTop: `${Math.max(12, Math.round(16 * scaleFactor))}px`, paddingBottom: `${Math.max(12, Math.round(16 * scaleFactor))}px`, marginBottom: 0 }}>
                    <div className="flex-shrink-0 bg-gray-900/50 rounded-md mb-2" style={{ padding: `${Math.max(6, Math.round(8 * scaleFactor))}px`, marginBottom: `${Math.max(6, Math.round(8 * scaleFactor))}px` }}>
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
                    <div className="overflow-y-auto flex-1" style={{ width: '100%', minWidth: 0, minHeight: 0, paddingRight: `${Math.max(6, Math.round(8 * scaleFactor))}px` }}>
                        <div 
                            className="grid gap-2" 
                            style={{ 
                                gridTemplateColumns: `repeat(10, minmax(0, 1fr))`,
                                gap: `${Math.max(4, Math.round(8 * scaleFactor))}px`,
                                width: '100%',
                                minWidth: 0
                            }}
                        >
                        {Array.from({ length: currentSlots }).map((_, index) => {
                            const item = filteredAndSortedInventory[index];
                            if (item) {
                                return (
                                    <div key={item.id} className="aspect-square" style={{ width: '100%', minWidth: 0, minHeight: 0, maxWidth: '100%' }}>
                                        <InventoryItemCard
                                            item={item}
                                            onClick={() => setSelectedItemId(item.id)}
                                            isSelected={selectedItemId === item.id}
                                            isEquipped={item.isEquipped || false}
                                            enhancementStars={enhancementAnimationTarget?.itemId === item.id ? enhancementAnimationTarget.stars : undefined}
                                            isPresetEquipped={isItemInAnyPreset(item.id)}
                                            scaleFactor={scaleFactor}
                                        />
                                    </div>
                                );
                            } else {
                                return (
                                    <div key={`empty-${index}`} className="aspect-square rounded-lg bg-gray-800/50 border-2 border-gray-700/50" style={{ width: '100%', minWidth: 0, minHeight: 0, maxWidth: '100%' }} />
                                );
                            }
                        })}
                        {canExpand && (
                            <button
                                key="expand-slot"
                                onClick={handleExpand}
                                className="w-full aspect-square rounded-lg bg-gray-800/50 border-2 border-gray-700/50 flex items-center justify-center text-gray-400 text-4xl hover:bg-gray-700/50 hover:border-accent transition-all duration-200"
                                title={`가방 확장 (${expansionCost} 다이아)`}
                            >
                                +
                            </button>
                        )}
                    </div>
                    </div>

                </div>
            </div>

            {/* Modals */}
            {showUseQuantityModal && itemToUseBulk && (
                <UseQuantityModal
                    item={itemToUseBulk}
                    currentUser={currentUser}
                    onClose={() => {
                        setShowUseQuantityModal(false);
                        setItemToUseBulk(null);
                    }}
                    onConfirm={(itemId, quantity) => {
                        onAction({ type: 'USE_ITEM', payload: { itemId, quantity } });
                    }}
                    isTopmost={isTopmost && !isRenameModalOpen && !itemToSell && !itemToSellBulk}
                />
            )}

            {itemToSell && (
                <SellItemConfirmModal
                    item={itemToSell}
                    onClose={() => setItemToSell(null)}
                    onConfirm={async () => {
                        if (itemToSell.type === 'material') {
                            // 재료는 선택된 슬롯의 수량만 판매 (1개 판매)
                            await onAction({ type: 'SELL_ITEM', payload: { itemId: itemToSell.id, quantity: 1 } });
                        } else {
                            // 장비는 전체 판매
                            await onAction({ type: 'SELL_ITEM', payload: { itemId: itemToSell.id } });
                        }
                        setItemToSell(null);
                        setSelectedItemId(null);
                    }}
                    isTopmost={isTopmost && !isRenameModalOpen && !showUseQuantityModal && !itemToSellBulk}
                />
            )}

            {itemToSellBulk && (
                <SellMaterialBulkModal
                    item={itemToSellBulk}
                    currentUser={currentUser}
                    onClose={() => setItemToSellBulk(null)}
                    onConfirm={async (quantity) => {
                        // 같은 이름의 재료를 모두 찾아서 순차적으로 판매
                        const materialsToSell = currentUser.inventory
                            .filter(i => i.type === 'material' && i.name === itemToSellBulk.name)
                            .sort((a, b) => (a.quantity || 0) - (b.quantity || 0)); // 수량이 적은 것부터 정렬
                        
                        let remainingQuantity = quantity;
                        
                        // 순차적으로 처리하여 인벤토리 상태가 올바르게 업데이트되도록 함
                        for (const material of materialsToSell) {
                            if (remainingQuantity <= 0) break;
                            const sellQty = Math.min(remainingQuantity, material.quantity || 0);
                            await onAction({ type: 'SELL_ITEM', payload: { itemId: material.id, quantity: sellQty } });
                            remainingQuantity -= sellQty;
                        }
                        
                        setItemToSellBulk(null);
                        setSelectedItemId(null);
                    }}
                    isTopmost={isTopmost && !isRenameModalOpen && !showUseQuantityModal && !itemToSell}
                />
            )}

            {isRenameModalOpen && (
                <DraggableWindow title="프리셋 이름 변경" onClose={() => setIsRenameModalOpen(false)} windowId="renamePreset" isTopmost={true}>
                    <div className="p-4 flex flex-col items-center">
                        <p className="mb-4 text-on-panel">새로운 프리셋 이름을 입력하세요:</p>
                        <input
                            type="text"
                            value={newPresetName}
                            onChange={(e) => setNewPresetName(e.target.value)}
                            className="bg-secondary border border-color text-on-panel text-sm rounded-md p-2 mb-4 w-full max-w-xs"
                            maxLength={20}
                        />
                        <div className="flex gap-2">
                            <Button onClick={handleSavePreset} colorScheme="blue">
                                저장
                            </Button>
                            <Button onClick={() => setIsRenameModalOpen(false)} colorScheme="gray">
                                취소
                            </Button>
                        </div>
                    </div>
                </DraggableWindow>
            )}
        </DraggableWindow>
    );
};

const InventoryItemCard: React.FC<{
    item: InventoryItem;
    onClick: () => void;
    isSelected: boolean;
    isEquipped: boolean;
    enhancementStars: number | undefined;
    isPresetEquipped?: boolean;
    scaleFactor?: number;
}> = ({ item, onClick, isSelected, isEquipped, enhancementStars, isPresetEquipped, scaleFactor = 1 }) => {
    const starInfo = getStarDisplayInfo(enhancementStars || item.stars || 0);

    return (
        <div
            onClick={onClick}
            className={`relative aspect-square rounded-lg cursor-pointer transition-all duration-200 ${isSelected ? 'ring-2 ring-accent' : 'ring-1 ring-transparent'} hover:ring-2 hover:ring-accent/70`}
            title={item.name}
            style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, maxWidth: '100%', maxHeight: '100%' }}
        >
            <img src={gradeBackgrounds[item.grade]} alt={item.grade} className="absolute inset-0 object-cover rounded-md" style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%' }} />
            {item.image && <img src={item.image} alt={item.name} className="relative object-contain" style={{ width: '100%', height: '100%', padding: `${Math.max(4, Math.round(6 * scaleFactor))}px`, maxWidth: '100%', maxHeight: '100%' }} />}
            {isEquipped && (
                <div 
                    className="absolute bg-green-500 text-white flex items-center justify-center rounded-full border-2 border-gray-800"
                    style={{
                        top: `${Math.max(2, Math.round(2 * scaleFactor))}px`,
                        left: `${Math.max(2, Math.round(2 * scaleFactor))}px`,
                        width: `${Math.max(12, Math.round(16 * scaleFactor))}px`,
                        height: `${Math.max(12, Math.round(16 * scaleFactor))}px`,
                        fontSize: `${Math.max(8, Math.round(10 * scaleFactor))}px`
                    }}
                >
                    E
                </div>
            )}
            {!isEquipped && isPresetEquipped && (
                <div 
                    className="absolute bg-blue-500 text-white flex items-center justify-center rounded-full border-2 border-gray-800"
                    style={{
                        top: `${Math.max(2, Math.round(2 * scaleFactor))}px`,
                        left: `${Math.max(2, Math.round(2 * scaleFactor))}px`,
                        width: `${Math.max(12, Math.round(16 * scaleFactor))}px`,
                        height: `${Math.max(12, Math.round(16 * scaleFactor))}px`,
                        fontSize: `${Math.max(8, Math.round(10 * scaleFactor))}px`
                    }}
                >
                    P
                </div>
            )}
            {(item.type === 'consumable' || item.type === 'material') && item.quantity && item.quantity > 1 && (
                <div 
                    className="absolute bg-black/70 text-white font-bold rounded border border-white/30"
                    style={{
                        bottom: `${Math.max(2, Math.round(2 * scaleFactor))}px`,
                        right: `${Math.max(2, Math.round(2 * scaleFactor))}px`,
                        fontSize: `${Math.max(8, Math.round(10 * scaleFactor))}px`,
                        padding: `${Math.max(2, Math.round(4 * scaleFactor))}px ${Math.max(3, Math.round(4 * scaleFactor))}px`
                    }}
                >
                    {item.quantity}
                </div>
            )}
            <div 
                className="absolute bottom-0 left-0 right-0 text-center font-bold text-white bg-black/50"
                style={{
                    padding: `${Math.max(2, Math.round(2 * scaleFactor))}px 0`,
                    fontSize: `${Math.max(10, Math.round(12 * scaleFactor))}px`
                }}
            >
                <span className={starInfo.colorClass}>{starInfo.text}</span>
            </div>
        </div>
    );
};



export default InventoryModal;