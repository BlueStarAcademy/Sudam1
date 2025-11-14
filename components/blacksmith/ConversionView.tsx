import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, ServerAction } from '../../types.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import ResourceActionButton from '../ui/ResourceActionButton.js';
import DraggableWindow from '../DraggableWindow.js';
import { MATERIAL_ITEMS } from '../../constants';
import { BLACKSMITH_DISASSEMBLY_JACKPOT_RATES } from '../../constants/rules.js';

// 모바일 감지 훅
const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return isMobile;
};

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

    // tierIndex가 유효하지 않은 경우 처리
    if (tierIndex === -1) {
        return null;
    }

    const sourceMaterialName = materialName;
    const targetMaterialName = isUpgrade ? materialTiers[tierIndex + 1] : materialTiers[tierIndex - 1];

    // targetMaterialName이 유효하지 않은 경우 처리
    if (!targetMaterialName) {
        return null;
    }

    const sourceTemplate = MATERIAL_ITEMS[sourceMaterialName];
    const targetTemplate = MATERIAL_ITEMS[targetMaterialName];

    const conversionRate = isUpgrade ? 10 : 1;
    // 재료 합성: 기본 1개 (대박 시 2배)
    // 재료 분해: 기본 3~5개 랜덤 (대박 시 2배)
    const yieldMin = isUpgrade ? 1 : 3;
    const yieldMax = isUpgrade ? 1 : 5;

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
            initialWidth={480}
            initialHeight={600}
            isTopmost
            variant="store"
        >
            <div className="flex flex-col h-full min-h-0 text-slate-100">
                <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-2">
                    <div className="grid gap-3">
                        <div className="grid grid-cols-2 gap-2 bg-gradient-to-br from-[#1c2642] via-[#141f35] to-[#0c1424] border border-cyan-300/20 rounded-xl p-3">
                            <div className="flex flex-col items-center gap-1.5">
                                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-900/40 border border-slate-500/40 shadow-inner">
                                    {sourceTemplate?.image && <img src={sourceTemplate.image} alt={sourceMaterialName} className="absolute inset-0 w-full h-full object-contain" />}
                                </div>
                                <span className="text-xs font-semibold text-center leading-tight">{sourceMaterialName}</span>
                                <span className="text-[10px] text-cyan-200/80 text-center">보유 {sourceMaterialCount.toLocaleString()}개</span>
                            </div>
                            <div className="flex flex-col items-center gap-1.5">
                                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-emerald-900/30 border border-emerald-400/40 shadow-[0_0_20px_-10px_rgba(16,185,129,0.85)]">
                                    {targetTemplate?.image && <img src={targetTemplate.image} alt={targetMaterialName} className="absolute inset-0 w-full h-full object-contain" />}
                                </div>
                                <span className="text-xs font-semibold text-emerald-200 text-center leading-tight">{targetMaterialName}</span>
                                <span className="text-[10px] text-emerald-300/90 text-center">
                                    예상 획득{' '}
                                    {yieldMin === yieldMax
                                        ? `${(quantity * yieldMin).toLocaleString()}개`
                                        : `${(quantity * yieldMin).toLocaleString()}~${(quantity * yieldMax).toLocaleString()}개`}
                                </span>
                            </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-[#141f33] via-[#10192a] to-[#0b1221] border border-slate-500/30 rounded-xl p-3 space-y-2">
                            <p className="text-xs text-center text-cyan-200">
                                {isUpgrade ? '합성' : '분해'}에 사용될 수량을 조절하세요.
                            </p>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="quantity-slider" className="text-[10px] font-medium text-slate-200 text-center">
                                    {sourceMaterialName} 소비{' '}
                                    <span className="text-amber-200 font-semibold">
                                        {(quantity * conversionRate).toLocaleString()}
                                    </span>
                                    <span className="text-slate-400"> / {sourceMaterialCount.toLocaleString()}개</span>
                                </label>
                                <input
                                    id="quantity-slider"
                                    type="range"
                                    min="0"
                                    max={maxQuantity}
                                    value={quantity}
                                    onChange={handleQuantityChange}
                                    disabled={maxQuantity === 0}
                                    className="w-full h-1.5 rounded-full appearance-none bg-slate-800 accent-cyan-300"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400 px-1">
                                    <span>0회</span>
                                    <span>{maxQuantity}회</span>
                                </div>
                                <div className="flex justify-between text-[10px] px-1 text-slate-200/90">
                                    <span>총 시도</span>
                                    <span className="font-semibold text-cyan-200">{quantity.toLocaleString()}회</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-[#101a2f] via-[#0c1527] to-[#09101d] border border-cyan-300/20 rounded-xl p-3 text-center text-[10px] text-cyan-200/90 leading-relaxed">
                        {isUpgrade ? '합성' : '분해'} 시{' '}
                        <span className="text-emerald-300 font-semibold">
                            {BLACKSMITH_DISASSEMBLY_JACKPOT_RATES[Math.max(0, blacksmithLevel - 1)]}%
                        </span>
                        의 확률로 <span className="text-amber-200 font-semibold">'대박'</span>이 발생하여 보상이 2배가 됩니다.
                    </div>
                </div>

                <div className="flex-shrink-0 flex justify-end gap-2 pt-3 border-t border-gray-700/50 mt-3">
                    <ResourceActionButton onClick={onClose} variant="neutral" className="!w-auto !px-4 !py-1.5 text-xs">
                        취소
                    </ResourceActionButton>
                    <ResourceActionButton
                        onClick={handleConfirm}
                        variant="materials"
                        disabled={quantity === 0}
                        className="!w-auto !px-5 !py-1.5 text-xs"
                    >
                        {quantity}회 {isUpgrade ? '합성' : '분해'}
                    </ResourceActionButton>
                </div>
            </div>
        </DraggableWindow>
    );
};

interface ConversionViewProps {
    onAction: (action: ServerAction) => Promise<void>;
}

const ConversionView: React.FC<ConversionViewProps> = ({ onAction }) => {
    const isMobile = useIsMobile();
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
        <div className={`${isMobile ? 'h-auto' : 'h-full'} flex flex-col ${isMobile ? '' : 'min-h-0'}`}>
            {craftingDetails && (
                <CraftingDetailModal 
                    details={craftingDetails} 
                    inventory={inventory} 
                    blacksmithLevel={currentUserWithStatus.blacksmithLevel ?? 1}
                    onClose={() => setCraftingDetails(null)} 
                    onAction={onAction} 
                />
            )}

            <div className={`${isMobile ? 'h-auto p-1 overflow-y-auto' : 'flex-1 min-h-0 p-3 overflow-hidden'} flex flex-col items-center ${isMobile ? 'justify-start gap-2' : 'justify-center gap-4'}`}>
                {/* 첫 번째 행: 하급 강화석 <> 중급 강화석 <> 상급 강화석 */}
                <div className={`flex ${isMobile ? 'flex-col' : 'items-center justify-center'} gap-2.5 w-full`}>
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
                                <div className={`bg-panel-secondary rounded-lg ${isMobile ? 'p-1.5' : 'p-2.5'} flex flex-col items-center justify-center ${isMobile ? 'w-full' : 'min-w-[120px]'}`}>
                                    <img src={materialData.image as string | undefined} alt={materialName} className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'} mb-1.5`} />
                                    <h4 className={`font-bold text-secondary ${isMobile ? 'text-[9px]' : 'text-[11px]'} text-center whitespace-nowrap mb-1`}>{materialName}</h4>
                                    <p className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} text-tertiary text-center mb-1.5`}>보유: {quantity.toLocaleString()}개</p>
                                </div>
                                
                                {/* 오른쪽 화살표 (합성) - 마지막 강화석이 아닐 때만 표시 */}
                                {index < row.length - 1 && (
                                    <div className={`flex ${isMobile ? 'flex-row items-center justify-center' : 'flex-col gap-1 items-center'}`}>
                                        <span className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} text-secondary font-medium`}>합성</span>
                                        <ResourceActionButton
                                            onClick={() => setCraftingDetails({ materialName, craftType: 'upgrade' })}
                                            variant="accent"
                                            className={`${isMobile ? '!w-auto !px-2 !py-1 text-[9px]' : '!w-auto text-xs !px-3 !py-1.5'} whitespace-nowrap`}
                                            disabled={!materialExists || quantity < 10}
                                            title={`${materialName} 10개 → ${materialTiers[tierIndex + 1]} 합성`}
                                        >
                                            →
                                        </ResourceActionButton>
                                        <ResourceActionButton
                                            onClick={() => setCraftingDetails({ materialName: materialTiers[tierIndex + 1], craftType: 'downgrade' })}
                                            variant="neutral"
                                            className={`${isMobile ? '!w-auto !px-2 !py-1 text-[9px]' : '!w-auto text-xs !px-3 !py-1.5'} whitespace-nowrap`}
                                            disabled={!materialCategories[materialTiers[tierIndex + 1]] || 
                                                (materialCategories[materialTiers[tierIndex + 1]]?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0) < 1}
                                            title={`${materialTiers[tierIndex + 1]} → ${materialName} 분해`}
                                        >
                                            ←
                                        </ResourceActionButton>
                                        <span className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} text-secondary font-medium`}>분해</span>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* 두 번째 행: 상급 강화석 <> 최상급 강화석 <> 신비의 강화석 */}
                <div className={`flex ${isMobile ? 'flex-col' : 'items-center justify-center'} gap-2.5 w-full`}>
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
                                <div className={`bg-panel-secondary rounded-lg ${isMobile ? 'p-1.5' : 'p-2.5'} flex flex-col items-center justify-center ${isMobile ? 'w-full' : 'min-w-[120px]'}`}>
                                    <img src={materialData.image as string | undefined} alt={materialName} className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'} mb-1.5`} />
                                    <h4 className={`font-bold text-secondary ${isMobile ? 'text-[9px]' : 'text-[11px]'} text-center whitespace-nowrap mb-1`}>{materialName}</h4>
                                    <p className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} text-tertiary text-center mb-1.5`}>보유: {quantity.toLocaleString()}개</p>
                                </div>
                                
                                {/* 오른쪽 화살표 (합성) - 마지막 강화석이 아닐 때만 표시 */}
                                {index < row.length - 1 && (
                                    <div className={`flex ${isMobile ? 'flex-row items-center justify-center' : 'flex-col gap-1.5 items-center'}`}>
                                        <span className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} text-secondary font-medium`}>합성</span>
                                        <ResourceActionButton
                                            onClick={() => setCraftingDetails({ materialName, craftType: 'upgrade' })}
                                            variant="accent"
                                            className={`${isMobile ? '!w-auto !px-2 !py-1 text-[9px]' : '!w-auto text-xs !px-3 !py-1.5'} whitespace-nowrap`}
                                            disabled={!materialExists || quantity < 10}
                                            title={`${materialName} 10개 → ${materialTiers[tierIndex + 1]} 합성`}
                                        >
                                            →
                                        </ResourceActionButton>
                                        <ResourceActionButton
                                            onClick={() => setCraftingDetails({ materialName: materialTiers[tierIndex + 1], craftType: 'downgrade' })}
                                            variant="neutral"
                                            className={`${isMobile ? '!w-auto !px-2 !py-1 text-[9px]' : '!w-auto text-xs !px-3 !py-1.5'} whitespace-nowrap`}
                                            disabled={!materialCategories[materialTiers[tierIndex + 1]] || 
                                                (materialCategories[materialTiers[tierIndex + 1]]?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0) < 1}
                                            title={`${materialTiers[tierIndex + 1]} → ${materialName} 분해`}
                                        >
                                            ←
                                        </ResourceActionButton>
                                        <span className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} text-secondary font-medium`}>분해</span>
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
