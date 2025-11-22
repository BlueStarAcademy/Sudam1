import { LiveGameSession, User } from '../types/index.js';
import { volatileState } from './state.js';
import * as db from './db.js';

const CACHE_TTL_MS = 30 * 1000; // 30초 캐시 유지
const USER_CACHE_TTL_MS = 60 * 1000; // 사용자 캐시는 60초

/**
 * 게임 상태를 캐시에서 가져오거나 DB에서 로드
 */
export async function getCachedGame(gameId: string): Promise<LiveGameSession | null> {
    const cache = volatileState.gameCache;
    if (!cache) {
        return await db.getLiveGame(gameId);
    }

    const cached = cache.get(gameId);
    const now = Date.now();

    if (cached && (now - cached.lastUpdated) < CACHE_TTL_MS) {
        return cached.game;
    }

    // 캐시 미스 또는 만료된 경우 DB에서 로드
    const game = await db.getLiveGame(gameId);
    if (game) {
        cache.set(gameId, { game, lastUpdated: now });
    } else if (cached) {
        // 게임이 삭제된 경우 캐시에서도 제거
        cache.delete(gameId);
    }

    return game;
}

/**
 * 게임 상태를 캐시에 업데이트
 */
export function updateGameCache(game: LiveGameSession): void {
    const cache = volatileState.gameCache;
    if (cache) {
        cache.set(game.id, { game, lastUpdated: Date.now() });
    }
}

/**
 * 게임을 캐시에서 제거
 */
export function removeGameFromCache(gameId: string): void {
    const cache = volatileState.gameCache;
    if (cache) {
        cache.delete(gameId);
    }
}

/**
 * 사용자 정보를 캐시에서 가져오거나 DB에서 로드
 */
export async function getCachedUser(userId: string): Promise<User | null> {
    const cache = volatileState.userCache;
    if (!cache) {
        return await db.getUser(userId);
    }

    const cached = cache.get(userId);
    const now = Date.now();

    if (cached && (now - cached.lastUpdated) < USER_CACHE_TTL_MS) {
        return cached.user;
    }

    // 캐시 미스 또는 만료된 경우 DB에서 로드
    const user = await db.getUser(userId);
    if (user) {
        cache.set(userId, { user, lastUpdated: now });
    } else if (cached) {
        // 사용자가 삭제된 경우 캐시에서도 제거
        cache.delete(userId);
    }

    return user;
}

/**
 * 사용자 정보를 캐시에 업데이트
 */
export function updateUserCache(user: User): void {
    const cache = volatileState.userCache;
    if (cache) {
        cache.set(user.id, { user, lastUpdated: Date.now() });
    }
}

/**
 * 사용자를 캐시에서 제거
 */
export function removeUserFromCache(userId: string): void {
    const cache = volatileState.userCache;
    if (cache) {
        cache.delete(userId);
    }
}

/**
 * 만료된 캐시 항목 정리
 */
export function cleanupExpiredCache(): void {
    const now = Date.now();
    
    // 게임 캐시 정리
    const gameCache = volatileState.gameCache;
    if (gameCache) {
        for (const [gameId, cached] of gameCache.entries()) {
            if (now - cached.lastUpdated > CACHE_TTL_MS * 2) {
                gameCache.delete(gameId);
            }
        }
    }

    // 사용자 캐시 정리
    const userCache = volatileState.userCache;
    if (userCache) {
        for (const [userId, cached] of userCache.entries()) {
            if (now - cached.lastUpdated > USER_CACHE_TTL_MS * 2) {
                userCache.delete(userId);
            }
        }
    }
}

