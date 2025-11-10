import React from 'react';
import { SinglePlayerMissionInfo } from '../../types.js';
import Button from '../Button.js';
import DraggableWindow from '../DraggableWindow.js';

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
    // 레벨 0일 때는 현재 레벨 정보가 없으므로 기본값 사용
    const currentLevelInfo = currentLevel > 0 ? mission.levels[currentLevel - 1] : null;
    const nextLevelInfo = mission.levels && mission.levels[currentLevel];
    
    // 다음 레벨 정보가 없으면 모달을 표시하지 않음
    if (!nextLevelInfo) {
        return null;
    }

    const hasEnoughGold = currentUserGold >= upgradeCost;
    // 레벨 0일 때는 변화량 계산 불가
    const productionRateChange = currentLevelInfo ? (currentLevelInfo.productionRateMinutes - nextLevelInfo.productionRateMinutes) : 0;
    const rewardAmountChange = currentLevelInfo ? (nextLevelInfo.rewardAmount - currentLevelInfo.rewardAmount) : nextLevelInfo.rewardAmount;
    const maxCapacityChange = currentLevelInfo ? (nextLevelInfo.maxCapacity - currentLevelInfo.maxCapacity) : nextLevelInfo.maxCapacity;

    return (
        <DraggableWindow 
            title={`${mission.name} 강화`} 
            onClose={onClose} 
            windowId={`training-quest-levelup-${mission.id}`}
            initialWidth={500}
            initialHeight={600}
            isTopmost
        >
            <div className="p-4 text-on-panel flex flex-col h-full overflow-y-auto">
                {/* 현재 레벨 정보 */}
                <div className="mb-2">
                    <h3 className="text-lg font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                        <span className="bg-yellow-500/20 px-2 py-1 rounded">Lv.{currentLevel}</span>
                        현재 레벨
                    </h3>
                    <div className="space-y-1.5 text-gray-200 text-sm bg-gray-900/50 p-2.5 rounded-lg">
                        {currentLevelInfo ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <img src="/images/icon/timer.png" alt="생산 속도" className="w-5 h-5" />
                                    <span>생산 속도: <strong className="text-yellow-300">{currentLevelInfo.productionRateMinutes}분</strong>마다</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {mission.rewardType === 'gold' ? (
                                        <img src="/images/icon/Gold.png" alt="골드" className="w-5 h-5" />
                                    ) : (
                                        <img src="/images/icon/Zem.png" alt="다이아" className="w-5 h-5" />
                                    )}
                                    <span>생산량: <strong className="text-yellow-300">{currentLevelInfo.rewardAmount}</strong>{mission.rewardType === 'gold' ? '골드' : '다이아'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-purple-500/50 rounded flex items-center justify-center text-xs font-bold">M</div>
                                    <span>최대 생산량: <strong className="text-yellow-300">{currentLevelInfo.maxCapacity}</strong></span>
                                </div>
                            </>
                        ) : (
                            <div className="text-gray-400 italic">시작 전 상태입니다.</div>
                        )}
                    </div>
                </div>

                {/* 화살표 */}
                <div className="flex justify-center my-1">
                    <span className="text-2xl text-gray-400">↓</span>
                </div>

                {/* 다음 레벨 정보 */}
                <div className="mb-2">
                    <h3 className="text-lg font-semibold text-green-400 mb-2 flex items-center gap-2">
                        <span className="bg-green-500/20 px-2 py-1 rounded">Lv.{currentLevel + 1}</span>
                        다음 레벨
                    </h3>
                    <div className="space-y-1.5 text-gray-200 text-sm bg-gray-900/50 p-2.5 rounded-lg">
                        <div className="flex items-center gap-2">
                            <img src="/images/icon/timer.png" alt="생산 속도" className="w-5 h-5" />
                            <span>
                                생산 속도: <strong className="text-green-300">{nextLevelInfo.productionRateMinutes}분</strong>마다
                                {productionRateChange > 0 && (
                                    <span className="text-green-400 ml-1">(-{productionRateChange.toFixed(1)}분)</span>
                                )}
                                {productionRateChange === 0 && <span className="text-gray-400 ml-1">(변화없음)</span>}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {mission.rewardType === 'gold' ? (
                                <img src="/images/icon/Gold.png" alt="골드" className="w-5 h-5" />
                            ) : (
                                <img src="/images/icon/Zem.png" alt="다이아" className="w-5 h-5" />
                            )}
                            <span>
                                생산량: <strong className="text-green-300">{nextLevelInfo.rewardAmount}</strong>{mission.rewardType === 'gold' ? '골드' : '다이아'}
                                {rewardAmountChange > 0 && (
                                    <span className="text-green-400 ml-1">(+{rewardAmountChange})</span>
                                )}
                                {rewardAmountChange === 0 && <span className="text-gray-400 ml-1">(변화없음)</span>}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-purple-500/50 rounded flex items-center justify-center text-xs font-bold">M</div>
                            <span>
                                최대 생산량: <strong className="text-green-300">{nextLevelInfo.maxCapacity}</strong>
                                {maxCapacityChange > 0 && (
                                    <span className="text-green-400 ml-1">(+{maxCapacityChange})</span>
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 강화 비용 */}
                <div className="pt-2 border-t border-gray-600 mb-2">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-gray-300 font-semibold">강화 비용:</span>
                        <div className="flex items-center gap-2">
                            <img src="/images/icon/Gold.png" alt="골드" className="w-5 h-5" />
                            <span className={`font-bold text-base ${hasEnoughGold ? 'text-yellow-400' : 'text-red-400'}`}>
                                {upgradeCost.toLocaleString()}
                            </span>
                        </div>
                    </div>
                    {!hasEnoughGold && (
                        <div className="text-red-400 text-xs flex items-center gap-1.5">
                            <img src="/images/icon/Gold.png" alt="골드" className="w-3.5 h-3.5" />
                            <span>골드가 부족합니다. (보유: {currentUserGold.toLocaleString()}골드)</span>
                        </div>
                    )}
                </div>

                {/* 오픈 조건 */}
                {nextLevelUnlockStage && (
                    <div className="pt-1.5 border-t border-gray-600 mb-2">
                        <div className="text-yellow-400 text-xs flex items-center gap-1.5">
                            <span className="text-lg">⚠️</span>
                            <span>{nextLevelUnlockStage} 스테이지를 클리어해야 합니다.</span>
                        </div>
                    </div>
                )}

                {/* 버튼 - 항상 하단에 고정 */}
                <div className="flex gap-3 mt-auto pt-3 border-t border-gray-600 flex-shrink-0">
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
                        {!canLevelUp ? '강화 불가' : !hasEnoughGold ? '골드 부족' : '강화하기'}
                    </Button>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default TrainingQuestLevelUpModal;
