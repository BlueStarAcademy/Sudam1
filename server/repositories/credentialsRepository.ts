import { Database } from 'sqlite';
import { UserCredentials } from '../../types.js';

export const getUserCredentials = async (db: Database, username: string): Promise<UserCredentials | null> => {
    const credentials = await db.get<UserCredentials>('SELECT * FROM user_credentials WHERE username = ?', username.toLowerCase());
    return credentials ?? null;
};

export const getUserCredentialsByUserId = async (db: Database, userId: string): Promise<UserCredentials | null> => {
    const credentials = await db.get<UserCredentials>('SELECT * FROM user_credentials WHERE userId = ?', userId);
    return credentials ?? null;
};

export const createUserCredentials = async (db: Database, username: string, passwordHash: string, userId: string): Promise<void> => {
    await db.run('INSERT INTO user_credentials (username, passwordHash, userId) VALUES (?, ?, ?)', username.toLowerCase(), passwordHash, userId);
};

export const deleteUserCredentials = async (db: Database, username: string): Promise<void> => {
    await db.run('DELETE FROM user_credentials WHERE username = ?', username.toLowerCase());
};
