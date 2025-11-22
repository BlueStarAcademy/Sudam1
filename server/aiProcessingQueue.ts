/**
 * AI 처리 큐 시스템
 * 여러 싱글플레이 게임이 동시에 AI를 처리할 때 CPU 과부하를 방지하기 위해
 * 동시에 처리할 수 있는 AI 게임 수를 제한합니다.
 */

import { LiveGameSession, Player } from '../types/index.js';
import { makeAiMove, aiUserId } from './aiPlayer.js';
import { getCachedGame } from './gameCache.js';
import * as db from './db.js';
import { broadcast } from './socket.js';
import { cpus } from 'os';

interface QueuedAiTask {
    gameId: string;
    priority: number; // 높을수록 우선순위가 높음 (최근 게임일수록 높음)
    queuedAt: number;
}

interface QueueStats {
    totalProcessed: number;
    totalQueued: number;
    averageWaitTime: number;
    maxWaitTime: number;
}

class AiProcessingQueue {
    private queue: QueuedAiTask[] = [];
    private processing: Set<string> = new Set(); // 현재 처리 중인 게임 ID
    private readonly maxConcurrent: number; // 동시에 처리할 수 있는 최대 게임 수
    private processingInterval: ReturnType<typeof setInterval> | null = null;
    private stats: QueueStats = {
        totalProcessed: 0,
        totalQueued: 0,
        averageWaitTime: 0,
        maxWaitTime: 0,
    };

    constructor(maxConcurrent?: number) {
        // CPU 코어 수를 기반으로 동시 처리 수 결정 (기본값: 코어 수 * 4, 최소 10, 최대 50)
        const cpuCount = cpus().length;
        this.maxConcurrent = maxConcurrent ?? Math.min(Math.max(cpuCount * 4, 10), 50);
        console.log(`[AI Queue] Initialized with maxConcurrent: ${this.maxConcurrent} (CPU cores: ${cpuCount})`);
        this.startProcessing();
    }

    /**
     * AI 처리를 큐에 추가
     * @param gameId 게임 ID
     * @param priority 우선순위 (기본값: 현재 시간, 최근일수록 높음)
     */
    enqueue(gameId: string, priority?: number): void {
        // 이미 큐에 있거나 처리 중이면 무시
        if (this.queue.some(task => task.gameId === gameId) || this.processing.has(gameId)) {
            return;
        }

        const task: QueuedAiTask = {
            gameId,
            priority: priority ?? Date.now(),
            queuedAt: Date.now(),
        };

        this.queue.push(task);
        // 우선순위 순으로 정렬 (높은 우선순위가 먼저)
        this.queue.sort((a, b) => b.priority - a.priority);
    }

    /**
     * 큐에서 제거 (게임이 종료되거나 더 이상 AI 처리가 필요 없을 때)
     */
    dequeue(gameId: string): void {
        this.queue = this.queue.filter(task => task.gameId !== gameId);
        this.processing.delete(gameId);
    }

    /**
     * 큐 처리 시작
     */
    private startProcessing(): void {
        // 10ms마다 큐를 확인하고 처리 가능한 작업을 시작 (더 빠른 응답)
        this.processingInterval = setInterval(() => {
            this.processQueue();
        }, 10);
    }

    /**
     * 큐 처리 중지
     */
    stopProcessing(): void {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
    }

    /**
     * 큐에서 처리 가능한 작업을 가져와서 실행
     */
    private async processQueue(): Promise<void> {
        // 동시 처리 제한 확인
        if (this.processing.size >= this.maxConcurrent) {
            return;
        }

        // 큐가 비어있으면 종료
        if (this.queue.length === 0) {
            return;
        }

        // 가능한 한 여러 작업을 동시에 시작 (배치 처리)
        const availableSlots = this.maxConcurrent - this.processing.size;
        const tasksToProcess = Math.min(availableSlots, this.queue.length);

        for (let i = 0; i < tasksToProcess; i++) {
            const task = this.queue.shift();
            if (!task) {
                break;
            }

            // 대기 시간 통계 업데이트
            const waitTime = Date.now() - task.queuedAt;
            this.stats.totalQueued++;
            this.stats.averageWaitTime = (this.stats.averageWaitTime * (this.stats.totalQueued - 1) + waitTime) / this.stats.totalQueued;
            this.stats.maxWaitTime = Math.max(this.stats.maxWaitTime, waitTime);

            // 처리 중으로 표시
            this.processing.add(task.gameId);

            // 비동기로 처리 (블로킹 방지)
            this.processAiMove(task.gameId).finally(() => {
                this.processing.delete(task.gameId);
                this.stats.totalProcessed++;
            });
        }
    }

    /**
     * 실제 AI 수 처리
     */
    private async processAiMove(gameId: string): Promise<void> {
        try {
            // 캐시에서 게임 가져오기
            const game = await getCachedGame(gameId);
            if (!game) {
                console.warn(`[AI Queue] Game ${gameId} not found in cache`);
                return;
            }

            // 게임이 종료되었거나 AI 차례가 아니면 무시
            // 히든 돌 공개 애니메이션 중이면 무시
            if ((game.gameStatus !== 'playing' && game.gameStatus !== 'hidden_reveal_animating') || game.currentPlayer === undefined) {
                return;
            }

            const aiPlayerId = game.currentPlayer === Player.Black ? game.blackPlayerId : game.whitePlayerId;
            if (aiPlayerId !== aiUserId) {
                return;
            }

            // 백(AI) 차례일 때 1초 생각하는 연출
            if (game.currentPlayer === Player.White) {
                // 1초 대기 (생각하는 연출)
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // AI 수 처리
            await makeAiMove(game);

            // DB 저장 (비동기, 응답 지연 최소화)
            db.saveGame(game).catch(err => {
                console.error(`[AI Queue] Failed to save game ${gameId}:`, err);
            });

            // 브로드캐스트 (게임 참가자에게만 전송)
            const { broadcastToGameParticipants } = await import('./socket.js');
            broadcastToGameParticipants(gameId, { type: 'GAME_UPDATE', payload: { [gameId]: game } }, game);
        } catch (error) {
            console.error(`[AI Queue] Error processing AI move for game ${gameId}:`, error);
        }
    }

    /**
     * 큐 상태 확인 (디버깅용)
     */
    getStatus(): { 
        queueLength: number; 
        processing: number; 
        processingGames: string[];
        maxConcurrent: number;
        stats: QueueStats;
    } {
        return {
            queueLength: this.queue.length,
            processing: this.processing.size,
            processingGames: Array.from(this.processing),
            maxConcurrent: this.maxConcurrent,
            stats: { ...this.stats },
        };
    }
}

// 싱글톤 인스턴스 생성 (CPU 코어 수 기반으로 동적 설정)
export const aiProcessingQueue = new AiProcessingQueue();

