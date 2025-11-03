export const getUserCredentials = async (db, username) => {
    const credentials = await db.get('SELECT * FROM user_credentials WHERE username = ?', username.toLowerCase());
    return credentials ?? null;
};
export const getUserCredentialsByUserId = async (db, userId) => {
    const credentials = await db.get('SELECT * FROM user_credentials WHERE userId = ?', userId);
    return credentials ?? null;
};
export const createUserCredentials = async (db, username, passwordHash, userId) => {
    await db.run('INSERT INTO user_credentials (username, passwordHash, userId) VALUES (?, ?, ?)', username.toLowerCase(), passwordHash, userId);
};
export const deleteUserCredentials = async (db, username) => {
    await db.run('DELETE FROM user_credentials WHERE username = ?', username.toLowerCase());
};
