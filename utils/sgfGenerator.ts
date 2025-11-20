import { LiveGameSession, User, Player, GameMode, Point, Move } from '../types.js';
import { SPECIAL_GAME_MODES } from '../constants/gameModes.js';

/**
 * 좌표를 SGF 형식(a-s)으로 변환
 */
const coordToSgf = (x: number, y: number): string => {
    const sgfX = String.fromCharCode('a'.charCodeAt(0) + x);
    const sgfY = String.fromCharCode('a'.charCodeAt(0) + y);
    return sgfX + sgfY;
};

/**
 * SGF 문자열 이스케이프 처리
 */
const escapeSgfString = (str: string): string => {
    return str.replace(/\\/g, '\\\\').replace(/\]/g, '\\]');
};

/**
 * 게임 모드 이름 가져오기
 */
const getGameModeName = (mode: GameMode): string => {
    const modeInfo = SPECIAL_GAME_MODES.find(m => m.mode === mode);
    return modeInfo ? modeInfo.name : mode;
};

/**
 * 게임에서 SGF 파일 생성
 */
export const generateSgfFromGame = (
    game: LiveGameSession,
    player1: User,
    player2: User,
    analysisResult?: any
): string => {
    const boardSize = game.settings.boardSize;
    const blackPlayer = game.player1.id === game.blackPlayerId ? player1 : player2;
    const whitePlayer = game.player1.id === game.whitePlayerId ? player1 : player2;
    const blackName = escapeSgfString(blackPlayer.nickname);
    const whiteName = escapeSgfString(whitePlayer.nickname);
    
    // 게임 날짜
    const gameDate = new Date(game.createdAt);
    const dateStr = gameDate.toISOString().split('T')[0].replace(/-/g, '');
    
    // 승자 정보
    let result = '';
    if (game.winner === Player.Black) {
        result = 'B+R';
    } else if (game.winner === Player.White) {
        result = 'W+R';
    } else {
        result = '0';
    }
    
    // 덤 정보
    const komi = game.finalKomi ?? game.settings.komi ?? 0.5;
    
    // 게임 모드
    const gameMode = getGameModeName(game.mode);
    
    // SGF 헤더 시작
    let sgf = `(;FF[4]CA[UTF-8]SZ[${boardSize}]KM[${komi}]PB[${blackName}]PW[${whiteName}]DT[${dateStr}]RE[${result}]GN[${escapeSgfString(gameMode)}]`;
    
    // 최종 스코어 상세 정보 추가
    if (analysisResult?.scoreDetails) {
        const blackDetails = analysisResult.scoreDetails.black;
        const whiteDetails = analysisResult.scoreDetails.white;
        
        // 시간 보너스 (스피드 바둑)
        if (blackDetails.timeBonus > 0 || whiteDetails.timeBonus > 0) {
            sgf += `C[시간보너스: 흑 ${blackDetails.timeBonus}점, 백 ${whiteDetails.timeBonus}점]`;
        }
        
        // 베이스 돌 보너스
        if (blackDetails.baseStoneBonus > 0 || whiteDetails.baseStoneBonus > 0) {
            sgf += `C[베이스보너스: 흑 ${blackDetails.baseStoneBonus}점, 백 ${whiteDetails.baseStoneBonus}점]`;
        }
        
        // 히든 돌 보너스
        if (blackDetails.hiddenStoneBonus > 0 || whiteDetails.hiddenStoneBonus > 0) {
            sgf += `C[히든보너스: 흑 ${blackDetails.hiddenStoneBonus}점, 백 ${whiteDetails.hiddenStoneBonus}점]`;
        }
        
        // 미사용 아이템 보너스
        if (blackDetails.itemBonus > 0 || whiteDetails.itemBonus > 0) {
            sgf += `C[미사용아이템보너스: 흑 ${blackDetails.itemBonus}점, 백 ${whiteDetails.itemBonus}점]`;
        }
        
        // 최종 점수
        sgf += `C[최종점수: 흑 ${blackDetails.total}점, 백 ${whiteDetails.total}점]`;
    }
    
    // 미사용 아이템 보너스 계산 (analysisResult에 없을 경우)
    const isHiddenMode = game.mode === GameMode.Hidden || (game.mode === GameMode.Mix && game.settings.mixedModes?.includes(GameMode.Hidden));
    const isMissileMode = game.mode === GameMode.Missile || (game.mode === GameMode.Mix && game.settings.mixedModes?.includes(GameMode.Missile));
    
    if (isHiddenMode || isMissileMode) {
        const blackUnusedItems: string[] = [];
        const whiteUnusedItems: string[] = [];
        
        // 흑 플레이어 미사용 아이템
        if (isHiddenMode) {
            const blackHiddenUsed = game.hidden_stones_used_p1 ?? 0;
            const blackHiddenTotal = game.settings.hiddenStoneCount ?? 0;
            const blackHiddenUnused = blackHiddenTotal - blackHiddenUsed;
            if (blackHiddenUnused > 0) {
                blackUnusedItems.push(`히든 ${blackHiddenUnused}개`);
            }
            
            const blackScansUsed = (game.settings.scanCount ?? 0) - (game.scans_p1 ?? game.settings.scanCount ?? 0);
            if (blackScansUsed > 0) {
                blackUnusedItems.push(`스캔 ${blackScansUsed}개`);
            }
        }
        
        if (isMissileMode) {
            const blackMissilesUsed = (game.settings.missileCount ?? 0) - (game.missiles_p1 ?? game.settings.missileCount ?? 0);
            if (blackMissilesUsed > 0) {
                blackUnusedItems.push(`미사일 ${blackMissilesUsed}개`);
            }
        }
        
        // 백 플레이어 미사용 아이템
        if (isHiddenMode) {
            const whiteHiddenUsed = game.hidden_stones_used_p2 ?? 0;
            const whiteHiddenTotal = game.settings.hiddenStoneCount ?? 0;
            const whiteHiddenUnused = whiteHiddenTotal - whiteHiddenUsed;
            if (whiteHiddenUnused > 0) {
                whiteUnusedItems.push(`히든 ${whiteHiddenUnused}개`);
            }
            
            const whiteScansUsed = (game.settings.scanCount ?? 0) - (game.scans_p2 ?? game.settings.scanCount ?? 0);
            if (whiteScansUsed > 0) {
                whiteUnusedItems.push(`스캔 ${whiteScansUsed}개`);
            }
        }
        
        if (isMissileMode) {
            const whiteMissilesUsed = (game.settings.missileCount ?? 0) - (game.missiles_p2 ?? game.settings.missileCount ?? 0);
            if (whiteMissilesUsed > 0) {
                whiteUnusedItems.push(`미사일 ${whiteMissilesUsed}개`);
            }
        }
        
        if (blackUnusedItems.length > 0 || whiteUnusedItems.length > 0) {
            const blackStr = blackUnusedItems.length > 0 ? `흑(${blackUnusedItems.join(', ')})` : '흑(없음)';
            const whiteStr = whiteUnusedItems.length > 0 ? `백(${whiteUnusedItems.join(', ')})` : '백(없음)';
            sgf += `C[미사용아이템: ${blackStr}, ${whiteStr}]`;
        }
    }
    
    sgf += '\n';
    
    // 수순 추가
    const moveHistory = game.moveHistory || [];
    let currentNode = sgf;
    
    for (let i = 0; i < moveHistory.length; i++) {
        const move = moveHistory[i];
        
        // 패스는 건너뜀
        if (move.x === -1 && move.y === -1) {
            continue;
        }
        
        const player = move.player === Player.Black ? 'B' : 'W';
        const coord = coordToSgf(move.x, move.y);
        
        currentNode += `;${player}[${coord}]`;
        
        // 히든 아이템 사용 기록
        if (game.hiddenMoves?.[i]) {
            currentNode += `C[히든 아이템 사용]`;
        }
        
        // 히든 돌 공개 기록
        if (game.permanentlyRevealedStones?.some(p => p.x === move.x && p.y === move.y)) {
            currentNode += `C[히든 돌 공개: (${move.x},${move.y})]`;
        }
        
        // 미사일 아이템 사용 기록 (이전 수와 비교하여 돌 위치 변경 확인)
        if (i > 0 && game.animation) {
            const prevMove = moveHistory[i - 1];
            if (prevMove && prevMove.x !== -1 && prevMove.y !== -1) {
                // animation 정보에서 미사일 이동 확인
                const anim = game.animation as any;
                if (anim.type === 'missile' || anim.type === 'hidden_missile') {
                    if (anim.from && anim.to) {
                        currentNode += `C[미사일: (${anim.from.x},${anim.from.y}) -> (${anim.to.x},${anim.to.y})]`;
                    }
                }
            }
        }
        
        // 스캔 사용 기록은 별도로 처리 (revealedHiddenMoves는 공개된 히든 돌의 인덱스)
        // 스캔 좌표는 animation 정보에서 가져올 수 없으므로, revealedHiddenMoves의 인덱스로 추정
        // 실제 스캔 좌표는 moveHistory의 좌표와 다를 수 있지만, 현재 구조에서는 이렇게만 기록 가능
        if (game.revealedHiddenMoves) {
            for (const [playerId, revealedIndices] of Object.entries(game.revealedHiddenMoves)) {
                if (revealedIndices.includes(i)) {
                    // 이 move가 스캔으로 공개된 히든 돌임
                    currentNode += `C[스캔 성공: (${move.x},${move.y})]`;
                }
            }
        }
        
        currentNode += '\n';
    }
    
    sgf = currentNode;
    sgf += ')';
    
    return sgf;
};

