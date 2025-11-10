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
        // 이미 존재하는 사용자인지 확인
        const existingUser = await userRepository.getUser(db, user.id);
        if (existingUser) {
            console.log(`[DB] User ${user.username} (${user.id}) already exists, skipping creation.`);
            continue;
        }
        
        // username으로도 확인 (다른 ID로 같은 username이 있을 수 있음)
        const existingUserByUsername = await userRepository.getUserByNickname(db, user.username);
        if (existingUserByUsername) {
            console.log(`[DB] User with username ${user.username} already exists, skipping creation.`);
            continue;
        }
        
        try {
            await userRepository.createUser(db, user);
            console.log(`[DB] Created initial user: ${user.username}`);
        } catch (error: any) {
            // UNIQUE 제약조건 위반 등은 무시 (이미 존재하는 경우)
            if (error.message && error.message.includes('UNIQUE constraint')) {
                console.log(`[DB] User ${user.username} already exists (detected by constraint), skipping creation.`);
            } else {
                console.error(`[DB] Error creating user ${user.username}:`, error);
                throw error;
            }
        }
    }
    
    for (const username of Object.keys(credentialsToCreate)) {
        const cred = credentialsToCreate[username];
        const originalUser = usersToCreate.find(u => u.username === username);
        if (originalUser) {
            // 이미 존재하는 credentials인지 확인
            const existingCreds = await credentialsRepository.getUserCredentials(db, username);
            if (existingCreds) {
                console.log(`[DB] Credentials for ${username} already exist, skipping creation.`);
                continue;
            }
            
            try {
                await credentialsRepository.createUserCredentials(db, originalUser.username, cred.passwordHash, cred.userId);
                console.log(`[DB] Created credentials for: ${username}`);
            } catch (error: any) {
                // UNIQUE 제약조건 위반 등은 무시 (이미 존재하는 경우)
                if (error.message && error.message.includes('UNIQUE constraint')) {
                    console.log(`[DB] Credentials for ${username} already exist (detected by constraint), skipping creation.`);
                } else {
                    console.error(`[DB] Error creating credentials for ${username}:`, error);
                    throw error;
                }
            }
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
    const db = await getDb();
    const userRepository = await import('./repositories/userRepository.ts');

    let existing: User | null = null;
    try {
        existing = user.id ? await userRepository.getUser(db, user.id) : null;
    } catch (err) {
        console.error(`[DB] Failed to load existing user ${user.id} before update:`, err);
    }

    if (existing) {
        const prevInventoryCount = Array.isArray(existing.inventory) ? existing.inventory.length : 0;
        const nextInventoryCount = Array.isArray(user.inventory) ? user.inventory.length : 0;
        const prevEquipmentCount = existing.equipment ? Object.keys(existing.equipment).length : 0;
        const nextEquipmentCount = user.equipment ? Object.keys(user.equipment).length : 0;

        if (prevInventoryCount > 0 && nextInventoryCount === 0) {
            console.error(`[DB] CRITICAL: updateUser would clear inventory for ${user.id}. Restoring previous inventory snapshot.`);
            user.inventory = JSON.parse(JSON.stringify(existing.inventory));
        }
        if (prevEquipmentCount > 0 && nextEquipmentCount === 0) {
            console.error(`[DB] CRITICAL: updateUser would clear equipment for ${user.id}. Restoring previous equipment snapshot.`);
            user.equipment = JSON.parse(JSON.stringify(existing.equipment));
        }
    }

    return userRepository.updateUser(db, user);
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
export const getAllData = async (): Promise<Pick<AppState, 'users' | 'userCredentials' | 'liveGames' | 'singlePlayerGames' | 'towerGames' | 'adminLogs' | 'announcements' | 'globalOverrideAnnouncement' | 'gameModeAvailability' | 'announcementInterval'>> => {
    const db = await getDb();
    const userRepository = await import('./repositories/userRepository.ts');
    const gameRepository = await import('./repositories/gameRepository.ts');
    const kvRepository = await import('./repositories/kvRepository.ts');
    
    const users = await userRepository.getAllUsers(db);
    const allGames = await gameRepository.getAllActiveGames(db);
    
    // 게임을 카테고리별로 분리
    const liveGames: Record<string, LiveGameSession> = {};
    const singlePlayerGames: Record<string, LiveGameSession> = {};
    const towerGames: Record<string, LiveGameSession> = {};
    
    for (const game of allGames) {
        const category = game.gameCategory || (game.isSinglePlayer ? 'singleplayer' : 'normal');
        if (category === 'singleplayer') {
            singlePlayerGames[game.id] = game;
        } else if (category === 'tower') {
            towerGames[game.id] = game;
        } else {
            liveGames[game.id] = game;
        }
    }
    
    const adminLogs = await kvRepository.getKV<AdminLog[]>(db, 'adminLogs') || [];
    const announcements = await kvRepository.getKV<Announcement[]>(db, 'announcements') || [];
    const globalOverrideAnnouncement = await kvRepository.getKV<OverrideAnnouncement | null>(db, 'globalOverrideAnnouncement');
    const gameModeAvailability = await kvRepository.getKV<Record<GameMode, boolean>>(db, 'gameModeAvailability') || {};
    const announcementInterval = await kvRepository.getKV<number>(db, 'announcementInterval') || 3;
    
    // 사용자 데이터 최적화: 공개 정보만 포함 (인벤토리, 메일, 퀘스트 등은 제외)
    const optimizedUsers: Record<string, any> = {};
    for (const user of users) {
        // 전투력 계산을 위해 inventory와 equipment는 포함해야 함
        // 다만 메일, 퀘스트 등은 개인 정보이므로 제외
        optimizedUsers[user.id] = {
            id: user.id,
            username: user.username,
            nickname: user.nickname,
            isAdmin: user.isAdmin,
            strategyLevel: user.strategyLevel,
            strategyXp: user.strategyXp,
            playfulLevel: user.playfulLevel,
            playfulXp: user.playfulXp,
            gold: user.gold,
            diamonds: user.diamonds,
            stats: user.stats,
            mannerScore: user.mannerScore,
            avatarId: user.avatarId,
            borderId: user.borderId,
            tournamentScore: user.tournamentScore,
            league: user.league,
            mbti: user.mbti,
            isMbtiPublic: user.isMbtiPublic,
            inventory: user.inventory, // 전투력 계산을 위해 포함
            equipment: user.equipment, // 전투력 계산을 위해 포함
            baseStats: user.baseStats, // 전투력 계산을 위해 포함
            spentStatPoints: user.spentStatPoints, // 전투력 계산을 위해 포함
        };
    }
    
    return {
        users: optimizedUsers,
        userCredentials: {}, // Never send credentials to client
        liveGames,
        singlePlayerGames,
        towerGames,
        adminLogs,
        announcements,
        globalOverrideAnnouncement,
        gameModeAvailability,
        announcementInterval,
    };
};