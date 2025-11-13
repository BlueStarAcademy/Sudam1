import React, { useState, useMemo, useEffect } from 'react';
import { UserWithStatus, CoreStat, ServerAction } from '../types.js';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import RadarChart from './RadarChart.js';
import { CORE_STATS_DATA } from '../constants';

interface StatAllocationModalProps {
    currentUser: UserWithStatus;
    onClose: () => void;
    onAction: (action: ServerAction) => void;
    isTopmost?: boolean;
}

const StatAllocationModal: React.FC<StatAllocationModalProps> = ({ currentUser, onClose, onAction, isTopmost }) => {
    // 초기화를 했을 때만 편집 모드로 시작, 저장 후에는 읽기 전용 모드
    const [isEditing, setIsEditing] = useState(() => {
        // spentStatPoints가 없거나 모두 0이면 편집 모드
        if (!currentUser.spentStatPoints || Object.keys(currentUser.spentStatPoints).length === 0) {
            return true;
        }
        const totalSpent = Object.values(currentUser.spentStatPoints).reduce((sum, points) => sum + points, 0);
        // 분배된 포인트가 없으면 편집 모드
        return totalSpent === 0;
    });
    const [tempPoints, setTempPoints] = useState<Record<CoreStat, number>>(() => {
        if (currentUser.spentStatPoints && Object.keys(currentUser.spentStatPoints).length > 0) {
            return currentUser.spentStatPoints;
        } else {
            return {
                [CoreStat.Concentration]: 0,
                [CoreStat.ThinkingSpeed]: 0,
                [CoreStat.Judgment]: 0,
                [CoreStat.Calculation]: 0,
                [CoreStat.CombatPower]: 0,
                [CoreStat.Stability]: 0,
            };
        }
    });

    const resetCost = 1000;
    const maxDailyResets = 2;
    const currentDay = new Date().toDateString();
    const lastResetDate = currentUser.lastStatResetDate;
    const statResetCountToday = currentUser.statResetCountToday || 0;

    const canReset = useMemo(() => {
        if (currentUser.gold < resetCost) return false;
        if (lastResetDate === currentDay && statResetCountToday >= maxDailyResets) return false;
        return true;
    }, [currentUser.diamonds, lastResetDate, statResetCountToday, currentDay]);

    const levelPoints = (currentUser.strategyLevel - 1) * 2 + (currentUser.playfulLevel - 1) * 2;
    const bonusPoints = currentUser.bonusStatPoints || 0;
    const totalBonusPoints = levelPoints + bonusPoints;

    const spentPoints = useMemo(() => {
        return Object.values(tempPoints).reduce((sum, points) => sum + points, 0);
    }, [tempPoints]);

    const availablePoints = useMemo(() => {
        if (!isEditing) return 0; // No available points if not in editing mode
        return totalBonusPoints - spentPoints;
    }, [isEditing, totalBonusPoints, spentPoints]);

    const handlePointChange = (stat: CoreStat, value: string) => {
        const newValue = Number(value) || 0;
        setTempPoints(prev => {
            const currentSpentOnOthers = Object.entries(prev)
                .filter(([key]) => key !== stat)
                .reduce((sum, [, val]) => sum + val, 0);

            const maxForThisStat = totalBonusPoints - currentSpentOnOthers;
            const finalValue = Math.max(0, Math.min(newValue, maxForThisStat));
            
            return { ...prev, [stat]: finalValue };
        });
    };

    // currentUser가 업데이트되면 isEditing 상태도 업데이트
    useEffect(() => {
        if (!currentUser.spentStatPoints || Object.keys(currentUser.spentStatPoints).length === 0) {
            setIsEditing(true);
        } else {
            const totalSpent = Object.values(currentUser.spentStatPoints).reduce((sum, points) => sum + points, 0);
            // 분배된 포인트가 없으면 편집 모드, 있으면 읽기 전용 모드
            setIsEditing(totalSpent === 0);
        }
        // tempPoints도 업데이트
        if (currentUser.spentStatPoints && Object.keys(currentUser.spentStatPoints).length > 0) {
            setTempPoints(currentUser.spentStatPoints);
        }
    }, [currentUser.spentStatPoints]);

    const handleReset = () => {
        if (!canReset) {
            alert("능력치 초기화 조건을 충족하지 못했습니다. 골드가 부족하거나 일일 초기화 횟수를 초과했습니다.");
            return;
        }
        if (window.confirm(`골드 ${resetCost}개를 사용하여 모든 보너스 포인트를 초기화하시겠습니까? (오늘 ${maxDailyResets - statResetCountToday}회 남음)`)) {
            onAction({ type: 'RESET_STAT_POINTS' });
            setTempPoints({
                [CoreStat.Concentration]: 0,
                [CoreStat.ThinkingSpeed]: 0,
                [CoreStat.Judgment]: 0,
                [CoreStat.Calculation]: 0,
                [CoreStat.CombatPower]: 0,
                [CoreStat.Stability]: 0,
            });
            setIsEditing(true);
        }
    };
    
    const hasChanges = useMemo(() => {
        if (!currentUser.spentStatPoints) return spentPoints > 0; // If no points spent, any spent points means changes
        return Object.values(CoreStat).some(stat => tempPoints[stat] !== currentUser.spentStatPoints![stat]);
    }, [tempPoints, currentUser.spentStatPoints, spentPoints]);

    const handleConfirm = () => {
        onAction({ type: 'CONFIRM_STAT_ALLOCATION', payload: { newStatPoints: tempPoints } });
        setIsEditing(false); // 저장 후 편집 모드 비활성화
        onClose();
    };

    const chartStats = useMemo(() => {
        const result: Record<string, number> = {};
        for (const key of Object.values(CoreStat)) {
            result[key] = (currentUser.baseStats[key] || 0) + (tempPoints[key] || 0);
        }
        return result;
    }, [currentUser.baseStats, tempPoints]);

    const radarDatasets = useMemo(() => [
        { stats: chartStats, color: '#60a5fa', fill: 'rgba(59, 130, 246, 0.4)' }
    ], [chartStats]);

    return (
        <DraggableWindow title="능력치 포인트 분배" onClose={onClose} windowId="stat-allocation" initialWidth={700} isTopmost={isTopmost}>
            <div className="flex flex-col md:flex-row gap-6 h-[calc(var(--vh,1vh)*70)]">
                <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-gray-900/50 p-4 rounded-lg">
                    <h3 className="text-lg font-bold mb-4">능력치 분포</h3>
                    <RadarChart datasets={radarDatasets} maxStatValue={300} />
                </div>
                <div className="w-full md:w-1/2 flex flex-col">
                    <div className="bg-gray-900/50 p-4 rounded-lg mb-4 text-center">
                        <p className="text-gray-300">사용 가능한 보너스 포인트</p>
                        <p className="text-3xl font-bold text-green-400">{availablePoints}</p>
                    </div>
                    <div className="flex-grow space-y-2 overflow-y-auto pr-2">
                        {Object.values(CoreStat).map(stat => {
                            const currentSpent = tempPoints[stat] || 0;
                            const maxForThisSlider = currentSpent + availablePoints;
                            
                            return (
                                <div key={stat} className="bg-gray-900/40 p-2 md:p-3 rounded-md">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-gray-200 text-sm md:text-base">{stat}</span>
                                        <span className="font-mono font-bold text-lg" title={`기본: ${currentUser.baseStats[stat]}, 보너스: ${currentSpent}`}>
                                            {chartStats[stat]}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="range"
                                            min="0"
                                            max={maxForThisSlider}
                                            value={currentSpent}
                                            onChange={(e) => handlePointChange(stat, e.target.value)}
                                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                            disabled={!isEditing}
                                        />
                                        <input
                                            type="number"
                                            value={currentSpent}
                                            onChange={(e) => handlePointChange(stat, e.target.value)}
                                            className="w-16 bg-gray-700 border border-gray-600 rounded-md p-1 text-center"
                                            disabled={!isEditing}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{CORE_STATS_DATA[stat].description}</p>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-4 pt-4 border-t border-gray-700">
                        <div className="flex flex-col items-start">
                            <Button onClick={handleReset} colorScheme="red" disabled={!canReset || isEditing}>초기화 (<img src="/images/icon/Gold.png" alt="골드" className="w-4 h-4 inline-block" />{resetCost})</Button>
                            <p className="text-xs text-gray-400 mt-1">일일 변경제한: {maxDailyResets - statResetCountToday}/{maxDailyResets}</p>
                            {!isEditing && (
                                <p className="text-xs text-yellow-400 mt-1">초기화 후 재분배 가능</p>
                            )}
                            {isEditing && (
                                <p className="text-xs text-green-400 mt-1">편집 모드: 능력치를 조정할 수 있습니다</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={onClose} colorScheme="gray">취소</Button>
                            {isEditing ? (
                                <Button onClick={handleConfirm} colorScheme="green" disabled={!hasChanges}>분배</Button>
                            ) : (
                                <Button onClick={onClose} colorScheme="gray">닫기</Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default StatAllocationModal;