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

const restoreEquipmentFromDatabase = async () => {
    console.log('[Restore] Starting equipment restoration from database.sqlite...');
    
    // 데이터베이스 파일 존재 확인
    if (!fs.existsSync(DB_PATH)) {
        console.error(`[Restore] Database file not found: ${DB_PATH}`);
        process.exit(1);
    }
    
    // 데이터베이스 연결
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
    
    console.log('[Restore] Connected to database');
    
    try {
        // 모든 사용자의 장비 정보 확인
        const usersResult = await db.all<UserRow>('SELECT id, username, nickname, equipment, inventory FROM users');
        const users: UserRow[] = Array.isArray(usersResult) ? usersResult : [];
        console.log(`[Restore] Found ${users.length} users in database`);
        
        let restoredCount = 0;
        let emptyEquipmentCount = 0;
        let hasEquipmentCount = 0;
        let fixedCount = 0;
        
        for (const user of users) {
            try {
                // 장비 정보 확인
                let equipmentData = user.equipment;
                
                // 장비가 null이거나 빈 문자열인 경우
                if (!equipmentData || equipmentData.trim() === '' || equipmentData === 'null') {
                    console.log(`[Restore] User ${user.username} (${user.id}): No equipment data found`);
                    emptyEquipmentCount++;
                    continue;
                }
                
                // JSON 파싱 시도
                let parsedEquipment: any = null;
                let needsFix = false;
                
                try {
                    parsedEquipment = JSON.parse(equipmentData);
                } catch (e) {
                    console.warn(`[Restore] User ${user.username} (${user.id}): Invalid equipment JSON, attempting to fix...`);
                    console.warn(`[Restore] Raw equipment data: ${equipmentData.substring(0, 100)}...`);
                    needsFix = true;
                    
                    // 다양한 시도로 복구
                    // 1. 이스케이프된 따옴표 수정 시도
                    try {
                        const fixed = equipmentData.replace(/\\"/g, '"').replace(/\\'/g, "'");
                        parsedEquipment = JSON.parse(fixed);
                        needsFix = false;
                        console.log(`[Restore] User ${user.username}: Fixed by replacing escaped quotes`);
                    } catch (e2) {
                        // 2. 빈 객체로 설정
                        parsedEquipment = {};
                        needsFix = true;
                    }
                }
                
                // 장비가 빈 객체인지 확인
                if (parsedEquipment && typeof parsedEquipment === 'object') {
                    const equipmentKeys = Object.keys(parsedEquipment);
                    
                    if (equipmentKeys.length > 0) {
                        console.log(`[Restore] User ${user.username} (${user.id}): Has equipment (${equipmentKeys.length} slots)`);
                        console.log(`[Restore] Equipment slots: ${equipmentKeys.join(', ')}`);
                        hasEquipmentCount++;
                        
                        // 장비 정보를 정리해서 다시 저장 (확실하게 저장)
                        const cleanedEquipment = JSON.stringify(parsedEquipment);
                        await db.run(
                            'UPDATE users SET equipment = ? WHERE id = ?',
                            [cleanedEquipment, user.id]
                        );
                        
                        if (needsFix) {
                            fixedCount++;
                            console.log(`[Restore] User ${user.username} (${user.id}): Equipment fixed and restored`);
                        } else {
                            restoredCount++;
                            console.log(`[Restore] User ${user.username} (${user.id}): Equipment verified`);
                        }
                    } else {
                        console.log(`[Restore] User ${user.username} (${user.id}): Equipment is empty object`);
                        emptyEquipmentCount++;
                    }
                } else {
                    console.log(`[Restore] User ${user.username} (${user.id}): Equipment is not an object`);
                    emptyEquipmentCount++;
                }
                
            } catch (error: any) {
                console.error(`[Restore] Error processing user ${user.username} (${user.id}):`, error.message);
                console.error(`[Restore] Error stack:`, error.stack);
            }
        }
        
        console.log(`\n[Restore] ========================================`);
        console.log(`[Restore] Restoration complete!`);
        console.log(`[Restore] ========================================`);
        console.log(`[Restore] - Users with equipment: ${hasEquipmentCount}`);
        console.log(`[Restore] - Users without equipment: ${emptyEquipmentCount}`);
        console.log(`[Restore] - Equipment verified: ${restoredCount}`);
        console.log(`[Restore] - Equipment fixed: ${fixedCount}`);
        console.log(`[Restore] ========================================`);
        
        // 장비 정보가 없는 사용자 목록 출력
        if (emptyEquipmentCount > 0) {
            console.log(`\n[Restore] Warning: ${emptyEquipmentCount} users have no equipment data`);
        }
        
    } catch (error) {
        console.error('[Restore] Fatal error during restoration:', error);
        throw error;
    } finally {
        await db.close();
        console.log('[Restore] Database connection closed');
    }
};

// 스크립트 실행
restoreEquipmentFromDatabase()
    .then(() => {
        console.log('[Restore] Restoration script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Restore] Restoration script failed:', error);
        process.exit(1);
    });

export { restoreEquipmentFromDatabase };

