import React, { useMemo } from 'react';
import { UserWithStatus } from '../../types.js';
import { SINGLE_PLAYER_MISSIONS } from '../../constants/singlePlayerConstants.js';
import Button from '../Button.js';
import { useAppContext } from '../../hooks/useAppContext.js';

interface TrainingQuestPanelProps {
    currentUser: UserWithStatus;
}

const TrainingQuestPanel: React.FC<TrainingQuestPanelProps> = ({ currentUser }) => {
    const { handlers } = useAppContext();

    // 미션 언락 확인
    const isMissionUnlocked = (unlockStageId: string, clearedStages: string[]): boolean => {
        return clearedStages.includes(unlockStageId);
    };

    // 사용자의 수련 과제 상태 (나중에 currentUser에서 가져올 수 있음)
    const trainingQuests = useMemo(() => {
        const userQuests = (currentUser as any).trainingQuests || [];
        const clearedStages = (currentUser as any).clearedSinglePlayerStages || [];
        return SINGLE_PLAYER_MISSIONS.map(mission => {
            const userQuest = userQuests.find((q: any) => q.missionId === mission.id);
            return {
                ...mission,
                level: userQuest?.level || 0,
                accumulatedReward: userQuest?.accumulatedReward || 0,
                lastProductionTime: userQuest?.lastProductionTime || Date.now(),
                isUnlocked: isMissionUnlocked(mission.unlockStageId, clearedStages)
            };
        });
    }, [currentUser]);

    // 재화 수령 계산
    const calculateReward = (mission: any) => {
        if (!mission.isUnlocked) return 0;
        
        const productionRateMs = mission.productionRateMinutes * 60 * 1000;
        const now = Date.now();
        const elapsed = now - mission.lastProductionTime;
        const cycles = Math.floor(elapsed / productionRateMs);
        const productionPerCycle = mission.rewardAmount * (1 + mission.level * 0.1); // 레벨당 10% 증가
        
        return Math.min(cycles * productionPerCycle, mission.maxCapacity);
    };

    // 재화 수령
    const handleCollectReward = (missionId: string) => {
        handlers.handleAction({
            type: 'COLLECT_TRAINING_QUEST_REWARD',
            payload: { missionId }
        });
    };

    // 레벨업
    const handleLevelUp = (missionId: string) => {
        handlers.handleAction({
            type: 'LEVEL_UP_TRAINING_QUEST',
            payload: { missionId }
        });
    };

    return (
        <div className="bg-panel rounded-lg shadow-lg p-4 h-full flex flex-col">
            <h2 className="text-xl font-bold text-on-panel mb-4 border-b border-color pb-2">수련 과제</h2>
            
            <div className="flex-1 overflow-y-auto space-y-3">
                {trainingQuests.map((quest, index) => {
                    const reward = calculateReward(quest);
                    const isMaxLevel = quest.level >= 10; // 최대 레벨 (설정 가능)

                    return (
                        <div
                            key={quest.id}
                            className={`
                                bg-tertiary rounded-lg p-3 border-2
                                ${quest.isUnlocked ? 'border-primary' : 'border-gray-600 opacity-50'}
                            `}
                        >
                            {!quest.isUnlocked && (
                                <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center z-10">
                                    <span className="text-white font-bold text-xs">
                                        {quest.unlockStageId} 클리어 필요
                                    </span>
                                </div>
                            )}

                            <div className="flex gap-3">
                                {/* 이미지 */}
                                <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-700">
                                    <img 
                                        src={quest.image} 
                                        alt={quest.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                        }}
                                    />
                                </div>

                                {/* 정보 */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-1">
                                        <h3 className="font-bold text-sm text-on-panel truncate">
                                            {quest.name}
                                        </h3>
                                        <span className="text-xs text-tertiary ml-2">
                                            Lv.{quest.level}
                                        </span>
                                    </div>
                                    <p className="text-xs text-on-panel mb-2 line-clamp-2">
                                        {quest.description}
                                    </p>

                                    {/* 재화 정보 */}
                                    {quest.isUnlocked && (
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-tertiary">수령 가능:</span>
                                                <span className="font-bold text-primary">
                                                    {reward > 0 ? (
                                                        <>
                                                            {quest.rewardType === 'gold' ? '💰' : '💎'} 
                                                            {reward.toLocaleString()}
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-500">0</span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-tertiary">생산 주기:</span>
                                                <span className="text-on-panel">
                                                    {quest.productionRateMinutes}분
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 버튼 */}
                            {quest.isUnlocked && (
                                <div className="flex gap-2 mt-2">
                                    <Button
                                        onClick={() => handleCollectReward(quest.id)}
                                        colorScheme="green"
                                        className="flex-1 !text-xs !py-1"
                                        disabled={reward === 0}
                                    >
                                        수령 ({reward > 0 ? reward : 0})
                                    </Button>
                                    <Button
                                        onClick={() => handleLevelUp(quest.id)}
                                        colorScheme="blue"
                                        className="!text-xs !py-1 px-2"
                                        disabled={isMaxLevel}
                                        title={isMaxLevel ? '최대 레벨' : '레벨업'}
                                    >
                                        ⬆
                                    </Button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TrainingQuestPanel;

