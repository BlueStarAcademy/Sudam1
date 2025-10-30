import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UserWithStatus, InventoryItem, ServerAction, ItemGrade, ItemOption } from '../../types.js';
import Button from '../Button.js';
import { ENHANCEMENT_SUCCESS_RATES, ENHANCEMENT_COSTS, MATERIAL_ITEMS, ENHANCEMENT_FAIL_BONUS_RATES } from '../../constants.js';

const gradeBackgrounds: Record<ItemGrade, string> = {
    normal: '/images/equipments/normalbgi.png',
    uncommon: '/images/equipments/uncommonbgi.png',
    rare: '/images/equipments/rarebgi.png',
    epic: '/images/equipments/epicbgi.png',
    legendary: '/images/equipments/legendarybgi.png',
    mythic: '/images/equipments/mythicbgi.png',
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

const EnhancementResultDisplay: React.FC<{ outcome: { message: string; success: boolean; itemBefore: InventoryItem; itemAfter: InventoryItem; } | null, onConfirm: () => void }> = ({ outcome, onConfirm }) => {
    if (!outcome) return null;

    const { success, message, itemBefore, itemAfter } = outcome;

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

    return (
        <div className="absolute inset-0 bg-gray-900/80 rounded-lg flex flex-col items-center justify-center z-20 animate-fade-in p-4">
            <div className={`text-6xl mb-4 ${success ? 'animate-bounce' : ''}`}>{success ? '🎉' : '💥'}</div>
            <h2 className={`text-3xl font-bold ${success ? 'text-green-400' : 'text-red-400'}`}>
                {success ? '강화 성공!' : '강화 실패...'}
            </h2>
            <p className="text-gray-300 mt-2 text-center">{message}</p>
            {success && (
                <div className="bg-gray-800/50 p-3 rounded-lg mt-4 w-full max-w-sm text-xs space-y-1">
                    <h4 className="font-bold text-center text-yellow-300 mb-2">변경 사항</h4>
                    <div className="flex justify-between">
                        <span>등급:</span> 
                        <span className="flex items-center gap-2">
                            <span className={starInfoBefore.colorClass}>{starInfoBefore.text || '(미강화)'}</span>
                             → 
                            <span className={starInfoAfter.colorClass}>{starInfoAfter.text}</span>
                        </span>
                    </div>
                    {itemBefore.options && itemAfter.options && <div className="flex justify-between"><span>주옵션:</span> <span className="truncate">{itemBefore.options.main.display} → {itemAfter.options.main.display}</span></div>}
                    {changedSubOption?.type === 'new' && changedSubOption.option && <div className="flex justify-between text-green-300"><span>부옵션 추가:</span> <span className="truncate">{changedSubOption.option.display}</span></div>}
                    {changedSubOption?.type === 'upgraded' && changedSubOption.before && <div className="flex justify-between text-green-300"><span>부옵션 강화:</span> <span className="truncate">{changedSubOption.before.display} → {changedSubOption.after.display}</span></div>}
                </div>
            )}
            <Button onClick={onConfirm} colorScheme="green" className="mt-6 w-full max-w-sm">확인</Button>
        </div>
    );
};

interface EnhancementViewProps {
    selectedItem: InventoryItem | null;
    currentUser: UserWithStatus;
    onAction: (action: ServerAction) => void;
    enhancementOutcome: { message: string; success: boolean; itemBefore: InventoryItem; itemAfter: InventoryItem; } | null;
    onOutcomeConfirm: () => void;
}

const EnhancementView: React.FC<EnhancementViewProps> = ({ selectedItem, currentUser, onAction, enhancementOutcome, onOutcomeConfirm }) => {
    const [isEnhancing, setIsEnhancing] = useState(false);

    // Moved all useMemo hooks to the top level and added null checks for selectedItem
    const costs = useMemo(() => {
        if (!selectedItem) return null;
        return ENHANCEMENT_COSTS[selectedItem.grade]?.[selectedItem.stars];
    }, [selectedItem]);

    const userLevelSum = currentUser ? currentUser.strategyLevel + currentUser.playfulLevel : 0; // Added null check for currentUser

    const levelRequirement = useMemo(() => {
        if (!selectedItem) return 0;
        const nextStars = selectedItem.stars + 1;
        if (nextStars === 4) return 3;
        if (nextStars === 7) return 8;
        if (nextStars === 10) return 15;
        return 0;
    }, [selectedItem]);

    const meetsLevelRequirement = userLevelSum >= levelRequirement;

    const userMaterials = useMemo(() => {
        if (!currentUser) return {};
        const counts: Record<string, number> = {};
        for (const material of Object.keys(MATERIAL_ITEMS)) {
            counts[material] = currentUser.inventory
                .filter(i => i.name === material)
                .reduce((sum, i) => sum + (i.quantity || 0), 0);
        }
        return counts;
    }, [currentUser]);

    const canEnhance = useMemo(() => {
        if (!selectedItem) return false;
        if (!costs) return false;
        if (levelRequirement > 0 && !meetsLevelRequirement) return false;
        return costs.every(cost => userMaterials[cost.name] >= cost.amount);
    }, [costs, userMaterials, levelRequirement, meetsLevelRequirement, selectedItem]);

    const { mainOptionPreview, subOptionPreview } = useMemo(() => {
        if (!selectedItem) {
            return { mainOptionPreview: '', subOptionPreview: '' };
        }
        if (!selectedItem.options || selectedItem.stars >= 10) return { mainOptionPreview: '최대 강화', subOptionPreview: '' };

        const { main, combatSubs } = selectedItem.options;
        const mainBaseValue = main.baseValue;

        if (!mainBaseValue) {
            return { mainOptionPreview: 'N/A', subOptionPreview: 'N/A' };
        }
        
        let increaseMultiplier = 1;
        if ([3, 6, 9].includes(selectedItem.stars)) {
            increaseMultiplier = 2;
        }
        const increaseAmount = mainBaseValue * increaseMultiplier;
        const newValue = main.value + increaseAmount;
        
        const mainPrev = `${main.type} +${main.value.toFixed(2).replace(/\.00$/, '')}${main.isPercentage ? '%' : ''}`;
        const mainNext = `+${newValue.toFixed(2).replace(/\.00$/, '')}${main.isPercentage ? '%' : ''}`;
        const mainOptionPreview = `${mainPrev} → ${mainNext}`;

        const subOptionPreview = combatSubs.length < 4 ? '신규 전투 부옵션 1개 추가' : '기존 전투 부옵션 1개 강화';
        
        return { mainOptionPreview, subOptionPreview };
    }, [selectedItem]);
    
    const starInfoCurrent = useMemo(() => {
        if (!selectedItem) return { text: "", colorClass: "text-white" };
        return getStarDisplayInfo(selectedItem.stars);
    }, [selectedItem]);

    const starInfoNext = useMemo(() => {
        if (!selectedItem || selectedItem.stars >= 10) return null;
        return getStarDisplayInfo(selectedItem.stars + 1);
    }, [selectedItem]);

    const buttonText = useMemo(() => {
        if (!selectedItem) return '강화할 장비를 선택해주세요.';
        if (isEnhancing) return '강화 중...';
        if (selectedItem.stars >= 10) return '최대 강화';
        if (levelRequirement > 0 && !meetsLevelRequirement) return `레벨 부족 (합 ${levelRequirement} 필요)`;
        if (!costs) return '강화 정보 없음';
        if (!canEnhance) return '재료 부족';
        return `강화하기 (+${selectedItem.stars + 1})`;
    }, [isEnhancing, selectedItem, levelRequirement, meetsLevelRequirement, costs, canEnhance]);

    useEffect(() => {
        setIsEnhancing(false);
    }, [selectedItem]);

    if (!selectedItem) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <p>강화할 장비를 선택해주세요.</p>
            </div>
        );
    }

    const baseSuccessRate = ENHANCEMENT_SUCCESS_RATES[selectedItem.stars];
    const failBonusRate = ENHANCEMENT_FAIL_BONUS_RATES[selectedItem.grade] || 0.5;
    const failBonus = (selectedItem.enhancementFails || 0) * failBonusRate;

    const handleEnhanceClick = () => {
        if (!canEnhance || isEnhancing) return;
        setIsEnhancing(true);
        onAction({ type: 'ENHANCE_ITEM', payload: { itemId: selectedItem.id } });
    };

    return (
        <div className="relative h-full">
            <EnhancementResultDisplay outcome={enhancementOutcome} onConfirm={onOutcomeConfirm} />
            
            <div className="flex flex-row gap-6 h-full">
                <div className="w-1/2 flex flex-col items-center gap-4 bg-gray-900/40 p-4 rounded-lg">
                    <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg flex-shrink-0">
                        <img src={gradeBackgrounds[selectedItem.grade]} alt={selectedItem.grade} className="absolute inset-0 w-full h-full object-cover rounded-lg" />
                        {selectedItem.image && <img src={selectedItem.image} alt={selectedItem.name} className="relative w-full h-full object-contain p-4" />}
                    </div>
                    <div className="flex items-baseline justify-center gap-1">
                        <h3 className={`text-lg sm:text-xl font-bold ${starInfoCurrent.colorClass}`}>{selectedItem.name}</h3>
                        {selectedItem.stars > 0 && <span className={`text-lg sm:text-xl font-bold ${starInfoCurrent.colorClass}`}>{starInfoCurrent.text}</span>}
                    </div>
                    <div className="w-full text-left space-y-2 bg-gray-800/50 p-3 rounded-md overflow-y-auto flex-grow">
                        {selectedItem.options && (
                            <>
                                <OptionSection title="주옵션" options={[selectedItem.options.main]} color="text-yellow-300" />
                                <OptionSection title="전투 부옵션" options={selectedItem.options.combatSubs} color="text-blue-300" />
                                <OptionSection title="특수 부옵션" options={selectedItem.options.specialSubs} color="text-green-300" />
                                <OptionSection title="신화 부옵션" options={selectedItem.options.mythicSubs} color="text-red-400" />
                            </>
                        )}
                    </div>
                </div>

                <div className="w-1/2 space-y-3 flex flex-col">
                    <div className="bg-gray-900/50 p-3 rounded-lg">
                        <h4 className="font-semibold text-center mb-2 text-green-300">강화 성공 시</h4>
                        <div className="space-y-1 text-xs sm:text-sm text-left">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">등급:</span>
                                <div className="font-mono text-white flex items-center gap-2">
                                    <span className={starInfoCurrent.colorClass}>{starInfoCurrent.text || '(★0)'}</span>
                                     → 
                                    {starInfoNext ? <span className={starInfoNext.colorClass}>{starInfoNext.text}</span> : '-'}
                                </div> 
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">주옵션:</span>
                                <span className="font-mono text-white">{mainOptionPreview}</span> 
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">부옵션:</span>
                                <span className="font-mono text-white">{selectedItem.stars < 10 ? subOptionPreview : ''}</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-900/50 p-3 rounded-lg">
                        <h4 className="font-semibold text-center mb-2">필요 재료</h4>
                        <div className="space-y-1 text-sm">
                            {costs?.map(cost => {
                                const userHas = userMaterials[cost.name] || 0;
                                const hasEnough = userHas >= cost.amount;
                                return (
                                    <div key={cost.name} className="flex justify-between items-center">
                                        <span className="flex items-center gap-2">
                                            <img src={MATERIAL_ITEMS[cost.name].image!} alt={cost.name} className="w-6 h-6" />
                                            {cost.name}
                                        </span>
                                        <span className={`font-mono ${hasEnough ? 'text-green-400' : 'text-red-400'}`}>
                                            {userHas.toLocaleString()} / {cost.amount.toLocaleString()}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="bg-gray-900/50 p-3 rounded-lg text-center flex-grow flex flex-col justify-center">
                        <h4 className="font-semibold mb-1">강화 성공 확률</h4>
                         <p className="text-3xl font-bold text-yellow-300">
                            {baseSuccessRate}%
                            {failBonus > 0 && <span className="text-xl text-green-400 ml-2">(+{failBonus.toFixed(1).replace(/\.0$/, '')}%)</span>}
                        </p>
                    </div>
                    <Button
                        onClick={handleEnhanceClick}
                        disabled={!canEnhance || isEnhancing || selectedItem.stars >= 10}
                        colorScheme="yellow"
                        className="w-full py-3 mt-auto"
                    >
                        {buttonText}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EnhancementView;
