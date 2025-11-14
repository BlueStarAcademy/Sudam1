import React from 'react';
import DraggableWindow from '../DraggableWindow.js';
import Button from '../Button.js';
import { SINGLE_PLAYER_MISSIONS } from '../../constants/singlePlayerConstants.js';

interface ClaimAllTrainingQuestRewardsModalProps {
    rewards: Array<{ missionId: string; missionName: string; rewardType: 'gold' | 'diamonds'; rewardAmount: number }>;
    totalGold: number;
    totalDiamonds: number;
    onClose: () => void;
    isTopmost?: boolean;
}

const ClaimAllTrainingQuestRewardsModal: React.FC<ClaimAllTrainingQuestRewardsModalProps> = ({ 
    rewards, 
    totalGold, 
    totalDiamonds, 
    onClose, 
    isTopmost 
}) => {
    return (
        <DraggableWindow 
            title="수련 과제 일괄 수령" 
            onClose={onClose} 
            windowId="claim-all-training-quest-rewards" 
            initialWidth={500}
            isTopmost={isTopmost}
        >
            <div className="text-center">
                <h2 className="text-xl font-bold mb-4">모든 수련 과제 보상을 수령했습니다!</h2>
                
                {/* 개별 보상 목록 */}
                <div className="space-y-2 bg-gray-900/50 p-4 rounded-lg mb-4 max-h-96 overflow-y-auto">
                    {rewards.map((reward) => {
                        const missionInfo = SINGLE_PLAYER_MISSIONS.find(m => m.id === reward.missionId);
                        return (
                            <div 
                                key={reward.missionId} 
                                className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {missionInfo && (
                                        <img 
                                            src={missionInfo.image} 
                                            alt={reward.missionName}
                                            className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                            }}
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-sm text-white truncate">{reward.missionName}</h3>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                                    {reward.rewardType === 'gold' ? (
                                        <>
                                            <img src="/images/icon/Gold.png" alt="골드" className="w-5 h-5" />
                                            <span className="font-bold text-yellow-300 text-sm">+{reward.rewardAmount.toLocaleString()}</span>
                                        </>
                                    ) : (
                                        <>
                                            <img src="/images/icon/Zem.png" alt="다이아" className="w-5 h-5" />
                                            <span className="font-bold text-cyan-300 text-sm">+{reward.rewardAmount.toLocaleString()}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* 총 합계 */}
                {(totalGold > 0 || totalDiamonds > 0) && (
                    <div className="space-y-2 bg-gradient-to-r from-green-900/30 to-blue-900/30 p-4 rounded-lg border-2 border-green-500/30 mb-4">
                        <h3 className="font-bold text-lg mb-2">총 합계</h3>
                        <div className="space-y-2">
                            {totalGold > 0 && (
                                <div className="flex justify-between items-center text-lg">
                                    <span className="flex items-center gap-2">
                                        <img src="/images/icon/Gold.png" alt="골드" className="w-6 h-6" />
                                        <span className="font-semibold">골드:</span>
                                    </span>
                                    <span className="font-bold text-yellow-300">+{totalGold.toLocaleString()}</span>
                                </div>
                            )}
                            {totalDiamonds > 0 && (
                                <div className="flex justify-between items-center text-lg">
                                    <span className="flex items-center gap-2">
                                        <img src="/images/icon/Zem.png" alt="다이아" className="w-6 h-6" />
                                        <span className="font-semibold">다이아:</span>
                                    </span>
                                    <span className="font-bold text-cyan-300">+{totalDiamonds.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                <Button 
                    onClick={onClose} 
                    colorScheme="accent" 
                    className="w-full mt-4"
                >
                    확인
                </Button>
            </div>
        </DraggableWindow>
    );
};

export default ClaimAllTrainingQuestRewardsModal;

