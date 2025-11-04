import { Database } from 'sqlite';
import { getDb, initializeAndGetDb } from './db/connection.ts';
import { User, LiveGameSession, AppState, UserCredentials, AdminLog, Announcement, OverrideAnnouncement, GameMode } from '../types.ts';
import { getInitialState } from './initialData.ts';

// --- Initialization and Seeding ---
let isInitialized = false;

const seedInitialData = async (db: Database) => {
    const userRepository = await import('./repositories/userRepository.ts');
    const credentialsRepository = await import('./repositories/credentialsRepository.ts');
    const initialState = getInitialState();
    const usersToCreate = Object.values(initialState.users);
    const credentialsToCreate = initialState.userCredentials;

    for (const user of usersToCreate) {
        await userRepository.createUser(db, user);
    }
    
    for (const username of Object.keys(credentialsToCreate)) {
        const cred = credentialsToCreate[username];
        const originalUser = usersToCreate.find(u => u.username === username);
        if (originalUser) {
            await credentialsRepository.createUserCredentials(db, originalUser.username, cred.passwordHash, cred.userId);
        }
    }
    console.log('[DB] Initial data seeding complete.');
};

export const initializeDatabase = async () => {
    if (isInitialized) return;
    const db = await initializeAndGetDb();
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    if (userCount && userCount.count === 0) {
        await seedInitialData(db);
    }
    isInitialized = true;
};


// --- Repository Functions ---

// --- Key-Value Store ---
export const getKV = async <T>(key: string): Promise<T | null> => {
    const kvRepository = await import('./repositories/kvRepository.ts');
    return kvRepository.getKV(await getDb(), key);
};
export const setKV = async <T>(key: string, value: T): Promise<void> => {
    const kvRepository = await import('./repositories/kvRepository.ts');
    return kvRepository.setKV(await getDb(), key, value);
};

// --- User Functions ---
export const getAllUsers = async (): Promise<User[]> => {
    const userRepository = await import('./repositories/userRepository.ts');
    return userRepository.getAllUsers(await getDb());
};
export const getUser = async (id: string): Promise<User | null> => {
    const userRepository = await import('./repositories/userRepository.ts');
    return userRepository.getUser(await getDb(), id);
};
export const getUserByNickname = async (nickname: string): Promise<User | null> => {
    const userRepository = await import('./repositories/userRepository.ts');
    return userRepository.getUserByNickname(await getDb(), nickname);
};
export const createUser = async (user: User): Promise<void> => {
    const userRepository = await import('./repositories/userRepository.ts');
    return userRepository.createUser(await getDb(), user);
};
export const updateUser = async (user: User): Promise<void> => {
    const userRepository = await import('./repositories/userRepository.ts');
    return userRepository.updateUser(await getDb(), user);
};
export const deleteUser = async (id: string): Promise<void> => {
    const db = await getDb();
    const userRepository = await import('./repositories/userRepository.ts');
    const credentialsRepository = await import('./repositories/credentialsRepository.ts');
    const user = await userRepository.getUser(db, id);
    if (user) {
        await credentialsRepository.deleteUserCredentials(db, user.username);
        await userRepository.deleteUser(db, id);
    }
};

// --- User Credentials Functions ---
export const getUserCredentials = async (username: string): Promise<UserCredentials | null> => {
    const credentialsRepository = await import('./repositories/credentialsRepository.ts');
    return credentialsRepository.getUserCredentials(await getDb(), username);
};
export const getUserCredentialsByUserId = async (userId: string): Promise<UserCredentials | null> => {
    const credentialsRepository = await import('./repositories/credentialsRepository.ts');
    return credentialsRepository.getUserCredentialsByUserId(await getDb(), userId);
};
export const createUserCredentials = async (username: string, passwordHash: string, userId: string): Promise<void> => {
    const credentialsRepository = await import('./repositories/credentialsRepository.ts');
    return credentialsRepository.createUserCredentials(await getDb(), username, passwordHash, userId);
};

// --- Game Functions ---
export const getLiveGame = async (id: string): Promise<LiveGameSession | null> => {
    const gameRepository = await import('./repositories/gameRepository.ts');
    return gameRepository.getLiveGame(await getDb(), id);
};
export const getAllActiveGames = async (): Promise<LiveGameSession[]> => {
    const gameRepository = await import('./repositories/gameRepository.ts');
    return gameRepository.getAllActiveGames(await getDb());
};
export const getAllEndedGames = async (): Promise<LiveGameSession[]> => {
    const gameRepository = await import('./repositories/gameRepository.ts');
    return gameRepository.getAllEndedGames(await getDb());
};
export const saveGame = async (game: LiveGameSession): Promise<void> => {
    const gameRepository = await import('./repositories/gameRepository.ts');
    return gameRepository.saveGame(await getDb(), game);
};
export const deleteGame = async (id: string): Promise<void> => {
    const gameRepository = await import('./repositories/gameRepository.ts');
    return gameRepository.deleteGame(await getDb(), id);
};


// --- Full State Retrieval (for client sync) ---
export const getAllData = async (): Promise<Pick<AppState, 'users' | 'userCredentials' | 'liveGames' | 'adminLogs' | 'announcements' | 'globalOverrideAnnouncement' | 'gameModeAvailability' | 'announcementInterval'>> => {
    const db = await getDb();
    const userRepository = await import('./repositories/userRepository.ts');
    const gameRepository = await import('./repositories/gameRepository.ts');
    const kvRepository = await import('./repositories/kvRepository.ts');
    
    const users = await userRepository.getAllUsers(db);
    const liveGames = await gameRepository.getAllActiveGames(db);
    
    const adminLogs = await kvRepository.getKV<AdminLog[]>(db, 'adminLogs') || [];
    const announcements = await kvRepository.getKV<Announcement[]>(db, 'announcements') || [];
    const globalOverrideAnnouncement = await kvRepository.getKV<OverrideAnnouncement | null>(db, 'globalOverrideAnnouncement');
    const gameModeAvailability = await kvRepository.getKV<Record<GameMode, boolean>>(db, 'gameModeAvailability') || {};
    const announcementInterval = await kvRepository.getKV<number>(db, 'announcementInterval') || 3;
    
    return {
        users: users.reduce((acc: Record<string, User>, user: User) => { acc[user.id] = user; return acc; }, {}),
        userCredentials: {}, // Never send credentials to client
        liveGames: liveGames.reduce((acc: Record<string, LiveGameSession>, game: LiveGameSession) => { acc[game.id] = game; return acc; }, {}),
        adminLogs,
        announcements,
        globalOverrideAnnouncement,
        gameModeAvailability,
        announcementInterval,
    };
};