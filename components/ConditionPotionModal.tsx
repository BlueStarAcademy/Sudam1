import React, { useMemo, useState } from 'react';
import { User } from '../types.js';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import { useAppContext } from '../hooks/useAppContext.js';

type PotionType = 'small' | 'medium' | 'large';

interface PotionInfo {
    name: string;
    image: string;
    minRecovery: number;
    maxRecovery: number;
    price: number;
    grade: 'normal' | 'uncommon' | 'rare';
}

const POTION_TYPES: Record<PotionType, PotionInfo> = {
    small: {
        name: '컨디션회복제(소)',
        image: '/images/use/con1.png',
        minRecovery: 1,
        maxRecovery: 10,
        price: 100,
        grade: 'normal'
    },
    medium: {
        name: '컨디션회복제(중)',
        image: '/images/use/con2.png',
        minRecovery: 10,
        maxRecovery: 20,
        price: 150,
        grade: 'uncommon'
    },
    large: {
        name: '컨디션회복제(대)',
        image: '/images/use/con3.png',
        minRecovery: 20,
        maxRecovery: 30,
        price: 200,
        grade: 'rare'
    }
};

interface ConditionPotionModalProps {
    currentUser?: User; // Optional: useAppContext에서 가져올 수 있도록
    currentCondition: number;
    onClose: () => void;
    onConfirm: (potionType: PotionType) => void;
    isTopmost?: boolean;
}

const ConditionPotionModal: React.FC<ConditionPotionModalProps> = ({ 
    currentUser: propCurrentUser, 
    currentCondition, 
    onClose, 
    onConfirm,
    isTopmost 
}) => {
    const { handlers, currentUserWithStatus, updateTrigger } = useAppContext();
    // prop으로 받은 currentUser가 있으면 사용하고, 없으면 context에서 가져옴
    const currentUser = propCurrentUser || currentUserWithStatus;
    const [selectedPotionType, setSelectedPotionType] = useState<PotionType | null>(null);

    if (!currentUser) {
        return null;
    }

    // 보유 중인 각 컨디션 회복제 개수 계산
    // inventory 변경을 확실히 감지하기 위해 inventory의 컨디션 회복제 정보를 문자열로 변환하여 의존성으로 사용
    const inventoryKey = useMemo(() => {
        if (!currentUser?.inventory) return '';
        return currentUser.inventory
            .filter(item => item.type === 'consumable' && item.name.startsWith('컨디션회복제'))
            .map(item => `${item.id || item.name}:${item.quantity || 1}`)
            .join(',');
    }, [currentUser?.inventory, updateTrigger]);
    
    const potionCounts = useMemo(() => {
        const counts: Record<PotionType, number> = { small: 0, medium: 0, large: 0 };
        if (!currentUser?.inventory) return counts;
        currentUser.inventory
            .filter(item => item.type === 'consumable' && item.name.startsWith('컨디션회복제'))
            .forEach(item => {
                if (item.name === '컨디션회복제(소)') {
                    counts.small += item.quantity || 1;
                } else if (item.name === '컨디션회복제(중)') {
                    counts.medium += item.quantity || 1;
                } else if (item.name === '컨디션회복제(대)') {
                    counts.large += item.quantity || 1;
                }
            });
        return counts;
    }, [inventoryKey]);

    // 선택한 회복제의 예상 회복량 계산
    const expectedRecovery = useMemo(() => {
        if (!selectedPotionType) return null;
        const potion = POTION_TYPES[selectedPotionType];
        const minAfter = Math.min(100, currentCondition + potion.minRecovery);
        const maxAfter = Math.min(100, currentCondition + potion.maxRecovery);
        return { min: minAfter, max: maxAfter, avg: Math.floor((minAfter + maxAfter) / 2) };
    }, [selectedPotionType, currentCondition]);

    const canAfford = useMemo(() => {
        if (!selectedPotionType) return false;
        return currentUser.gold >= POTION_TYPES[selectedPotionType].price;
    }, [selectedPotionType, currentUser.gold]);

    const hasPotion = useMemo(() => {
        if (!selectedPotionType) return false;
        return potionCounts[selectedPotionType] > 0;
    }, [selectedPotionType, potionCounts]);

    const handleConfirm = () => {
        if (!selectedPotionType) return;
        
        // 0개인 아이템을 선택한 경우 상점 열기
        if (!hasPotion) {
            handlers.openShop('consumables');
            // 창을 닫지 않음 (구매 후 돌아올 수 있도록)
            return;
        }
        
        // 보유하고 있고 골드가 충분한 경우 사용
        if (canAfford) {
            onConfirm(selectedPotionType);
            // 창을 닫지 않음 (여러 개 사용할 수 있도록)
        }
    };

    return (
        <DraggableWindow 
            title="컨디션 회복제 사용" 
            initialWidth={600} 
            initialHeight={650}
            onClose={onClose}
            isTopmost={isTopmost}
            windowId="condition-potion-modal"
        >
            <div className="text-white flex flex-col h-full">
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-3">
                        {(Object.keys(POTION_TYPES) as PotionType[]).map((type) => {
                            const potion = POTION_TYPES[type];
                            const count = potionCounts[type];
                            const isSelected = selectedPotionType === type;

                            return (
                                <div
                                    key={type}
                                    onClick={() => setSelectedPotionType(type)}
                                    className={`bg-gray-800/50 rounded-lg p-3 border-2 cursor-pointer transition-all ${
                                        isSelected ? 'border-yellow-400 bg-gray-700/50' : 'border-gray-700 hover:border-gray-600'
                                    }`}
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <img src={potion.image} alt={potion.name} className="w-16 h-16" />
                                        <h3 className="font-bold text-sm text-center">{potion.name}</h3>
                                        <p className="text-xs text-gray-400 text-center">
                                            {potion.minRecovery}~{potion.maxRecovery} 회복
                                        </p>
                                        <div className="flex items-center gap-1 text-xs">
                                            <img src="/images/icon/Gold.png" alt="골드" className="w-4 h-4" />
                                            <span className={currentUser.gold >= potion.price ? 'text-green-400' : 'text-red-400'}>
                                                {potion.price}
                                            </span>
                                        </div>
                                        <p className={`text-xs ${count > 0 ? 'text-blue-300' : 'text-red-400'}`}>
                                            보유: {count}개
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {selectedPotionType && !hasPotion && (
                        <p className="text-red-400 text-sm text-center">
                            보유 중인 {POTION_TYPES[selectedPotionType].name}이(가) 없습니다. 상점에서 구매하세요.
                        </p>
                    )}

                    {selectedPotionType && !canAfford && hasPotion && (
                        <p className="text-red-400 text-sm text-center">
                            골드가 부족합니다. (필요: {POTION_TYPES[selectedPotionType].price} 골드)
                        </p>
                    )}
                </div>

                <div className="w-full bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex-shrink-0">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-300">현재 컨디션:</span>
                        <span className="text-yellow-300 font-bold text-lg">{currentCondition}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-300">예상 회복 후 컨디션:</span>
                        <span className="text-green-300 font-bold text-lg">
                            {expectedRecovery ? `${expectedRecovery.min} ~ ${expectedRecovery.max}` : '—'}
                        </span>
                    </div>
                </div>

                <div className="flex gap-4 w-full mt-4 flex-shrink-0">
                    <Button 
                        onClick={onClose} 
                        colorScheme="gray" 
                        className="flex-1"
                    >
                        취소
                    </Button>
                    <Button 
                        onClick={handleConfirm} 
                        colorScheme="green" 
                        className="flex-1"
                        disabled={!selectedPotionType}
                    >
                        {selectedPotionType && !hasPotion ? '상점 가기' : '사용'}
                    </Button>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default ConditionPotionModal;

