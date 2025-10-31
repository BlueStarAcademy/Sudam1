import React from 'react';
import { UserWithStatus, GameMode } from '../../types.js';
import DraggableWindow from '../DraggableWindow.js';
import { RANKING_TIERS } from '../../constants.js';

interface PastRankingsModalProps {
    info: { user: UserWithStatus; mode: GameMode; };
    onClose: () => void;
    isTopmost?: boolean;
}

const PastRankingsModal: React.FC<PastRankingsModalProps> = ({ info, onClose, isTopmost }) => {
    const { user, mode } = info;
    const history = user.seasonHistory || {};
    const seasonNames = Object.keys(history).sort((a, b) => b.localeCompare(a));

    return (
        <DraggableWindow title="지난 시즌 랭킹" onClose={onClose} windowId="past-rankings" initialWidth={450} isTopmost={isTopmost}>
            <div className="max-h-[calc(var(--vh,1vh)*60)] overflow-y-auto pr-2">
                <h3 className="text-lg font-bold text-center mb-4">{mode}</h3>
                {seasonNames.length > 0 ? (
                    <ul className="space-y-2">
                        {seasonNames.map(seasonName => {
                            const tier = history[seasonName]?.[mode];
                            const tierInfo = RANKING_TIERS.find(t => t.name === tier);
                            return (
                                <li key={seasonName} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                                    <span className="font-semibold text-gray-300">{seasonName}</span>
                                    {tier && tierInfo ? (
                                        <div className="flex items-center gap-2">
                                            <img src={tierInfo.icon} alt={tier} className="w-8 h-8" />
                                            <span className={`font-bold ${tierInfo.color}`}>{tier}</span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-500">기록 없음</span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-center text-gray-500">지난 시즌 랭킹 기록이 없습니다.</p>
                )}
            </div>
        </DraggableWindow>
    );
};

export default PastRankingsModal;