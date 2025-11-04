import React, { useEffect, useMemo } from 'react';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import { InventoryItem, ItemGrade } from '../types.js';
import { audioService } from '../services/audioService.js';
import { GRADE_LEVEL_REQUIREMENTS } from '../constants';

interface BulkItemObtainedModalProps {
    items: InventoryItem[];
    onClose: () => void;
    isTopmost?: boolean;
}

const gradeStyles: Record<ItemGrade, { bg: string, text: string, shadow: string, name: string, background: string }> = {
    normal: { bg: 'bg-gray-700', text: 'text-white', shadow: 'shadow-gray-900/50', name: '일반', background: '/images/equipments/normalbgi.png' },
    uncommon: { bg: 'bg-green-700', text: 'text-green-200', shadow: 'shadow-green-500/50', name: '고급', background: '/images/equipments/uncommonbgi.png' },
    rare: { bg: 'bg-blue-700', text: 'text-blue-200', shadow: 'shadow-blue-500/50', name: '희귀', background: '/images/equipments/rarebgi.png' },
    epic: { bg: 'bg-purple-700', text: 'text-purple-200', shadow: 'shadow-purple-500/50', name: '에픽', background: '/images/equipments/epicbgi.png' },
    legendary: { bg: 'bg-red-800', text: 'text-red-200', shadow: 'shadow-red-500/50', name: '전설', background: '/images/equipments/legendarybgi.png' },
    mythic: { bg: 'bg-orange-700', text: 'text-orange-200', shadow: 'shadow-orange-500/50', name: '신화', background: '/images/equipments/mythicbgi.png' },
};

const gradeBorderStyles: Partial<Record<ItemGrade, string>> = {
    rare: 'spinning-border-rare',
    epic: 'spinning-border-epic',
    legendary: 'spinning-border-legendary',
    mythic: 'spinning-border-mythic',
};


const BulkItemObtainedModal: React.FC<BulkItemObtainedModalProps> = ({ items, onClose, isTopmost }) => {
    useEffect(() => {
        if (items && items.length > 0) {
            const gradeOrder: ItemGrade[] = ['normal', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
            const bestItem = items.reduce((best, current) => {
                const bestGrade = best.grade || 'normal';
                const currentGrade = current.grade || 'normal';
                return gradeOrder.indexOf(currentGrade) > gradeOrder.indexOf(bestGrade) ? current : best;
            });
            if (['epic', 'legendary', 'mythic'].includes(bestItem.grade)) {
                audioService.gachaEpicOrHigher();
            }
        }
    }, [items]);

    const totalItems = useMemo(() => {
        return items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    }, [items]);

    return (
        <DraggableWindow title="상자 열기 결과" onClose={onClose} windowId="bulk-item-obtained" initialWidth={600} closeOnOutsideClick={false} isTopmost={isTopmost}>
            <div className="text-center">
                <h2 className="text-xl font-bold mb-4">아이템 {totalItems}개를 획득했습니다!</h2>
                <div className="grid grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto p-2 bg-gray-900/50 rounded-lg">
                    {items.map((item, index) => {
                        const styles = gradeStyles[item.grade];
                        const borderClass = gradeBorderStyles[item.grade];
                        const requiredLevel = item.type === 'equipment' ? GRADE_LEVEL_REQUIREMENTS[item.grade] : null;
                        const titleText = `${item.name}${requiredLevel ? ` (착용 레벨 합: ${requiredLevel})` : ''}`;
                        const isCurrency = item.image === '/images/icon/Gold.png' || item.image === '/images/icon/Zem.png';

                        return (
                            <div key={index} className="relative aspect-square rounded-md overflow-hidden" title={titleText}>
                                {borderClass && <div className={`absolute -inset-0.5 rounded-md ${borderClass}`}></div>}
                                <div className={`relative w-full h-full rounded-md flex items-center justify-center border-2 border-black/20 ${styles.bg}`}>
                                    <img src={styles.background} alt={item.grade} className="absolute inset-0 w-full h-full object-cover rounded-sm" />
                                    {item.image && <img src={item.image} alt={item.name} className="relative w-full h-full object-contain p-1" />}
                                    
                                    {isCurrency ? (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-sm p-1">
                                            <span className="text-white text-lg font-bold text-center break-words" style={{ textShadow: '1px 1px 2px black' }}>
                                                +{item.quantity?.toLocaleString()}
                                            </span>
                                        </div>
                                    ) : (
                                        item.quantity && item.quantity > 1 && (
                                            <span className="absolute bottom-0 right-0 text-xs font-bold text-white bg-black/60 px-1 rounded-tl-md">{item.quantity}</span>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <Button onClick={onClose} className="w-full mt-6 py-2.5">확인</Button>
            </div>
        </DraggableWindow>
    );
};

export default BulkItemObtainedModal;
