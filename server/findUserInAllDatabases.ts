import { Database } from 'sqlite';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname.includes('server') ? path.resolve(__dirname, '..') : process.cwd();

const findUserInAllDatabases = async (nickname: string) => {
    console.log(`[Find User] Searching for user "${nickname}" in all SQLite files...\n`);
    
    // 프로젝트 루트의 모든 .sqlite 파일 찾기
    const sqliteFiles = await glob('**/*.sqlite', { 
        cwd: projectRoot,
        absolute: true,
        ignore: ['**/node_modules/**']
    });
    
    if (sqliteFiles.length === 0) {
        console.error('[Find User] No SQLite files found in project');
        process.exit(1);
    }
    
    console.log(`[Find User] Found ${sqliteFiles.length} SQLite files:\n`);
    sqliteFiles.forEach((file, idx) => {
        const stats = fs.statSync(file);
        console.log(`  ${idx + 1}. ${path.relative(projectRoot, file)} (${(stats.size / 1024).toFixed(2)}KB, ${stats.mtime.toISOString()})`);
    });
    
    console.log(`\n[Find User] Searching for user "${nickname}"...\n`);
    
    const results: Array<{ file: string; user: any; equipment: any; inventory: any }> = [];
    
    for (const dbPath of sqliteFiles) {
        try {
            const db = await open({
                filename: dbPath,
                driver: sqlite3.Database,
                mode: sqlite3.OPEN_READONLY
            });
            
            try {
                const user = await db.get('SELECT id, nickname, username, equipment, inventory FROM users WHERE nickname = ?', nickname);
                
                if (user) {
                    let equipment: any = {};
                    let inventory: any[] = [];
                    
                    try {
                        if (user.equipment && user.equipment.trim() !== '' && user.equipment !== 'null') {
                            equipment = JSON.parse(user.equipment);
                        }
                    } catch (e) {
                        console.warn(`  [${path.basename(dbPath)}] Invalid equipment JSON`);
                    }
                    
                    try {
                        if (user.inventory && user.inventory.trim() !== '' && user.inventory !== 'null') {
                            inventory = JSON.parse(user.inventory);
                        }
                    } catch (e) {
                        console.warn(`  [${path.basename(dbPath)}] Invalid inventory JSON`);
                    }
                    
                    results.push({ file: dbPath, user, equipment, inventory });
                    console.log(`  ✓ Found in: ${path.relative(projectRoot, dbPath)}`);
                    console.log(`    - Equipment: ${Object.keys(equipment).length} slots`);
                    console.log(`    - Inventory: ${inventory.length} items`);
                }
            } catch (error: any) {
                console.warn(`  ⚠ Error reading ${path.basename(dbPath)}: ${error.message}`);
            } finally {
                await db.close();
            }
        } catch (error: any) {
            console.warn(`  ⚠ Could not open ${path.basename(dbPath)}: ${error.message}`);
        }
    }
    
    console.log(`\n[Find User] ========================================`);
    console.log(`[Find User] Search complete. Found ${results.length} database(s) with user "${nickname}"`);
    
    if (results.length > 0) {
        console.log(`\n[Find User] Results:`);
        results.forEach((result, idx) => {
            console.log(`\n  ${idx + 1}. ${path.relative(projectRoot, result.file)}`);
            console.log(`     Equipment slots: ${Object.keys(result.equipment).length}`);
            console.log(`     Inventory items: ${result.inventory.length}`);
            if (Object.keys(result.equipment).length > 0) {
                console.log(`     Equipment:`);
                Object.entries(result.equipment).forEach(([slot, itemId]) => {
                    console.log(`       ${slot}: ${itemId}`);
                });
            }
            if (result.inventory.length > 0) {
                console.log(`     Inventory (first 5 items):`);
                result.inventory.slice(0, 5).forEach((item: any, i: number) => {
                    console.log(`       ${i + 1}. ${item.name || item.id} (${item.id})`);
                });
            }
        });
    }
    
    return results;
};

const nickname = process.argv[2] || '이수호';
findUserInAllDatabases(nickname)
    .then((results) => {
        if (results.length === 0) {
            console.log(`\n[Find User] User "${nickname}" not found in any database.`);
            process.exit(1);
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Find User] Error:', error);
        process.exit(1);
    });

export { findUserInAllDatabases };

