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

const restoreFromBackup = async (backupFileName: string, targetNickname: string) => {
    const backupPath = path.resolve(projectRoot, backupFileName);
    const currentDbPath = path.resolve(projectRoot, 'database.sqlite');
    
    console.log(`[Restore From Backup] Starting restoration from ${backupFileName}...`);
    console.log(`[Restore From Backup] Target user: ${targetNickname}`);
    
    // 백업 파일 존재 확인
    if (!fs.existsSync(backupPath)) {
        console.error(`[Restore From Backup] Backup file not found: ${backupPath}`);
        process.exit(1);
    }
    
    // 현재 데이터베이스 파일 존재 확인
    if (!fs.existsSync(currentDbPath)) {
        console.error(`[Restore From Backup] Current database file not found: ${currentDbPath}`);
        process.exit(1);
    }
    
    // 백업 데이터베이스 연결
    const backupDb = await open({
        filename: backupPath,
        driver: sqlite3.Database
    });
    
    // 현재 데이터베이스 연결
    const currentDb = await open({
        filename: currentDbPath,
        driver: sqlite3.Database
    });
    
    console.log('[Restore From Backup] Connected to databases');
    
    try {
        // 백업에서 사용자 데이터 가져오기
        const backupUser = await backupDb.get('SELECT id, username, nickname, equipment, inventory FROM users WHERE nickname = ?', targetNickname);
        
        if (!backupUser) {
            console.error(`[Restore From Backup] User not found in backup: ${targetNickname}`);
            await backupDb.close();
            await currentDb.close();
            process.exit(1);
        }
        
        console.log(`\n[Restore From Backup] Found user in backup: ${backupUser.nickname} (${backupUser.id})`);
        
        // 현재 데이터베이스에서 사용자 찾기
        const currentUser = await currentDb.get('SELECT id FROM users WHERE nickname = ?', targetNickname);
        
        if (!currentUser) {
            console.error(`[Restore From Backup] User not found in current database: ${targetNickname}`);
            await backupDb.close();
            await currentDb.close();
            process.exit(1);
        }
        
        // 백업 데이터 확인
        const backupEquipment = backupUser.equipment ? JSON.parse(backupUser.equipment) : {};
        const backupInventory = backupUser.inventory ? JSON.parse(backupUser.inventory) : [];
        
        console.log(`[Restore From Backup] Backup equipment: ${Object.keys(backupEquipment).length} slots`);
        console.log(`[Restore From Backup] Backup inventory: ${backupInventory.length} items`);
        
        // 현재 데이터 확인
        const currentUserData = await currentDb.get('SELECT equipment, inventory FROM users WHERE nickname = ?', targetNickname);
        const currentEquipment = currentUserData?.equipment ? JSON.parse(currentUserData.equipment) : {};
        const currentInventory = currentUserData?.inventory ? JSON.parse(currentUserData.inventory) : [];
        
        console.log(`[Restore From Backup] Current equipment: ${Object.keys(currentEquipment).length} slots`);
        console.log(`[Restore From Backup] Current inventory: ${currentInventory.length} items`);
        
        // 백업 데이터로 복원
        await currentDb.run(
            'UPDATE users SET equipment = ?, inventory = ? WHERE nickname = ?',
            [backupUser.equipment || '{}', backupUser.inventory || '[]', targetNickname]
        );
        
        console.log(`\n[Restore From Backup] ✓ Equipment and inventory restored from backup`);
        console.log(`[Restore From Backup] Equipment slots: ${Object.keys(backupEquipment).length}`);
        console.log(`[Restore From Backup] Inventory items: ${backupInventory.length}`);
        
        // inventory의 isEquipped 플래그 동기화
        if (backupInventory.length > 0 && Object.keys(backupEquipment).length > 0) {
            const syncedInventory = backupInventory.map((item: any) => {
                const isEquipped = Object.values(backupEquipment).includes(item.id);
                return { ...item, isEquipped: isEquipped || false };
            });
            
            await currentDb.run(
                'UPDATE users SET inventory = ? WHERE nickname = ?',
                [JSON.stringify(syncedInventory), targetNickname]
            );
            
            console.log(`[Restore From Backup] ✓ Inventory isEquipped flags synchronized`);
        }
        
        console.log(`\n[Restore From Backup] ========================================`);
        console.log(`[Restore From Backup] Restoration complete!`);
        console.log(`[Restore From Backup] ========================================\n`);
        
    } catch (error) {
        console.error('[Restore From Backup] Fatal error during restoration:', error);
        throw error;
    } finally {
        await backupDb.close();
        await currentDb.close();
        console.log('[Restore From Backup] Database connections closed');
    }
};

// 스크립트 실행
const backupFile = process.argv[2];
const nickname = process.argv[3] || '이수호';

if (!backupFile) {
    console.error('Usage: npx tsx server/restoreFromBackup.ts <backup-file-name> [nickname]');
    console.error('Example: npx tsx server/restoreFromBackup.ts database_backup_2024-01-01.sqlite 이수호');
    process.exit(1);
}

restoreFromBackup(backupFile, nickname)
    .then(() => {
        console.log('[Restore From Backup] Restoration script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Restore From Backup] Restoration script failed:', error);
        process.exit(1);
    });

export { restoreFromBackup };

