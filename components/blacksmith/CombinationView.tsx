import React, { useState, useMemo } from 'react';
import { InventoryItem, ServerAction } from '../../types.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import Button from '../Button.js';
import { MATERIAL_ITEMS } from '../../constants.js';

const CraftingDetailModal: React.FC<{
    details: { materialName: string, craftType: 'upgrade' | 'downgrade' };
    inventory: InventoryItem[];
    onClose: () => void;
    onAction: (action: ServerAction) => void;
}> = ({ details, inventory, onClose, onAction }) => {
    const { materialName, craftType } = details;
    const isUpgrade = craftType === 'upgrade';
    
    const materialTiers = ['하급 강화석', '중급 강화석', '상급 강화석', '최상급 강화석', '신비의 강화석'];
    const tierIndex = materialTiers.indexOf(materialName);

    const sourceMaterialName = materialName;
    const targetMaterialName = isUpgrade ? materialTiers[tierIndex + 1] : materialTiers[tierIndex - 1];

    const sourceTemplate = MATERIAL_ITEMS[sourceMaterialName];
    const targetTemplate = MATERIAL_ITEMS[targetMaterialName];

    const conversionRate = isUpgrade ? 10 : 1;
    const yieldRate = isUpgrade ? 1 : 5;

    const sourceMaterialCount = useMemo(() => {
        return inventory
            .filter(i => i.name === sourceMaterialName)
            .reduce((sum, i) => sum + (i.quantity || 0), 0);
    }, [inventory, sourceMaterialName]);

    const maxQuantity = Math.floor(sourceMaterialCount / conversionRate);
    const [quantity, setQuantity] = useState(maxQuantity > 0 ? 1 : 0);

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value)) {
            setQuantity(Math.max(0, Math.min(maxQuantity, value)));
        } else {
            setQuantity(0);
        }
    };
    
    const handleConfirm = () => {
        if (quantity > 0) {
            onAction({ type: 'CRAFT_MATERIAL', payload: { materialName, craftType, quantity } });
        }
        onClose();
    };

    return (
        <div className="absolute inset-0 bg-black/80 z-20 flex items-center justify-center" onClick={onClose}>
            <div className="bg-panel rounded-lg shadow-xl p-6 w-full max-w-md border border-color text-on-panel" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-center mb-4">{isUpgrade ? '재료 합성' : '재료 분해'}</h2>

                <div className="flex items-center justify-around text-center mb-4">
                    <div className="flex flex-col items-center">
                        <img src={sourceTemplate.image!} alt={sourceMaterialName} className="w-16 h-16" />
                        <span className="font-semibold">{sourceMaterialName}</span>
                        <span className="text-xs text-tertiary mt-1">보유: {sourceMaterialCount.toLocaleString()}개</span>
                    </div>
                    <div className="text-4xl font-bold text-highlight mx-4">→</div>
                    <div className="flex flex-col items-center">
                        <img src={targetTemplate.image!} alt={targetMaterialName} className="w-16 h-16" />
                        <span className="font-semibold">{targetMaterialName}</span>
                        <span className="text-sm text-green-400 mt-1">획득: {(quantity * yieldRate).toLocaleString()}개</span>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <label htmlFor="quantity-slider" className="block text-sm font-medium text-secondary text-center">
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
                     <div className="flex justify-between text-xs text-tertiary">
                        <span>0회</span>
                        <span>{maxQuantity}회</span>
                    </div>
                    <p className="text-center text-sm text-tertiary">
                        {isUpgrade ? '합성' : '분해'} 횟수: {quantity.toLocaleString()}회
                    </p>
                </div>

                <div className="flex justify-end gap-4 mt-6">
                    <Button onClick={onClose} colorScheme="gray">취소</Button>
                    <Button onClick={handleConfirm} colorScheme={isUpgrade ? 'blue' : 'orange'} disabled={quantity === 0}>
                        {quantity}회 {isUpgrade ? '합성' : '분해'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

interface CombinationViewProps {
    onAction: (action: ServerAction) => Promise<void>;
}

const CombinationView: React.FC<CombinationViewProps> = ({ onAction }) => {
    const { currentUserWithStatus } = useAppContext();
    const [craftingDetails, setCraftingDetails] = useState<{ materialName: string, craftType: 'upgrade' | 'downgrade' } | null>(null);

    if (!currentUserWithStatus) return null;

    const { inventory } = currentUserWithStatus;

    return (
        <div className="h-full">
            {craftingDetails && (
                <CraftingDetailModal details={craftingDetails} inventory={inventory} onClose={() => setCraftingDetails(null)} onAction={onAction} />
            )}
            <p>장비 합성 기능이 여기에 표시됩니다.</p>
        </div>
    );
};

export default CombinationView;
