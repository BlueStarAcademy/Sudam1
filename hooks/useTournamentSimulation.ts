import { useEffect, useRef, useState } from 'react';
import { TournamentState, User } from '../types';
import { useAppContext } from './useAppContext';
import { runClientSimulationStep, SeededRandom } from '../utils/tournamentSimulation';

const TOTAL_GAME_DURATION = 50;

export const useTournamentSimulation = (tournament: TournamentState | null, currentUser: User | null) => {
    const { handlers } = useAppContext();
    const [localTournament, setLocalTournament] = useState<TournamentState | null>(tournament);
    const simulationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const simulationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSimulatingRef = useRef(false);
    const hasCompletedRef = useRef(false);
    const rngRef = useRef<SeededRandom | null>(null);
    const player1Ref = useRef<any>(null);
    const player2Ref = useRef<any>(null);
    const player1ScoreRef = useRef(0);
    const player2ScoreRef = useRef(0);
    const commentaryRef = useRef<any[]>([]);
    const timeElapsedRef = useRef(0);

    // 토너먼트 상태가 변경되면 로컬 상태 업데이트
    useEffect(() => {
        if (tournament) {
            const prevStatus = localTournament?.status;
            const newStatus = tournament.status;
            const prevSeed = localTournament?.simulationSeed;
            const newSeed = tournament.simulationSeed;
            
            // 시뮬레이션이 진행 중이고 시드가 변경되지 않았으면 리셋하지 않음
            const isSimulationRunning = simulationIntervalRef.current !== null;
            const isNewMatch = newSeed && newSeed !== prevSeed;
            
            // 플레이어 컨디션 변경 감지 (회복제 사용 등) - 모든 플레이어 확인
            const hasConditionChanged = tournament.players.some((p) => {
                const localPlayer = localTournament?.players.find(lp => lp.id === p.id);
                return localPlayer && localPlayer.condition !== p.condition && 
                       p.condition !== undefined && p.condition !== null && p.condition !== 1000;
            });
            
            // 시드가 새로 생성되면 시뮬레이션 재시작 (START_TOURNAMENT_MATCH에서만 시드가 생성됨)
            if (isNewMatch) {
                if (import.meta.env.DEV) {
                    console.log(`[useTournamentSimulation] New match detected, resetting simulation state`);
                }
                hasCompletedRef.current = false;
                isSimulatingRef.current = false;
                timeElapsedRef.current = 0;
                player1ScoreRef.current = 0;
                player2ScoreRef.current = 0;
                commentaryRef.current = [];
                if (simulationIntervalRef.current) {
                    clearInterval(simulationIntervalRef.current);
                    simulationIntervalRef.current = null;
                }
                if (simulationTimeoutRef.current) {
                    clearTimeout(simulationTimeoutRef.current);
                    simulationTimeoutRef.current = null;
                }
                // 새 매치가 시작되면 로컬 상태 업데이트
                setLocalTournament(tournament);
            } else if (isSimulationRunning && !isNewMatch) {
                // 시뮬레이션이 진행 중이고 새로운 매치가 아니면 리셋하지 않음
                // 하지만 서버에서 업데이트된 정보(예: 다른 경기 결과, 회복제 사용으로 인한 컨디션 변경)는 반영해야 하므로
                // currentSimulatingMatch가 같고 시드가 같으면 로컬 상태만 업데이트 (리셋 없이)
                if (newStatus === 'round_in_progress' && 
                    tournament.currentSimulatingMatch && 
                    localTournament?.currentSimulatingMatch &&
                    tournament.currentSimulatingMatch.roundIndex === localTournament.currentSimulatingMatch.roundIndex &&
                    tournament.currentSimulatingMatch.matchIndex === localTournament.currentSimulatingMatch.matchIndex &&
                    newSeed === prevSeed) {
                    // 같은 경기가 진행 중이면 리셋하지 않고 로컬 상태만 업데이트
                    // 단, timeElapsed는 클라이언트에서 실시간으로 업데이트되므로 서버 값으로 덮어쓰지 않음
                    setLocalTournament(prev => {
                        if (!prev) return tournament;
                        return {
                            ...tournament,
                            timeElapsed: prev.timeElapsed, // 클라이언트의 실시간 timeElapsed 유지
                            currentMatchScores: prev.currentMatchScores, // 클라이언트의 실시간 점수 유지
                            currentMatchCommentary: prev.currentMatchCommentary // 클라이언트의 실시간 중계 유지
                        };
                    });
                } else if (hasConditionChanged && newStatus === 'bracket_ready') {
                    // bracket_ready 상태에서 컨디션이 변경되었으면 (회복제 사용 등) 로컬 상태 업데이트
                    setLocalTournament(tournament);
                }
                // 그 외의 경우는 리셋하지 않음
            } else if (newStatus !== 'round_in_progress' && prevStatus === 'round_in_progress') {
                // round_in_progress에서 다른 상태로 변경되면 시뮬레이션 정리
                // 시뮬레이션이 완료된 경우에는 hasCompletedRef를 유지하여 재시작 방지
                // 하지만 상태가 변경되었으므로 정리
                if (!hasCompletedRef.current) {
                    hasCompletedRef.current = false;
                }
                isSimulatingRef.current = false;
                timeElapsedRef.current = 0;
                player1ScoreRef.current = 0;
                player2ScoreRef.current = 0;
                commentaryRef.current = [];
                if (simulationIntervalRef.current) {
                    clearInterval(simulationIntervalRef.current);
                    simulationIntervalRef.current = null;
                }
                if (simulationTimeoutRef.current) {
                    clearTimeout(simulationTimeoutRef.current);
                    simulationTimeoutRef.current = null;
                }
            } else if (newStatus === 'round_in_progress' && prevStatus === 'round_in_progress' && !newSeed && prevSeed) {
                // 같은 round_in_progress 상태이지만 시드가 사라진 경우 (시뮬레이션 완료 후 서버에서 시드 제거)
                // currentSimulatingMatch도 null이 되었을 가능성이 높음
                if (!tournament.currentSimulatingMatch) {
                    hasCompletedRef.current = true; // 시뮬레이션 완료로 표시하여 재시작 방지
                    isSimulatingRef.current = false;
                    if (simulationIntervalRef.current) {
                        clearInterval(simulationIntervalRef.current);
                        simulationIntervalRef.current = null;
                    }
                    // 시뮬레이션이 완료되었으므로 서버에서 업데이트된 tournament 상태를 반영
                    setLocalTournament(tournament);
                } else {
                    // currentSimulatingMatch가 여전히 있지만 시드가 없으면, 새로운 경기가 시작된 것
                    // 이 경우 hasCompletedRef를 false로 리셋하여 새 시뮬레이션이 시작될 수 있도록 함
                    const isDifferentMatch = !localTournament?.currentSimulatingMatch || 
                        tournament.currentSimulatingMatch.roundIndex !== localTournament.currentSimulatingMatch.roundIndex ||
                        tournament.currentSimulatingMatch.matchIndex !== localTournament.currentSimulatingMatch.matchIndex;
                    if (isDifferentMatch) {
                        hasCompletedRef.current = false;
                        isSimulatingRef.current = false;
                        timeElapsedRef.current = 0;
                        player1ScoreRef.current = 0;
                        player2ScoreRef.current = 0;
                        commentaryRef.current = [];
                        setLocalTournament(tournament);
                    }
                }
            } else if (hasCompletedRef.current && newStatus !== 'round_in_progress' && prevStatus === 'round_in_progress') {
                // 시뮬레이션이 완료된 후 서버에서 상태가 업데이트된 경우 (round_complete 또는 bracket_ready)
                // hasCompletedRef는 유지하여 재시작 방지
                setLocalTournament(tournament);
            } else if (hasCompletedRef.current && newStatus === prevStatus && newSeed === prevSeed) {
                // 시뮬레이션이 완료된 후 서버에서 다른 업데이트가 있는 경우 (예: match.isFinished, match.winner 등)
                // localTournament를 업데이트하여 최종 결과를 반영
                setLocalTournament(tournament);
            } else if (hasCompletedRef.current && newStatus === 'round_in_progress' && newSeed && !prevSeed) {
                // 시뮬레이션이 완료된 후 새로운 경기가 시작된 경우 (새 시드가 생김)
                // 이 경우에는 hasCompletedRef를 false로 리셋하여 새 시뮬레이션이 시작될 수 있도록 함
                const isDifferentMatch = !localTournament?.currentSimulatingMatch || 
                    !tournament.currentSimulatingMatch ||
                    tournament.currentSimulatingMatch.roundIndex !== localTournament.currentSimulatingMatch.roundIndex ||
                    tournament.currentSimulatingMatch.matchIndex !== localTournament.currentSimulatingMatch.matchIndex;
                if (isDifferentMatch) {
                    hasCompletedRef.current = false;
                    isSimulatingRef.current = false;
                    timeElapsedRef.current = 0;
                    player1ScoreRef.current = 0;
                    player2ScoreRef.current = 0;
                    commentaryRef.current = [];
                    setLocalTournament(tournament);
                }
            } else if (newStatus === 'bracket_ready' && prevStatus === 'bracket_ready') {
                // bracket_ready 상태에서 컨디션이 변경되었으면 (회복제 사용 등) 로컬 상태 업데이트
                // 플레이어 컨디션 변경 감지
                const hasConditionChanged = currentUser && tournament.players.some((p) => {
                    const localPlayer = localTournament?.players.find(lp => lp.id === p.id);
                    return localPlayer && localPlayer.condition !== p.condition && 
                           p.condition !== undefined && p.condition !== null && p.condition !== 1000;
                });
                if (hasConditionChanged) {
                    setLocalTournament(tournament);
                }
            } else if (newStatus === prevStatus && newSeed === prevSeed && !isSimulationRunning) {
                // 같은 상태이고 시드가 같고 시뮬레이션이 진행 중이 아닐 때
                // 컨디션 변경 등 다른 업데이트가 있을 수 있으므로 확인
                const hasConditionChanged = currentUser && tournament.players.some((p) => {
                    const localPlayer = localTournament?.players.find(lp => lp.id === p.id);
                    return localPlayer && localPlayer.condition !== p.condition && 
                           p.condition !== undefined && p.condition !== null && p.condition !== 1000;
                });
                if (hasConditionChanged) {
                    // 컨디션이 변경되었으면 로컬 상태 업데이트
                    setLocalTournament(tournament);
                }
            }
        } else {
            setLocalTournament(null);
        }
    }, [tournament, currentUser]);

    useEffect(() => {
        if (!localTournament || !currentUser) {
            if (simulationIntervalRef.current) {
                clearInterval(simulationIntervalRef.current);
                simulationIntervalRef.current = null;
            }
            if (simulationTimeoutRef.current) {
                clearTimeout(simulationTimeoutRef.current);
                simulationTimeoutRef.current = null;
            }
            return;
        }

        // 이미 시뮬레이션이 진행 중이면 새로운 시뮬레이션을 시작하지 않음
        if (simulationIntervalRef.current) {
            return;
        }

        // 시뮬레이션이 진행 중이고 시드가 있고 아직 완료하지 않았을 때만 클라이언트에서 실행
        // simulationSeed는 START_TOURNAMENT_MATCH에서만 생성되므로, 시드가 있으면 경기가 시작된 것
        // 추가로 currentSimulatingMatch가 유효한지 확인
        // 경기가 이미 완료되었는지도 확인 (match.isFinished)
        const match = localTournament.currentSimulatingMatch 
            ? localTournament.rounds[localTournament.currentSimulatingMatch.roundIndex]
                ?.matches[localTournament.currentSimulatingMatch.matchIndex]
            : null;
        const hasValidConditions = localTournament.status === 'round_in_progress' && 
            localTournament.currentSimulatingMatch && 
            localTournament.simulationSeed &&
            !hasCompletedRef.current &&
            !isSimulatingRef.current &&
            match &&
            !match.isFinished; // 경기가 이미 완료되었으면 시작하지 않음
        
        // 디버깅: 조건 확인 로그 (프로덕션에서도 출력)
        if (localTournament.status === 'round_in_progress' && !hasValidConditions) {
            console.log('[useTournamentSimulation] Conditions check:', {
                status: localTournament.status,
                hasCurrentSimulatingMatch: !!localTournament.currentSimulatingMatch,
                hasSimulationSeed: !!localTournament.simulationSeed,
                hasCompleted: hasCompletedRef.current,
                isSimulating: isSimulatingRef.current,
                hasMatch: !!match,
                matchFinished: match?.isFinished
            });
        }
        
        // isSimulating이 true인데 실제로 interval이 없으면 리셋 (hasValidConditions 체크 전에)
        // 단, hasValidConditions가 false이면 무조건 리셋
        if (isSimulatingRef.current && !simulationIntervalRef.current) {
            console.warn(`[useTournamentSimulation] isSimulating is true but no interval exists, resetting...`);
            isSimulatingRef.current = false;
            // 리셋 후에는 시뮬레이션을 시작하지 않고 종료 (다음 useEffect 실행 시 hasValidConditions 체크)
            return;
        }
        
        if (hasValidConditions) {
            console.log('[useTournamentSimulation] Starting simulation with valid conditions');
            // match는 이미 위에서 확인했으므로 다시 확인할 필요 없음
            if (!match) {
                if (import.meta.env.DEV) {
                    console.warn(`[useTournamentSimulation] Invalid match reference`);
                }
                return;
            }
            
            if (import.meta.env.DEV) {
                console.log(`[useTournamentSimulation] Starting simulation`);
            }
            
            // hasCompletedRef는 시뮬레이션이 완료되었을 때만 true로 설정
            
            if (!match.players[0] || !match.players[1]) {
                if (import.meta.env.DEV) {
                    console.warn(`[useTournamentSimulation] Match missing players`);
                }
                isSimulatingRef.current = false;
                return;
            }
            
            // 서버에서 업데이트된 최신 컨디션을 반영하기 위해 tournament prop에서 직접 플레이어를 가져옴
            // localTournament는 이전 상태일 수 있으므로 tournament prop을 우선 사용
            const p1FromTournament = tournament?.players.find(p => p.id === match.players[0]!.id);
            const p2FromTournament = tournament?.players.find(p => p.id === match.players[1]!.id);
            const p1 = p1FromTournament || localTournament.players.find(p => p.id === match.players[0]!.id);
            const p2 = p2FromTournament || localTournament.players.find(p => p.id === match.players[1]!.id);
            
            if (!p1 || !p2) {
                isSimulatingRef.current = false;
                return;
            }
            
            // 플레이어 복사 및 초기화
            player1Ref.current = JSON.parse(JSON.stringify(p1));
            player2Ref.current = JSON.parse(JSON.stringify(p2));
            
            // 디버깅: 서버에서 받은 컨디션 값 확인
            if (import.meta.env.DEV) {
                console.log(`[useTournamentSimulation] Player conditions from server: p1=${p1.condition}, p2=${p2.condition}, currentUser=${currentUser?.id}`);
            }
            
            // RNG 초기화 (컨디션 설정 전에 먼저 초기화)
            rngRef.current = new SeededRandom(localTournament.simulationSeed!);
            
            // 컨디션 설정: 서버에서 받은 컨디션 값을 우선 사용
            // 유저의 경우: 서버에서 받은 컨디션 값을 절대 변경하지 않음 (회복제로 변경된 컨디션 유지)
            // 상대방의 경우: 서버에서 받은 컨디션이 유효하지 않을 때만 시드 기반으로 생성
            const isP1User = p1.id === currentUser?.id;
            const isP2User = p2.id === currentUser?.id;
            
            // p1 컨디션 설정
            if (isP1User) {
                // 유저의 경우: 서버에서 받은 컨디션 값을 절대 변경하지 않음
                // 유효한 컨디션(40-100 사이)이 있으면 그대로 사용
                if (p1.condition !== undefined && p1.condition !== null && p1.condition !== 1000 && 
                    p1.condition >= 40 && p1.condition <= 100) {
                    player1Ref.current.condition = p1.condition;
                    if (import.meta.env.DEV) {
                        console.log(`[useTournamentSimulation] Preserving user (p1) condition from server: ${p1.condition}`);
                    }
                } else {
                    // 유저의 컨디션이 유효하지 않은 경우에만 시드 기반으로 생성 (하위 호환성)
                    player1Ref.current.condition = rngRef.current.randomInt(40, 100);
                    if (import.meta.env.DEV) {
                        console.log(`[useTournamentSimulation] Generated new condition for user (p1): ${player1Ref.current.condition}`);
                    }
                }
            } else {
                // 상대방의 경우: 서버에서 받은 컨디션이 유효하지 않을 때만 시드 기반으로 생성
                if (p1.condition === undefined || p1.condition === null || p1.condition === 1000 || 
                    p1.condition < 40 || p1.condition > 100) {
                    player1Ref.current.condition = rngRef.current.randomInt(40, 100);
                    if (import.meta.env.DEV) {
                        console.log(`[useTournamentSimulation] Generated new condition for p1: ${player1Ref.current.condition}`);
                    }
                } else {
                    player1Ref.current.condition = p1.condition;
                    if (import.meta.env.DEV) {
                        console.log(`[useTournamentSimulation] Preserving p1 condition from server: ${p1.condition}`);
                    }
                }
            }
            
            // p2 컨디션 설정
            if (isP2User) {
                // 유저의 경우: 서버에서 받은 컨디션 값을 절대 변경하지 않음
                // 유효한 컨디션(40-100 사이)이 있으면 그대로 사용
                if (p2.condition !== undefined && p2.condition !== null && p2.condition !== 1000 && 
                    p2.condition >= 40 && p2.condition <= 100) {
                    player2Ref.current.condition = p2.condition;
                    if (import.meta.env.DEV) {
                        console.log(`[useTournamentSimulation] Preserving user (p2) condition from server: ${p2.condition}`);
                    }
                } else {
                    // 유저의 컨디션이 유효하지 않은 경우에만 시드 기반으로 생성 (하위 호환성)
                    player2Ref.current.condition = rngRef.current.randomInt(40, 100);
                    if (import.meta.env.DEV) {
                        console.log(`[useTournamentSimulation] Generated new condition for user (p2): ${player2Ref.current.condition}`);
                    }
                }
            } else {
                // 상대방의 경우: 서버에서 받은 컨디션이 유효하지 않을 때만 시드 기반으로 생성
                if (p2.condition === undefined || p2.condition === null || p2.condition === 1000 || 
                    p2.condition < 40 || p2.condition > 100) {
                    player2Ref.current.condition = rngRef.current.randomInt(40, 100);
                    if (import.meta.env.DEV) {
                        console.log(`[useTournamentSimulation] Generated new condition for p2: ${player2Ref.current.condition}`);
                    }
                } else {
                    player2Ref.current.condition = p2.condition;
                    if (import.meta.env.DEV) {
                        console.log(`[useTournamentSimulation] Preserving p2 condition from server: ${p2.condition}`);
                    }
                }
            }
            
            // 초기화
            if (player1Ref.current.originalStats) {
                player1Ref.current.stats = JSON.parse(JSON.stringify(player1Ref.current.originalStats));
            }
            if (player2Ref.current.originalStats) {
                player2Ref.current.stats = JSON.parse(JSON.stringify(player2Ref.current.originalStats));
            }
            player1ScoreRef.current = 0;
            player2ScoreRef.current = 0;
            commentaryRef.current = [];
            timeElapsedRef.current = 0;
            
            // interval 설정 전에 isSimulating을 true로 설정하여 중복 시작 방지
            // interval이 제대로 설정되면 시뮬레이션이 시작됨
            // interval 설정에 실패하면 isSimulating을 false로 리셋해야 함
            isSimulatingRef.current = true;
            
            console.log('[useTournamentSimulation] Setting up interval for simulation');
            
            try {
                // 1초마다 시뮬레이션 진행
                simulationIntervalRef.current = setInterval(() => {
                if (!rngRef.current || !player1Ref.current || !player2Ref.current) {
                    if (import.meta.env.DEV) {
                        console.warn(`[useTournamentSimulation] Missing refs in interval: rng=${!!rngRef.current}, p1=${!!player1Ref.current}, p2=${!!player2Ref.current}`);
                    }
                    return;
                }
                
                timeElapsedRef.current++;
                
                // 이전 점수 저장 (점수 증가량 계산용)
                const prevP1Score = player1ScoreRef.current;
                const prevP2Score = player2ScoreRef.current;
                
                const result = runClientSimulationStep(
                    rngRef.current,
                    player1Ref.current,
                    player2Ref.current,
                    timeElapsedRef.current,
                    player1ScoreRef.current,
                    player2ScoreRef.current,
                    commentaryRef.current
                );
                
                // 점수 증가량 계산
                const p1ScoreIncrement = result.player1Score - prevP1Score;
                const p2ScoreIncrement = result.player2Score - prevP2Score;
                
                // 크리티컬 여부 확인 (runClientSimulationStep에서 계산된 크리티컬 정보 사용)
                const p1IsCritical = result.p1IsCritical || false;
                const p2IsCritical = result.p2IsCritical || false;
                
                player1ScoreRef.current = result.player1Score;
                player2ScoreRef.current = result.player2Score;
                commentaryRef.current = result.commentary;
                
                // 로컬 토너먼트 상태 업데이트 (UI 반영)
                // setLocalTournament를 직접 호출하지 않고 함수형 업데이트를 사용하여
                // 첫 번째 useEffect가 불필요하게 실행되지 않도록 함
                // 단, 의존성 배열에 포함되지 않은 속성만 업데이트하여 재실행 방지
                setLocalTournament(prev => {
                    if (!prev) {
                        if (import.meta.env.DEV) {
                            console.warn(`[useTournamentSimulation] prev is null in setLocalTournament`);
                        }
                        return prev;
                    }
                    // status, simulationSeed, currentSimulatingMatch가 변경되지 않으면 useEffect가 재실행되지 않음
                    // 따라서 이 속성들은 그대로 유지하고 나머지만 업데이트
                    const updated = { ...prev };
                    updated.timeElapsed = timeElapsedRef.current;
                    if (!updated.currentMatchScores) {
                        updated.currentMatchScores = { player1: 0, player2: 0 };
                    }
                    updated.currentMatchScores.player1 = player1ScoreRef.current;
                    updated.currentMatchScores.player2 = player2ScoreRef.current;
                    updated.currentMatchCommentary = [...commentaryRef.current];
                    
                    // 점수 증가량 정보 업데이트 (애니메이션용)
                    updated.lastScoreIncrement = {
                        player1: p1ScoreIncrement > 0 ? {
                            base: p1ScoreIncrement,
                            actual: p1ScoreIncrement,
                            isCritical: p1IsCritical
                        } : null,
                        player2: p2ScoreIncrement > 0 ? {
                            base: p2ScoreIncrement,
                            actual: p2ScoreIncrement,
                            isCritical: p2IsCritical
                        } : null
                    };
                    
                    // 능력치 변동이 반영된 플레이어 정보 업데이트
                    // players 배열도 의존성에 포함되지 않으므로 안전하게 업데이트 가능
                    updated.players = updated.players.map(p => {
                        if (p.id === player1Ref.current.id) {
                            // 능력치 변동이 반영된 stats 사용 (깊은 복사)
                            return { 
                                ...player1Ref.current,
                                stats: { ...player1Ref.current.stats }
                            };
                        }
                        if (p.id === player2Ref.current.id) {
                            // 능력치 변동이 반영된 stats 사용 (깊은 복사)
                            return { 
                                ...player2Ref.current,
                                stats: { ...player2Ref.current.stats }
                            };
                        }
                        return p;
                    });
                    return updated;
                });
                
                // 50초가 지나면 종료
                if (timeElapsedRef.current >= TOTAL_GAME_DURATION) {
                    if (simulationIntervalRef.current) {
                        clearInterval(simulationIntervalRef.current);
                        simulationIntervalRef.current = null;
                    }
                    
                    // 최종 결과 계산
                    const totalScore = player1ScoreRef.current + player2ScoreRef.current;
                    const p1Percent = totalScore > 0 ? (player1ScoreRef.current / totalScore) * 100 : 50;
                    const diffPercent = Math.abs(p1Percent - 50) * 2;
                    const scoreDiff = (diffPercent / 2);
                    const roundedDiff = Math.round(scoreDiff);
                    const finalDiff = roundedDiff + 0.5;
                    
                    let winnerId: string;
                    let winnerNickname: string;
                    if (finalDiff < 0.5) {
                        const randomWinner = (rngRef.current && rngRef.current.random() < 0.5) ? player1Ref.current : player2Ref.current;
                        winnerId = randomWinner.id;
                        winnerNickname = randomWinner.nickname;
                    } else {
                        const winner = p1Percent > 50 ? player1Ref.current : player2Ref.current;
                        winnerId = winner.id;
                        winnerNickname = winner.nickname;
                    }
                    
                    // 최종 결과 메시지를 중계에 추가
                    const finalCommentaryText = finalDiff < 0.5 
                        ? `[최종결과] ${winnerNickname}, 0.5집 승리!`
                        : `[최종결과] ${winnerNickname}, ${finalDiff.toFixed(1)}집 승리!`;
                    
                    commentaryRef.current.push({ 
                        text: finalCommentaryText, 
                        phase: 'end', 
                        isRandomEvent: false 
                    });
                    
                    // 승리 코멘트 추가 (간단한 메시지)
                    commentaryRef.current.push({ 
                        text: `${winnerNickname}님이 승리했습니다!`, 
                        phase: 'end', 
                        isRandomEvent: false 
                    });
                    
                    // 최종 상태를 로컬에 즉시 업데이트 (UI가 멈추지 않도록)
                    setLocalTournament(prev => {
                        if (!prev) return prev;
                        const updated = { ...prev };
                        updated.timeElapsed = TOTAL_GAME_DURATION;
                        if (!updated.currentMatchScores) {
                            updated.currentMatchScores = { player1: 0, player2: 0 };
                        }
                        updated.currentMatchScores.player1 = player1ScoreRef.current;
                        updated.currentMatchScores.player2 = player2ScoreRef.current;
                        updated.currentMatchCommentary = [...commentaryRef.current];
                        // 시뮬레이션 완료 표시를 위해 시드 제거 (서버에서도 제거됨)
                        updated.simulationSeed = undefined;
                        // currentSimulatingMatch는 null로 설정하지 않고 유지하여 경기 종료 화면이 사라지지 않도록 함
                        // 서버에서 상태가 업데이트되면 자동으로 반영됨
                        return updated;
                    });
                    
                    // 서버로 결과 전송 (한 번만)
                    handlers.handleAction({
                        type: 'COMPLETE_TOURNAMENT_SIMULATION',
                        payload: {
                            type: localTournament.type,
                            result: {
                                timeElapsed: TOTAL_GAME_DURATION,
                                player1Score: player1ScoreRef.current,
                                player2Score: player2ScoreRef.current,
                                commentary: commentaryRef.current,
                                winnerId: winnerId
                            }
                        }
                    });
                    
                    isSimulatingRef.current = false;
                    hasCompletedRef.current = true; // 시뮬레이션 완료 표시
                }
                }, 1000); // 1초마다
                
                // interval이 제대로 설정되었는지 확인
                if (!simulationIntervalRef.current) {
                    // interval 설정 실패 시 리셋
                    console.error(`[useTournamentSimulation] Failed to create interval`);
                    isSimulatingRef.current = false;
                    hasCompletedRef.current = false;
                } else {
                    console.log('[useTournamentSimulation] Interval created successfully');
                }
            } catch (error) {
                // interval 설정 중 에러 발생 시 리셋
                console.error(`[useTournamentSimulation] Error starting simulation:`, error);
                isSimulatingRef.current = false;
                hasCompletedRef.current = false;
                if (simulationIntervalRef.current) {
                    clearInterval(simulationIntervalRef.current);
                    simulationIntervalRef.current = null;
                }
            }
        } else {
            if (simulationIntervalRef.current) {
                clearInterval(simulationIntervalRef.current);
                simulationIntervalRef.current = null;
            }
            if (simulationTimeoutRef.current) {
                clearTimeout(simulationTimeoutRef.current);
                simulationTimeoutRef.current = null;
            }
            if (localTournament.status !== 'round_in_progress') {
                isSimulatingRef.current = false;
                hasCompletedRef.current = false;
                timeElapsedRef.current = 0;
                player1ScoreRef.current = 0;
                player2ScoreRef.current = 0;
                commentaryRef.current = [];
            }
        }

        return () => {
            if (simulationIntervalRef.current) {
                clearInterval(simulationIntervalRef.current);
                simulationIntervalRef.current = null;
            }
            if (simulationTimeoutRef.current) {
                clearTimeout(simulationTimeoutRef.current);
                simulationTimeoutRef.current = null;
            }
        };
    }, [
        // localTournament 객체 자체를 의존성에서 제거하고 필요한 속성만 사용
        // 이렇게 하면 setLocalTournament가 호출되어도 불필요하게 재실행되지 않음
        localTournament?.status, 
        localTournament?.simulationSeed, 
        localTournament?.currentSimulatingMatch?.roundIndex,
        localTournament?.currentSimulatingMatch?.matchIndex,
        // tournament prop을 의존성에 추가하여 최신 컨디션 값이 반영되도록 함
        // 경기 시작 대기 중에 회복제로 회복한 컨디션이 경기 시작 시에도 유지되도록 함
        tournament,
        currentUser?.id
        // handlers를 의존성에서 제거: handlers가 변경되어도 시뮬레이션을 재시작할 필요 없음
        // handlers.handleAction은 interval 내부에서 사용되므로 closure로 캡처됨
    ]);

    return localTournament;
};

