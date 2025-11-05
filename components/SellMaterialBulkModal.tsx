import React, { useState, useMemo, useEffect } from 'react';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import { InventoryItem, UserWithStatus } from '../types.js';
import { MATERIAL_SELL_PRICES } from '../constants/items.js';

interface SellMaterialBulkModalProps {
    item: InventoryItem;
    currentUser: UserWithStatus;
    onClose: () => void;
    onConfirm: (quantity: number) => void;
    isTopmost?: boolean;
}

const SellMaterialBulkModal: React.FC<SellMaterialBulkModalProps> = ({ item, currentUser, onClose, onConfirm, isTopmost }) => {
    // 같은 이름의 재료 전체 수량 계산
    const totalQuantity = useMemo(() => {
        return currentUser.inventory
            .filter(i => i.type === 'material' && i.name === item.name)
            .reduce((sum, i) => sum + (i.quantity || 0), 0);
    }, [currentUser.inventory, item.name]);

    const pricePerUnit = MATERIAL_SELL_PRICES[item.name] || 1;
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        setQuantity(Math.min(quantity, totalQuantity));
    }, [totalQuantity]);

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value)) {
            setQuantity(Math.max(1, Math.min(totalQuantity, value)));
        } else {
            setQuantity(1);
        }
    };

    const totalPrice = pricePerUnit * quantity;

    return (
        <DraggableWindow 
            title="재료 일괄 판매" 
            onClose={onClose} 
            windowId="sellMaterialBulk" 
            isTopmost={isTopmost}
            zIndex={60}
        >
            <div className="p-4 text-on-panel flex flex-col items-center">
                <div className="mb-4 text-center w-full">
                    <h3 className="text-lg font-bold mb-2">판매할 재료 수량을 선택하세요</h3>
                    <div className="flex items-center justify-center gap-4 my-4">
                        {item.image && (
                            <div className="relative w-20 h-20 rounded-lg flex-shrink-0">
                                <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                            </div>
                        )}
                        <div className="text-left">
                            <p className="font-semibold text-lg">{item.name}</p>
                            <p className="text-sm text-gray-400">보유: {totalQuantity.toLocaleString()}개</p>
                        </div>
                    </div>
                </div>

                <div className="w-full space-y-4 mb-4">
                    <div>
                        <label htmlFor="quantity-slider" className="block text-sm font-medium text-secondary text-center mb-2">
                            판매 수량: <span className="font-bold text-highlight">{quantity.toLocaleString()} / {totalQuantity.toLocaleString()}</span>개
                        </label>
                        <input
                            id="quantity-slider"
                            type="range"
                            min="1"
                            max={totalQuantity}
                            value={quantity}
                            onChange={handleQuantityChange}
                            disabled={totalQuantity === 0}
                            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-tertiary mt-1">
                            <span>1개</span>
                            <span>{totalQuantity.toLocaleString()}개</span>
                        </div>
                        <div className="mt-2">
                            <input
                                type="number"
                                min="1"
                                max={totalQuantity}
                                value={quantity}
                                onChange={handleQuantityChange}
                                className="w-full bg-secondary border border-color text-on-panel text-sm rounded-md p-2 text-center"
                            />
                        </div>
                    </div>

                    <div className="bg-gray-800/50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm">단가:</span>
                            <span className="font-semibold">{pricePerUnit.toLocaleString()} 골드</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold">총 판매 가격:</span>
                            <span className="text-2xl font-bold text-yellow-400">
                                {totalPrice.toLocaleString()} 골드
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 w-full">
                    <Button onClick={onClose} colorScheme="gray" className="flex-1">
                        취소
                    </Button>
                    <Button 
                        onClick={() => onConfirm(quantity)} 
                        colorScheme="red" 
                        className="flex-1"
                        disabled={quantity === 0 || quantity > totalQuantity}
                    >
                        {quantity.toLocaleString()}개 판매
                    </Button>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default SellMaterialBulkModal;

