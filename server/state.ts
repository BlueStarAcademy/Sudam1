import { VolatileState } from '../types.js';

export const volatileState: VolatileState = {
    userConnections: {},
    userStatuses: {},
    negotiations: {},
    waitingRoomChats: { global: [], strategic: [], playful: [] },
    gameChats: {},
    userLastChatMessage: {},
    userConsecutiveChatMessages: {},
    activeTournaments: {},
    activeTournamentViewers: new Set(),
};