import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { getAllData } from './db.js';
import { volatileState } from './state.js';

let wss: WebSocketServer;

export const createWebSocketServer = (server: Server) => {
    wss = new WebSocketServer({ server });

    wss.on('connection', async (ws: WebSocket) => {
        console.log('[WebSocket] Client connected');

        const allData = await getAllData();
        const onlineUsers = Object.keys(volatileState.userStatuses).map(userId => {
            const user = allData.users[userId];
            const status = volatileState.userStatuses[userId];
            return user ? { ...user, ...status } : undefined;
        }).filter(Boolean);
        
        ws.send(JSON.stringify({ type: 'INITIAL_STATE', payload: { ...allData, onlineUsers } }));

        ws.on('close', () => console.log('[WebSocket] Client disconnected'));
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