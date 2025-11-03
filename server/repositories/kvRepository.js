export const getKV = async (db, key) => {
    const row = await db.get('SELECT value FROM kv WHERE key = ?', key);
    return row && row.value ? JSON.parse(row.value) : null;
};
export const setKV = async (db, key, value) => {
    await db.run('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, JSON.stringify(value));
};
