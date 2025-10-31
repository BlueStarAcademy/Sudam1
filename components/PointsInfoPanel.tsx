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
        <div className="bg-gray-800/50 rounded-lg p-4 h-full">
            <h3 className="text-lg font-bold text-center mb-4">일일 획득 가능 점수</h3>
            <div className="space-y-2">
                {pointsData.map((data, index) => (
                    <div key={index} className="flex justify-between items-center text-sm bg-gray-900/50 p-2 rounded-md">
                        <span className="font-semibold">{data.arena}</span>
                        <span>{data.rank}위</span>
                        <span className="font-bold text-yellow-400">{data.points}점</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PointsInfoPanel;
