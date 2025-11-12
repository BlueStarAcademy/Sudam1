/**
 * 바둑 AI 봇 시스템
 * 싱글플레이, 도전의탑, 전략바둑에서 사용하는 1단계~10단계 바둑 AI 봇
 * KataGo를 사용하지 않고 직접 구현한 바둑 AI
 */

import { LiveGameSession, Player, Point } from '../types.js';
import { getGoLogic, processMove } from './goLogic.js';
import * as types from '../types.js';
import * as summaryService from './summaryService.js';
import { getCaptureTarget, NO_CAPTURE_TARGET } from './utils/captureTargets.ts';

/**
 * AI 봇 단계별 특성 정의
 */
export interface GoAiBotProfile {
    /** AI 단계 (1~10) */
    level: number;
    /** AI 이름 */
    name: string;
    /** 설명 */
    description: string;
    /** 따내기 성향 (0.0 ~ 1.0, 높을수록 따내기에 집중) */
    captureTendency: number;
    /** 영토 확보 성향 (0.0 ~ 1.0, 높을수록 영토에 집중) */
    territoryTendency: number;
    /** 전투 성향 (0.0 ~ 1.0, 높을수록 전투 선호) */
    combatTendency: number;
    /** 정석/포석 활용도 (0.0 ~ 1.0, 높을수록 정석/포석 활용) */
    josekiUsage: number;
    /** 사활 판단 능력 (0.0 ~ 1.0, 높을수록 정확한 사활 판단) */
    lifeDeathSkill: number;
    /** 행마 능력 (0.0 ~ 1.0, 높을수록 우수한 행마) */
    movementSkill: number;
    /** 실수 확률 (0.0 ~ 1.0, 높을수록 실수 많음) */
    mistakeRate: number;
    /** 승리 목적 달성도 (0.0 ~ 1.0, 높을수록 승리에 집중) */
    winFocus: number;
    /** 계산 깊이 (1~5, 높을수록 깊이 계산) */
    calculationDepth: number;
}

/**
 * 1단계~10단계 AI 봇 프로필 정의
 */
export const GO_AI_BOT_PROFILES: Record<number, GoAiBotProfile> = {
    1: {
        level: 1,
        name: '초급 AI (18급)',
        description: '초급단계의 18급 수준. 따내기에 집중하며 승리를 목표로 하는 AI',
        captureTendency: 0.95, // 따내기 성향 매우 강함
        territoryTendency: 0.2, // 영토 확보는 약함
        combatTendency: 0.8, // 전투 선호
        josekiUsage: 0.1, // 정석/포석 거의 사용 안함
        lifeDeathSkill: 0.2, // 사활 판단 약함
        movementSkill: 0.2, // 행마 능력 약함
        mistakeRate: 0.4, // 실수 많음
        winFocus: 0.95, // 승리에 집중
        calculationDepth: 1, // 계산 깊이 매우 낮음
    },
    2: {
        level: 2,
        name: '초급 AI (15급)',
        description: '초급단계의 15급 수준. 따내기를 선호하지만 기본적인 영토 개념 이해',
        captureTendency: 0.85,
        territoryTendency: 0.3,
        combatTendency: 0.7,
        josekiUsage: 0.15,
        lifeDeathSkill: 0.3,
        movementSkill: 0.3,
        mistakeRate: 0.35,
        winFocus: 0.9,
        calculationDepth: 1,
    },
    3: {
        level: 3,
        name: '초급 AI (12급)',
        description: '초급단계의 12급 수준. 따내기와 영토의 균형을 시작',
        captureTendency: 0.72,
        territoryTendency: 0.4,
        combatTendency: 0.6,
        josekiUsage: 0.2,
        lifeDeathSkill: 0.4,
        movementSkill: 0.4,
        mistakeRate: 0.3,
        winFocus: 0.85,
        calculationDepth: 2,
    },
    4: {
        level: 4,
        name: '중급 AI (9급)',
        description: '중급단계의 9급 수준. 기본적인 정석과 포석 이해',
        captureTendency: 0.62,
        territoryTendency: 0.5,
        combatTendency: 0.5,
        josekiUsage: 0.3,
        lifeDeathSkill: 0.5,
        movementSkill: 0.5,
        mistakeRate: 0.25,
        winFocus: 0.8,
        calculationDepth: 2,
    },
    5: {
        level: 5,
        name: '중급 AI (6급)',
        description: '중급단계의 6급 수준. 정석과 포석을 활용하며 전투 능력 향상',
        captureTendency: 0.7,
        territoryTendency: 0.5,
        combatTendency: 0.65,
        josekiUsage: 0.4,
        lifeDeathSkill: 0.6,
        movementSkill: 0.6,
        mistakeRate: 0.18,
        winFocus: 0.78,
        calculationDepth: 3,
    },
    6: {
        level: 6,
        name: '중급 AI (3급)',
        description: '중급단계의 3급 수준. 영토와 전투의 균형잡힌 플레이',
        captureTendency: 0.72,
        territoryTendency: 0.58,
        combatTendency: 0.7,
        josekiUsage: 0.5,
        lifeDeathSkill: 0.7,
        movementSkill: 0.7,
        mistakeRate: 0.12,
        winFocus: 0.75,
        calculationDepth: 3,
    },
    7: {
        level: 7,
        name: '고급 AI (1단)',
        description: '고급단계의 1단 수준. 정석과 포석을 잘 활용하며 사활 판단 능력 향상',
        captureTendency: 0.75,
        territoryTendency: 0.6,
        combatTendency: 0.75,
        josekiUsage: 0.6,
        lifeDeathSkill: 0.8,
        movementSkill: 0.8,
        mistakeRate: 0.05,
        winFocus: 0.72,
        calculationDepth: 4,
    },
    8: {
        level: 8,
        name: '고급 AI (2단)',
        description: '고급단계의 2단 수준. 우수한 행마와 정석 활용',
        captureTendency: 0.7,
        territoryTendency: 0.65,
        combatTendency: 0.8,
        josekiUsage: 0.7,
        lifeDeathSkill: 0.85,
        movementSkill: 0.85,
        mistakeRate: 0.035,
        winFocus: 0.68,
        calculationDepth: 5,
    },
    9: {
        level: 9,
        name: '유단자 AI (3단)',
        description: '유단자 수준의 3단. 전반적인 기술이 뛰어나며 정확한 판단',
        captureTendency: 0.68,
        territoryTendency: 0.7,
        combatTendency: 0.85,
        josekiUsage: 0.8,
        lifeDeathSkill: 0.9,
        movementSkill: 0.9,
        mistakeRate: 0.02,
        winFocus: 0.65,
        calculationDepth: 6,
    },
    10: {
        level: 10,
        name: '유단자 AI (약 1단)',
        description: '유단자 수준의 약 1단. 영토, 전투, 행마, 정석, 포석, 사활 등 전반적인 모든 기술이 뛰어남',
        captureTendency: 0.6, // 적극적인 전투 선호
        territoryTendency: 0.75, // 영토 확보에 집중
        combatTendency: 0.9, // 전투 능력 뛰어남
        josekiUsage: 0.9, // 정석/포석을 잘 활용
        lifeDeathSkill: 0.95, // 사활 판단 매우 정확
        movementSkill: 0.95, // 행마 능력 매우 우수
        mistakeRate: 0.005, // 실수 거의 없음
        winFocus: 0.62, // 승리에 집중하되 전략적
        calculationDepth: 6, // 계산 깊이 최대
    },
};

/**
 * AI 봇 단계에 맞는 프로필 가져오기
 */
export function getGoAiBotProfile(level: number): GoAiBotProfile {
    const profile = GO_AI_BOT_PROFILES[level];
    if (!profile) {
        console.warn(`[GoAiBot] Unknown AI level ${level}, using level 1 profile`);
        return GO_AI_BOT_PROFILES[1];
    }
    return profile;
}

/**
 * 바둑 AI 봇의 수를 두는 메인 함수
 * @param game 현재 게임 상태
 * @param aiLevel AI 봇 단계 (1~10)
 */
export async function makeGoAiBotMove(
    game: types.LiveGameSession,
    aiLevel: number
): Promise<void> {
    const profile = getGoAiBotProfile(aiLevel);
    const aiPlayerEnum = game.currentPlayer;
    const opponentPlayerEnum = aiPlayerEnum === types.Player.Black ? types.Player.White : types.Player.Black;
    const now = Date.now();
    const logic = getGoLogic(game);
    
    // 살리기 바둑 모드 확인
    const isSurvivalMode = (game.settings as any)?.isSurvivalMode === true;

    // 1. 모든 유효한 수 찾기 (KataGo 사용 안함)
    const allValidMoves = findAllValidMoves(game, logic, aiPlayerEnum);
    
    if (allValidMoves.length === 0) {
        console.log('[GoAiBot] No valid moves available. AI resigns.');
        await summaryService.endGame(game, opponentPlayerEnum, 'resign');
        return;
    }

    // 2. 살리기 바둑 모드일 때는 공격적인 로직 사용
    let scoredMoves: Array<{ move: Point; score: number }>;
    if (isSurvivalMode && aiPlayerEnum === Player.White) {
        // 살리기 바둑: AI(백)가 유저(흑)의 돌을 적극적으로 잡으러 오는 전략 사용
        scoredMoves = scoreMovesForAggressiveCapture(
            allValidMoves,
            game,
            profile,
            logic,
            aiPlayerEnum,
            opponentPlayerEnum
        );
    } else {
        // 일반 바둑: AI 프로필에 따라 수 선택
        scoredMoves = scoreMovesByProfile(
            allValidMoves,
            game,
            profile,
            logic,
            aiPlayerEnum,
            opponentPlayerEnum
        );
    }

    // 3. 실수 확률 적용
    let selectedMove: Point;
    if (Math.random() < profile.mistakeRate && scoredMoves.length > 1) {
        // 실수를 할 경우
        const mistakeChance = Math.random();
        if (mistakeChance < 0.3) {
            // 나쁜 수 선택 (하위 30%)
            const badMoves = scoredMoves.slice(-Math.ceil(scoredMoves.length * 0.3));
            selectedMove = badMoves[Math.floor(Math.random() * badMoves.length)].move;
        } else {
            // 중간 정도의 수 선택
            const midMoves = scoredMoves.slice(
                Math.floor(scoredMoves.length * 0.3),
                Math.floor(scoredMoves.length * 0.7)
            );
            selectedMove = midMoves.length > 0 
                ? midMoves[Math.floor(Math.random() * midMoves.length)].move
                : scoredMoves[Math.floor(Math.random() * scoredMoves.length)].move;
        }
    } else {
        // 정상 플레이: 가장 좋은 수 선택
        selectedMove = scoredMoves[0].move;
    }

    // 4. 선택된 수 실행
    let result = processMove(
        game.boardState,
        { ...selectedMove, player: aiPlayerEnum },
        game.koInfo,
        game.moveHistory.length
    );

    if (!result.isValid) {
        // 유효하지 않은 수를 선택한 경우, 가장 좋은 수로 대체
        const bestMove = scoredMoves[0].move;
        const fallbackResult = processMove(
            game.boardState,
            { ...bestMove, player: aiPlayerEnum },
            game.koInfo,
            game.moveHistory.length
        );
        if (fallbackResult.isValid) {
            selectedMove = bestMove;
            result = fallbackResult;
        } else {
            console.warn('[GoAiBot] Selected move and fallback move invalid. AI resigns.');
            await summaryService.endGame(game, opponentPlayerEnum, 'resign');
            return;
        }
    }

    // 5. 최종 수 적용
    game.boardState = result.newBoardState;
    game.lastMove = { x: selectedMove.x, y: selectedMove.y };
    game.moveHistory.push({ player: aiPlayerEnum, x: selectedMove.x, y: selectedMove.y });
    game.koInfo = result.newKoInfo;
    game.passCount = 0;

    // 6. 따낸 돌 처리
    if (result.capturedStones.length > 0) {
        if (!game.justCaptured) game.justCaptured = [];
        for (const stone of result.capturedStones) {
            const wasPatternStone = (opponentPlayerEnum === Player.Black && game.blackPatternStones?.some(p => p.x === stone.x && p.y === stone.y)) ||
                                    (opponentPlayerEnum === Player.White && game.whitePatternStones?.some(p => p.x === stone.x && p.y === stone.y));
            
            const points = wasPatternStone ? 2 : 1;
            game.captures[aiPlayerEnum] += points;
            game.justCaptured.push({ point: stone, player: opponentPlayerEnum, wasHidden: false });
        }
    }

    // 7. 살리기 바둑 모드에서 승리 조건 확인
    if (isSurvivalMode) {
        // 백(AI)의 턴 수 증가 (백이 한 수를 둘 때마다)
        if (aiPlayerEnum === Player.White) {
            const whiteTurnsPlayed = ((game as any).whiteTurnsPlayed || 0) + 1;
            (game as any).whiteTurnsPlayed = whiteTurnsPlayed;
            const survivalTurns = (game.settings as any)?.survivalTurns || 0;
            
            // 백의 남은 턴이 0이 되면 흑 승리 (백이 목표점수를 달성하지 못함)
            // 백이 목표점수를 달성했는지 먼저 체크 (목표 달성 시 백 승리)
            const target = getCaptureTarget(game, Player.White);
            if (target !== undefined && target !== NO_CAPTURE_TARGET && game.captures[Player.White] >= target) {
                await summaryService.endGame(game, Player.White, 'capture_limit');
                return;
            }
            
            // 백의 남은 턴이 0이 되면 흑 승리 (백이 목표점수를 달성하지 못함)
            // 백의 남은 턴 = survivalTurns - whiteTurnsPlayed
            // 백의 남은 턴이 0이 되었다는 것은 whiteTurnsPlayed >= survivalTurns
            const remainingTurns = survivalTurns - whiteTurnsPlayed;
            if (remainingTurns <= 0 && survivalTurns > 0) {
                if (game.gameStatus === 'playing') {
                    await summaryService.endGame(game, Player.Black, 'capture_limit');
                    return;
                }
                return;
            }
        }
    } else {
        // 일반 따내기 바둑 모드에서 승리 조건 확인
        if (game.isSinglePlayer || game.mode === types.GameMode.Capture) {
            const target = getCaptureTarget(game, aiPlayerEnum);
            if (target !== undefined && target !== NO_CAPTURE_TARGET && game.captures[aiPlayerEnum] >= target) {
                await summaryService.endGame(game, aiPlayerEnum, 'capture_limit');
                return;
            }
        }
    }

    // 8. 시간 업데이트 및 턴 종료
    const aiPlayerTimeKey = aiPlayerEnum === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
    if (game.turnDeadline) {
        const timeRemaining = Math.max(0, (game.turnDeadline - now) / 1000);
        game[aiPlayerTimeKey] = timeRemaining;
    }

    game.currentPlayer = opponentPlayerEnum;
    if (game.settings.timeLimit > 0) {
        const timeKey = game.currentPlayer === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
        const isFischer = game.mode === types.GameMode.Speed || (game.mode === types.GameMode.Mix && game.settings.mixedModes?.includes(types.GameMode.Speed));
        const isNextInByoyomi = game[timeKey] <= 0 && game.settings.byoyomiCount > 0 && !isFischer;
        
        if (isNextInByoyomi) {
            game.turnDeadline = now + game.settings.byoyomiTime * 1000;
        } else {
            game.turnDeadline = now + game[timeKey] * 1000;
        }
        game.turnStartTime = now;
    } else {
        game.turnDeadline = undefined;
        game.turnStartTime = undefined;
    }
}

/**
 * 모든 유효한 수 찾기
 */
function findAllValidMoves(
    game: types.LiveGameSession,
    logic: ReturnType<typeof getGoLogic>,
    aiPlayer: Player
): Point[] {
    const validMoves: Point[] = [];
    const boardSize = game.settings.boardSize;

    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            if (game.boardState[y][x] === Player.None) {
                const result = processMove(
                    game.boardState,
                    { x, y, player: aiPlayer },
                    game.koInfo,
                    game.moveHistory.length
                );
                if (result.isValid) {
                    validMoves.push({ x, y });
                }
            }
        }
    }

    return validMoves;
}

/**
 * AI 프로필에 따라 수를 점수화
 */
function scoreMovesByProfile(
    moves: Point[],
    game: types.LiveGameSession,
    profile: GoAiBotProfile,
    logic: ReturnType<typeof getGoLogic>,
    aiPlayer: Player,
    opponentPlayer: Player
): Array<{ move: Point; score: number }> {
    const scoredMoves: Array<{ move: Point; score: number }> = [];

    for (const move of moves) {
        let score = 0;
        const point: Point = { x: move.x, y: move.y };

        // 1. 따내기 성향 반영
        const captureScore = evaluateCaptureOpportunity(game, logic, point, aiPlayer, opponentPlayer);
        if (captureScore > 0) {
            score += 150; // 강력한 가중치 부여
        }
        score += captureScore * profile.captureTendency * 180;

        // 2. 영토 확보 성향 반영
        const territoryScore = evaluateTerritory(game, logic, point, aiPlayer);
        score += territoryScore * profile.territoryTendency * 50;

        // 3. 전투 성향 반영
        const combatScore = evaluateCombat(game, logic, point, aiPlayer, opponentPlayer);
        score += combatScore * profile.combatTendency * 80;

        // 4. 아타리(단수) 기회 평가
        const atariScore = evaluateAtariOpportunity(game, logic, point, aiPlayer, opponentPlayer);
        score += atariScore * profile.captureTendency * 120;

        // 5. 정석/포석 활용도 반영 (고수일수록 더 반영)
        if (profile.josekiUsage > 0.3) {
            const josekiScore = evaluateJoseki(game, point, aiPlayer);
            score += josekiScore * profile.josekiUsage * 40;
        }

        // 6. 사활 판단 능력 반영
        if (profile.lifeDeathSkill > 0.3) {
            const lifeDeathScore = evaluateLifeDeath(game, logic, point, aiPlayer, opponentPlayer);
            score += lifeDeathScore * profile.lifeDeathSkill * 80;
        }

        // 7. 행마 능력 반영
        if (profile.movementSkill > 0.3) {
            const movementScore = evaluateMovement(game, logic, point, aiPlayer);
            score += movementScore * profile.movementSkill * 40;
        }

        // 8. 승리 목적 달성도 반영 (목표 점수에 근접할수록 높은 점수)
        if (profile.winFocus > 0.5 && (game.isSinglePlayer || game.mode === types.GameMode.Capture)) {
            const winFocusScore = evaluateWinFocus(game, logic, point, aiPlayer, opponentPlayer);
            score += winFocusScore * profile.winFocus * 150;
        }

        scoredMoves.push({ move, score });
    }

    // 점수 순으로 정렬
    scoredMoves.sort((a, b) => b.score - a.score);

    return scoredMoves;
}

/**
 * 따내기 기회 평가
 */
function evaluateCaptureOpportunity(
    game: types.LiveGameSession,
    logic: ReturnType<typeof getGoLogic>,
    point: Point,
    aiPlayer: Player,
    opponentPlayer: Player
): number {
    // 이 수로 상대 돌을 따낼 수 있는지 확인
    const testResult = processMove(
        game.boardState,
        { ...point, player: aiPlayer },
        game.koInfo,
        game.moveHistory.length,
        { ignoreSuicide: true }
    );

    if (testResult.isValid && testResult.capturedStones.length > 0) {
        let captureScore = 0;
        for (const stone of testResult.capturedStones) {
            // 문양돌은 2점, 일반 돌은 1점
            const wasPatternStone = (opponentPlayer === Player.Black && game.blackPatternStones?.some(p => p.x === stone.x && p.y === stone.y)) ||
                                    (opponentPlayer === Player.White && game.whitePatternStones?.some(p => p.x === stone.x && p.y === stone.y));
            captureScore += wasPatternStone ? 2 : 1;
        }
        return captureScore;
    }

    return 0;
}

/**
 * 영토 확보 평가
 */
function evaluateTerritory(
    game: types.LiveGameSession,
    logic: ReturnType<typeof getGoLogic>,
    point: Point,
    aiPlayer: Player
): number {
    const boardSize = game.settings.boardSize;
    let territoryScore = 0;

    // 주변 8방향 확인
    const directions = [
        { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
        { x: -1, y: 0 }, { x: 1, y: 0 },
        { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }
    ];

    for (const dir of directions) {
        const nx = point.x + dir.x;
        const ny = point.y + dir.y;
        if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
            const cell = game.boardState[ny][nx];
            if (cell === Player.None) {
                territoryScore += 0.5; // 빈 공간
            } else if (cell === aiPlayer) {
                territoryScore += 1.5; // 자신의 돌
            }
        }
    }

    // 모서리와 변은 영토 확보에 유리
    const isCorner = (point.x === 0 || point.x === boardSize - 1) && 
                     (point.y === 0 || point.y === boardSize - 1);
    const isEdge = (point.x === 0 || point.x === boardSize - 1) || 
                  (point.y === 0 || point.y === boardSize - 1);
    
    if (isCorner) territoryScore += 2;
    else if (isEdge) territoryScore += 1;

    return territoryScore;
}

/**
 * 전투 평가
 */
function evaluateCombat(
    game: types.LiveGameSession,
    logic: ReturnType<typeof getGoLogic>,
    point: Point,
    aiPlayer: Player,
    opponentPlayer: Player
): number {
    const boardSize = game.settings.boardSize;
    let combatScore = 0;

    // 상대 돌과 인접한 위치인지 확인
    const directions = [
        { x: -1, y: 0 }, { x: 1, y: 0 },
        { x: 0, y: -1 }, { x: 0, y: 1 }
    ];

    for (const dir of directions) {
        const nx = point.x + dir.x;
        const ny = point.y + dir.y;
        if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
            const cell = game.boardState[ny][nx];
            if (cell === opponentPlayer) {
                combatScore += 2; // 상대 돌과 인접
            } else if (cell === aiPlayer) {
                combatScore += 1; // 자신의 돌과 연결
            }
        }
    }

    return combatScore;
}

/**
 * 아타리(단수) 기회 평가
 */
function evaluateAtariOpportunity(
    game: types.LiveGameSession,
    logic: ReturnType<typeof getGoLogic>,
    point: Point,
    aiPlayer: Player,
    opponentPlayer: Player
): number {
    const testResult = processMove(
        game.boardState,
        { ...point, player: aiPlayer },
        game.koInfo,
        game.moveHistory.length,
        { ignoreSuicide: true }
    );

    if (!testResult.isValid) return 0;

    let atariScore = 0;

    const opponentGroupsBefore = logic.getAllGroups(opponentPlayer, game.boardState);
    const opponentGroupsAfter = logic.getAllGroups(opponentPlayer, testResult.newBoardState);

    for (const groupAfter of opponentGroupsAfter) {
        const libertiesAfter = groupAfter.libertyPoints.size;
        if (libertiesAfter > 2) continue;

        const matchingBefore = opponentGroupsBefore.find(groupBefore =>
            groupBefore.stones.some(beforeStone =>
                groupAfter.stones.some(afterStone => afterStone.x === beforeStone.x && afterStone.y === beforeStone.y)
            )
        );

        if (!matchingBefore) continue;

        const libertiesBefore = matchingBefore.libertyPoints.size;
        if (libertiesAfter === 1 && libertiesBefore > libertiesAfter) {
            // 즉시 단수 상황
            atariScore += 5;
        } else if (libertiesAfter === 2 && libertiesBefore - libertiesAfter >= 2) {
            // 빠르게 단수로 몰 수 있는 경우
            atariScore += 3;
        } else if (libertiesAfter < libertiesBefore) {
            atariScore += 1.5;
        }
    }

    return atariScore;
}

/**
 * 정석/포석 평가 (간단한 구현)
 */
function evaluateJoseki(
    game: types.LiveGameSession,
    point: Point,
    aiPlayer: Player
): number {
    const boardSize = game.settings.boardSize;
    
    // 간단한 정석 위치 평가
    // 모서리 3-3, 3-4, 4-4 등 기본 포석 위치
    const cornerPositions = [
        { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 2 }, { x: 3, y: 3 },
        { x: boardSize - 3, y: 2 }, { x: boardSize - 3, y: 3 },
        { x: boardSize - 4, y: 2 }, { x: boardSize - 4, y: 3 },
        { x: 2, y: boardSize - 3 }, { x: 3, y: boardSize - 3 },
        { x: 2, y: boardSize - 4 }, { x: 3, y: boardSize - 4 },
        { x: boardSize - 3, y: boardSize - 3 }, { x: boardSize - 4, y: boardSize - 3 },
        { x: boardSize - 3, y: boardSize - 4 }, { x: boardSize - 4, y: boardSize - 4 },
    ];

    for (const pos of cornerPositions) {
        if (point.x === pos.x && point.y === pos.y) {
            return 1.0; // 정석 위치
        }
    }

    // 변의 포석 위치
    const edgePositions = [
        { x: 2, y: 0 }, { x: 3, y: 0 }, { x: boardSize - 3, y: 0 }, { x: boardSize - 4, y: 0 },
        { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: boardSize - 3 }, { x: 0, y: boardSize - 4 },
        { x: boardSize - 1, y: 2 }, { x: boardSize - 1, y: 3 },
        { x: boardSize - 1, y: boardSize - 3 }, { x: boardSize - 1, y: boardSize - 4 },
        { x: 2, y: boardSize - 1 }, { x: 3, y: boardSize - 1 },
        { x: boardSize - 3, y: boardSize - 1 }, { x: boardSize - 4, y: boardSize - 1 },
    ];

    for (const pos of edgePositions) {
        if (point.x === pos.x && point.y === pos.y) {
            return 0.7; // 변의 포석 위치
        }
    }

    return 0.3; // 일반 위치
}

/**
 * 사활 판단 평가
 */
function evaluateLifeDeath(
    game: types.LiveGameSession,
    logic: ReturnType<typeof getGoLogic>,
    point: Point,
    aiPlayer: Player,
    opponentPlayer: Player
): number {
    // 자신의 그룹이 위험한지, 상대 그룹을 잡을 수 있는지 평가
    const testResult = processMove(
        game.boardState,
        { ...point, player: aiPlayer },
        game.koInfo,
        game.moveHistory.length,
        { ignoreSuicide: true }
    );

    if (!testResult.isValid) return -2; // 자살수는 매우 낮은 점수

    // 따낼 수 있으면 높은 점수
    if (testResult.capturedStones.length > 0) {
        return 1.5;
    }

    // 자신의 그룹을 살리는 수인지 확인
    const groups = logic.getAllGroups(aiPlayer, testResult.newBoardState);
    const pointGroup = groups.find(g => g.stones.some(p => p.x === point.x && p.y === point.y));
    if (pointGroup) {
        const libertyCount = pointGroup.libertyPoints.size;
        if (libertyCount >= 2) {
            return 0.8; // 그룹을 살리는 수
        }
    }

    return 0.4;
}

/**
 * 행마 평가
 */
function evaluateMovement(
    game: types.LiveGameSession,
    logic: ReturnType<typeof getGoLogic>,
    point: Point,
    aiPlayer: Player
): number {
    const boardSize = game.settings.boardSize;
    let movementScore = 0;

    // 자신의 돌과 연결되는지 확인
    const directions = [
        { x: -1, y: 0 }, { x: 1, y: 0 },
        { x: 0, y: -1 }, { x: 0, y: 1 }
    ];

    let connectedCount = 0;
    for (const dir of directions) {
        const nx = point.x + dir.x;
        const ny = point.y + dir.y;
        if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
            const cell = game.boardState[ny][nx];
            if (cell === aiPlayer) {
                connectedCount++;
                movementScore += 0.8; // 자신의 돌과 연결
            } else if (cell === Player.None) {
                movementScore += 0.3; // 빈 공간으로 확장
            }
        }
    }

    // 연결된 돌이 많을수록 좋음
    if (connectedCount >= 2) {
        movementScore += 1.0;
    }

    return movementScore;
}

/**
 * 승리 목적 달성도 평가
 */
function evaluateWinFocus(
    game: types.LiveGameSession,
    logic: ReturnType<typeof getGoLogic>,
    point: Point,
    aiPlayer: Player,
    opponentPlayer: Player
): number {
    const target = getCaptureTarget(game, aiPlayer);
    if (target === undefined || target === NO_CAPTURE_TARGET) return 0;
    const currentScore = game.captures[aiPlayer] || 0;
    const remainingScore = target - currentScore;

    // 목표 점수에 가까울수록 높은 점수
    if (remainingScore <= 0) return 0; // 이미 달성

    // 이 수로 따낼 수 있는 점수 확인
    const testResult = processMove(
        game.boardState,
        { ...point, player: aiPlayer },
        game.koInfo,
        game.moveHistory.length,
        { ignoreSuicide: true }
    );

    if (testResult.isValid && testResult.capturedStones.length > 0) {
        let captureScore = 0;
        for (const stone of testResult.capturedStones) {
            const wasPatternStone = (opponentPlayer === Player.Black && game.blackPatternStones?.some(p => p.x === stone.x && p.y === stone.y)) ||
                                    (opponentPlayer === Player.White && game.whitePatternStones?.some(p => p.x === stone.x && p.y === stone.y));
            captureScore += wasPatternStone ? 2 : 1;
        }

        // 목표 달성에 가까운 수일수록 높은 점수
        if (currentScore + captureScore >= target) {
            return 10.0; // 승리 수
        } else if (remainingScore <= 3) {
            return captureScore * 2; // 목표에 가까움
        } else {
            return captureScore;
        }
    }

    return 0;
}

/**
 * 살리기 바둑 모드: AI(백)가 유저(흑)의 돌을 적극적으로 잡으러 오는 전략으로 수를 점수화
 */
function scoreMovesForAggressiveCapture(
    moves: Point[],
    game: types.LiveGameSession,
    profile: GoAiBotProfile,
    logic: ReturnType<typeof getGoLogic>,
    aiPlayer: Player,
    opponentPlayer: Player
): Array<{ move: Point; score: number }> {
    const scoredMoves: Array<{ move: Point; score: number }> = [];

    for (const move of moves) {
        let score = 0;
        const point: Point = { x: move.x, y: move.y };

        // 살리기 바둑의 목표: 유저(흑)의 돌을 적극적으로 잡기

        // 1. 따내기 기회 평가 (최우선) - 유저의 돌을 잡을 수 있는 수
        const captureScore = evaluateCaptureOpportunity(game, logic, point, aiPlayer, opponentPlayer);
        score += captureScore * 500; // 따내기가 최우선 (매우 높은 가중치로 증가)

        // 2. 공격 기회 평가 - 유저의 돌을 위협하는 수
        const attackScore = evaluateAttackOpportunity(game, logic, point, aiPlayer, opponentPlayer);
        score += attackScore * 350; // 공격 기회도 높은 점수 (가중치 증가)

        // 3. 유저 돌과의 근접성 평가 - 유저 돌 근처로 가는 수
        const proximityScore = evaluateProximityToOpponent(game, logic, point, opponentPlayer);
        score += proximityScore * 250; // 유저 돌 근처로 접근 (가중치 증가)

        // 4. 유저 그룹을 포위하는 수 평가
        const surroundScore = evaluateSurroundOpportunity(game, logic, point, aiPlayer, opponentPlayer);
        score += surroundScore * 200; // 유저 그룹 포위 (가중치 증가)

        // 5. 전투 성향 반영 - 유저와 전투를 벌이는 수
        const combatScore = evaluateCombat(game, logic, point, aiPlayer, opponentPlayer);
        score += combatScore * 150; // 전투 성향 (가중치 증가)

        // 6. 자신의 안전성도 약간 고려 (너무 위험한 수는 피하기)
        const safetyScore = evaluateSafety(game, logic, point, aiPlayer);
        score += safetyScore * 30; // 안전성은 낮은 가중치 (더 낮춤)

        // 7. 실수 확률 적용 (공격 모드에서는 실수율 감소)
        if (Math.random() < profile.mistakeRate * 0.5) { // 살리기 공격 모드에서는 실수율 더 감소
            score *= 0.9; // 실수 시에도 점수 감소를 줄임
        }

        scoredMoves.push({ move, score });
    }

    // 점수 순으로 정렬
    scoredMoves.sort((a, b) => b.score - a.score);

    return scoredMoves;
}

/**
 * 공격 기회 평가 - 유저의 돌을 위협할 수 있는 수
 */
function evaluateAttackOpportunity(
    game: types.LiveGameSession,
    logic: ReturnType<typeof getGoLogic>,
    point: Point,
    aiPlayer: Player,
    opponentPlayer: Player
): number {
    const testResult = processMove(
        game.boardState,
        { ...point, player: aiPlayer },
        game.koInfo,
        game.moveHistory.length,
        { ignoreSuicide: true }
    );

    if (!testResult.isValid) return 0;

    // 이 수를 둔 후 유저의 그룹이 위험해지는지 확인
    const opponentGroups = logic.getAllGroups(opponentPlayer, testResult.newBoardState);
    let attackScore = 0;

    for (const group of opponentGroups) {
        const libertyCount = group.libertyPoints.size;
        // 유저 그룹의 자유도가 적을수록 공격 성공 가능성 높음
        if (libertyCount === 1) {
            attackScore += 5.0; // 다음 턴에 잡을 수 있는 위치 (점수 증가)
        } else if (libertyCount === 2) {
            attackScore += 3.5; // 2턴 안에 잡을 수 있는 위치 (점수 증가)
        } else if (libertyCount === 3) {
            attackScore += 2.0; // 위협적인 위치 (점수 증가)
        } else if (libertyCount === 4) {
            attackScore += 1.0; // 약간 위협적인 위치 (추가)
        }

        // 이 수가 유저 그룹의 자유도를 감소시켰는지 확인 (이전 상태와 비교)
        const oldOpponentGroups = logic.getAllGroups(opponentPlayer, game.boardState);
        const oldGroup = oldOpponentGroups.find(g => 
            g.stones.some(s => group.stones.some(gs => gs.x === s.x && gs.y === s.y))
        );
        if (oldGroup && libertyCount < oldGroup.libertyPoints.size) {
            attackScore += 2.5; // 자유도를 줄인 수 (점수 증가)
        }
    }

    return attackScore;
}

/**
 * 유저 돌과의 근접성 평가 - 유저 돌 근처로 가는 수
 */
function evaluateProximityToOpponent(
    game: types.LiveGameSession,
    logic: ReturnType<typeof getGoLogic>,
    point: Point,
    opponentPlayer: Player
): number {
    const boardSize = game.settings.boardSize;
    let minDistance = Infinity;
    let nearbyOpponentStones = 0;

    // 모든 유저 돌과의 최단 거리 계산
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            if (game.boardState[y][x] === opponentPlayer) {
                const distance = Math.abs(point.x - x) + Math.abs(point.y - y);
                minDistance = Math.min(minDistance, distance);
                
                // 근처의 유저 돌 개수 (거리 2 이내)
                if (distance <= 2) {
                    nearbyOpponentStones++;
                }
            }
        }
    }

    // 거리가 가까울수록 높은 점수 (공격적)
    if (minDistance === Infinity) return 0.0; // 유저 돌이 없음
    if (minDistance === 1) return 2.0; // 바로 인접 (최고 점수, 점수 증가)
    if (minDistance === 2) return 1.5; // 2칸 거리 (점수 증가)
    if (minDistance === 3) return 1.0; // 3칸 거리 (점수 증가)
    if (minDistance === 4) return 0.5; // 4칸 거리 (점수 증가)
    if (minDistance >= 5) return 0.1; // 멀면 낮은 점수

    // 근처에 유저 돌이 많을수록 더 높은 점수
    return Math.min(2.0, nearbyOpponentStones / 2.0); // 최대 점수 증가
}

/**
 * 유저 그룹 포위 기회 평가
 */
function evaluateSurroundOpportunity(
    game: types.LiveGameSession,
    logic: ReturnType<typeof getGoLogic>,
    point: Point,
    aiPlayer: Player,
    opponentPlayer: Player
): number {
    const testResult = processMove(
        game.boardState,
        { ...point, player: aiPlayer },
        game.koInfo,
        game.moveHistory.length,
        { ignoreSuicide: true }
    );

    if (!testResult.isValid) return 0;

    const boardSize = game.settings.boardSize;
    let surroundScore = 0;

    // 이 수 주변의 유저 그룹 확인
    const directions = [
        { x: -1, y: 0 }, { x: 1, y: 0 },
        { x: 0, y: -1 }, { x: 0, y: 1 }
    ];

    for (const dir of directions) {
        const nx = point.x + dir.x;
        const ny = point.y + dir.y;
        if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
            if (testResult.newBoardState[ny][nx] === opponentPlayer) {
                // 유저 돌과 인접한 위치에 자신의 돌을 둠
                const opponentGroups = logic.getAllGroups(opponentPlayer, testResult.newBoardState);
                const nearbyGroup = opponentGroups.find(g => 
                    g.stones.some(p => p.x === nx && p.y === ny)
                );
                
                if (nearbyGroup) {
                    const libertyCount = nearbyGroup.libertyPoints.size;
                    // 유저 그룹을 포위하는 수일수록 높은 점수
                    if (libertyCount === 1) {
                        surroundScore += 4.0; // 거의 잡을 수 있는 위치 (점수 증가)
                    } else if (libertyCount === 2) {
                        surroundScore += 3.0; // 위험한 위치 (점수 증가)
                    } else if (libertyCount === 3) {
                        surroundScore += 2.0; // 포위 중 (점수 증가)
                    } else if (libertyCount === 4) {
                        surroundScore += 1.0; // 약간 포위 (추가)
                    }
                }
            }
        }
    }

    return surroundScore;
}

/**
 * 안전성 평가 (자신의 그룹을 살리는 수)
 */
function evaluateSafety(
    game: types.LiveGameSession,
    logic: ReturnType<typeof getGoLogic>,
    point: Point,
    aiPlayer: Player
): number {
    const testResult = processMove(
        game.boardState,
        { ...point, player: aiPlayer },
        game.koInfo,
        game.moveHistory.length,
        { ignoreSuicide: true }
    );

    if (!testResult.isValid) return -1.0; // 자살수는 매우 위험

    // 자신의 그룹의 자유도 확인
    const groups = logic.getAllGroups(aiPlayer, testResult.newBoardState);
    const pointGroup = groups.find(g => g.stones.some(p => p.x === point.x && p.y === point.y));
    
    if (pointGroup) {
        const libertyCount = pointGroup.libertyPoints.size;
        if (libertyCount >= 3) return 1.0; // 매우 안전
        if (libertyCount >= 2) return 0.7; // 안전
        if (libertyCount >= 1) return 0.3; // 위험
        return 0.0; // 매우 위험 (자유도 없음)
    }

    return 0.5; // 새로운 그룹 생성
}

/**
 * 도망 평가 (상대 돌과 멀어지는 수)
 */
function evaluateEscape(
    game: types.LiveGameSession,
    logic: ReturnType<typeof getGoLogic>,
    point: Point,
    aiPlayer: Player,
    opponentPlayer: Player
): number {
    const boardSize = game.settings.boardSize;
    let escapeScore = 0;

    // 자신의 돌들의 평균 위치 계산
    let totalX = 0, totalY = 0, count = 0;
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            if (game.boardState[y][x] === aiPlayer) {
                totalX += x;
                totalY += y;
                count++;
            }
        }
    }

    if (count === 0) return 0.5; // 자신의 돌이 없음

    const avgX = totalX / count;
    const avgY = totalY / count;

    // 자신의 돌들과의 거리 (너무 멀면 안됨, 적당히 떨어져야 함)
    const distanceFromGroup = Math.abs(point.x - avgX) + Math.abs(point.y - avgY);
    if (distanceFromGroup >= 1 && distanceFromGroup <= 3) {
        escapeScore += 0.8; // 적당한 거리로 이동
    }

    // 상대 돌들과의 거리
    let minOpponentDistance = Infinity;
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            if (game.boardState[y][x] === opponentPlayer) {
                const distance = Math.abs(point.x - x) + Math.abs(point.y - y);
                minOpponentDistance = Math.min(minOpponentDistance, distance);
            }
        }
    }

    if (minOpponentDistance >= 3) {
        escapeScore += 0.5; // 상대와 멀리 떨어짐
    }

    return escapeScore;
}

/**
 * 자유도 증가 평가
 */
function evaluateLibertyGain(
    game: types.LiveGameSession,
    logic: ReturnType<typeof getGoLogic>,
    point: Point,
    aiPlayer: Player
): number {
    const testResult = processMove(
        game.boardState,
        { ...point, player: aiPlayer },
        game.koInfo,
        game.moveHistory.length,
        { ignoreSuicide: true }
    );

    if (!testResult.isValid) return 0;

    const groups = logic.getAllGroups(aiPlayer, testResult.newBoardState);
    const pointGroup = groups.find(g => g.stones.some(p => p.x === point.x && p.y === point.y));
    
    if (pointGroup) {
        const libertyCount = pointGroup.libertyPoints.size;
        // 자유도가 많을수록 좋음
        return Math.min(1.0, libertyCount / 5.0);
    }

    return 0.3; // 새로운 그룹
}
