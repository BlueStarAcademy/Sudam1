import { Database } from 'sqlite';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// 프로젝트 루트에서 데이터베이스 파일 찾기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname.includes('server') ? path.resolve(__dirname, '..') : process.cwd();
const DB_PATH = path.resolve(projectRoot, 'database.sqlite');

interface UserRow {
    id: string;
    username: string;
    nickname: string;
    equipment: string | null;
    inventory: string | null;
}

const emergencyRestoreAll = async () => {
    console.log('[Emergency Restore] Starting emergency restoration of equipment and inventory from database.sqlite...');
    
    // 데이터베이스 파일 존재 확인
    if (!fs.existsSync(DB_PATH)) {
        console.error(`[Emergency Restore] Database file not found: ${DB_PATH}`);
        process.exit(1);
    }
    
    // 데이터베이스 연결
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
    
    console.log('[Emergency Restore] Connected to database');
    
    try {
        // 모든 사용자의 장비 및 인벤토리 정보 확인
        const users = await db.all<UserRow>('SELECT id, username, nickname, equipment, inventory FROM users');
        console.log(`[Emergency Restore] Found ${users.length} users in database\n`);
        
        let restoredEquipmentCount = 0;
        let restoredInventoryCount = 0;
        let emptyEquipmentCount = 0;
        let emptyInventoryCount = 0;
        let hasEquipmentCount = 0;
        let hasInventoryCount = 0;
        let fromInventoryCount = 0;
        
        for (const user of users) {
            try {
                console.log(`\n[Emergency Restore] Processing user: ${user.username} (${user.id})`);
                
                // ========== 장비 복구 ==========
                let equipmentToRestore: any = null;
                let equipmentSource = '';
                
                // 1. 먼저 equipment 필드에서 장비 정보 확인
                if (user.equipment && user.equipment.trim() !== '' && user.equipment !== 'null') {
                    try {
                        const parsed = JSON.parse(user.equipment);
                        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                            equipmentToRestore = parsed;
                            equipmentSource = 'equipment field';
                            console.log(`  [Emergency Restore] Found equipment in equipment field: ${Object.keys(parsed).join(', ')}`);
                        } else {
                            console.log(`  [Emergency Restore] Equipment field is empty object`);
                        }
                    } catch (e) {
                        console.warn(`  [Emergency Restore] Invalid equipment JSON, trying to fix...`);
                        try {
                            const fixed = user.equipment.replace(/\\"/g, '"').replace(/\\'/g, "'");
                            const parsed = JSON.parse(fixed);
                            if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                                equipmentToRestore = parsed;
                                equipmentSource = 'equipment field (fixed)';
                                console.log(`  [Emergency Restore] Fixed equipment JSON: ${Object.keys(parsed).join(', ')}`);
                            }
                        } catch (e2) {
                            console.warn(`  [Emergency Restore] Could not fix equipment JSON`);
                        }
                    }
                }
                
                // 2. equipment 필드에 없으면 inventory에서 장착된 아이템 찾기
                if (!equipmentToRestore && user.inventory && user.inventory.trim() !== '' && user.inventory !== 'null') {
                    try {
                        const inventory = JSON.parse(user.inventory);
                        if (Array.isArray(inventory) && inventory.length > 0) {
                            // isEquipped가 true인 아이템 찾기
                            const equippedItems = inventory.filter((item: any) => item.isEquipped === true);
                            
                            if (equippedItems.length > 0) {
                                console.log(`  [Emergency Restore] Found ${equippedItems.length} equipped items in inventory`);
                                
                                // slot별로 장비 구성
                                equipmentToRestore = {};
                                for (const item of equippedItems) {
                                    if (item.slot) {
                                        equipmentToRestore[item.slot] = item.id;
                                        console.log(`  [Emergency Restore] Found equipped item: ${item.name} in slot ${item.slot}`);
                                    }
                                }
                                
                                if (Object.keys(equipmentToRestore).length > 0) {
                                    equipmentSource = 'inventory (isEquipped=true)';
                                    fromInventoryCount++;
                                }
                            }
                        }
                    } catch (e) {
                        console.warn(`  [Emergency Restore] Could not parse inventory for equipment restore: ${e}`);
                    }
                }
                
                // 장비 정보 복원
                if (equipmentToRestore && Object.keys(equipmentToRestore).length > 0) {
                    const cleanedEquipment = JSON.stringify(equipmentToRestore);
                    
                    // 현재 데이터베이스의 equipment 필드와 비교
                    let currentEquipment: any = {};
                    try {
                        if (user.equipment && user.equipment.trim() !== '' && user.equipment !== 'null') {
                            currentEquipment = JSON.parse(user.equipment);
                        }
                    } catch (e) {
                        // 현재 장비가 없거나 파싱 불가
                    }
                    
                    // 현재 장비와 복원할 장비가 다르면 업데이트
                    const currentKeys = Object.keys(currentEquipment || {}).sort().join(',');
                    const restoreKeys = Object.keys(equipmentToRestore).sort().join(',');
                    
                    if (currentKeys !== restoreKeys || JSON.stringify(currentEquipment) !== JSON.stringify(equipmentToRestore)) {
                        await db.run(
                            'UPDATE users SET equipment = ? WHERE id = ?',
                            [cleanedEquipment, user.id]
                        );
                        
                        console.log(`  [Emergency Restore] ✓ Equipment restored from ${equipmentSource}`);
                        console.log(`  [Emergency Restore]   Slots: ${Object.keys(equipmentToRestore).join(', ')}`);
                        restoredEquipmentCount++;
                        hasEquipmentCount++;
                    } else {
                        console.log(`  [Emergency Restore] Equipment already correct, no update needed`);
                        hasEquipmentCount++;
                    }
                } else {
                    console.log(`  [Emergency Restore] ✗ No equipment found for this user`);
                    emptyEquipmentCount++;
                }
                
                // ========== 인벤토리 복구 ==========
                let inventoryToRestore: any[] = null;
                let inventorySource = '';
                
                // 1. inventory 필드에서 인벤토리 정보 확인
                if (user.inventory && user.inventory.trim() !== '' && user.inventory !== 'null') {
                    try {
                        const parsed = JSON.parse(user.inventory);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            inventoryToRestore = parsed;
                            inventorySource = 'inventory field';
                            console.log(`  [Emergency Restore] Found ${parsed.length} items in inventory field`);
                            hasInventoryCount++;
                        } else {
                            console.log(`  [Emergency Restore] Inventory field is empty array`);
                            emptyInventoryCount++;
                        }
                    } catch (e) {
                        console.warn(`  [Emergency Restore] Invalid inventory JSON, trying to fix...`);
                        try {
                            const fixed = user.inventory.replace(/\\"/g, '"').replace(/\\'/g, "'");
                            const parsed = JSON.parse(fixed);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                inventoryToRestore = parsed;
                                inventorySource = 'inventory field (fixed)';
                                console.log(`  [Emergency Restore] Fixed inventory JSON: ${parsed.length} items`);
                                hasInventoryCount++;
                            } else {
                                emptyInventoryCount++;
                            }
                        } catch (e2) {
                            console.warn(`  [Emergency Restore] Could not fix inventory JSON`);
                            emptyInventoryCount++;
                        }
                    }
                } else {
                    console.log(`  [Emergency Restore] ✗ No inventory data found for this user`);
                    emptyInventoryCount++;
                }
                
                // 인벤토리 정보 복원 (항상 업데이트하여 데이터베이스에 확실히 저장)
                if (inventoryToRestore && inventoryToRestore.length > 0) {
                    // 인벤토리 아이템들의 isEquipped 플래그를 equipment와 동기화
                    const cleanedInventory = inventoryToRestore.map(item => {
                        const isEquipped = equipmentToRestore && Object.values(equipmentToRestore).includes(item.id);
                        return {
                            ...item,
                            isEquipped: isEquipped || false
                        };
                    });
                    
                    const cleanedInventoryJson = JSON.stringify(cleanedInventory);
                    
                    // 현재 데이터베이스의 inventory와 비교
                    let currentInventory: any[] = [];
                    try {
                        if (user.inventory && user.inventory.trim() !== '' && user.inventory !== 'null') {
                            currentInventory = JSON.parse(user.inventory);
                        }
                    } catch (e) {
                        // 현재 인벤토리가 없거나 파싱 불가
                    }
                    
                    // 현재 인벤토리와 복원할 인벤토리가 다르면 업데이트
                    if (JSON.stringify(currentInventory) !== cleanedInventoryJson) {
                        await db.run(
                            'UPDATE users SET inventory = ? WHERE id = ?',
                            [cleanedInventoryJson, user.id]
                        );
                        
                        console.log(`  [Emergency Restore] ✓ Inventory restored from ${inventorySource}`);
                        console.log(`  [Emergency Restore]   Items: ${cleanedInventory.length}`);
                        restoredInventoryCount++;
                    } else {
                        console.log(`  [Emergency Restore] Inventory already correct, no update needed`);
                    }
                }
                
            } catch (error: any) {
                console.error(`  [Emergency Restore] Error processing user ${user.username} (${user.id}):`, error.message);
                console.error(`  [Emergency Restore] Error stack:`, error.stack);
            }
        }
        
        console.log(`\n\n[Emergency Restore] ========================================`);
        console.log(`[Emergency Restore] Emergency restoration complete!`);
        console.log(`[Emergency Restore] ========================================`);
        console.log(`[Emergency Restore] Equipment:`);
        console.log(`[Emergency Restore]   - Users with equipment: ${hasEquipmentCount}`);
        console.log(`[Emergency Restore]   - Users without equipment: ${emptyEquipmentCount}`);
        console.log(`[Emergency Restore]   - Equipment restored/updated: ${restoredEquipmentCount}`);
        console.log(`[Emergency Restore]   - Equipment restored from inventory: ${fromInventoryCount}`);
        console.log(`[Emergency Restore] Inventory:`);
        console.log(`[Emergency Restore]   - Users with inventory: ${hasInventoryCount}`);
        console.log(`[Emergency Restore]   - Users without inventory: ${emptyInventoryCount}`);
        console.log(`[Emergency Restore]   - Inventory restored/updated: ${restoredInventoryCount}`);
        console.log(`[Emergency Restore] ========================================\n`);
        
    } catch (error) {
        console.error('[Emergency Restore] Fatal error during restoration:', error);
        throw error;
    } finally {
        await db.close();
        console.log('[Emergency Restore] Database connection closed');
    }
};

// 스크립트 실행
emergencyRestoreAll()
    .then(() => {
        console.log('[Emergency Restore] Emergency restoration script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Emergency Restore] Emergency restoration script failed:', error);
        process.exit(1);
    });

export { emergencyRestoreAll };

