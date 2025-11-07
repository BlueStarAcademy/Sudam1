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
    isAdmin: number; // SQLite에서는 boolean이 0/1로 저장됨
    equipment: string | null;
    inventory: string | null;
}

const restoreAdminEquipment = async () => {
    console.log('[Restore Admin] Starting admin equipment restoration from database.sqlite...');
    
    // 데이터베이스 파일 존재 확인
    if (!fs.existsSync(DB_PATH)) {
        console.error(`[Restore Admin] Database file not found: ${DB_PATH}`);
        process.exit(1);
    }
    
    // 데이터베이스 연결
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
    
    console.log('[Restore Admin] Connected to database');
    
    try {
        // 관리자 계정 찾기
        const adminUsers = await db.all<UserRow>('SELECT id, username, nickname, isAdmin, equipment, inventory FROM users WHERE isAdmin = 1');
        console.log(`[Restore Admin] Found ${adminUsers.length} admin user(s) in database\n`);
        
        if (adminUsers.length === 0) {
            console.log('[Restore Admin] No admin users found in database');
            return;
        }
        
        let restoredCount = 0;
        let fromInventoryCount = 0;
        let emptyEquipmentCount = 0;
        let hasEquipmentCount = 0;
        
        for (const admin of adminUsers) {
            try {
                console.log(`\n[Restore Admin] Processing admin: ${admin.username} (${admin.nickname}) - ${admin.id}`);
                
                let equipmentToRestore: any = null;
                let source = '';
                
                // 1. 먼저 equipment 필드에서 장비 정보 확인
                if (admin.equipment && admin.equipment.trim() !== '' && admin.equipment !== 'null') {
                    try {
                        const parsed = JSON.parse(admin.equipment);
                        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                            equipmentToRestore = parsed;
                            source = 'equipment field';
                            console.log(`  [Restore Admin] Found equipment in equipment field: ${Object.keys(parsed).join(', ')}`);
                        } else {
                            console.log(`  [Restore Admin] Equipment field is empty object`);
                        }
                    } catch (e) {
                        console.warn(`  [Restore Admin] Invalid equipment JSON, trying to fix...`);
                        // 복구 시도
                        try {
                            const fixed = admin.equipment.replace(/\\"/g, '"').replace(/\\'/g, "'");
                            const parsed = JSON.parse(fixed);
                            if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                                equipmentToRestore = parsed;
                                source = 'equipment field (fixed)';
                                console.log(`  [Restore Admin] Fixed equipment JSON: ${Object.keys(parsed).join(', ')}`);
                            }
                        } catch (e2) {
                            console.warn(`  [Restore Admin] Could not fix equipment JSON`);
                        }
                    }
                }
                
                // 2. equipment 필드에 없으면 inventory에서 장착된 아이템 찾기
                if (!equipmentToRestore && admin.inventory && admin.inventory.trim() !== '' && admin.inventory !== 'null') {
                    try {
                        const inventory = JSON.parse(admin.inventory);
                        if (Array.isArray(inventory) && inventory.length > 0) {
                            // isEquipped가 true인 아이템 찾기
                            const equippedItems = inventory.filter((item: any) => item.isEquipped === true);
                            
                            if (equippedItems.length > 0) {
                                console.log(`  [Restore Admin] Found ${equippedItems.length} equipped items in inventory`);
                                
                                // slot별로 장비 구성
                                equipmentToRestore = {};
                                for (const item of equippedItems) {
                                    if (item.slot) {
                                        equipmentToRestore[item.slot] = item.id;
                                        console.log(`  [Restore Admin] Found equipped item: ${item.name || item.id} in slot ${item.slot}`);
                                    }
                                }
                                
                                if (Object.keys(equipmentToRestore).length > 0) {
                                    source = 'inventory (isEquipped=true)';
                                    fromInventoryCount++;
                                }
                            } else {
                                console.log(`  [Restore Admin] No equipped items found in inventory`);
                            }
                        }
                    } catch (e) {
                        console.warn(`  [Restore Admin] Could not parse inventory: ${e}`);
                    }
                }
                
                // 3. 장비 정보 복원
                if (equipmentToRestore && Object.keys(equipmentToRestore).length > 0) {
                    // 장비 정보를 정리해서 저장
                    const cleanedEquipment = JSON.stringify(equipmentToRestore);
                    
                    // 현재 데이터베이스의 equipment 필드와 비교
                    let currentEquipment: any = {};
                    try {
                        if (admin.equipment && admin.equipment.trim() !== '' && admin.equipment !== 'null') {
                            currentEquipment = JSON.parse(admin.equipment);
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
                            [cleanedEquipment, admin.id]
                        );
                        
                        console.log(`  [Restore Admin] ✓ Equipment restored from ${source}`);
                        console.log(`  [Restore Admin]   Slots: ${Object.keys(equipmentToRestore).join(', ')}`);
                        console.log(`  [Restore Admin]   Equipment JSON: ${cleanedEquipment}`);
                        restoredCount++;
                        hasEquipmentCount++;
                    } else {
                        console.log(`  [Restore Admin] Equipment already correct, no update needed`);
                        hasEquipmentCount++;
                    }
                } else {
                    console.log(`  [Restore Admin] ✗ No equipment found for this admin user`);
                    emptyEquipmentCount++;
                }
                
            } catch (error: any) {
                console.error(`  [Restore Admin] Error processing admin ${admin.username} (${admin.id}):`, error.message);
                console.error(`  [Restore Admin] Error stack:`, error.stack);
            }
        }
        
        console.log(`\n\n[Restore Admin] ========================================`);
        console.log(`[Restore Admin] Admin equipment restoration complete!`);
        console.log(`[Restore Admin] ========================================`);
        console.log(`[Restore Admin] - Admin users with equipment: ${hasEquipmentCount}`);
        console.log(`[Restore Admin] - Admin users without equipment: ${emptyEquipmentCount}`);
        console.log(`[Restore Admin] - Equipment restored/updated: ${restoredCount}`);
        console.log(`[Restore Admin] - Equipment restored from inventory: ${fromInventoryCount}`);
        console.log(`[Restore Admin] ========================================\n`);
        
    } catch (error) {
        console.error('[Restore Admin] Fatal error during restoration:', error);
        throw error;
    } finally {
        await db.close();
        console.log('[Restore Admin] Database connection closed');
    }
};

// 스크립트 실행
restoreAdminEquipment()
    .then(() => {
        console.log('[Restore Admin] Restoration script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Restore Admin] Restoration script failed:', error);
        process.exit(1);
    });

export { restoreAdminEquipment };

