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
    isAdmin: boolean;
    equipment: string | null;
    inventory: string | null;
}

const checkDatabaseStatus = async () => {
    console.log('[Check Status] Checking database status...');
    
    if (!fs.existsSync(DB_PATH)) {
        console.error(`[Check Status] Database file not found: ${DB_PATH}`);
        process.exit(1);
    }
    
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
    
    try {
        const users: UserRow[] = await db.all<UserRow>('SELECT id, username, nickname, isAdmin, equipment, inventory FROM users');
        console.log(`[Check Status] Found ${users.length} users in database\n`);
        
        const adminUsers = users.filter((u: UserRow) => u.isAdmin);
        console.log(`[Check Status] Admin users: ${adminUsers.length}\n`);
        
        for (const user of adminUsers) {
            console.log(`\n[Check Status] Admin User: ${user.username} (${user.nickname})`);
            console.log(`[Check Status]   ID: ${user.id}`);
            
            // Equipment check
            if (!user.equipment || user.equipment.trim() === '' || user.equipment === 'null') {
                console.log(`[Check Status]   ⚠️  Equipment: NULL or EMPTY`);
            } else {
                try {
                    const eq = JSON.parse(user.equipment);
                    if (typeof eq === 'object' && eq !== null && Object.keys(eq).length > 0) {
                        console.log(`[Check Status]   ✓ Equipment: ${Object.keys(eq).length} slots - ${Object.keys(eq).join(', ')}`);
                    } else {
                        console.log(`[Check Status]   ⚠️  Equipment: Empty object`);
                    }
                } catch (e) {
                    console.log(`[Check Status]   ❌ Equipment: Invalid JSON - ${user.equipment.substring(0, 100)}...`);
                }
            }
            
            // Inventory check
            if (!user.inventory || user.inventory.trim() === '' || user.inventory === 'null') {
                console.log(`[Check Status]   ⚠️  Inventory: NULL or EMPTY`);
            } else {
                try {
                    const inv = JSON.parse(user.inventory);
                    if (Array.isArray(inv) && inv.length > 0) {
                        console.log(`[Check Status]   ✓ Inventory: ${inv.length} items`);
                        const equipmentItems = inv.filter((i: any) => i.type === 'equipment');
                        const consumableItems = inv.filter((i: any) => i.type === 'consumable');
                        const materialItems = inv.filter((i: any) => i.type === 'material');
                        console.log(`[Check Status]     - Equipment: ${equipmentItems.length}`);
                        console.log(`[Check Status]     - Consumable: ${consumableItems.length}`);
                        console.log(`[Check Status]     - Material: ${materialItems.length}`);
                    } else {
                        console.log(`[Check Status]   ⚠️  Inventory: Empty array`);
                    }
                } catch (e) {
                    console.log(`[Check Status]   ❌ Inventory: Invalid JSON - ${user.inventory.substring(0, 100)}...`);
                }
            }
        }
        
        // Check all users summary
        let usersWithEquipment = 0;
        let usersWithInventory = 0;
        let emptyEquipment = 0;
        let emptyInventory = 0;
        
        for (const user of users as UserRow[]) {
            if (user.equipment && user.equipment.trim() !== '' && user.equipment !== 'null') {
                try {
                    const eq = JSON.parse(user.equipment);
                    if (typeof eq === 'object' && eq !== null && Object.keys(eq).length > 0) {
                        usersWithEquipment++;
                    } else {
                        emptyEquipment++;
                    }
                } catch (e) {
                    emptyEquipment++;
                }
            } else {
                emptyEquipment++;
            }
            
            if (user.inventory && user.inventory.trim() !== '' && user.inventory !== 'null') {
                try {
                    const inv = JSON.parse(user.inventory);
                    if (Array.isArray(inv) && inv.length > 0) {
                        usersWithInventory++;
                    } else {
                        emptyInventory++;
                    }
                } catch (e) {
                    emptyInventory++;
                }
            } else {
                emptyInventory++;
            }
        }
        
        console.log(`\n[Check Status] ========================================`);
        console.log(`[Check Status] Summary:`);
        console.log(`[Check Status]   Users with equipment: ${usersWithEquipment}`);
        console.log(`[Check Status]   Users without equipment: ${emptyEquipment}`);
        console.log(`[Check Status]   Users with inventory: ${usersWithInventory}`);
        console.log(`[Check Status]   Users without inventory: ${emptyInventory}`);
        console.log(`[Check Status] ========================================\n`);
        
    } catch (error) {
        console.error('[Check Status] Error:', error);
        throw error;
    } finally {
        await db.close();
    }
};

checkDatabaseStatus()
    .then(() => {
        console.log('[Check Status] Status check completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Check Status] Status check failed:', error);
        process.exit(1);
    });

export { checkDatabaseStatus };

