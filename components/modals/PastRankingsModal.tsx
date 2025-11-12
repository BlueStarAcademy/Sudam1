import React from 'react';
import { UserWithStatus, GameMode } from '../../types.js';
import DraggableWindow from '../DraggableWindow.js';
import { RANKING_TIERS } from '../../constants';

interface PastRankingsModalProps {
    info: { user: UserWithStatus; mode: GameMode | 'strategic' | 'playful'; };
    onClose: () => void;
    isTopmost?: boolean;
}

const PastRankingsModal: React.FC<PastRankingsModalProps> = ({ info, onClose, isTopmost }) => {
    const { user, mode } = info;
    const history = user.seasonHistory || {};
    const seasonNames = Object.keys(history).sort((a, b) => b.localeCompare(a));
    const PRIMARY_SEASON = '2025-3';
    const orderedSeasonNames = seasonNames.filter(season => season !== PRIMARY_SEASON);
    orderedSeasonNames.unshift(PRIMARY_SEASON);

    // strategic/playful 모드인 경우 개별 게임 모드 랭킹을 표시할 수 없음
    if (mode === 'strategic' || mode === 'playful') {
        return (
            <DraggableWindow title="지난 시즌 랭킹" onClose={onClose} windowId="past-rankings" initialWidth={450} isTopmost={isTopmost}>
                <div className="max-h-[calc(var(--vh,1vh)*60)] overflow-y-auto pr-2">
                    <h3 className="text-lg font-bold text-center mb-4">{mode === 'strategic' ? '전략 게임' : '놀이 게임'}</h3>
                    <p className="text-center text-gray-500 mt-4">통합 로비에서는 개별 게임 모드의 지난 시즌 랭킹을 확인할 수 없습니다.</p>
                    <p className="text-center text-gray-500 text-sm mt-2">개별 게임 모드에서 지난 시즌 랭킹을 확인하세요.</p>
                </div>
            </DraggableWindow>
        );
    }

    // GameMode인 경우에만 seasonHistory에서 랭킹 정보를 가져올 수 있음
    const gameMode = mode as GameMode;

    return (
        <DraggableWindow title="지난 시즌 랭킹" onClose={onClose} windowId="past-rankings" initialWidth={450} isTopmost={isTopmost}>
            <div className="max-h-[calc(var(--vh,1vh)*60)] overflow-y-auto pr-2">
                <h3 className="text-lg font-bold text-center mb-4">{mode}</h3>
                {orderedSeasonNames.length > 0 ? (
                    <ul className="space-y-2">
                        {orderedSeasonNames.map(seasonName => {
                            const tier = history[seasonName]?.[gameMode];
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
                                        <span className="text-gray-500">티어없음</span>
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