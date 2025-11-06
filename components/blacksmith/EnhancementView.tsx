
import React, { useState, useMemo, useEffect } from 'react';
import { UserWithStatus, InventoryItem, ServerAction, ItemGrade, ItemOption } from '../../types.js';
import Button from '../Button.js';
import { ENHANCEMENT_SUCCESS_RATES, ENHANCEMENT_COSTS, MATERIAL_ITEMS, ENHANCEMENT_FAIL_BONUS_RATES, GRADE_LEVEL_REQUIREMENTS, calculateEnhancementGoldCost, gradeBackgrounds, gradeStyles } from '../../constants';
import { useAppContext } from '../../hooks/useAppContext.js';

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

const ItemDisplay: React.FC<{ item: InventoryItem; currentUser: UserWithStatus }> = ({ item, currentUser }) => {
    const styles = gradeStyles[item.grade];

    const requiredLevel = GRADE_LEVEL_REQUIREMENTS[item.grade];
    const userLevelSum = (currentUser?.strategyLevel || 0) + (currentUser?.playfulLevel || 0);
    const canEquip = userLevelSum >= requiredLevel;

    return (
        <div className="flex flex-col w-full h-full p-1">
            {/* Top section: Image and Name/Main Option */}
            <div className="flex mb-2">
                <div className="relative w-20 h-20 rounded-lg flex-shrink-0 mr-3">
                    <img src={styles.background} alt={item.grade} className="absolute inset-0 w-full h-full object-cover rounded-lg" />
                    {item.image && <img src={item.image} alt={item.name} className="relative w-full h-full object-contain p-1"/>}
                    {renderStarDisplay(item.stars)}
                </div>
                <div className="flex-grow overflow-hidden pt-2">
                    <h3 className={`text-lg font-bold truncate ${styles.color}`}>{item.name}</h3>
                    <p className={`text-xs ${canEquip ? 'text-gray-500' : 'text-red-500'}`}>(착용레벨: {requiredLevel})</p>
                    {item.options?.main && (
                        <p className="font-semibold text-yellow-300 text-sm truncate">{item.options.main.display}</p>
                    )}
                </div>
            </div>
            {/* Bottom section: Full-width sub-options */}
            <div className="w-full text-sm text-left space-y-1 bg-black/30 p-2 rounded-lg flex-grow overflow-y-auto">
                {item.options?.combatSubs && item.options.combatSubs.length > 0 && (
                    <div className="space-y-0.5">
                        {item.options.combatSubs.map((opt, i) => (
                            <p key={`c-${i}`} className="text-blue-300">{opt.display}</p>
                        ))}
                    </div>
                )}
                {item.options?.specialSubs && item.options.specialSubs.length > 0 && (
                     <div className="space-y-0.5">
                        {item.options.specialSubs.map((opt, i) => (
                            <p key={`s-${i}`} className="text-green-300">{opt.display}</p>
                        ))}
                    </div>
                )}
                {item.options?.mythicSubs && item.options.mythicSubs.length > 0 && (
                     <div className="space-y-0.5">
                        {item.options.mythicSubs.map((opt, i) => (
                            <p key={`m-${i}`} className="text-red-400">{opt.display}</p>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
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



interface EnhancementViewProps {
    selectedItem: InventoryItem | null;
    currentUser: UserWithStatus;
    onAction: (action: ServerAction) => void;
    enhancementOutcome: { message: string; success: boolean; itemBefore: InventoryItem; itemAfter: InventoryItem; } | null;
    onOutcomeConfirm: () => void;
}

const EnhancementView: React.FC<EnhancementViewProps> = ({ selectedItem, currentUser, onAction, enhancementOutcome, onOutcomeConfirm }) => {
    const [isEnhancing, setIsEnhancing] = useState(false);

    const costs = useMemo(() => {
        if (!selectedItem) return null;
        return ENHANCEMENT_COSTS[selectedItem.grade]?.[selectedItem.stars];
    }, [selectedItem]);

    const userLevelSum = currentUser ? currentUser.strategyLevel + currentUser.playfulLevel : 0;

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

    const goldCost = useMemo(() => {
        if (!selectedItem) return 0;
        return calculateEnhancementGoldCost(selectedItem.grade, selectedItem.stars);
    }, [selectedItem]);

    const hasEnoughGold = useMemo(() => {
        if (!currentUser) return false;
        return currentUser.gold >= goldCost;
    }, [currentUser, goldCost]);

    const canEnhance = useMemo(() => {
        if (!selectedItem) return false;
        if (!costs) return false;
        if (levelRequirement > 0 && !meetsLevelRequirement) return false;
        if (!hasEnoughGold) return false;
        return costs.every(cost => userMaterials[cost.name] >= cost.amount);
    }, [costs, userMaterials, levelRequirement, meetsLevelRequirement, selectedItem, hasEnoughGold]);

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
        if (!hasEnoughGold) return `골드 부족 (필요: ${goldCost.toLocaleString()})`;
        if (!canEnhance) return '재료 부족';
        return `강화하기 (+${selectedItem.stars + 1})`;
    }, [isEnhancing, selectedItem, levelRequirement, meetsLevelRequirement, costs, canEnhance, hasEnoughGold, goldCost]);

    useEffect(() => {
        setIsEnhancing(false);
    }, [selectedItem]);

    // 강화 결과가 나오면 isEnhancing 상태를 초기화
    useEffect(() => {
        if (enhancementOutcome) {
            setIsEnhancing(false);
        }
    }, [enhancementOutcome]);

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
        <div className="flex flex-row gap-6 h-full min-h-0">
            <div className="w-1/2 flex flex-col bg-gray-900/40 p-2 rounded-lg h-full">
                <ItemDisplay item={selectedItem} currentUser={currentUser} />
            </div>

            <div className="w-1/2 space-y-2 flex flex-col min-h-0">
                <div className="bg-gray-900/50 p-3 rounded-lg flex-shrink-0">
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
                            <span className="font-mono text-white truncate ml-2">{mainOptionPreview}</span> 
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">부옵션:</span>
                            <span className="font-mono text-white truncate ml-2">{selectedItem.stars < 10 ? subOptionPreview : ''}</span>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-900/50 p-3 rounded-lg flex-shrink-0 overflow-y-auto max-h-48">
                    <h4 className="font-semibold text-center mb-2">필요 재료</h4>
                    <div className="space-y-1 text-sm">
                        {/* 골드 비용 표시 */}
                        <div className="flex justify-between items-center">
                            <span className="flex items-center gap-2">
                                <img src="/images/icon/Gold.png" alt="골드" className="w-6 h-6" />
                                골드
                            </span>
                            <span className={`font-mono ${hasEnoughGold ? 'text-green-400' : 'text-red-400'}`}>
                                {(currentUser?.gold || 0).toLocaleString()} / {goldCost.toLocaleString()}
                            </span>
                        </div>
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
                <div className="bg-gray-900/50 p-3 rounded-lg text-center flex-shrink-0">
                    <h4 className="font-semibold mb-1">강화 성공 확률</h4>
                     <p className="text-2xl font-bold text-yellow-300">
                        {baseSuccessRate}%
                        {failBonus > 0 && <span className="text-lg text-green-400 ml-2">(+{failBonus.toFixed(1).replace(/\.0$/, '')}%)</span>}
                    </p>
                </div>
                <Button
                    onClick={handleEnhanceClick}
                    disabled={!canEnhance || isEnhancing || selectedItem.stars >= 10}
                    colorScheme="yellow"
                    className="w-full py-2 flex-shrink-0"
                >
                    {buttonText}
                </Button>
            </div>
        </div>
    );
};

export default EnhancementView;
