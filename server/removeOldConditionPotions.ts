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
    inventory: string | null;
}

const removeOldConditionPotions = async () => {
    console.log('[Remove Old Potions] Starting removal of old condition potion items...');
    
    if (!fs.existsSync(DB_PATH)) {
        console.error(`[Remove Old Potions] Database file not found: ${DB_PATH}`);
        process.exit(1);
    }
    
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
    
    try {
        const users = await db.all<UserRow>('SELECT id, username, nickname, inventory FROM users');
        console.log(`[Remove Old Potions] Found ${users.length} users in database\n`);
        
        let totalRemoved = 0;
        let usersAffected = 0;
        
        for (const user of users) {
            try {
                if (!user.inventory || user.inventory.trim() === '' || user.inventory === 'null') {
                    continue;
                }
                
                let inventory: any[] = [];
                try {
                    inventory = JSON.parse(user.inventory);
                } catch (e) {
                    console.warn(`  [Remove Old Potions] Failed to parse inventory for user ${user.username}: ${e}`);
                    continue;
                }
                
                if (!Array.isArray(inventory) || inventory.length === 0) {
                    continue;
                }
                
                // 옛날 컨디션 물약 아이템 찾기
                // 컨디션회복제 관련 아이템들 (다양한 이름 패턴 확인)
                const oldPotionNames = [
                    '컨디션회복제',
                    '컨디션 회복제',
                    'Condition Potion',
                    'condition_potion',
                    '컨디션물약',
                    '컨디션 물약'
                ];
                
                const itemsToRemove: number[] = [];
                const removedItems: any[] = [];
                
                for (let i = inventory.length - 1; i >= 0; i--) {
                    const item = inventory[i];
                    if (!item) continue;
                    
                    // 이름으로 확인
                    const itemName = item.name || '';
                    const isOldPotion = oldPotionNames.some(name => 
                        itemName.includes(name) || itemName.toLowerCase().includes(name.toLowerCase())
                    );
                    
                    // ID로 확인 (옛날 형식)
                    const itemId = item.id || '';
                    const isOldPotionId = itemId.includes('condition_potion') || 
                                         itemId.includes('condition-potion') ||
                                         itemId.includes('conditionPotion');
                    
                    if (isOldPotion || isOldPotionId) {
                        itemsToRemove.push(i);
                        removedItems.push(item);
                        totalRemoved += (item.quantity || 1);
                    }
                }
                
                if (itemsToRemove.length > 0) {
                    // 역순으로 제거 (인덱스가 변경되지 않도록)
                    for (const index of itemsToRemove) {
                        inventory.splice(index, 1);
                    }
                    
                    const updatedInventory = JSON.stringify(inventory);
                    await db.run(
                        'UPDATE users SET inventory = ? WHERE id = ?',
                        [updatedInventory, user.id]
                    );
                    
                    console.log(`  [Remove Old Potions] ✓ User ${user.username} (${user.nickname}):`);
                    console.log(`    Removed ${itemsToRemove.length} old condition potion item(s)`);
                    removedItems.forEach(item => {
                        console.log(`      - ${item.name || item.id} (quantity: ${item.quantity || 1})`);
                    });
                    
                    usersAffected++;
                }
                
            } catch (error: any) {
                console.error(`  [Remove Old Potions] Error processing user ${user.username}:`, error.message);
            }
        }
        
        console.log(`\n\n[Remove Old Potions] ========================================`);
        console.log(`[Remove Old Potions] Removal complete!`);
        console.log(`[Remove Old Potions] ========================================`);
        console.log(`[Remove Old Potions] - Users affected: ${usersAffected}`);
        console.log(`[Remove Old Potions] - Total items removed: ${totalRemoved}`);
        console.log(`[Remove Old Potions] ========================================\n`);
        
    } catch (error) {
        console.error('[Remove Old Potions] Fatal error:', error);
        throw error;
    } finally {
        await db.close();
    }
};

// 확인 후 삭제하는 함수
const checkAndRemove = async () => {
    console.log('[Remove Old Potions] Checking for old condition potions...\n');
    
    if (!fs.existsSync(DB_PATH)) {
        console.error(`[Remove Old Potions] Database file not found: ${DB_PATH}`);
        process.exit(1);
    }
    
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
    
    try {
        const users = await db.all<UserRow>('SELECT id, username, nickname, inventory FROM users');
        
        let foundCount = 0;
        const foundItems: Array<{ user: string; items: any[] }> = [];
        
        for (const user of users) {
            if (!user.inventory || user.inventory.trim() === '' || user.inventory === 'null') {
                continue;
            }
            
            let inventory: any[] = [];
            try {
                inventory = JSON.parse(user.inventory);
            } catch (e) {
                continue;
            }
            
            if (!Array.isArray(inventory) || inventory.length === 0) {
                continue;
            }
            
            const oldPotionNames = [
                '컨디션회복제',
                '컨디션 회복제',
                'Condition Potion',
                'condition_potion',
                '컨디션물약',
                '컨디션 물약'
            ];
            
            const userOldPotions: any[] = [];
            
            for (const item of inventory) {
                if (!item) continue;
                
                const itemName = item.name || '';
                const isOldPotion = oldPotionNames.some(name => 
                    itemName.includes(name) || itemName.toLowerCase().includes(name.toLowerCase())
                );
                
                const itemId = item.id || '';
                const isOldPotionId = itemId.includes('condition_potion') || 
                                     itemId.includes('condition-potion') ||
                                     itemId.includes('conditionPotion');
                
                if (isOldPotion || isOldPotionId) {
                    userOldPotions.push(item);
                    foundCount++;
                }
            }
            
            if (userOldPotions.length > 0) {
                foundItems.push({
                    user: `${user.username} (${user.nickname})`,
                    items: userOldPotions
                });
            }
        }
        
        if (foundCount === 0) {
            console.log('[Remove Old Potions] No old condition potions found in any user inventory.\n');
            return;
        }
        
        console.log(`[Remove Old Potions] Found ${foundCount} old condition potion item(s) in ${foundItems.length} user(s):\n`);
        
        for (const { user, items } of foundItems) {
            console.log(`  User: ${user}`);
            items.forEach(item => {
                console.log(`    - ${item.name || item.id} (quantity: ${item.quantity || 1}, id: ${item.id})`);
            });
        }
        
        console.log(`\n[Remove Old Potions] Proceeding to remove these items...\n`);
        
    } catch (error) {
        console.error('[Remove Old Potions] Fatal error:', error);
        throw error;
    } finally {
        await db.close();
    }
    
    // 확인 후 삭제 실행
    await removeOldConditionPotions();
};

// 스크립트 실행
checkAndRemove()
    .then(() => {
        console.log('[Remove Old Potions] Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Remove Old Potions] Script failed:', error);
        process.exit(1);
    });

