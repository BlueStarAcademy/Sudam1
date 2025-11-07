import React from 'react';
import { SinglePlayerMissionInfo } from '../../types.js';
import Button from '../Button.js';

interface TrainingQuestLevelUpModalProps {
    mission: SinglePlayerMissionInfo;
    currentLevel: number;
    upgradeCost: number;
    canLevelUp: boolean;
    nextLevelUnlockStage?: string;
    currentUserGold: number;
    onConfirm: () => void;
    onClose: () => void;
}

const TrainingQuestLevelUpModal: React.FC<TrainingQuestLevelUpModalProps> = ({
    mission,
    currentLevel,
    upgradeCost,
    canLevelUp,
    nextLevelUnlockStage,
    currentUserGold,
    onConfirm,
    onClose,
}) => {
    const currentLevelInfo = mission.levels[currentLevel - 1];
    const nextLevelInfo = mission.levels[currentLevel];
    
    if (!currentLevelInfo || !nextLevelInfo) {
        return null;
    }

    const hasEnoughGold = currentUserGold >= upgradeCost;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full border-2 border-gray-600">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-white mb-4 border-b border-gray-600 pb-3">
                        {mission.name} 강화
                    </h2>
                    
                    <div className="space-y-4 text-white">
                        {/* 현재 레벨 정보 */}
                        <div>
                            <h3 className="text-lg font-semibold text-yellow-400 mb-2">현재 레벨 {currentLevel}</h3>
                            <div className="space-y-1 text-gray-200 text-sm">
                                <div>생산 속도: {currentLevelInfo.productionRateMinutes}분마다</div>
                                <div>생산량: {currentLevelInfo.rewardAmount}{mission.rewardType === 'gold' ? '골드' : '다이아'}</div>
                                <div>최대 생산량: {currentLevelInfo.maxCapacity}</div>
                            </div>
                        </div>

                        {/* 화살표 */}
                        <div className="flex justify-center">
                            <span className="text-2xl text-gray-400">↓</span>
                        </div>

                        {/* 다음 레벨 정보 */}
                        <div>
                            <h3 className="text-lg font-semibold text-green-400 mb-2">다음 레벨 {currentLevel + 1}</h3>
                            <div className="space-y-1 text-gray-200 text-sm">
                                <div>생산 속도: {nextLevelInfo.productionRateMinutes}분마다 <span className="text-green-400">({currentLevelInfo.productionRateMinutes - nextLevelInfo.productionRateMinutes > 0 ? `-${(currentLevelInfo.productionRateMinutes - nextLevelInfo.productionRateMinutes).toFixed(1)}분` : '변화없음'})</span></div>
                                <div>생산량: {nextLevelInfo.rewardAmount}{mission.rewardType === 'gold' ? '골드' : '다이아'} <span className="text-green-400">({nextLevelInfo.rewardAmount - currentLevelInfo.rewardAmount > 0 ? `+${nextLevelInfo.rewardAmount - currentLevelInfo.rewardAmount}` : '변화없음'})</span></div>
                                <div>최대 생산량: {nextLevelInfo.maxCapacity} <span className="text-green-400">(+{nextLevelInfo.maxCapacity - currentLevelInfo.maxCapacity})</span></div>
                            </div>
                        </div>

                        {/* 강화 비용 */}
                        <div className="pt-3 border-t border-gray-600">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-300">강화 비용:</span>
                                <span className={`font-bold text-lg ${hasEnoughGold ? 'text-yellow-400' : 'text-red-400'}`}>
                                    {upgradeCost.toLocaleString()}골드
                                </span>
                            </div>
                            {!hasEnoughGold && (
                                <div className="text-red-400 text-sm mt-1">
                                    골드가 부족합니다. (보유: {currentUserGold.toLocaleString()}골드)
                                </div>
                            )}
                        </div>

                        {/* 오픈 조건 */}
                        {nextLevelUnlockStage && (
                            <div className="pt-2 border-t border-gray-600">
                                <div className="text-yellow-400 text-sm">
                                    ⚠️ {nextLevelUnlockStage} 스테이지를 클리어해야 합니다.
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 버튼 */}
                    <div className="flex gap-3 mt-6 pt-4 border-t border-gray-600">
                        <Button 
                            onClick={onClose} 
                            colorScheme="gray" 
                            className="flex-1"
                        >
                            취소
                        </Button>
                        <Button 
                            onClick={onConfirm} 
                            colorScheme="accent" 
                            className="flex-1"
                            disabled={!canLevelUp || !hasEnoughGold}
                        >
                            강화하기
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrainingQuestLevelUpModal;

