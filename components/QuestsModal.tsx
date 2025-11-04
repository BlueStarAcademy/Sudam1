import React, { useState, useRef } from 'react';
import { UserWithStatus, Quest, ServerAction, QuestLog, QuestReward, InventoryItem } from '../types.js';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import { DAILY_MILESTONE_THRESHOLDS, WEEKLY_MILESTONE_THRESHOLDS, MONTHLY_MILESTONE_THRESHOLDS, DAILY_MILESTONE_REWARDS, WEEKLY_MILESTONE_REWARDS, MONTHLY_MILESTONE_REWARDS, CONSUMABLE_ITEMS } from '../constants.js';
import { audioService } from '../services/audioService.js';

interface QuestsModalProps {
    currentUser: UserWithStatus;
    onClose: () => void;
    onAction: (action: ServerAction) => void;
    isTopmost?: boolean;
}

type QuestTab = 'daily' | 'weekly' | 'monthly';
type QuestData = NonNullable<QuestLog[QuestTab]>;

const QuestItem: React.FC<{ quest: Quest, onClaim: (id: string) => void }> = ({ quest, onClaim }) => {
    const isComplete = quest.progress >= quest.target;
    const percentage = Math.min((quest.progress / quest.target) * 100, 100);

    const handleClaimClick = () => {
        if (isComplete && !quest.isClaimed) {
            audioService.claimReward();
            onClaim(quest.id);
        }
    };

    return (
        <div className="bg-gray-900/50 p-3 rounded-lg flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-800 rounded-md flex items-center justify-center text-gray-500 text-3xl flex-shrink-0">📜</div>
            <div className="flex-grow min-w-0">
                <h4 className="font-bold truncate">{quest.title}</h4>
                <p className="text-xs text-gray-400 mb-1 truncate">{quest.description}</p>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                </div>
                <p className="text-xs text-right text-gray-300 mt-1">{quest.progress} / {quest.target}</p>
            </div>
            <div className="w-28 text-center flex-shrink-0 flex flex-col items-center gap-1 relative">
                <Button 
                    onClick={handleClaimClick} 
                    disabled={!isComplete || quest.isClaimed} 
                    colorScheme={isComplete && !quest.isClaimed ? 'green' : 'gray'}
                    className="w-full !text-sm !py-2"
                >
                    {quest.isClaimed ? '완료' : (isComplete ? '보상 받기' : '진행 중')}
                </Button>
                <div className="flex items-center justify-center gap-2 text-xs flex-wrap">
                    <span className="text-yellow-300 font-semibold flex items-center gap-1">📜 +{quest.activityPoints}</span>
                    {quest.reward.gold && (
                        <span className="text-yellow-300 font-semibold flex items-center gap-1">
                            <img src="/images/icon/Gold.png" alt="골드" className="w-3 h-3" /> +{quest.reward.gold}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

const ActivityPanel: React.FC<{
    title: string;
    questData: QuestData | undefined;
    thresholds: number[];
    rewards: QuestReward[];
    questType: 'daily' | 'weekly' | 'monthly';
    onClaim: (index: number, type: 'daily' | 'weekly' | 'monthly') => void;
}> = ({ title, questData, thresholds, rewards, questType, onClaim }) => {
    if (!questData) return null;

    const { activityProgress, claimedMilestones } = questData;
    const maxProgress = thresholds[thresholds.length - 1];

    const getItemImage = (reward: QuestReward): string => {
        if (!reward.items || reward.items.length === 0) return '/images/Box/box.png';
        const firstItem = reward.items[0];
        const itemName = 'itemId' in firstItem ? firstItem.itemId : firstItem.name;
        const itemTemplate = CONSUMABLE_ITEMS.find(item => item.name === itemName);
        return itemTemplate?.image ?? '/images/Box/box.png';
    };

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg mb-4 flex-shrink-0">
            <h3 className="text-lg font-bold text-center mb-2">{title}</h3>
            <div className="flex items-center gap-3 mb-3">
                <div className="w-full bg-gray-700 rounded-full h-4 relative border border-gray-600">
                    <div className="bg-green-500 h-full rounded-full" style={{ width: `${Math.min(100, (activityProgress / maxProgress) * 100)}%` }}></div>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{activityProgress} / {maxProgress}</span>
                </div>
            </div>
            <div className="flex justify-around items-end">
                {thresholds.map((milestone, index) => {
                    if (!rewards[index]) return null;
                    const progressMet = activityProgress >= milestone;
                    const isClaimed = claimedMilestones[index];
                    const canClaim = progressMet && !isClaimed;
                    const reward = rewards[index];
                    const itemImage = getItemImage(reward);

                    return (
                        <div key={milestone} className="flex flex-col items-center">
                            <button
                                onClick={() => {
                                    if (canClaim) {
                                        audioService.claimReward();
                                        onClaim(index, questType);
                                    }
                                }}
                                disabled={!canClaim}
                                className={`relative w-8 h-8 transition-transform hover:scale-110 disabled:cursor-not-allowed ${canClaim ? 'animate-pulse' : ''}`}
                                title={isClaimed ? '수령 완료' : (progressMet ? '보상 수령' : `${milestone} 활약도 필요`)}
                            >
                                <img 
                                    src={itemImage} 
                                    alt={`보상 ${index + 1}`} 
                                    className={`w-full h-full object-contain ${!progressMet && !isClaimed ? 'filter grayscale' : ''}`} 
                                />
                                {isClaimed && <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-xl text-green-400">✓</div>}
                            </button>
                            <span className={`text-sm font-bold mt-1 ${progressMet ? 'text-yellow-300' : 'text-gray-500'}`}>{milestone}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const QuestsModal: React.FC<QuestsModalProps> = ({ currentUser, onClose, onAction, isTopmost }) => {
    const [activeTab, setActiveTab] = useState<QuestTab>('daily');
    const { quests } = currentUser;

    const handleClaim = (questId: string) => {
        onAction({ type: 'CLAIM_QUEST_REWARD', payload: { questId } });
    };

    const questList = activeTab === 'daily' ? (quests.daily?.quests || []) : (activeTab === 'weekly' ? (quests.weekly?.quests || []) : (quests.monthly?.quests || []));

    const renderActivityPanel = () => {
        if (activeTab === 'daily') {
            return <ActivityPanel title="오늘의 활약도" questData={quests.daily} thresholds={DAILY_MILESTONE_THRESHOLDS} rewards={DAILY_MILESTONE_REWARDS} questType="daily" onClaim={(index, type) => onAction({ type: 'CLAIM_ACTIVITY_MILESTONE', payload: { milestoneIndex: index, questType: type } })} />;
        }
        if (activeTab === 'weekly') {
            return <ActivityPanel title="주간 활약도" questData={quests.weekly} thresholds={WEEKLY_MILESTONE_THRESHOLDS} rewards={WEEKLY_MILESTONE_REWARDS} questType="weekly" onClaim={(index, type) => onAction({ type: 'CLAIM_ACTIVITY_MILESTONE', payload: { milestoneIndex: index, questType: type } })} />;
        }
        if (activeTab === 'monthly') {
            return <ActivityPanel title="월간 활약도" questData={quests.monthly} thresholds={MONTHLY_MILESTONE_THRESHOLDS} rewards={MONTHLY_MILESTONE_REWARDS} questType="monthly" onClaim={(index, type) => onAction({ type: 'CLAIM_ACTIVITY_MILESTONE', payload: { milestoneIndex: index, questType: type } })} />;
        }
        return null;
    };

    return (
        <DraggableWindow title="퀘스트" onClose={onClose} windowId="quests" initialWidth={750} isTopmost={isTopmost}>
            <div className="h-[calc(var(--vh,1vh)*70)] flex flex-col">
                <div className="flex bg-gray-900/70 p-1 rounded-lg mb-4 flex-shrink-0">
                    <button onClick={() => setActiveTab('daily')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'daily' ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}>일일</button>
                    <button onClick={() => setActiveTab('weekly')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'weekly' ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}>주간</button>
                    <button onClick={() => setActiveTab('monthly')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'monthly' ? 'bg-blue-600' : 'text-gray-400 hover:bg-gray-700/50'}`}>월간</button>
                </div>

                {activeTab === 'monthly' && (
                    <div className="flex-shrink-0 text-center text-sm text-yellow-300 mb-4 bg-gray-900/50 p-2 rounded-md">
                        <p>월간 퀘스트 활약도 100보상을 받으면 남은 월간퀘스트 기간동안 획득 골드량 50%상승 버프가 적용됩니다.</p>
                    </div>
                )}
                
                <div className="flex-grow overflow-y-auto pr-2">
                    {renderActivityPanel()}
                    {questList.length > 0 ? (
                        <ul className="space-y-3">
                            {questList.map(quest => (
                                <li key={quest.id}>
                                    <QuestItem quest={quest} onClaim={handleClaim} />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                            <p>진행 가능한 퀘스트가 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>
        </DraggableWindow>
    );
};

export default QuestsModal;