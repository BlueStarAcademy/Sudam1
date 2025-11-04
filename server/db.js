import { getDb, initializeAndGetDb } from './db/connection.js';
import { getInitialState } from './initialData.js';
// --- Initialization and Seeding ---
let isInitialized = false;
const seedInitialData = async (db) => {
    console.log('[DB] Database is empty. Seeding initial data...');
    const userRepository = await import('./repositories/userRepository.js');
    const credentialsRepository = await import('./repositories/credentialsRepository.js');
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
    if (isInitialized)
        return;
    const db = await initializeAndGetDb();
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    if (userCount && userCount.count === 0) {
        await seedInitialData(db);
    }
    isInitialized = true;
};
// --- Repository Functions ---
// --- Key-Value Store ---
export const getKV = async (key) => {
    const kvRepository = await import('./repositories/kvRepository.js');
    return kvRepository.getKV(await getDb(), key);
};
export const setKV = async (key, value) => {
    const kvRepository = await import('./repositories/kvRepository.js');
    return kvRepository.setKV(await getDb(), key, value);
};
// --- User Functions ---
export const getAllUsers = async () => {
    const userRepository = await import('./repositories/userRepository.js');
    return userRepository.getAllUsers(await getDb());
};
export const getUser = async (id) => {
    const userRepository = await import('./repositories/userRepository.js');
    return userRepository.getUser(await getDb(), id);
};
export const getUserByNickname = async (nickname) => {
    const userRepository = await import('./repositories/userRepository.js');
    return userRepository.getUserByNickname(await getDb(), nickname);
};
export const createUser = async (user) => {
    const userRepository = await import('./repositories/userRepository.js');
    return userRepository.createUser(await getDb(), user);
};
export const updateUser = async (user) => {
    const userRepository = await import('./repositories/userRepository.js');
    return userRepository.updateUser(await getDb(), user);
};
export const deleteUser = async (id) => {
    const db = await getDb();
    const userRepository = await import('./repositories/userRepository.js');
    const credentialsRepository = await import('./repositories/credentialsRepository.js');
    const user = await userRepository.getUser(db, id);
    if (user) {
        await credentialsRepository.deleteUserCredentials(db, user.username);
        await userRepository.deleteUser(db, id);
    }
};
// --- User Credentials Functions ---
export const getUserCredentials = async (username) => {
    const credentialsRepository = await import('./repositories/credentialsRepository.js');
    return credentialsRepository.getUserCredentials(await getDb(), username);
};
export const getUserCredentialsByUserId = async (userId) => {
    const credentialsRepository = await import('./repositories/credentialsRepository.js');
    return credentialsRepository.getUserCredentialsByUserId(await getDb(), userId);
};
export const createUserCredentials = async (username, passwordHash, userId) => {
    const credentialsRepository = await import('./repositories/credentialsRepository.js');
    return credentialsRepository.createUserCredentials(await getDb(), username, passwordHash, userId);
};
// --- Game Functions ---
export const getLiveGame = async (id) => {
    const gameRepository = await import('./repositories/gameRepository.js');
    return gameRepository.getLiveGame(await getDb(), id);
};
export const getAllActiveGames = async () => {
    const gameRepository = await import('./repositories/gameRepository.js');
    return gameRepository.getAllActiveGames(await getDb());
};
export const getAllEndedGames = async () => {
    const gameRepository = await import('./repositories/gameRepository.js');
    return gameRepository.getAllEndedGames(await getDb());
};
export const saveGame = async (game) => {
    const gameRepository = await import('./repositories/gameRepository.js');
    return gameRepository.saveGame(await getDb(), game);
};
export const deleteGame = async (id) => {
    const gameRepository = await import('./repositories/gameRepository.js');
    return gameRepository.deleteGame(await getDb(), id);
};
// --- Full State Retrieval (for client sync) ---
export const getAllData = async () => {
    const db = await getDb();
    const userRepository = await import('./repositories/userRepository.js');
    const gameRepository = await import('./repositories/gameRepository.js');
    const kvRepository = await import('./repositories/kvRepository.js');
    const users = await userRepository.getAllUsers(db);
    const liveGames = await gameRepository.getAllActiveGames(db);
    const adminLogs = await kvRepository.getKV(db, 'adminLogs') || [];
    const announcements = await kvRepository.getKV(db, 'announcements') || [];
    const globalOverrideAnnouncement = await kvRepository.getKV(db, 'globalOverrideAnnouncement');
    const gameModeAvailability = await kvRepository.getKV(db, 'gameModeAvailability') || {};
    const announcementInterval = await kvRepository.getKV(db, 'announcementInterval') || 3;
    return {
        users: users.reduce((acc, user) => { acc[user.id] = user; return acc; }, {}),
        userCredentials: {}, // Never send credentials to client
        liveGames: liveGames.reduce((acc, game) => { acc[game.id] = game; return acc; }, {}),
        adminLogs,
        announcements,
        globalOverrideAnnouncement,
        gameModeAvailability,
        announcementInterval,
    };
};
