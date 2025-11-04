import { randomUUID } from 'crypto';
import { InventoryItem, InventoryItemType } from '../types.js';
import { CONSUMABLE_ITEMS, MATERIAL_ITEMS } from '../constants';

export const addItemsToInventory = (currentInventory: InventoryItem[], inventorySlots: { equipment: number; consumable: number; material: number; }, itemsToAdd: InventoryItem[]): { success: boolean, finalItemsToAdd: InventoryItem[] } => {
    const tempInventory = JSON.parse(JSON.stringify(currentInventory));
    const finalItemsToAdd: InventoryItem[] = [];

    const itemsByType = {
        equipment: itemsToAdd.filter(item => item.type === 'equipment'),
        consumable: itemsToAdd.filter(item => item.type === 'consumable'),
        material: itemsToAdd.filter(item => item.type === 'material'),
    };

    // First, check space for non-stackable items (equipment)
    const currentEquipmentCount = tempInventory.filter((item: InventoryItem) => item.type === 'equipment').length;
    if (itemsByType.equipment.length > (inventorySlots.equipment - currentEquipmentCount)) {
        return { success: false, finalItemsToAdd: [] };
    }
    finalItemsToAdd.push(...itemsByType.equipment);

    // Then, check space and process stackable items (consumables and materials)
    for (const category of ['consumable', 'material'] as const) {
        const items = itemsByType[category];
        if (items.length === 0) continue;

        const currentCategoryItems = tempInventory.filter((item: InventoryItem) => item.type === category);
        let currentCategorySlotsUsed = currentCategoryItems.length;

        const stackableToAdd: Record<string, number> = {};
        for(const item of items) {
            stackableToAdd[item.name] = (stackableToAdd[item.name] || 0) + (item.quantity || 1);
        }

        let neededNewSlots = 0;
        for (const name in stackableToAdd) {
            let quantityToPlace = stackableToAdd[name];
            
            // Try to stack into existing items first
            for (const existingItem of currentCategoryItems) {
                if (quantityToPlace <= 0) break;
                if (existingItem.name === name && (existingItem.quantity || 0) < 100) {
                    const space = 100 - (existingItem.quantity || 0);
                    const toAdd = Math.min(quantityToPlace, space);
                    // Simulate stacking in temp inventory
                    existingItem.quantity = (existingItem.quantity || 0) + toAdd;
                    quantityToPlace -= toAdd;
                }
            }
            // If still quantity left, new slots are needed
            if (quantityToPlace > 0) {
                neededNewSlots += Math.ceil(quantityToPlace / 100);
            }
        }

        if ((currentCategorySlotsUsed + neededNewSlots) > inventorySlots[category]) {
            return { success: false, finalItemsToAdd: [] };
        }

        // If successful, add stackable items to finalItemsToAdd, handling new stacks
        for (const item of items) {
            let quantityLeft = item.quantity || 1;
            // Try to stack into items already in finalItemsToAdd (from this batch)
            for (const finalItem of finalItemsToAdd) {
                if (quantityLeft <= 0) break;
                if (finalItem.name === item.name && (finalItem.quantity || 0) < 100) {
                    const space = 100 - (finalItem.quantity || 0);
                    const toAdd = Math.min(quantityLeft, space);
                    finalItem.quantity = (finalItem.quantity || 0) + toAdd;
                    quantityLeft -= toAdd;
                }
            }
            // If still quantity left, add as new items
            while (quantityLeft > 0) {
                const toAdd = Math.min(quantityLeft, 100);
                const template = [...Object.values(CONSUMABLE_ITEMS), ...Object.values(MATERIAL_ITEMS)].find(t => t.name === item.name) as Omit<InventoryItem, 'id'|'createdAt'|'isEquipped'|'level'|'stars'|'options'>;
                if (template) {
                     finalItemsToAdd.push({ ...template, id: `item-${randomUUID()}`, quantity: toAdd, createdAt: Date.now(), isEquipped: false, stars: 0, level: 1 });
                }
                quantityLeft -= toAdd;
            }
        }
    }

    return { success: true, finalItemsToAdd };
};

export const createItemInstancesFromReward = (itemRefs: (InventoryItem | { itemId: string; quantity: number })[]): InventoryItem[] => {
    const createdItems: InventoryItem[] = [];
    for (const itemRef of itemRefs) {
        if ('id' in itemRef) { // It's a full InventoryItem, just pass it through
            createdItems.push(itemRef);
            continue;
        }

        const { itemId, quantity } = itemRef;
        
        // This logic finds the item template and creates an instance, which is correct for granting a reward item.
        // It avoids the previous issue of "opening" the item via shop logic.
        const template = [...CONSUMABLE_ITEMS, ...Object.values(MATERIAL_ITEMS)].find(t => t.name === itemId);

        if (template) {
            const newItem: InventoryItem = {
                ...template,
                id: `item-${randomUUID()}`,
                createdAt: Date.now(),
                quantity: quantity,
                isEquipped: false, 
                level: 1,
                stars: 0,
                options: undefined,
            };
            createdItems.push(newItem);
        } else {
            console.error(`[Reward] Could not find consumable/material item template for: ${itemId}`);
        }
    }
    return createdItems;
};