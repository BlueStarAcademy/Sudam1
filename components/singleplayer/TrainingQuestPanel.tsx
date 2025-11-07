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

    // 사용자의 수련 과제 상태
    const trainingQuests = useMemo(() => {
        const userMissions = (currentUser as any).singlePlayerMissions || {};
        const clearedStages = (currentUser as any).clearedSinglePlayerStages || [];
        return SINGLE_PLAYER_MISSIONS.map(mission => {
            const missionState = userMissions[mission.id];
            const currentLevel = missionState?.level || 0;
            const levelInfo = currentLevel > 0 && currentLevel <= mission.levels.length 
                ? mission.levels[currentLevel - 1] 
                : null;
            const isUnlocked = isMissionUnlocked(mission.unlockStageId, clearedStages);
            
            return {
                ...mission,
                missionState,
                currentLevel,
                levelInfo,
                isUnlocked,
                isStarted: missionState?.isStarted || false,
            };
        });
    }, [currentUser]);

    // 재화 수령 계산
    const calculateReward = (quest: any) => {
        if (!quest.isUnlocked || !quest.isStarted || !quest.levelInfo) return 0;
        
        const productionRateMs = quest.levelInfo.productionRateMinutes * 60 * 1000;
        const now = Date.now();
        const lastCollectionTime = quest.missionState?.lastCollectionTime || now;
        const elapsed = now - lastCollectionTime;
        const cycles = Math.floor(elapsed / productionRateMs);
        const accumulatedAmount = quest.missionState?.accumulatedAmount || 0;
        
        if (cycles > 0) {
            const generatedAmount = cycles * quest.levelInfo.rewardAmount;
            return Math.min(quest.levelInfo.maxCapacity, accumulatedAmount + generatedAmount);
        }
        
        return accumulatedAmount;
    };
    
    // 레벨업 조건 계산
    const getLevelUpInfo = (quest: any) => {
        if (!quest.isStarted || !quest.levelInfo || quest.currentLevel >= 10) return null;
        
        const requiredCollection = quest.levelInfo.maxCapacity * quest.currentLevel * 10;
        const accumulatedCollection = quest.missionState?.accumulatedCollection || 0;
        const progress = Math.min(100, (accumulatedCollection / requiredCollection) * 100);
        
        // 레벨업 비용
        let upgradeCost: number;
        if (quest.rewardType === 'gold') {
            upgradeCost = quest.levelInfo.maxCapacity * 5;
        } else {
            upgradeCost = quest.levelInfo.maxCapacity * 1000;
        }
        
        // 다음 레벨 오픈조건 확인
        const nextLevelInfo = quest.levels[quest.currentLevel];
        const clearedStages = (currentUser as any).clearedSinglePlayerStages || [];
        const canLevelUp = accumulatedCollection >= requiredCollection && 
            (!nextLevelInfo?.unlockStageId || clearedStages.includes(nextLevelInfo.unlockStageId));
        
        return {
            requiredCollection,
            accumulatedCollection,
            progress,
            upgradeCost,
            canLevelUp,
            nextLevelUnlockStage: nextLevelInfo?.unlockStageId,
        };
    };

    // 미션 시작
    const handleStartMission = (missionId: string) => {
        handlers.handleAction({
            type: 'START_SINGLE_PLAYER_MISSION',
            payload: { missionId }
        });
    };

    // 재화 수령
    const handleCollectReward = (missionId: string) => {
        handlers.handleAction({
            type: 'CLAIM_SINGLE_PLAYER_MISSION_REWARD',
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
                    const reward = quest.isStarted ? calculateReward(quest) : 0;
                    const isMaxLevel = quest.currentLevel >= 10;
                    const levelUpInfo = getLevelUpInfo(quest);

                    return (
                        <div
                            key={quest.id}
                            className={`
                                relative bg-tertiary rounded-lg p-3 border-2
                                ${quest.isUnlocked ? 'border-primary' : 'border-gray-600 opacity-50'}
                            `}
                        >
                            {!quest.isUnlocked && (
                                <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center z-10 pointer-events-none">
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
                                            Lv.{quest.currentLevel || 0}/10
                                        </span>
                                    </div>
                                    <p className="text-xs text-on-panel mb-2 line-clamp-2">
                                        {quest.description}
                                    </p>

                                    {/* 재화 정보 */}
                                    {quest.isUnlocked && quest.isStarted && quest.levelInfo && (
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
                                                    {quest.levelInfo.productionRateMinutes}분
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-tertiary">최대 생산량:</span>
                                                <span className="text-on-panel">
                                                    {quest.levelInfo.maxCapacity}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* 레벨업 진행도 */}
                                    {quest.isUnlocked && quest.isStarted && levelUpInfo && !isMaxLevel && (
                                        <div className="mt-2 space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-tertiary">레벨업 진행도:</span>
                                                <span className="text-on-panel">
                                                    {levelUpInfo.accumulatedCollection}/{levelUpInfo.requiredCollection} ({levelUpInfo.progress.toFixed(1)}%)
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-1.5">
                                                <div 
                                                    className="bg-blue-500 h-1.5 rounded-full transition-all"
                                                    style={{ width: `${levelUpInfo.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 버튼 */}
                            {quest.isUnlocked && (
                                <div className="flex flex-col gap-2 mt-2">
                                    {!quest.isStarted ? (
                                        <Button
                                            onClick={() => handleStartMission(quest.id)}
                                            colorScheme="blue"
                                            className="w-full !text-xs !py-1"
                                        >
                                            시작
                                        </Button>
                                    ) : (
                                        <>
                                            <div className="flex gap-2">
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
                                                    disabled={isMaxLevel || !levelUpInfo?.canLevelUp || (currentUser.gold < levelUpInfo.upgradeCost)}
                                                    title={isMaxLevel ? '최대 레벨' : levelUpInfo?.nextLevelUnlockStage ? `${levelUpInfo.nextLevelUnlockStage} 클리어 필요` : `레벨업 (비용: ${levelUpInfo?.upgradeCost || 0}골드)`}
                                                >
                                                    ⬆
                                                </Button>
                                            </div>
                                            {levelUpInfo && !isMaxLevel && (
                                                <div className="text-xs text-gray-400 text-center">
                                                    레벨업 비용: {levelUpInfo.upgradeCost.toLocaleString()}골드
                                                </div>
                                            )}
                                        </>
                                    )}
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

