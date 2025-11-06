import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { LiveGameSession, AnalysisResult, Player, Point, RecommendedMove } from '../types.js';
import * as types from '../types.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 프로젝트 루트 기준으로 경로 설정 (process.cwd() 사용)
const PROJECT_ROOT = process.cwd();
const KATAGO_PATH = path.resolve(PROJECT_ROOT, 'katago/katago.exe');
const MODEL_PATH = path.resolve(PROJECT_ROOT, 'katago/kata1-b28c512nbt-s9853922560-d5031756885.bin.gz');
const CONFIG_PATH = path.resolve(__dirname, './temp_katago_config.cfg');
const KATAGO_HOME_PATH = path.resolve(__dirname, './katago_home');

const LETTERS = "ABCDEFGHJKLMNOPQRST";

const pointToKataGoMove = (p: Point, boardSize: number): string => {
    if (p.x === -1 || p.y === -1) {
        return 'pass';
    }
    if (p.x >= 0 && p.x < LETTERS.length) {
        return `${LETTERS[p.x]}${boardSize - p.y}`;
    }
    return 'pass';
};

const kataGoMoveToPoint = (move: string, boardSize: number): Point => {
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

const kataGoResponseToAnalysisResult = (session: LiveGameSession, response: any, isWhitesTurn: boolean): AnalysisResult => {
    const { boardSize } = session.settings;
    const { rootInfo = {}, moveInfos = [], ownership = null } = response;

    const ownershipMap: number[][] = Array(boardSize).fill(0).map(() => Array(boardSize).fill(0));
    const deadStones: Point[] = [];
    
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
                        } else if (ownerProb < -TERRITORY_THRESHOLD) {
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
    
    const recommendedMoves: RecommendedMove[] = (moveInfos || [])
        .slice(0, 3)
        .map((info: any, i: number) => {
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
    private process: ChildProcess | null = null;
    private pendingQueries = new Map<string, { resolve: (value: any) => void, reject: (reason?: any) => void, timeout: any }>();
    private stdoutBuffer = '';
    private isStarting = false;
    private readyPromise: Promise<void> | null = null;

    constructor() {
        // Eager start removed. Will be started lazily on first query.
    }

    private start(): Promise<void> {
        if (this.readyPromise) {
            return this.readyPromise;
        }

        this.isStarting = true;
        this.readyPromise = new Promise<void>((resolve, reject) => {
            console.log('[KataGo] Lazily attempting to start engine...');

            // 경로 확인 및 로깅
            console.log(`[KataGo] Checking path: ${KATAGO_PATH}`);
            console.log(`[KataGo] __dirname: ${__dirname}`);
            console.log(`[KataGo] Path exists: ${fs.existsSync(KATAGO_PATH)}`);
            
            if (!fs.existsSync(KATAGO_PATH)) {
                // 대체 경로 시도
                const altPath = path.resolve(process.cwd(), 'katago/katago.exe');
                console.log(`[KataGo] Trying alternative path: ${altPath}`);
                if (fs.existsSync(altPath)) {
                    console.log(`[KataGo] Using alternative path: ${altPath}`);
                    // KATAGO_PATH를 동적으로 변경할 수 없으므로, 직접 경로 사용
                    const errorMsg = `[KataGo] Engine not found at ${KATAGO_PATH}. Please check the path. Expected: ${altPath}`;
                    console.error(errorMsg);
                    this.isStarting = false;
                    this.readyPromise = null;
                    return reject(new Error(errorMsg));
                }
                
                const errorMsg = `[KataGo] Engine not found at ${KATAGO_PATH}. Analysis will be unavailable.`;
                console.error(errorMsg);
                this.isStarting = false;
                this.readyPromise = null;
                return reject(new Error(errorMsg));
            }
            
            console.log(`[KataGo] Engine found at ${KATAGO_PATH}`);
            
            try {
                if (!fs.existsSync(KATAGO_HOME_PATH)) {
                    fs.mkdirSync(KATAGO_HOME_PATH, { recursive: true });
                }
            } catch (e: any) {
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
            } catch (e: any) {
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
            } catch (e: any) {
                const errorMsg = `[KataGo] Failed to spawn process: ${e.message}`;
                console.error(errorMsg);
                this.isStarting = false;
                this.readyPromise = null;
                return reject(new Error(errorMsg));
            }

            this.process.on('spawn', () => {
                console.log('[KataGo] Engine process spawned successfully.');
                // KataGo가 실제로 준비될 때까지 약간의 대기 시간 필요
                setTimeout(() => {
                    this.isStarting = false;
                    resolve();
                }, 2000); // 2초 대기
            });

            this.process.stdout?.on('data', (data) => {
                this.processStdoutData(data);
            });
            this.process.stderr?.on('data', (data) => {
                const stderrText = data.toString();
                // 중요하지 않은 메시지 필터링
                if (!stderrText.includes('INFO:') && !stderrText.includes('WARNING:')) {
                    console.error(`[KataGo STDERR] ${stderrText}`);
                }
            });
            
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

    private cleanup() {
        this.isStarting = false;
        this.process = null;
        this.pendingQueries.forEach(({ reject, timeout }) => {
            clearTimeout(timeout);
            reject(new Error("KataGo process exited."));
        });
        this.pendingQueries.clear();
    }

    private processStdoutData(data: any) {
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
                        console.log(`[KataGo] Received response for query ${response.id}`);
                        clearTimeout(query.timeout);
                        query.resolve(response);
                        this.pendingQueries.delete(response.id);
                    } else {
                        // 응답받았지만 대기 중인 쿼리가 없는 경우 (이미 타임아웃됨)
                        console.warn(`[KataGo] Received response for unknown query ${response.id}`);
                    }
                } catch (e) {
                    // JSON 파싱 실패는 일반적인 로그 라인이거나 에러 메시지일 수 있음
                    // 중요한 메시지만 로깅
                    if (line.includes('error') || line.includes('Error') || line.includes('ERROR')) {
                        console.error('[KataGo] Error line from stdout:', line);
                    } else if (line.includes('id') && line.includes('query')) {
                        // JSON처럼 보이지만 파싱 실패한 경우 로깅
                        console.warn('[KataGo] Failed to parse response line:', line.substring(0, 100));
                    }
                }
            }
        }
    }

    public async query(analysisQuery: any): Promise<any> {
        if (!this.process) {
            try {
                await this.start();
            } catch (e: any) {
                // If start() fails (e.g., file not found), reject the query.
                console.error('[KataGo] Failed to start:', e);
                return Promise.reject(e);
            }
        }

        // 프로세스가 준비되지 않았으면 대기
        if (!this.process || !this.process.stdin) {
            console.error('[KataGo] Process or stdin is not available.');
            return Promise.reject(new Error('KataGo process is not ready.'));
        }

        return new Promise((resolve, reject) => {
            const id = analysisQuery.id;
            console.log(`[KataGo] Sending query ${id}...`);
            
            const timeout = setTimeout(() => {
                console.error(`[KataGo] Query ${id} timed out after 60 seconds.`);
                this.pendingQueries.delete(id);
                reject(new Error(`KataGo query ${id} timed out after 60 seconds.`));
            }, 60000); // 60초로 증가 (계가에 더 많은 시간 필요)
            
            this.pendingQueries.set(id, { resolve, reject, timeout });
            
            try {
                const queryString = JSON.stringify(analysisQuery) + '\n';
                const written = this.process.stdin!.write(queryString, (err) => {
                    if (err) {
                        console.error('[KataGo] Write to stdin error:', err);
                        clearTimeout(timeout);
                        this.pendingQueries.delete(id);
                        reject(err);
                    } else {
                        console.log(`[KataGo] Query ${id} sent successfully.`);
                    }
                });
                
                if (!written) {
                    // 버퍼가 가득 찬 경우
                    console.log('[KataGo] stdin buffer full, waiting for drain...');
                    this.process.stdin!.once('drain', () => {
                        console.log('[KataGo] stdin buffer drained');
                    });
                }
            } catch (err: any) {
                console.error('[KataGo] Error writing to stdin:', err);
                clearTimeout(timeout);
                this.pendingQueries.delete(id);
                reject(err);
            }
        });
    }
}

let kataGoManager: KataGoManager | null = null;

const getKataGoManager = (): KataGoManager => {
    if (!kataGoManager) {
        kataGoManager = new KataGoManager();
    }
    return kataGoManager;
};

export const analyzeGame = async (session: LiveGameSession, options?: { maxVisits?: number }): Promise<AnalysisResult> => {
    // Only modes that alter past moves (like missile go) or have a pre-set board (single player) need to send the full board state.
    const useBoardStateForAnalysis = session.mode === types.GameMode.Missile ||
                                   (session.mode === types.GameMode.Mix && session.settings.mixedModes?.includes(types.GameMode.Missile)) ||
                                   session.isSinglePlayer;

    let query: any;
    let isCurrentPlayerWhite: boolean;

    if (useBoardStateForAnalysis) {
        // For these modes, send the current board state directly.
        const initialStones: [string, string][] = [];
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
    } else {
        // For standard games, send the move history.
        const moves: [string, string][] = session.moveHistory.map(move => [
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
    } catch (error) {
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