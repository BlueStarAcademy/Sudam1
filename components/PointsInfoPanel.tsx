import React from 'react';
import { TOURNAMENT_SCORE_REWARDS } from '../constants';
import { TournamentType } from '../types';

const PointsInfoPanel: React.FC = () => {
    const tournamentTypes: { type: TournamentType; arena: string; title: string }[] = [
        { type: 'neighborhood', arena: '동네', title: '동네바둑리그' },
        { type: 'national', arena: '전국', title: '전국바둑대회' },
        { type: 'world', arena: '세계', title: '월드챔피언십' }
    ];

    return (
        <div className="bg-gray-800/50 rounded-lg p-3 h-full flex flex-col">
            <h3 className="text-base font-bold text-center mb-3 flex-shrink-0">일일 획득 가능 점수</h3>
            <div className="flex-grow overflow-y-auto pr-1 space-y-3">
                {tournamentTypes.map(arenaData => {
                    const scoreRewards = TOURNAMENT_SCORE_REWARDS[arenaData.type];
                    const ranks = Object.keys(scoreRewards).map(Number).sort((a, b) => a - b);
                    
                    return (
                        <div key={arenaData.arena} className="bg-gray-900/50 p-2 rounded-md shadow-inner">
                            <h4 className="text-sm font-bold text-accent mb-1.5 border-b border-accent/50 pb-0.5">{arenaData.title}</h4>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                                {ranks.map(rank => {
                                    const points = scoreRewards[rank];
                                    const rankColor = rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-400' : rank === 3 ? 'text-amber-600' : 'text-gray-300';
                                    const rankLabel = rank === 5 && arenaData.type === 'world' ? '8강 탈락' : 
                                                      rank === 9 && arenaData.type === 'world' ? '16강 탈락' : 
                                                      rank === 5 && arenaData.type === 'national' ? '8강 탈락' :
                                                      `${rank}위`;
                                    return (
                                        <div key={rank} className="flex justify-between items-center text-xs">
                                            <span className="font-semibold truncate">{rankLabel}</span>
                                            <span className={`font-bold ${rankColor} flex-shrink-0 ml-1`}>{points}점</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PointsInfoPanel;
