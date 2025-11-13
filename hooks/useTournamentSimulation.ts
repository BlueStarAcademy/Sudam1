import { useEffect, useRef, useState } from 'react';
import { TournamentState, User } from '../types';
import { useAppContext } from './useAppContext';

export const useTournamentSimulation = (tournament: TournamentState | null, currentUser: User | null) => {
    const { handlers } = useAppContext();
    const [localTournament, setLocalTournament] = useState<TournamentState | null>(tournament);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastSimulationTimeRef = useRef<number | undefined>(tournament?.lastSimulationTime);
    const isSimulatingRef = useRef(false);

    // 토너먼트 상태가 변경되면 로컬 상태 업데이트
    useEffect(() => {
        if (tournament) {
            setLocalTournament(tournament);
            lastSimulationTimeRef.current = tournament.lastSimulationTime;
        }
    }, [tournament]);

    useEffect(() => {
        if (!localTournament || !currentUser) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // 시뮬레이션이 진행 중일 때만 클라이언트에서 실행
        if (localTournament.status === 'round_in_progress' && localTournament.currentSimulatingMatch) {
            if (isSimulatingRef.current) {
                return; // 이미 시뮬레이션이 실행 중
            }

            isSimulatingRef.current = true;
            const now = Date.now();
            if (lastSimulationTimeRef.current === undefined) {
                lastSimulationTimeRef.current = now;
            }

            // 1초마다 시뮬레이션 진행
            intervalRef.current = setInterval(() => {
                const currentTime = Date.now();
                const timeSinceLastSimulation = currentTime - (lastSimulationTimeRef.current || currentTime);
                
                // 1초가 지나지 않았으면 진행하지 않음
                if (timeSinceLastSimulation < 950) {
                    return;
                }

                // 서버에 시뮬레이션 진행 요청
                handlers.handleAction({ 
                    type: 'ADVANCE_TOURNAMENT_SIMULATION', 
                    payload: { 
                        type: localTournament.type,
                        timestamp: currentTime
                    } 
                });

                lastSimulationTimeRef.current = lastSimulationTimeRef.current! + 1000;
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            isSimulatingRef.current = false;
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            isSimulatingRef.current = false;
        };
    }, [localTournament, currentUser, handlers]);

    return localTournament;
};

