
import React, { useMemo } from 'react';
import { UserWithStatus, GameMode, ServerAction } from '../types.js';
import { SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES } from '../constants.js';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';

interface DetailedStatsModalProps {
    currentUser: UserWithStatus;
    statsType: 'strategic' | 'playful';
    onClose: () => void;
    onAction: (action: ServerAction) => void;
}

const DetailedStatsModal: React.FC<DetailedStatsModalProps> = ({ currentUser, statsType, onClose, onAction }) => {
    const isStrategic = statsType === 'strategic';
    const title = isStrategic ? '전략 바둑 상세 전적' : '놀이 바둑 상세 전적';
    const modes = isStrategic ? SPECIAL_GAME_MODES : PLAYFUL_GAME_MODES;
    const { stats, diamonds } = currentUser;
    
    const singleResetCost = 300;
    const categoryResetCost = 500;
    const canAffordSingle = diamonds >= singleResetCost;
    const canAffordCategory = diamonds >= categoryResetCost;

    const handleResetSingle = (mode: GameMode) => {
        if (!canAffordSingle) return;
        if (window.confirm(`다이아 ${singleResetCost}개를 사용하여 '${mode}' 모드의 전적을 초기화하시겠습니까?`)) {
            onAction({ type: 'RESET_SINGLE_STAT', payload: { mode: mode } });
        }
    };
    
    const handleResetAll = () => {
        if (!canAffordCategory) return;
        const categoryName = isStrategic ? '전략' : '놀이';
        if (window.confirm(`다이아 ${categoryResetCost}개를 사용하여 모든 '${categoryName}' 모드의 전적을 초기화하시겠습니까?`)) {
            onAction({ type: 'RESET_STATS_CATEGORY', payload: { category: statsType } });
        }
    };


    return (
        <DraggableWindow title={title} onClose={onClose} windowId="detailed-stats" initialWidth={600}>
            <div className="max-h-[calc(var(--vh,1vh)*60)] overflow-y-auto pr-2">
                <ul className="space-y-3">
                    {modes.map(({ mode }) => {
                        const gameStats = stats?.[mode];
                        if (!gameStats || (gameStats.wins === 0 && gameStats.losses === 0)) return null;

                        const totalGames = gameStats.wins + gameStats.losses;
                        const winRate = totalGames > 0 ? Math.round((gameStats.wins / totalGames) * 100) : 0;

                        return (
                            <li key={mode} className="bg-gray-900/50 p-4 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-lg font-bold text-yellow-300 mb-2">{mode}</h3>
                                    <Button onClick={() => handleResetSingle(mode)} disabled={!canAffordSingle} className="!text-xs !py-1" colorScheme="orange" title={`비용: 💎 ${singleResetCost}`}>초기화</Button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-center">
                                    <div className="bg-gray-800 p-2 rounded-md">
                                        <p className="text-gray-400">승/패</p>
                                        <p className="font-semibold text-white">{gameStats.wins}승 {gameStats.losses}패</p>
                                    </div>
                                    <div className="bg-gray-800 p-2 rounded-md">
                                        <p className="text-gray-400">승률</p>
                                        <p className="font-semibold text-white">{winRate}%</p>
                                    </div>
                                    <div className="bg-gray-800 p-2 rounded-md">
                                        <p className="text-gray-400">랭킹 점수</p>
                                        <p className="font-semibold text-white">{gameStats.rankingScore}점</p>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700 text-center">
                <p className="text-sm mb-2 text-gray-300">
                    보유 다이아: 
                    <span className="font-bold text-cyan-300 ml-2 flex items-center justify-center gap-1"><img src="/images/icon/Zem.png" alt="다이아" className="w-4 h-4" /> {diamonds.toLocaleString()}</span>
                </p>
                <Button 
                    onClick={handleResetAll} 
                    colorScheme="red"
                    disabled={!canAffordCategory}
                    title={`비용: 💎 ${categoryResetCost}`}
                >
                    {isStrategic ? '전략' : '놀이'} 전체 전적 초기화
                </Button>
            </div>
        </DraggableWindow>
    );
};

export default DetailedStatsModal;