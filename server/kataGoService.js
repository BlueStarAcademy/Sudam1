import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { Player } from '../types.js';
import * as types from '../types.js';
// --- Configuration ---
// These paths should be configured for your environment.
// Based on user's log, assuming this structure.
const KATAGO_PATH = 'c:/katago/katago.exe';
const MODEL_PATH = 'c:/katago/kata1-b28c512nbt-s9853922560-d5031756885.bin.gz';
const CONFIG_PATH = path.resolve('server/temp_katago_config.cfg');
const KATAGO_HOME_PATH = path.resolve('server/katago_home');
const LETTERS = "ABCDEFGHJKLMNOPQRST";
const pointToKataGoMove = (p, boardSize) => {
    if (p.x === -1 || p.y === -1) {
        return 'pass';
    }
    if (p.x >= 0 && p.x < LETTERS.length) {
        return `${LETTERS[p.x]}${boardSize - p.y}`;
    }
    return 'pass';
};
const kataGoMoveToPoint = (move, boardSize) => {
    if (move.toLowerCase() === 'pass') {
        return { x: -1, y: -1 };
    }
    const letter = move.charAt(0).toUpperCase();
    const x = LETTERS.indexOf(letter);
    const y = boardSize - parseInt(move.substring(1), 10);
    // Safeguard against malformed move strings from KataGo that could result in y being NaN.
    if (isNaN(y)) {
        console.error(`[KataGo Service] Failed to parse move string: "${move}". It might be an unexpected format. Treating as a pass.`);
        return { x: -1, y: -1 };
    }
    return { x, y };
};
const kataGoResponseToAnalysisResult = (session, response, isWhitesTurn) => {
    const { boardSize } = session.settings;
    const { rootInfo = {}, moveInfos = [], ownership = null } = response;
    const ownershipMap = Array(boardSize).fill(0).map(() => Array(boardSize).fill(0));
    const deadStones = [];
    let blackTerritory = 0;
    let whiteTerritory = 0;
    if (ownership && Array.isArray(ownership) && ownership.length > 0) {
        const ownershipBoardSize = Math.sqrt(ownership.length);
        // Check if the returned ownership map is a perfect square and large enough.
        // This handles cases where KataGo might incorrectly return a 19x19 map for a smaller board.
        if (Number.isInteger(ownershipBoardSize) && ownershipBoardSize >= boardSize) {
            const TERRITORY_THRESHOLD = 0.75;
            const DEAD_STONE_THRESHOLD = 0.75;
            for (let y = 0; y < boardSize; y++) {
                for (let x = 0; x < boardSize; x++) {
                    // Index into the (potentially larger) ownership grid from KataGo
                    const index = y * ownershipBoardSize + x;
                    let ownerProbRaw = ownership[index];
                    let ownerProb = (typeof ownerProbRaw === 'number' && isFinite(ownerProbRaw)) ? ownerProbRaw : 0;
                    // KataGo's ownership is from the current player's perspective.
                    // Positive for current player, negative for opponent.
                    // We want to standardize to Black's perspective (positive for black, negative for white).
                    if (isWhitesTurn) {
                        ownerProb *= -1;
                    }
                    ownershipMap[y][x] = Math.round(ownerProb * 10);
                    const stoneOnBoard = session.boardState[y][x];
                    // Score empty points based on ownership probability
                    if (stoneOnBoard === Player.None) {
                        if (ownerProb > TERRITORY_THRESHOLD) {
                            blackTerritory += 1;
                        }
                        else if (ownerProb < -TERRITORY_THRESHOLD) {
                            whiteTerritory += 1;
                        }
                    }
                    // Identify dead stones for capture count and visualization, based on high ownership certainty
                    if (stoneOnBoard !== Player.None) {
                        if ((stoneOnBoard === Player.Black && ownerProb < -DEAD_STONE_THRESHOLD) || (stoneOnBoard === Player.White && ownerProb > DEAD_STONE_THRESHOLD)) {
                            deadStones.push({ x, y });
                        }
                    }
                }
            }
        }
    }
    const blackDeadCount = deadStones.filter(s => session.boardState[s.y][s.x] === Player.Black).length;
    const whiteDeadCount = deadStones.filter(s => session.boardState[s.y][s.x] === Player.White).length;
    const blackLiveCaptures = session.captures[Player.Black] || 0;
    const whiteLiveCaptures = session.captures[Player.White] || 0;
    const komi = session.finalKomi ?? session.settings.komi;
    // Korean/Territory scoring: Territory (empty points) + Captured stones (live + dead).
    const scoreDetails = {
        black: {
            territory: Math.round(blackTerritory),
            captures: blackLiveCaptures, // "captures" now means live captures
            liveCaptures: blackLiveCaptures,
            deadStones: whiteDeadCount,
            baseStoneBonus: 0, hiddenStoneBonus: 0, timeBonus: 0, itemBonus: 0,
            total: Math.round(blackTerritory) + blackLiveCaptures + whiteDeadCount
        },
        white: {
            territory: Math.round(whiteTerritory),
            captures: whiteLiveCaptures, // "captures" now means live captures
            liveCaptures: whiteLiveCaptures,
            deadStones: blackDeadCount,
            komi, baseStoneBonus: 0, hiddenStoneBonus: 0, timeBonus: 0, itemBonus: 0,
            total: Math.round(whiteTerritory) + whiteLiveCaptures + blackDeadCount + komi
        },
    };
    const recommendedMoves = (moveInfos || [])
        .slice(0, 3)
        .map((info, i) => {
        const winrate = info.winrate || 0;
        const scoreLead = info.scoreLead || 0;
        return {
            ...kataGoMoveToPoint(info.move, boardSize),
            winrate: (isWhitesTurn ? (1 - winrate) : winrate) * 100,
            scoreLead: isWhitesTurn ? -scoreLead : scoreLead,
            order: i + 1,
        };
    });
    const winrateNum = Number(rootInfo.winrate);
    const scoreLeadNum = Number(rootInfo.scoreLead);
    const winRateBlack = isFinite(winrateNum) ? (isWhitesTurn ? (1 - winrateNum) * 100 : winrateNum * 100) : 50;
    const finalScoreLead = isFinite(scoreLeadNum) ? (isWhitesTurn ? -scoreLeadNum : scoreLeadNum) : 0;
    let winRateChange = 0;
    const prevAnalysis = session.previousAnalysisResult?.[session.player1.id] ?? session.previousAnalysisResult?.[session.player2.id];
    if (prevAnalysis) {
        const prevWinrateFloat = prevAnalysis.winRateBlack / 100;
        if (isFinite(prevWinrateFloat)) {
            winRateChange = (winRateBlack / 100 - prevWinrateFloat) * 100;
        }
    }
    return {
        winRateBlack,
        winRateChange: winRateChange,
        scoreLead: finalScoreLead,
        deadStones,
        ownershipMap: (ownership && ownership.length > 0) ? ownershipMap : null,
        recommendedMoves,
        areaScore: { black: scoreDetails.black.total, white: scoreDetails.white.total },
        scoreDetails,
        blackConfirmed: [], whiteConfirmed: [], blackRight: [], whiteRight: [], blackLikely: [], whiteLikely: [],
    };
};
class KataGoManager {
    process = null;
    pendingQueries = new Map();
    stdoutBuffer = '';
    isStarting = false;
    readyPromise = null;
    constructor() {
        // Eager start removed. Will be started lazily on first query.
    }
    start() {
        if (this.readyPromise) {
            return this.readyPromise;
        }
        this.isStarting = true;
        this.readyPromise = new Promise((resolve, reject) => {
            console.log('[KataGo] Lazily attempting to start engine...');
            if (!fs.existsSync(KATAGO_PATH)) {
                const errorMsg = `[KataGo] Engine not found at ${KATAGO_PATH}. Analysis will be unavailable.`;
                console.error(errorMsg);
                this.isStarting = false;
                this.readyPromise = null;
                return reject(new Error(errorMsg));
            }
            try {
                if (!fs.existsSync(KATAGO_HOME_PATH)) {
                    fs.mkdirSync(KATAGO_HOME_PATH, { recursive: true });
                }
            }
            catch (e) {
                const errorMsg = `[KataGo] Failed to create home directory at ${KATAGO_HOME_PATH}: ${e.message}`;
                console.error(errorMsg);
                this.isStarting = false;
                this.readyPromise = null;
                return reject(new Error(errorMsg));
            }
            const configContent = `
logFile = ./katago_analysis_log.txt
homeDataDir = ${KATAGO_HOME_PATH.replace(/\\/g, '/')}
nnMaxBatchSize = 16
analysisPVLen = 10
numAnalysisThreads = 4
numSearchThreads = 8
maxVisits = 1000
            `.trim();
            try {
                fs.writeFileSync(CONFIG_PATH, configContent);
            }
            catch (e) {
                const errorMsg = `[KataGo] Failed to write temporary config file: ${e.message}`;
                console.error(errorMsg);
                this.isStarting = false;
                this.readyPromise = null;
                return reject(new Error(errorMsg));
            }
            try {
                this.process = spawn(KATAGO_PATH, [
                    'analysis',
                    '-model', MODEL_PATH,
                    '-config', CONFIG_PATH,
                ], {
                    cwd: KATAGO_HOME_PATH
                });
            }
            catch (e) {
                const errorMsg = `[KataGo] Failed to spawn process: ${e.message}`;
                console.error(errorMsg);
                this.isStarting = false;
                this.readyPromise = null;
                return reject(new Error(errorMsg));
            }
            this.process.on('spawn', () => {
                console.log('[KataGo] Engine process spawned successfully.');
                this.isStarting = false;
                resolve();
            });
            this.process.stdout?.on('data', (data) => this.processStdoutData(data));
            this.process.stderr?.on('data', (data) => console.error(`[KataGo STDERR] ${data}`));
            this.process.on('exit', (code, signal) => {
                const errorMsg = `[KataGo] Process exited with code ${code}, signal ${signal}.`;
                console.error(errorMsg);
                this.cleanup();
                this.readyPromise = null; // Allow restart
                reject(new Error(errorMsg));
            });
            this.process.on('error', (err) => {
                const errorMsg = `[KataGo] Process error: ${err.message}`;
                console.error(errorMsg);
                this.cleanup();
                this.readyPromise = null;
                reject(new Error(errorMsg));
            });
        });
        return this.readyPromise;
    }
    cleanup() {
        this.isStarting = false;
        this.process = null;
        this.pendingQueries.forEach(({ reject, timeout }) => {
            clearTimeout(timeout);
            reject(new Error("KataGo process exited."));
        });
        this.pendingQueries.clear();
    }
    processStdoutData(data) {
        this.stdoutBuffer += data.toString();
        let newlineIndex;
        while ((newlineIndex = this.stdoutBuffer.indexOf('\n')) !== -1) {
            const line = this.stdoutBuffer.substring(0, newlineIndex);
            this.stdoutBuffer = this.stdoutBuffer.substring(newlineIndex + 1);
            if (line.trim()) {
                try {
                    const response = JSON.parse(line);
                    const query = this.pendingQueries.get(response.id);
                    if (query) {
                        clearTimeout(query.timeout);
                        query.resolve(response);
                        this.pendingQueries.delete(response.id);
                    }
                }
                catch (e) {
                    // console.error('[KataGo] Error parsing JSON from stdout:', line);
                }
            }
        }
    }
    async query(analysisQuery) {
        if (!this.process) {
            try {
                await this.start();
            }
            catch (e) {
                // If start() fails (e.g., file not found), reject the query.
                return Promise.reject(e);
            }
        }
        return new Promise((resolve, reject) => {
            const id = analysisQuery.id;
            const timeout = setTimeout(() => {
                this.pendingQueries.delete(id);
                reject(new Error(`KataGo query ${id} timed out after 30 seconds.`));
            }, 30000);
            this.pendingQueries.set(id, { resolve, reject, timeout });
            this.process?.stdin?.write(JSON.stringify(analysisQuery) + '\n', (err) => {
                if (err) {
                    console.error('[KataGo] Write to stdin error:', err);
                    clearTimeout(timeout);
                    this.pendingQueries.delete(id);
                    reject(err);
                }
            });
        });
    }
}
let kataGoManager = null;
const getKataGoManager = () => {
    if (!kataGoManager) {
        kataGoManager = new KataGoManager();
    }
    return kataGoManager;
};
export const analyzeGame = async (session, options) => {
    // Only modes that alter past moves (like missile go) or have a pre-set board (single player) need to send the full board state.
    const useBoardStateForAnalysis = session.mode === types.GameMode.Missile ||
        (session.mode === types.GameMode.Mix && session.settings.mixedModes?.includes(types.GameMode.Missile)) ||
        session.isSinglePlayer;
    let query;
    let isCurrentPlayerWhite;
    if (useBoardStateForAnalysis) {
        // For these modes, send the current board state directly.
        const initialStones = [];
        for (let y = 0; y < session.settings.boardSize; y++) {
            for (let x = 0; x < session.settings.boardSize; x++) {
                if (session.boardState[y][x] !== types.Player.None) {
                    initialStones.push([
                        session.boardState[y][x] === types.Player.Black ? 'B' : 'W',
                        pointToKataGoMove({ x, y }, session.settings.boardSize)
                    ]);
                }
            }
        }
        isCurrentPlayerWhite = session.currentPlayer === types.Player.White;
        query = {
            id: `query-${randomUUID()}`,
            initialStones: initialStones,
            initialPlayer: isCurrentPlayerWhite ? 'W' : 'B',
            moves: [], // No moves, since we provided the final state.
            rules: "korean",
            komi: session.finalKomi ?? session.settings.komi,
            boardXSize: session.settings.boardSize,
            boardYSize: session.settings.boardSize,
            maxVisits: options?.maxVisits ?? 1000,
            includePolicy: true,
            includeOwnership: true,
        };
    }
    else {
        // For standard games, send the move history.
        const moves = session.moveHistory.map(move => [
            move.player === Player.Black ? 'B' : 'W',
            pointToKataGoMove({ x: move.x, y: move.y }, session.settings.boardSize)
        ]);
        isCurrentPlayerWhite = moves.length % 2 !== 0;
        query = {
            id: `query-${randomUUID()}`,
            moves: moves,
            rules: "korean",
            komi: session.finalKomi ?? session.settings.komi,
            boardXSize: session.settings.boardSize,
            boardYSize: session.settings.boardSize,
            maxVisits: options?.maxVisits ?? 1000,
            includePolicy: true,
            includeOwnership: true,
        };
    }
    try {
        const response = await getKataGoManager().query(query);
        return kataGoResponseToAnalysisResult(session, response, isCurrentPlayerWhite);
    }
    catch (error) {
        console.error('[KataGo] Analysis query failed:', error);
        // Fallback to a default "error" state analysis result
        return {
            winRateBlack: 50,
            winRateChange: 0,
            scoreLead: 0,
            deadStones: [], ownershipMap: null, recommendedMoves: [],
            areaScore: { black: 0, white: 0 },
            scoreDetails: {
                black: { territory: 0, captures: 0, liveCaptures: 0, deadStones: 0, baseStoneBonus: 0, hiddenStoneBonus: 0, timeBonus: 0, itemBonus: 0, total: 0 },
                white: { territory: 0, captures: 0, liveCaptures: 0, deadStones: 0, komi: 0, baseStoneBonus: 0, hiddenStoneBonus: 0, timeBonus: 0, itemBonus: 0, total: 0 },
            },
            blackConfirmed: [], whiteConfirmed: [], blackRight: [], whiteRight: [], blackLikely: [], whiteLikely: [],
        };
    }
};
