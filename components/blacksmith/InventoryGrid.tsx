import React from 'react';
import { InventoryItem, ItemGrade } from '../../types.js';

const gradeBackgrounds: Record<ItemGrade, string> = {
    normal: '/images/equipments/normalbgi.png',
    uncommon: '/images/equipments/uncommonbgi.png',
    rare: '/images/equipments/rarebgi.png',
    epic: '/images/equipments/epicbgi.png',
    legendary: '/images/equipments/legendarybgi.png',
    mythic: '/images/equipments/mythicbgi.png',
};

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

interface InventoryGridProps {
    inventory: InventoryItem[];
    inventorySlots: number;
    onSelectItem: (item: InventoryItem) => void;
    selectedItemId: string | null;
    disabledItemIds?: string[];
    selectedItemIdsForDisassembly?: Set<string>; // New prop for disassembly selection
    onToggleDisassemblySelection?: (itemId: string) => void; // New prop for toggling disassembly selection
}

const InventoryGrid: React.FC<InventoryGridProps> = ({ inventory, inventorySlots, onSelectItem, selectedItemId, disabledItemIds = [], selectedItemIdsForDisassembly, onToggleDisassemblySelection }) => {
    const inventoryDisplaySlots = Array.from({ length: inventorySlots }, (_, index) => inventory[index] || null);

    return (
        <div 
            className="grid flex-grow pr-2 bg-tertiary/30 p-2 rounded-md" 
            style={{ 
                gridTemplateColumns: 'repeat(10, minmax(0, 1fr))',
                gap: '4px',
                width: '100%',
                minWidth: 0
            }}
        >
            {inventoryDisplaySlots.map((item, index) => {
                const isDisabled = item ? disabledItemIds.includes(item.id) : false;
                return (
                    <div
                        key={item ? item.id : `empty-${index}`}
                        onClick={() => {
                            if (!item || isDisabled) return;
                            if (selectedItemIdsForDisassembly && onToggleDisassemblySelection) {
                                onToggleDisassemblySelection(item.id);
                            } else {
                                onSelectItem(item);
                            }
                        }}
                        className={`relative aspect-square rounded-md transition-all duration-200 ${item ? 'hover:scale-105' : 'bg-tertiary/50'} ${isDisabled ? 'filter grayscale opacity-50 pointer-events-none' : 'cursor-pointer'}`}
                        style={{ width: '100%', minWidth: 0, minHeight: 0, maxWidth: '100%' }}
                    >
                        {item ? (
                            <>
                                <div className={`absolute inset-0 rounded-md border-2 ${selectedItemId === item.id ? 'border-accent ring-2 ring-accent' : 'border-black/20'} ${selectedItemIdsForDisassembly?.has(item.id) ? 'bg-gray-700/70' : ''} ${item.isDivineMythic ? 'divine-mythic-border' : ''}`} style={{ border: item.isDivineMythic ? undefined : undefined }} />
                                <img src={gradeBackgrounds[item.grade]} alt={item.grade} className="absolute inset-0 object-cover rounded-sm" style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%' }} />
                                {item.image && <img src={item.image} alt={item.name} className="relative object-contain p-1" style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%' }} />}
                                {renderStarDisplay(item.stars)}
                                {item.isEquipped && <div className="absolute top-0.5 right-0.5 text-xs font-bold text-white bg-blue-600/80 px-1 rounded-bl-md">E</div>}
                                {item.quantity && item.quantity > 1 && <span className="absolute bottom-0 right-0 text-xs font-bold text-white bg-black/60 px-1 rounded-tl-md">{item.quantity}</span>}
                                {item.isDivineMythic && (
                                    <div 
                                        className="absolute bottom-0 left-0 flex items-center justify-center bg-black/60 rounded-tr-md z-10" 
                                        style={{ 
                                            textShadow: '1px 1px 2px black',
                                            padding: '2px 3px',
                                            fontSize: '8px',
                                            fontWeight: 'bold',
                                            color: '#FFD700'
                                        }}
                                    >
                                        D
                                    </div>
                                )}
                                {selectedItemIdsForDisassembly?.has(item.id) && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800/70 rounded-md">
                                        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="bg-tertiary/50 w-full h-full rounded-md" />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default InventoryGrid;
