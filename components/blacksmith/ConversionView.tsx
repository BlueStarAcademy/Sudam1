import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, ServerAction } from '../../types.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import Button from '../Button.js';
import DraggableWindow from '../DraggableWindow.js';
import { MATERIAL_ITEMS } from '../../constants';
import { BLACKSMITH_DISASSEMBLY_JACKPOT_RATES } from '../../constants/rules';

const CraftingDetailModal: React.FC<{
    details: { materialName: string, craftType: 'upgrade' | 'downgrade' };
    inventory: InventoryItem[];
    blacksmithLevel: number;
    onClose: () => void;
    onAction: (action: ServerAction) => void;
}> = ({ details, inventory, blacksmithLevel, onClose, onAction }) => {
    const { materialName, craftType } = details;
    const isUpgrade = craftType === 'upgrade';
    
    const materialTiers = ['하급 강화석', '중급 강화석', '상급 강화석', '최상급 강화석', '신비의 강화석'];
    const tierIndex = materialTiers.indexOf(materialName);

    const sourceMaterialName = materialName;
    const targetMaterialName = isUpgrade ? materialTiers[tierIndex + 1] : materialTiers[tierIndex - 1];

    const sourceTemplate = MATERIAL_ITEMS[sourceMaterialName];
    const targetTemplate = MATERIAL_ITEMS[targetMaterialName];

    const conversionRate = isUpgrade ? 10 : 1;
    // 재료 합성: 일반 1개, 대박 2개 → 범위: 1~2개
    // 재료 분해: 일반 3~7개 랜덤, 대박 시 2배 → 범위: 3~14개
    const yieldMin = isUpgrade ? 1 : 3;
    const yieldMax = isUpgrade ? 2 : 14;

    const sourceMaterialCount = useMemo(() => {
        return inventory
            .filter(i => i.name === sourceMaterialName)
            .reduce((sum, i) => sum + (i.quantity || 0), 0);
    }, [inventory, sourceMaterialName]);

    const maxQuantity = Math.floor(sourceMaterialCount / conversionRate);
    const [quantity, setQuantity] = useState(maxQuantity > 0 ? 1 : 0);

    // Update quantity when inventory changes
    useEffect(() => {
        const newMaxQuantity = Math.floor(sourceMaterialCount / conversionRate);
        setQuantity(prev => Math.min(prev, newMaxQuantity));
    }, [sourceMaterialCount, conversionRate]);

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value)) {
            setQuantity(Math.max(0, Math.min(maxQuantity, value)));
        } else {
            setQuantity(0);
        }
    };
    
    const handleConfirm = async () => {
        if (quantity > 0) {
            await onAction({ type: 'CRAFT_MATERIAL', payload: { materialName, craftType, quantity } });
        }
        onClose();
    };

    return (
        <DraggableWindow 
            title={isUpgrade ? '재료 합성' : '재료 분해'} 
            onClose={onClose} 
            windowId={`crafting-${materialName}-${craftType}`}
            initialWidth={500}
            initialHeight={550}
            isTopmost
        >
            <div className="p-4 text-on-panel">
                <div className="flex items-center justify-around text-center mb-6">
                    <div className="flex flex-col items-center">
                        <img src={sourceTemplate.image!} alt={sourceMaterialName} className="w-20 h-20 mb-2" />
                        <span className="font-semibold text-base">{sourceMaterialName}</span>
                        <span className="text-sm text-tertiary mt-1">보유: {sourceMaterialCount.toLocaleString()}개</span>
                    </div>
                    <div className="text-4xl font-bold text-highlight mx-4">→</div>
                    <div className="flex flex-col items-center">
                        <img src={targetTemplate.image!} alt={targetMaterialName} className="w-20 h-20 mb-2" />
                        <span className="font-semibold text-base">{targetMaterialName}</span>
                        <span className="text-base text-green-400 mt-1">
                            획득: {(quantity * yieldMin).toLocaleString()} ~ {(quantity * yieldMax).toLocaleString()}개
                        </span>
                    </div>
                </div>
                
                <div className="space-y-3">
                    <label htmlFor="quantity-slider" className="block text-base font-medium text-secondary text-center">
                        {isUpgrade ? '합성' : '분해'}할 {sourceMaterialName}: <span className="font-bold text-highlight">{(quantity * conversionRate).toLocaleString()} / {sourceMaterialCount.toLocaleString()}</span>개
                    </label>
                    <input
                        id="quantity-slider"
                        type="range"
                        min="0"
                        max={maxQuantity}
                        value={quantity}
                        onChange={handleQuantityChange}
                        disabled={maxQuantity === 0}
                        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                    />
                     <div className="flex justify-between text-sm text-tertiary">
                        <span>0회</span>
                        <span>{maxQuantity}회</span>
                    </div>
                    <p className="text-center text-base text-tertiary">
                        {isUpgrade ? '합성' : '분해'} 횟수: {quantity.toLocaleString()}회
                    </p>
                </div>

                <p className="text-sm text-cyan-300 text-center mt-6">
                    {isUpgrade ? '합성' : '분해'} 시 {BLACKSMITH_DISASSEMBLY_JACKPOT_RATES[blacksmithLevel - 1]}% 확률로 '대박'이 발생하여 획득량이 2배가 됩니다!
                </p>

                <div className="flex justify-end gap-4 mt-6">
                    <Button onClick={onClose} colorScheme="gray">취소</Button>
                    <Button onClick={handleConfirm} colorScheme={isUpgrade ? 'blue' : 'orange'} disabled={quantity === 0}>
                        {quantity}회 {isUpgrade ? '합성' : '분해'}
                    </Button>
                </div>
            </div>
        </DraggableWindow>
    );
};

interface ConversionViewProps {
    onAction: (action: ServerAction) => Promise<void>;
}

const ConversionView: React.FC<ConversionViewProps> = ({ onAction }) => {
    const { currentUserWithStatus } = useAppContext();
    const [craftingDetails, setCraftingDetails] = useState<{ materialName: string, craftType: 'upgrade' | 'downgrade' } | null>(null);

    if (!currentUserWithStatus) return null;

    const { inventory } = currentUserWithStatus;

    const materialCategories = useMemo(() => {
        const categories: Record<string, InventoryItem[]> = {};
        inventory
            .filter(item => item.type === 'material')
            .forEach(item => {
                if (!categories[item.name]) {
                    categories[item.name] = [];
                }
                categories[item.name].push(item);
            });
        return categories;
    }, [inventory]);

    const materialTiers = ['하급 강화석', '중급 강화석', '상급 강화석', '최상급 강화석', '신비의 강화석'];

    return (
        <div className="h-full flex flex-col min-h-0">
            {craftingDetails && (
                <CraftingDetailModal 
                    details={craftingDetails} 
                    inventory={inventory} 
                    blacksmithLevel={currentUserWithStatus.blacksmithLevel ?? 1}
                    onClose={() => setCraftingDetails(null)} 
                    onAction={onAction} 
                />
            )}

            <div className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col items-center justify-center gap-6">
                {/* 첫 번째 행: 하급 강화석 <> 중급 강화석 <> 상급 강화석 */}
                <div className="flex items-center justify-center gap-3 w-full">
                    {['하급 강화석', '중급 강화석', '상급 강화석'].map((materialName, index, row) => {
                        const materialExists = materialCategories[materialName] && materialCategories[materialName].length > 0;
                        const quantity = materialCategories[materialName]
                            ? materialCategories[materialName].reduce((sum, item) => sum + (item.quantity || 0), 0)
                            : 0;
                        const materialData = MATERIAL_ITEMS[materialName];
                        const tierIndex = materialTiers.indexOf(materialName);
                        const canUpgrade = tierIndex < materialTiers.length - 1;
                        const canDowngrade = tierIndex > 0;

                        return (
                            <React.Fragment key={materialName}>
                                {/* 강화석 카드 */}
                                <div className="bg-panel-secondary rounded-lg p-3 flex flex-col items-center justify-center min-w-[140px]">
                                    <img src={materialData.image as string | undefined} alt={materialName} className="w-16 h-16 mb-2" />
                                    <h4 className="font-bold text-secondary text-xs text-center whitespace-nowrap mb-1">{materialName}</h4>
                                    <p className="text-[10px] text-tertiary text-center mb-2">보유: {quantity.toLocaleString()}개</p>
                                </div>
                                
                                {/* 오른쪽 화살표 (합성) - 마지막 강화석이 아닐 때만 표시 */}
                                {index < row.length - 1 && (
                                    <div className="flex flex-col gap-1.5 items-center">
                                        <span className="text-[10px] text-secondary font-medium">합성</span>
                                        <Button
                                            onClick={() => setCraftingDetails({ materialName, craftType: 'upgrade' })}
                                            colorScheme="blue"
                                            className="!text-sm !py-1.5 !px-4 whitespace-nowrap"
                                            disabled={!materialExists || quantity < 10}
                                            title={`${materialName} 10개 → ${materialTiers[tierIndex + 1]} 합성`}
                                        >
                                            →
                                        </Button>
                                        <Button
                                            onClick={() => setCraftingDetails({ materialName: materialTiers[tierIndex + 1], craftType: 'downgrade' })}
                                            colorScheme="purple"
                                            className="!text-sm !py-1.5 !px-4 whitespace-nowrap"
                                            disabled={!materialCategories[materialTiers[tierIndex + 1]] || 
                                                (materialCategories[materialTiers[tierIndex + 1]]?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0) < 1}
                                            title={`${materialTiers[tierIndex + 1]} → ${materialName} 분해`}
                                        >
                                            ←
                                        </Button>
                                        <span className="text-[10px] text-secondary font-medium">분해</span>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* 두 번째 행: 상급 강화석 <> 최상급 강화석 <> 신비의 강화석 */}
                <div className="flex items-center justify-center gap-3 w-full">
                    {['상급 강화석', '최상급 강화석', '신비의 강화석'].map((materialName, index, row) => {
                        const materialExists = materialCategories[materialName] && materialCategories[materialName].length > 0;
                        const quantity = materialCategories[materialName]
                            ? materialCategories[materialName].reduce((sum, item) => sum + (item.quantity || 0), 0)
                            : 0;
                        const materialData = MATERIAL_ITEMS[materialName];
                        const tierIndex = materialTiers.indexOf(materialName);
                        const canUpgrade = tierIndex < materialTiers.length - 1;
                        const canDowngrade = tierIndex > 0;

                        return (
                            <React.Fragment key={materialName}>
                                {/* 강화석 카드 */}
                                <div className="bg-panel-secondary rounded-lg p-3 flex flex-col items-center justify-center min-w-[140px]">
                                    <img src={materialData.image as string | undefined} alt={materialName} className="w-16 h-16 mb-2" />
                                    <h4 className="font-bold text-secondary text-xs text-center whitespace-nowrap mb-1">{materialName}</h4>
                                    <p className="text-[10px] text-tertiary text-center mb-2">보유: {quantity.toLocaleString()}개</p>
                                </div>
                                
                                {/* 오른쪽 화살표 (합성) - 마지막 강화석이 아닐 때만 표시 */}
                                {index < row.length - 1 && (
                                    <div className="flex flex-col gap-1.5 items-center">
                                        <span className="text-[10px] text-secondary font-medium">합성</span>
                                        <Button
                                            onClick={() => setCraftingDetails({ materialName, craftType: 'upgrade' })}
                                            colorScheme="blue"
                                            className="!text-sm !py-1.5 !px-4 whitespace-nowrap"
                                            disabled={!materialExists || quantity < 10}
                                            title={`${materialName} 10개 → ${materialTiers[tierIndex + 1]} 합성`}
                                        >
                                            →
                                        </Button>
                                        <Button
                                            onClick={() => setCraftingDetails({ materialName: materialTiers[tierIndex + 1], craftType: 'downgrade' })}
                                            colorScheme="purple"
                                            className="!text-sm !py-1.5 !px-4 whitespace-nowrap"
                                            disabled={!materialCategories[materialTiers[tierIndex + 1]] || 
                                                (materialCategories[materialTiers[tierIndex + 1]]?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0) < 1}
                                            title={`${materialTiers[tierIndex + 1]} → ${materialName} 분해`}
                                        >
                                            ←
                                        </Button>
                                        <span className="text-[10px] text-secondary font-medium">분해</span>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ConversionView;
