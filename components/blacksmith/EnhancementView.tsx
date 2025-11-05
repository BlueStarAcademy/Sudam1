
import React, { useState, useMemo, useEffect } from 'react';
import { UserWithStatus, InventoryItem, ServerAction, ItemGrade, ItemOption } from '../../types.js';
import Button from '../Button.js';
import { ENHANCEMENT_SUCCESS_RATES, ENHANCEMENT_COSTS, MATERIAL_ITEMS, ENHANCEMENT_FAIL_BONUS_RATES, GRADE_LEVEL_REQUIREMENTS, calculateEnhancementGoldCost } from '../../constants';
import { useAppContext } from '../../hooks/useAppContext.js';

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

const ItemDisplay: React.FC<{ item: InventoryItem }> = ({ item }) => {
    const { currentUserWithStatus } = useAppContext();
    const styles = gradeStyles[item.grade];

    const requiredLevel = GRADE_LEVEL_REQUIREMENTS[item.grade];
    const userLevelSum = (currentUserWithStatus?.strategyLevel || 0) + (currentUserWithStatus?.playfulLevel || 0);
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
                <div className="w-1/2 flex flex-col bg-gray-900/40 p-2 rounded-lg h-full">
                    <ItemDisplay item={selectedItem} />
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
