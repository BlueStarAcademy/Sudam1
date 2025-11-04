import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Round, UserWithStatus, PlayerForTournament, Match } from '../types.js';

interface TournamentMiniBoardProps {
    rounds: Round[];
    currentUser: UserWithStatus;
}

const MatchBox: React.FC<{ match: Match }> = ({ match }) => {
    const p1 = match.players[0];
    const p2 = match.players[1];
    
    const getPlayerClass = (player: PlayerForTournament | null, isWinner: boolean) => {
        if (!player) return 'text-gray-600';
        if (!isWinner && match.isFinished) return 'text-gray-500 opacity-60';
        return 'text-gray-200';
    };
    
    const p1IsWinner = match.isFinished && match.winner?.id === p1?.id;
    const p2IsWinner = match.isFinished && match.winner?.id === p2?.id;

    return (
        <div className="bg-gray-700/50 p-1.5 rounded text-[10px] w-28 flex-shrink-0">
            <div className={`flex justify-between items-center ${getPlayerClass(p1, p1IsWinner)}`}>
                <span className={`truncate font-semibold ${p1IsWinner ? 'text-yellow-300' : ''}`}>{p1?.nickname || '...'}</span>
                {p1IsWinner && <span className="font-bold">W</span>}
            </div>
             <div className="border-b border-gray-600 my-1"></div>
             <div className={`flex justify-between items-center ${getPlayerClass(p2, p2IsWinner)}`}>
                <span className={`truncate font-semibold ${p2IsWinner ? 'text-yellow-300' : ''}`}>{p2?.nickname || '...'}</span>
                {p2IsWinner && <span className="font-bold">W</span>}
            </div>
        </div>
    );
};

const TournamentMiniBoard: React.FC<TournamentMiniBoardProps> = ({ rounds, currentUser }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const boxRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
    const [lines, setLines] = useState<React.ReactNode[]>([]);
    
    const setRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
        boxRefs.current.set(id, el);
    }, []);

    useEffect(() => {
        const calculateLines = () => {
            const containerElem = containerRef.current;
            if (!containerElem) return;

            const containerRect = containerElem.getBoundingClientRect();
            const newLineElements: React.ReactNode[] = [];

            for (let i = 0; i < rounds.length - 1; i++) {
                const currentRound = rounds[i];
                const nextRound = rounds[i + 1];
                if (!nextRound) continue;

                currentRound.matches.forEach((match, matchIndex) => {
                    const nextMatchIndex = Math.floor(matchIndex / 2);
                    const nextMatch = nextRound.matches[nextMatchIndex];
                    if (!nextMatch) return;
                    
                    const startElem = boxRefs.current.get(match.id);
                    const endElem = boxRefs.current.get(nextMatch.id);
                    
                    if (startElem && endElem) {
                        const startRect = startElem.getBoundingClientRect();
                        const endRect = endElem.getBoundingClientRect();

                        const startX = startRect.right - containerRect.left;
                        const startY = startRect.top + startRect.height / 2 - containerRect.top;
                        
                        const endX = endRect.left - containerRect.left;
                        const endY = endRect.top + endRect.height / 2 - containerRect.top;
                        
                        const midX = startX + (endX - startX) / 2;

                        newLineElements.push(
                            <path key={`${match.id}-h1`} d={`M ${startX} ${startY} H ${midX}`} stroke="rgba(107, 114, 128, 0.5)" strokeWidth="2" fill="none" />,
                            <path key={`${match.id}-v`} d={`M ${midX} ${startY} V ${endY}`} stroke="rgba(107, 114, 128, 0.5)" strokeWidth="2" fill="none" />,
                            <path key={`${match.id}-h2`} d={`M ${midX} ${endY} H ${endX}`} stroke="rgba(107, 114, 128, 0.5)" strokeWidth="2" fill="none" />
                        );
                    }
                });
            }
            setLines(newLineElements);
        };
        
        // Use a timeout to ensure all refs are populated after render.
        const timeoutId = setTimeout(calculateLines, 50);

        const resizeObserver = new ResizeObserver(calculateLines);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            clearTimeout(timeoutId);
            resizeObserver.disconnect();
        };

    }, [rounds]);
    
    return (
        <div className="h-full flex flex-col">
            <h4 className="font-bold text-center mb-2 flex-shrink-0 text-gray-300">대진표</h4>
            <div ref={containerRef} className="flex-1 overflow-auto relative p-2">
                <div className="flex justify-around items-center h-full w-full absolute inset-0">
                    {rounds.map((round) => (
                        <div key={round.id} className="flex flex-col justify-around h-full">
                            {round.matches.map(match => (
                                <div key={match.id} ref={setRef(match.id)}>
                                    <MatchBox match={match} />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none">
                    <g>{lines}</g>
                </svg>
            </div>
        </div>
    );
};

export default TournamentMiniBoard;
