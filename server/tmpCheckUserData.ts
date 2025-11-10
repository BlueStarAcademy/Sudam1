import { checkUserData } from './checkUserData.ts';

const nickname = '\uB178\uB780\uBCC4'; // "노란별"

checkUserData(nickname)
    .then(() => {
        console.log('[TmpCheck] Completed successfully for', nickname);
        process.exit(0);
    })
    .catch((error) => {
        console.error('[TmpCheck] Failed for', nickname, error);
        process.exit(1);
    });


