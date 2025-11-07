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

const checkUserData = async (nickname: string) => {
    console.log(`[Check User] Checking data for user: ${nickname}...`);
    
    if (!fs.existsSync(DB_PATH)) {
        console.error(`[Check User] Database file not found: ${DB_PATH}`);
        process.exit(1);
    }
    
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
    
    console.log('[Check User] Connected to database');
    
    try {
        const user = await db.get('SELECT id, nickname, username, equipment, inventory FROM users WHERE nickname = ?', nickname);
        
        if (!user) {
            console.error(`[Check User] User not found: ${nickname}`);
            await db.close();
            process.exit(1);
        }
        
        console.log(`\n[Check User] User: ${user.nickname} (${user.id})`);
        console.log(`[Check User] Username: ${user.username}`);
        
        // Equipment 확인
        let equipment: Record<string, string> = {};
        if (user.equipment && user.equipment.trim() !== '' && user.equipment !== 'null') {
            try {
                equipment = JSON.parse(user.equipment);
                console.log(`[Check User] Equipment: ${Object.keys(equipment).length} slots`);
                Object.entries(equipment).forEach(([slot, itemId]) => {
                    console.log(`  - ${slot}: ${itemId}`);
                });
            } catch (e) {
                console.warn(`[Check User] Invalid equipment JSON: ${user.equipment}`);
            }
        } else {
            console.log(`[Check User] Equipment: empty or null`);
        }
        
        // Inventory 확인
        let inventory: any[] = [];
        if (user.inventory && user.inventory.trim() !== '' && user.inventory !== 'null') {
            try {
                inventory = JSON.parse(user.inventory);
                console.log(`[Check User] Inventory: ${inventory.length} items`);
                
                // Equipment에 있는 아이템이 inventory에 있는지 확인
                const inventoryItemIds = inventory.map(item => item?.id).filter(Boolean);
                const equipmentItemIds = Object.values(equipment);
                
                console.log(`\n[Check User] Equipment items in inventory check:`);
                equipmentItemIds.forEach(itemId => {
                    const found = inventoryItemIds.includes(itemId);
                    const item = inventory.find(i => i.id === itemId);
                    console.log(`  - ${itemId}: ${found ? '✓ FOUND' : '✗ NOT FOUND'} ${item ? `(${item.name})` : ''}`);
                });
                
                // Inventory 아이템 목록
                console.log(`\n[Check User] Inventory items:`);
                inventory.forEach((item, idx) => {
                    const isEquipped = equipmentItemIds.includes(item.id);
                    console.log(`  ${idx + 1}. ${item.name} (${item.id}) ${item.type} ${isEquipped ? '[EQUIPPED]' : ''}`);
                });
            } catch (e) {
                console.warn(`[Check User] Invalid inventory JSON: ${user.inventory}`);
            }
        } else {
            console.log(`[Check User] Inventory: empty or null`);
        }
        
        console.log(`\n[Check User] ========================================\n`);
        
    } catch (error) {
        console.error('[Check User] Fatal error:', error);
        throw error;
    } finally {
        await db.close();
        console.log('[Check User] Database connection closed');
    }
};

// 스크립트 실행
const nickname = process.argv[2] || '이수호';
checkUserData(nickname)
    .then(() => {
        console.log('[Check User] Check completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Check User] Check failed:', error);
        process.exit(1);
    });

export { checkUserData };

