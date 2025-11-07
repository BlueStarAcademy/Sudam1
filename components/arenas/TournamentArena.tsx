
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

    // 토너먼트 상태가 없을 때 토너먼트 시작 버튼 제공
    if (!tournamentState) {
        const handleStartTournament = () => {
            handlers.handleAction({ 
                type: 'START_TOURNAMENT_SESSION', 
                payload: { type: type } 
            });
        };

        return (
            <div className="p-4 sm:p-6 lg:p-8 w-full flex flex-col h-[calc(100vh-5rem)] relative">
                <header className="flex justify-between items-center mb-6 flex-shrink-0">
                    <button onClick={() => window.location.hash = '#/tournament'} className="transition-transform active:scale-90 filter hover:drop-shadow-lg">
                        <img src="/images/button/back.png" alt="Back" className="w-10 h-10" />
                    </button>
                    <h1 className="text-3xl lg:text-4xl font-bold">{tournamentDefinition.name}</h1>
                    <div className="w-10"></div>
                </header>
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-xl mb-2">토너먼트를 시작하세요!</p>
                        <p className="text-gray-400 mb-6">같은 리그의 플레이어들과 경쟁하며 순위를 올려보세요.</p>
                        <Button onClick={handleStartTournament} className="mt-4 px-8 py-3 text-lg">
                            토너먼트 시작하기
                        </Button>
                        <Button onClick={() => window.location.hash = '#/tournament'} className="mt-4 ml-4" colorScheme="gray">
                            로비로 돌아가기
                        </Button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full flex flex-col h-[calc(100vh-5rem)] relative overflow-hidden">
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
            
            <main className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">
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
            </main>
        </div>
    );
};

export default TournamentArena;
