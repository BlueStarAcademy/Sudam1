import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function run() {
    const dbPath = process.argv[2];
    const identifier = process.argv[3] ?? '\uB178\uB780\uBCC4'; // default "노란별"

    if (!dbPath) {
        console.error('Usage: npx tsx server/tmpCheckUserDataFromFile.ts <db-path> [nickname]');
        process.exit(1);
    }

    const db = await open({ filename: dbPath, driver: sqlite3.Database });
    try {
        const query = identifier.startsWith('user-')
            ? { sql: 'SELECT id, nickname, equipment, inventory FROM users WHERE id = ?', param: identifier }
            : { sql: 'SELECT id, nickname, equipment, inventory FROM users WHERE nickname = ?', param: identifier };

        const user = await db.get(query.sql, query.param);
        if (!user) {
            console.log(`[TmpCheckFromFile] User ${identifier} not found in ${dbPath}`);
            return;
        }
        const equipment = user.equipment ? JSON.parse(user.equipment) : {};
        const inventory = user.inventory ? JSON.parse(user.inventory) : [];
        console.log(`[TmpCheckFromFile] DB: ${dbPath}`);
        console.log(`[TmpCheckFromFile] User: ${user.nickname} (${user.id})`);
        console.log(`[TmpCheckFromFile] Equipment slots: ${Object.keys(equipment || {}).length}`);
        console.log(`[TmpCheckFromFile] Inventory items: ${Array.isArray(inventory) ? inventory.length : 0}`);
    } finally {
        await db.close();
    }
}

run()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('[TmpCheckFromFile] Failed', err);
        process.exit(1);
    });


