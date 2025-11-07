import { Database } from 'sqlite';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname.includes('server') ? path.resolve(__dirname, '..') : process.cwd();

const restoreUserFromBackupDb = async (backupDbPath: string, nickname: string) => {
    console.log(`[Restore From Backup DB] Starting restoration...`);
    console.log(`[Restore From Backup DB] Backup DB: ${backupDbPath}`);
    console.log(`[Restore From Backup DB] Target user: ${nickname}\n`);
    
    const currentDbPath = path.resolve(projectRoot, 'database.sqlite');
    
    // 백업 파일 존재 확인
    if (!fs.existsSync(backupDbPath)) {
        console.error(`[Restore From Backup DB] Backup file not found: ${backupDbPath}`);
        process.exit(1);
    }
    
    // 현재 데이터베이스 파일 존재 확인
    if (!fs.existsSync(currentDbPath)) {
        console.error(`[Restore From Backup DB] Current database file not found: ${currentDbPath}`);
        process.exit(1);
    }
    
    // 백업 데이터베이스 연결
    const backupDb = await open({
        filename: backupDbPath,
        driver: sqlite3.Database
    });
    
    // 현재 데이터베이스 연결
    const currentDb = await open({
        filename: currentDbPath,
        driver: sqlite3.Database
    });
    
    console.log('[Restore From Backup DB] Connected to databases\n');
    
    try {
        // 백업에서 사용자 데이터 가져오기
        const backupUser = await backupDb.get('SELECT id, username, nickname, equipment, inventory FROM users WHERE nickname = ?', nickname);
        
        if (!backupUser) {
            console.error(`[Restore From Backup DB] User "${nickname}" not found in backup database`);
            
            // 백업 DB에 있는 모든 사용자 목록 출력
            const allUsers = await backupDb.all('SELECT nickname FROM users LIMIT 20');
            console.log(`[Restore From Backup DB] Available users in backup (first 20):`);
            allUsers.forEach((u: any) => console.log(`  - ${u.nickname}`));
            
            await backupDb.close();
            await currentDb.close();
            process.exit(1);
        }
        
        console.log(`[Restore From Backup DB] Found user in backup: ${backupUser.nickname} (${backupUser.id})`);
        
        // 백업 데이터 파싱
        let backupEquipment: Record<string, string> = {};
        let backupInventory: any[] = [];
        
        try {
            if (backupUser.equipment && backupUser.equipment.trim() !== '' && backupUser.equipment !== 'null') {
                backupEquipment = JSON.parse(backupUser.equipment);
            }
        } catch (e) {
            console.warn(`[Restore From Backup DB] Invalid equipment JSON in backup`);
        }
        
        try {
            if (backupUser.inventory && backupUser.inventory.trim() !== '' && backupUser.inventory !== 'null') {
                backupInventory = JSON.parse(backupUser.inventory);
            }
        } catch (e) {
            console.warn(`[Restore From Backup DB] Invalid inventory JSON in backup`);
        }
        
        console.log(`[Restore From Backup DB] Backup equipment: ${Object.keys(backupEquipment).length} slots`);
        console.log(`[Restore From Backup DB] Backup inventory: ${backupInventory.length} items`);
        
        if (Object.keys(backupEquipment).length > 0) {
            console.log(`[Restore From Backup DB] Equipment details:`);
            Object.entries(backupEquipment).forEach(([slot, itemId]) => {
                console.log(`  - ${slot}: ${itemId}`);
            });
        }
        
        if (backupInventory.length > 0) {
            console.log(`[Restore From Backup DB] Inventory details (first 10 items):`);
            backupInventory.slice(0, 10).forEach((item: any, idx: number) => {
                console.log(`  ${idx + 1}. ${item.name || item.id} (${item.id}) ${item.type || ''}`);
            });
        }
        
        // 현재 데이터베이스에서 사용자 찾기
        const currentUser = await currentDb.get('SELECT id, nickname FROM users WHERE nickname = ?', nickname);
        
        if (!currentUser) {
            console.error(`[Restore From Backup DB] User "${nickname}" not found in current database`);
            await backupDb.close();
            await currentDb.close();
            process.exit(1);
        }
        
        console.log(`\n[Restore From Backup DB] Found user in current DB: ${currentUser.nickname} (${currentUser.id})`);
        
        // 현재 데이터 확인
        const currentUserData = await currentDb.get('SELECT equipment, inventory FROM users WHERE nickname = ?', nickname);
        let currentEquipment: Record<string, string> = {};
        let currentInventory: any[] = [];
        
        try {
            if (currentUserData?.equipment && currentUserData.equipment.trim() !== '' && currentUserData.equipment !== 'null') {
                currentEquipment = JSON.parse(currentUserData.equipment);
            }
        } catch (e) {
            console.warn(`[Restore From Backup DB] Invalid equipment JSON in current DB`);
        }
        
        try {
            if (currentUserData?.inventory && currentUserData.inventory.trim() !== '' && currentUserData.inventory !== 'null') {
                currentInventory = JSON.parse(currentUserData.inventory);
            }
        } catch (e) {
            console.warn(`[Restore From Backup DB] Invalid inventory JSON in current DB`);
        }
        
        console.log(`[Restore From Backup DB] Current equipment: ${Object.keys(currentEquipment).length} slots`);
        console.log(`[Restore From Backup DB] Current inventory: ${currentInventory.length} items`);
        
        // 백업 데이터로 복원
        const equipmentJson = backupUser.equipment || '{}';
        const inventoryJson = backupUser.inventory || '[]';
        
        await currentDb.run(
            'UPDATE users SET equipment = ?, inventory = ? WHERE nickname = ?',
            [equipmentJson, inventoryJson, nickname]
        );
        
        console.log(`\n[Restore From Backup DB] ✓ Equipment and inventory restored from backup`);
        
        // inventory의 isEquipped 플래그 동기화
        if (backupInventory.length > 0) {
            const syncedInventory = backupInventory.map((item: any) => {
                const isEquipped = Object.values(backupEquipment).includes(item.id);
                return { ...item, isEquipped: isEquipped || false };
            });
            
            await currentDb.run(
                'UPDATE users SET inventory = ? WHERE nickname = ?',
                [JSON.stringify(syncedInventory), nickname]
            );
            
            console.log(`[Restore From Backup DB] ✓ Inventory isEquipped flags synchronized`);
        }
        
        console.log(`\n[Restore From Backup DB] ========================================`);
        console.log(`[Restore From Backup DB] Restoration complete!`);
        console.log(`[Restore From Backup DB] Equipment: ${Object.keys(backupEquipment).length} slots`);
        console.log(`[Restore From Backup DB] Inventory: ${backupInventory.length} items`);
        console.log(`[Restore From Backup DB] ========================================\n`);
        
    } catch (error: any) {
        console.error('[Restore From Backup DB] Fatal error during restoration:', error);
        console.error('[Restore From Backup DB] Error stack:', error.stack);
        throw error;
    } finally {
        await backupDb.close();
        await currentDb.close();
        console.log('[Restore From Backup DB] Database connections closed');
    }
};

// 스크립트 실행
const backupDbPath = process.argv[2];
const nickname = process.argv[3] || '이수호';

if (!backupDbPath) {
    console.error('Usage: npx tsx server/restoreUserFromBackupDb.ts <backup-db-path> [nickname]');
    console.error('Example: npx tsx server/restoreUserFromBackupDb.ts C:/path/to/database.sqlite 이수호');
    console.error('Example: npx tsx server/restoreUserFromBackupDb.ts ./database_backup.sqlite 이수호');
    process.exit(1);
}

restoreUserFromBackupDb(backupDbPath, nickname)
    .then(() => {
        console.log('[Restore From Backup DB] Restoration script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Restore From Backup DB] Restoration script failed:', error);
        process.exit(1);
    });

export { restoreUserFromBackupDb };

