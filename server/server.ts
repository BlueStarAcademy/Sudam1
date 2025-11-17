import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import process from 'process';
import http from 'http';
import { createWebSocketServer, broadcast } from './socket.js';
import { handleAction, resetAndGenerateQuests, updateQuestProgress } from './gameActions.js';
import { regenerateActionPoints } from './effectService.js';
import { updateGameStates } from './gameModes.js';
import * as db from './db.js';
import { analyzeGame, initializeKataGo } from './kataGoService.js';
// FIX: Import missing types from the centralized types file.
import * as types from '../types/index.js';
import { Player } from '../types/index.js';
import { processGameSummary, endGame } from './summaryService.js';
// FIX: Correctly import from the placeholder module.
import * as aiPlayer from './aiPlayer.js';
import { processRankingRewards, processWeeklyLeagueUpdates, updateWeeklyCompetitorsIfNeeded, processWeeklyTournamentReset, resetAllTournamentScores, resetAllUsersLeagueScoresForNewWeek, processDailyRankings, processDailyQuestReset, resetAllChampionshipScoresToZero, processTowerRankingRewards } from './scheduledTasks.js';
import * as tournamentService from './tournamentService.js';
import { AVATAR_POOL, BOT_NAMES, PLAYFUL_GAME_MODES, SPECIAL_GAME_MODES, SINGLE_PLAYER_MISSIONS, GRADE_LEVEL_REQUIREMENTS, NICKNAME_MAX_LENGTH, NICKNAME_MIN_LENGTH } from '../constants';
import { calculateTotalStats } from './statService.js';
import { isSameDayKST, getKSTDate } from '../utils/timeUtils.js';
import { createDefaultBaseStats, createDefaultUser } from './initialData.ts';
import { containsProfanity } from '../profanity.js';
import { volatileState } from './state.js';
import { CoreStat } from '../types/index.js';
import { clearAiSession, syncAiSession } from './aiSessionManager.js';

const getTournamentStateByType = (user: types.User, type: types.TournamentType): types.TournamentState | null => {
    switch (type) {
        case 'neighborhood':
            return user.lastNeighborhoodTournament ?? null;
        case 'national':
            return user.lastNationalTournament ?? null;
        case 'world':
            return user.lastWorldTournament ?? null;
        default:
            return null;
    }
};

let isProcessingTournamentTick = false;
let isProcessingMainLoop = false;
let hasLoggedMainLoopSkip = false;

const OFFLINE_REGEN_INTERVAL_MS = 60_000; // 1 minute
let lastOfflineRegenAt = 0;
const DAILY_TASK_CHECK_INTERVAL_MS = 60_000; // 1 minute
let lastDailyTaskCheckAt = 0;

// 만료된 negotiation 정리 함수
const cleanupExpiredNegotiations = (volatileState: types.VolatileState, now: number): void => {
    const expiredNegIds: string[] = [];
    
    for (const [negId, neg] of Object.entries(volatileState.negotiations)) {
        if (neg.deadline && now > neg.deadline && neg.status === 'pending') {
            expiredNegIds.push(negId);
            
            // 사용자 상태 복구
            if (volatileState.userStatuses[neg.challenger.id]?.status === types.UserStatus.Negotiating) {
                volatileState.userStatuses[neg.challenger.id].status = types.UserStatus.Waiting;
            }
            if (volatileState.userStatuses[neg.opponent.id]?.status === types.UserStatus.Negotiating) {
                volatileState.userStatuses[neg.opponent.id].status = types.UserStatus.Waiting;
            }
        }
    }
    
    for (const negId of expiredNegIds) {
        delete volatileState.negotiations[negId];
    }
    
    if (expiredNegIds.length > 0) {
        broadcast({ type: 'NEGOTIATION_UPDATE', payload: { negotiations: volatileState.negotiations, userStatuses: volatileState.userStatuses } });
    }
};

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
            // Ensure accumulatedAmount and level are numbers
            if (typeof missionState.accumulatedAmount !== 'number') {
                missionState.accumulatedAmount = 0;
                userModified = true;
            }
            if (typeof missionState.level !== 'number') {
                missionState.level = 1;
                userModified = true;
            }

            const currentLevel = missionState.level || 1;
            const levelInfo = missionInfo.levels[currentLevel - 1];
            if (!levelInfo) continue;

            if (missionState.accumulatedAmount >= levelInfo.maxCapacity) {
                continue; 
            }

            const elapsedMs = now - missionState.lastCollectionTime;
            const productionIntervalMs = levelInfo.productionRateMinutes * 60 * 1000;
            if (productionIntervalMs <= 0) continue;

            const cycles = Math.floor(elapsedMs / productionIntervalMs);

            if (cycles > 0) {
                const amountToAdd = cycles * levelInfo.rewardAmount;
                const newAmount = Math.min(levelInfo.maxCapacity, missionState.accumulatedAmount + amountToAdd);
                
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
        console.error("Error during server startup:", err);
        (process as any).exit(1);
    }

    // Fetch all users from DB
    const allDbUsers = await db.getAllUsers();
    const coreStats = Object.values(CoreStat) as CoreStat[];
    let usersUpdatedCount = 0;

    // First, run the migration logic to ensure all users have correct base stats
    for (const user of allDbUsers) {
        const defaultBaseStats = createDefaultBaseStats();
        let needsUpdate = false;

        // More robust check: if baseStats is missing, or any stat is not a number or is less than 100
        if (!user.baseStats || coreStats.some(stat => typeof user.baseStats?.[stat] !== 'number' || user.baseStats[stat] < 100)) {
            user.baseStats = defaultBaseStats;
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            console.log(`[Server Startup] Updating base stats for user: ${user.nickname}`);
            await db.updateUser(user);
            usersUpdatedCount++;
        }
    }

    console.log(`[Server Startup] Base stats update complete. ${usersUpdatedCount} user(s) had their base stats updated.`);

    // --- 1회성 챔피언십 점수 초기화 (주석 해제하여 실행) ---
    // await resetAllTournamentScores();
    
    // --- 1회성: 모든 유저의 리그 점수를 0으로 초기화하여 변화없음으로 표시되도록 함 ---
    await resetAllUsersLeagueScoresForNewWeek();
    // await resetAllChampionshipScoresToZero(); // One-time Champ Score reset (disabled after manual run)

    const app = express();
    console.log(`[Server] process.env.PORT: ${process.env.PORT}`);
    const port = parseInt(process.env.PORT || '4000', 10);
    console.log(`[Server] Using port: ${port}`);

    app.use(cors());
    app.use(express.json({ limit: '10mb' }) as any);
    
    // Ignore development tooling noise such as Vite/Esbuild status pings
    app.use('/@esbuild', (_req, res) => {
        res.status(204).end();
    });
    
    // TODO: compression 패키지 설치 후 압축 미들웨어 추가
    // npm install compression @types/compression

    // --- Constants ---
    const LOBBY_TIMEOUT_MS = 90 * 1000;
    const GAME_DISCONNECT_TIMEOUT_MS = 90 * 1000;
    const DISCONNECT_TIMER_S = 90;

    const server = http.createServer(app);
    createWebSocketServer(server);

    server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`[Server] Port ${port} is already in use. Please stop the process using this port or use a different port.`);
            console.error(`[Server] To find and kill the process: netstat -ano | findstr ":${port}"`);
            process.exit(1);
        } else {
            console.error('[Server] Server error:', error);
            process.exit(1);
        }
    });

    server.listen(port, '0.0.0.0', async () => {
        console.log(`[Server] Server listening on port ${port}`);
        
        // KataGo 엔진 초기화 (서버 시작 시 미리 준비)
        await initializeKataGo();
    });

    const processActiveTournamentSimulations = async () => {
        if (isProcessingTournamentTick) return;
        const activeTournaments = volatileState.activeTournaments;
        if (!activeTournaments || Object.keys(activeTournaments).length === 0) {
            return;
        }

        isProcessingTournamentTick = true;
        try {
            // 각 토너먼트를 독립적으로 병렬 처리 (PVE 게임처럼)
            const tournamentEntries = Object.entries(activeTournaments);
            
            // 각 토너먼트를 독립적으로 처리하는 함수
            const processTournament = async ([userId, activeState]: [string, types.TournamentState]) => {
                try {
                    // 캐시를 사용하여 DB 조회 최소화
                    const { getCachedUser, updateUserCache } = await import('./gameCache.js');
                    const user = await getCachedUser(userId);
                    if (!user) {
                        delete activeTournaments[userId];
                        return;
                    }

                    const tournamentState = getTournamentStateByType(user, activeState.type);
                    if (!tournamentState || tournamentState.status !== 'round_in_progress') {
                        delete activeTournaments[userId];
                        return;
                    }

                    const advanced = tournamentService.advanceSimulation(tournamentState, user);
                    if (!advanced) {
                        return;
                    }

                    // Keep volatile state reference updated
                    activeTournaments[userId] = tournamentState;

                    // 사용자 캐시 업데이트
                    updateUserCache(user);
                    // DB 저장은 비동기로 처리하여 응답 지연 최소화
                    db.updateUser(user).catch(err => {
                        console.error(`[TournamentTicker] Failed to save user ${userId}:`, err);
                    });

                    const sanitizedUser = JSON.parse(JSON.stringify(user));
                    broadcast({ type: 'USER_UPDATE', payload: { [user.id]: sanitizedUser } });

                    if (tournamentState.status !== 'round_in_progress') {
                        delete activeTournaments[userId];
                    }
                } catch (error) {
                    console.error(`[TournamentTicker] Failed to advance simulation for user ${userId}`, error);
                }
            };

            // 모든 토너먼트를 병렬로 처리 (각 토너먼트는 독립적)
            await Promise.all(tournamentEntries.map(processTournament));
        } catch (error) {
            console.error('[TournamentTicker] Failed to process tournament simulations', error);
        } finally {
            isProcessingTournamentTick = false;
        }
    };

    // Tournament simulation ticker - 클라이언트에서 실행하도록 변경되어 비활성화
    // const scheduleTournamentTick = () => {
    //     const startTime = Date.now();
    //     processActiveTournamentSimulations().finally(() => {
    //         const elapsed = Date.now() - startTime;
    //         // 다음 틱은 정확히 1초 후에 실행 (실행 시간 보정)
    //         const nextDelay = Math.max(0, 1000 - elapsed);
    //         setTimeout(scheduleTournamentTick, nextDelay);
    //     });
    // };
    // scheduleTournamentTick();

    const scheduleMainLoop = (delay = 1000) => {
        setTimeout(async () => {
            if (isProcessingMainLoop) {
                scheduleMainLoop(Math.min(delay * 2, 5000));
                return;
            }

            isProcessingMainLoop = true;
            hasLoggedMainLoopSkip = false;
            try {
                const now = Date.now();

            // --- START NEW OFFLINE AP REGEN LOGIC ---
            if (now - lastOfflineRegenAt >= OFFLINE_REGEN_INTERVAL_MS) {
                const allUsers = await db.getAllUsers();
                
                // 매일 0시에 토너먼트 상태 자동 리셋 확인 (processDailyQuestReset에서 처리되지만, 
                // 메인 루프에서도 날짜 변경 시 체크하여 오프라인 사용자도 리셋되도록 보장)
                const { getKSTHours, getKSTMinutes } = await import('../utils/timeUtils.js');
                const kstHoursForReset = getKSTHours(now);
                const kstMinutesForReset = getKSTMinutes(now);
                const isMidnightForReset = kstHoursForReset === 0 && kstMinutesForReset < 5;
                
                for (const user of allUsers) {
                    let updatedUser = user;
                    
                    // 매일 0시에만 토너먼트 상태 리셋 (로그인하지 않은 사용자도 포함)
                    if (isMidnightForReset) {
                        updatedUser = await resetAndGenerateQuests(updatedUser);
                    }
                    
                    updatedUser = await regenerateActionPoints(updatedUser);
                    updatedUser = processSinglePlayerMissions(updatedUser);
                    
                    // 봇의 리그 점수 업데이트 (하루에 한번, 단 월요일 0시는 제외 - processWeeklyResetAndRematch에서 처리)
                    const { getKSTDay } = await import('../utils/timeUtils.js');
                    const kstDayForBotUpdate = getKSTDay(now);
                    const kstHoursForBotUpdate = getKSTHours(now);
                    const kstMinutesForBotUpdate = getKSTMinutes(now);
                    const isMondayMidnightForBotUpdate = kstDayForBotUpdate === 1 && kstHoursForBotUpdate === 0 && kstMinutesForBotUpdate < 5;
                    if (!isMondayMidnightForBotUpdate) {
                        const { updateBotLeagueScores } = await import('./scheduledTasks.js');
                        updatedUser = await updateBotLeagueScores(updatedUser);
                    }
                    
                    if (JSON.stringify(user) !== JSON.stringify(updatedUser)) {
                        await db.updateUser(updatedUser);
                    }
                }

                lastOfflineRegenAt = now;
                }
                // --- END NEW OFFLINE AP REGEN LOGIC ---

            // 캐시 정리 (주기적으로 실행)
            const { cleanupExpiredCache } = await import('./gameCache.js');
            cleanupExpiredCache();
            
            // 만료된 negotiation 정리
            cleanupExpiredNegotiations(volatileState, now);

            const activeGames = await db.getAllActiveGames();
            const originalGamesJson = activeGames.map(g => JSON.stringify(g));
            
            // 게임을 캐시에 미리 로드
            const { updateGameCache } = await import('./gameCache.js');
            for (const game of activeGames) {
                updateGameCache(game);
            }
            
            // Handle weekly league updates (Monday 0:00 KST) - 점수 리셋 전에 실행
            // 리그 업데이트는 각 사용자 로그인 시 processWeeklyLeagueUpdates에서 처리되지만,
            // 월요일 0시에 명시적으로 모든 사용자에 대해 리그 업데이트를 실행
                if (now - lastDailyTaskCheckAt >= DAILY_TASK_CHECK_INTERVAL_MS) {
                const { getKSTDay, getKSTHours, getKSTMinutes, getKSTFullYear, getKSTMonth, getKSTDate_UTC, getKSTDate } = await import('../utils/timeUtils.js');
                const kstDay = getKSTDay(now);
                const kstHours = getKSTHours(now);
                const kstMinutes = getKSTMinutes(now);
                const isMondayMidnight = kstDay === 1 && kstHours === 0 && kstMinutes < 5;
                
                // 디버깅: 현재 KST 시간 정보 로그 (0시 근처에만)
                if (process.env.NODE_ENV === 'development' && (kstHours === 0 || (kstHours === 23 && kstMinutes >= 55))) {
                    console.log(`[Server] Daily task check: KST Day=${kstDay}, Hours=${kstHours}, Minutes=${kstMinutes}, isMondayMidnight=${isMondayMidnight}`);
                }
                
                // 중복 실행 방지: 이번 월요일 0시에 이미 처리했는지 확인
                if (isMondayMidnight) {
                    const { getLastWeeklyLeagueUpdateTimestamp, setLastWeeklyLeagueUpdateTimestamp, processWeeklyResetAndRematch } = await import('./scheduledTasks.js');
                    const { getStartOfDayKST } = await import('../utils/timeUtils.js');
                    const lastUpdateTimestamp = getLastWeeklyLeagueUpdateTimestamp();
                    
                    // 실행 조건: lastUpdateTimestamp가 null이거나, 현재 날짜와 다른 경우 (KST 기준)
                    const shouldProcess = lastUpdateTimestamp === null || getStartOfDayKST(lastUpdateTimestamp) !== getStartOfDayKST(now);
                    if (shouldProcess) {
                        console.log(`[WeeklyLeagueUpdate] Processing weekly league updates for all users at Monday 0:00 KST`);
                        setLastWeeklyLeagueUpdateTimestamp(now);
                        
                        const allUsersForLeagueUpdate = await db.getAllUsers();
                        let usersUpdated = 0;
                        let mailsSent = 0;
                        
                        // 1. 티어변동 처리 (이전 주간 점수로 순위 계산 후 티어 결정)
                        for (const user of allUsersForLeagueUpdate) {
                            const userBeforeUpdate = JSON.parse(JSON.stringify(user));
                            const updatedUser = await processWeeklyLeagueUpdates(user);
                            const userAfterUpdate = JSON.parse(JSON.stringify(updatedUser));
                            
                            // 메일이 추가되었는지 확인
                            const mailAdded = (updatedUser.mail?.length || 0) > (user.mail?.length || 0);
                            if (mailAdded) {
                                mailsSent++;
                                console.log(`[WeeklyLeagueUpdate] Mail sent to user ${user.nickname} (${user.id})`);
                            }
                            
                            if (JSON.stringify(userBeforeUpdate) !== JSON.stringify(userAfterUpdate)) {
                                await db.updateUser(updatedUser);
                                usersUpdated++;
                            }
                        }
                        console.log(`[WeeklyLeagueUpdate] Updated ${usersUpdated} users, sent ${mailsSent} mails`);
                        
                        // 2. 티어변동 후 새로운 경쟁상대 매칭 및 모든 점수 리셋
                        await processWeeklyResetAndRematch();
                    }
                }
                
                // Handle weekly tournament reset (Monday 0:00 KST) - 이제 processWeeklyResetAndRematch에서 처리됨
                // 기존 함수는 호환성을 위해 유지하지만 실제 처리는 processWeeklyResetAndRematch에서 수행
                if (!isMondayMidnight) {
                    await processWeeklyTournamentReset();
                }
                
                // Handle ranking rewards
                await processRankingRewards(volatileState);
                
                // Handle daily ranking calculations (매일 0시 정산)
                await processDailyRankings();
                await processTowerRankingRewards();
                
                // Handle daily quest reset (매일 0시 KST)
                await processDailyQuestReset();

                    lastDailyTaskCheckAt = now;
                }

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
                        // 도전의 탑, 싱글플레이, AI 게임에서는 접속 끊김 패널티 없음
                        const isNoPenaltyGame = activeGame.isSinglePlayer || activeGame.gameCategory === 'tower' || activeGame.isAiGame;
                        if (!activeGame.disconnectionState) {
                            if (!isNoPenaltyGame) {
                                // 일반 게임에서만 접속 끊김 카운트 및 패널티 적용
                                if (!activeGame.disconnectionCounts) activeGame.disconnectionCounts = {};
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
                            } else {
                                // 도전의 탑, 싱글플레이, AI 게임에서는 즉시 게임 종료 (패널티 없음)
                                const winner = activeGame.blackPlayerId === userId ? types.Player.White : types.Player.Black;
                                await endGame(activeGame, winner, 'disconnect');
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
                    const challengerId = neg.challenger.id;
                    const opponentId = neg.opponent.id;
                    const challengerStatus = volatileState.userStatuses[challengerId];
                    const opponentStatus = volatileState.userStatuses[opponentId];

                    // Challenger 상태 업데이트
                    if (challengerStatus?.status === 'negotiating') {
                        // Check if they are part of another negotiation before setting to waiting
                        const hasOtherNegotiations = Object.values(volatileState.negotiations).some(
                            otherNeg => otherNeg.id !== negId && otherNeg.challenger.id === challengerId
                        );
                        if (!hasOtherNegotiations) {
                             volatileState.userStatuses[challengerId].status = types.UserStatus.Waiting;
                        }
                    }

                    // Opponent 상태 업데이트 (상대방이 응답하지 않아서 자동 거절)
                    if (opponentStatus?.status === 'negotiating') {
                        // Check if they are part of another negotiation before setting to waiting
                        const hasOtherNegotiations = Object.values(volatileState.negotiations).some(
                            otherNeg => otherNeg.id !== negId && (otherNeg.challenger.id === opponentId || otherNeg.opponent.id === opponentId)
                        );
                        if (!hasOtherNegotiations) {
                             volatileState.userStatuses[opponentId].status = types.UserStatus.Waiting;
                        }
                    }

                     if (neg.rematchOfGameId) {
                         // 캐시에서 게임을 가져오기 (DB 조회 최소화)
                         const { getCachedGame } = await import('./gameCache.js');
                         const originalGame = await getCachedGame(neg.rematchOfGameId);
                         if (originalGame && originalGame.gameStatus === 'rematch_pending') {
                             originalGame.gameStatus = 'ended';
                             await db.saveGame(originalGame);
                         }
                     }
                     delete volatileState.negotiations[negId];
                     
                     // 만료된 negotiation 삭제 후 브로드캐스트하여 양쪽 클라이언트에 알림
                     broadcast({ type: 'NEGOTIATION_UPDATE', payload: { negotiations: volatileState.negotiations, userStatuses: volatileState.userStatuses } });
                     
                     // USER_STATUS_UPDATE도 브로드캐스트하여 상태 변경을 확실히 전달
                     broadcast({ type: 'USER_STATUS_UPDATE', payload: volatileState.userStatuses });
                 }
            }

            const onlineUserIds = Object.keys(volatileState.userConnections);
            let updatedGames = await updateGameStates(activeGames, now);

            // Check for mutual disconnection
            const disconnectedGamesToBroadcast: Record<string, types.LiveGameSession> = {};
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
                    clearAiSession(game.id);
                    disconnectedGamesToBroadcast[game.id] = game;
                }
            }
            
            // 연결 끊김으로 인한 게임 상태 변경 브로드캐스트
            if (Object.keys(disconnectedGamesToBroadcast).length > 0) {
                broadcast({ type: 'GAME_UPDATE', payload: disconnectedGamesToBroadcast });
            }
            
            // Save any game that has been modified by the update function and broadcast updates
            const gamesToBroadcast: Record<string, types.LiveGameSession> = {};
            for (let i = 0; i < updatedGames.length; i++) {
                const updatedGame = updatedGames[i];
                
                // 싱글플레이 게임은 게임 루프에서 변경사항이 거의 없으므로 저장/브로드캐스트 최소화
                // (PLACE_STONE 액션에서 이미 저장되고 브로드캐스트됨)
                if (updatedGame.isSinglePlayer) {
                    // 게임 상태가 변경된 경우에만 브로드캐스트 (예: 타임아웃, 게임 종료 등)
                    const originalGame = activeGames[i];
                    const hasSignificantChange = !originalGame || 
                                                 updatedGame.gameStatus !== originalGame.gameStatus ||
                                                 updatedGame.winner !== originalGame.winner ||
                                                 (updatedGame.disconnectionState !== originalGame.disconnectionState);
                    if (hasSignificantChange) {
                        gamesToBroadcast[updatedGame.id] = updatedGame;
                    }
                    continue;
                }

                // 멀티플레이 게임만 상세 처리
                if (JSON.stringify(updatedGame) !== originalGamesJson[i]) {
                    const currentMoveCount = updatedGame.moveHistory?.length ?? 0;
                    const localRevision = updatedGame.serverRevision ?? 0;
                    const localSyncedAt = updatedGame.lastSyncedAt ?? 0;
                    // 캐시에서 게임을 가져오기 (DB 조회 최소화)
                    const { getCachedGame } = await import('./gameCache.js');
                    const latestGame = await getCachedGame(updatedGame.id);

                    if (latestGame) {
                        const latestMoveCount = latestGame.moveHistory?.length ?? 0;
                        const latestRevision = latestGame.serverRevision ?? 0;
                        const latestSyncedAt = latestGame.lastSyncedAt ?? 0;

                        let newerReason: string | null = null;
                        if (latestRevision > localRevision) {
                            newerReason = `revision ${latestRevision} > local ${localRevision}`;
                        } else if (latestRevision === localRevision && latestSyncedAt > localSyncedAt) {
                            newerReason = `sync ${latestSyncedAt} > ${localSyncedAt}`;
                        } else if (latestRevision === localRevision && latestSyncedAt === localSyncedAt && latestMoveCount > currentMoveCount) {
                            newerReason = `move history ${latestMoveCount} > ${currentMoveCount}`;
                        }

                        if (newerReason) {
                            console.warn(`[Game Loop] Detected newer game state for ${updatedGame.id} (${newerReason}). Refreshing local copy instead of saving.`);
                            syncAiSession(latestGame, aiPlayer.aiUserId);
                            gamesToBroadcast[updatedGame.id] = latestGame;
                            updatedGames[i] = latestGame;
                            continue;
                        }
                    }

                    // 멀티플레이 게임만 저장
                    const { updateGameCache } = await import('./gameCache.js');
                    updateGameCache(updatedGame);
                    // DB 저장은 비동기로 처리하여 응답 지연 최소화
                    db.saveGame(updatedGame).catch(err => {
                        console.error(`[Game Loop] Failed to save game ${updatedGame.id}:`, err);
                    });
                    syncAiSession(updatedGame, aiPlayer.aiUserId);
                    gamesToBroadcast[updatedGame.id] = updatedGame;
                }
            }
            
            // 실시간 게임 상태 업데이트 브로드캐스트
            if (Object.keys(gamesToBroadcast).length > 0) {
                broadcast({ type: 'GAME_UPDATE', payload: gamesToBroadcast });
            }

            // Process any system messages generated by time-based events
            const systemMessageGamesToBroadcast: Record<string, types.LiveGameSession> = {};
            for (const game of updatedGames) {
                if (game.pendingSystemMessages && game.pendingSystemMessages.length > 0) {
                    if (!volatileState.gameChats[game.id]) {
                        volatileState.gameChats[game.id] = [];
                    }
                    volatileState.gameChats[game.id].push(...game.pendingSystemMessages);
                    game.pendingSystemMessages = [];
                    await db.saveGame(game);
                    systemMessageGamesToBroadcast[game.id] = game;
                }
            }
            
            // 시스템 메시지로 인한 게임 상태 변경 브로드캐스트
            if (Object.keys(systemMessageGamesToBroadcast).length > 0) {
                broadcast({ type: 'GAME_UPDATE', payload: systemMessageGamesToBroadcast });
            }

            // Handle post-game summary processing for all games that finished
            const summaryGamesToBroadcast: Record<string, types.LiveGameSession> = {};
            for (const game of updatedGames) {
                // 타워 게임 종료 처리
                if (game.gameCategory === 'tower' && (game.gameStatus === 'ended' || game.gameStatus === 'no_contest') && !game.statsUpdated) {
                    // 타워 게임은 클라이언트에서 실행되지만, 서버에서 종료 처리 필요
                    const { endGame } = await import('./summaryService.js');
                    if (game.winner !== undefined && game.winner !== null) {
                        await endGame(game, game.winner as Player, game.winReason || 'score');
                    }
                    summaryGamesToBroadcast[game.id] = game;
                }
                // 일반 게임 종료 처리
                const isPlayful = PLAYFUL_GAME_MODES.some(m => m.mode === game.mode);
                const isStrategic = SPECIAL_GAME_MODES.some(m => m.mode === game.mode);
                if (!game.isSinglePlayer && (isPlayful || isStrategic) && (game.gameStatus === 'ended' || game.gameStatus === 'no_contest') && !game.statsUpdated) {
                    await processGameSummary(game);
                    game.statsUpdated = true;
                    await db.saveGame(game);
                    summaryGamesToBroadcast[game.id] = game;
                }
            }
            
            // 게임 종료 요약 처리 후 브로드캐스트
            if (Object.keys(summaryGamesToBroadcast).length > 0) {
                broadcast({ type: 'GAME_UPDATE', payload: summaryGamesToBroadcast });
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
                        clearAiSession(game.id);
                        await db.deleteGame(game.id);
                    }
                }
            }

            } catch (e) {
                console.error('[FATAL] Unhandled error in main loop:', e);
            } finally {
                isProcessingMainLoop = false;
                scheduleMainLoop(1000);
            }
        }, delay);
    };

    // --- Main Game Loop ---
    scheduleMainLoop(1000);
    
    // --- API Endpoints ---
    app.post('/api/auth/register', async (req, res) => {
        try {
            const { username, nickname, password } = req.body;
            if (!username || !nickname || !password) return res.status(400).json({ message: '모든 필드를 입력해야 합니다.' });
            if (username.trim().length < 2 || password.trim().length < 4) return res.status(400).json({ message: '아이디는 2자 이상, 비밀번호는 4자 이상이어야 합니다.' });
            if (nickname.trim().length < NICKNAME_MIN_LENGTH || nickname.trim().length > NICKNAME_MAX_LENGTH) return res.status(400).json({ message: `닉네임은 ${NICKNAME_MIN_LENGTH}자 이상 ${NICKNAME_MAX_LENGTH}자 이하여야 합니다.` });
            if (containsProfanity(username) || containsProfanity(nickname)) return res.status(400).json({ message: '아이디 또는 닉네임에 부적절한 단어가 포함되어 있습니다.' });
    
            const existingByUsername = await db.getUserCredentials(username);
            if (existingByUsername) return res.status(409).json({ message: '이미 사용 중인 아이디입니다.' });
    
            const allUsers = await db.getAllUsers();
            if (allUsers.some(u => u.nickname.toLowerCase() === nickname.toLowerCase())) {
                return res.status(409).json({ message: '이미 사용 중인 닉네임입니다.' });
            }
    
            let newUser = createDefaultUser(`user-${randomUUID()}`, username, nickname, false);

            newUser = await resetAndGenerateQuests(newUser);
    
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
        let responseSent = false;
        const sendResponse = (status: number, data: any) => {
            if (!responseSent) {
                try {
                    responseSent = true;
                    res.status(status).json(data);
                } catch (err) {
                    console.error('[/api/auth/login] Failed to send response:', err);
                    if (!res.headersSent) {
                        try {
                            res.status(status).end(JSON.stringify(data));
                        } catch (e2) {
                            console.error('[/api/auth/login] Failed to send fallback response:', e2);
                        }
                    }
                }
            }
        };
        
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                sendResponse(400, { message: '아이디와 비밀번호를 모두 입력해주세요.' });
                return;
            }
            
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
                sendResponse(401, { message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
                return;
            }
            console.log('[/api/auth/login] Authentication successful for username:', username, '. Getting user details.');
            let user = await db.getUser(credentials.userId);
            if (!user) {
                console.log('[/api/auth/login] User not found for userId:', credentials.userId);
                sendResponse(404, { message: '사용자를 찾을 수 없습니다.' });
                return;
            }
            console.log('[/api/auth/login] User details retrieved for userId:', credentials.userId);

            if (!user) {
                console.error('[/api/auth/login] User not found after creation');
                res.status(500).json({ error: 'User creation failed' });
                return;
            }

            const defaultBaseStats = createDefaultBaseStats();
            if (!user.baseStats) {
                user.baseStats = defaultBaseStats;
                await db.updateUser(user);
            } else {
                // Check if baseStats needs to be reset
                const coreStats = Object.values(types.CoreStat || {});
                if (coreStats.length > 0 && user && (
                    Object.keys(user.baseStats).length !== Object.keys(defaultBaseStats).length ||
                    !coreStats.every(stat => user && (user.baseStats as Record<types.CoreStat, number>)[stat] === 100)
                )) {
                    user.baseStats = defaultBaseStats;
                    await db.updateUser(user);
                }
            }
            
            const userBeforeUpdate = JSON.stringify(user);

            if (!user.ownedBorders?.includes('simple_black')) {
                if (!user.ownedBorders) user.ownedBorders = ['default'];
                user.ownedBorders.push('simple_black');
            }

            const hadInventoryBefore = Array.isArray(user.inventory) && user.inventory.length > 0;
            const hadEquipmentBefore = user.equipment && Object.keys(user.equipment).length > 0;

            let updatedUser = await resetAndGenerateQuests(user);
            updatedUser = await processWeeklyLeagueUpdates(updatedUser);
            updatedUser = await regenerateActionPoints(updatedUser);

            const hasInventoryNow = Array.isArray(updatedUser.inventory) && updatedUser.inventory.length > 0;
            const hasEquipmentNow = updatedUser.equipment && Object.keys(updatedUser.equipment).length > 0;

            if (hadInventoryBefore && !hasInventoryNow) {
                console.error(`[/api/auth/login] CRITICAL: Inventory vanished during login pipeline for user ${user.id}. Restoring previous inventory snapshot.`);
                updatedUser.inventory = JSON.parse(JSON.stringify(user.inventory));
            }
            if (hadEquipmentBefore && !hasEquipmentNow) {
                console.error(`[/api/auth/login] CRITICAL: Equipment vanished during login pipeline for user ${user.id}. Restoring previous equipment snapshot.`);
                updatedUser.equipment = JSON.parse(JSON.stringify(user.equipment));
            }

            const userLevelSum = updatedUser.strategyLevel + updatedUser.playfulLevel;
            let itemsUnequipped = false;
            const validEquipped: types.Equipment = {};
            
            // equipment와 inventory가 모두 존재하는지 확인
            // 관리자 계정의 경우 장비 데이터 손실을 방지하기 위해 특별 처리
            if (updatedUser.equipment && typeof updatedUser.equipment === 'object' && Object.keys(updatedUser.equipment).length > 0) {
                if (!updatedUser.inventory || !Array.isArray(updatedUser.inventory) || updatedUser.inventory.length === 0) {
                    // 관리자 계정은 절대 장비를 삭제하지 않음 (데이터 손실 방지)
                    if (updatedUser.isAdmin) {
                        console.error(`[/api/auth/login] CRITICAL: Admin user ${updatedUser.id} has equipment but empty inventory! Preserving equipment. DO NOT DELETE.`);
                        console.error(`[/api/auth/login] Admin equipment:`, JSON.stringify(updatedUser.equipment));
                        // 관리자 계정의 경우 장비를 절대 삭제하지 않음
                        // equipment는 그대로 유지하고 경고만 출력
                        // itemsUnequipped는 false로 유지하여 equipment가 유지되도록 함
                    } else {
                        console.warn(`[/api/auth/login] User ${updatedUser.id} has equipment but empty inventory! This may indicate data loss. Preserving equipment for recovery.`);
                        // 일반 사용자도 장비를 보존 (데이터 손실 방지)
                        // equipment는 유지하고 나중에 복원 가능하도록 함
                        // itemsUnequipped는 false로 유지
                    }
                    // 장비를 삭제하지 않고 유지 (데이터 손실 방지)
                    // itemsUnequipped는 true로 설정하지 않음
                } else {
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
                        } else {
                            // inventory에 아이템이 없지만, equipment는 유지 (데이터 손실 방지)
                            // 로그인 시에는 제거하지 않고 유지하여 나중에 복원 가능하도록 함
                            console.warn(`[/api/auth/login] User ${updatedUser.id} has equipment ${itemId} in slot ${slot} but item not found in inventory. Keeping equipment for data preservation.`);
                            validEquipped[slot as types.EquipmentSlot] = itemId;
                            // 데이터 손실을 방지하기 위해 equipment는 유지
                        }
                    }
                    if (itemsUnequipped && Object.keys(validEquipped).length < Object.keys(updatedUser.equipment).length) {
                        updatedUser.equipment = validEquipped;
                    }
                }
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

            // equipment와 inventory의 isEquipped 플래그 동기화 (전투력 계산을 위해 필수)
            if (updatedUser.equipment && typeof updatedUser.equipment === 'object' && Object.keys(updatedUser.equipment).length > 0) {
                if (updatedUser.inventory && Array.isArray(updatedUser.inventory)) {
                    // 먼저 모든 장비 아이템의 isEquipped를 false로 설정
                    updatedUser.inventory.forEach(item => {
                        if (item.type === 'equipment') {
                            item.isEquipped = false;
                        }
                    });
                    
                    // equipment에 있는 아이템 ID들을 inventory에서 찾아서 isEquipped = true로 설정
                    for (const [slot, itemId] of Object.entries(updatedUser.equipment)) {
                        const item = updatedUser.inventory.find(i => i.id === itemId);
                        if (item && item.type === 'equipment') {
                            item.isEquipped = true;
                        }
                    }
                }
            }

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
            
            const sanitizedUser = JSON.parse(JSON.stringify(user));
            sendResponse(200, { user: sanitizedUser });
        } catch (e: any) {
            console.error('[/api/auth/login] Login error:', e);
            console.error('[/api/auth/login] Error stack:', e?.stack);
            console.error('[/api/auth/login] Error message:', e?.message);
            if (!responseSent) {
                sendResponse(500, { message: '서버 로그인 처리 중 오류가 발생했습니다.', error: process.env.NODE_ENV === 'development' ? e?.message : undefined });
            }
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

            // equipment와 inventory의 isEquipped 플래그 동기화 (전투력 계산을 위해 필수)
            if (updatedUser.equipment && typeof updatedUser.equipment === 'object' && Object.keys(updatedUser.equipment).length > 0) {
                if (updatedUser.inventory && Array.isArray(updatedUser.inventory)) {
                    // 먼저 모든 장비 아이템의 isEquipped를 false로 설정
                    updatedUser.inventory.forEach(item => {
                        if (item.type === 'equipment') {
                            item.isEquipped = false;
                        }
                    });
                    
                    // equipment에 있는 아이템 ID들을 inventory에서 찾아서 isEquipped = true로 설정
                    for (const [slot, itemId] of Object.entries(updatedUser.equipment)) {
                        const item = updatedUser.inventory.find(i => i.id === itemId);
                        if (item && item.type === 'equipment') {
                            item.isEquipped = true;
                        }
                    }
                }
            }

            if (userBeforeUpdate !== JSON.stringify(updatedUser) || statsMigrated || inventorySlotsUpdated || presetsMigrated) {
                console.log(`[API/State] User ${user.nickname}: Updating user in DB.`);
                await db.updateUser(updatedUser);
                user = updatedUser; // updatedUser를 반환하기 위해 user에 할당
            }
            
            console.log('[/api/state] Getting all DB data');
            console.log(`[API/State] User ${user.nickname}: Getting all DB data.`);
            const dbState = await db.getAllData();
            console.log('[/api/state] All DB data retrieved');
    
            // Add ended games that users are still in to the appropriate category
            console.log(`[API/State] User ${user.nickname}: Processing ended games.`);
            for (const status of Object.values(volatileState.userStatuses)) {
                let gameId: string | undefined;
                if ('gameId' in status && status.gameId) {
                    gameId = status.gameId;
                } else if ('spectatingGameId' in status && status.spectatingGameId) {
                    gameId = status.spectatingGameId;
                }
                if (gameId) {
                    // 모든 카테고리에서 확인
                    const isInLiveGames = dbState.liveGames[gameId];
                    const isInSinglePlayerGames = dbState.singlePlayerGames[gameId];
                    const isInTowerGames = dbState.towerGames[gameId];
                    
                    if (!isInLiveGames && !isInSinglePlayerGames && !isInTowerGames) {
                        // 캐시에서 게임을 가져오기 (DB 조회 최소화)
                        const { getCachedGame } = await import('./gameCache.js');
                        const endedGame = await getCachedGame(gameId);
                        if (endedGame) {
                            // 게임 카테고리에 따라 올바른 객체에 추가
                            const category = endedGame.gameCategory || (endedGame.isSinglePlayer ? 'singleplayer' : 'normal');
                            if (category === 'singleplayer') {
                                dbState.singlePlayerGames[endedGame.id] = endedGame;
                            } else if (category === 'tower') {
                                dbState.towerGames[endedGame.id] = endedGame;
                            } else {
                                dbState.liveGames[endedGame.id] = endedGame;
                            }
                        }
                    }
                }
            }
            
            // 현재 사용자의 전체 데이터를 포함 (다른 사용자는 최적화된 공개 정보만)
            if (dbState.users[userId]) {
                dbState.users[userId] = updatedUser; // 전체 사용자 데이터
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
            
            // 디버깅 로그 제거 (과도한 로깅 방지)
            
            res.status(200).json({ success: true, ...result.clientResponse });
        } catch (e: any) {
            console.error(`[API] Action error for ${req.body?.type}:`, e);
            console.error(`[API] Error stack:`, e.stack);
            console.error(`[API] Error details:`, {
                message: e.message,
                name: e.name,
                code: e.code,
                userId: req.body?.userId,
                payload: req.body?.payload
            });
            res.status(500).json({ 
                message: '요청 처리 중 오류가 발생했습니다.',
                error: process.env.NODE_ENV === 'development' ? e.message : undefined
            });
        }
    });


};

startServer();