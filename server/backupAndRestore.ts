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

// 백업 생성
const createBackup = async (): Promise<string> => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupPath = path.resolve(`database_backup_${timestamp}.sqlite`);
    
    if (!fs.existsSync(DB_PATH)) {
        throw new Error('Database file not found');
    }
    
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`[Backup] Created backup: ${backupPath}`);
    return backupPath;
};

// 데이터베이스에서 모든 사용자의 장비와 인벤토리 복구
const restoreAllData = async () => {
    console.log('[Restore All] Starting comprehensive restoration...');
    
    if (!fs.existsSync(DB_PATH)) {
        console.error(`[Restore All] Database file not found: ${DB_PATH}`);
        process.exit(1);
    }
    
    // 먼저 백업 생성
    await createBackup();
    
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
    
    try {
        const users = await db.all<UserRow>('SELECT id, username, nickname, isAdmin, equipment, inventory FROM users');
        console.log(`[Restore All] Found ${users.length} users in database\n`);
        
        let equipmentRestored = 0;
        let inventoryRestored = 0;
        let equipmentFixed = 0;
        let inventoryFixed = 0;
        
        for (const user of users) {
            let needsUpdate = false;
            let updatedEquipment = user.equipment;
            let updatedInventory = user.inventory;
            
            // Equipment 복구
            if (!user.equipment || user.equipment.trim() === '' || user.equipment === 'null') {
                // inventory에서 장착된 아이템 찾기
                if (user.inventory && user.inventory.trim() !== '' && user.inventory !== 'null') {
                    try {
                        const inv = JSON.parse(user.inventory);
                        if (Array.isArray(inv) && inv.length > 0) {
                            const equippedItems = inv.filter((item: any) => item.isEquipped === true);
                            if (equippedItems.length > 0) {
                                const equipment: Record<string, string> = {};
                                for (const item of equippedItems) {
                                    if (item.slot && item.id) {
                                        equipment[item.slot] = item.id;
                                    }
                                }
                                if (Object.keys(equipment).length > 0) {
                                    updatedEquipment = JSON.stringify(equipment);
                                    needsUpdate = true;
                                    equipmentRestored++;
                                    console.log(`[Restore All] ✓ Restored equipment for ${user.username} from inventory (${Object.keys(equipment).length} slots)`);
                                }
                            }
                        }
                    } catch (e) {
                        console.warn(`[Restore All] Could not parse inventory for ${user.username}: ${e}`);
                    }
                }
            } else {
                // Equipment JSON 검증 및 수정
                try {
                    const eq = JSON.parse(user.equipment);
                    if (typeof eq !== 'object' || eq === null) {
                        updatedEquipment = '{}';
                        needsUpdate = true;
                        equipmentFixed++;
                    }
                } catch (e) {
                    // JSON 파싱 실패 시 수정 시도
                    try {
                        const fixed = user.equipment.replace(/\\"/g, '"').replace(/\\'/g, "'");
                        JSON.parse(fixed);
                        updatedEquipment = fixed;
                        needsUpdate = true;
                        equipmentFixed++;
                        console.log(`[Restore All] ✓ Fixed equipment JSON for ${user.username}`);
                    } catch (e2) {
                        updatedEquipment = '{}';
                        needsUpdate = true;
                        equipmentFixed++;
                        console.log(`[Restore All] ⚠️  Reset invalid equipment JSON for ${user.username}`);
                    }
                }
            }
            
            // Inventory 복구
            if (!user.inventory || user.inventory.trim() === '' || user.inventory === 'null') {
                updatedInventory = '[]';
                needsUpdate = true;
                console.log(`[Restore All] ⚠️  Reset empty inventory for ${user.username}`);
            } else {
                // Inventory JSON 검증 및 수정
                try {
                    const inv = JSON.parse(user.inventory);
                    if (!Array.isArray(inv)) {
                        updatedInventory = '[]';
                        needsUpdate = true;
                        inventoryFixed++;
                    } else {
                        // inventory의 isEquipped 플래그를 equipment와 동기화
                        if (updatedEquipment && updatedEquipment !== '{}' && updatedEquipment !== 'null') {
                            try {
                                const eq = JSON.parse(updatedEquipment);
                                const syncedInventory = inv.map((item: any) => {
                                    const isEquipped = Object.values(eq).includes(item.id);
                                    return { ...item, isEquipped: isEquipped || false };
                                });
                                const syncedJson = JSON.stringify(syncedInventory);
                                if (syncedJson !== user.inventory) {
                                    updatedInventory = syncedJson;
                                    needsUpdate = true;
                                    inventoryRestored++;
                                }
                            } catch (e) {
                                // Equipment 파싱 실패 시 원본 유지
                            }
                        }
                    }
                } catch (e) {
                    // JSON 파싱 실패 시 수정 시도
                    try {
                        const fixed = user.inventory.replace(/\\"/g, '"').replace(/\\'/g, "'");
                        JSON.parse(fixed);
                        updatedInventory = fixed;
                        needsUpdate = true;
                        inventoryFixed++;
                        console.log(`[Restore All] ✓ Fixed inventory JSON for ${user.username}`);
                    } catch (e2) {
                        updatedInventory = '[]';
                        needsUpdate = true;
                        inventoryFixed++;
                        console.log(`[Restore All] ⚠️  Reset invalid inventory JSON for ${user.username}`);
                    }
                }
            }
            
            // 업데이트 필요 시 실행
            if (needsUpdate) {
                await db.run(
                    'UPDATE users SET equipment = ?, inventory = ? WHERE id = ?',
                    [updatedEquipment, updatedInventory, user.id]
                );
            }
        }
        
        console.log(`\n[Restore All] ========================================`);
        console.log(`[Restore All] Restoration complete!`);
        console.log(`[Restore All] ========================================`);
        console.log(`[Restore All] Equipment restored from inventory: ${equipmentRestored}`);
        console.log(`[Restore All] Equipment JSON fixed: ${equipmentFixed}`);
        console.log(`[Restore All] Inventory synced: ${inventoryRestored}`);
        console.log(`[Restore All] Inventory JSON fixed: ${inventoryFixed}`);
        console.log(`[Restore All] ========================================\n`);
        
    } catch (error) {
        console.error('[Restore All] Fatal error:', error);
        throw error;
    } finally {
        await db.close();
    }
};

// 스크립트 실행
if (process.argv[2] === 'backup') {
    createBackup()
        .then(() => {
            console.log('[Backup] Backup completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('[Backup] Backup failed:', error);
            process.exit(1);
        });
} else {
    restoreAllData()
        .then(() => {
            console.log('[Restore All] Restoration script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('[Restore All] Restoration script failed:', error);
            process.exit(1);
        });
}

export { createBackup, restoreAllData };

