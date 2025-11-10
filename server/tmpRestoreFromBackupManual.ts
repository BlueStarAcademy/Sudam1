import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';

const backupPath = path.resolve('database_backup_2025-11-05T02-42-31.sqlite');
const currentDbPath = path.resolve('database.sqlite');
const nickname = '\uB178\uB780\uBCC4'; // "노란별"

async function run() {
    console.log('[TmpRestoreManual] Restoring inventory/equipment for', nickname);

    const backupDb = await open({ filename: backupPath, driver: sqlite3.Database });
    const currentDb = await open({ filename: currentDbPath, driver: sqlite3.Database });

    try {
        const backupUser = await backupDb.get('SELECT equipment, inventory FROM users WHERE nickname = ?', nickname);
        if (!backupUser) {
            console.error('[TmpRestoreManual] Backup user not found');
            return;
        }

        const equipmentJson = backupUser.equipment ?? '{}';
        const inventoryJson = backupUser.inventory ?? '[]';

        await currentDb.run(
            'UPDATE users SET equipment = ?, inventory = ? WHERE nickname = ?',
            equipmentJson,
            inventoryJson,
            nickname
        );

        console.log('[TmpRestoreManual] Restoration query executed. Equipment length:',
            Object.keys(JSON.parse(equipmentJson || '{}')).length,
            'Inventory length:',
            JSON.parse(inventoryJson || '[]').length
        );
    } finally {
        await backupDb.close();
        await currentDb.close();
    }
}

run()
    .then(() => {
        console.log('[TmpRestoreManual] Done');
        process.exit(0);
    })
    .catch((err) => {
        console.error('[TmpRestoreManual] Failed', err);
        process.exit(1);
    });


