import { initializeAndGetDb } from './db/connection.js';

const migrate = async () => {
    console.log('Running database migrations...');
    try {
        await initializeAndGetDb();
        console.log('Migrations complete.');
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
};

migrate();