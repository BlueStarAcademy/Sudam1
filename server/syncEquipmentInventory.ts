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
    equipment: string | null;
    inventory: string | null;
}

const syncEquipmentInventory = async () => {
    console.log('[Sync] Starting equipment-inventory synchronization...');
    
    // 데이터베이스 파일 존재 확인
    if (!fs.existsSync(DB_PATH)) {
        console.error(`[Sync] Database file not found: ${DB_PATH}`);
        process.exit(1);
    }
    
    // 데이터베이스 연결
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
    
    console.log('[Sync] Connected to database');
    
    try {
        // 모든 사용자의 장비 및 인벤토리 정보 확인
        const users = await db.all<UserRow>('SELECT id, username, nickname, equipment, inventory FROM users');
        console.log(`[Sync] Found ${users.length} users in database\n`);
        
        let syncedCount = 0;
        let fixedCount = 0;
        let noEquipmentCount = 0;
        
        for (const user of users) {
            try {
                console.log(`\n[Sync] Processing user: ${user.username} (${user.id})`);
                
                // 1. equipment 필드 파싱
                let equipment: Record<string, string> = {};
                if (user.equipment && user.equipment.trim() !== '' && user.equipment !== 'null') {
                    try {
                        equipment = JSON.parse(user.equipment);
                    } catch (e) {
                        console.warn(`  [Sync] Invalid equipment JSON, skipping...`);
                        continue;
                    }
                }
                
                // 2. inventory 필드 파싱
                let inventory: any[] = [];
                if (user.inventory && user.inventory.trim() !== '' && user.inventory !== 'null') {
                    try {
                        inventory = JSON.parse(user.inventory);
                        if (!Array.isArray(inventory)) {
                            console.warn(`  [Sync] Inventory is not an array, skipping...`);
                            continue;
                        }
                    } catch (e) {
                        console.warn(`  [Sync] Invalid inventory JSON, skipping...`);
                        continue;
                    }
                }
                
                if (Object.keys(equipment).length === 0) {
                    console.log(`  [Sync] No equipment found`);
                    noEquipmentCount++;
                    continue;
                }
                
                console.log(`  [Sync] Equipment slots: ${Object.keys(equipment).join(', ')}`);
                console.log(`  [Sync] Inventory items: ${inventory.length}`);
                
                // 3. equipment의 아이템 ID들이 inventory에 존재하는지 확인
                let needsUpdate = false;
                const equipmentItemIds = Object.values(equipment);
                
                // 먼저 모든 장비 아이템의 isEquipped를 false로 설정
                inventory.forEach(item => {
                    if (item.isEquipped === true) {
                        item.isEquipped = false;
                        needsUpdate = true;
                    }
                });
                
                // equipment에 있는 아이템 ID들을 inventory에서 찾아서 isEquipped = true로 설정
                const cleanedEquipment: Record<string, string> = {};
                let foundItems = 0;
                let missingItems = 0;
                
                for (const [slot, itemId] of Object.entries(equipment)) {
                    const item = inventory.find((i: any) => i.id === itemId);
                    
                    if (item) {
                        // 아이템이 인벤토리에 있음
                        if (item.type === 'equipment' && item.slot === slot) {
                            item.isEquipped = true;
                            cleanedEquipment[slot] = itemId;
                            foundItems++;
                            needsUpdate = true;
                            console.log(`  [Sync] ✓ Found item ${item.name} (${itemId}) in slot ${slot}`);
                        } else {
                            // 슬롯이 맞지 않음
                            console.warn(`  [Sync] ⚠ Item ${itemId} slot mismatch: expected ${slot}, got ${item.slot}`);
                            missingItems++;
                        }
                    } else {
                        // 아이템이 인벤토리에 없음
                        console.warn(`  [Sync] ✗ Item ${itemId} not found in inventory for slot ${slot}`);
                        missingItems++;
                    }
                }
                
                // 4. 항상 업데이트 (데이터베이스에 확실히 저장)
                const cleanedEquipmentJson = JSON.stringify(cleanedEquipment);
                const updatedInventoryJson = JSON.stringify(inventory);
                
                // 항상 업데이트하여 데이터베이스에 반영
                await db.run(
                    'UPDATE users SET equipment = ?, inventory = ? WHERE id = ?',
                    [cleanedEquipmentJson, updatedInventoryJson, user.id]
                );
                
                if (missingItems > 0) {
                    console.log(`  [Sync] ✓ Synced (removed ${missingItems} missing items, found ${foundItems} items)`);
                    fixedCount++;
                } else if (foundItems > 0) {
                    console.log(`  [Sync] ✓ Synced (found ${foundItems} items, isEquipped flags updated)`);
                } else {
                    console.log(`  [Sync] ✓ Synced (removed all missing equipment)`);
                }
                syncedCount++;
                
            } catch (error: any) {
                console.error(`  [Sync] Error processing user ${user.username} (${user.id}):`, error.message);
                console.error(`  [Sync] Error stack:`, error.stack);
            }
        }
        
        console.log(`\n\n[Sync] ========================================`);
        console.log(`[Sync] Synchronization complete!`);
        console.log(`[Sync] ========================================`);
        console.log(`[Sync] - Users synced: ${syncedCount}`);
        console.log(`[Sync] - Users fixed (removed missing items): ${fixedCount}`);
        console.log(`[Sync] - Users without equipment: ${noEquipmentCount}`);
        console.log(`[Sync] ========================================\n`);
        
    } catch (error) {
        console.error('[Sync] Fatal error during synchronization:', error);
        throw error;
    } finally {
        await db.close();
        console.log('[Sync] Database connection closed');
    }
};

// 스크립트 실행
syncEquipmentInventory()
    .then(() => {
        console.log('[Sync] Synchronization script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Sync] Synchronization script failed:', error);
        process.exit(1);
    });

export { syncEquipmentInventory };

