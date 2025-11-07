import { Database } from 'sqlite';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname.includes('server') ? path.resolve(__dirname, '..') : process.cwd();
const DB_PATH = path.resolve(projectRoot, 'database.sqlite');
const TEMP_BACKUP_PATH = path.resolve(projectRoot, 'database_temp_backup.sqlite');

const extractAndRestoreUser = async (nickname: string, stashIndex: number = 0) => {
    console.log(`[Extract And Restore] Starting extraction and restoration for user: ${nickname}...`);
    console.log(`[Extract And Restore] Using stash@{${stashIndex}}\n`);
    
    try {
        // Git stash에서 database.sqlite 추출
        console.log('[Extract And Restore] Extracting database.sqlite from Git stash...');
        const stashContent = execSync(`git show "stash@{${stashIndex}}:database.sqlite"`, { encoding: null });
        
        // 임시 파일로 저장
        fs.writeFileSync(TEMP_BACKUP_PATH, stashContent);
        console.log(`[Extract And Restore] ✓ Extracted database.sqlite from stash (${(stashContent.length / 1024).toFixed(2)}KB)`);
        
        // 백업 데이터베이스 연결
        const backupDb = await open({
            filename: TEMP_BACKUP_PATH,
            driver: sqlite3.Database
        });
        
        // 현재 데이터베이스 연결
        const currentDb = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });
        
        console.log('[Extract And Restore] Connected to databases\n');
        
        try {
            // 백업에서 사용자 데이터 가져오기
            const backupUser = await backupDb.get('SELECT id, username, nickname, equipment, inventory FROM users WHERE nickname = ?', nickname);
            
            if (!backupUser) {
                console.error(`[Extract And Restore] User "${nickname}" not found in stash database`);
                
                // 백업 DB에 있는 모든 사용자 목록 출력
                const allUsers = await backupDb.all('SELECT nickname FROM users LIMIT 20');
                console.log(`[Extract And Restore] Available users in stash (first 20):`);
                allUsers.forEach((u: any) => console.log(`  - ${u.nickname}`));
                
                await backupDb.close();
                await currentDb.close();
                fs.unlinkSync(TEMP_BACKUP_PATH);
                process.exit(1);
            }
            
            console.log(`[Extract And Restore] Found user in stash: ${backupUser.nickname} (${backupUser.id})`);
            
            // 백업 데이터 파싱
            let backupEquipment: Record<string, string> = {};
            let backupInventory: any[] = [];
            
            try {
                if (backupUser.equipment && backupUser.equipment.trim() !== '' && backupUser.equipment !== 'null') {
                    backupEquipment = JSON.parse(backupUser.equipment);
                }
            } catch (e) {
                console.warn(`[Extract And Restore] Invalid equipment JSON in stash`);
            }
            
            try {
                if (backupUser.inventory && backupUser.inventory.trim() !== '' && backupUser.inventory !== 'null') {
                    backupInventory = JSON.parse(backupUser.inventory);
                }
            } catch (e) {
                console.warn(`[Extract And Restore] Invalid inventory JSON in stash`);
            }
            
            console.log(`[Extract And Restore] Stash equipment: ${Object.keys(backupEquipment).length} slots`);
            console.log(`[Extract And Restore] Stash inventory: ${backupInventory.length} items`);
            
            if (Object.keys(backupEquipment).length > 0) {
                console.log(`[Extract And Restore] Equipment details:`);
                Object.entries(backupEquipment).forEach(([slot, itemId]) => {
                    console.log(`  - ${slot}: ${itemId}`);
                });
            }
            
            if (backupInventory.length > 0) {
                console.log(`[Extract And Restore] Inventory details (first 10 items):`);
                backupInventory.slice(0, 10).forEach((item: any, idx: number) => {
                    console.log(`  ${idx + 1}. ${item.name || item.id} (${item.id}) ${item.type || ''}`);
                });
            }
            
            // 현재 데이터베이스에서 사용자 찾기
            const currentUser = await currentDb.get('SELECT id, nickname FROM users WHERE nickname = ?', nickname);
            
            if (!currentUser) {
                console.error(`[Extract And Restore] User "${nickname}" not found in current database`);
                await backupDb.close();
                await currentDb.close();
                fs.unlinkSync(TEMP_BACKUP_PATH);
                process.exit(1);
            }
            
            console.log(`\n[Extract And Restore] Found user in current DB: ${currentUser.nickname} (${currentUser.id})`);
            
            // 현재 데이터 확인
            const currentUserData = await currentDb.get('SELECT equipment, inventory FROM users WHERE nickname = ?', nickname);
            let currentEquipment: Record<string, string> = {};
            let currentInventory: any[] = [];
            
            try {
                if (currentUserData?.equipment && currentUserData.equipment.trim() !== '' && currentUserData.equipment !== 'null') {
                    currentEquipment = JSON.parse(currentUserData.equipment);
                }
            } catch (e) {
                console.warn(`[Extract And Restore] Invalid equipment JSON in current DB`);
            }
            
            try {
                if (currentUserData?.inventory && currentUserData.inventory.trim() !== '' && currentUserData.inventory !== 'null') {
                    currentInventory = JSON.parse(currentUserData.inventory);
                }
            } catch (e) {
                console.warn(`[Extract And Restore] Invalid inventory JSON in current DB`);
            }
            
            console.log(`[Extract And Restore] Current equipment: ${Object.keys(currentEquipment).length} slots`);
            console.log(`[Extract And Restore] Current inventory: ${currentInventory.length} items`);
            
            // 백업 데이터로 복원
            const equipmentJson = backupUser.equipment || '{}';
            const inventoryJson = backupUser.inventory || '[]';
            
            await currentDb.run(
                'UPDATE users SET equipment = ?, inventory = ? WHERE nickname = ?',
                [equipmentJson, inventoryJson, nickname]
            );
            
            console.log(`\n[Extract And Restore] ✓ Equipment and inventory restored from stash`);
            
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
                
                console.log(`[Extract And Restore] ✓ Inventory isEquipped flags synchronized`);
            }
            
            console.log(`\n[Extract And Restore] ========================================`);
            console.log(`[Extract And Restore] Restoration complete!`);
            console.log(`[Extract And Restore] Equipment: ${Object.keys(backupEquipment).length} slots`);
            console.log(`[Extract And Restore] Inventory: ${backupInventory.length} items`);
            console.log(`[Extract And Restore] ========================================\n`);
            
        } catch (error: any) {
            console.error('[Extract And Restore] Fatal error during restoration:', error);
            console.error('[Extract And Restore] Error stack:', error.stack);
            throw error;
        } finally {
            await backupDb.close();
            await currentDb.close();
            
            // 임시 파일 삭제
            if (fs.existsSync(TEMP_BACKUP_PATH)) {
                fs.unlinkSync(TEMP_BACKUP_PATH);
                console.log('[Extract And Restore] Temporary backup file removed');
            }
            
            console.log('[Extract And Restore] Database connections closed');
        }
    } catch (error: any) {
        console.error('[Extract And Restore] Error extracting from stash:', error.message);
        if (fs.existsSync(TEMP_BACKUP_PATH)) {
            fs.unlinkSync(TEMP_BACKUP_PATH);
        }
        throw error;
    }
};

// 스크립트 실행
const nickname = process.argv[2] || '이수호';
const stashIndex = parseInt(process.argv[3] || '0', 10);

extractAndRestoreUser(nickname, stashIndex)
    .then(() => {
        console.log('[Extract And Restore] Restoration script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Extract And Restore] Restoration script failed:', error);
        process.exit(1);
    });

export { extractAndRestoreUser };

