
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

    let stateKey: keyof Pick<UserWithStatus, 'lastNeighborhoodTournament' | 'lastNationalTournament' | 'lastWorldTournament'>;
    switch (type) {
        case 'neighborhood': stateKey = 'lastNeighborhoodTournament'; break;
        case 'national': stateKey = 'lastNationalTournament'; break;
        case 'world': stateKey = 'lastWorldTournament'; break;
        default: return <div>Invalid tournament type</div>;
    }

    const tournamentState = currentUserWithStatus?.[stateKey] as any;
    const tournamentDefinition = TOURNAMENT_DEFINITIONS[type];

    if (!tournamentState || !currentUserWithStatus) {
        return (
            <div className="p-4 text-center">
                <p>토너먼트 정보를 불러오는 중입니다...</p>
                <Button onClick={() => window.location.hash = '#/tournament'} className="mt-4">로비로 돌아가기</Button>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full flex flex-col h-[calc(100vh-5rem)] relative">
            <header className="flex justify-between items-center mb-6 flex-shrink-0">
                <button onClick={() => {
                    if (tournamentState.status === 'round_in_progress') {
                        if (window.confirm('경기가 진행 중입니다. 현재 경기를 기권하시겠습니까? 현재 경기는 패배 처리됩니다.')) {
                            handlers.handleAction({ type: 'FORFEIT_CURRENT_MATCH', payload: { type: type } });
                        }
                    } else {
                        window.location.hash = '#/tournament';
                    }
                }} className="transition-transform active:scale-90 filter hover:drop-shadow-lg">
                    <img src="/images/button/back.png" alt="Back" className="w-10 h-10" />
                </button>
                <h1 className="text-3xl lg:text-4xl font-bold">{tournamentDefinition.name}</h1>
                <div className="w-10"></div>
            </header>
            
            <main className="flex-1 flex flex-col items-center justify-center min-h-0 w-full">
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
                    isMobile={isMobile}
                />
            </main>
        </div>
    );
};

export default TournamentArena;
