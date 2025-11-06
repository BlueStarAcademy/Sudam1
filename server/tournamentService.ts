import { TournamentState, PlayerForTournament, CoreStat, CommentaryLine, Match, User, Round, TournamentType } from '../types.js';
import { calculateTotalStats } from './statService.js';
import { randomUUID } from 'crypto';
import { TOURNAMENT_DEFINITIONS } from '../constants';

const EARLY_GAME_DURATION = 15;
const MID_GAME_DURATION = 20;
const END_GAME_DURATION = 15;
const TOTAL_GAME_DURATION = EARLY_GAME_DURATION + MID_GAME_DURATION + END_GAME_DURATION;

const STAT_WEIGHTS: Record<'early' | 'mid' | 'end', Partial<Record<CoreStat, number>>> = {
    early: {
        [CoreStat.CombatPower]: 0.4,
        [CoreStat.ThinkingSpeed]: 0.3,
        [CoreStat.Concentration]: 0.3,
    },
    mid: {
        [CoreStat.CombatPower]: 0.3,
        [CoreStat.Judgment]: 0.3,
        [CoreStat.Concentration]: 0.2,
        [CoreStat.Stability]: 0.2,
    },
    end: {
        [CoreStat.Calculation]: 0.5,
        [CoreStat.Stability]: 0.3,
        [CoreStat.Concentration]: 0.2,
    },
};

const COMMENTARY_POOLS = {
    start: "{p1}님과 {p2}님의 대국이 시작되었습니다.",
    early: [
        "양측 모두 신중하게 첫 수를 던지며 긴 대국의 막을 올립니다!",
        "기선 제압을 노리며 빠른 속도로 초반 포석이 전개되고 있습니다.",
        "서로의 의도를 파악하려는 탐색전이 이어지고 있습니다.",
        "중앙을 선점하며 주도권을 가져가려는 모습이 보입니다.",
        "조심스러운 수읽기로 서로의 진영을 가늠하고 있습니다."
    ],
    mid: [
        "격렬한 전투가 좌변에서 벌어지고 있습니다!",
        "돌들이 얽히며 복잡한 형세가 만들어지고 있습니다.",
        "상대의 허점을 노리며 강하게 파고듭니다.",
        "집중력이 흔들리면 단번에 무너질 수 있는 상황입니다.",
        "치열한 실랑이 끝에 국면의 균형이 살짝 기울고 있습니다.",
        "지금 이 수가 오늘 경기의 분수령이 될 수 있습니다!",
        "한 치의 수읽기 실수도 허용되지 않는 순간입니다.",
        "단 한 번의 판단이 승패를 좌우할 수 있는 형세입니다.",
        "집중력이 절정에 달하며 숨막히는 분위기가 이어집니다.",
        "방심은 금물! 작은 실수가 곧바로 대참사로 이어질 수 있습니다.",
        "조금씩 우세를 굳혀가며 안정적인 운영을 보여주고 있습니다.",
        "상대의 압박에 흔들리며 주도권을 잃어가고 있습니다.",
        "전투력에서 앞서는 듯하지만, 계산력에서 다소 뒤처지고 있습니다.",
        "양측의 형세가 팽팽하게 맞서며 누구도 쉽게 물러서지 않습니다.",
        "불리한 상황에서도 끝까지 흔들리지 않는 집중력이 돋보입니다."
    ],
    end: [
        "마지막 승부수를 던지며 역전을 노리고 있습니다!",
        "큰 집 계산에 들어가며 승패가 서서히 가려지고 있습니다.",
        "남은 수읽기에 모든 집중력을 쏟아붓고 있습니다.",
        "한 수 한 수가 경기 결과에 직결되는 종반입니다.",
        "치열한 승부 끝에 승자의 그림자가 드러나고 있습니다."
    ],
    win: [
        "마침내 승부가 갈렸습니다! {winner} 선수가 이번 라운드를 제압합니다!",
        "냉정한 판단으로 끝까지 우세를 유지하며 승리를 거머쥡니다.",
        "혼신의 집중력으로 극적인 역전을 만들어냅니다!",
        "안정적인 운영으로 상대를 압도하며 대국을 마무리합니다.",
        "치열한 접전 끝에 승자는 웃고, 패자는 아쉬움을 삼킵니다."
    ]
};


const getPhase = (time: number): 'early' | 'mid' | 'end' => {
    if (time <= EARLY_GAME_DURATION) return 'early';
    if (time <= EARLY_GAME_DURATION + MID_GAME_DURATION) return 'mid';
    return 'end';
};

const calculatePower = (player: PlayerForTournament, phase: 'early' | 'mid' | 'end') => {
    const weights = STAT_WEIGHTS[phase];
    let power = 0;
    for (const stat in weights) {
        const statKey = stat as CoreStat;
        const weight = weights[statKey]!;
        power += (player.stats[statKey] || 0) * weight;
    }
    const conditionModifier = (player.condition || 100) / 100;
    return (power) * conditionModifier;
};

const finishMatch = (
    match: Match,
    p1: PlayerForTournament,
    p2: PlayerForTournament,
    p1Cumulative: number,
    p2Cumulative: number
): { finalCommentary: CommentaryLine[]; winner: PlayerForTournament; } => {
    const totalCumulative = p1Cumulative + p2Cumulative;
    const p1Percent = totalCumulative > 0 ? (p1Cumulative / totalCumulative) * 100 : 50;

    let winner: PlayerForTournament;
    let commentaryText: string;

    const diffPercent = Math.abs(p1Percent - 50) * 2;
    const scoreDiff = (diffPercent / 2);
    const roundedDiff = Math.round(scoreDiff);
    const finalDiff = roundedDiff + 0.5;

    if (finalDiff < 0.5) { 
        winner = Math.random() < 0.5 ? p1 : p2;
        commentaryText = `[최종결과] ${winner.nickname}, 0.5집 승리!`;
    } else {
        winner = p1Percent > 50 ? p1 : p2;
        commentaryText = `[최종결과] ${winner.nickname}, ${finalDiff.toFixed(1)}집 승리!`;
    }
    
    const winComment = COMMENTARY_POOLS.win[Math.floor(Math.random() * COMMENTARY_POOLS.win.length)].replace('{winner}', winner.nickname);
    
    return {
        finalCommentary: [
            { text: commentaryText, phase: 'end', isRandomEvent: false },
            { text: winComment, phase: 'end', isRandomEvent: false }
        ],
        winner,
    };
};


const simulateAndFinishMatch = (match: Match, players: PlayerForTournament[]) => {
    if (match.isFinished) return;
    if (!match.players[0] || !match.players[1]) {
        match.winner = match.players[0] || null;
        match.isFinished = true;
        return;
    }

    const p1 = players.find(p => p.id === match.players[0]!.id)!;
    const p2 = players.find(p => p.id === match.players[1]!.id)!;
    
    // Reset stats to original values before starting the match simulation
    if (p1.originalStats) {
        p1.stats = JSON.parse(JSON.stringify(p1.originalStats));
    }
    if (p2.originalStats) {
        p2.stats = JSON.parse(JSON.stringify(p2.originalStats));
    }

    p1.condition = Math.floor(Math.random() * 61) + 40; // 40-100
    p2.condition = Math.floor(Math.random() * 61) + 40; // 40-100

    let p1CumulativeScore = 0;
    let p2CumulativeScore = 0;

    for (let t = 1; t <= TOTAL_GAME_DURATION; t++) {
        const phase = getPhase(t);
        p1CumulativeScore += calculatePower(p1, phase);
        p2CumulativeScore += calculatePower(p2, phase);
    }
    
    const { winner } = finishMatch(match, p1, p2, p1CumulativeScore, p2CumulativeScore);
    
    match.winner = winner;
    match.isFinished = true;
    
    const totalScore = p1CumulativeScore + p2CumulativeScore;
    const p1Percent = totalScore > 0 ? (p1CumulativeScore / totalScore) * 100 : 50;
    match.finalScore = { player1: p1Percent, player2: 100 - p1Percent };

    match.commentary = [{text: "경기가 자동으로 진행되었습니다.", phase: 'end', isRandomEvent: false}];
};

const prepareNextRound = (state: TournamentState, user: User) => {
    const lastRound = state.rounds[state.rounds.length - 1];
    if (lastRound.matches.every(m => m.isFinished)) {
        const winners = lastRound.matches.map(m => m.winner).filter(Boolean) as PlayerForTournament[];

        if (winners.length > 1) {
            // 3/4위전 생성: 4강이 끝났을 때 (전국바둑대회, 월드챔피언십 모두)
            // 3/4위전이 아직 생성되지 않았고, 4강이 끝났으면 생성
            if (state.type !== 'neighborhood' && lastRound.name === '4강' && winners.length === 2) {
                const hasThirdPlaceMatch = state.rounds.some(r => r.name === '3,4위전');
                if (!hasThirdPlaceMatch) {
                    const losers = lastRound.matches.map(m => m.players.find(p => p && p.id !== m.winner?.id)).filter(Boolean) as PlayerForTournament[];
                    if (losers.length === 2) {
                        const thirdPlaceMatch: Match = {
                            id: `m-${state.rounds.length + 1}-3rd`,
                            players: [losers[0], losers[1]],
                            winner: null, 
                            isFinished: false, 
                            commentary: [],
                            isUserMatch: (losers[0]?.id === user.id || losers[1]?.id === user.id),
                            finalScore: null,
                            sgfFileIndex: Math.floor(Math.random() * 18) + 1,
                        };
                        state.rounds.push({ id: state.rounds.length + 1, name: "3,4위전", matches: [thirdPlaceMatch] });
                    }
                }
            }
            
            const nextRoundMatches: Match[] = [];
            for (let i = 0; i < winners.length; i += 2) {
                const p1 = winners[i];
                const p2 = winners[i + 1] || null;
                nextRoundMatches.push({
                    id: `m-${state.rounds.length + 1}-${i / 2}`,
                    players: [p1, p2],
                    winner: p2 === null ? p1 : null,
                    isFinished: !p2,
                    commentary: [],
                    isUserMatch: (p1?.id === user.id || p2?.id === user.id),
                    finalScore: null,
                    sgfFileIndex: Math.floor(Math.random() * 18) + 1,
                });
            }
            const roundName = winners.length === 2 ? "결승" : `${winners.length}강`;
            state.rounds.push({ id: state.rounds.length + 1, name: roundName, matches: nextRoundMatches });
        }
    }
};

const processMatchCompletion = (state: TournamentState, user: User, completedMatch: Match, roundIndex: number) => {
    state.currentSimulatingMatch = null;
    
    completedMatch.players.forEach(p => {
        if (p) {
            const playerInState = state.players.find(player => player.id === p.id);
            if (playerInState) {
                playerInState.condition = 1000;
                if (playerInState.originalStats) {
                    playerInState.stats = JSON.parse(JSON.stringify(playerInState.originalStats));
                }
            }
        }
    });

    if (state.type === 'neighborhood') {
        const currentRound = state.currentRoundRobinRound || 1;
        // rounds 배열에서 name이 "1회차", "2회차" 등인 라운드 찾기
        const currentRoundObj = state.rounds.find(r => r.name === `${currentRound}회차`);
        
        if (!currentRoundObj) {
            state.status = 'complete';
            return;
        }
        
        const roundMatches = currentRoundObj.matches;

        // 유저가 아닌 매치들을 자동 처리
        roundMatches.forEach(m => {
            if (!m.isFinished && !m.isUserMatch) {
                simulateAndFinishMatch(m, state.players);
            }
        });
        
        const allRoundMatchesFinished = roundMatches.every(m => m.isFinished);

        if (allRoundMatchesFinished) {
            if (currentRound >= 5) {
                state.status = 'complete';
            } else {
                // 동네바둑리그: 1회차가 완료되면 round_complete 상태로 유지
                // 사용자가 "다음 경기" 버튼을 누르면 startNextRound가 호출되어 다음 회차로 넘어감
                state.status = 'round_complete';
                // currentRoundRobinRound는 현재 완료된 회차를 유지 (아직 다음 회차로 넘어가지 않음)
            }
        }
        return;
    }
    
    const loser = completedMatch.players.find(p => p && p.id !== completedMatch.winner?.id) || null;

    if (loser?.id === user.id) {
        state.status = 'eliminated';
    } else {
        const allTournamentMatchesFinished = state.rounds.every(r => r.matches.every(m => m.isFinished));
        if (allTournamentMatchesFinished) {
             state.status = 'complete';
        } else {
             state.status = 'round_complete';
             prepareNextRound(state, user); // Prepare the next round immediately
        }
    }
};

export const createTournament = (type: TournamentType, user: User, players: PlayerForTournament[]): TournamentState => {
    const definition = TOURNAMENT_DEFINITIONS[type];
    const rounds: Round[] = [];
    
    // 경기 시작 전에 컨디션을 40~100 사이로 랜덤 부여
    players.forEach(p => p.condition = Math.floor(Math.random() * 61) + 40);

    if (definition.format === 'tournament') {
        const matches: Match[] = [];
        for (let i = 0; i < players.length; i += 2) {
            const p1 = players[i];
            const p2 = players[i + 1] || null;
            matches.push({
                id: `m-1-${i / 2}`,
                players: [p1, p2],
                winner: p2 === null ? p1 : null,
                isFinished: !p2,
                commentary: [],
                isUserMatch: (p1?.id === user.id || p2?.id === user.id),
                finalScore: null,
                sgfFileIndex: Math.floor(Math.random() * 18) + 1,
            });
        }
        rounds.push({ id: 1, name: `${players.length}강`, matches });
    } else { // round-robin for 'neighborhood'
        // 6인 풀리그: 5회차로 나누어 진행
        // 각 회차마다 3경기씩 진행 (총 15경기 = 6C2)
        const schedule = [
            [[0, 5], [1, 4], [2, 3]],  // 1회차
            [[0, 4], [5, 3], [1, 2]],  // 2회차
            [[0, 3], [4, 2], [5, 1]],  // 3회차
            [[0, 2], [3, 1], [4, 5]],  // 4회차
            [[0, 1], [2, 5], [3, 4]],  // 5회차
        ];

        // 5개의 라운드(1~5회차) 생성
        for (let roundNum = 1; roundNum <= 5; roundNum++) {
            const roundPairings = schedule[roundNum - 1];
            const roundMatches: Match[] = [];
            
            roundPairings.forEach((pair, index) => {
                const p1 = players[pair[0]];
                const p2 = players[pair[1]];
                roundMatches.push({
                    id: `m-${roundNum}-${index}`,
                    players: [p1, p2],
                    winner: null,
                    isFinished: false,
                    commentary: [],
                    isUserMatch: (p1.id === user.id || p2.id === user.id),
                    finalScore: null,
                    sgfFileIndex: Math.floor(Math.random() * 18) + 1,
                });
            });
            
            rounds.push({ id: roundNum, name: `${roundNum}회차`, matches: roundMatches });
        }
    }

    return {
        type,
        status: 'bracket_ready',
        title: definition.name,
        players,
        rounds,
        currentSimulatingMatch: null,
        currentMatchCommentary: [],
        lastPlayedDate: Date.now(),
        nextRoundStartTime: Date.now() + 5000,
        timeElapsed: 0,
    };
};

export const startNextRound = (state: TournamentState, user: User) => {
    if (state.status === 'round_in_progress') return;
    
    if (state.type === 'neighborhood') {
        if (state.status === 'bracket_ready') {
            state.currentRoundRobinRound = 1;
        } else if (state.status === 'round_complete') {
            state.currentRoundRobinRound = (state.currentRoundRobinRound || 0) + 1;
        }
    
        const currentRound = state.currentRoundRobinRound || 1;
        if (currentRound > 5) {
            state.status = 'complete';
            return;
        }
    
        // 현재 회차의 라운드 찾기 (name이 "1회차", "2회차" 등인 라운드)
        const currentRoundObj = state.rounds.find(r => r.name === `${currentRound}회차`);
        if (!currentRoundObj) {
            state.status = 'complete';
            return;
        }
        
        // 다음 회차로 넘어갈 때 컨디션을 새롭게 부여 (40~100 사이 랜덤)
        state.players.forEach(p => {
            p.condition = Math.floor(Math.random() * 61) + 40; // 40-100
            // 능력치도 초기값으로 리셋
            if (p.originalStats) {
                p.stats = JSON.parse(JSON.stringify(p.originalStats));
            }
        });
        
        const roundMatches = currentRoundObj.matches;
    
        // 유저의 매치 찾기
        const userMatchInRound = roundMatches.find(m => m.isUserMatch && !m.isFinished);
    
        if (userMatchInRound) {
            // 유저의 매치가 있으면 대기 상태로 두고, 유저가 경기 시작 버튼을 눌러야 시작됨
            // 경기 시작은 START_TOURNAMENT_MATCH 액션으로 처리됨
            state.status = 'bracket_ready';
            // currentRoundRobinRound가 아직 설정되지 않았으면 설정
            if (!state.currentRoundRobinRound) {
                state.currentRoundRobinRound = currentRound;
            }
        } else {
            // 유저의 매치가 없으면 모든 매치를 자동 처리
            roundMatches.forEach(m => {
                if (!m.isFinished) {
                    simulateAndFinishMatch(m, state.players);
                }
            });
            state.status = 'round_complete';
        }
        return;
    }
    
    // 전국바둑대회와 월드챔피언십도 동네바둑리그처럼 자동으로 경기를 시작하지 않음
    // 유저가 직접 경기 시작 버튼을 눌러야 함 (START_TOURNAMENT_ROUND 액션으로 처리)
    const nextMatchToSimulate = state.rounds
        .flatMap((round, roundIndex) => round.matches.map((match, matchIndex) => ({ match, roundIndex, matchIndex })))
        .find(({ match }) => !match.isFinished && match.isUserMatch);

    if (nextMatchToSimulate) {
        // 유저의 매치가 있으면 대기 상태로 두고, 유저가 경기 시작 버튼을 눌러야 시작됨
        // 경기 시작은 START_TOURNAMENT_ROUND 액션으로 처리됨
        state.status = 'bracket_ready';
    } else {
        // 유저의 매치가 없으면 모든 매치를 자동 처리
        state.rounds.forEach(round => {
            round.matches.forEach(match => {
                if (!match.isFinished && !match.isUserMatch) {
                    simulateAndFinishMatch(match, state.players);
                }
            });
        });
        state.status = 'round_complete';
    }
};

export const skipToResults = (state: TournamentState, userId: string) => {
    if (state.status === 'complete') return;

    // eliminated 상태도 처리 (유저가 패배해도 나머지 경기는 진행)
    if (state.status === 'eliminated') {
        state.status = 'round_complete';
    }

    const user = { id: userId } as User;
    let safety = 0; // prevent infinite loops
    while (state.status !== 'complete' && safety < 20) {
        safety++;
        
        // 현재 라운드의 모든 미완료 매치를 시뮬레이션하고 완료
        let hasUnfinishedMatches = false;
        state.rounds.forEach(round => {
            round.matches.forEach(match => {
                if (!match.isFinished) {
                    hasUnfinishedMatches = true;
                    simulateAndFinishMatch(match, state.players);
                }
            });
        });

        // 모든 매치가 완료되었는지 확인
        const allMatchesFinished = state.rounds.every(r => r.matches.every(m => m.isFinished));
        
        if (allMatchesFinished) {
            // 다음 라운드가 필요한지 확인하고 준비
            const lastRound = state.rounds[state.rounds.length - 1];
            const winners = lastRound.matches.map(m => m.winner).filter(Boolean) as PlayerForTournament[];
            
            // 결승전이 아니고 우승자가 2명 이상이면 다음 라운드 준비
            if (winners.length > 1 && lastRound.name !== '결승') {
                prepareNextRound(state, user);
                // 다음 라운드의 매치들을 즉시 시뮬레이션 (계속 진행)
                continue;
            } else {
                // 모든 경기가 끝났거나 결승전이 끝났으면 완료
                state.status = 'complete';
                break;
            }
        } else if (hasUnfinishedMatches) {
            // 매치가 있었는데 아직 완료되지 않았으면 계속 진행
            continue;
        } else {
            // 모든 매치가 완료되었고 다음 라운드가 필요 없으면 완료
            state.status = 'complete';
            break;
        }
    }
    
    // Finalize state
    state.currentSimulatingMatch = null;
    state.timeElapsed = TOTAL_GAME_DURATION;
    
    // 안전장치: 여전히 완료되지 않았으면 강제로 완료
    if (state.status !== 'complete') {
        state.status = 'complete';
    }
};

export const forfeitTournament = (state: TournamentState, userId: string) => {
    if (state.status === 'complete' || state.status === 'eliminated') return;

    state.rounds.forEach(round => {
        round.matches.forEach(match => {
            if (!match.isFinished && match.players.some(p => p?.id === userId)) {
                match.isFinished = true;
                match.winner = match.players.find(p => p && p.id !== userId) || null;
            }
        });
    });

    state.status = 'eliminated';
};

export const forfeitCurrentMatch = (state: TournamentState, user: User) => {
    if (state.status !== 'round_in_progress' || !state.currentSimulatingMatch) return;

    const { roundIndex, matchIndex } = state.currentSimulatingMatch;
    
    if (roundIndex >= state.rounds.length || matchIndex >= state.rounds[roundIndex].matches.length) {
        return;
    }

    const match = state.rounds[roundIndex].matches[matchIndex];
    
    if (!match.isFinished && match.players.some(p => p?.id === user.id)) {
        match.isFinished = true;
        match.winner = match.players.find(p => p && p.id !== user.id) || null;
        
        // 현재 매치를 완료 처리하고 다음 단계로 진행
        processMatchCompletion(state, user, match, roundIndex);
    }
};

export const advanceSimulation = (state: TournamentState, user: User) => {
    if (state.status !== 'round_in_progress' || !state.currentSimulatingMatch) return;

    const { roundIndex, matchIndex } = state.currentSimulatingMatch;
    
    // Validate round and match indices
    if (!state.rounds || roundIndex >= state.rounds.length || !state.rounds[roundIndex]) {
        console.error(`[advanceSimulation] Invalid roundIndex: ${roundIndex}, total rounds: ${state.rounds?.length || 0}`);
        return;
    }
    
    const round = state.rounds[roundIndex];
    if (!round.matches || matchIndex >= round.matches.length || !round.matches[matchIndex]) {
        console.error(`[advanceSimulation] Invalid matchIndex: ${matchIndex}, total matches: ${round.matches?.length || 0}`);
        return;
    }
    
    const match = round.matches[matchIndex];

    if (!match.players[0] || !match.players[1]) {
        match.winner = match.players[0] || null;
        match.isFinished = true;
        processMatchCompletion(state, user, match, roundIndex);
        return;
    }
    
    if (state.timeElapsed === 0) {
        state.currentMatchScores = { player1: 0, player2: 0 };
    }

    state.timeElapsed++;
    
    const p1 = state.players.find(p => p.id === match.players[0]!.id);
    const p2 = state.players.find(p => p.id === match.players[1]!.id);
    
    if (!p1 || !p2) {
        console.error(`[advanceSimulation] Player not found: p1=${!!p1}, p2=${!!p2}, match.players[0]=${match.players[0]?.id}, match.players[1]=${match.players[1]?.id}`);
        return;
    }

    if (state.timeElapsed === 1) {
        if (p1.originalStats) p1.stats = JSON.parse(JSON.stringify(p1.originalStats));
        if (p2.originalStats) p2.stats = JSON.parse(JSON.stringify(p2.originalStats));

        // 컨디션은 이미 토너먼트 생성 시 랜덤 부여되었으므로 변경하지 않음
        // 단, 컨디션이 1000(초기값)인 경우에만 랜덤 부여 (하위 호환성)
        if (p1.condition === 1000) {
            p1.condition = Math.floor(Math.random() * 61) + 40; // 40-100
        }
        if (p2.condition === 1000) {
            p2.condition = Math.floor(Math.random() * 61) + 40; // 40-100
        }
    }
    
    // Fluctuate stats every second
    const playersToUpdate = [p1, p2];
    for (const player of playersToUpdate) {
        if (!player) continue;
        
        // Select one random stat to fluctuate
        const allStats = Object.values(CoreStat);
        const statToFluctuate = allStats[Math.floor(Math.random() * allStats.length)];

        const condition = player.condition || 100;
        // 양수값이 나올 기본확률 -30% + 컨디션%
        // 예: 컨디션 50 = -30% + 50% = 20% 양수 확률
        // 예: 컨디션 100 = -30% + 100% = 70% 양수 확률
        const positiveChangeProbability = (condition - 30) / 100;
        
        let fluctuation: number;
        if (Math.random() < positiveChangeProbability) {
            // Positive fluctuation: 1, 2, or 3
            fluctuation = Math.floor(Math.random() * 3) + 1;
        } else {
            // Negative fluctuation: -1, -2, or -3
            fluctuation = Math.floor(Math.random() * 3) - 3;
        }
        player.stats[statToFluctuate] = (player.stats[statToFluctuate] || 0) + fluctuation;
    }

    // 현재 시간에 맞는 단계 결정 (초반: 1-15초, 중반: 16-35초, 종반: 36-50초)
    const phase = getPhase(state.timeElapsed);
    
    // 각 단계에 필요한 능력치의 가중치 합계를 계산
    // 초반: 전투력*0.4 + 사고속도*0.3 + 집중력*0.3
    // 중반: 전투력*0.3 + 판단력*0.3 + 집중력*0.2 + 안정감*0.2
    // 종반: 계산력*0.5 + 안정감*0.3 + 집중력*0.2
    const p1Power = calculatePower(p1, phase);
    const p2Power = calculatePower(p2, phase);

    // 매초 각 단계별 능력치 점수를 누적하여 그래프 점수 계산
    const p1Cumulative = (state.currentMatchScores?.player1 || 0) + p1Power;
    const p2Cumulative = (state.currentMatchScores?.player2 || 0) + p2Power;
    state.currentMatchScores = { player1: p1Cumulative, player2: p2Cumulative };
    
    const totalCumulative = p1Cumulative + p2Cumulative;
    const p1ScorePercent = totalCumulative > 0 ? (p1Cumulative / totalCumulative) * 100 : 50;

    // Commentary system: 1 second interval
    if (state.timeElapsed === 1) {
        state.currentMatchCommentary.push({ text: COMMENTARY_POOLS.start.replace('{p1}', p1.nickname).replace('{p2}', p2.nickname), phase, isRandomEvent: false });
    } else if (state.timeElapsed % 10 === 0 && state.timeElapsed > 0 && state.timeElapsed < TOTAL_GAME_DURATION) {
        // Intermediate score every 10 seconds
        const leadPercent = Math.abs(p1ScorePercent - 50) * 2;
        const scoreDiff = (leadPercent / 2);
        const roundedDiff = Math.round(scoreDiff);
        const finalDiff = roundedDiff + 0.5;
        const leader = p1ScorePercent > 50 ? p1.nickname : p2.nickname;
        if (finalDiff > 0.5) {
            state.currentMatchCommentary.push({ text: `[중간 스코어] ${leader} 선수 ${finalDiff.toFixed(1)}집 우세.`, phase, isRandomEvent: false });
        }
    } else if (state.timeElapsed > 1 && state.timeElapsed < TOTAL_GAME_DURATION) {
        // Commentary every second (except at 10s intervals and random events)
        const pool = COMMENTARY_POOLS[phase];
        
        // Get the text of the last few comments to avoid repetition.
        const recentComments = state.currentMatchCommentary.slice(-3).map(c => c.text);
        
        let newCommentText;
        if (pool.length > 1) {
            let attempts = 0;
            let candidateText;
            do {
                candidateText = pool[Math.floor(Math.random() * pool.length)];
                candidateText = candidateText.replace('{p1}', p1.nickname).replace('{p2}', p2.nickname);
                attempts++;
            } while (recentComments.includes(candidateText) && attempts < 10);
            newCommentText = candidateText;
        } else {
            newCommentText = pool[0].replace('{p1}', p1.nickname).replace('{p2}', p2.nickname);
        }

        state.currentMatchCommentary.push({ text: newCommentText, phase, isRandomEvent: false });
    }

    // Random events every 5 seconds
    if (state.timeElapsed > 1 && state.timeElapsed < TOTAL_GAME_DURATION && state.timeElapsed % 5 === 0) {
        const events = [
            { type: CoreStat.Concentration, isPositive: false, text: "{player}님이 조급한 마음에 실수가 나왔습니다." },
            { type: CoreStat.ThinkingSpeed, isPositive: true, text: "{player}님이 시간 압박에서도 좋은 수를 둡니다." },
            { type: CoreStat.CombatPower, isPositive: true, text: "{player}님이 공격적인 수로 판세를 흔듭니다." },
            { type: CoreStat.Stability, isPositive: true, text: "{player}님이 차분하게 받아치며 불리한 싸움을 버팁니다." },
        ];
        
        // Check each event individually with stat-based probability
        const eventResults: Array<{ event: typeof events[0]; player: PlayerForTournament; probability: number }> = [];
        
        for (const event of events) {
            const p1Stat = p1.stats[event.type] || 100;
            const p2Stat = p2.stats[event.type] || 100;
            
            let highStatPlayer: PlayerForTournament, lowStatPlayer: PlayerForTournament;
            if (p1Stat > p2Stat) {
                highStatPlayer = p1; lowStatPlayer = p2;
            } else if (p2Stat > p1Stat) {
                highStatPlayer = p2; lowStatPlayer = p1;
            } else {
                // Equal stats, use default 20% chance
                eventResults.push({ event, player: p1, probability: 0.20 });
                continue;
            }

            const playerForEvent = event.isPositive ? highStatPlayer : lowStatPlayer;
            const otherPlayer = playerForEvent.id === p1.id ? p2 : p1;
            
            // Calculate stat difference percentage (as bar graph percentage)
            const totalStat = p1Stat + p2Stat;
            const statDiffPercent = totalStat > 0 ? (Math.abs(p1Stat - p2Stat) / totalStat) * 100 : 0;
            
            // Base 20% chance, plus stat difference percentage
            let eventChance = 0.20;
            if (event.isPositive) {
                // Positive events: higher stat player gets bonus
                const highStatPercent = totalStat > 0 ? (highStatPlayer.stats[event.type]! / totalStat) * 100 : 50;
                eventChance += (highStatPercent - 50) / 100; // Convert to 0-50% range
            } else {
                // Negative events (mistake): lower stat player gets penalty
                const lowStatPercent = totalStat > 0 ? (lowStatPlayer.stats[event.type]! / totalStat) * 100 : 50;
                eventChance += (50 - lowStatPercent) / 100; // Invert so lower stat = higher chance
            }
            
            eventChance = Math.min(0.95, Math.max(0.05, eventChance)); // Cap between 5% and 95%
            eventResults.push({ event, player: playerForEvent, probability: eventChance });
        }
        
        // Only one event can trigger per 5-second interval
        // First check if base 20% chance triggers
        if (Math.random() < 0.20) {
            // Select one event based on weighted probability
            const totalProb = eventResults.reduce((sum, r) => sum + r.probability, 0);
            let random = Math.random() * totalProb;
            let selectedEventResult = eventResults[0];
            
            for (const result of eventResults) {
                if (random <= result.probability) {
                    selectedEventResult = result;
                    break;
                }
                random -= result.probability;
            }
            
            const { event, player: playerForEvent, probability } = selectedEventResult;
            
            // Check if this specific event triggers based on its probability
            if (Math.random() < probability) {
                let triggeredMessage = event.text.replace('{player}', playerForEvent.nickname);
                const isMistake = !event.isPositive;

                const randomPercent = Math.random() * 8 + 2; // 2% to 10%
                const points = Math.round(randomPercent / 2); // 2% per point, rounded
                
                // Calculate score change as percentage of current total
                const currentTotal = (state.currentMatchScores?.player1 || 0) + (state.currentMatchScores?.player2 || 0);
                const scoreChange = currentTotal * (randomPercent / 100);
                
                triggeredMessage += ` (${isMistake ? '-' : '+'}${points}집 : ${randomPercent.toFixed(1)}%발동시)`;
                
                if (state.currentMatchScores) {
                    if (playerForEvent.id === p1.id) {
                        state.currentMatchScores.player1 += isMistake ? -scoreChange : scoreChange;
                    } else {
                        state.currentMatchScores.player2 += isMistake ? -scoreChange : scoreChange;
                    }
                }
                
                state.currentMatchCommentary.push({ text: triggeredMessage, phase, isRandomEvent: true });
            }
        }
    }
    
    if (state.timeElapsed >= TOTAL_GAME_DURATION) {
        const { finalCommentary, winner } = finishMatch(match, p1, p2, p1Cumulative, p2Cumulative);
        
        state.currentMatchCommentary.push(...finalCommentary);
        
        match.winner = winner;
        match.isFinished = true;
        match.commentary = [...state.currentMatchCommentary];
        match.finalScore = { player1: p1ScorePercent, player2: 100 - p1ScorePercent };
        
        processMatchCompletion(state, user, match, roundIndex);
    }
};

export const calculateRanks = (tournament: TournamentState): { id: string, nickname: string, rank: number }[] => {
    const definition = TOURNAMENT_DEFINITIONS[tournament.type];
    const players = tournament.players;
    const rankedPlayers: { id: string, nickname: string, rank: number }[] = [];

    if (definition.format === 'round-robin') {
        const wins: Record<string, number> = {};
        players.forEach(p => { wins[p.id] = 0; });

        tournament.rounds.forEach(round => {
            round.matches.forEach(match => {
                if (match.winner) {
                    wins[match.winner.id]++;
                }
            });
        });

        const sortedPlayers = [...players].sort((a, b) => wins[b.id] - wins[a.id]);
        
        let currentRank = 1;
        for (let i = 0; i < sortedPlayers.length; i++) {
            const player = sortedPlayers[i];
            if (i > 0 && wins[player.id] < wins[sortedPlayers[i - 1].id]) {
                currentRank = i + 1;
            }
            rankedPlayers.push({ id: player.id, nickname: player.nickname, rank: currentRank });
        }
    } else { // tournament
        const playerRanks: Map<string, number> = new Map();
        const rankedPlayerIds = new Set<string>();

        for (let i = tournament.rounds.length - 1; i >= 0; i--) {
            const round = tournament.rounds[i];
            round.matches.forEach(match => {
                if (match.isFinished && match.winner && match.players[0] && match.players[1]) {
                    const loser = match.winner.id === match.players[0].id ? match.players[1] : match.players[0];
                    if (!rankedPlayerIds.has(loser.id)) {
                        let rank = 0;
                        if(round.name.includes("강")) rank = parseInt(round.name.replace("강",""));
                        else if(round.name.includes("결승")) rank = 2;
                        else if(round.name.includes("3,4위전")) rank = 4;
                        playerRanks.set(loser.id, rank);
                        rankedPlayerIds.add(loser.id);
                    }
                }
            });
        }
        
        const finalMatch = tournament.rounds.find(r => r.name === '결승')?.matches[0];
        if (finalMatch?.winner) {
            playerRanks.set(finalMatch.winner.id, 1);
            rankedPlayerIds.add(finalMatch.winner.id);
        }
        
        players.forEach(p => {
            if (playerRanks.has(p.id)) {
                rankedPlayers.push({ id: p.id, nickname: p.nickname, rank: playerRanks.get(p.id)! });
            }
        });
        rankedPlayers.sort((a,b) => a.rank - b.rank);
    }
    return rankedPlayers;
};
