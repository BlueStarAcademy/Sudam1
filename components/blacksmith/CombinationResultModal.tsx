
import React from 'react';
import DraggableWindow from '../DraggableWindow';
import { InventoryItem, ItemGrade } from '../../types';
import Button from '../Button';

// This is the same detailed item display used in the EnhancementView
const gradeStyles: Record<ItemGrade, { name: string; color: string; background: string; }> = {
    normal: { name: '일반', color: 'text-gray-300', background: '/images/equipments/normalbgi.png' },
    uncommon: { name: '고급', color: 'text-green-400', background: '/images/equipments/uncommonbgi.png' },
    rare: { name: '희귀', color: 'text-blue-400', background: '/images/equipments/rarebgi.png' },
    epic: { name: '에픽', color: 'text-purple-400', background: '/images/equipments/epicbgi.png' },
    legendary: { name: '전설', color: 'text-red-500', background: '/images/equipments/legendarybgi.png' },
    mythic: { name: '신화', color: 'text-orange-400', background: '/images/equipments/mythicbgi.png' },
};

const renderStarDisplay = (stars: number) => {
    if (stars === 0) return null;
    let starImage = '';
    if (stars >= 10) starImage = '/images/equipments/Star4.png';
    else if (stars >= 7) starImage = '/images/equipments/Star3.png';
    else if (stars >= 4) starImage = '/images/equipments/Star2.png';
    else if (stars >= 1) starImage = '/images/equipments/Star1.png';

    return (
        <div className="absolute top-0.5 left-0.5 flex items-center gap-0.5 bg-black/40 rounded-br-md px-1 py-0.5 z-10" style={{ textShadow: '1px 1px 2px black' }}>
            <img src={starImage} alt="star" className="w-3 h-3" />
            <span className={`font-bold text-xs leading-none`}>{stars}</span>
        </div>
    );
};

const ItemDisplay: React.FC<{ item: InventoryItem }> = ({ item }) => {
    const styles = gradeStyles[item.grade];
    return (
        <div className="flex flex-col w-full h-full p-1 bg-black/20 rounded-lg">
            <div className="flex mb-2">
                <div className="relative w-20 h-20 rounded-lg flex-shrink-0 mr-3">
                    <img src={styles.background} alt={item.grade} className="absolute inset-0 w-full h-full object-cover rounded-lg" />
                    {item.image && <img src={item.image} alt={item.name} className="relative w-full h-full object-contain p-1"/>}
                    {renderStarDisplay(item.stars)}
                </div>
                <div className="flex-grow overflow-hidden pt-2">
                    <h3 className={`text-lg font-bold truncate ${styles.color}`}>{item.name}</h3>
                    {item.options?.main && (
                        <p className="font-semibold text-yellow-300 text-sm truncate">{item.options.main.display}</p>
                    )}
                </div>
            </div>
            <div className="w-full text-sm text-left space-y-1 bg-black/30 p-2 rounded-lg flex-grow overflow-y-auto">
                {item.options?.combatSubs && item.options.combatSubs.length > 0 && (
                    <div className="space-y-0.5">
                        {item.options.combatSubs.map((opt, i) => <p key={`c-${i}`} className="text-blue-300">{opt.display}</p>)}
                    </div>
                )}
                {item.options?.specialSubs && item.options.specialSubs.length > 0 && (
                     <div className="space-y-0.5">
                        {item.options.specialSubs.map((opt, i) => <p key={`s-${i}`} className="text-green-300">{opt.display}</p>)}
                    </div>
                )}
                {item.options?.mythicSubs && item.options.mythicSubs.length > 0 && (
                     <div className="space-y-0.5">
                        {item.options.mythicSubs.map((opt, i) => <p key={`m-${i}`} className="text-red-400">{opt.display}</p>)}
                    </div>
                )}
            </div>
        </div>
    );
};

interface CombinationResultModalProps {
    result: {
        item: InventoryItem;
        xpGained: number;
        isGreatSuccess: boolean;
    };
    onClose: () => void;
    isTopmost?: boolean;
}

const CombinationResultModal: React.FC<CombinationResultModalProps> = ({ result, onClose }) => {
    const { item, xpGained, isGreatSuccess } = result;

    return (
        <DraggableWindow 
            title={isGreatSuccess ? "합성 대성공!" : "합성 성공"} 
            onClose={onClose} 
            windowId="combination-result"
            initialWidth={400}
        >
            <div className="text-center flex flex-col items-center">
                <div className="w-full max-w-xs">
                    <ItemDisplay item={item} />
                </div>
                
                <div className="mt-4 bg-gray-900/50 p-4 rounded-lg text-lg w-full max-w-xs">
                    <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1"><img src="/images/equipments/moru.png" alt="대장간 경험치" className="w-5 h-5" /> 대장간 경험치:</span>
                        <span className="font-bold text-orange-400">+{xpGained.toLocaleString()}</span>
                    </div>
                </div>

                <Button onClick={onClose} className="w-full mt-6 py-2.5 max-w-xs">확인</Button>
            </div>
        </DraggableWindow>
    );
};

export default CombinationResultModal;
