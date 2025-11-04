import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import process from 'process';
import http from 'http';
import { createWebSocketServer } from './socket.js';
import { handleAction, resetAndGenerateQuests, updateQuestProgress } from './gameActions.js';
import { regenerateActionPoints } from './effectService.js';
import { updateGameStates } from './gameModes.js';
import * as db from './db.js';
import { analyzeGame } from './kataGoService.js';
// FIX: Import missing types from the centralized types file.
import * as types from '../types.js';
import { processGameSummary, endGame } from './summaryService.js';
// FIX: Correctly import from the placeholder module.
import * as aiPlayer from './aiPlayer.js';
import { processRankingRewards, processWeeklyLeagueUpdates, updateWeeklyCompetitorsIfNeeded } from './scheduledTasks.js';
import * as tournamentService from './tournamentService.js';
import { AVATAR_POOL, BOT_NAMES, PLAYFUL_GAME_MODES, SPECIAL_GAME_MODES, SINGLE_PLAYER_MISSIONS, GRADE_LEVEL_REQUIREMENTS } from '../constants';
import { calculateTotalStats } from './statService.js';
import { isSameDayKST } from '../utils/timeUtils.js';
import { createDefaultBaseStats, createDefaultUser } from './initialData.ts';
import { containsProfanity } from '../profanity.js';
import { volatileState } from './state.js';

const processSinglePlayerMissions = (user: types.User): types.User => {
    const now = Date.now();
    if (!user.singlePlayerMissions) {
        return user;
    }

    let userModified = false;
    // We make a copy of the user object to modify. This is safer and avoids null issues.
    const updatedUser: types.User = JSON.parse(JSON.stringify(user));

    for (const missionId in updatedUser.singlePlayerMissions) {
        const missionState = updatedUser.singlePlayerMissions[missionId];
        const missionInfo = SINGLE_PLAYER_MISSIONS.find(m => m.id === missionId);

        if (missionState && missionInfo && missionState.isStarted) {
            // Ensure accumulatedAmount is a number
            if (typeof missionState.accumulatedAmount !== 'number') {
                missionState.accumulatedAmount = 0;
                userModified = true;
            }

            if (missionState.accumulatedAmount >= missionInfo.maxCapacity) {
                continue; 
            }

            const elapsedMs = now - missionState.lastCollectionTime;
            const productionIntervalMs = missionInfo.productionRateMinutes * 60 * 1000;
            if (productionIntervalMs <= 0) continue;

            const cycles = Math.floor(elapsedMs / productionIntervalMs);

            if (cycles > 0) {
                const amountToAdd = cycles * missionInfo.rewardAmount;
                const newAmount = Math.min(missionInfo.maxCapacity, missionState.accumulatedAmount + amountToAdd);
                
                if (newAmount > missionState.accumulatedAmount) {
                    missionState.accumulatedAmount = newAmount;
                    missionState.lastCollectionTime += cycles * productionIntervalMs;
                    userModified = true;
                }
            }
        }
    }
    // Return the updated user only if there were modifications.
    return userModified ? updatedUser : user;
};


const startServer = async () => {
    // --- Initialize Database on Start ---
    try {
        await db.initializeDatabase();
    } catch (err) {
        console.error("FATAL: Could not initialize database.", err);
        (process as any).exit(1);
    }

    const app = express();
    console.log(`[Server] process.env.PORT: ${process.env.PORT}`);
    const port = parseInt(process.env.PORT || '4000', 10);
    console.log(`[Server] Using port: ${port}`);

    app.use(cors());
    app.use(express.json({ limit: '10mb' }) as any);

    // --- Constants ---
    const LOBBY_TIMEOUT_MS = 90 * 1000;
    const GAME_DISCONNECT_TIMEOUT_MS = 90 * 1000;
    const DISCONNECT_TIMER_S = 90;

    const server = http.createServer(app);
    createWebSocketServer(server);

    server.listen(port, '0.0.0.0', () => {
        console.log(`Server listening on port ${port}`);
    });

    // --- Main Game Loop ---
    setInterval(async () => {
        try {
            const now = Date.now();

            // --- START NEW OFFLINE AP REGEN LOGIC ---
            // Fetch all users to regenerate AP even for those offline.
            const allUsers = await db.getAllUsers();
            for (const user of allUsers) {
                let updatedUser = await regenerateActionPoints(user);
                updatedUser = processSinglePlayerMissions(updatedUser);


                
                // --- Tournament Simulation Logic ---
                let userModifiedByTournament = false;
                const tournamentTypes: types.TournamentType[] = ['neighborhood', 'national', 'world'];
                for (const type of tournamentTypes) {
                    const key = `last${type.charAt(0).toUpperCase() + type.slice(1)}Tournament` as keyof types.User;
                    const tournamentState = (updatedUser as any)[key] as types.TournamentState | null;
                    if (tournamentState && tournamentState.status === 'round_in_progress') {
                        tournamentService.advanceSimulation(tournamentState, updatedUser);
                        userModifiedByTournament = true;
                    }
                }
                
                // Use the original check, but rename my flag to avoid confusion
                if (userModifiedByTournament || JSON.stringify(user) !== JSON.stringify(updatedUser)) {
                    await db.updateUser(updatedUser);
                }
            }
            // --- END NEW OFFLINE AP REGEN LOGIC ---

            const activeGames = await db.getAllActiveGames();
            const originalGamesJson = activeGames.map(g => JSON.stringify(g));
            
            // Handle ranking rewards
            await processRankingRewards(volatileState);

            // Handle user timeouts and disconnections
            const onlineUserIdsBeforeTimeoutCheck = Object.keys(volatileState.userConnections);
            for (const userId of onlineUserIdsBeforeTimeoutCheck) {
                // Re-check if user is still connected, as they might have been removed by a previous iteration
                if (!volatileState.userConnections[userId]) continue;

                const user = await db.getUser(userId);
                if (!user) continue;

                const userStatus = volatileState.userStatuses[userId];
                const activeGame = activeGames.find(g => (g.player1.id === userId || g.player2.id === userId));
                const timeoutDuration = (activeGame || (userStatus?.status === 'in-game' && userStatus?.gameId)) ? GAME_DISCONNECT_TIMEOUT_MS : LOBBY_TIMEOUT_MS;

                if (now - volatileState.userConnections[userId] > timeoutDuration) {
                    // User timed out. They are now disconnected. Remove them from active connections.
                    delete volatileState.userConnections[userId];
                    volatileState.activeTournamentViewers.delete(userId);
            
                    if (activeGame) {
                        // User was in a game. Set the disconnection state for the single-player-disconnect logic.
                        // Their userStatus remains for now, so we know they were in this game.
                        if (!activeGame.disconnectionState) {
                            activeGame.disconnectionCounts[userId] = (activeGame.disconnectionCounts[userId] || 0) + 1;
                            if (activeGame.disconnectionCounts[userId] >= 3) {
                                const winner = activeGame.blackPlayerId === userId ? types.Player.White : types.Player.Black;
                                await endGame(activeGame, winner, 'disconnect');
                            } else {
                                activeGame.disconnectionState = { disconnectedPlayerId: userId, timerStartedAt: now };
                                if (activeGame.moveHistory.length < 10) {
                                    const otherPlayerId = activeGame.player1.id === userId ? activeGame.player2.id : activeGame.player1.id;
                                    if (!activeGame.canRequestNoContest) activeGame.canRequestNoContest = {};
                                    activeGame.canRequestNoContest[otherPlayerId] = true;
                                }
                                await db.saveGame(activeGame);
                            }
                        }
                    } else if (userStatus?.status === types.UserStatus.Waiting) {
                        // User was in waiting room, just remove connection, keep status for potential reconnect.
                        // This allows them to refresh without being kicked out of the user list.
                        delete volatileState.userConnections[userId];
                    }
                }
            }
            
            // Cleanup expired negotiations
            for (const negId of Object.keys(volatileState.negotiations)) {
                 const neg = volatileState.negotiations[negId];
                 if (now > neg.deadline) {
                    // Only the challenger's status is 'negotiating', so only they need a status reset.
                    const challengerId = neg.challenger.id;
                    const challengerStatus = volatileState.userStatuses[challengerId];

                    if (challengerStatus?.status === 'negotiating') {
                        // Check if they are part of another negotiation before setting to waiting
                        const hasOtherNegotiations = Object.values(volatileState.negotiations).some(
                            otherNeg => otherNeg.id !== negId && otherNeg.challenger.id === challengerId
                        );
                        if (!hasOtherNegotiations) {
                             volatileState.userStatuses[challengerId].status = types.UserStatus.Waiting;
                        }
                    }

                     if (neg.rematchOfGameId) {
                         const originalGame = await db.getLiveGame(neg.rematchOfGameId);
                         if (originalGame && originalGame.gameStatus === 'rematch_pending') {
                             originalGame.gameStatus = 'ended';
                             await db.saveGame(originalGame);
                         }
                     }
                     delete volatileState.negotiations[negId];
                 }
            }

            const onlineUserIds = Object.keys(volatileState.userConnections);
            let updatedGames = await updateGameStates(activeGames, now);

            // Check for mutual disconnection
            for (const game of updatedGames) {
                if (game.isAiGame || game.gameStatus === 'ended' || game.gameStatus === 'no_contest' || game.disconnectionState) continue;

                const p1Online = onlineUserIds.includes(game.player1.id);
                const p2Online = onlineUserIds.includes(game.player2.id);
                
                const isSpectatorPresent = Object.keys(volatileState.userStatuses).some(spectatorId => {
                    return onlineUserIds.includes(spectatorId) &&
                           volatileState.userStatuses[spectatorId].status === types.UserStatus.Spectating &&
                           volatileState.userStatuses[spectatorId].spectatingGameId === game.id;
                });

                if (!p1Online && !p2Online && !isSpectatorPresent) {
                    console.log(`[Game ${game.id}] Both players disconnected and no spectators. Setting to no contest.`);
                    game.gameStatus = 'no_contest';
                    game.winReason = 'disconnect'; // For context, but no one is penalized
                    await db.saveGame(game);
                }
            }
            
            // Save any game that has been modified by the update function
            for (let i = 0; i < updatedGames.length; i++) {
                if (JSON.stringify(updatedGames[i]) !== originalGamesJson[i]) {
                    await db.saveGame(updatedGames[i]);
                }
            }

            // Process any system messages generated by time-based events
            for (const game of updatedGames) {
                if (game.pendingSystemMessages && game.pendingSystemMessages.length > 0) {
                    if (!volatileState.gameChats[game.id]) {
                        volatileState.gameChats[game.id] = [];
                    }
                    volatileState.gameChats[game.id].push(...game.pendingSystemMessages);
                    game.pendingSystemMessages = [];
                    await db.saveGame(game);
                }
            }

            // Handle post-game summary processing for strategic games that finished via analysis
            for (const game of updatedGames) {
                if (SPECIAL_GAME_MODES.some(m => m.mode === game.mode) && (game.gameStatus === 'ended' || game.gameStatus === 'no_contest') && !game.statsUpdated) {
                    await processGameSummary(game);
                    game.statsUpdated = true;
                    await db.saveGame(game);
                }
            }
            
            // --- Game Room Garbage Collection for Ended Games ---
            const endedGames = await db.getAllEndedGames();

            for (const game of endedGames) {
                const isAnyoneInRoom = Object.keys(volatileState.userConnections).some(onlineUserId => {
                    const status = volatileState.userStatuses[onlineUserId];
                    return status && (status.gameId === game.id || status.spectatingGameId === game.id);
                });

                if (!isAnyoneInRoom) {
                     // Also check if a rematch negotiation is active for this game
                    const isRematchBeingNegotiated = Object.values(volatileState.negotiations).some(
                        neg => neg.rematchOfGameId === game.id
                    );

                    if (!isRematchBeingNegotiated) {
                        console.log(`[GC] Deleting empty, ended game room: ${game.id}`);
                        await db.deleteGame(game.id);
                    }
                }
            }

        } catch (e) {
            console.error('[FATAL] Unhandled error in main loop:', e);
        }
    }, 1000);
    
    // --- API Endpoints ---
    app.post('/api/auth/register', async (req, res) => {
        try {
            const { username, nickname, password } = req.body;
            if (!username || !nickname || !password) return res.status(400).json({ message: '모든 필드를 입력해야 합니다.' });
            if (username.trim().length < 2 || password.trim().length < 4) return res.status(400).json({ message: '아이디는 2자 이상, 비밀번호는 4자 이상이어야 합니다.' });
            if (nickname.trim().length < 2 || nickname.trim().length > 12) return res.status(400).json({ message: '닉네임은 2자 이상 12자 이하여야 합니다.' });
            if (containsProfanity(username) || containsProfanity(nickname)) return res.status(400).json({ message: '아이디 또는 닉네임에 부적절한 단어가 포함되어 있습니다.' });
    
            const existingByUsername = await db.getUserCredentials(username);
            if (existingByUsername) return res.status(409).json({ message: '이미 사용 중인 아이디입니다.' });
    
            const allUsers = await db.getAllUsers();
            if (allUsers.some(u => u.nickname.toLowerCase() === nickname.toLowerCase())) {
                return res.status(409).json({ message: '이미 사용 중인 닉네임입니다.' });
            }
    
            const newUser = createDefaultUser(`user-${randomUUID()}`, username, nickname, false);
    
            await db.createUser(newUser);
            await db.createUserCredentials(username, password, newUser.id);
    
            volatileState.userConnections[newUser.id] = Date.now();
            volatileState.userStatuses[newUser.id] = { status: types.UserStatus.Online };
    
            res.status(201).json({ user: newUser });
        } catch (e: any) {
            console.error('Registration error:', e);
            res.status(500).json({ message: '서버 등록 중 오류가 발생했습니다.' });
        }
    });

    app.post('/api/auth/login', async (req, res) => {
        console.log('[/api/auth/login] Received request');
        try {
            const { username, password } = req.body;
            console.log('[/api/auth/login] Attempting to get user credentials for:', username);
            let credentials = await db.getUserCredentials(username);
            if (credentials) {
                console.log('[/api/auth/login] Credentials found for username:', username);
            } else {
                console.log('[/api/auth/login] No credentials found for username. Attempting to get user by nickname:', username);
                const userByNickname = await db.getUserByNickname(username);
                if (userByNickname) {
                    console.log('[/api/auth/login] User found by nickname. Getting credentials by userId:', userByNickname.id);
                    credentials = await db.getUserCredentialsByUserId(userByNickname.id);
                    if (credentials) {
                        console.log('[/api/auth/login] Credentials found by userId for nickname:', username);
                    } else {
                        console.log('[/api/auth/login] No credentials found by userId for nickname:', username);
                    }
                } else {
                    console.log('[/api/auth/login] No user found by nickname:', username);
                }
            }

            if (!credentials || credentials.passwordHash !== password) {
                console.log('[/api/auth/login] Authentication failed for username:', username);
                return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
            }
            console.log('[/api/auth/login] Authentication successful for username:', username, '. Getting user details.');
            let user = await db.getUser(credentials.userId);
            if (user) {
                console.log('[/api/auth/login] User details retrieved for userId:', credentials.userId);
            } else {
                console.log('[/api/auth/login] User not found for userId:', credentials.userId);
                return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
            }
            if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });

            const defaultBaseStats = createDefaultBaseStats();
            if (!user.baseStats) {
                user.baseStats = defaultBaseStats;
                await db.updateUser(user);
            } else if (
                !user.baseStats ||
                Object.keys(user.baseStats).length !== Object.keys(defaultBaseStats).length ||
                                !Object.values(types.CoreStat).every(stat => (user!.baseStats as Record<types.CoreStat, number>)[stat] === 100)) {
                user.baseStats = defaultBaseStats;
                await db.updateUser(user);
            }
            
            const userBeforeUpdate = JSON.stringify(user);

            if (!user.ownedBorders?.includes('simple_black')) {
                if (!user.ownedBorders) user.ownedBorders = ['default'];
                user.ownedBorders.push('simple_black');
            }

            let updatedUser = await resetAndGenerateQuests(user);
            updatedUser = await processWeeklyLeagueUpdates(updatedUser);
            updatedUser = await regenerateActionPoints(updatedUser);

            const userLevelSum = updatedUser.strategyLevel + updatedUser.playfulLevel;
            let itemsUnequipped = false;
            const validEquipped: types.Equipment = {};
            for(const slot in updatedUser.equipment) {
                const itemId = updatedUser.equipment[slot as types.EquipmentSlot];
                const item = updatedUser.inventory.find(i => i.id === itemId);
                if (item) {
                    const requiredLevel = GRADE_LEVEL_REQUIREMENTS[item.grade];
                    if (userLevelSum >= requiredLevel) {
                        validEquipped[slot as types.EquipmentSlot] = itemId;
                    } else {
                        const invItem = updatedUser.inventory.find(i => i.id === itemId);
                        if(invItem) invItem.isEquipped = false;
                        itemsUnequipped = true;
                    }
                }
            }
            if (itemsUnequipped) {
                updatedUser.equipment = validEquipped;
            }

            const allGameModesList = [...SPECIAL_GAME_MODES, ...PLAYFUL_GAME_MODES].map(m => m.mode);
            let statsMigrated = false;
            if (!updatedUser.stats) {
                updatedUser.stats = {};
            }
            for (const mode of allGameModesList) {
                if (!updatedUser.stats[mode]) {
                    updatedUser.stats[mode] = { wins: 0, losses: 0, rankingScore: 1200 };
                    statsMigrated = true;
                }
            }

            // --- Equipment Presets Migration Logic ---
            let presetsMigrated = false;
            if (!updatedUser.equipmentPresets || updatedUser.equipmentPresets.length === 0) { // Check for empty array too
                updatedUser.equipmentPresets = [
                    { name: '프리셋 1', equipment: updatedUser.equipment || {} }, // Initialize with current equipment
                    { name: '프리셋 2', equipment: {} },
                    { name: '프리셋 3', equipment: {} },
                    { name: '프리셋 4', equipment: {} },
                    { name: '프리셋 5', equipment: {} },
                ];
                presetsMigrated = true;
            }
            // --- End Equipment Presets Migration Logic ---

            if (userBeforeUpdate !== JSON.stringify(updatedUser) || statsMigrated || itemsUnequipped || presetsMigrated) {
                await db.updateUser(updatedUser);
                user = updatedUser;
            }

            if (volatileState.userConnections[user.id]) {
                console.log(`[Auth] Concurrent login for ${user.nickname}. Terminating old session and establishing new one.`);
            }
            
            const allActiveGames = await db.getAllActiveGames();
            const activeGame = allActiveGames.find(g => 
                (g.player1.id === user!.id || g.player2.id === user!.id)
            );
    
            if (activeGame) {
                if (activeGame.disconnectionState?.disconnectedPlayerId === user!.id) {
                    activeGame.disconnectionState = null;
                    const otherPlayerId = activeGame.player1.id === user!.id ? activeGame.player2.id : activeGame.player1.id;
                    if (activeGame.canRequestNoContest?.[otherPlayerId]) {
                        delete activeGame.canRequestNoContest[otherPlayerId];
                    }
                    await db.saveGame(activeGame);
                }
                volatileState.userStatuses[user!.id] = { status: types.UserStatus.InGame, mode: activeGame.mode, gameId: activeGame.id };
            } else {
                volatileState.userStatuses[user!.id] = { status: types.UserStatus.Online };
            }
            
            res.status(200).json({ user });
        } catch (e: any) {
            console.error('Login error:', e);
            console.error(e); // Added for debugging
            res.status(500).json({ message: '서버 로그인 처리 중 오류가 발생했습니다.' });
        }
    });

    app.post('/api/state', async (req, res) => {
        console.log('[/api/state] Received request');
        try {
            const { userId } = req.body;
            console.log(`[API/State] Received request for userId: ${userId}`);

            if (!userId) {
                console.log('[API/State] No userId provided, returning 401.');
                return res.status(401).json({ message: '인증 정보가 없습니다.' });
            }

            console.log('[/api/state] Getting user from DB');
            let user = await db.getUser(userId);
            console.log('[/api/state] User retrieved from DB');
            if (!user) {
                console.log(`[API/State] User ${userId} not found, cleaning up connection and returning 401.`);
                delete volatileState.userConnections[userId]; // Clean up just in case
                return res.status(401).json({ message: '세션이 만료되었습니다. 다시 로그인해주세요.' });
            }
            console.log(`[API/State] User ${user.nickname} found.`);

            console.log('[/api/state] Starting migration logic');
            // --- Inventory Slots Migration Logic ---
            let inventorySlotsUpdated = false;
            if (!user.inventorySlotsMigrated) {
                console.log(`[API/State] User ${user.nickname}: Running inventory slots migration.`);
                let currentEquipmentSlots = 30;
                let currentConsumableSlots = 30;
                let currentMaterialSlots = 30;

                if (typeof user.inventorySlots === 'number') {
                    // Old format: number of slots for equipment
                    currentEquipmentSlots = Math.max(30, user.inventorySlots);
                } else if (typeof user.inventorySlots === 'object' && user.inventorySlots !== null) {
                    // New format, but might be partially initialized or have values less than 30
                    currentEquipmentSlots = Math.max(30, user.inventorySlots.equipment || 0);
                    currentConsumableSlots = Math.max(30, user.inventorySlots.consumable || 0);
                    currentMaterialSlots = Math.max(30, user.inventorySlots.material || 0);
                }

                // Apply updates if any slot count is less than 30 or if it was in the old number format
                if (typeof user.inventorySlots === 'number' ||
                    (typeof user.inventorySlots === 'object' && user.inventorySlots !== null &&
                        (user.inventorySlots.equipment < 30 ||
                        user.inventorySlots.consumable < 30 ||
                        user.inventorySlots.material < 30))) {

                    user.inventorySlots = {
                        equipment: currentEquipmentSlots,
                        consumable: currentConsumableSlots,
                        material: currentMaterialSlots,
                    };
                    inventorySlotsUpdated = true;
                }
                
                if (inventorySlotsUpdated) {
                    user.inventorySlotsMigrated = true;
                }
            }
            console.log('[/api/state] Finished migration logic');

            // Re-establish connection if user is valid but not in volatile memory (e.g., after server restart)
            if (!volatileState.userConnections[userId]) {
                console.log(`[API/State] User ${user.nickname}: Re-establishing connection.`);
                volatileState.userConnections[userId] = Date.now();
                // If user status is not present (e.g., server restart), set to online.
                // If it IS present (e.g., they just refreshed), do NOT change it, preserving their 'waiting' status.
                if (!volatileState.userStatuses[userId]) {
                    volatileState.userStatuses[userId] = { status: types.UserStatus.Online };
                }
            }

            volatileState.userConnections[userId] = Date.now();
            
            const userBeforeUpdate = JSON.stringify(user);
            const allUsersForCompetitors = await db.getAllUsers();
            console.log(`[API/State] User ${user.nickname}: Processing quests, league updates, AP regen, and weekly competitors.`);
            let updatedUser = await resetAndGenerateQuests(user);
            updatedUser = await processWeeklyLeagueUpdates(updatedUser);
            updatedUser = await regenerateActionPoints(updatedUser);
            updatedUser = await updateWeeklyCompetitorsIfNeeded(updatedUser, allUsersForCompetitors);
            
            // --- Stats Migration Logic ---
            const allGameModesList = [...SPECIAL_GAME_MODES, ...PLAYFUL_GAME_MODES].map(m => m.mode);
            let statsMigrated = false;
            if (!updatedUser.stats) {
                updatedUser.stats = {};
            }
            for (const mode of allGameModesList) {
                if (!updatedUser.stats[mode]) {
                    updatedUser.stats[mode] = { wins: 0, losses: 0, rankingScore: 1200 };
                    statsMigrated = true;
                }
            }
            console.log(`[API/State] User ${user.nickname}: Stats migration complete (migrated: ${statsMigrated}).`);
            // --- End Migration Logic ---

            // --- Equipment Presets Migration Logic ---
            let presetsMigrated = false;
            if (!updatedUser.equipmentPresets || updatedUser.equipmentPresets.length === 0) { // Check for empty array too
                updatedUser.equipmentPresets = [
                    { name: '프리셋 1', equipment: updatedUser.equipment || {} }, // Initialize with current equipment
                    { name: '프리셋 2', equipment: {} },
                    { name: '프리셋 3', equipment: {} },
                    { name: '프리셋 4', equipment: {} },
                    { name: '프리셋 5', equipment: {} },
                ];
                presetsMigrated = true;
            }
            // --- End Equipment Presets Migration Logic ---

            if (userBeforeUpdate !== JSON.stringify(updatedUser) || statsMigrated || inventorySlotsUpdated || presetsMigrated) {
                console.log(`[API/State] User ${user.nickname}: Updating user in DB.`);
                await db.updateUser(updatedUser);
            }
            
            console.log('[/api/state] Getting all DB data');
            console.log(`[API/State] User ${user.nickname}: Getting all DB data.`);
            const dbState = await db.getAllData();
            console.log('[/api/state] All DB data retrieved');
    
            // Add ended games that users are still in to the liveGames object
            console.log(`[API/State] User ${user.nickname}: Processing ended games.`);
            for (const status of Object.values(volatileState.userStatuses)) {
                let gameId: string | undefined;
                if ('gameId' in status && status.gameId) {
                    gameId = status.gameId;
                } else if ('spectatingGameId' in status && status.spectatingGameId) {
                    gameId = status.spectatingGameId;
                }
                if (gameId && !dbState.liveGames[gameId]) {
                    const endedGame = await db.getLiveGame(gameId);
                    if (endedGame) {
                        dbState.liveGames[endedGame.id] = endedGame;
                    }
                }
            }
            
            if (dbState.users[userId]) {
                dbState.users[userId] = updatedUser;
            }

            // Combine persisted state with in-memory volatile state
            console.log(`[API/State] User ${user.nickname}: Combining states and sending response.`);
            const fullState: Omit<types.AppState, 'userCredentials'> = {
                ...dbState,
                userConnections: volatileState.userConnections,
                userStatuses: volatileState.userStatuses,
                negotiations: volatileState.negotiations,
                waitingRoomChats: volatileState.waitingRoomChats,
                gameChats: volatileState.gameChats,
                userLastChatMessage: volatileState.userLastChatMessage,
            };
            
            res.status(200).json(fullState);
        } catch (e) {
            console.error('Get state error:', e);
            res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    });

    app.post('/api/action', async (req, res) => {
        try {
            const { userId } = req.body;

            // Allow registration without auth
            if (req.body.type === 'REGISTER') {
                 const result = await handleAction(volatileState, req.body);
                 if (result.error) return res.status(400).json({ message: result.error });
                 return res.status(200).json({ success: true, ...result.clientResponse });
            }

            if (!userId) {
                return res.status(401).json({ message: '인증 정보가 없습니다.' });
            }

            const user = await db.getUser(userId);
            if (!user) {
                delete volatileState.userConnections[userId];
                return res.status(401).json({ message: '유효하지 않은 사용자입니다.' });
            }

            // --- Inventory Slots Migration Logic ---
            if (!user.inventorySlotsMigrated) {
                let currentEquipmentSlots = 30;
                let currentConsumableSlots = 30;
                let currentMaterialSlots = 30;

                if (typeof user.inventorySlots === 'number') {
                    currentEquipmentSlots = Math.max(30, user.inventorySlots);
                } else if (typeof user.inventorySlots === 'object' && user.inventorySlots !== null) {
                    currentEquipmentSlots = Math.max(30, user.inventorySlots.equipment || 0);
                    currentConsumableSlots = Math.max(30, user.inventorySlots.consumable || 0);
                    currentMaterialSlots = Math.max(30, user.inventorySlots.material || 0);
                }

                if (typeof user.inventorySlots === 'number' || (typeof user.inventorySlots === 'object' && user.inventorySlots !== null && (user.inventorySlots.equipment < 30 || user.inventorySlots.consumable < 30 || user.inventorySlots.material < 30))) {
                    user.inventorySlots = {
                        equipment: currentEquipmentSlots,
                        consumable: currentConsumableSlots,
                        material: currentMaterialSlots,
                    };
                    user.inventorySlotsMigrated = true;
                    await db.updateUser(user);
                }
            }
            // --- End Migration Logic ---

            // Re-establish connection if needed
            if (!volatileState.userConnections[userId]) {
                console.log(`[Auth] Re-establishing connection on action for user: ${user.nickname} (${userId})`);
                volatileState.userConnections[userId] = Date.now();
                volatileState.userStatuses[userId] = { status: types.UserStatus.Online };
            }
            
            volatileState.userConnections[userId] = Date.now();

            const result = await handleAction(volatileState, req.body);
            
            if (result.error) {
                return res.status(400).json({ message: result.error });
            }
            
            res.status(200).json({ success: true, ...result.clientResponse });
        } catch (e: any) {
            console.error(`Action error for ${req.body?.type}:`, e);
            res.status(500).json({ message: '요청 처리 중 오류가 발생했습니다.'});
        }
    });


};

startServer();