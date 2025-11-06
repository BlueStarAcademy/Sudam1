import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { getAllData } from './db.js';
import { volatileState } from './state.js';

let wss: WebSocketServer;

export const createWebSocketServer = (server: Server) => {
    wss = new WebSocketServer({ 
        server,
        perMessageDeflate: false // 압축 비활성화로 연결 문제 해결 시도
    });

    wss.on('connection', async (ws: WebSocket, req) => {
        console.log('[WebSocket] Client connected from:', req.socket.remoteAddress);
        
        let isClosed = false;
        
        ws.on('error', (error: Error) => {
            // ECONNABORTED는 일반적으로 클라이언트가 연결을 끊을 때 발생하는 정상적인 에러
            if (error.message && error.message.includes('ECONNABORTED')) {
                // 조용히 처리 (로깅 생략)
                isClosed = true;
                return;
            }
            console.error('[WebSocket] Connection error:', error);
            isClosed = true;
        });

        ws.on('close', (code, reason) => {
            console.log('[WebSocket] Client disconnected:', { code, reason: reason.toString() });
            isClosed = true;
        });

        // 연결 직후 빈 핑 메시지를 보내서 연결이 활성화되었는지 확인
        try {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'CONNECTION_ESTABLISHED' }));
            }
        } catch (error) {
            console.error('[WebSocket] Error sending connection established:', error);
        }

        // 초기 상태를 비동기로 전송 (연결이 끊어지지 않도록)
        (async () => {
            try {
                // 연결 상태를 더 자주 체크하기 위한 헬퍼 함수
                const checkConnection = () => {
                    return !isClosed && ws.readyState === WebSocket.OPEN;
                };
                
                if (!checkConnection()) {
                    // 연결이 이미 끊어진 경우 조용히 반환
                    return;
                }
                
                console.log('[WebSocket] Fetching initial data...');
                const startTime = Date.now();
                const allData = await getAllData();
                const fetchTime = Date.now() - startTime;
                console.log(`[WebSocket] Initial data fetched in ${fetchTime}ms`);
                
                // 데이터 로드 후 연결 상태 재확인
                if (!checkConnection()) {
                    // 연결이 끊어진 것은 정상적인 재연결 흐름의 일부이므로 조용히 처리
                    return;
                }
                
                const onlineUsers = Object.keys(volatileState.userStatuses).map(userId => {
                    const user = allData.users[userId];
                    const status = volatileState.userStatuses[userId];
                    return user ? { ...user, ...status } : undefined;
                }).filter(Boolean);
                
                // 전송 전 최종 연결 상태 확인
                if (!checkConnection()) {
                    // 연결이 끊어진 경우 조용히 반환
                    return;
                }
                
                console.log('[WebSocket] Sending initial state...');
                
                // 연결이 여전히 열려있는지 확인 후 전송
                if (!checkConnection()) {
                    console.log('[WebSocket] Connection closed just before sending');
                    return;
                }
                
                // 데이터를 청크로 나누어 전송 (큰 메시지 문제 해결)
                const MAX_CHUNK_SIZE = 256 * 1024; // 256KB 청크로 더 작게 설정
                const payload = { ...allData, onlineUsers };
                
                // 전체 메시지 크기 추정
                const testMessage = JSON.stringify({ type: 'INITIAL_STATE', payload });
                const messageSize = Buffer.byteLength(testMessage, 'utf8');
                console.log(`[WebSocket] Message size: ${(messageSize / 1024).toFixed(2)}KB`);
                
                if (messageSize > MAX_CHUNK_SIZE) {
                    console.log(`[WebSocket] Large message detected (${(messageSize / 1024).toFixed(2)}KB), splitting data into chunks...`);
                    
                    // users를 제외한 다른 데이터 (첫 번째 청크에만 포함)
                    const otherData = {
                        onlineUsers: payload.onlineUsers,
                        liveGames: payload.liveGames,
                        negotiations: payload.negotiations,
                        waitingRoomChats: payload.waitingRoomChats,
                        gameChats: payload.gameChats,
                        adminLogs: payload.adminLogs,
                        announcements: payload.announcements,
                        globalOverrideAnnouncement: payload.globalOverrideAnnouncement,
                        gameModeAvailability: payload.gameModeAvailability,
                        announcementInterval: payload.announcementInterval,
                        userConnections: payload.userConnections,
                        userStatuses: payload.userStatuses,
                        userLastChatMessage: payload.userLastChatMessage
                    };
                    
                    // 데이터를 청크로 나누기
                    const usersArray = Object.values(payload.users);
                    const usersChunks: any[][] = [];
                    let currentChunk: any[] = [];
                    let currentChunkSize = 0;
                    
                    for (const user of usersArray) {
                        const userJson = JSON.stringify(user);
                        const userSize = Buffer.byteLength(userJson, 'utf8');
                        
                        if (currentChunkSize + userSize > MAX_CHUNK_SIZE && currentChunk.length > 0) {
                            usersChunks.push(currentChunk);
                            currentChunk = [];
                            currentChunkSize = 0;
                        }
                        
                        currentChunk.push(user);
                        currentChunkSize += userSize;
                    }
                    if (currentChunk.length > 0) {
                        usersChunks.push(currentChunk);
                    }
                    
                    const totalChunks = usersChunks.length;
                    console.log(`[WebSocket] Split users into ${totalChunks} chunks`);
                    
                    try {
                        // 각 청크를 순차적으로 전송
                        for (let i = 0; i < usersChunks.length; i++) {
                            if (!checkConnection()) {
                                console.log(`[WebSocket] Connection closed while sending chunk ${i + 1}/${usersChunks.length}`);
                                return;
                            }
                            
                            // 각 청크에 해당하는 사용자 데이터만 포함
                            const chunkUsers: Record<string, any> = {};
                            usersChunks[i].forEach((user: any) => {
                                chunkUsers[user.id] = user;
                            });
                            
                            // 첫 번째 청크에만 다른 데이터 포함, 나머지는 users만
                            const chunkPayload = i === 0 
                                ? {
                                    ...otherData,
                                    users: chunkUsers,
                                    chunkIndex: i,
                                    totalChunks: totalChunks,
                                    isLast: i === usersChunks.length - 1
                                }
                                : {
                                    users: chunkUsers,
                                    chunkIndex: i,
                                    totalChunks: totalChunks,
                                    isLast: i === usersChunks.length - 1
                                };
                            
                            // 첫 번째 청크 이후에는 전송 전 딜레이 추가 (더 길게)
                            if (i > 0) {
                                await new Promise(resolve => setTimeout(resolve, 200));
                            }
                            
                            // 메시지 전송 전 연결 상태 재확인
                            if (!checkConnection()) {
                                console.log(`[WebSocket] Connection closed before sending chunk ${i + 1}/${usersChunks.length}`);
                                return;
                            }
                            
                            try {
                                // 메시지 전송
                                ws.send(JSON.stringify({
                                    type: i === 0 ? 'INITIAL_STATE_START' : 'INITIAL_STATE_CHUNK',
                                    payload: chunkPayload
                                }));
                                
                                // 전송 후 버퍼 정리를 위한 딜레이 (더 길게)
                                await new Promise(resolve => setTimeout(resolve, 100));
                            } catch (sendError: any) {
                                console.error(`[WebSocket] Error sending chunk ${i + 1}:`, sendError.message);
                                if (!checkConnection()) {
                                    return;
                                }
                                // 재시도는 하지 않고 다음 청크로 진행
                            }
                        }
                        
                        console.log(`[WebSocket] Initial state sent successfully in ${totalChunks} chunks`);
                    } catch (sendError) {
                        console.error('[WebSocket] Error sending chunked message:', sendError);
                        isClosed = true;
                    }
                } else {
                    // 작은 메시지는 그대로 전송
                    try {
                        ws.send(JSON.stringify({ type: 'INITIAL_STATE', payload }));
                        console.log('[WebSocket] Initial state sent successfully');
                    } catch (sendError) {
                        console.error('[WebSocket] Error sending message:', sendError);
                        isClosed = true;
                    }
                }
            } catch (error) {
                console.error('[WebSocket] Error sending initial state:', error);
                if (checkConnection && !isClosed && ws.readyState === WebSocket.OPEN) {
                    try {
                        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Failed to load initial state' } }));
                    } catch (sendError) {
                        console.error('[WebSocket] Error sending error message:', sendError);
                        isClosed = true;
                    }
                }
            }
        })();
    });

    wss.on('error', (error) => {
        console.error('[WebSocket] Server error:', error);
    });

    console.log('[WebSocket] Server created');
};

export const broadcast = (message: any) => {
    if (!wss) return;
    const messageString = JSON.stringify(message);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageString);
        }
    });
};

// 특정 사용자에게만 메시지를 보내는 함수
export const sendToUser = (userId: string, message: any) => {
    if (!wss) return;
    // WebSocket 연결에 userId를 저장하는 방법이 필요합니다
    // 현재는 broadcast를 사용하되, 클라이언트에서 필터링하도록 구현
    // 또는 server.ts에서 userId와 ws 매핑을 관리해야 합니다
    broadcast({ ...message, targetUserId: userId });
};