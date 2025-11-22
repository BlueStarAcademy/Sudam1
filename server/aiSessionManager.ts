import { Player, type LiveGameSession } from '../types/index.js';

interface AiSession {
    gameId: string;
    /**
     * 현재 AI가 수를 계산 중인지 여부
     * true면 다른 계산을 시작하지 않도록 차단
     */
    isProcessing: boolean;
    /**
     * 마지막으로 AI가 처리한 수의 개수 (moveHistory 길이)
     * 동일한 값 이하일 경우 이미 처리된 턴으로 간주하여 중복 계산을 방지
     */
    lastProcessedMoveCount: number;
    /**
     * 최근 업데이트 타임스탬프 (ms)
     * 오래된 세션을 정리할 때 사용
     */
    lastUpdatedAt: number;
}

const AI_SESSION_TTL_MS = 10 * 60 * 1000; // 10분
const aiSessions = new Map<string, AiSession>();

function cleanupExpiredSessions(now = Date.now()): void {
    for (const [gameId, session] of aiSessions.entries()) {
        if (now - session.lastUpdatedAt > AI_SESSION_TTL_MS) {
            aiSessions.delete(gameId);
        }
    }
}

function ensureSession(gameId: string): AiSession {
    cleanupExpiredSessions();

    let session = aiSessions.get(gameId);
    if (!session) {
        session = {
            gameId,
            isProcessing: false,
            lastProcessedMoveCount: -1,
            lastUpdatedAt: Date.now(),
        };
        aiSessions.set(gameId, session);
    } else {
        session.lastUpdatedAt = Date.now();
    }

    return session;
}

/**
 * 현재 턴을 처리해야 하는지 여부를 반환
 * - 마지막으로 처리한 moveHistory 길이보다 현재 길이가 큰 경우에만 true
 */
export function shouldProcessAiTurn(gameId: string, currentMoveCount: number): boolean {
    const session = ensureSession(gameId);

    // 현재 상태가 마지막으로 처리된 턴 이하라면 이미 처리된 것으로 간주
    if (currentMoveCount <= session.lastProcessedMoveCount) {
        return false;
    }

    return true;
}

/**
 * 세션을 "처리 중" 상태로 전환
 * 이미 다른 계산이 진행 중이면 false를 반환
 */
export function startAiProcessing(gameId: string): boolean {
    const session = ensureSession(gameId);

    if (session.isProcessing) {
        return false;
    }

    session.isProcessing = true;
    session.lastUpdatedAt = Date.now();
    return true;
}

/**
 * AI 계산이 정상적으로 끝났음을 표시하며 moveHistory 길이를 기록
 */
export function finishAiProcessing(gameId: string, newMoveCount: number): void {
    const session = ensureSession(gameId);
    session.isProcessing = false;
    session.lastProcessedMoveCount = newMoveCount;
    session.lastUpdatedAt = Date.now();
}

/**
 * AI 계산이 실패했을 때 호출하여 잠금만 해제
 */
export function cancelAiProcessing(gameId: string): void {
    const session = ensureSession(gameId);
    session.isProcessing = false;
    session.lastUpdatedAt = Date.now();
}

/**
 * 게임이 종료되었을 때 세션 제거
 */
export function clearAiSession(gameId: string): void {
    aiSessions.delete(gameId);
}

/**
 * 외부에서 세션을 강제로 최신 moveHistory에 맞춰 동기화할 때 사용
 * (예: 최신 게임 상태가 DB에서 갱신된 경우)
 */
interface SyncOptions {
    /**
     * AI 차례이더라도 moveHistory 기반으로 lastProcessedMoveCount를 강제로 갱신해야 할 때 사용
     * (예: 외부에서 AI 수가 이미 반영된 최신 게임 상태를 가져온 경우)
     */
    allowAdvanceOnAiTurn?: boolean;
}

export function syncAiSession(game: LiveGameSession, aiPlayerId: string, options: SyncOptions = {}): void {
    const session = ensureSession(game.id);
    const moveCount = game.moveHistory?.length ?? 0;
    session.lastUpdatedAt = Date.now();

    const isAiGame = game.isAiGame || game.blackPlayerId === aiPlayerId || game.whitePlayerId === aiPlayerId;
    const aiShouldMove = isAiGame &&
        game.currentPlayer !== Player.None &&
        ((game.currentPlayer === Player.Black && game.blackPlayerId === aiPlayerId) ||
         (game.currentPlayer === Player.White && game.whitePlayerId === aiPlayerId));

    if (aiShouldMove && !options.allowAdvanceOnAiTurn) {
        // AI의 차례이면 현재 moveCount를 그대로 기록하지 않고 이전 턴까지만 처리한 것으로 유지
        const target = Math.max(-1, moveCount - 1);
        session.lastProcessedMoveCount = Math.min(session.lastProcessedMoveCount, target);
        return;
    }

    if (moveCount !== session.lastProcessedMoveCount) {
        session.lastProcessedMoveCount = moveCount;
    }
}

