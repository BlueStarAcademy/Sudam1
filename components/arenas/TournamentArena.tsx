
import React from 'react';
import { TournamentType, UserWithStatus } from '../../types';
import { useAppContext } from '../../hooks/useAppContext';
import { TournamentBracket } from '../TournamentBracket';
import Button from '../Button';

interface TournamentArenaProps {
    type: TournamentType;
}

const TournamentArena: React.FC<TournamentArenaProps> = ({ type }) => {
    const { currentUserWithStatus, handlers, allUsers } = useAppContext();

    let stateKey: keyof Pick<UserWithStatus, 'lastNeighborhoodTournament' | 'lastNationalTournament' | 'lastWorldTournament'>;
    switch (type) {
        case 'neighborhood': stateKey = 'lastNeighborhoodTournament'; break;
        case 'national': stateKey = 'lastNationalTournament'; break;
        case 'world': stateKey = 'lastWorldTournament'; break;
        default: return <div>Invalid tournament type</div>;
    }

    const tournamentState = currentUserWithStatus?.[stateKey] as any;

    if (!tournamentState || !currentUserWithStatus) {
        return (
            <div className="p-4 text-center">
                <p>토너먼트 정보를 불러오는 중입니다...</p>
                <Button onClick={() => window.location.hash = '#/tournament'} className="mt-4">로비로 돌아가기</Button>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto flex flex-col h-[calc(100vh-5rem)] relative">
            <header className="flex justify-between items-center mb-6 flex-shrink-0">
                 <Button onClick={() => window.location.hash = '#/tournament'} colorScheme="gray" className="p-0 flex items-center justify-center w-10 h-10 rounded-full">
                    <img src="/images/button/back.png" alt="Back" className="w-6 h-6" />
                </Button>
                <h1 className="text-3xl lg:text-4xl font-bold">{tournamentState.title}</h1>
                <div className="w-10"></div>
            </header>
            <main className="flex-1 flex flex-col items-center justify-center">
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
                    isMobile={false} // Placeholder, can be replaced with actual mobile detection
                />
            </main>
        </div>
    );
};

export default TournamentArena;
