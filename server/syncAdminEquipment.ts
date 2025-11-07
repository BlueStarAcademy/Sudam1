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

const syncAdminEquipment = async () => {
    console.log('[Sync Admin] Syncing admin equipment with inventory...');
    
    if (!fs.existsSync(DB_PATH)) {
        console.error(`[Sync Admin] Database file not found: ${DB_PATH}`);
        process.exit(1);
    }
    
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
    
    try {
        const adminUsers = await db.all<UserRow>('SELECT id, username, nickname, isAdmin, equipment, inventory FROM users WHERE isAdmin = 1');
        console.log(`[Sync Admin] Found ${adminUsers.length} admin user(s)\n`);
        
        let syncedCount = 0;
        
        for (const admin of adminUsers) {
            try {
                console.log(`\n[Sync Admin] Processing admin: ${admin.username} (${admin.nickname})`);
                
                // Equipment 파싱
                let equipment: any = {};
                if (admin.equipment && admin.equipment.trim() !== '' && admin.equipment !== 'null') {
                    try {
                        equipment = JSON.parse(admin.equipment);
                    } catch (e) {
                        console.error(`[Sync Admin] Failed to parse equipment: ${e}`);
                        continue;
                    }
                }
                
                // Inventory 파싱
                let inventory: any[] = [];
                if (admin.inventory && admin.inventory.trim() !== '' && admin.inventory !== 'null') {
                    try {
                        inventory = JSON.parse(admin.inventory);
                    } catch (e) {
                        console.error(`[Sync Admin] Failed to parse inventory: ${e}`);
                        continue;
                    }
                }
                
                let needsUpdate = false;
                
                // 1. 모든 인벤토리 아이템의 isEquipped를 false로 설정
                inventory.forEach((item: any) => {
                    if (item.isEquipped === true) {
                        item.isEquipped = false;
                        needsUpdate = true;
                    }
                });
                
                // 2. Equipment에 있는 아이템들을 인벤토리에서 찾아서 isEquipped = true로 설정
                for (const [slot, itemId] of Object.entries(equipment)) {
                    const item = inventory.find((i: any) => i.id === itemId);
                    if (item) {
                        if (!item.isEquipped) {
                            item.isEquipped = true;
                            needsUpdate = true;
                            console.log(`  [Sync Admin] Marked ${item.name || itemId} in slot ${slot} as equipped`);
                        }
                    } else {
                        console.warn(`  [Sync Admin] WARNING: Equipment item ${itemId} in slot ${slot} not found in inventory!`);
                    }
                }
                
                // 3. 업데이트가 필요하면 저장
                if (needsUpdate) {
                    const updatedInventory = JSON.stringify(inventory);
                    await db.run(
                        'UPDATE users SET inventory = ? WHERE id = ?',
                        [updatedInventory, admin.id]
                    );
                    console.log(`  [Sync Admin] ✓ Inventory updated`);
                    syncedCount++;
                } else {
                    console.log(`  [Sync Admin] No sync needed`);
                }
                
            } catch (error: any) {
                console.error(`  [Sync Admin] Error processing admin ${admin.username}:`, error.message);
            }
        }
        
        console.log(`\n\n[Sync Admin] ========================================`);
        console.log(`[Sync Admin] Sync complete!`);
        console.log(`[Sync Admin] - Admin users synced: ${syncedCount}`);
        console.log(`[Sync Admin] ========================================\n`);
        
    } catch (error) {
        console.error('[Sync Admin] Fatal error:', error);
        throw error;
    } finally {
        await db.close();
    }
};

syncAdminEquipment()
    .then(() => {
        console.log('[Sync Admin] Sync script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Sync Admin] Sync script failed:', error);
        process.exit(1);
    });

