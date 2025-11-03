import React from 'react';

const PointsInfoPanel: React.FC = () => {
    const pointsData = [
        { arena: '동네', rank: 1, points: 32 },
        { arena: '동네', rank: 2, points: 28 },
        { arena: '동네', rank: 3, points: 24 },
        { arena: '전국', rank: 1, points: 46 },
        { arena: '전국', rank: 2, points: 40 },
        { arena: '전국', rank: 3, points: 34 },
        { arena: '세계', rank: 1, points: 58 },
        { arena: '세계', rank: 2, points: 50 },
        { arena: '세계', rank: 3, points: 42 },
    ];

    return (
        <div className="bg-gray-800/50 rounded-lg p-4 h-full flex flex-col">
            <h3 className="text-lg font-bold text-center mb-4 flex-shrink-0">일일 획득 가능 점수</h3>
            <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                {[ { arena: '동네', title: '동네바둑리그' }, { arena: '전국', title: '전국바둑대회' }, { arena: '세계', title: '월드챔피언십' } ].map(arenaData => (
                    <div key={arenaData.arena} className="bg-gray-900/50 p-3 rounded-md shadow-inner">
                        <h4 className="text-md font-bold text-accent mb-2 border-b border-accent/50 pb-1">{arenaData.title}</h4>
                        <div className="space-y-1">
                            {pointsData.filter(data => data.arena === arenaData.arena).map((data, index) => {
                                const rankColor = data.rank === 1 ? 'text-yellow-400' : data.rank === 2 ? 'text-gray-400' : data.rank === 3 ? 'text-amber-600' : '';
                                return (
                                    <div key={index} className="flex justify-between items-center text-sm">
                                        <span className="font-semibold">{data.rank}위</span>
                                        <span className={`font-bold ${rankColor}`}>{data.points}점</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PointsInfoPanel;
