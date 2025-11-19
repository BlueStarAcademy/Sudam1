import React, { useMemo } from 'react';
import DraggableWindow from '../DraggableWindow.js';
import Button from '../Button.js';
import { InventoryItem } from '../../types.js';
import { gradeBackgrounds, gradeStyles } from '../../constants/items';

interface EnhancementResultModalProps {
    result: {
        message: string;
        success: boolean;
        itemBefore: InventoryItem;
        itemAfter: InventoryItem;
        xpGained?: number;
    };
    onClose: () => void;
    isTopmost?: boolean;
}

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

const ItemDisplay: React.FC<{ item: InventoryItem }> = ({ item }) => {
    const starInfo = getStarDisplayInfo(item.stars);
    return (
        <div className="flex flex-col items-center">
            <div className="relative w-20 h-20 mb-2">
                <img src={gradeBackgrounds[item.grade]} alt={item.grade} className="absolute inset-0 w-full h-full object-cover rounded-md" />
                {item.image && <img src={item.image} alt={item.name} className="relative w-full h-full object-contain p-1" />}
                <div className="absolute bottom-0 left-0 right-0 text-center text-xs font-bold bg-black/50 py-0.5">
                    <span className={starInfo.colorClass}>★{item.stars}</span>
                </div>
                {item.isDivineMythic && (
                    <div 
                        className="absolute bottom-0 left-0 flex items-center justify-center bg-black/60 rounded-tr-md z-10" 
                        style={{ 
                            textShadow: '1px 1px 2px black',
                            padding: '2px 4px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            color: '#FFD700'
                        }}
                    >
                        D
                    </div>
                )}
            </div>
            <p className={`font-bold text-sm ${gradeStyles[item.grade].color}`}>{item.name}</p>
        </div>
    );
};

const EnhancementResultModal: React.FC<EnhancementResultModalProps> = ({ result, onClose, isTopmost }) => {
    const { success, message, itemBefore, itemAfter, xpGained } = result;
    
    const changedSubOption = useMemo(() => {
        if (!success || !itemBefore.options || !itemAfter.options) return null;
        
        if (itemAfter.options.combatSubs.length > itemBefore.options.combatSubs.length) {
            const newSub = itemAfter.options.combatSubs.find(afterSub => 
                !itemBefore.options!.combatSubs.some(beforeSub => beforeSub.type === afterSub.type && beforeSub.isPercentage === afterSub.isPercentage)
            );
            return newSub ? { type: 'new', option: newSub } : null;
        }

        for (const afterSub of itemAfter.options.combatSubs) {
            const beforeSub = itemBefore.options.combatSubs.find(s => s.type === afterSub.type && s.isPercentage === afterSub.isPercentage);
            if (!beforeSub || beforeSub.value !== afterSub.value) {
                return { type: 'upgraded', before: beforeSub, after: afterSub };
            }
        }
        return null;
    }, [success, itemBefore, itemAfter]);

    const starInfoBefore = getStarDisplayInfo(itemBefore.stars);
    const starInfoAfter = getStarDisplayInfo(itemAfter.stars);

    const title = success ? '강화 성공!' : '강화 실패!';
    const titleColor = success ? 'text-green-400' : 'text-red-400';

    return (
        <DraggableWindow title={title} onClose={onClose} windowId="enhancementResult" initialWidth={500} isTopmost={isTopmost}>
            <div className="p-4 text-center">
                <div className={`text-6xl mb-4 ${success ? 'animate-bounce' : ''}`}>{success ? '🎉' : '💥'}</div>
                <h3 className={`text-2xl font-bold mb-2 ${titleColor}`}>
                    {success ? '강화 성공!' : '강화 실패...'}
                </h3>
                <p className="text-gray-300 mb-4">{message}</p>
                <div className="flex justify-around items-center mb-4">
                    <ItemDisplay item={itemBefore} />
                    <span className="text-2xl font-bold mx-4">{success ? '→' : 'X'}</span>
                    <ItemDisplay item={itemAfter} />
                </div>
                {success && (
                    <div className="bg-gray-800/50 p-3 rounded-lg mb-4 text-xs space-y-1 text-left">
                        <h4 className="font-bold text-center text-yellow-300 mb-2">변경 사항</h4>
                        <div className="flex justify-between">
                            <span>등급:</span> 
                            <span className="flex items-center gap-2">
                                <span className={starInfoBefore.colorClass}>{starInfoBefore.text || '(미강화)'}</span>
                                 → 
                                <span className={starInfoAfter.colorClass}>{starInfoAfter.text}</span>
                            </span>
                        </div>
                        {itemBefore.options && itemAfter.options && (
                            <div className="flex justify-between">
                                <span>주옵션:</span> 
                                <span className="truncate ml-2">{itemBefore.options.main.display} → {itemAfter.options.main.display}</span>
                            </div>
                        )}
                        {changedSubOption?.type === 'new' && changedSubOption.option && (
                            <div className="flex justify-between text-green-300">
                                <span>부옵션 추가:</span> 
                                <span className="truncate ml-2">{changedSubOption.option.display}</span>
                            </div>
                        )}
                        {changedSubOption?.type === 'upgraded' && changedSubOption.before && (
                            <div className="flex justify-between text-green-300">
                                <span>부옵션 강화:</span> 
                                <span className="truncate ml-2">{changedSubOption.before.display} → {changedSubOption.after.display}</span>
                            </div>
                        )}
                    </div>
                )}
                {xpGained !== undefined && xpGained > 0 && (
                    <div className="bg-gray-800/50 p-3 rounded-lg mb-4 text-center">
                        <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1">
                                <img src="/images/equipments/moru.png" alt="대장간 경험치" className="w-5 h-5" />
                                대장간 경험치:
                            </span>
                            <span className="font-bold text-orange-400">+{xpGained.toLocaleString()}</span>
                        </div>
                    </div>
                )}
                <Button
                    onClick={(e) => {
                        e?.stopPropagation();
                        onClose();
                    }}
                    colorScheme="blue"
                    className="mt-4 w-full"
                >
                    확인
                </Button>
            </div>
        </DraggableWindow>
    );
};

export default EnhancementResultModal;
