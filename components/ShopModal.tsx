
import React, { useState, useEffect } from 'react';
import { UserWithStatus, ServerAction, InventoryItemType } from '../types.js';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import { ACTION_POINT_PURCHASE_COSTS_DIAMONDS, MAX_ACTION_POINT_PURCHASES_PER_DAY, ACTION_POINT_PURCHASE_REFILL_AMOUNT } from '../constants';
import { isDifferentWeekKST } from '../utils/timeUtils.js';
import PurchaseQuantityModal from './PurchaseQuantityModal.js';
import { useAppContext } from '../hooks/useAppContext.js';

interface ShopModalProps {
    currentUser?: UserWithStatus; // Optional: useAppContext에서 가져올 수 있도록
    onClose: () => void;
    onAction: (action: ServerAction) => void;
    isTopmost?: boolean;
    initialTab?: ShopTab;
}

type ShopTab = 'equipment' | 'materials' | 'misc' | 'consumables';

interface PurchasableItem {
    itemId: string;
    name: string;
    price: { gold?: number; diamonds?: number };
    limit?: number;
    type: InventoryItemType;
}

const isSameDayKST = (ts1: number, ts2: number): boolean => {
    if (!ts1 || !ts2) return false;
    const KST_OFFSET = 9 * 60 * 60 * 1000;
    const d1 = new Date(ts1 + KST_OFFSET);
    const d2 = new Date(ts2 + KST_OFFSET);
    return d1.getUTCFullYear() === d2.getUTCFullYear() &&
           d1.getUTCMonth() === d2.getUTCMonth() &&
           d1.getUTCDate() === d2.getUTCDate();
};

const ActionPointCard: React.FC<{ currentUser: UserWithStatus, onBuy: () => void }> = ({ currentUser, onBuy }) => {
    const now = Date.now();
    const purchasesToday = isSameDayKST(currentUser.lastActionPointPurchaseDate || 0, now) 
        ? (currentUser.actionPointPurchasesToday || 0) 
        : 0;

    const canPurchase = purchasesToday < MAX_ACTION_POINT_PURCHASES_PER_DAY;
    const cost = canPurchase ? ACTION_POINT_PURCHASE_COSTS_DIAMONDS[purchasesToday] : 0;
    
    const handlePurchase = () => {
        if (!canPurchase) return;
        const canAfford = currentUser.diamonds >= cost;
        if (!canAfford) {
            alert('다이아가 부족합니다.');
            return;
        }
        onBuy();
    };

    return (
        <div className="bg-gray-800/60 rounded-lg p-4 flex flex-col items-center text-center border-2 border-gray-700">
            <div className="w-24 h-24 bg-gray-900/50 rounded-md mb-3 flex items-center justify-center text-6xl">⚡</div>
            <h3 className="text-lg font-bold text-white">행동력 충전</h3>
            <p className="text-xs text-gray-400 mt-1 flex-grow h-10">행동력 {ACTION_POINT_PURCHASE_REFILL_AMOUNT}개를 즉시 충전합니다. (최대치 초과 가능)</p>
            <div className="flex flex-col items-center justify-center gap-2 my-3 w-full">
                <Button onClick={handlePurchase} disabled={!canPurchase} colorScheme="green" className="w-full">
                    {canPurchase ? (
                        <span className="flex items-center justify-center gap-1"><img src="/images/icon/Zem.png" alt="다이아" className="w-4 h-4" /> {cost.toLocaleString()}</span>
                    ) : (
                        '오늘 구매 한도 초과'
                    )}
                </Button>
            </div>
             <p className="text-xs text-gray-400">오늘 구매 횟수: {purchasesToday}/{MAX_ACTION_POINT_PURCHASES_PER_DAY}</p>
        </div>
    );
};

const ShopItemCard: React.FC<{ 
    item: { itemId: string, name: string, description: string, price: { gold?: number, diamonds?: number }, image: string, dailyLimit?: number, weeklyLimit?: number, type: InventoryItemType },
    onBuy: (item: PurchasableItem) => void; 
    currentUser: UserWithStatus 
}> = ({ item, onBuy, currentUser }) => {
    const { name, description, price, image, dailyLimit, weeklyLimit } = item;
    const isGold = !!price.gold;
    const priceAmount = price.gold || price.diamonds || 0;
    const PriceIcon = isGold ? <img src="/images/icon/Gold.png" alt="골드" className="w-4 h-4" /> : <img src="/images/icon/Zem.png" alt="다이아" className="w-4 h-4" />;

    const now = Date.now();
    const purchaseRecord = currentUser.dailyShopPurchases?.[item.itemId];
    
    let purchasesThisPeriod = 0;
    let limit = 0;
    let limitText = '';

    if (weeklyLimit) {
        purchasesThisPeriod = (purchaseRecord && !isDifferentWeekKST(purchaseRecord.date, now)) ? purchaseRecord.quantity : 0;
        limit = weeklyLimit;
        limitText = '주간';
    } else if (dailyLimit) {
        purchasesThisPeriod = (purchaseRecord && isSameDayKST(purchaseRecord.date, now)) ? purchaseRecord.quantity : 0;
        limit = dailyLimit;
        limitText = '일일';
    }
    
    const remaining = limit > 0 ? limit - purchasesThisPeriod : (item.type === 'equipment' ? 100 : undefined);

    const handleBuyClick = () => {
        onBuy({ ...item, limit: remaining });
    };

    return (
        <div className="bg-gray-800/60 rounded-lg p-4 flex flex-col items-center text-center border-2 border-gray-700">
            <div className="w-24 h-24 bg-gray-900/50 rounded-md mb-3 flex items-center justify-center">
                <img src={image} alt={name} className="w-full h-full object-contain p-2" />
            </div>
            <h3 className="text-lg font-bold text-white">{name}</h3>
            <p className="text-xs text-gray-400 mt-1 flex-grow h-10">{description}</p>
            <div className="flex flex-col items-stretch justify-center gap-2 my-3 w-full">
                 <Button onClick={handleBuyClick} disabled={remaining === 0} colorScheme="green" className="w-full">
                    <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        <span>구매</span>
                        <div className="flex items-center gap-1">({PriceIcon} {priceAmount.toLocaleString()})</div>
                    </div>
                </Button>
            </div>
            {limit > 0 && <p className="text-xs text-gray-400">{limitText} 구매 제한: {remaining}/{limit}</p>}
        </div>
    );
};

const ShopModal: React.FC<ShopModalProps> = ({ currentUser: propCurrentUser, onClose, onAction, isTopmost, initialTab }) => {
    const { currentUserWithStatus } = useAppContext();
    // prop으로 받은 currentUser가 있으면 사용하고, 없으면 context에서 가져옴
    const currentUser = propCurrentUser || currentUserWithStatus;
    
    if (!currentUser) {
        return null;
    }
    
    const [activeTab, setActiveTab] = useState<ShopTab>(initialTab || 'equipment');
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [purchasingItem, setPurchasingItem] = useState<PurchasableItem | null>(null);

    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    const handleInitiatePurchase = (item: PurchasableItem) => {
        setPurchasingItem(item);
    };

    const handleConfirmPurchase = (itemId: string, quantity: number) => {
        const item = purchasingItem;
        if (!item) return;

        // 컨디션 회복제는 별도의 액션 사용
        if (itemId.startsWith('condition_potion_')) {
            const potionType = itemId.replace('condition_potion_', '') as 'small' | 'medium' | 'large';
            onAction({ type: 'BUY_CONDITION_POTION', payload: { potionType, quantity } });
        } else {
            const actionType = item.type === 'equipment' ? 'BUY_SHOP_ITEM' : 'BUY_MATERIAL_BOX';
            onAction({ type: actionType, payload: { itemId, quantity } });
        }
        setToastMessage('구매 완료! 가방을 확인하세요.');
        setPurchasingItem(null);
    };
    
    const handleBuyActionPoints = () => {
        onAction({ type: 'PURCHASE_ACTION_POINTS' });
        setToastMessage('행동력 구매 완료!');
    };

    const renderContent = () => {
        const equipmentItems = [
            { itemId: 'equipment_box_1', name: "장비 상자 I", description: "일반~희귀 등급 장비 획득", price: { gold: 500 }, image: "/images/Box/EquipmentBox1.png", type: 'equipment' as const },
            { itemId: 'equipment_box_2', name: "장비 상자 II", description: "일반~에픽 등급 장비 획득", price: { gold: 1500 }, image: "/images/Box/EquipmentBox2.png", type: 'equipment' as const },
            { itemId: 'equipment_box_3', name: "장비 상자 III", description: "고급~전설 등급 장비 획득", price: { gold: 5000 }, image: "/images/Box/EquipmentBox3.png", type: 'equipment' as const },
            { itemId: 'equipment_box_4', name: "장비 상자 IV", description: "희귀~신화 등급 장비 획득", price: { gold: 10000 }, image: "/images/Box/EquipmentBox4.png", type: 'equipment' as const },
            { itemId: 'equipment_box_5', name: "장비 상자 V", description: "에픽~신화 등급 장비 획득", price: { diamonds: 100 }, image: "/images/Box/EquipmentBox5.png", type: 'equipment' as const },
            { itemId: 'equipment_box_6', name: "장비 상자 VI", description: "전설~신화 등급 장비 획득", price: { diamonds: 500 }, image: "/images/Box/EquipmentBox6.png", type: 'equipment' as const },
        ];
        const materialItems = [
            { itemId: "material_box_1", name: "재료 상자 I", description: "하급 ~ 상급 강화석 5개 획득", price: { gold: 500 }, image: "/images/Box/ResourceBox1.png", dailyLimit: 10, type: 'material' as const },
            { itemId: "material_box_2", name: "재료 상자 II", description: "하급 ~ 상급 강화석 5개 획득", price: { gold: 1000 }, image: "/images/Box/ResourceBox2.png", dailyLimit: 10, type: 'material' as const },
            { itemId: "material_box_3", name: "재료 상자 III", description: "하급 ~ 상급 강화석 5개 획득", price: { gold: 3000 }, image: "/images/Box/ResourceBox3.png", dailyLimit: 10, type: 'material' as const },
            { itemId: "material_box_4", name: "재료 상자 IV", description: "중급 ~ 최상급 강화석 5개 획득", price: { gold: 5000 }, image: "/images/Box/ResourceBox4.png", dailyLimit: 10, type: 'material' as const },
            { itemId: "material_box_5", name: "재료 상자 V", description: "상급 ~ 신비의 강화석 5개 획득", price: { gold: 10000 }, image: "/images/Box/ResourceBox5.png", dailyLimit: 10, type: 'material' as const },
            { itemId: "material_box_6", name: "재료 상자 VI", description: "상급 ~ 신비의 강화석 5개 획득", price: { diamonds: 100 }, image: "/images/Box/ResourceBox6.png", dailyLimit: 10, type: 'material' as const },
        ];

        switch (activeTab) {
            case 'equipment':
                return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {equipmentItems.map(item => <ShopItemCard key={item.itemId} item={item} onBuy={handleInitiatePurchase} currentUser={currentUser} />)}
                    </div>
                );
            case 'materials':
                 return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {materialItems.map(item => <ShopItemCard key={item.itemId} item={item} onBuy={handleInitiatePurchase} currentUser={currentUser} />)}
                    </div>
                );
            case 'misc':
                 return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <ActionPointCard currentUser={currentUser} onBuy={handleBuyActionPoints} />
                    </div>
                );
            case 'consumables':
            default:
                const consumableItems = [
                    { itemId: 'condition_potion_small', name: "컨디션회복제(소)", description: "컨디션을 1~10 회복합니다.", price: { gold: 100 }, image: "/images/use/con1.png", dailyLimit: 3, type: 'consumable' as const },
                    { itemId: 'condition_potion_medium', name: "컨디션회복제(중)", description: "컨디션을 10~20 회복합니다.", price: { gold: 150 }, image: "/images/use/con2.png", dailyLimit: 3, type: 'consumable' as const },
                    { itemId: 'condition_potion_large', name: "컨디션회복제(대)", description: "컨디션을 20~30 회복합니다.", price: { gold: 200 }, image: "/images/use/con3.png", dailyLimit: 3, type: 'consumable' as const },
                ];
                return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {consumableItems.map(item => <ShopItemCard key={item.itemId} item={item} onBuy={handleInitiatePurchase} currentUser={currentUser} />)}
                    </div>
                );
        }
    };

    return (
        <>
            {purchasingItem && (
                <PurchaseQuantityModal 
                    item={purchasingItem}
                    currentUser={currentUser}
                    onClose={() => setPurchasingItem(null)}
                    onConfirm={handleConfirmPurchase}
                />
            )}
            <DraggableWindow title="상점" onClose={onClose} windowId="shop" initialWidth={700} isTopmost={isTopmost && !purchasingItem}>
                <div className="h-[calc(var(--vh,1vh)*60)] flex flex-col relative">
                    <div className="flex bg-gray-900/70 p-1 rounded-lg mb-4 flex-shrink-0">
                        <button onClick={() => setActiveTab('equipment')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'equipment' ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}>장비</button>
                        <button onClick={() => setActiveTab('materials')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'materials' ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}>재료</button>
                        <button onClick={() => setActiveTab('consumables')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'consumables' ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}>소모품</button>
                        <button onClick={() => setActiveTab('misc')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'misc' ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}>기타</button>
                    </div>

                    <div className="flex-grow overflow-y-auto pr-2">
                        {renderContent()}
                    </div>

                    {toastMessage && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in z-10">
                            {toastMessage}
                        </div>
                    )}
                </div>
            </DraggableWindow>
        </>
    );
};

export default ShopModal;
