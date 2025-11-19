
import React, { useEffect } from 'react';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import { InventoryItem, ItemGrade, ItemOption, CoreStat, SpecialStat, MythicStat } from '../types.js';
import { audioService } from '../services/audioService.js';
import { GRADE_LEVEL_REQUIREMENTS } from '../constants';

interface ItemObtainedModalProps {
    item: InventoryItem;
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
    rare: 'border-pulse-rare',
    epic: 'border-pulse-epic',
    legendary: 'border-pulse-legendary',
    mythic: 'border-pulse-mythic',
};

const getStarDisplayInfo = (stars: number) => {
    if (stars >= 10) {
        return { text: `(★${stars})`, colorClass: "prism-text-effect" };
    } else if (stars >= 7) {
        return { text: `(★${stars})`, colorClass: "text-blue-400" };
    } else if (stars >= 4) {
        return { text: `(★${stars})`, colorClass: "text-amber-400" };
    } else if (stars >= 1) {
        return { text: `(★${stars})`, colorClass: "text-white" };
    }
    return { text: "", colorClass: "text-white" };
};

const OptionSection: React.FC<{ title: string; options: ItemOption[]; color: string; }> = ({ title, options, color }) => {
    if (options.length === 0) return null;
    return (
        <div>
            <h5 className={`font-semibold ${color} border-b border-gray-600 pb-1 mb-1 text-sm`}>{title}</h5>
            <ul className="list-disc list-inside space-y-0.5 text-gray-300 text-xs">
                {options.map((opt, i) => <li key={i}>{opt.display}</li>)}
            </ul>
        </div>
    );
};

const renderOptions = (item: InventoryItem) => {
    if (!item.options) return null;
    const { main, combatSubs, specialSubs, mythicSubs } = item.options;
    return (
        <div className="w-full text-xs text-left space-y-2">
            <OptionSection title="주옵션" options={[main]} color="text-yellow-300" />
            <OptionSection title="전투 부옵션" options={combatSubs} color="text-blue-300" />
            <OptionSection title="특수 부옵션" options={specialSubs} color="text-green-300" />
            <OptionSection title="신화 부옵션" options={mythicSubs} color="text-red-400" />
        </div>
    )
};

const ItemObtainedModal: React.FC<ItemObtainedModalProps> = ({ item, onClose, isTopmost }) => {
    const styles = gradeStyles[item.grade];
    const requiredLevel = item.type === 'equipment' ? GRADE_LEVEL_REQUIREMENTS[item.grade] : null;
    const starInfo = getStarDisplayInfo(item.stars);
    const borderClass = gradeBorderStyles[item.grade];
    const isCurrency = item.image === '/images/icon/Gold.png' || item.image === '/images/icon/Zem.png';
    
    // 등급별 글로우 효과 클래스
    const getGlowClass = (grade: ItemGrade) => {
        switch (grade) {
            case 'rare': return 'item-glow-rare';
            case 'epic': return 'item-glow-epic';
            case 'legendary': return 'item-glow-legendary';
            case 'mythic': return 'item-glow-mythic';
            default: return '';
        }
    };
    
    // 등급별 텍스트 글로우 효과 클래스
    const getTextGlowClass = (grade: ItemGrade) => {
        switch (grade) {
            case 'rare': return 'text-glow-rare';
            case 'epic': return 'text-glow-epic';
            case 'legendary': return 'text-glow-legendary';
            case 'mythic': return 'text-glow-mythic';
            default: return '';
        }
    };
    
    const isHighGrade = ['rare', 'epic', 'legendary', 'mythic'].includes(item.grade);
    const glowClass = getGlowClass(item.grade);
    const textGlowClass = getTextGlowClass(item.grade);

    useEffect(() => {
        if (['epic', 'legendary', 'mythic'].includes(item.grade)) {
            audioService.gachaEpicOrHigher();
        }
    }, [item.grade]);

    return (
        <DraggableWindow title="아이템 획득" onClose={onClose} windowId="item-obtained" initialWidth={400} isTopmost={isTopmost} zIndex={70}>
            <div className="text-center">
                <div className="p-6 rounded-lg">
                    <div className="relative w-48 h-48 mx-auto rounded-lg mb-4 overflow-visible">
                        <div className={`relative w-full h-full rounded-lg flex items-center justify-center ${borderClass || 'border-2 border-black/50'} overflow-hidden ${isHighGrade ? 'item-reveal-animation' : ''} ${glowClass}`}>
                            <img src={styles.background} alt={item.grade} className="absolute inset-0 w-full h-full object-cover" />
                            {item.image && <img src={item.image} alt={item.name} className="relative w-full h-full object-contain p-4" />}
                            {isCurrency && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-sm p-1">
                                    <span className="text-white text-3xl font-bold text-center break-words" style={{ textShadow: '1px 1px 2px black' }}>
                                        +{item.quantity?.toLocaleString()}
                                    </span>
                                </div>
                            )}
                            {item.isDivineMythic && (
                                <div 
                                    className="absolute bottom-0 left-0 flex items-center justify-center bg-black/60 rounded-tr-md z-10" 
                                    style={{ 
                                        textShadow: '1px 1px 2px black',
                                        padding: '4px 6px',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        color: '#FFD700'
                                    }}
                                >
                                    D
                                </div>
                            )}
                        </div>
                    </div>
                    <p className={`font-bold text-lg ${styles.text} ${textGlowClass}`}>[{styles.name}]</p>
                    <div className="flex items-baseline justify-center gap-2">
                        <h2 className={`text-3xl font-bold ${starInfo.colorClass} ${textGlowClass}`}>{item.name}</h2>
                        {item.stars > 0 && <span className={`text-2xl font-bold ${starInfo.colorClass} ${textGlowClass}`}>{starInfo.text}</span>}
                    </div>
                    {requiredLevel && <p className="text-xs text-yellow-300">(착용 레벨 합: {requiredLevel})</p>}
                    {item.type === 'equipment' && (
                        <div className="w-full text-xs text-left space-y-2 mt-4 max-h-48 overflow-y-auto bg-black/20 p-2 rounded-md">
                            {renderOptions(item)}
                        </div>
                    )}
                </div>
                <Button onClick={onClose} className="w-full mt-6 py-2.5">확인</Button>
            </div>
        </DraggableWindow>
    );
};

export default ItemObtainedModal;
