


import { randomUUID } from 'crypto';
import * as db from '../db.js';
import { type ServerAction, type User, type VolatileState, InventoryItem } from '../../types.js';
import * as shop from '../shop.js';
import { SHOP_ITEMS } from '../shop.js';
import { isSameDayKST, isDifferentWeekKST } from '../../utils/timeUtils.js';
import { CONSUMABLE_ITEMS, MATERIAL_ITEMS, ACTION_POINT_PURCHASE_COSTS_DIAMONDS, MAX_ACTION_POINT_PURCHASES_PER_DAY, ACTION_POINT_PURCHASE_REFILL_AMOUNT, SHOP_BORDER_ITEMS } from '../../constants.js';
import { addItemsToInventory } from '../../utils/inventoryUtils.js';

type HandleActionResult = { 
    clientResponse?: any;
    error?: string;
};

export const handleShopAction = async (volatileState: VolatileState, action: ServerAction & { userId: string }, user: User): Promise<HandleActionResult> => {
    const { type, payload } = action;

    switch (type) {
        case 'BUY_SHOP_ITEM': {
            const { itemId, quantity } = payload;
            const shopItem = SHOP_ITEMS[itemId as keyof typeof SHOP_ITEMS];
            if (!shopItem || shopItem.type !== 'equipment') {
                return { error: '유효하지 않은 장비 상자입니다.' };
            }

            const cost = shopItem.cost;
            const totalGoldCost = (cost.gold || 0) * quantity;
            const totalDiamondCost = (cost.diamonds || 0) * quantity;

            if (!user.isAdmin) {
                if (user.gold < totalGoldCost || user.diamonds < totalDiamondCost) {
                    return { error: '재화가 부족합니다.' };
                }
            }

            const obtainedItems: InventoryItem[] = [];
            for (let i = 0; i < quantity; i++) {
                const result = shopItem.onPurchase();
                obtainedItems.push(...(Array.isArray(result) ? result : [result]));
            }

            const { success, finalItemsToAdd } = addItemsToInventory(user.inventory, user.inventorySlots, obtainedItems);
            if (!success) {
                return { error: '인벤토리 공간이 부족합니다.' };
            }
            
            if (!user.isAdmin) {
                user.gold -= totalGoldCost;
                user.diamonds -= totalDiamondCost;
            }

            user.inventory.push(...finalItemsToAdd);
            await db.updateUser(user);

            return { clientResponse: { obtainedItemsBulk: obtainedItems, updatedUser: user } };
        }
        case 'BUY_MATERIAL_BOX': {
            const { itemId, quantity } = payload;
            const shopItem = SHOP_ITEMS[itemId as keyof typeof SHOP_ITEMS] as any;

            if (!shopItem || shopItem.type !== 'material') {
                return { error: '유효하지 않은 재료 상자입니다.' };
            }
            
            const now = Date.now();
            if (!user.dailyShopPurchases) user.dailyShopPurchases = {};
            const purchaseRecord = user.dailyShopPurchases[itemId];

            let purchasesThisPeriod = 0;
            let limit = Infinity;
            let limitText = '';
            let resetPurchaseRecord = false;
        
            if (shopItem.weeklyLimit) {
                limit = shopItem.weeklyLimit;
                // FIX: Corrected typo from `limitType` to `limitText`.
                limitText = '이번 주';
                if (purchaseRecord && !isDifferentWeekKST(purchaseRecord.date, now)) {
                    purchasesThisPeriod = purchaseRecord.quantity;
                } else {
                    resetPurchaseRecord = true;
                }
            } else if (shopItem.dailyLimit) {
                limit = shopItem.dailyLimit;
                // FIX: Corrected typo from `limitType` to `limitText`.
                limitText = '오늘';
                if (purchaseRecord && isSameDayKST(purchaseRecord.date, now)) {
                    purchasesThisPeriod = purchaseRecord.quantity;
                } else {
                    resetPurchaseRecord = true;
                }
            }
            
            if (!user.isAdmin) {
                if (purchasesThisPeriod + quantity > limit) {
                    // FIX: Corrected typo from `limitType` to `limitText`.
                    return { error: `${limitText} 구매 한도를 초과했습니다.` };
                }
            }
            
            const allObtainedItems: InventoryItem[] = [];
            for (let i = 0; i < quantity; i++) {
                const itemsFromBox = shopItem.onPurchase();
                allObtainedItems.push(...itemsFromBox);
            }
            
            const { success } = addItemsToInventory([...user.inventory], user.inventorySlots, allObtainedItems);
            if (!success) {
                return { error: '모든 아이템을 받기에 가방 공간이 부족합니다.' };
            }

            const totalCost = {
                gold: (shopItem.cost.gold || 0) * quantity,
                diamonds: (shopItem.cost.diamonds || 0) * quantity,
            };
            
            if (!user.isAdmin) {
                if (user.gold < totalCost.gold || user.diamonds < totalCost.diamonds) {
                    return { error: '재화가 부족합니다.' };
                }
                user.gold -= totalCost.gold;
                user.diamonds -= totalCost.diamonds;
            }
            
            addItemsToInventory(user.inventory, user.inventorySlots, allObtainedItems);
            
            if (!user.isAdmin) {
                if (resetPurchaseRecord || !user.dailyShopPurchases[itemId]) {
                    user.dailyShopPurchases[itemId] = { quantity: 0, date: now };
                }
                user.dailyShopPurchases[itemId].quantity = purchasesThisPeriod + quantity;
                user.dailyShopPurchases[itemId].date = now;
            }
            
            await db.updateUser(user);

            const aggregated: Record<string, number> = {};
            allObtainedItems.forEach(item => {
                aggregated[item.name] = (aggregated[item.name] || 0) + (item.quantity || 1);
            });
            const itemsToAdd = Object.keys(aggregated).map(name => ({ ...allObtainedItems.find(i => i.name === name)!, quantity: aggregated[name] }));

            return { clientResponse: { obtainedItemsBulk: itemsToAdd, updatedUser: user } };
        }
        case 'PURCHASE_ACTION_POINTS': {
            const now = Date.now();
            const purchasesToday = isSameDayKST(user.lastActionPointPurchaseDate || 0, now) 
                ? (user.actionPointPurchasesToday || 0) 
                : 0;

            if (purchasesToday >= MAX_ACTION_POINT_PURCHASES_PER_DAY && !user.isAdmin) {
                return { error: '오늘 구매 한도를 초과했습니다.' };
            }

            const cost = ACTION_POINT_PURCHASE_COSTS_DIAMONDS[purchasesToday];
            if (user.diamonds < cost && !user.isAdmin) {
                return { error: '다이아가 부족합니다.' };
            }

            if (!user.isAdmin) {
                user.diamonds -= cost;
                user.actionPointPurchasesToday = purchasesToday + 1;
                user.lastActionPointPurchaseDate = now;
            }
            user.actionPoints.current += ACTION_POINT_PURCHASE_REFILL_AMOUNT;
            
            await db.updateUser(user);
            return { clientResponse: { updatedUser: user } };
        }
        case 'EXPAND_INVENTORY': {
            const EXPANSION_COST_DIAMONDS = 100;
            const EXPANSION_AMOUNT = 10;
            const MAX_INVENTORY_SIZE = 100;
            
            if (user.inventorySlots >= MAX_INVENTORY_SIZE) {
                return { error: '가방을 더 이상 확장할 수 없습니다.' };
            }

            if (!user.isAdmin) {
                if (user.diamonds < EXPANSION_COST_DIAMONDS) {
                    return { error: '다이아가 부족합니다.' };
                }
                user.diamonds -= EXPANSION_COST_DIAMONDS;
            }
            
            user.inventorySlots = Math.min(MAX_INVENTORY_SIZE, user.inventorySlots + EXPANSION_AMOUNT);
            
            await db.updateUser(user);
            return { clientResponse: { updatedUser: user } };
        }
        case 'BUY_BORDER': {
            const { borderId } = payload;
            const borderItem = SHOP_BORDER_ITEMS.find(b => b.id === borderId);
            if (!borderItem) return { error: '판매하지 않는 테두리입니다.' };
            if (user.ownedBorders.includes(borderId)) return { error: '이미 보유한 테두리입니다.' };

            const cost = borderItem.price.gold || 0;
            if (user.gold < cost && !user.isAdmin) return { error: '골드가 부족합니다.' };
            
            const diamondCost = borderItem.price.diamonds || 0;
            if (user.diamonds < diamondCost && !user.isAdmin) return { error: '다이아가 부족합니다.' };

            if (!user.isAdmin) {
                user.gold -= cost;
                user.diamonds -= diamondCost;
            }

            user.ownedBorders.push(borderId);
            await db.updateUser(user);
            return { clientResponse: { updatedUser: user } };
        }
        default:
            return { error: 'Unknown shop action.' };
    }
};