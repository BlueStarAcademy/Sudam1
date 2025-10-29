import React from 'react';
import { InventoryItem, ItemGrade } from '../../types.js';
import Button from '../Button.js';

const gradeStyles: Record<ItemGrade, { name: string; color: string; }> = {
    normal: { name: '일반', color: 'text-gray-300' },
    uncommon: { name: '고급', color: 'text-green-400' },
    rare: { name: '희귀', color: 'text-blue-400' },
    epic: { name: '에픽', color: 'text-purple-400' },
    legendary: { name: '전설', color: 'text-red-500' },
    mythic: { name: '신화', color: 'text-orange-400' },
};

interface EnhancementViewProps {
    selectedItem: InventoryItem | null;
    onStartEnhance: (item: InventoryItem) => void;
}

const EnhancementView: React.FC<EnhancementViewProps> = ({ selectedItem, onStartEnhance }) => {
    if (!selectedItem) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <p>강화할 장비를 선택해주세요.</p>
            </div>
        );
    }

    const styles = gradeStyles[selectedItem.grade];

    return (
        <div className="flex flex-col items-center h-full">
            <h2 className="text-xl font-bold mb-4">장비 강화</h2>
            <div className="flex flex-col items-center">
                <img src={selectedItem.image || ''} alt={selectedItem.name} className="w-24 h-24" />
                <h3 className={`text-lg font-bold ${styles.color}`}>{selectedItem.name}</h3>
                <p className={`text-sm font-bold ${styles.color}`}>+{selectedItem.stars}</p>
            </div>
            <div className="mt-4">
                <Button onClick={() => onStartEnhance(selectedItem)} colorScheme="yellow" disabled={selectedItem.stars >= 10}>
                    강화
                </Button>
            </div>
        </div>
    );
};

export default EnhancementView;
