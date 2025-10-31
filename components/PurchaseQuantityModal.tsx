
import React, { useState, useMemo } from 'react';
import DraggableWindow from './DraggableWindow';
import Button from './Button';
import { UserWithStatus } from '../types';

interface PurchaseQuantityModalProps {
    item: {
        itemId: string;
        name: string;
        price: { gold?: number; diamonds?: number };
        limit?: number;
    };
    currentUser: UserWithStatus;
    onClose: () => void;
    onConfirm: (itemId: string, quantity: number) => void;
}

const PurchaseQuantityModal: React.FC<PurchaseQuantityModalProps> = ({ item, currentUser, onClose, onConfirm }) => {
    const [quantity, setQuantity] = useState(1);

    const isGold = !!item.price.gold;
    const pricePerItem = item.price.gold || item.price.diamonds || 0;
    const totalPrice = pricePerItem * quantity;

    const maxQuantity = useMemo(() => {
        const currency = isGold ? currentUser.gold : currentUser.diamonds;
        const maxByCurrency = pricePerItem > 0 ? Math.floor(currency / pricePerItem) : Infinity;
        return Math.min(item.limit || 100, maxByCurrency, 100); // Hard cap at 100 for sanity
    }, [item, currentUser, isGold, pricePerItem]);

    const handleConfirm = () => {
        if (quantity > 0) {
            onConfirm(item.itemId, quantity);
        }
        onClose();
    };

    return (
        <DraggableWindow title="수량 선택" onClose={onClose} windowId="purchase-quantity" initialWidth={400} zIndex={60}>
            <div className="text-center flex flex-col items-center">
                <h3 className="text-xl font-bold mb-4">{item.name}</h3>
                
                <div className="w-full space-y-4">
                    <div className="flex items-center justify-center gap-4">
                        <Button onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}>-</Button>
                        <input 
                            type="number"
                            value={quantity}
                            onChange={e => setQuantity(Math.max(1, Math.min(maxQuantity, Number(e.target.value))))}
                            className="w-24 text-center text-2xl font-bold bg-tertiary rounded-md p-2"
                        />
                        <Button onClick={() => setQuantity(q => Math.min(maxQuantity, q + 1))} disabled={quantity >= maxQuantity}>+</Button>
                    </div>
                    <input 
                        type="range"
                        min="1"
                        max={maxQuantity}
                        value={quantity}
                        onChange={e => setQuantity(Number(e.target.value))}
                        className="w-full"
                    />
                </div>

                <div className="mt-6 text-lg">
                    <p>총 가격:</p>
                    <div className="flex items-center justify-center gap-2 font-bold text-2xl text-yellow-300">
                        <img src={isGold ? '/images/icon/Gold.png' : '/images/icon/Zem.png'} alt={isGold ? '골드' : '다이아'} className="w-6 h-6" />
                        <span>{totalPrice.toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex w-full gap-4 mt-6">
                    <Button onClick={onClose} colorScheme="gray" className="w-full">취소</Button>
                    <Button onClick={handleConfirm} disabled={quantity === 0 || quantity > maxQuantity} className="w-full">구매</Button>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default PurchaseQuantityModal;
