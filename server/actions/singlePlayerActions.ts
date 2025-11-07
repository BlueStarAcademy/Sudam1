import { randomUUID } from 'crypto';
import * as db from '../db.js';
import { type ServerAction, type User, type VolatileState, LiveGameSession, Player, GameMode, Point, BoardState, SinglePlayerStageInfo, SinglePlayerMissionState, UserStatus } from '../../types.js';
import { SINGLE_PLAYER_STAGES, KATAGO_LEVEL_TO_MAX_VISITS, SINGLE_PLAYER_MISSIONS } from '../../constants/singlePlayerConstants';
import { getAiUser } from '../aiPlayer.js';
import { broadcast } from '../socket.js';

type HandleActionResult = { 
    clientResponse?: any;
    error?: string;
};

// Helper function to place stones randomly without overlap
const placeStonesOnBoard = (board: BoardState, boardSize: number, count: number, player: Player): Point[] => {
    const placedStones: Point[] = [];
    let placedCount = 0;
    let attempts = 0;
    while (placedCount < count && attempts < 200) {
        attempts++;
        const x = Math.floor(Math.random() * boardSize);
        const y = Math.floor(Math.random() * boardSize);
        if (board[y][x] === Player.None) {
            board[y][x] = player;
            placedStones.push({ x, y });
            placedCount++;
        }
    }
    return placedStones;
};

const generateSinglePlayerBoard = (stage: SinglePlayerStageInfo): { board: BoardState, blackPattern: Point[], whitePattern: Point[] } => {
    const board = Array(stage.boardSize).fill(null).map(() => Array(stage.boardSize).fill(Player.None));
    const center = Math.floor(stage.boardSize / 2);
    let blackToPlace = stage.placements.black;
    
    // Handle center stone placement probability
    if (stage.placements.centerBlackStoneChance !== undefined && stage.placements.centerBlackStoneChance > 0 && Math.random() * 100 < stage.placements.centerBlackStoneChance) {
        board[center][center] = Player.Black;
        blackToPlace--;
    }

    const whitePatternStones = placeStonesOnBoard(board, stage.boardSize, stage.placements.whitePattern, Player.White);
    const blackPatternStones = placeStonesOnBoard(board, stage.boardSize, stage.placements.blackPattern, Player.Black);
    placeStonesOnBoard(board, stage.boardSize, stage.placements.white, Player.White);
    placeStonesOnBoard(board, stage.boardSize, blackToPlace, Player.Black); // Place remaining black stones
    
    return { board, blackPattern: blackPatternStones, whitePattern: whitePatternStones };
};


export const handleSinglePlayerAction = async (volatileState: VolatileState, action: ServerAction & { userId: string }, user: User): Promise<HandleActionResult> => {
    const { type, payload } = action;
    const now = Date.now();

    switch(type) {
        case 'START_SINGLE_PLAYER_GAME': {
            const { stageId } = payload;
            const stage = SINGLE_PLAYER_STAGES.find(s => s.id === stageId);

            if (!stage) {
                return { error: 'Stage not found.' };
            }
            
            if (user.actionPoints.current < stage.actionPointCost && !user.isAdmin) {
                return { error: `액션 포인트가 부족합니다. (필요: ${stage.actionPointCost})` };
            }

            if (!user.isAdmin) {
                user.actionPoints.current -= stage.actionPointCost;
                user.lastActionPointUpdate = now;
            }
            
            // 게임 모드 결정
            let gameMode: GameMode;
            if (stage.hiddenCount !== undefined) {
                gameMode = GameMode.Hidden;
            } else if (stage.missileCount !== undefined) {
                gameMode = GameMode.Missile;
            } else if (stage.timeControl.type === 'fischer') {
                gameMode = GameMode.Speed;
            } else {
                gameMode = GameMode.Standard;
            }

            const aiUser = getAiUser(gameMode);
            const { board, blackPattern, whitePattern } = generateSinglePlayerBoard(stage);

            // 살리기 바둑 모드 확인
            const isSurvivalMode = stage.survivalTurns !== undefined;

            // 시간룰 설정: 스피드바둑은 피셔, 나머지는 5분+초읽기30초 3회
            const timeLimit = stage.timeControl.type === 'fischer' ? stage.timeControl.mainTime : 5;
            const byoyomiTime = stage.timeControl.type === 'fischer' ? 0 : 30;
            const byoyomiCount = stage.timeControl.type === 'fischer' ? 0 : 3;
            const timeIncrement = stage.timeControl.type === 'fischer' ? stage.timeControl.increment ?? 0 : 0;

            // AI 히든 아이템 사용 턴 결정
            let aiHiddenItemTurn: number | undefined;
            if (stage.hiddenCount !== undefined) {
                if (stage.aiHiddenItemTurnRange) {
                    // 유단자 히든바둑: 10~50턴 사이
                    aiHiddenItemTurn = Math.floor(Math.random() * (stage.aiHiddenItemTurnRange.max - stage.aiHiddenItemTurnRange.min + 1)) + stage.aiHiddenItemTurnRange.min;
                } else {
                    // 고급 히든바둑: 10~30턴 사이
                    aiHiddenItemTurn = Math.floor(Math.random() * 21) + 10;
                }
            }

            const gameId = `sp-game-${randomUUID()}`;
            const game: LiveGameSession = {
                id: gameId,
                mode: gameMode,
                isSinglePlayer: true,
                stageId: stage.id,
                isAiGame: true,
                settings: {
                    boardSize: stage.boardSize,
                    komi: 0.5,
                    timeLimit: timeLimit,
                    byoyomiTime: byoyomiTime,
                    byoyomiCount: byoyomiCount,
                    timeIncrement: timeIncrement,
                    captureTarget: stage.targetScore.black, // Default for display, effective targets used in logic
                    aiDifficulty: stage.katagoLevel,
                    survivalTurns: stage.survivalTurns, // 살리기 바둑 모드: AI가 살아남아야 하는 턴 수
                    isSurvivalMode: isSurvivalMode, // 살리기 바둑 모드 플래그
                    hiddenStoneCount: stage.hiddenCount, // 히든바둑: 히든 아이템 개수
                    scanCount: stage.scanCount, // 히든바둑: 스캔 아이템 개수
                    missileCount: stage.missileCount, // 미사일바둑: 미사일 아이템 개수
                } as any,
                player1: user,
                player2: aiUser,
                blackPlayerId: user.id,
                whitePlayerId: aiUser.id,
                gameStatus: 'playing',
                currentPlayer: Player.Black,
                boardState: board,
                blackPatternStones: blackPattern,
                whitePatternStones: whitePattern,
                moveHistory: [],
                captures: { [Player.None]: 0, [Player.Black]: 0, [Player.White]: 0 },
                baseStoneCaptures: { [Player.None]: 0, [Player.Black]: 0, [Player.White]: 0 },
                hiddenStoneCaptures: { [Player.None]: 0, [Player.Black]: 0, [Player.White]: 0 },
                winner: null,
                winReason: null,
                createdAt: now,
                lastMove: null,
                passCount: 0,
                koInfo: null,
                disconnectionCounts: {},
                currentActionButtons: {},
                scores: { [user.id]: 0, [aiUser.id]: 0 },
                round: 1,
                turnInRound: 1,
                blackTimeLeft: timeLimit * 60,
                whiteTimeLeft: timeLimit * 60,
                blackByoyomiPeriodsLeft: byoyomiCount,
                whiteByoyomiPeriodsLeft: byoyomiCount,
                turnStartTime: now,
                turnDeadline: now + (timeLimit * 60 * 1000),
                effectiveCaptureTargets: {
                    [Player.None]: 0,
                    // 살리기 바둑: 흑만 목표점수 있음 (백을 잡아서 승리)
                    [Player.Black]: stage.targetScore.black,
                    // 살리기 바둑: 백은 목표점수가 없음 (살아남는 것이 목표)
                    [Player.White]: isSurvivalMode ? 999 : stage.targetScore.white,
                },
                // 살리기 바둑: 백의 턴 수 추적
                whiteTurnsPlayed: isSurvivalMode ? 0 : undefined,
                singlePlayerPlacementRefreshesUsed: 0,
                totalTurns: 0, // 턴 카운팅 초기화
                aiHiddenItemTurn: aiHiddenItemTurn, // AI 히든 아이템 사용 턴
                aiHiddenItemUsed: false, // AI 히든 아이템 사용 여부
            } as LiveGameSession;

            // 히든바둑 초기화
            if (gameMode === GameMode.Hidden) {
                const { initializeHidden } = await import('../modes/hidden.js');
                initializeHidden(game);
            }

            await db.saveGame(game);
            await db.updateUser(user);

            volatileState.userStatuses[user.id] = { status: UserStatus.InGame, mode: game.mode, gameId: game.id };

            // 게임 생성 후 게임 정보를 먼저 브로드캐스트 (클라이언트가 게임 데이터를 먼저 받을 수 있도록)
            broadcast({ type: 'GAME_UPDATE', payload: { [game.id]: game } });
            // 그 다음 사용자 상태 브로드캐스트
            broadcast({ type: 'USER_STATUS_UPDATE', payload: volatileState.userStatuses });
            broadcast({ type: 'USER_UPDATE', payload: { [user.id]: user } });

            return { clientResponse: { gameId: game.id, updatedUser: user } };
        }
        case 'SINGLE_PLAYER_REFRESH_PLACEMENT': {
            const { gameId } = payload;
            const game = await db.getLiveGame(gameId);
            if (!game || !game.isSinglePlayer || !game.stageId) {
                return { error: 'Invalid single player game.' };
            }
            if (game.gameStatus !== 'playing' || game.currentPlayer !== Player.Black || game.moveHistory.length > 0) {
                return { error: '배치는 첫 수 전에만 새로고침할 수 있습니다.' };
            }

            const refreshesUsed = game.singlePlayerPlacementRefreshesUsed || 0;
            if (refreshesUsed >= 5) {
                return { error: '새로고침 횟수를 모두 사용했습니다.' };
            }

            const costs = [0, 50, 100, 200, 300];
            const cost = costs[refreshesUsed];

            if (user.gold < cost && !user.isAdmin) {
                return { error: `골드가 부족합니다. (필요: ${cost})` };
            }
            
            if (!user.isAdmin) {
                user.gold -= cost;
            }
            game.singlePlayerPlacementRefreshesUsed = refreshesUsed + 1;

            const stage = SINGLE_PLAYER_STAGES.find(s => s.id === game.stageId);
            if (!stage) {
                return { error: 'Stage data not found for refresh.' };
            }

            const { board, blackPattern, whitePattern } = generateSinglePlayerBoard(stage);
            game.boardState = board;
            game.blackPatternStones = blackPattern;
            game.whitePatternStones = whitePattern;

            await db.updateUser(user);
            await db.saveGame(game);

            return { clientResponse: { updatedUser: user } };
        }
        case 'START_SINGLE_PLAYER_MISSION': {
            const { missionId } = payload;
            const missionInfo = SINGLE_PLAYER_MISSIONS.find(m => m.id === missionId);
            if (!missionInfo) return { error: '미션을 찾을 수 없습니다.' };

            if (!user.singlePlayerMissions) user.singlePlayerMissions = {};
            if (user.singlePlayerMissions[missionId]?.isStarted) return { error: '이미 시작된 미션입니다.' };

            const unlockStageIndex = SINGLE_PLAYER_STAGES.findIndex(s => s.id === missionInfo.unlockStageId);
            if ((user.singlePlayerProgress ?? 0) <= unlockStageIndex) return { error: '미션이 아직 잠겨있습니다.' };

            // 레벨 1로 시작
            const level1Info = missionInfo.levels[0];
            const initialAmount = Math.min(level1Info.rewardAmount, level1Info.maxCapacity);

            user.singlePlayerMissions[missionId] = {
                id: missionId,
                isStarted: true,
                level: 1,
                lastCollectionTime: now,
                accumulatedAmount: initialAmount,
                accumulatedCollection: 0,
            };
            await db.updateUser(user);
            broadcast({ type: 'USER_UPDATE', payload: { [user.id]: user } });
            return { clientResponse: { updatedUser: user } };
        }
        case 'CLAIM_SINGLE_PLAYER_MISSION_REWARD': {
            const { missionId } = payload;
            const missionInfo = SINGLE_PLAYER_MISSIONS.find(m => m.id === missionId);
            if (!missionInfo) return { error: '미션을 찾을 수 없습니다.' };
        
            const missionState = user.singlePlayerMissions?.[missionId];
            if (!missionState || !missionState.isStarted) return { error: '미션이 시작되지 않았습니다.' };
            
            const currentLevel = missionState.level || 1;
            const levelInfo = missionInfo.levels[currentLevel - 1];
            if (!levelInfo) return { error: '레벨 정보를 찾을 수 없습니다.' };
        
            // Recalculate amount accumulated since last server tick, before claiming
            const elapsedMs = now - missionState.lastCollectionTime;
            const productionIntervalMs = levelInfo.productionRateMinutes * 60 * 1000;
            let finalAmountToClaim = missionState.accumulatedAmount;

            if (productionIntervalMs > 0 && elapsedMs > 0) {
                const cycles = Math.floor(elapsedMs / productionIntervalMs);
                if (cycles > 0) {
                    const generatedAmount = cycles * levelInfo.rewardAmount;
                    finalAmountToClaim = Math.min(levelInfo.maxCapacity, missionState.accumulatedAmount + generatedAmount);
                }
            }
        
            if (finalAmountToClaim < 1) {
                return { error: '수령할 보상이 없습니다.' };
            }
        
            if (missionInfo.rewardType === 'gold') {
                user.gold += finalAmountToClaim;
            } else {
                user.diamonds += finalAmountToClaim;
            }
        
            // 누적 수령액 증가 (레벨업용)
            missionState.accumulatedCollection = (missionState.accumulatedCollection || 0) + finalAmountToClaim;
            missionState.accumulatedAmount = 0;
            missionState.lastCollectionTime = now; // Reset production timer to now
        
            await db.updateUser(user);
            broadcast({ type: 'USER_UPDATE', payload: { [user.id]: user } });
            return { clientResponse: { updatedUser: user } };
        }
        case 'LEVEL_UP_TRAINING_QUEST': {
            const { missionId } = payload;
            const missionInfo = SINGLE_PLAYER_MISSIONS.find(m => m.id === missionId);
            if (!missionInfo) return { error: '미션을 찾을 수 없습니다.' };
        
            const missionState = user.singlePlayerMissions?.[missionId];
            if (!missionState || !missionState.isStarted) return { error: '미션이 시작되지 않았습니다.' };
            
            const currentLevel = missionState.level || 1;
            if (currentLevel >= 10) return { error: '이미 최대 레벨입니다.' };
            
            const currentLevelInfo = missionInfo.levels[currentLevel - 1];
            if (!currentLevelInfo) return { error: '현재 레벨 정보를 찾을 수 없습니다.' };
            
            // 다음 레벨 오픈조건 확인 (레벨 10의 경우)
            const nextLevelInfo = missionInfo.levels[currentLevel];
            if (nextLevelInfo?.unlockStageId) {
                const clearedStages = (user.clearedSinglePlayerStages || []) as string[];
                if (!clearedStages.includes(nextLevelInfo.unlockStageId)) {
                    return { error: `${nextLevelInfo.unlockStageId} 스테이지를 클리어해야 합니다.` };
                }
            }
            
            // 누적 수령액 확인 (최대생산량 x 현재레벨 x 10)
            const requiredCollection = currentLevelInfo.maxCapacity * currentLevel * 10;
            const accumulatedCollection = missionState.accumulatedCollection || 0;
            
            if (accumulatedCollection < requiredCollection) {
                return { error: `누적 수령액이 부족합니다. (필요: ${requiredCollection}, 현재: ${accumulatedCollection})` };
            }
            
            // 레벨업 비용 계산 및 차감
            let upgradeCost: number;
            if (missionInfo.rewardType === 'gold') {
                upgradeCost = currentLevelInfo.maxCapacity * 5;
            } else {
                upgradeCost = currentLevelInfo.maxCapacity * 1000;
            }
            
            if (missionInfo.rewardType === 'gold') {
                if (user.gold < upgradeCost && !user.isAdmin) {
                    return { error: `골드가 부족합니다. (필요: ${upgradeCost})` };
                }
                if (!user.isAdmin) {
                    user.gold -= upgradeCost;
                }
            } else {
                // 다이아는 골드로 결제
                if (user.gold < upgradeCost && !user.isAdmin) {
                    return { error: `골드가 부족합니다. (필요: ${upgradeCost})` };
                }
                if (!user.isAdmin) {
                    user.gold -= upgradeCost;
                }
            }
            
            // 레벨업
            missionState.level = currentLevel + 1;
            missionState.accumulatedCollection = 0; // 누적 수령액 초기화
            
            // 새 레벨의 초기 생산량 적용
            const newLevelInfo = missionInfo.levels[missionState.level - 1];
            if (newLevelInfo) {
                const initialAmount = Math.min(newLevelInfo.rewardAmount, newLevelInfo.maxCapacity);
                missionState.accumulatedAmount = initialAmount;
                missionState.lastCollectionTime = now;
            }
        
            await db.updateUser(user);
            broadcast({ type: 'USER_UPDATE', payload: { [user.id]: user } });
            return { clientResponse: { updatedUser: user } };
        }
        default:
            return { error: 'Unknown single player action' };
    }
};