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

const forceRestoreEquipment = async () => {
    console.log('[Force Restore] Starting force equipment restoration from database.sqlite...');
    
    // 데이터베이스 파일 존재 확인
    if (!fs.existsSync(DB_PATH)) {
        console.error(`[Force Restore] Database file not found: ${DB_PATH}`);
        process.exit(1);
    }
    
    // 데이터베이스 연결
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
    
    console.log('[Force Restore] Connected to database');
    
    try {
        // 모든 사용자의 장비 및 인벤토리 정보 확인
        const usersResult = await db.all<UserRow>('SELECT id, username, nickname, equipment, inventory FROM users');
        const users: UserRow[] = Array.isArray(usersResult) ? usersResult : [];
        console.log(`[Force Restore] Found ${users.length} users in database\n`);
        
        let restoredCount = 0;
        let fromInventoryCount = 0;
        let emptyEquipmentCount = 0;
        let hasEquipmentCount = 0;
        
        for (const user of users) {
            try {
                console.log(`\n[Force Restore] Processing user: ${user.username} (${user.id})`);
                
                let equipmentToRestore: any = null;
                let source = '';
                
                // 1. 먼저 equipment 필드에서 장비 정보 확인
                if (user.equipment && user.equipment.trim() !== '' && user.equipment !== 'null') {
                    try {
                        const parsed = JSON.parse(user.equipment);
                        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                            equipmentToRestore = parsed;
                            source = 'equipment field';
                            console.log(`  [Force Restore] Found equipment in equipment field: ${Object.keys(parsed).join(', ')}`);
                        } else {
                            console.log(`  [Force Restore] Equipment field is empty object`);
                        }
                    } catch (e) {
                        console.warn(`  [Force Restore] Invalid equipment JSON, trying to fix...`);
                        // 복구 시도
                        try {
                            const fixed = user.equipment.replace(/\\"/g, '"').replace(/\\'/g, "'");
                            const parsed = JSON.parse(fixed);
                            if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                                equipmentToRestore = parsed;
                                source = 'equipment field (fixed)';
                                console.log(`  [Force Restore] Fixed equipment JSON: ${Object.keys(parsed).join(', ')}`);
                            }
                        } catch (e2) {
                            console.warn(`  [Force Restore] Could not fix equipment JSON`);
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
                                console.log(`  [Force Restore] Found ${equippedItems.length} equipped items in inventory`);
                                
                                // slot별로 장비 구성
                                equipmentToRestore = {};
                                for (const item of equippedItems) {
                                    if (item.slot) {
                                        equipmentToRestore[item.slot] = item.id;
                                        console.log(`  [Force Restore] Found equipped item: ${item.name} in slot ${item.slot}`);
                                    }
                                }
                                
                                if (Object.keys(equipmentToRestore).length > 0) {
                                    source = 'inventory (isEquipped=true)';
                                    fromInventoryCount++;
                                }
                            } else {
                                console.log(`  [Force Restore] No equipped items found in inventory`);
                            }
                        }
                    } catch (e) {
                        console.warn(`  [Force Restore] Could not parse inventory: ${e}`);
                    }
                }
                
                // 3. 장비 정보 복원
                if (equipmentToRestore && Object.keys(equipmentToRestore).length > 0) {
                    // 장비 정보를 정리해서 저장
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
                        
                        console.log(`  [Force Restore] ✓ Equipment restored from ${source}`);
                        console.log(`  [Force Restore]   Slots: ${Object.keys(equipmentToRestore).join(', ')}`);
                        restoredCount++;
                        hasEquipmentCount++;
                    } else {
                        console.log(`  [Force Restore] Equipment already correct, no update needed`);
                        hasEquipmentCount++;
                    }
                } else {
                    console.log(`  [Force Restore] ✗ No equipment found for this user`);
                    emptyEquipmentCount++;
                }
                
            } catch (error: any) {
                console.error(`  [Force Restore] Error processing user ${user.username} (${user.id}):`, error.message);
                console.error(`  [Force Restore] Error stack:`, error.stack);
            }
        }
        
        console.log(`\n\n[Force Restore] ========================================`);
        console.log(`[Force Restore] Force restoration complete!`);
        console.log(`[Force Restore] ========================================`);
        console.log(`[Force Restore] - Users with equipment: ${hasEquipmentCount}`);
        console.log(`[Force Restore] - Users without equipment: ${emptyEquipmentCount}`);
        console.log(`[Force Restore] - Equipment restored/updated: ${restoredCount}`);
        console.log(`[Force Restore] - Equipment restored from inventory: ${fromInventoryCount}`);
        console.log(`[Force Restore] ========================================\n`);
        
    } catch (error) {
        console.error('[Force Restore] Fatal error during restoration:', error);
        throw error;
    } finally {
        await db.close();
        console.log('[Force Restore] Database connection closed');
    }
};

// 스크립트 실행
forceRestoreEquipment()
    .then(() => {
        console.log('[Force Restore] Force restoration script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Force Restore] Force restoration script failed:', error);
        process.exit(1);
    });

export { forceRestoreEquipment };

