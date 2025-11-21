import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../hooks/useAppContext.js';
import { Guild as GuildType, ServerAction, InventoryItem, ItemGrade } from '../../types/index.js';
import DraggableWindow from '../DraggableWindow.js';
import Button from '../Button.js';
import { GUILD_SHOP_ITEMS, GuildShopItem } from '../../constants/guildConstants.js';
import { isDifferentWeekKST, isDifferentMonthKST } from '../../utils/timeUtils.js';
import { addItemsToInventory } from '../../utils/inventoryUtils.js';
import { openGuildGradeBox } from '../../server/shop.js';
import { CONSUMABLE_ITEMS, MATERIAL_ITEMS } from '../../constants/index.js';

interface GuildShopModalProps {
    onClose: () => void;
    isTopmost?: boolean;
}

type ShopTab = 'equipment' | 'material' | 'consumable';

const gradeBackgrounds: Record<ItemGrade, string> = {
    normal: '/images/equipments/normalbgi.png',
    uncommon: '/images/equipments/uncommonbgi.png',
    rare: '/images/equipments/rarebgi.png',
    epic: '/images/equipments/epicbgi.png',
    legendary: '/images/equipments/legendarybgi.png',
    mythic: '/images/equipments/mythicbgi.png',
};


const ShopItemCard: React.FC<{ item: GuildShopItem }> = ({ item }) => {
    const { handlers, currentUserWithStatus } = useAppContext();
    
    const purchaseRecord = currentUserWithStatus?.dailyShopPurchases?.[item.itemId];
    const now = Date.now();
    let purchasesThisPeriod = 0;

    if (purchaseRecord) {
        if (item.limitType === 'weekly' && !isDifferentWeekKST(purchaseRecord.date, now)) {
            purchasesThisPeriod = purchaseRecord.quantity;
        }
        if (item.limitType === 'monthly' && !isDifferentMonthKST(purchaseRecord.date, now)) {
            purchasesThisPeriod = purchaseRecord.quantity;
        }
    }

    const remaining = item.limit - purchasesThisPeriod;
    const canAfford = (currentUserWithStatus?.guildCoins ?? 0) >= item.cost;
    const canPurchase = remaining > 0 && canAfford;

    const handleBuy = () => {
        if (canPurchase) {
            handlers.handleAction({
                type: 'GUILD_BUY_SHOP_ITEM',
                payload: { shopItemId: item.itemId, itemId: item.itemId, quantity: 1 }
            });
        }
    };

    return (
        <div className="bg-secondary rounded-lg p-3 flex flex-col items-center text-center border-2 border-color">
             <div className="relative w-24 h-24 bg-tertiary rounded-md mb-2 flex items-center justify-center">
                 <img src={gradeBackgrounds[item.grade]} alt={item.grade} className="absolute inset-0 w-full h-full object-cover rounded-md" />
                <img src={item.image} alt={item.name} className="w-full h-full object-contain p-2 relative" />
            </div>
            <h3 className="text-base font-bold text-primary">{item.name}</h3>
            <p className="text-xs text-tertiary mt-1 h-10">{item.description}</p>
            <div className="flex flex-col items-stretch justify-center gap-1 my-2 w-full">
                 <Button onClick={handleBuy} disabled={!canPurchase} colorScheme="green" className="w-full !text-xs !py-2.5">
                    <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        <span>구매</span>
                        <div className="flex items-center gap-1">
                            <img src="/images/guild/tokken.png" alt="길드 코인" className="w-4 h-4" /> 
                            {item.cost.toLocaleString()}
                        </div>
                    </div>
                </Button>
            </div>
            <p className="text-xs text-tertiary">{item.limitType === 'weekly' ? '주간' : '월간'} 구매: {remaining}/{item.limit}</p>
        </div>
    );
};


const GuildShopModal: React.FC<GuildShopModalProps> = ({ onClose, isTopmost }) => {
    const { currentUserWithStatus } = useAppContext();
    const [activeTab, setActiveTab] = useState<ShopTab>('equipment');

    const shopItemsForTab = useMemo(() => {
        const typeMap: Record<ShopTab, GuildShopItem['type'] | 'equipment_box'> = {
            'equipment': 'equipment_box',
            'material': 'material',
            'consumable': 'consumable',
        };
        return GUILD_SHOP_ITEMS.filter(item => item.type === typeMap[activeTab]);
    }, [activeTab]);

    return (
        <DraggableWindow title="길드 상점" onClose={onClose} windowId="guild-shop" initialWidth={750} isTopmost={isTopmost}>
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 className="text-xl font-bold text-highlight">길드 상점</h3>
                    <div className="bg-tertiary p-2 rounded-lg text-center">
                        <p className="text-xs text-secondary">보유 길드 코인</p>
                        <p className="font-bold text-lg text-primary flex items-center gap-1">
                             <img src="/images/guild/tokken.png" alt="Guild Coin" className="w-5 h-5" />
                             {(currentUserWithStatus?.guildCoins ?? 0).toLocaleString()}
                        </p>
                    </div>
                </div>
                <div className="flex bg-tertiary/70 p-1 rounded-lg mb-4 flex-shrink-0">
                    <button onClick={() => setActiveTab('equipment')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'equipment' ? 'bg-accent' : 'text-tertiary hover:bg-secondary/50'}`}>장비</button>
                    <button onClick={() => setActiveTab('material')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'material' ? 'bg-accent' : 'text-tertiary hover:bg-secondary/50'}`}>재료</button>
                    <button onClick={() => setActiveTab('consumable')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'consumable' ? 'bg-accent' : 'text-tertiary hover:bg-secondary/50'}`}>소모품</button>
                </div>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2 flex-1">
                    {shopItemsForTab.map(item => (
                        <ShopItemCard key={item.itemId} item={item} />
                    ))}
                </div>
            </div>
        </DraggableWindow>
    );
};

export default GuildShopModal;