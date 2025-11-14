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
            
            console.log(`[useTournamentSimulation] Tournament update: prevStatus=${prevStatus}, newStatus=${newStatus}, prevSeed=${prevSeed}, newSeed=${newSeed}`);
            
            // 시뮬레이션이 진행 중이고 시드가 변경되지 않았으면 리셋하지 않음
            const isSimulationRunning = simulationIntervalRef.current !== null;
            const isNewMatch = newSeed && newSeed !== prevSeed;
            
            // 시드가 새로 생성되면 시뮬레이션 재시작 (START_TOURNAMENT_MATCH에서만 시드가 생성됨)
            if (isNewMatch) {
                console.log(`[useTournamentSimulation] New match detected, resetting simulation state: newSeed=${newSeed}, prevSeed=${prevSeed}, newStatus=${newStatus}, prevStatus=${prevStatus}`);
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
                // 하지만 서버에서 업데이트된 정보(예: 다른 경기 결과)는 반영해야 하므로
                // currentSimulatingMatch가 같고 시드가 같으면 로컬 상태만 업데이트 (리셋 없이)
                if (newStatus === 'round_in_progress' && 
                    tournament.currentSimulatingMatch && 
                    localTournament?.currentSimulatingMatch &&
                    tournament.currentSimulatingMatch.roundIndex === localTournament.currentSimulatingMatch.roundIndex &&
                    tournament.currentSimulatingMatch.matchIndex === localTournament.currentSimulatingMatch.matchIndex &&
                    newSeed === prevSeed) {
                    // 같은 경기가 진행 중이면 리셋하지 않고 로컬 상태만 업데이트
                    console.log(`[useTournamentSimulation] Same match running, updating local state without reset`);
                    setLocalTournament(tournament);
                }
                // 그 외의 경우는 리셋하지 않음
            } else if (newStatus !== 'round_in_progress' && prevStatus === 'round_in_progress') {
                // round_in_progress에서 다른 상태로 변경되면 시뮬레이션 정리
                console.log(`[useTournamentSimulation] Cleaning up simulation: newStatus=${newStatus}, prevStatus=${prevStatus}`);
                // 시뮬레이션이 완료된 경우에는 hasCompletedRef를 유지하여 재시작 방지
                // 하지만 상태가 변경되었으므로 정리
                if (hasCompletedRef.current) {
                    console.log(`[useTournamentSimulation] Simulation was completed, keeping hasCompletedRef to prevent restart`);
                } else {
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
                    console.log(`[useTournamentSimulation] Simulation seed removed and no currentSimulatingMatch, marking as completed`);
                    hasCompletedRef.current = true; // 시뮬레이션 완료로 표시하여 재시작 방지
                    isSimulatingRef.current = false;
                    if (simulationIntervalRef.current) {
                        clearInterval(simulationIntervalRef.current);
                        simulationIntervalRef.current = null;
                    }
                    // 시뮬레이션이 완료되었으므로 서버에서 업데이트된 tournament 상태를 반영
                    setLocalTournament(tournament);
                }
            } else if (hasCompletedRef.current && newStatus !== 'round_in_progress' && prevStatus === 'round_in_progress') {
                // 시뮬레이션이 완료된 후 서버에서 상태가 업데이트된 경우 (round_complete 또는 bracket_ready)
                console.log(`[useTournamentSimulation] Simulation completed, updating local tournament with server state: newStatus=${newStatus}`);
                setLocalTournament(tournament);
            } else if (hasCompletedRef.current && newStatus === prevStatus && newSeed === prevSeed) {
                // 시뮬레이션이 완료된 후 서버에서 다른 업데이트가 있는 경우 (예: match.isFinished, match.winner 등)
                // localTournament를 업데이트하여 최종 결과를 반영
                console.log(`[useTournamentSimulation] Simulation completed, updating local tournament with server updates`);
                setLocalTournament(tournament);
            }
        } else {
            setLocalTournament(null);
        }
    }, [tournament]);

    useEffect(() => {
        console.log(`[useTournamentSimulation] useEffect triggered: localTournament=${!!localTournament}, currentUser=${!!currentUser}`);
        
        if (!localTournament || !currentUser) {
            console.log(`[useTournamentSimulation] Cleaning up: no tournament or user`);
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
            console.log(`[useTournamentSimulation] Simulation already running, skipping start check`);
            return;
        }

        // isSimulating이 true인데 실제로 interval이 없으면 리셋
        if (isSimulatingRef.current && !simulationIntervalRef.current) {
            console.warn(`[useTournamentSimulation] isSimulating is true but no interval exists, resetting...`);
            isSimulatingRef.current = false;
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
        
        // 디버깅: 조건 확인
        if (localTournament.status === 'round_in_progress') {
            console.log(`[useTournamentSimulation] Status check: status=${localTournament.status}, hasMatch=${!!localTournament.currentSimulatingMatch}, hasSeed=${!!localTournament.simulationSeed}, hasCompleted=${hasCompletedRef.current}, isSimulating=${isSimulatingRef.current}, hasValidConditions=${hasValidConditions}, hasInterval=${!!simulationIntervalRef.current}`);
        }
        
        if (hasValidConditions) {
            // match는 이미 위에서 확인했으므로 다시 확인할 필요 없음
            if (!match) {
                console.warn(`[useTournamentSimulation] Invalid match reference: ${JSON.stringify(localTournament.currentSimulatingMatch)}`);
                return;
            }
            
            console.log(`[useTournamentSimulation] Starting simulation: status=${localTournament.status}, seed=${localTournament.simulationSeed}, match=${JSON.stringify(localTournament.currentSimulatingMatch)}`);
            
            isSimulatingRef.current = true;
            // hasCompletedRef는 시뮬레이션이 완료되었을 때만 true로 설정
            
            if (!match.players[0] || !match.players[1]) {
                console.warn(`[useTournamentSimulation] Match missing players: ${JSON.stringify(match)}`);
                isSimulatingRef.current = false;
                return;
            }
            
            const p1 = localTournament.players.find(p => p.id === match.players[0]!.id);
            const p2 = localTournament.players.find(p => p.id === match.players[1]!.id);
            
            if (!p1 || !p2) {
                isSimulatingRef.current = false;
                return;
            }
            
            // 플레이어 복사 및 초기화
            player1Ref.current = JSON.parse(JSON.stringify(p1));
            player2Ref.current = JSON.parse(JSON.stringify(p2));
            
            // RNG 초기화 (컨디션 설정 전에 먼저 초기화)
            rngRef.current = new SeededRandom(localTournament.simulationSeed!);
            
            // 컨디션 설정 (시드 기반)
            if (player1Ref.current.condition === undefined || player1Ref.current.condition === null || player1Ref.current.condition === 1000) {
                player1Ref.current.condition = rngRef.current.randomInt(40, 100);
            }
            if (player2Ref.current.condition === undefined || player2Ref.current.condition === null || player2Ref.current.condition === 1000) {
                player2Ref.current.condition = rngRef.current.randomInt(40, 100);
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
            
            // 1초마다 시뮬레이션 진행
            console.log(`[useTournamentSimulation] Setting up interval for simulation`);
            simulationIntervalRef.current = setInterval(() => {
                console.log(`[useTournamentSimulation] Interval tick: timeElapsed=${timeElapsedRef.current}, rng=${!!rngRef.current}, p1=${!!player1Ref.current}, p2=${!!player2Ref.current}`);
                
                if (!rngRef.current || !player1Ref.current || !player2Ref.current) {
                    console.warn(`[useTournamentSimulation] Missing refs in interval: rng=${!!rngRef.current}, p1=${!!player1Ref.current}, p2=${!!player2Ref.current}`);
                    return;
                }
                
                timeElapsedRef.current++;
                console.log(`[useTournamentSimulation] Running simulation step: timeElapsed=${timeElapsedRef.current}`);
                
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
                
                console.log(`[useTournamentSimulation] Simulation step result: p1Score=${result.player1Score}, p2Score=${result.player2Score}, commentaryLength=${result.commentary.length}`);
                
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
                setLocalTournament(prev => {
                    if (!prev) {
                        console.warn(`[useTournamentSimulation] prev is null in setLocalTournament`);
                        return prev;
                    }
                    // 능력치 변동이 반영된 플레이어 정보 사용
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
                    console.log(`[useTournamentSimulation] Updated local tournament: timeElapsed=${updated.timeElapsed}, scores=${JSON.stringify(updated.currentMatchScores)}, p1Stats=${JSON.stringify(player1Ref.current.stats)}, p2Stats=${JSON.stringify(player2Ref.current.stats)}, p1Increment=${p1ScoreIncrement}, p2Increment=${p2ScoreIncrement}`);
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
                        updated.currentSimulatingMatch = null;
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
            console.log(`[useTournamentSimulation] Cleanup: clearing intervals`);
            if (simulationIntervalRef.current) {
                clearInterval(simulationIntervalRef.current);
                simulationIntervalRef.current = null;
            }
            if (simulationTimeoutRef.current) {
                clearTimeout(simulationTimeoutRef.current);
                simulationTimeoutRef.current = null;
            }
        };
    }, [localTournament?.status, localTournament?.simulationSeed, localTournament?.currentSimulatingMatch, currentUser?.id, handlers]);

    return localTournament;
};

