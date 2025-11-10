import { restoreUserFromBackupDb } from './restoreUserFromBackupDb.ts';

const backupPath = 'database_backup_2025-11-05T02-42-31.sqlite';
const nickname = '\uB178\uB780\uBCC4'; // "노란별"

restoreUserFromBackupDb(backupPath, nickname)
    .then(() => {
        console.log('[TmpRestore] Restoration completed for', nickname);
        process.exit(0);
    })
    .catch((error) => {
        console.error('[TmpRestore] Restoration failed for', nickname, error);
        process.exit(1);
    });


