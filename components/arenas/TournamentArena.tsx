
import React, { useState, useEffect } from 'react';
import { TournamentType, UserWithStatus } from '../../types';
import { useAppContext } from '../../hooks/useAppContext';
import { TournamentBracket } from '../TournamentBracket';
import Button from '../Button';
import { TOURNAMENT_DEFINITIONS } from '../../constants';

interface TournamentArenaProps {
    type: TournamentType;
}

const TournamentArena: React.FC<TournamentArenaProps> = ({ type }) => {
    const { currentUserWithStatus, handlers, allUsers } = useAppContext();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const checkIsMobile = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    // stateKey 결정
    let stateKey: keyof Pick<UserWithStatus, 'lastNeighborhoodTournament' | 'lastNationalTournament' | 'lastWorldTournament'>;
    switch (type) {
        case 'neighborhood': stateKey = 'lastNeighborhoodTournament'; break;
        case 'national': stateKey = 'lastNationalTournament'; break;
        case 'world': stateKey = 'lastWorldTournament'; break;
        default: return <div>Invalid tournament type</div>;
    }

    const tournamentState = currentUserWithStatus?.[stateKey] as any;
    const latestTournamentStateRef = React.useRef<typeof tournamentState | null>(tournamentState ?? null);

    React.useEffect(() => {
        latestTournamentStateRef.current = tournamentState ?? null;
    }, [tournamentState]);

    React.useEffect(() => {
        return () => {
            const latestState = latestTournamentStateRef.current;
            if (!latestState || latestState.status === 'round_in_progress') return;
            handlers.handleAction({ type: 'SAVE_TOURNAMENT_PROGRESS', payload: { type } })
                .catch(error => console.error('[TournamentArena] Failed to save tournament progress on unmount:', error));
        };
    }, [handlers, type]);
    const tournamentDefinition = TOURNAMENT_DEFINITIONS[type];

    // 토너먼트 상태가 있으면 최신 상태로 업데이트 (자동 시작하지 않음 - 사용자가 직접 경기 시작 버튼을 눌러야 함)
    // 각 경기장은 독립적으로 작동하므로 자동으로 START_TOURNAMENT_ROUND를 호출하지 않습니다.

    if (!currentUserWithStatus) {
        return (
            <div className="p-4 text-center">
                <p>사용자 정보를 불러오는 중입니다...</p>
                <Button onClick={() => window.location.hash = '#/tournament'} className="mt-4">로비로 돌아가기</Button>
            </div>
        );
    }

    // 토너먼트 상태가 없을 때 자동으로 시작 시도
    const startAttemptedRef = React.useRef<Set<string>>(new Set());
    const startTimeoutRef = React.useRef<Map<string, NodeJS.Timeout>>(new Map());
    const handlersRef = React.useRef(handlers);
    const prevTournamentStateRef = React.useRef<any>(tournamentState);
    
    // handlers 참조 업데이트 (의존성 배열에서 제거하기 위해)
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    useEffect(() => {
        // 토너먼트 상태가 없고, 이 타입에 대해 아직 시작 시도를 하지 않았을 때만 시작
        const tournamentKey = `${type}-${currentUserWithStatus?.id || 'unknown'}`;
        const prevTournamentState = prevTournamentStateRef.current;
        
        // 이전 상태 저장
        prevTournamentStateRef.current = tournamentState;
        
        // 토너먼트 상태가 있으면 해당 키를 제거하고 타이머 정리 (다음에 다시 시작할 수 있도록)
        if (tournamentState) {
            // 토너먼트가 새로 생성된 경우 (undefined -> 값)에만 제거
            if (!prevTournamentState && startAttemptedRef.current.has(tournamentKey)) {
                // 타이머 정리
                const timeout = startTimeoutRef.current.get(tournamentKey);
                if (timeout) {
                    clearTimeout(timeout);
                    startTimeoutRef.current.delete(tournamentKey);
                }
                // 약간의 지연 후 제거 (WebSocket 업데이트 대기)
                const timeoutId = setTimeout(() => {
                    startAttemptedRef.current.delete(tournamentKey);
                }, 5000);
                return () => clearTimeout(timeoutId);
            }
            return; // 토너먼트 상태가 있으면 더 이상 처리하지 않음
        }
        
        // 토너먼트 상태가 없고, 아직 시작 시도를 하지 않았을 때만 시작
        // 리다이렉트로 인한 무한 루프 방지: 현재 해시가 이미 해당 토너먼트 페이지인 경우에도 재시도 가능하도록 수정
        if (!startAttemptedRef.current.has(tournamentKey) && currentUserWithStatus?.id) {
            startAttemptedRef.current.add(tournamentKey);
            console.log(`[TournamentArena] Starting tournament session for ${type}`);
            // 자동으로 토너먼트 세션 시작
            handlersRef.current.handleAction({ 
                type: 'START_TOURNAMENT_SESSION', 
                payload: { type: type } 
            });
            
            // 3초 후에도 토너먼트 상태가 없으면 재시도 (WebSocket 업데이트가 늦을 수 있음)
            const timeoutId = setTimeout(() => {
                if (!currentUserWithStatus?.[stateKey]) {
                    console.log(`[TournamentArena] Tournament state not updated after 3s, clearing attempt flag for retry`);
                    startAttemptedRef.current.delete(tournamentKey);
                    startTimeoutRef.current.delete(tournamentKey);
                }
            }, 3000);
            startTimeoutRef.current.set(tournamentKey, timeoutId);
        }
        
        // cleanup: 컴포넌트 언마운트 시 타이머 정리
        return () => {
            const timeout = startTimeoutRef.current.get(tournamentKey);
            if (timeout) {
                clearTimeout(timeout);
                startTimeoutRef.current.delete(tournamentKey);
            }
        };
    }, [type, tournamentState, currentUserWithStatus?.id, currentUserWithStatus, stateKey]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full flex flex-col h-[calc(100vh-5rem)] relative overflow-hidden">
            <header className="flex justify-between items-center mb-6 flex-shrink-0">
                <button onClick={async () => {
                    if (tournamentState && tournamentState.status === 'round_in_progress') {
                        if (window.confirm('경기가 진행 중입니다. 현재 경기를 기권하시겠습니까? 현재 경기는 패배 처리됩니다.')) {
                            handlers.handleAction({ type: 'FORFEIT_CURRENT_MATCH', payload: { type } });
                        }
                    } else {
                        try {
                            if (tournamentState) {
                                await handlers.handleAction({ type: 'SAVE_TOURNAMENT_PROGRESS', payload: { type } });
                            }
                        } catch (error) {
                            console.error('[TournamentArena] Failed to save tournament progress on exit:', error);
                        } finally {
                            window.location.hash = '#/tournament';
                        }
                    }
                }} className="transition-transform active:scale-90 filter hover:drop-shadow-lg">
                    <img src="/images/button/back.png" alt="Back" className="w-10 h-10" />
                </button>
                <h1 className="text-3xl lg:text-4xl font-bold">{tournamentDefinition.name}</h1>
                <div className="w-10"></div>
            </header>
            
            <main className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">
                {tournamentState && (
                    <TournamentBracket 
                        tournament={tournamentState}
                        currentUser={currentUserWithStatus}
                        onBack={() => window.location.hash = '#/tournament'}
                        allUsersForRanking={allUsers}
                        onViewUser={handlers.openViewingUser}
                        onAction={handlers.handleAction}
                        onStartNextRound={() => handlers.handleAction({ type: 'START_TOURNAMENT_ROUND', payload: { type: type } })}
                        onReset={() => handlers.handleAction({ type: 'CLEAR_TOURNAMENT_SESSION', payload: { type: type } })}
                        onSkip={() => handlers.handleAction({ type: 'SKIP_TOURNAMENT_END', payload: { type: type } })}
                        onOpenShop={() => handlers.openShop('consumables')}
                        isMobile={isMobile}
                    />
                )}
            </main>
        </div>
    );
};

export default TournamentArena;
