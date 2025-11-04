import { VolatileState } from '../types.js';

export const volatileState: VolatileState = {
    userConnections: {},
    userStatuses: {},
    negotiations: {},
    waitingRoomChats: { global: [] },
    gameChats: {},
    userLastChatMessage: {},
    userConsecutiveChatMessages: {},
    activeTournaments: {},
    activeTournamentViewers: new Set(),
};