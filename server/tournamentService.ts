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
            if (winners.length === 2 && state.players.length === 8 && lastRound.matches.length === 2) {
                const losers = lastRound.matches.map(m => m.players.find(p => p && p.id !== m.winner?.id)).filter(Boolean) as PlayerForTournament[];
                if (losers.length === 2) {
                    const thirdPlaceMatch: Match = {
                        id: `m-${state.rounds.length + 1}-3rd`,
                        players: [losers[0], losers[1]],
                        winner: null, isFinished: false, commentary: [],
                        isUserMatch: (losers[0]?.id === user.id || losers[1]?.id === user.id),
                        finalScore: null,
                        sgfFileIndex: Math.floor(Math.random() * 18) + 1,
                    };
                    state.rounds.push({ id: state.rounds.length + 1, name: "3,4위전", matches: [thirdPlaceMatch] });
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
                    sgfFileIndex: Math.floor(Math.random() * 20) + 1,
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
        const players = state.players;
        
        const schedule = [
            [[0, 5], [1, 4], [2, 3]],
            [[0, 4], [5, 3], [1, 2]],
            [[0, 3], [4, 2], [5, 1]],
            [[0, 2], [3, 1], [4, 5]],
            [[0, 1], [2, 5], [3, 4]],
        ];
        const roundPairings = schedule[currentRound - 1];
        const roundMatches = roundPairings.map(pair => {
            const p1Id = players[pair[0]].id;
            const p2Id = players[pair[1]].id;
            return state.rounds[0].matches.find(m =>
                (m.players[0]?.id === p1Id && m.players[1]?.id === p2Id) ||
                (m.players[0]?.id === p2Id && m.players[1]?.id === p1Id)
            );
        });

        roundMatches.forEach(m => {
            if (m && !m.isFinished) {
                simulateAndFinishMatch(m, state.players);
            }
        });
        
        const allRoundMatchesFinished = roundMatches.every(m => m?.isFinished);

        if (allRoundMatchesFinished) {
            if (currentRound >= 5) {
                state.status = 'complete';
            } else {
                state.status = 'round_complete';
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
    
    players.forEach(p => p.condition = 1000);

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
                sgfFileIndex: Math.floor(Math.random() * 20) + 1,
            });
        }
        rounds.push({ id: 1, name: `${players.length}강`, matches });
    } else { // round-robin for 'neighborhood'
        const roundMatches: Match[] = [];
        const numPlayers = players.length;
        const playerIndices = Array.from({ length: numPlayers }, (_, i) => i);
        if (numPlayers % 2 !== 0) {
            // Logic for bye if we ever need it
        }

        const schedule: [number, number][] = [];
        for (let i = 0; i < numPlayers; i++) {
            for (let j = i + 1; j < numPlayers; j++) {
                schedule.push([i, j]);
            }
        }

        schedule.forEach((pair, index) => {
            const p1 = players[pair[0]];
            const p2 = players[pair[1]];
            roundMatches.push({
                id: `m-1-${index}`,
                players: [p1, p2],
                winner: null, isFinished: false, commentary: [],
                isUserMatch: (p1.id === user.id || p2.id === user.id),
                finalScore: null,
                sgfFileIndex: Math.floor(Math.random() * 20) + 1,
            });
        });
        
        rounds.push({ id: 1, name: '풀리그', matches: roundMatches });
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
    
        const players = state.players;
        const schedule = [
            [[0, 5], [1, 4], [2, 3]],
            [[0, 4], [5, 3], [1, 2]],
            [[0, 3], [4, 2], [5, 1]],
            [[0, 2], [3, 1], [4, 5]],
            [[0, 1], [2, 5], [3, 4]],
        ];
        const roundPairings = schedule[currentRound - 1];
        const roundMatches = roundPairings.map(pair => {
            const p1Id = players[pair[0]].id;
            const p2Id = players[pair[1]].id;
            return state.rounds[0].matches.find(m =>
                (m.players[0]?.id === p1Id && m.players[1]?.id === p2Id) ||
                (m.players[0]?.id === p2Id && m.players[1]?.id === p1Id)
            );
        });
    
        const userMatchInRound = roundMatches.find(m => m?.isUserMatch && !m.isFinished);
    
        if (userMatchInRound) {
            const matchIndex = state.rounds[0].matches.findIndex(m => m.id === userMatchInRound.id);
            
            state.status = 'round_in_progress';
            state.currentSimulatingMatch = { roundIndex: 0, matchIndex };
            state.currentMatchCommentary = [];
            state.timeElapsed = 0;
            state.currentMatchScores = { player1: 0, player2: 0 };
        } else {
            roundMatches.forEach(m => {
                if (m && !m.isFinished) {
                    simulateAndFinishMatch(m, state.players);
                }
            });
            state.status = 'round_complete';
        }
        return;
    }
    
    const nextMatchToSimulate = state.rounds
        .flatMap((round, roundIndex) => round.matches.map((match, matchIndex) => ({ match, roundIndex, matchIndex })))
        .find(({ match }) => !match.isFinished && match.isUserMatch);

    if (nextMatchToSimulate) {
        state.status = 'round_in_progress';
        state.currentSimulatingMatch = {
            roundIndex: nextMatchToSimulate.roundIndex,
            matchIndex: nextMatchToSimulate.matchIndex,
        };
        state.currentMatchCommentary = [];
        state.timeElapsed = 0;
        state.currentMatchScores = { player1: 0, player2: 0 };
    } else {
        state.status = 'round_complete';
    }
};

export const skipToResults = (state: TournamentState, userId: string) => {
    if (state.status === 'complete') return;

    let safety = 0; // prevent infinite loops
    while (state.status !== 'complete' && safety < 10) {
        safety++;
        
        let allMatchesInStateFinished = true;
        state.rounds.forEach(round => {
            round.matches.forEach(match => {
                if (!match.isFinished) {
                    allMatchesInStateFinished = false;
                    simulateAndFinishMatch(match, state.players);
                }
            });
        });

        if (allMatchesInStateFinished) {
            state.status = 'complete';
            break;
        }

        prepareNextRound(state, { id: userId } as User);

        // After preparing, check again if all matches are finished (e.g., final round was just created and resolved)
        const finalCheck = state.rounds.every(r => r.matches.every(m => m.isFinished));
        if(finalCheck) {
            state.status = 'complete';
        }
    }
    
    // Finalize state
    state.currentSimulatingMatch = null;
    state.timeElapsed = TOTAL_GAME_DURATION;
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

        p1.condition = Math.floor(Math.random() * 61) + 40; // 40-100
        p2.condition = Math.floor(Math.random() * 61) + 40; // 40-100
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

    const phase = getPhase(state.timeElapsed);
    const p1Power = calculatePower(p1, phase);
    const p2Power = calculatePower(p2, phase);

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
