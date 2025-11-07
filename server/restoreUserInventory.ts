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

const restoreUserInventory = async (nickname: string) => {
    console.log(`[Restore User] Starting inventory restoration for user: ${nickname}...`);
    
    // 데이터베이스 파일 존재 확인
    if (!fs.existsSync(DB_PATH)) {
        console.error(`[Restore User] Database file not found: ${DB_PATH}`);
        process.exit(1);
    }
    
    // 데이터베이스 연결
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
    
    console.log('[Restore User] Connected to database');
    
    try {
        // 특정 사용자 찾기
        const user = await db.get<UserRow>('SELECT id, username, nickname, equipment, inventory FROM users WHERE nickname = ?', nickname);
        
        if (!user) {
            console.error(`[Restore User] User not found: ${nickname}`);
            await db.close();
            process.exit(1);
        }
        
        console.log(`\n[Restore User] Found user: ${user.nickname} (${user.id})`);
        console.log(`[Restore User] Current equipment: ${user.equipment || 'null'}`);
        console.log(`[Restore User] Current inventory: ${user.inventory ? JSON.parse(user.inventory).length : 0} items`);
        
        // equipment 파싱
        let equipment: Record<string, string> = {};
        if (user.equipment && user.equipment.trim() !== '' && user.equipment !== 'null') {
            try {
                equipment = JSON.parse(user.equipment);
            } catch (e) {
                console.warn(`[Restore User] Invalid equipment JSON`);
            }
        }
        
        // inventory 파싱
        let inventory: any[] = [];
        if (user.inventory && user.inventory.trim() !== '' && user.inventory !== 'null') {
            try {
                inventory = JSON.parse(user.inventory);
                if (!Array.isArray(inventory)) {
                    inventory = [];
                }
            } catch (e) {
                console.warn(`[Restore User] Invalid inventory JSON`);
            }
        }
        
        console.log(`[Restore User] Equipment slots: ${Object.keys(equipment).length}`);
        console.log(`[Restore User] Inventory items: ${inventory.length}`);
        
        // equipment에 있지만 inventory에 없는 아이템이 있는지 확인
        const equipmentItemIds = Object.values(equipment);
        const inventoryItemIds = inventory.map((item: any) => item?.id).filter(Boolean);
        const missingItems = equipmentItemIds.filter(id => !inventoryItemIds.includes(id));
        
        if (missingItems.length > 0) {
            console.log(`[Restore User] ⚠️ Found ${missingItems.length} equipment items not in inventory:`);
            missingItems.forEach(itemId => {
                const slot = Object.entries(equipment).find(([_, id]) => id === itemId)?.[0];
                console.log(`  - Item ${itemId} in slot ${slot}`);
            });
            
            // equipment에서 제거하지 않고 유지 (데이터 보존)
            console.log(`[Restore User] Keeping equipment items even if not in inventory (data preservation)`);
        }
        
        // inventory의 isEquipped 플래그 동기화
        let needsUpdate = false;
        
        // 모든 장비 아이템의 isEquipped를 false로 설정
        inventory.forEach(item => {
            if (item.type === 'equipment' && item.isEquipped === true) {
                item.isEquipped = false;
                needsUpdate = true;
            }
        });
        
        // equipment에 있는 아이템 ID들을 inventory에서 찾아서 isEquipped = true로 설정
        let foundItems = 0;
        for (const [slot, itemId] of Object.entries(equipment)) {
            const item = inventory.find((i: any) => i.id === itemId);
            if (item && item.type === 'equipment' && item.slot === slot) {
                item.isEquipped = true;
                foundItems++;
                needsUpdate = true;
                console.log(`[Restore User] ✓ Found item ${item.name} (${itemId}) in slot ${slot}`);
            }
        }
        
        // 업데이트
        if (needsUpdate) {
            const updatedInventoryJson = JSON.stringify(inventory);
            await db.run(
                'UPDATE users SET inventory = ? WHERE id = ?',
                [updatedInventoryJson, user.id]
            );
            console.log(`[Restore User] ✓ Updated inventory with isEquipped flags (${foundItems} items equipped)`);
        } else {
            console.log(`[Restore User] No update needed`);
        }
        
        console.log(`\n[Restore User] ========================================`);
        console.log(`[Restore User] Restoration complete!`);
        console.log(`[Restore User] ========================================\n`);
        
    } catch (error) {
        console.error('[Restore User] Fatal error during restoration:', error);
        throw error;
    } finally {
        await db.close();
        console.log('[Restore User] Database connection closed');
    }
};

// 스크립트 실행
const nickname = process.argv[2] || '이수호';
restoreUserInventory(nickname)
    .then(() => {
        console.log('[Restore User] Restoration script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Restore User] Restoration script failed:', error);
        process.exit(1);
    });

export { restoreUserInventory };

