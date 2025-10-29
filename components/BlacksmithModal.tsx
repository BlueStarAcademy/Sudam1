import React, { useState, useMemo } from 'react';
import DraggableWindow from './DraggableWindow.js';
import EnhancementView from './blacksmith/EnhancementView.js';
import CombinationView from './blacksmith/CombinationView.js';
import DisassemblyView from './blacksmith/DisassemblyView.js';
import ConversionView from './blacksmith/ConversionView.js';
import InventoryGrid from './blacksmith/InventoryGrid.js';
import { useAppContext } from '../hooks/useAppContext.js';
import { InventoryItem } from '../types.js';

interface BlacksmithModalProps {
    onClose: () => void;
    isTopmost: boolean;
    onStartEnhance: (item: InventoryItem) => void;
}

const BlacksmithModal: React.FC<BlacksmithModalProps> = ({ onClose, isTopmost, onStartEnhance }) => {
    const { currentUserWithStatus, handlers } = useAppContext();
    const [activeTab, setActiveTab] = useState('enhance');
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

    if (!currentUserWithStatus) return null;

    const { blacksmithLevel, blacksmithXp, inventory, inventorySlots } = currentUserWithStatus;

    const tabs = [
        { id: 'enhance', label: '장비 강화' },
        { id: 'combine', label: '장비 합성' },
        { id: 'disassemble', label: '장비 분해' },
        { id: 'convert', label: '재료 변환' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'enhance': return <EnhancementView selectedItem={selectedItem} onStartEnhance={onStartEnhance} />;
            case 'combine': return <CombinationView onAction={handlers.handleAction} />;
            case 'disassemble': return <DisassemblyView onAction={handlers.handleAction} />;
            case 'convert': return <ConversionView onAction={handlers.handleAction} />;
            default: return null;
        }
    };

    const filteredInventory = useMemo(() => {
        if (activeTab === 'enhance' || activeTab === 'combine' || activeTab === 'disassemble') {
            return inventory.filter(item => item.type === 'equipment');
        } else if (activeTab === 'convert') {
            return inventory.filter(item => item.type === 'material');
        }
        return inventory;
    }, [inventory, activeTab]);

    const inventorySlotsToDisplay = useMemo(() => {
        if (activeTab === 'enhance' || activeTab === 'combine' || activeTab === 'disassemble') {
            return inventorySlots.equipment;
        } else if (activeTab === 'convert') {
            return inventorySlots.material;
        }
        return 0; // Should not happen given the tabs
    }, [activeTab, inventorySlots]);

    const bagHeaderText = useMemo(() => {
        if (activeTab === 'enhance' || activeTab === 'combine' || activeTab === 'disassemble') {
            return '장비';
        } else if (activeTab === 'convert') {
            return '재료';
        }
        return '가방'; // Default or fallback
    }, [activeTab]);

    return (
         <DraggableWindow title="대장간" onClose={onClose} isTopmost={isTopmost} initialWidth={950} windowId="blacksmith">
            <div className="flex h-full">
                {/* Left Panel */}
                <div className="w-1/3 bg-tertiary/30 p-4 flex flex-col items-center gap-4">
                    <div className="w-full aspect-w-3 aspect-h-2 prism-border rounded-lg overflow-hidden">
                        <img src="/images/equipments/moru.png" alt="Blacksmith" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-bold">대장간 <span className="text-yellow-400">Lv.1</span></h2>
                    </div>
                    <div className="w-full">
                        <div className="flex justify-between text-xs mb-1">
                            <span>경험치</span>
                            <span>{blacksmithXp} / 1000</span>
                        </div>
                        <div className="w-full bg-black/50 rounded-full h-4 border-2 border-color">
                            <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${(blacksmithXp / 1000) * 100}%` }}></div>
                        </div>
                    </div>
                    <div className="w-full text-center">
                        <h3 className="font-bold mb-2">대장간 효과</h3>
                        <p className="text-xs text-secondary">여기에 대장간 효과가 표시됩니다.</p>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="w-2/3 bg-primary p-4 flex flex-col">
                    <div className="flex border-b border-color mb-4">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
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
                    <div className="p-4 bg-tertiary/20 rounded-lg flex-1">
                        {renderContent()}
                    </div>
                    <div className="mt-4">
                        <h3 className="text-lg font-bold text-on-panel mb-2">{bagHeaderText}</h3>
                        <InventoryGrid 
                            inventory={filteredInventory} 
                            inventorySlots={inventorySlotsToDisplay} 
                            onSelectItem={setSelectedItem} 
                            selectedItemId={selectedItem?.id || null} 
                        />
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default BlacksmithModal;
