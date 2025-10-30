
import React from 'react';
import { InventoryItem, ItemGrade, ItemOption } from '../types.js';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';

interface ItemDetailModalProps {
    item: InventoryItem;
    isOwnedByCurrentUser: boolean;
    onClose: () => void;
    onStartEnhance: (item: InventoryItem) => void;
    isTopmost?: boolean;
}

const gradeStyles: Record<ItemGrade, { name: string; color: string; background: string; }> = {
    normal: { name: '일반', color: 'text-gray-300', background: '/images/equipments/normalbgi.png' },
    uncommon: { name: '고급', color: 'text-green-400', background: '/images/equipments/uncommonbgi.png' },
    rare: { name: '희귀', color: 'text-blue-400', background: '/images/equipments/rarebgi.png' },
    epic: { name: '에픽', color: 'text-purple-400', background: '/images/equipments/epicbgi.png' },
    legendary: { name: '전설', color: 'text-red-500', background: '/images/equipments/legendarybgi.png' },
    mythic: { name: '신화', color: 'text-orange-400', background: '/images/equipments/mythicbgi.png' },
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



const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, isOwnedByCurrentUser, onClose, onStartEnhance, isTopmost }) => {
    const styles = gradeStyles[item.grade];
    const starInfo = getStarDisplayInfo(item.stars);

    return (
        <DraggableWindow title="장비 상세 정보" onClose={onClose} windowId={`item-detail-${item.id}`} initialWidth={350} isTopmost={isTopmost}>
            <div className="flex flex-col h-full">
                {/* Top Section: Image (left), Name & Main Option (right) */}
                <div className="flex items-start justify-between mb-4">
                    {/* Left: Image */}
                    <div className="relative w-24 h-24 rounded-lg flex-shrink-0">
                        <img src={styles.background} alt={item.grade} className="absolute inset-0 w-full h-full object-cover rounded-lg" />
                        {item.image && <img src={item.image} alt={item.name} className="relative w-full h-full object-contain p-2"/>}
                    </div>
                    {/* Right: Name & Main Option */}
                    <div className="flex-grow text-right ml-4">
                        <div className="flex items-baseline justify-end gap-1">
                            <h3 className={`text-xl font-bold ${starInfo.colorClass}`}>{item.name}</h3>
                            {item.stars > 0 && <span className={`text-lg font-bold ${starInfo.colorClass}`}>{starInfo.text}</span>}
                        </div>
                        <p className="text-gray-400 text-sm">[{styles.name}]</p>
                        {item.options?.main && (
                            <p className="font-semibold text-yellow-300 text-sm">{item.options.main.display}</p>
                        )}
                    </div>
                </div>

                {/* Bottom Section: Sub Options */}
                <div className="w-full text-sm text-left space-y-2 bg-gray-900/50 p-3 rounded-lg flex-grow overflow-y-auto">
                    {item.options?.combatSubs && item.options.combatSubs.length > 0 && (
                        <div className="space-y-0.5">
                            {item.options.combatSubs.map((opt, i) => (
                                <p key={i} className="text-blue-300">{opt.display}</p>
                            ))}
                        </div>
                    )}
                    {item.options?.specialSubs && item.options.specialSubs.length > 0 && (
                        <div className="space-y-0.5">
                            {item.options.specialSubs.map((opt, i) => (
                                <p key={i} className="text-green-300">{opt.display}</p>
                            ))}
                        </div>
                    )}
                    {item.options?.mythicSubs && item.options.mythicSubs.length > 0 && (
                        <div className="space-y-0.5">
                            {item.options.mythicSubs.map((opt, i) => (
                                <p key={i} className="text-red-400">{opt.display}</p>
                            ))}
                        </div>
                    )}
                </div>

                {isOwnedByCurrentUser && item.type === 'equipment' && (
                    <div className="w-full mt-6 pt-4 border-t border-gray-700">
                        <Button
                            onClick={() => onStartEnhance(item)}
                            disabled={item.stars >= 10}
                            colorScheme="yellow"
                            className="w-full"
                        >
                            {item.stars >= 10 ? '최대 강화' : '강화하기'}
                        </Button>
                    </div>
                )}
            </div>
        </DraggableWindow>
    );
};

export default ItemDetailModal;
