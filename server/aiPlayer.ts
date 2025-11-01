import { User, GameMode, LiveGameSession, Player, Point, AlkkagiStone, BoardState, Equipment, InventoryItem, LeagueTier, CoreStat, RecommendedMove } from '../types.js';
import { defaultStats, createDefaultInventory, createDefaultQuests, createDefaultBaseStats, createDefaultSpentStatPoints } from './initialData.js';
import { getOmokLogic } from './omokLogic.js';
import { getGoLogic, processMove } from './goLogic.js';
import { DICE_GO_MAIN_ROLL_TIME, DICE_GO_LAST_CAPTURE_BONUS_BY_TOTAL_ROUNDS, ALKKAGI_PLACEMENT_TIME_LIMIT, ALKKAGI_TURN_TIME_LIMIT, KATAGO_LEVEL_TO_MAX_VISITS, SPECIAL_GAME_MODES, SINGLE_PLAYER_STAGES, ALKKAGI_SIMULTANEOUS_PLACEMENT_TIME_LIMIT, CURLING_TURN_TIME_LIMIT, BATTLE_PLACEMENT_ZONES } from '../constants.js';
import * as types from '../types.js';
import { analyzeGame } from './kataGoService.js';
import * as summaryService from './summaryService.js';


export const aiUserId = 'ai-player-01';

const aiInventory = createDefaultInventory();
const aiEquipment = aiInventory
    .filter(item => item.isEquipped)
    .reduce((acc, item) => {
        if(item.slot) acc[item.slot] = item.name;
        return acc;
    }, {} as Equipment);

const baseAiUser: Omit<User, 'nickname'> = {
    id: aiUserId,
    username: 'ai_bot',
    isAdmin: false,
    strategyLevel: 50,
    strategyXp: 0,
    playfulLevel: 50,
    playfulXp: 0,
    baseStats: createDefaultBaseStats(),
    spentStatPoints: createDefaultSpentStatPoints(),
    inventory: aiInventory,
    inventorySlots: { equipment: 40, consumable: 40, material: 40 },
    equipment: aiEquipment,
    actionPoints: { current: 999, max: 999 },
    lastActionPointUpdate: Date.now(),
    actionPointPurchasesToday: 0,
    lastActionPointPurchaseDate: 0,
    dailyShopPurchases: {},
    gold: 99999,
    diamonds: 9999,
    mannerScore: 200,
    mail: [],
    quests: createDefaultQuests(),
    stats: JSON.parse(JSON.stringify(defaultStats)),
    avatarId: 'default',
    borderId: 'default',
    ownedBorders: ['default'],
    tournamentScore: 2250,
    league: types.LeagueTier.Challenger,
};

const aiNicknames: Record<GameMode, string> = {
    [GameMode.Standard]: '클래식바둑봇',
    [GameMode.Capture]: '따내기바둑봇',
    [GameMode.Speed]: '스피드바둑봇',
    [GameMode.Base]: '베이스바둑봇',
    [GameMode.Hidden]: '히든바둑봇',
    [GameMode.Missile]: '미사일바둑봇',
    [GameMode.Mix]: '믹스룰바둑봇',
    [GameMode.Dice]: '주사위바둑봇',
    [GameMode.Omok]: '오목봇',
    [GameMode.Ttamok]: '따목봇',
    [GameMode.Thief]: '도둑과 경찰봇',
    [GameMode.Alkkagi]: '알까기봇',
    [GameMode.Curling]: '바둑 컬링',
};

export const getAiUser = (mode: GameMode): User => {
    return {
        ...baseAiUser,
        nickname: aiNicknames[mode] || 'AI 봇',
    };
};

const makeSimpleCaptureAiMove = (game: types.LiveGameSession) => {
    const difficulty = game.settings.aiDifficulty ?? 1;
    const probability = difficulty / 10.0;
    const aiPlayer = game.currentPlayer;
    const humanPlayer = aiPlayer === types.Player.Black ? types.Player.White : types.Player.Black;
    const logic = getGoLogic(game);
    const boardSize = game.settings.boardSize;
    const now = Date.now();

    const applyMove = (move: Point) => {
        const result = processMove(game.boardState, { ...move, player: aiPlayer }, game.koInfo, game.moveHistory.length, { ignoreSuicide: true });
        if (!result.isValid) {
            console.error(`[Simple AI] Invalid move generated: ${JSON.stringify(move)} for game ${game.id}. Reason: ${result.reason}`);
            return;
        }
        
        game.boardState = result.newBoardState;
        game.lastMove = move;
        game.moveHistory.push({ player: aiPlayer, ...move });
        game.koInfo = result.newKoInfo;
        game.passCount = move.x === -1 ? game.passCount + 1 : 0;

        if (result.capturedStones.length > 0) {
            if (!game.justCaptured) game.justCaptured = [];
            for (const stone of result.capturedStones) {
                const wasPatternStone = (humanPlayer === Player.Black && game.blackPatternStones?.some(p => p.x === stone.x && p.y === stone.y)) ||
                                        (humanPlayer === Player.White && game.whitePatternStones?.some(p => p.x === stone.x && p.y === stone.y));
                const points = wasPatternStone ? 2 : 1;
                game.captures[aiPlayer] += points;
                game.justCaptured.push({ point: stone, player: humanPlayer, wasHidden: false });
            }
        }
        
        if (game.captures[aiPlayer] >= game.settings.captureTarget!) {
            summaryService.endGame(game, aiPlayer, 'capture_limit');
            return;
        }
        
        game.currentPlayer = humanPlayer;
        game.turnStartTime = now;
        const stage = SINGLE_PLAYER_STAGES.find(s => s.id === game.stageId);
        if(stage) {
            if (stage.timeControl.type === 'byoyomi') {
                 game.turnDeadline = now + (stage.timeControl.mainTime * 60 * 1000);
            } else { // fischer
                 game.turnDeadline = now + (stage.timeControl.mainTime * 60 * 1000);
            }
        } else {
            game.turnDeadline = now + 300 * 1000; // 5 min fallback
        }
    };

    const findValidMoves = (board: types.BoardState, player: Player): Point[] => {
        const moves: Point[] = [];
        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                if (board[y][x] === types.Player.None) {
                    const res = processMove(board, { x, y, player }, game.koInfo, game.moveHistory.length);
                    if (res.isValid) {
                        moves.push({ x, y });
                    }
                }
            }
        }
        return moves;
    };

    const allValidAiMoves = findValidMoves(game.boardState, aiPlayer);
    if (allValidAiMoves.length === 0) {
        applyMove({ x: -1, y: -1 });
        return;
    }

    // 1. Winning Capture
    if (Math.random() < probability) {
        const winningMoves = allValidAiMoves.filter(move => {
            const res = processMove(game.boardState, { ...move, player: aiPlayer }, game.koInfo, game.moveHistory.length);
            return res.isValid && (game.captures[aiPlayer] + res.capturedStones.length * (res.capturedStones.some(s => game.whitePatternStones?.some(p => p.x === s.x && p.y === s.y)) ? 2 : 1)) >= game.settings.captureTarget!;
        });
        if (winningMoves.length > 0) {
            applyMove(winningMoves[Math.floor(Math.random() * winningMoves.length)]);
            return;
        }
    }
    
    // 2. Block Opponent's Winning Capture
    if (Math.random() < probability) {
        const opponentWinningMoves = findValidMoves(game.boardState, humanPlayer).filter(move => {
            const res = processMove(game.boardState, { ...move, player: humanPlayer }, game.koInfo, game.moveHistory.length);
            return res.isValid && (game.captures[humanPlayer] + res.capturedStones.length * (res.capturedStones.some(s => game.blackPatternStones?.some(p => p.x === s.x && p.y === s.y)) ? 2 : 1)) >= game.settings.captureTarget!;
        });

        if (opponentWinningMoves.length > 0) {
            const blockMove = opponentWinningMoves[Math.floor(Math.random() * opponentWinningMoves.length)];
             if (allValidAiMoves.some(m => m.x === blockMove.x && m.y === blockMove.y)) {
                applyMove(blockMove);
                return;
             }
        }
    }

    // 3. Maximize Capture
    if (Math.random() < probability) {
        let maxCapture = 0;
        let maxCaptureMoves: Point[] = [];
        allValidAiMoves.forEach(move => {
            const res = processMove(game.boardState, { ...move, player: aiPlayer }, game.koInfo, game.moveHistory.length);
            if (res.isValid && res.capturedStones.length > 0) {
                const captureScore = res.capturedStones.reduce((acc, stone) => {
                    const isPattern = game.whitePatternStones?.some(p => p.x === stone.x && p.y === stone.y);
                    return acc + (isPattern ? 2 : 1);
                }, 0);
                if (captureScore > maxCapture) {
                    maxCapture = captureScore;
                    maxCaptureMoves = [move];
                } else if (captureScore === maxCapture) {
                    maxCaptureMoves.push(move);
                }
            }
        });
        if (maxCaptureMoves.length > 0) {
            applyMove(maxCaptureMoves[Math.floor(Math.random() * maxCaptureMoves.length)]);
            return;
        }
    }
    
    // 4. Atari opponent
    if (Math.random() < probability) {
        const potentialAtariMoves = allValidAiMoves.filter(move => {
            const tempBoard = JSON.parse(JSON.stringify(game.boardState));
            tempBoard[move.y][move.x] = aiPlayer;
            const tempLogic = getGoLogic({ ...game, boardState: tempBoard });
            for(const neighbor of logic.getNeighbors(move.x, move.y)) {
                if(tempBoard[neighbor.y][neighbor.x] === humanPlayer) {
                    const group = tempLogic.findGroup(neighbor.x, neighbor.y, humanPlayer, tempBoard);
                    if (group && group.liberties === 1) return true;
                }
            }
            return false;
        });

        if (potentialAtariMoves.length > 0) {
            applyMove(potentialAtariMoves[Math.floor(Math.random() * potentialAtariMoves.length)]);
            return;
        }
    }
    
    // 5. Save own atari group
    if (Math.random() < probability) {
        const myAtariGroups = logic.getAllGroups(aiPlayer, game.boardState).filter(g => g.liberties === 1);
        if (myAtariGroups.length > 0) {
            const libertyKey = myAtariGroups[0].libertyPoints.values().next().value;
            if (libertyKey) {
                const [x, y] = libertyKey.split(',').map(Number);
                const savingMove = {x, y};
                if(allValidAiMoves.some(m => m.x === savingMove.x && m.y === savingMove.y)) {
                    applyMove(savingMove);
                    return;
                }
            }
        }
    }
    
    // 6. Random adjacent move
    const adjacentMoves: Point[] = [];
    const occupiedPoints: Point[] = [];
    for(let y=0; y<boardSize; y++) {
        for(let x=0; x<boardSize; x++) {
            if (game.boardState[y][x] !== Player.None) {
                occupiedPoints.push({x, y});
            }
        }
    }
    occupiedPoints.forEach(p => {
        logic.getNeighbors(p.x, p.y).forEach(n => {
            if (allValidAiMoves.some(m => m.x === n.x && m.y === n.y) && !adjacentMoves.some(m => m.x === n.x && m.y === n.y)) {
                adjacentMoves.push(n);
            }
        });
    });

    if (adjacentMoves.length > 0) {
        applyMove(adjacentMoves[Math.floor(Math.random() * adjacentMoves.length)]);
        return;
    }

    // 7. Fully random valid move
    applyMove(allValidAiMoves[Math.floor(Math.random() * allValidAiMoves.length)]);
};


const makeStrategicAiMove = async (game: types.LiveGameSession) => {
    const aiPlayerEnum = game.currentPlayer;
    const opponentPlayerEnum = aiPlayerEnum === types.Player.Black ? types.Player.White : types.Player.Black;
    const now = Date.now();

    // 1. Get analysis from KataGo
    const maxVisits = KATAGO_LEVEL_TO_MAX_VISITS[game.settings.aiDifficulty || 2] || 10;
    const analysis = await analyzeGame(game, { maxVisits });
    const recommendedMoves = analysis.recommendedMoves || [];
    
    let move: RecommendedMove | undefined;
    let result: ReturnType<typeof processMove> | null = null;
    
    // 2. Iterate through recommended moves to find a valid one
    for (const recommendedMove of recommendedMoves) {
        // Handle pass move explicitly, as processMove will reject it.
        if (recommendedMove.x === -1 && recommendedMove.y === -1) {
            move = recommendedMove;
            result = {
                isValid: true,
                newBoardState: JSON.parse(JSON.stringify(game.boardState)), // Pass doesn't change the board
                capturedStones: [],
                newKoInfo: null // Pass resolves ko
            };
            break;
        }

        const moveAttempt = { x: recommendedMove.x, y: recommendedMove.y, player: aiPlayerEnum };
        
        const validationResult = processMove(
            game.boardState,
            moveAttempt,
            game.koInfo,
            game.moveHistory.length
        );

        if (validationResult.isValid) {
            move = recommendedMove;
            result = validationResult;
            break; // Found a valid move
        } else {
            console.warn(`[AI] KataGo recommended invalid move ${JSON.stringify(recommendedMove)} because: ${validationResult.reason}. Trying next best move.`);
        }
    }
    
    // 3. If the chosen valid move is a pass, double-check if we should really pass.
    if (move && move.x === -1 && move.y === -1) {
        console.log('[AI] KataGo suggested a pass. Checking for liberty-blocking moves instead.');
        const logic = getGoLogic(game);
        const opponentLiberties = logic.getAllLibertiesOfPlayer(opponentPlayerEnum, game.boardState);
        let validBlockingMove: Point | null = null;

        if (opponentLiberties.length > 0) {
            for (const liberty of opponentLiberties.sort(() => 0.5 - Math.random())) {
                const validationResult = processMove(game.boardState, { ...liberty, player: aiPlayerEnum }, game.koInfo, game.moveHistory.length, { ignoreSuicide: true });
                if (validationResult.isValid) {
                    validBlockingMove = liberty;
                    result = validationResult;
                    move = { ...validBlockingMove, winrate: 0, scoreLead: 0, order: 0 };
                    break;
                }
            }
        }
        
        if (validBlockingMove) {
            console.log(`[AI] Found a liberty-blocking move at ${JSON.stringify(validBlockingMove)}. Playing there instead of passing.`);
        } else {
            console.log('[AI] No blocking moves found. Proceeding with pass.');
        }
    }


    // 4. If no valid move was found from KataGo's suggestions, search for ANY valid move before resigning.
    if (!result) {
        console.warn(`[AI] KataGo's suggestions were all invalid. Searching for any valid move on the board.`);
        const emptyPoints: Point[] = [];
        for (let y = 0; y < game.settings.boardSize; y++) {
            for (let x = 0; x < game.settings.boardSize; x++) {
                if (game.boardState[y][x] === Player.None) {
                    emptyPoints.push({ x, y });
                }
            }
        }
    
        // Shuffle and try to find a valid move
        emptyPoints.sort(() => 0.5 - Math.random()); 
    
        for (const point of emptyPoints) {
            const moveAttempt = { ...point, player: aiPlayerEnum };
            const validationResult = processMove(
                game.boardState,
                moveAttempt,
                game.koInfo,
                game.moveHistory.length
            );
    
            if (validationResult.isValid) {
                console.log(`[AI] Found a fallback valid move at ${JSON.stringify(point)}.`);
                move = { ...point, winrate: 0, scoreLead: 0, order: 99 };
                result = validationResult;
                break;
            }
        }
    
        // If still no valid move after checking all empty spots, THEN resign.
        if (!result) {
            console.error(`[AI Error] AI could not find ANY valid move on the entire board. Resigning.`);
            await summaryService.endGame(game, opponentPlayerEnum, 'resign');
            return;
        }
    }
    
    // 5. Process the final valid move
    game.boardState = result.newBoardState;
    game.lastMove = { x: move!.x, y: move!.y };
    game.moveHistory.push({ player: aiPlayerEnum, x: move!.x, y: move!.y });
    game.koInfo = result.newKoInfo;

    if (move!.x === -1 && move!.y === -1) {
        game.passCount++;
        if (game.passCount >= 2) {
             await summaryService.endGame(game, types.Player.None, 'score');
             return;
        }
    } else {
        game.passCount = 0;
    }

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
    
    if (game.isSinglePlayer || game.mode === types.GameMode.Capture) {
        const target = game.effectiveCaptureTargets![aiPlayerEnum];
        if (game.captures[aiPlayerEnum] >= target) {
            await summaryService.endGame(game, aiPlayerEnum, 'capture_limit');
            return;
        }
    }

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
};

// FIX: Implement missing AI functions
const makeDiceGoAiMove = (game: types.LiveGameSession) => {};
const makeOmokAiMove = (game: types.LiveGameSession) => {};
const makeThiefAiMove = (game: types.LiveGameSession) => {};
const makeAlkkagiAiMove = (game: types.LiveGameSession) => {};
const makeCurlingAiMove = (game: types.LiveGameSession) => {};


export const makeAiMove = async (game: LiveGameSession) => {
    if (game.isSinglePlayer) {
        makeSimpleCaptureAiMove(game);
        return;
    }

    const strategicModes: GameMode[] = [
        types.GameMode.Standard,
        types.GameMode.Capture,
        types.GameMode.Speed,
        types.GameMode.Base,
        types.GameMode.Hidden,
        types.GameMode.Missile,
        types.GameMode.Mix
    ];

    if (strategicModes.includes(game.mode)) {
        await makeStrategicAiMove(game);
        return;
    }
    
    switch (game.mode) {
        case types.GameMode.Dice:
            makeDiceGoAiMove(game);
            break;
        case types.GameMode.Omok:
        case types.GameMode.Ttamok:
            makeOmokAiMove(game);
            break;
        case types.GameMode.Alkkagi:
            makeAlkkagiAiMove(game);
            break;
        case types.GameMode.Curling:
            makeCurlingAiMove(game);
            break;
        case types.GameMode.Thief:
            makeThiefAiMove(game);
            break;
    }
};