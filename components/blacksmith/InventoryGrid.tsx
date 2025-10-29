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
}

const InventoryGrid: React.FC<InventoryGridProps> = ({ inventory, inventorySlots, onSelectItem, selectedItemId }) => {
    const inventoryDisplaySlots = Array.from({ length: inventorySlots }, (_, index) => inventory[index] || null);

    return (
        <div className="grid grid-cols-8 gap-1 flex-grow overflow-y-auto pr-2 bg-tertiary/30 p-2 rounded-md">
            {inventoryDisplaySlots.map((item, index) => (
                <div
                    key={item?.id || `empty-${index}`}
                    onClick={() => item && onSelectItem(item)}
                    className={`relative aspect-square rounded-md transition-all duration-200 ${item ? 'hover:scale-105' : 'bg-tertiary/50'} cursor-pointer`}
                >
                    {item && (
                        <>
                            <div className={`absolute inset-0 rounded-md border-2 ${selectedItemId === item.id ? 'border-accent ring-2 ring-accent' : 'border-black/20'}`} />
                            <img src={gradeBackgrounds[item.grade]} alt={item.grade} className="absolute inset-0 w-full h-full object-cover rounded-sm" />
                            {item.image && <img src={item.image} alt={item.name} className="relative w-full h-full object-contain p-1" />}
                            {item.isEquipped && <div className="absolute top-0.5 right-0.5 text-xs font-bold text-white bg-blue-600/80 px-1 rounded-bl-md">E</div>}
                            {item.quantity && item.quantity > 1 && <span className="absolute bottom-0 right-0 text-xs font-bold text-white bg-black/60 px-1 rounded-tl-md">{item.quantity}</span>}
                            {item.type === 'equipment' && renderStarDisplay(item.stars)}
                        </>
                    )}
                </div>
            ))}
        </div>
    );
};

export default InventoryGrid;
