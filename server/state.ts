import { VolatileState } from '../types/index.js';

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
    // 게임 상태 캐시 (DB 부하 감소)
    gameCache: new Map(),
    // 사용자 정보 캐시 (DB 조회 최소화)
    userCache: new Map(),
    // 랭킹전 매칭 큐
    rankedMatchingQueue: {
        strategic: {},
        playful: {}
    },
};