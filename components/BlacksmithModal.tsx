import React, { useState, useMemo, useEffect, useCallback } from 'react';
import DraggableWindow from './DraggableWindow.js';
import EnhancementView from './blacksmith/EnhancementView.js';
import CombinationView from './blacksmith/CombinationView.js';
import DisassemblyView from './blacksmith/DisassemblyView.js';
import ConversionView from './blacksmith/ConversionView.js';
import InventoryGrid from './blacksmith/InventoryGrid.js';
import DisassemblyResultModal from './DisassemblyResultModal.js'; // New import
import { useAppContext } from '../hooks/useAppContext.js';
import { BLACKSMITH_MAX_LEVEL, BLACKSMITH_COMBINABLE_GRADES_BY_LEVEL, BLACKSMITH_COMBINATION_GREAT_SUCCESS_RATES, BLACKSMITH_DISASSEMBLY_JACKPOT_RATES, BLACKSMITH_XP_REQUIRED_FOR_LEVEL_UP } from '../constants/rules';
import { InventoryItem, EnhancementResult } from '../types.js';
import type { ItemGrade } from '../types/enums.js';

import BlacksmithHelpModal from './blacksmith/BlacksmithHelpModal.js';

const GRADE_ORDER: ItemGrade[] = ['normal', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

interface BlacksmithModalProps {
    onClose: () => void;
    isTopmost: boolean;
    selectedItemForEnhancement: InventoryItem | null;
    activeTab: 'enhance' | 'combine' | 'disassemble' | 'convert';
    onSetActiveTab: (tab: 'enhance' | 'combine' | 'disassemble' | 'convert') => void;
    enhancementOutcome: EnhancementResult | null;
}

type SortOption = 'grade' | 'stars' | 'name' | 'date';

const BlacksmithModal: React.FC<BlacksmithModalProps> = ({ onClose, isTopmost, selectedItemForEnhancement, activeTab, onSetActiveTab, enhancementOutcome }) => {
    const { currentUserWithStatus, handlers, modals } = useAppContext();
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(selectedItemForEnhancement);
    const [combinationItems, setCombinationItems] = useState<(InventoryItem | null)[]>([null, null, null]);
    const [selectedForDisassembly, setSelectedForDisassembly] = useState<Set<string>>(new Set()); // New state
    const [sortOption, setSortOption] = useState<SortOption>('grade');

    if (!currentUserWithStatus) return null;

    useEffect(() => {
        if (selectedItemForEnhancement) {
            setSelectedItem(selectedItemForEnhancement);
            onSetActiveTab('enhance');
        }
    }, [selectedItemForEnhancement, onSetActiveTab]);

    useEffect(() => {
        setCombinationItems([null, null, null]);
    }, [activeTab]);

    // Sync selected item with inventory (for enhancement updates)
    useEffect(() => {
        if (selectedItem && activeTab === 'enhance') {
            const updatedItem = currentUserWithStatus.inventory.find(invItem => invItem.id === selectedItem.id);
            if (updatedItem && (updatedItem.stars !== selectedItem.stars || updatedItem.enhancementFails !== selectedItem.enhancementFails)) {
                setSelectedItem(updatedItem);
            }
        }
    }, [currentUserWithStatus.inventory, selectedItem, activeTab]);

    // Sync combination items with inventory
    useEffect(() => {
        if (activeTab === 'combine') {
            setCombinationItems(prevItems => {
                const updatedItems = prevItems.map(item => {
                    if (!item) return null;
                    // Set to null if the item no longer exists in the main inventory
                    return currentUserWithStatus.inventory.find(invItem => invItem.id === item.id) || null;
                });
                return updatedItems;
            });
        }
    }, [currentUserWithStatus.inventory, activeTab]);

    const handleSelectItem = useCallback((item: InventoryItem) => {
        if (activeTab === 'combine') {
            const emptyIndex = combinationItems.findIndex(i => i === null);
            if (emptyIndex !== -1) {
                const newItems = [...combinationItems];
                newItems[emptyIndex] = item;
                setCombinationItems(newItems);
            }
        } else {
            setSelectedItem(item);
        }
    }, [activeTab, combinationItems]);

    const handleToggleDisassemblySelection = useCallback((itemId: string) => {
        setSelectedForDisassembly(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    }, []);

    const { blacksmithLevel, blacksmithXp, inventory, inventorySlots } = currentUserWithStatus;

    const GRADE_NAMES_KO: Record<ItemGrade, string> = {
        normal: '일반',
        uncommon: '고급',
        rare: '희귀',
        epic: '에픽',
        legendary: '전설',
        mythic: '신화',
    };

    const currentLevel = blacksmithLevel ?? 1;
    const isMaxLevel = currentLevel >= BLACKSMITH_MAX_LEVEL;
    const currentLevelIndex = currentLevel - 1;
    const nextLevelIndex = isMaxLevel ? currentLevelIndex : currentLevel;

    const maxCombinableGrade = BLACKSMITH_COMBINABLE_GRADES_BY_LEVEL[currentLevelIndex];
    const maxCombinableGradeIndex = GRADE_ORDER.indexOf(maxCombinableGrade);

    const disabledItemIds = useMemo(() => {
        if (activeTab === 'combine') {
            const firstItemGrade = combinationItems[0]?.grade;
            const combinationItemIds = combinationItems.map(i => i?.id).filter(Boolean) as string[];

            return inventory
                .filter(item => {
                    // Disable if already in a combination slot
                    if (combinationItemIds.includes(item.id)) return true;
                    // Disable if equipped
                    if (item.isEquipped) return true;
                    // Disable if grade is too high for blacksmith level
                    if (GRADE_ORDER.indexOf(item.grade) > maxCombinableGradeIndex) return true;
                    // If a first item is selected, disable items of different grades
                    if (firstItemGrade && item.grade !== firstItemGrade) return true;
                    
                    return false;
                })
                .map(item => item.id);
        } else if (activeTab === 'disassemble') {
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

            return inventory
                .filter(item => {
                    // Disable if equipped
                    if (item.isEquipped) return true;
                    // Disable if in a preset
                    if (presetItemIds.has(item.id)) return true;
                    
                    return false;
                })
                .map(item => item.id);
        }
        return [];
    }, [activeTab, inventory, combinationItems, maxCombinableGradeIndex, currentUserWithStatus.equipmentPresets]);

    const tabs = [
        { id: 'enhance', label: '장비 강화' },
        { id: 'combine', label: '장비 합성' },
        { id: 'disassemble', label: '장비 분해' },
        { id: 'convert', label: '재료 변환' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'enhance': return <EnhancementView 
                selectedItem={selectedItem} 
                currentUser={currentUserWithStatus} 
                onAction={handlers.handleAction} 
                enhancementOutcome={enhancementOutcome} 
                onOutcomeConfirm={handlers.clearEnhancementOutcome} 
            />;
            case 'combine': return <CombinationView 
                items={combinationItems}
                onRemoveItem={(index) => {
                    const newItems = [...combinationItems];
                    newItems[index] = null;
                    setCombinationItems(newItems);
                }}
                onAction={handlers.handleAction} 
                currentUser={currentUserWithStatus}
            />;
            case 'disassemble': return (
                <DisassemblyView
                    onAction={handlers.handleAction}
                    selectedForDisassembly={selectedForDisassembly}
                    onToggleDisassemblySelection={handleToggleDisassemblySelection}
                />
            );
            case 'convert': return <ConversionView onAction={handlers.handleAction} />;
            default: return null;
        }
    };

    const filteredInventory = useMemo(() => {
        let filtered: InventoryItem[] = [];
        if (activeTab === 'enhance' || activeTab === 'combine' || activeTab === 'disassemble') {
            filtered = inventory.filter(item => item.type === 'equipment');
        } else if (activeTab === 'convert') {
            filtered = inventory.filter(item => item.type === 'material');
        } else {
            filtered = inventory;
        }

        // 정렬 적용
        const sorted = [...filtered].sort((a, b) => {
            switch (sortOption) {
                case 'grade':
                    const gradeOrder = GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade);
                    if (gradeOrder !== 0) return gradeOrder;
                    return (b.stars || 0) - (a.stars || 0);
                case 'stars':
                    const starsDiff = (b.stars || 0) - (a.stars || 0);
                    if (starsDiff !== 0) return starsDiff;
                    return GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade);
                case 'name':
                    return a.name.localeCompare(b.name, 'ko');
                case 'date':
                    return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
                default:
                    return 0;
            }
        });

        return sorted;
    }, [inventory, activeTab, sortOption]);

    const inventorySlotsToDisplay = (() => {
        const slots = inventorySlots || {};
        if (activeTab === 'enhance' || activeTab === 'combine' || activeTab === 'disassemble') {
            return slots.equipment || 30;
        } else if (activeTab === 'convert') {
            return slots.material || 30;
        }
        return 30;
    })();

    const bagHeaderText = useMemo(() => {
        if (activeTab === 'enhance' || activeTab === 'combine' || activeTab === 'disassemble') {
            return '장비';
        } else if (activeTab === 'convert') {
            return '재료';
        }
        return '가방'; // Default or fallback
    }, [activeTab]);

    return (
        <>
            <DraggableWindow 
                title="대장간" 
                onClose={onClose} 
                isTopmost={isTopmost && !modals.isBlacksmithHelpOpen && !modals.disassemblyResult}
                initialWidth={1100}
                initialHeight={900}
                windowId="blacksmith"
                zIndex={50}
            >
                <div className="flex h-full min-h-0">
                    {/* Left Panel */}
                    <div className="w-[360px] bg-tertiary/30 p-4 flex flex-col items-center gap-4 flex-shrink-0 overflow-hidden">
                        <div className="w-full aspect-w-3 aspect-h-2 prism-border rounded-lg overflow-hidden relative flex-shrink-0">
                            <img src="/images/equipments/moru.png" alt="Blacksmith" className="w-full h-full object-cover" />
                            <button onClick={handlers.openBlacksmithHelp} className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center transition-transform hover:scale-110">
                                <img src="/images/button/help.png" alt="도움말" className="w-full h-full" />
                            </button>
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-bold">대장간 <span className="text-yellow-400">Lv.{(blacksmithLevel ?? 1)}</span></h2>
                        </div>
                        <div className="w-full">
                            <div className="flex justify-between text-xs mb-1">
                                <span>경험치</span>
                                <span>{(blacksmithXp ?? 0)} / {BLACKSMITH_XP_REQUIRED_FOR_LEVEL_UP(blacksmithLevel ?? 1)} ({Math.round(((blacksmithXp ?? 0) / BLACKSMITH_XP_REQUIRED_FOR_LEVEL_UP(blacksmithLevel ?? 1)) * 100)}%)</span>
                            </div>
                            <div className="w-full bg-black/50 rounded-full h-3 border border-color">
                                <div className="bg-yellow-500 h-full rounded-full transition-all" style={{ width: `${((blacksmithXp ?? 0) / BLACKSMITH_XP_REQUIRED_FOR_LEVEL_UP(blacksmithLevel ?? 1)) * 100}%` }}></div>
                            </div>
                        </div>
                        <div className="w-full text-left flex-1 min-h-0 overflow-y-auto">
                            <div className="flex justify-between text-sm font-bold text-gray-400 px-2 pb-1 border-b border-gray-600 mb-1">
                                <span>효과</span>
                                <span>
                                    Lv.{currentLevel}
                                    {!isMaxLevel && <span className="text-yellow-400"> → Lv.{currentLevel + 1}</span>}
                                </span>
                            </div>
                            <div className="text-sm text-secondary space-y-2">
                                <div className="bg-black/20 p-2 rounded-md">
                                    <div className="flex justify-between">
                                        <span>합성 가능 등급</span>
                                        <span>
                                            {GRADE_NAMES_KO[BLACKSMITH_COMBINABLE_GRADES_BY_LEVEL[currentLevelIndex]]}
                                            {!isMaxLevel && 
                                                <span className="text-yellow-400"> → {GRADE_NAMES_KO[BLACKSMITH_COMBINABLE_GRADES_BY_LEVEL[nextLevelIndex]]}</span>
                                            }
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-black/20 p-2 rounded-md">
                                    <div className="flex justify-between">
                                        <span>장비 분해 대박 확률</span>
                                        <span>
                                            {BLACKSMITH_DISASSEMBLY_JACKPOT_RATES[currentLevelIndex]}%
                                            {!isMaxLevel && 
                                                <span className="text-yellow-400"> → {BLACKSMITH_DISASSEMBLY_JACKPOT_RATES[nextLevelIndex]}%</span>
                                            }
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-black/20 p-2 rounded-md">
                                    <div className="flex justify-between">
                                        <span>재료 분해/합성 대박 확률</span>
                                        <span>
                                            {BLACKSMITH_DISASSEMBLY_JACKPOT_RATES[currentLevelIndex]}%
                                            {!isMaxLevel && 
                                                <span className="text-yellow-400"> → {BLACKSMITH_DISASSEMBLY_JACKPOT_RATES[nextLevelIndex]}%</span>
                                            }
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-black/20 p-2 rounded-md">
                                    <p className="font-semibold">합성 대성공 확률:</p>
                                    {GRADE_ORDER.map(grade => {
                                        const rate = BLACKSMITH_COMBINATION_GREAT_SUCCESS_RATES[currentLevelIndex]?.[grade] ?? 0;
                                        const nextRate = BLACKSMITH_COMBINATION_GREAT_SUCCESS_RATES[nextLevelIndex]?.[grade];

                                        return (
                                            <div key={grade} className="flex justify-between pl-2">
                                                <span>{GRADE_NAMES_KO[grade]}</span>
                                                <span>
                                                    {rate}%
                                                    {!isMaxLevel && nextRate !== undefined &&
                                                        <span className="text-yellow-400"> → {nextRate}%</span>
                                                    }
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel */}
                    <div className="flex-1 bg-primary p-4 flex flex-col min-w-0 min-h-0">
                        <div className="flex border-b border-color mb-4">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => onSetActiveTab(tab.id as 'enhance' | 'combine' | 'disassemble' | 'convert')}
                                    className={`px-4 py-2 text-sm font-semibold ${
                                        activeTab === tab.id
                                            ? 'border-b-2 border-accent text-accent'
                                            : 'text-secondary hover:bg-secondary/20'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="p-4 bg-tertiary/20 rounded-lg flex-1 min-h-0 overflow-hidden">
                            {renderContent()}
                        </div>
                        <div className="mt-4 flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-bold text-on-panel">{bagHeaderText}</h3>
                                <select
                                    value={sortOption}
                                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                                    className="bg-secondary border border-color text-on-panel text-xs rounded px-2 py-1"
                                >
                                    <option value="grade">등급순</option>
                                    <option value="stars">강화순</option>
                                    <option value="name">이름순</option>
                                    <option value="date">최신순</option>
                                </select>
                            </div>
                            <div className="h-[130px] overflow-y-auto pr-1">
                                <InventoryGrid 
                                    inventory={filteredInventory} 
                                    inventorySlots={inventorySlotsToDisplay} 
                                    onSelectItem={handleSelectItem} 
                                    selectedItemId={selectedItem?.id || null} 
                                    disabledItemIds={disabledItemIds}
                                    selectedItemIdsForDisassembly={activeTab === 'disassemble' ? selectedForDisassembly : undefined}
                                    onToggleDisassemblySelection={activeTab === 'disassemble' ? handleToggleDisassemblySelection : undefined}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </DraggableWindow>

            <DisassemblyResultModal
                isOpen={!!modals.disassemblyResult}
                onClose={handlers.closeDisassemblyResult}
                result={modals.disassemblyResult}
            />
        </>
    );
};

export default BlacksmithModal;