import React from 'react';
import DraggableWindow from '../DraggableWindow.js';
import { InventoryItem } from '../../types.js';
import { gradeBackgrounds, gradeStyles } from '../../constants/items.js';

interface EnhancementResultModalProps {
    result: {
        message: string;
        success: boolean;
        itemBefore: InventoryItem;
        itemAfter: InventoryItem;
    };
    onClose: () => void;
    isTopmost?: boolean;
}

const ItemDisplay: React.FC<{ item: InventoryItem }> = ({ item }) => (
    <div className="flex flex-col items-center">
        <div className="relative w-20 h-20 mb-2">
            <img src={gradeBackgrounds[item.grade]} alt={item.grade} className="absolute inset-0 w-full h-full object-cover rounded-md" />
            {item.image && <img src={item.image} alt={item.name} className="relative w-full h-full object-contain p-1" />}
            <div className="absolute bottom-0 left-0 right-0 text-center text-xs font-bold text-white bg-black/50 py-0.5">
                <span className="text-white">★{item.stars}</span>
            </div>
        </div>
        <p className={`font-bold ${gradeStyles[item.grade].color}`}>{item.name}</p>
    </div>
);

const EnhancementResultModal: React.FC<EnhancementResultModalProps> = ({ result, onClose, isTopmost }) => {
    const title = result.success ? '강화 성공!' : '강화 실패!';
    const titleColor = result.success ? 'text-green-400' : 'text-red-400';

    return (
        <DraggableWindow title={title} onClose={onClose} windowId="enhancementResult" initialWidth={400} isTopmost={isTopmost}>
            <div className="p-4 text-center">
                <h3 className={`text-xl font-bold mb-4 ${titleColor}`}>{result.message}</h3>
                <div className="flex justify-around items-center mb-4">
                    <ItemDisplay item={result.itemBefore} />
                    <span className="text-2xl font-bold mx-4">{result.success ? '->' : 'X'}</span>
                    <ItemDisplay item={result.itemAfter} />
                </div>
                <button
                    onClick={onClose}
                    className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md"
                >
                    확인
                </button>
            </div>
        </DraggableWindow>
    );
};

export default EnhancementResultModal;
