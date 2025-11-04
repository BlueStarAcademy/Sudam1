import { Database } from 'sqlite';

export const getKV = async <T>(db: Database, key: string): Promise<T | null> => {
    const row = await db.get('SELECT value FROM kv WHERE key = ?', key);
    return row && row.value ? JSON.parse(row.value) : null;
};
export const setKV = async <T>(db: Database, key: string, value: T): Promise<void> => {
    await db.run('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, JSON.stringify(value));
};