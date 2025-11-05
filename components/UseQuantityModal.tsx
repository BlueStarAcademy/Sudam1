import React, { useState, useMemo, useEffect } from 'react';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import { InventoryItem, UserWithStatus } from '../types.js';

interface UseQuantityModalProps {
    item: InventoryItem;
    currentUser: UserWithStatus;
    onClose: () => void;
    onConfirm: (itemId: string, quantity: number) => void;
    isTopmost?: boolean;
}

const UseQuantityModal: React.FC<UseQuantityModalProps> = ({ item, currentUser, onClose, onConfirm, isTopmost }) => {
    // 같은 이름의 소모품 전체 수량 계산
    const totalQuantity = useMemo(() => {
        return currentUser.inventory
            .filter(i => i.type === 'consumable' && i.name === item.name)
            .reduce((sum, i) => sum + (i.quantity || 0), 0);
    }, [currentUser.inventory, item.name]);

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

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuantity(Number(e.target.value));
    };

    return (
        <DraggableWindow 
            title="일괄 사용" 
            onClose={onClose} 
            windowId="useQuantity" 
            isTopmost={isTopmost}
            zIndex={60}
        >
            <div className="p-4 text-on-panel flex flex-col items-center">
                <div className="mb-4 text-center w-full">
                    <h3 className="text-lg font-bold mb-2">사용할 수량을 선택하세요</h3>
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
                            사용 수량: <span className="font-bold text-highlight">{quantity.toLocaleString()} / {totalQuantity.toLocaleString()}</span>개
                        </label>
                        <input
                            id="quantity-slider"
                            type="range"
                            min="1"
                            max={totalQuantity}
                            value={quantity}
                            onChange={handleSliderChange}
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
                </div>

                <div className="flex gap-4 w-full">
                    <Button onClick={onClose} colorScheme="gray" className="flex-1">
                        취소
                    </Button>
                    <Button 
                        onClick={() => {
                            onConfirm(item.id, quantity);
                            onClose();
                        }} 
                        colorScheme="purple" 
                        className="flex-1"
                        disabled={quantity === 0 || quantity > totalQuantity}
                    >
                        {quantity.toLocaleString()}개 사용
                    </Button>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default UseQuantityModal;

