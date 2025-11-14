import { TournamentState, PlayerForTournament, CoreStat, CommentaryLine, Match } from '../types';

const EARLY_GAME_DURATION = 15;
const MID_GAME_DURATION = 20;
const END_GAME_DURATION = 15;
const TOTAL_GAME_DURATION = EARLY_GAME_DURATION + MID_GAME_DURATION + END_GAME_DURATION;

// 시드 기반 랜덤 생성기
export class SeededRandom {
    private seed: number;

    constructor(seed: string) {
        // 문자열 시드를 숫자로 변환
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            const char = seed.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        this.seed = hash;
    }

    // 0~1 사이의 랜덤 값 생성
    random(): number {
        const x = Math.sin(this.seed++) * 10000;
        return x - Math.floor(x);
    }

    // min~max 사이의 정수 생성
    randomInt(min: number, max: number): number {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }
}

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
    return power;
};

export interface SimulationResult {
    timeElapsed: number;
    player1Score: number;
    player2Score: number;
    commentary: CommentaryLine[];
    winnerId: string;
}

// 1초 단위로 시뮬레이션을 진행하는 함수
export const runClientSimulationStep = (
    rng: SeededRandom,
    player1: PlayerForTournament,
    player2: PlayerForTournament,
    time: number,
    player1Score: number,
    player2Score: number,
    commentary: CommentaryLine[]
): { player1Score: number; player2Score: number; commentary: CommentaryLine[]; p1IsCritical: boolean; p2IsCritical: boolean } => {
    const phase = getPhase(time);
    
    // 능력치 변동 (매초마다)
    const playersToUpdate = [player1, player2];
    for (const player of playersToUpdate) {
        const allStats = Object.values(CoreStat);
        const statToFluctuate = allStats[rng.randomInt(0, allStats.length - 1)];
        
        const condition = player.condition || 100;
        const positiveChangeProbability = (condition - 30) / 100;
        
        const beforeStat = player.stats[statToFluctuate] || 0;
        let fluctuation: number;
        if (rng.random() < positiveChangeProbability) {
            fluctuation = rng.randomInt(1, 3);
        } else {
            fluctuation = rng.randomInt(-3, -1);
        }
        player.stats[statToFluctuate] = beforeStat + fluctuation;
        
        // 디버깅: 능력치 변동 로그 (매 5초마다)
        if (time % 5 === 0) {
            console.log(`[runClientSimulationStep] Time ${time}: ${player.nickname} ${statToFluctuate} ${beforeStat} → ${player.stats[statToFluctuate]} (${fluctuation > 0 ? '+' : ''}${fluctuation}), condition=${condition}`);
        }
    }
    
    // 점수 계산 (변동된 능력치 사용)
    const p1BasePower = calculatePower(player1, phase);
    const p2BasePower = calculatePower(player2, phase);
    
    // 디버깅: 점수 계산 로그 (매 5초마다)
    if (time % 5 === 0) {
        console.log(`[runClientSimulationStep] Time ${time}: p1BasePower=${p1BasePower.toFixed(2)}, p2BasePower=${p2BasePower.toFixed(2)}, phase=${phase}`);
    }
    
    // ±10% 랜덤 변동
    const p1RandomFactor = 1 + (rng.random() * 0.2 - 0.1);
    const p2RandomFactor = 1 + (rng.random() * 0.2 - 0.1);
    const p1PowerWithRandom = p1BasePower * p1RandomFactor;
    const p2PowerWithRandom = p2BasePower * p2RandomFactor;
    
    // 크리티컬 계산
    const p1Judgment = player1.stats[CoreStat.Judgment] || 0;
    const p2Judgment = player2.stats[CoreStat.Judgment] || 0;
    const p1CritMultiplier = 0.03 + rng.random() * 0.07;
    const p2CritMultiplier = 0.03 + rng.random() * 0.07;
    const p1CritChance = 15 + (p1Judgment * p1CritMultiplier);
    const p2CritChance = 15 + (p2Judgment * p2CritMultiplier);
    
    const p1IsCritical = rng.random() * 100 < p1CritChance;
    const p2IsCritical = rng.random() * 100 < p2CritChance;
    
    let p1FinalPower = p1PowerWithRandom;
    let p2FinalPower = p2PowerWithRandom;
    
    if (p1IsCritical) {
        const p1CombatPower = player1.stats[CoreStat.CombatPower] || 0;
        const p1Calculation = player1.stats[CoreStat.Calculation] || 0;
        const p1CritBonusPercent = (p1CombatPower * 0.1) + (p1Calculation * 0.5) + (rng.random() * 100 - 50);
        p1FinalPower = p1PowerWithRandom + (p1PowerWithRandom * p1CritBonusPercent / 100);
    }
    
    if (p2IsCritical) {
        const p2CombatPower = player2.stats[CoreStat.CombatPower] || 0;
        const p2Calculation = player2.stats[CoreStat.Calculation] || 0;
        const p2CritBonusPercent = (p2CombatPower * 0.1) + (p2Calculation * 0.5) + (rng.random() * 100 - 50);
        p2FinalPower = p2PowerWithRandom + (p2PowerWithRandom * p2CritBonusPercent / 100);
    }
    
    const newPlayer1Score = player1Score + p1FinalPower;
    const newPlayer2Score = player2Score + p2FinalPower;
    
    // 중계 메시지
    if (time === 1) {
        commentary.push({ text: `초반전이 시작되었습니다. (필요능력치: 전투력, 사고속도, 집중력)`, phase: 'early', isRandomEvent: false });
        commentary.push({ text: COMMENTARY_POOLS.start.replace('{p1}', player1.nickname).replace('{p2}', player2.nickname), phase: 'early', isRandomEvent: false });
    } else if (time === EARLY_GAME_DURATION + 1) {
        commentary.push({ text: `중반전이 시작되었습니다. (필요능력치: 전투력, 판단력, 집중력, 안정감)`, phase: 'mid', isRandomEvent: false });
    } else if (time === EARLY_GAME_DURATION + MID_GAME_DURATION + 1) {
        commentary.push({ text: `종반전이 시작되었습니다. (필요능력치: 계산력, 안정감, 집중력)`, phase: 'end', isRandomEvent: false });
    } else if (time % 10 === 0 && time > 0 && time < TOTAL_GAME_DURATION) {
        const totalScore = newPlayer1Score + newPlayer2Score;
        const p1Percent = totalScore > 0 ? (newPlayer1Score / totalScore) * 100 : 50;
        const leadPercent = Math.abs(p1Percent - 50) * 2;
        const scoreDiff = (leadPercent / 2);
        const roundedDiff = Math.round(scoreDiff);
        const finalDiff = roundedDiff + 0.5;
        const leader = p1Percent > 50 ? player1.nickname : player2.nickname;
        if (finalDiff > 0.5) {
            commentary.push({ text: `[중간 스코어] ${leader} 선수 ${finalDiff.toFixed(1)}집 우세.`, phase, isRandomEvent: false });
        }
    } else if (time > 1 && time < TOTAL_GAME_DURATION) {
        const pool = COMMENTARY_POOLS[phase];
        const recentComments = commentary.slice(-3).map(c => c.text);
        
        let newCommentText: string;
        if (pool.length > 1) {
            let attempts = 0;
            let candidateText: string;
            do {
                candidateText = pool[rng.randomInt(0, pool.length - 1)];
                candidateText = candidateText.replace('{p1}', player1.nickname).replace('{p2}', player2.nickname);
                attempts++;
            } while (recentComments.includes(candidateText) && attempts < 10);
            newCommentText = candidateText;
        } else {
            newCommentText = pool[0].replace('{p1}', player1.nickname).replace('{p2}', player2.nickname);
        }
        
        commentary.push({ text: newCommentText, phase, isRandomEvent: false });
    }
    
    // 랜덤 이벤트 (5초마다, 마지막 5초 제외)
    const RANDOM_EVENT_STOP_TIME = TOTAL_GAME_DURATION - 5;
    if (time > 1 && time <= RANDOM_EVENT_STOP_TIME && time % 5 === 0) {
        if (rng.random() < 0.30) {
            const events = [
                { type: CoreStat.Concentration, isPositive: false, text: "{player}님이 조급한 마음에 실수가 나왔습니다." },
                { type: CoreStat.ThinkingSpeed, isPositive: true, text: "{player}님이 시간 압박에서도 좋은 수를 둡니다." },
                { type: CoreStat.CombatPower, isPositive: true, text: "{player}님이 공격적인 수로 판세를 흔듭니다." },
                { type: CoreStat.Stability, isPositive: true, text: "{player}님이 차분하게 받아치며 불리한 싸움을 버팁니다." },
            ];
            
            const eventOptions: Array<{ event: typeof events[0]; player: PlayerForTournament; weight: number }> = [];
            
            for (const event of events) {
                const p1Stat = player1.stats[event.type] || 100;
                const p2Stat = player2.stats[event.type] || 100;
                
                const totalStat = p1Stat + p2Stat;
                const statDiff = Math.abs(p1Stat - p2Stat);
                const statDiffPercent = totalStat > 0 ? (statDiff / totalStat) * 100 : 0;
                
                if (event.isPositive) {
                    if (p1Stat > p2Stat) {
                        const p1Weight = 50 + (statDiffPercent / 2);
                        eventOptions.push({ event, player: player1, weight: p1Weight });
                    } else if (p2Stat > p1Stat) {
                        const p2Weight = 50 + (statDiffPercent / 2);
                        eventOptions.push({ event, player: player2, weight: p2Weight });
                    } else {
                        eventOptions.push({ event, player: player1, weight: 50 });
                        eventOptions.push({ event, player: player2, weight: 50 });
                    }
                } else {
                    if (p1Stat < p2Stat) {
                        const p1Weight = 50 + (statDiffPercent / 2);
                        eventOptions.push({ event, player: player1, weight: p1Weight });
                    } else if (p2Stat < p1Stat) {
                        const p2Weight = 50 + (statDiffPercent / 2);
                        eventOptions.push({ event, player: player2, weight: p2Weight });
                    } else {
                        eventOptions.push({ event, player: player1, weight: 50 });
                        eventOptions.push({ event, player: player2, weight: 50 });
                    }
                }
            }
            
            const totalWeight = eventOptions.reduce((sum, opt) => sum + opt.weight, 0);
            let random = rng.random() * totalWeight;
            let selectedOption = eventOptions[0];
            
            for (const option of eventOptions) {
                if (random <= option.weight) {
                    selectedOption = option;
                    break;
                }
                random -= option.weight;
            }
            
            const { event, player: playerForEvent } = selectedOption;
            let triggeredMessage = event.text.replace('{player}', playerForEvent.nickname);
            const isMistake = !event.isPositive;
            
            const randomPercent = rng.random() * 8 + 2;
            const points = Math.round(randomPercent / 2);
            
            const currentTotal = newPlayer1Score + newPlayer2Score;
            const scoreChange = currentTotal * (randomPercent / 100);
            
            triggeredMessage += ` (${isMistake ? '-' : '+'}${points}집)`;
            
            if (playerForEvent.id === player1.id) {
                return {
                    player1Score: newPlayer1Score + (isMistake ? -scoreChange : scoreChange),
                    player2Score: newPlayer2Score,
                    commentary: [...commentary, { text: triggeredMessage, phase, isRandomEvent: true }],
                    p1IsCritical,
                    p2IsCritical
                };
            } else {
                return {
                    player1Score: newPlayer1Score,
                    player2Score: newPlayer2Score + (isMistake ? -scoreChange : scoreChange),
                    commentary: [...commentary, { text: triggeredMessage, phase, isRandomEvent: true }],
                    p1IsCritical,
                    p2IsCritical
                };
            }
        }
    }
    
    // 크리티컬 정보 반환
    return {
        player1Score: newPlayer1Score,
        player2Score: newPlayer2Score,
        commentary,
        p1IsCritical,
        p2IsCritical
    };
};

export const runClientSimulation = (
    seed: string,
    p1: PlayerForTournament,
    p2: PlayerForTournament
): SimulationResult => {
    const rng = new SeededRandom(seed);
    
    // 플레이어 복사 (원본 수정 방지)
    const player1 = JSON.parse(JSON.stringify(p1));
    const player2 = JSON.parse(JSON.stringify(p2));
    
    // 컨디션 설정 (시드 기반)
    if (player1.condition === undefined || player1.condition === null || player1.condition === 1000) {
        player1.condition = rng.randomInt(40, 100);
    }
    if (player2.condition === undefined || player2.condition === null || player2.condition === 1000) {
        player2.condition = rng.randomInt(40, 100);
    }
    
    let player1Score = 0;
    let player2Score = 0;
    const commentary: CommentaryLine[] = [];
    
    // 초기화
    if (player1.originalStats) {
        player1.stats = JSON.parse(JSON.stringify(player1.originalStats));
    }
    if (player2.originalStats) {
        player2.stats = JSON.parse(JSON.stringify(player2.originalStats));
    }
    
    // 50초 시뮬레이션 실행
    for (let t = 1; t <= TOTAL_GAME_DURATION; t++) {
        const phase = getPhase(t);
        
        // 능력치 변동 (매초마다)
        const playersToUpdate = [player1, player2];
        for (const player of playersToUpdate) {
            const allStats = Object.values(CoreStat);
            const statToFluctuate = allStats[rng.randomInt(0, allStats.length - 1)];
            
            const condition = player.condition || 100;
            const positiveChangeProbability = (condition - 30) / 100;
            
            let fluctuation: number;
            if (rng.random() < positiveChangeProbability) {
                fluctuation = rng.randomInt(1, 3);
            } else {
                fluctuation = rng.randomInt(-3, -1);
            }
            player.stats[statToFluctuate] = (player.stats[statToFluctuate] || 0) + fluctuation;
        }
        
        // 점수 계산
        const p1BasePower = calculatePower(player1, phase);
        const p2BasePower = calculatePower(player2, phase);
        
        // ±10% 랜덤 변동
        const p1RandomFactor = 1 + (rng.random() * 0.2 - 0.1);
        const p2RandomFactor = 1 + (rng.random() * 0.2 - 0.1);
        const p1PowerWithRandom = p1BasePower * p1RandomFactor;
        const p2PowerWithRandom = p2BasePower * p2RandomFactor;
        
        // 크리티컬 계산
        const p1Judgment = player1.stats[CoreStat.Judgment] || 0;
        const p2Judgment = player2.stats[CoreStat.Judgment] || 0;
        const p1CritMultiplier = 0.03 + rng.random() * 0.07;
        const p2CritMultiplier = 0.03 + rng.random() * 0.07;
        const p1CritChance = 15 + (p1Judgment * p1CritMultiplier);
        const p2CritChance = 15 + (p2Judgment * p2CritMultiplier);
        
        const p1IsCritical = rng.random() * 100 < p1CritChance;
        const p2IsCritical = rng.random() * 100 < p2CritChance;
        
        let p1FinalPower = p1PowerWithRandom;
        let p2FinalPower = p2PowerWithRandom;
        
        if (p1IsCritical) {
            const p1CombatPower = player1.stats[CoreStat.CombatPower] || 0;
            const p1Calculation = player1.stats[CoreStat.Calculation] || 0;
            const p1CritBonusPercent = (p1CombatPower * 0.1) + (p1Calculation * 0.5) + (rng.random() * 100 - 50);
            p1FinalPower = p1PowerWithRandom + (p1PowerWithRandom * p1CritBonusPercent / 100);
        }
        
        if (p2IsCritical) {
            const p2CombatPower = player2.stats[CoreStat.CombatPower] || 0;
            const p2Calculation = player2.stats[CoreStat.Calculation] || 0;
            const p2CritBonusPercent = (p2CombatPower * 0.1) + (p2Calculation * 0.5) + (rng.random() * 100 - 50);
            p2FinalPower = p2PowerWithRandom + (p2PowerWithRandom * p2CritBonusPercent / 100);
        }
        
        player1Score += p1FinalPower;
        player2Score += p2FinalPower;
        
        // 중계 메시지
        if (t === 1) {
            commentary.push({ text: `초반전이 시작되었습니다. (필요능력치: 전투력, 사고속도, 집중력)`, phase: 'early', isRandomEvent: false });
            commentary.push({ text: COMMENTARY_POOLS.start.replace('{p1}', player1.nickname).replace('{p2}', player2.nickname), phase: 'early', isRandomEvent: false });
        } else if (t === EARLY_GAME_DURATION + 1) {
            commentary.push({ text: `중반전이 시작되었습니다. (필요능력치: 전투력, 판단력, 집중력, 안정감)`, phase: 'mid', isRandomEvent: false });
        } else if (t === EARLY_GAME_DURATION + MID_GAME_DURATION + 1) {
            commentary.push({ text: `종반전이 시작되었습니다. (필요능력치: 계산력, 안정감, 집중력)`, phase: 'end', isRandomEvent: false });
        } else if (t % 10 === 0 && t > 0 && t < TOTAL_GAME_DURATION) {
            const totalScore = player1Score + player2Score;
            const p1Percent = totalScore > 0 ? (player1Score / totalScore) * 100 : 50;
            const leadPercent = Math.abs(p1Percent - 50) * 2;
            const scoreDiff = (leadPercent / 2);
            const roundedDiff = Math.round(scoreDiff);
            const finalDiff = roundedDiff + 0.5;
            const leader = p1Percent > 50 ? player1.nickname : player2.nickname;
            if (finalDiff > 0.5) {
                commentary.push({ text: `[중간 스코어] ${leader} 선수 ${finalDiff.toFixed(1)}집 우세.`, phase, isRandomEvent: false });
            }
        } else if (t > 1 && t < TOTAL_GAME_DURATION) {
            const pool = COMMENTARY_POOLS[phase];
            const recentComments = commentary.slice(-3).map(c => c.text);
            
            let newCommentText: string;
            if (pool.length > 1) {
                let attempts = 0;
                let candidateText: string;
                do {
                    candidateText = pool[rng.randomInt(0, pool.length - 1)];
                    candidateText = candidateText.replace('{p1}', player1.nickname).replace('{p2}', player2.nickname);
                    attempts++;
                } while (recentComments.includes(candidateText) && attempts < 10);
                newCommentText = candidateText;
            } else {
                newCommentText = pool[0].replace('{p1}', player1.nickname).replace('{p2}', player2.nickname);
            }
            
            commentary.push({ text: newCommentText, phase, isRandomEvent: false });
        }
        
        // 랜덤 이벤트 (5초마다, 마지막 5초 제외)
        const RANDOM_EVENT_STOP_TIME = TOTAL_GAME_DURATION - 5;
        if (t > 1 && t <= RANDOM_EVENT_STOP_TIME && t % 5 === 0) {
            if (rng.random() < 0.30) {
                const events = [
                    { type: CoreStat.Concentration, isPositive: false, text: "{player}님이 조급한 마음에 실수가 나왔습니다." },
                    { type: CoreStat.ThinkingSpeed, isPositive: true, text: "{player}님이 시간 압박에서도 좋은 수를 둡니다." },
                    { type: CoreStat.CombatPower, isPositive: true, text: "{player}님이 공격적인 수로 판세를 흔듭니다." },
                    { type: CoreStat.Stability, isPositive: true, text: "{player}님이 차분하게 받아치며 불리한 싸움을 버팁니다." },
                ];
                
                const eventOptions: Array<{ event: typeof events[0]; player: PlayerForTournament; weight: number }> = [];
                
                for (const event of events) {
                    const p1Stat = player1.stats[event.type] || 100;
                    const p2Stat = player2.stats[event.type] || 100;
                    
                    const totalStat = p1Stat + p2Stat;
                    const statDiff = Math.abs(p1Stat - p2Stat);
                    const statDiffPercent = totalStat > 0 ? (statDiff / totalStat) * 100 : 0;
                    
                    if (event.isPositive) {
                        if (p1Stat > p2Stat) {
                            const p1Weight = 50 + (statDiffPercent / 2);
                            eventOptions.push({ event, player: player1, weight: p1Weight });
                        } else if (p2Stat > p1Stat) {
                            const p2Weight = 50 + (statDiffPercent / 2);
                            eventOptions.push({ event, player: player2, weight: p2Weight });
                        } else {
                            eventOptions.push({ event, player: player1, weight: 50 });
                            eventOptions.push({ event, player: player2, weight: 50 });
                        }
                    } else {
                        if (p1Stat < p2Stat) {
                            const p1Weight = 50 + (statDiffPercent / 2);
                            eventOptions.push({ event, player: player1, weight: p1Weight });
                        } else if (p2Stat < p1Stat) {
                            const p2Weight = 50 + (statDiffPercent / 2);
                            eventOptions.push({ event, player: player2, weight: p2Weight });
                        } else {
                            eventOptions.push({ event, player: player1, weight: 50 });
                            eventOptions.push({ event, player: player2, weight: 50 });
                        }
                    }
                }
                
                const totalWeight = eventOptions.reduce((sum, opt) => sum + opt.weight, 0);
                let random = rng.random() * totalWeight;
                let selectedOption = eventOptions[0];
                
                for (const option of eventOptions) {
                    if (random <= option.weight) {
                        selectedOption = option;
                        break;
                    }
                    random -= option.weight;
                }
                
                const { event, player: playerForEvent } = selectedOption;
                let triggeredMessage = event.text.replace('{player}', playerForEvent.nickname);
                const isMistake = !event.isPositive;
                
                const randomPercent = rng.random() * 8 + 2;
                const points = Math.round(randomPercent / 2);
                
                const currentTotal = player1Score + player2Score;
                const scoreChange = currentTotal * (randomPercent / 100);
                
                triggeredMessage += ` (${isMistake ? '-' : '+'}${points}집)`;
                
                if (playerForEvent.id === player1.id) {
                    player1Score += isMistake ? -scoreChange : scoreChange;
                } else {
                    player2Score += isMistake ? -scoreChange : scoreChange;
                }
                
                commentary.push({ text: triggeredMessage, phase, isRandomEvent: true });
            }
        }
    }
    
    // 최종 결과 계산
    const totalScore = player1Score + player2Score;
    const p1Percent = totalScore > 0 ? (player1Score / totalScore) * 100 : 50;
    
    const diffPercent = Math.abs(p1Percent - 50) * 2;
    const scoreDiff = (diffPercent / 2);
    const roundedDiff = Math.round(scoreDiff);
    const finalDiff = roundedDiff + 0.5;
    
    let winner: PlayerForTournament;
    let commentaryText: string;
    
    if (finalDiff < 0.5) {
        winner = rng.random() < 0.5 ? player1 : player2;
        commentaryText = `[최종결과] ${winner.nickname}, 0.5집 승리!`;
    } else {
        winner = p1Percent > 50 ? player1 : player2;
        commentaryText = `[최종결과] ${winner.nickname}, ${finalDiff.toFixed(1)}집 승리!`;
    }
    
    const winComment = COMMENTARY_POOLS.win[rng.randomInt(0, COMMENTARY_POOLS.win.length - 1)].replace('{winner}', winner.nickname);
    
    commentary.push({ text: commentaryText, phase: 'end', isRandomEvent: false });
    commentary.push({ text: winComment, phase: 'end', isRandomEvent: false });
    
    return {
        timeElapsed: TOTAL_GAME_DURATION,
        player1Score,
        player2Score,
        commentary,
        winnerId: winner.id
    };
};

