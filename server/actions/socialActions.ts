import { randomUUID } from 'crypto';
import * as db from '../db.js';
import { type ServerAction, type User, type VolatileState, ChatMessage, UserStatus, type Negotiation, TournamentType, GameMode } from '../../types.js';
import * as types from '../../types.js';
import { updateQuestProgress } from './../questService.js';
import { containsProfanity } from '../../profanity.js';
import * as tournamentService from '../tournamentService.js';
import * as summaryService from '../summaryService.js';
import { broadcast } from '../socket.js';
import { SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES } from '../../constants.js';


type HandleActionResult = { 
    clientResponse?: any;
    error?: string;
};

const GREETINGS = ['안녕', '하이', '헬로', 'hi', 'hello', '반가', '잘 부탁', '잘부탁'];

export const handleSocialAction = async (volatileState: VolatileState, action: ServerAction & { userId: string }, user: User): Promise<HandleActionResult> => {
    const { type, payload } = action;
    const now = Date.now();

    switch (type) {
        case 'LOGOUT': {
            const activeTournament = volatileState.activeTournaments?.[user.id];
            if (activeTournament) {
                console.log(`[Logout] User ${user.nickname} has an active tournament. Forfeiting.`);
                tournamentService.forfeitTournament(activeTournament, user.id);
                
                let stateKey: keyof User;
                switch (activeTournament.type) {
                    case 'neighborhood': stateKey = 'lastNeighborhoodTournament'; break;
                    case 'national': stateKey = 'lastNationalTournament'; break;
                    case 'world': stateKey = 'lastWorldTournament'; break;
                    default:
                        console.error(`[Logout] Unknown tournament type found in active tournament: ${activeTournament.type}`);
                        // Don't save if type is unknown to prevent corruption
                        if (volatileState.activeTournaments) {
                            delete volatileState.activeTournaments[user.id];
                        }
                        delete volatileState.userConnections[user.id];
                        delete volatileState.userStatuses[user.id];
                        return { error: 'Unknown tournament type.' };
                }
                (user as any)[stateKey] = activeTournament;
                await db.updateUser(user);

                if (volatileState.activeTournaments) {
                    delete volatileState.activeTournaments[user.id];
                }
            }
            
            const userStatus = volatileState.userStatuses[user.id];
            const activeGameId = userStatus?.gameId;
            if (userStatus?.status === 'in-game' && activeGameId) {
                const game = await db.getLiveGame(activeGameId);
                if (game && game.gameStatus !== 'ended' && game.gameStatus !== 'no_contest') {
                    if (!game.disconnectionState) {
                        game.disconnectionCounts[user.id] = (game.disconnectionCounts[user.id] || 0) + 1;
                        if (game.disconnectionCounts[user.id] >= 3) {
                            const winner = game.blackPlayerId === user.id ? types.Player.White : types.Player.Black;
                            await summaryService.endGame(game, winner, 'disconnect');
                        } else {
                            game.disconnectionState = { disconnectedPlayerId: user.id, timerStartedAt: now };
                            if (game.moveHistory.length < 10) {
                                const otherPlayerId = game.player1.id === user.id ? game.player2.id : game.player1.id;
                                if (!game.canRequestNoContest) game.canRequestNoContest = {};
                                game.canRequestNoContest[otherPlayerId] = true;
                            }
                            await db.saveGame(game);
                        }
                    }
                }
            }
            
            delete volatileState.userConnections[user.id];
            delete volatileState.userStatuses[user.id];
            broadcast({ type: 'USER_STATUS_UPDATE', payload: volatileState.userStatuses });
            return {};
        }
        case 'SEND_CHAT_MESSAGE': {
            if (user.chatBanUntil && user.chatBanUntil > now) {
                const timeLeft = Math.ceil((user.chatBanUntil - now) / 1000 / 60);
                return { error: `채팅이 금지되었습니다. (${timeLeft}분 남음)` };
            }
            const lastMessageTime = volatileState.userLastChatMessage[user.id] || 0;
            if (now - lastMessageTime < 5000 && !user.isAdmin) { // Admin can bypass spam check
                return { error: '메시지를 너무 자주 보낼 수 없습니다.' };
            }
        
            const { channel, text, emoji, location } = payload;
            if (!channel || (!text && !emoji)) return { error: 'Invalid chat message.' };

            if (text && containsProfanity(text)) {
                return { error: '메시지에 부적절한 단어가 포함되어 있습니다.' };
            }

            const messageContent = text || emoji || '';
            if (messageContent) {
                if (!volatileState.userConsecutiveChatMessages) volatileState.userConsecutiveChatMessages = {};
                const consecutive = volatileState.userConsecutiveChatMessages[user.id];
                if (consecutive && consecutive.content === messageContent) {
                    consecutive.count++;
                } else {
                    volatileState.userConsecutiveChatMessages[user.id] = { content: messageContent, count: 1 };
                }

                if (volatileState.userConsecutiveChatMessages[user.id].count >= 3 && !user.isAdmin) {
                    const banDurationMinutes = 3;
                    user.chatBanUntil = now + banDurationMinutes * 60 * 1000;
                    await db.updateUser(user);
                    delete volatileState.userConsecutiveChatMessages[user.id];

                    const banMessage: ChatMessage = {
                        id: `msg-${randomUUID()}`,
                        user: { id: 'ai-security-guard', nickname: 'AI 보안관봇' },
                        text: `${user.nickname}님, 동일한 메시지를 반복적으로 전송하여 ${banDurationMinutes}분간 채팅이 금지되었습니다.`,
                        system: true,
                        timestamp: now,
                    };
                    if (!volatileState.waitingRoomChats[channel]) volatileState.waitingRoomChats[channel] = [];
                    volatileState.waitingRoomChats[channel].push(banMessage);
                    
                    // 금지 메시지도 브로드캐스트
                    broadcast({ 
                        type: 'WAITING_ROOM_CHAT_UPDATE', 
                        payload: { 
                            [channel]: volatileState.waitingRoomChats[channel] 
                        } 
                    });
                    
                    return { error: `동일한 메시지를 반복하여 ${banDurationMinutes}분간 채팅이 금지되었습니다.` };
                }
            }
        
            const message: ChatMessage = {
                id: `msg-${randomUUID()}`,
                user: { id: user.id, nickname: user.nickname },
                text, emoji, system: false, timestamp: now,
                location
            };
            
            if (!volatileState.waitingRoomChats[channel]) volatileState.waitingRoomChats[channel] = [];
            volatileState.waitingRoomChats[channel].push(message);
            if (volatileState.waitingRoomChats[channel].length > 100) {
                volatileState.waitingRoomChats[channel].shift();
            }
            volatileState.userLastChatMessage[user.id] = now;

            if (text && GREETINGS.some(g => text.toLowerCase().includes(g))) {
                updateQuestProgress(user, 'chat_greeting');
                await db.updateUser(user);
            }

            // 채팅 메시지를 모든 클라이언트에 브로드캐스트
            broadcast({ 
                type: 'WAITING_ROOM_CHAT_UPDATE', 
                payload: { 
                    [channel]: volatileState.waitingRoomChats[channel] 
                } 
            });

            return {};
        }
        case 'SET_USER_STATUS': {
            const { status } = payload as { status: UserStatus };
            if (status !== UserStatus.Waiting && status !== 'resting') {
                return { error: 'Invalid status for waiting room.' };
            }
            const currentUserStatus = volatileState.userStatuses[user.id];
            if (currentUserStatus && (currentUserStatus.status === UserStatus.Waiting || currentUserStatus.status === 'resting')) {
                currentUserStatus.status = status;
                broadcast({ type: 'USER_STATUS_UPDATE', payload: volatileState.userStatuses });
            } else {
                return { error: 'Cannot change status while in-game or negotiating.' };
            }
            return {};
        }
        case 'ENTER_WAITING_ROOM': {
            const { mode } = payload;
            // strategic/playful은 GameMode가 아니므로 mode를 undefined로 설정
            if (mode === 'strategic' || mode === 'playful') {
                volatileState.userStatuses[user.id] = { status: UserStatus.Waiting };
            } else {
                volatileState.userStatuses[user.id] = { status: UserStatus.Waiting, mode: mode as GameMode };
            }
            broadcast({ type: 'USER_STATUS_UPDATE', payload: volatileState.userStatuses });
            return {};
        }
        case 'LEAVE_WAITING_ROOM': {
            const userStatus = volatileState.userStatuses[user.id];
            if (userStatus && (userStatus.status === UserStatus.Waiting || userStatus.status === UserStatus.Resting)) {
                userStatus.status = UserStatus.Online;
                delete userStatus.mode; // 대기실 모드 정보 제거
            }
            broadcast({ type: 'USER_STATUS_UPDATE', payload: volatileState.userStatuses });
            return {};
        }
        case 'ENTER_TOURNAMENT_VIEW': {
            if (!volatileState.activeTournamentViewers) {
                volatileState.activeTournamentViewers = new Set();
            }
            volatileState.activeTournamentViewers.add(user.id);
            return {};
        }
        case 'LEAVE_TOURNAMENT_VIEW': {
            if (volatileState.activeTournamentViewers) {
                volatileState.activeTournamentViewers.delete(user.id);
            }
            return {};
        }
        case 'LEAVE_GAME_ROOM': {
            const { gameId } = payload;
            const game = await db.getLiveGame(gameId);
            if (!game) return { error: 'Game not found.' };

            if (volatileState.userStatuses[user.id]) {
                // 싱글플레이 게임이 아닌 경우, 게임 모드를 strategic/playful로 변환
                let lobbyMode: GameMode | 'strategic' | 'playful' | undefined = undefined;
                if (!game.isSinglePlayer) {
                    if (SPECIAL_GAME_MODES.some(m => m.mode === game.mode)) {
                        lobbyMode = 'strategic';
                    } else if (PLAYFUL_GAME_MODES.some(m => m.mode === game.mode)) {
                        lobbyMode = 'playful';
                    }
                }
                // 싱글플레이 게임이거나 모드를 찾을 수 없는 경우 Online 상태로 변경 (게임 모드 없음)
                if (game.isSinglePlayer || !lobbyMode) {
                    volatileState.userStatuses[user.id] = { status: UserStatus.Online };
                    delete volatileState.userStatuses[user.id].mode;
                    delete volatileState.userStatuses[user.id].gameId;
                } else {
                    // strategic/playful은 GameMode가 아니므로 mode를 undefined로 설정
                    if (lobbyMode === 'strategic' || lobbyMode === 'playful') {
                        volatileState.userStatuses[user.id] = { status: UserStatus.Waiting };
                    } else {
                        volatileState.userStatuses[user.id] = { status: UserStatus.Waiting, mode: lobbyMode as GameMode };
                    }
                }
            }
            broadcast({ type: 'USER_STATUS_UPDATE', payload: volatileState.userStatuses });

            const ongoingRematchNegotiation = Object.values(volatileState.negotiations).find(
                neg => neg.rematchOfGameId === gameId
            );

            if (ongoingRematchNegotiation) {
                const otherPlayerId = ongoingRematchNegotiation.challenger.id === user.id
                    ? ongoingRematchNegotiation.opponent.id
                    : ongoingRematchNegotiation.challenger.id;
                
                const otherPlayerStatus = volatileState.userStatuses[otherPlayerId];
                if (otherPlayerStatus?.status === 'negotiating') {
                    otherPlayerStatus.status = UserStatus.InGame;
                    otherPlayerStatus.gameId = gameId;
                }

                delete volatileState.negotiations[ongoingRematchNegotiation.id];

                if (game.gameStatus === 'rematch_pending') {
                    game.gameStatus = 'ended';
                    await db.saveGame(game);
                }
            }
            
            // 두 플레이어가 모두 나갔는지 확인
            const p1Status = volatileState.userStatuses[game.player1.id];
            const p2Status = volatileState.userStatuses[game.player2.id];
            const p1Left = !p1Status || p1Status.gameId !== gameId;
            const p2Left = !p2Status || p2Status.gameId !== gameId;
            const bothPlayersLeft = p1Left && p2Left;
            
            // 관전자가 있는지 확인
            const hasSpectators = Object.values(volatileState.userStatuses).some(
                status => status.spectatingGameId === gameId
            );
            
            // 두 플레이어가 모두 나갔고 관전자도 없으면 게임 삭제
            if (bothPlayersLeft && !hasSpectators) {
                // 리매치 협상이 진행 중인지 확인
                const isRematchBeingNegotiated = Object.values(volatileState.negotiations).some(
                    neg => neg.rematchOfGameId === gameId
                );
                
                if (!isRematchBeingNegotiated) {
                    console.log(`[GC] Deleting game ${gameId} - both players left and no spectators`);
                    await db.deleteGame(gameId);
                    // 게임 삭제를 클라이언트에 알리기 위해 GAME_DELETED 브로드캐스트
                    broadcast({ type: 'GAME_DELETED', payload: { gameId } });
                }
            }
            
            return {};
        }
        case 'LEAVE_AI_GAME': {
            const { gameId } = payload;
            const game = await db.getLiveGame(gameId);
            if (!game) return { error: 'Game not found.' };

            if (volatileState.userStatuses[user.id]) {
                // 싱글플레이 게임이 아닌 경우, 게임 모드를 strategic/playful로 변환
                let lobbyMode: GameMode | 'strategic' | 'playful' | undefined = undefined;
                if (!game.isSinglePlayer) {
                    if (SPECIAL_GAME_MODES.some(m => m.mode === game.mode)) {
                        lobbyMode = 'strategic';
                    } else if (PLAYFUL_GAME_MODES.some(m => m.mode === game.mode)) {
                        lobbyMode = 'playful';
                    }
                }
                // 싱글플레이 게임이거나 모드를 찾을 수 없는 경우 Online 상태로 변경 (게임 모드 없음)
                if (game.isSinglePlayer || !lobbyMode) {
                    volatileState.userStatuses[user.id] = { status: UserStatus.Online };
                    delete volatileState.userStatuses[user.id].mode;
                    delete volatileState.userStatuses[user.id].gameId;
                } else {
                    // strategic/playful은 GameMode가 아니므로 mode를 undefined로 설정
                    if (lobbyMode === 'strategic' || lobbyMode === 'playful') {
                        volatileState.userStatuses[user.id] = { status: UserStatus.Waiting };
                    } else {
                        volatileState.userStatuses[user.id] = { status: UserStatus.Waiting, mode: lobbyMode as GameMode };
                    }
                }
            }
            broadcast({ type: 'USER_STATUS_UPDATE', payload: volatileState.userStatuses });
            
            // If the user leaves before the game is officially over (e.g. resigns), end the game.
            if (!['ended', 'no_contest'].includes(game.gameStatus)) {
                 await summaryService.endGame(game, types.Player.White, 'disconnect'); // AI is always P2/White and wins on disconnect
            }
            
            return {};
        }
        case 'SPECTATE_GAME': {
            const { gameId } = payload;
            const game = await db.getLiveGame(gameId);
            if (!game) return { error: 'Game not found.' };
            volatileState.userStatuses[user.id] = { status: UserStatus.Spectating, spectatingGameId: gameId, mode: game.mode };
            broadcast({ type: 'USER_STATUS_UPDATE', payload: volatileState.userStatuses });
            return {};
        }
        case 'LEAVE_SPECTATING': {
            const userStatus = volatileState.userStatuses[user.id];
            if (userStatus && userStatus.status === UserStatus.Spectating) {
                userStatus.status = UserStatus.Online; 
                delete userStatus.spectatingGameId;
                delete userStatus.gameId; 
            }
            broadcast({ type: 'USER_STATUS_UPDATE', payload: volatileState.userStatuses });
            return {};
        }
        default:
            return { error: 'Unknown social action.' };
    }
};