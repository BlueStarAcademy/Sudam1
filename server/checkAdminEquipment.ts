import { Database } from 'sqlite';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.resolve('database.sqlite');

interface UserRow {
    id: string;
    username: string;
    nickname: string;
    isAdmin: number;
    equipment: string | null;
    inventory: string | null;
}

const checkAdminEquipment = async () => {
    console.log('[Check Admin] Checking admin equipment status...');
    
    if (!fs.existsSync(DB_PATH)) {
        console.error(`[Check Admin] Database file not found: ${DB_PATH}`);
        process.exit(1);
    }
    
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
    
    try {
        const adminUsers = await db.all<UserRow>('SELECT id, username, nickname, isAdmin, equipment, inventory FROM users WHERE isAdmin = 1');
        console.log(`[Check Admin] Found ${adminUsers.length} admin user(s)\n`);
        
        for (const admin of adminUsers) {
            console.log(`\n[Check Admin] Admin: ${admin.username} (${admin.nickname})`);
            console.log(`[Check Admin] ID: ${admin.id}`);
            
            // Equipment 확인
            let equipment: any = {};
            if (admin.equipment && admin.equipment.trim() !== '' && admin.equipment !== 'null') {
                try {
                    equipment = JSON.parse(admin.equipment);
                    console.log(`[Check Admin] Equipment field: ${Object.keys(equipment).length} slots`);
                    for (const [slot, itemId] of Object.entries(equipment)) {
                        console.log(`  - ${slot}: ${itemId}`);
                    }
                } catch (e) {
                    console.error(`[Check Admin] Failed to parse equipment: ${e}`);
                }
            } else {
                console.log(`[Check Admin] Equipment field: EMPTY`);
            }
            
            // Inventory 확인
            let inventory: any[] = [];
            if (admin.inventory && admin.inventory.trim() !== '' && admin.inventory !== 'null') {
                try {
                    inventory = JSON.parse(admin.inventory);
                    console.log(`[Check Admin] Inventory: ${inventory.length} items`);
                    
                    // Equipment에 있는 아이템들이 인벤토리에 있는지 확인
                    const equipmentItemIds = Object.values(equipment);
                    console.log(`[Check Admin] Checking if equipment items exist in inventory...`);
                    
                    for (const [slot, itemId] of Object.entries(equipment)) {
                        const itemInInventory = inventory.find((item: any) => item.id === itemId);
                        if (itemInInventory) {
                            console.log(`  ✓ ${slot} (${itemId}): Found in inventory - ${itemInInventory.name || 'unnamed'}`);
                            if (!itemInInventory.isEquipped) {
                                console.log(`    ⚠ WARNING: Item is not marked as equipped!`);
                            }
                        } else {
                            console.log(`  ✗ ${slot} (${itemId}): NOT FOUND in inventory!`);
                        }
                    }
                    
                    // 장착된 아이템들 확인
                    const equippedItems = inventory.filter((item: any) => item.isEquipped === true);
                    console.log(`[Check Admin] Equipped items in inventory: ${equippedItems.length}`);
                    for (const item of equippedItems) {
                        const slot = item.slot;
                        const equipmentItemId = equipment[slot];
                        if (equipmentItemId === item.id) {
                            console.log(`  ✓ ${slot}: ${item.name || item.id} - Synced`);
                        } else {
                            console.log(`  ⚠ ${slot}: ${item.name || item.id} - MISMATCH (equipment has: ${equipmentItemId || 'none'})`);
                        }
                    }
                } catch (e) {
                    console.error(`[Check Admin] Failed to parse inventory: ${e}`);
                }
            } else {
                console.log(`[Check Admin] Inventory: EMPTY`);
                console.log(`[Check Admin] ⚠ WARNING: Inventory is empty but equipment exists!`);
            }
        }
        
    } catch (error) {
        console.error('[Check Admin] Fatal error:', error);
        throw error;
    } finally {
        await db.close();
    }
};

checkAdminEquipment()
    .then(() => {
        console.log('\n[Check Admin] Check completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Check Admin] Check failed:', error);
        process.exit(1);
    });

