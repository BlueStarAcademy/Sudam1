import { randomUUID } from 'crypto';
import * as db from '../db.js';
import { Player, GameMode, UserStatus } from '../../types.js';
import { SINGLE_PLAYER_STAGES, SINGLE_PLAYER_MISSIONS } from '../../constants/singlePlayerConstants';
import { getAiUser } from '../aiPlayer.js';
// Helper function to place stones randomly without overlap
const placeStonesOnBoard = (board, boardSize, count, player) => {
    const placedStones = [];
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
const generateSinglePlayerBoard = (stage) => {
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
export const handleSinglePlayerAction = async (volatileState, action, user) => {
    const { type, payload } = action;
    const now = Date.now();
    switch (type) {
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
            const aiUser = getAiUser(GameMode.Capture);
            const { board, blackPattern, whitePattern } = generateSinglePlayerBoard(stage);
            const gameId = `sp-game-${randomUUID()}`;
            const game = {
                id: gameId,
                mode: GameMode.Capture,
                isSinglePlayer: true,
                stageId: stage.id,
                isAiGame: true,
                settings: {
                    boardSize: stage.boardSize,
                    komi: 0.5,
                    timeLimit: stage.timeControl.mainTime,
                    byoyomiTime: stage.timeControl.byoyomiTime ?? 0,
                    byoyomiCount: stage.timeControl.byoyomiCount ?? 0,
                    timeIncrement: stage.timeControl.increment ?? 0,
                    captureTarget: stage.targetScore.black, // Default for display, effective targets used in logic
                    aiDifficulty: stage.katagoLevel,
                },
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
                blackTimeLeft: stage.timeControl.mainTime * 60,
                whiteTimeLeft: stage.timeControl.mainTime * 60,
                blackByoyomiPeriodsLeft: stage.timeControl.byoyomiCount ?? 0,
                whiteByoyomiPeriodsLeft: stage.timeControl.byoyomiCount ?? 0,
                turnStartTime: now,
                turnDeadline: now + (stage.timeControl.mainTime * 60 * 1000),
                effectiveCaptureTargets: {
                    // FIX: Changed 'types.Player' to 'Player' to match the imported symbols and resolve 'Cannot find name' errors.
                    [Player.None]: 0,
                    // FIX: Changed 'types.Player' to 'Player' to match the imported symbols and resolve 'Cannot find name' errors.
                    [Player.Black]: stage.targetScore.black,
                    // FIX: Changed 'types.Player' to 'Player' to match the imported symbols and resolve 'Cannot find name' errors.
                    [Player.White]: stage.targetScore.white,
                },
                singlePlayerPlacementRefreshesUsed: 0,
            };
            await db.saveGame(game);
            await db.updateUser(user);
            volatileState.userStatuses[user.id] = { status: UserStatus.InGame, mode: game.mode, gameId: game.id };
            return {};
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
            if (!missionInfo)
                return { error: '미션을 찾을 수 없습니다.' };
            if (!user.singlePlayerMissions)
                user.singlePlayerMissions = {};
            if (user.singlePlayerMissions[missionId]?.isStarted)
                return { error: '이미 시작된 미션입니다.' };
            const unlockStageIndex = SINGLE_PLAYER_STAGES.findIndex(s => s.id === missionInfo.unlockStageId);
            if ((user.singlePlayerProgress ?? 0) <= unlockStageIndex)
                return { error: '미션이 아직 잠겨있습니다.' };
            const initialAmount = Math.min(missionInfo.rewardAmount, missionInfo.maxCapacity);
            user.singlePlayerMissions[missionId] = {
                id: missionId,
                isStarted: true,
                lastCollectionTime: now,
                accumulatedAmount: initialAmount,
            };
            await db.updateUser(user);
            return { clientResponse: { updatedUser: user } };
        }
        case 'CLAIM_SINGLE_PLAYER_MISSION_REWARD': {
            const { missionId } = payload;
            const missionInfo = SINGLE_PLAYER_MISSIONS.find(m => m.id === missionId);
            if (!missionInfo)
                return { error: '미션을 찾을 수 없습니다.' };
            const missionState = user.singlePlayerMissions?.[missionId];
            if (!missionState || !missionState.isStarted)
                return { error: '미션이 시작되지 않았습니다.' };
            // Recalculate amount accumulated since last server tick, before claiming
            const elapsedMs = now - missionState.lastCollectionTime;
            const productionIntervalMs = missionInfo.productionRateMinutes * 60 * 1000;
            let finalAmountToClaim = missionState.accumulatedAmount;
            if (productionIntervalMs > 0 && elapsedMs > 0) {
                const cycles = Math.floor(elapsedMs / productionIntervalMs);
                if (cycles > 0) {
                    const generatedAmount = cycles * missionInfo.rewardAmount;
                    finalAmountToClaim = Math.min(missionInfo.maxCapacity, missionState.accumulatedAmount + generatedAmount);
                }
            }
            if (finalAmountToClaim < 1) {
                return { error: '수령할 보상이 없습니다.' };
            }
            if (missionInfo.rewardType === 'gold') {
                user.gold += finalAmountToClaim;
            }
            else {
                user.diamonds += finalAmountToClaim;
            }
            missionState.accumulatedAmount = 0;
            missionState.lastCollectionTime = now; // Reset production timer to now
            await db.updateUser(user);
            return { clientResponse: { updatedUser: user } };
        }
        default:
            return { error: 'Unknown single player action' };
    }
};
