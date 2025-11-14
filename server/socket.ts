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
            // 정상적인 연결 종료는 로깅하지 않음 (코드 1001: Going Away)
            // 비정상적인 종료만 로깅하려면: if (code !== 1001) console.log('[WebSocket] Client disconnected:', { code, reason: reason.toString() });
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
                
                const allData = await getAllData();
                
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
                
                // 연결이 여전히 열려있는지 확인 후 전송
                if (!checkConnection()) {
                    return;
                }
                
                const payload = { 
                    ...allData, 
                    onlineUsers,
                    negotiations: volatileState.negotiations,
                    waitingRoomChats: volatileState.waitingRoomChats,
                    gameChats: volatileState.gameChats,
                    userConnections: volatileState.userConnections,
                    userStatuses: volatileState.userStatuses,
                    userLastChatMessage: volatileState.userLastChatMessage
                };
                
                try {
                    ws.send(JSON.stringify({ type: 'INITIAL_STATE', payload }));
                } catch (sendError) {
                    console.error('[WebSocket] Error sending message:', sendError);
                    isClosed = true;
                }
            } catch (error) {
                console.error('[WebSocket] Error sending initial state:', error);
                if (!isClosed && ws.readyState === WebSocket.OPEN) {
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