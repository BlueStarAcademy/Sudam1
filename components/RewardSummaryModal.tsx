

import React from 'react';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import { InventoryItem, QuestReward } from '../types.js';

interface RewardSummaryModalProps {
    summary: {
        reward: QuestReward;
        items: InventoryItem[];
        title: string;
    };
    onClose: () => void;
    isTopmost?: boolean;
}

const RewardSummaryModal: React.FC<RewardSummaryModalProps> = ({ summary, onClose, isTopmost }) => {
    const { reward, items, title } = summary;

    return (
        <DraggableWindow title={title} onClose={onClose} windowId="quest-reward-summary" initialWidth={400} isTopmost={isTopmost}>
            <div className="text-center">
                <h2 className="text-xl font-bold mb-4">보상을 획득했습니다!</h2>
                <div className="space-y-3 bg-gray-900/50 p-4 rounded-lg text-lg">
                    {(reward.gold ?? 0) > 0 && (
                        <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1"><img src="/images/icon/Gold.png" alt="골드" className="w-5 h-5" /> 골드:</span>
                            <span className="font-bold text-yellow-300">+{reward.gold!.toLocaleString()}</span>
                        </div>
                    )}
                    {(reward.diamonds ?? 0) > 0 && (
                         <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1"><img src="/images/icon/Zem.png" alt="다이아" className="w-5 h-5" /> 다이아:</span>
                            <span className="font-bold text-cyan-300">+{reward.diamonds!.toLocaleString()}</span>
                        </div>
                    )}
                    {(reward.actionPoints ?? 0) > 0 && (
                        <div className="flex justify-between items-center">
                            <span>⚡ 행동력:</span>
                            <span className="font-bold text-green-300">+{reward.actionPoints!.toLocaleString()}</span>
                        </div>
                    )}
                </div>
                {items.length > 0 && (
                     <div className="mt-4 bg-gray-900/50 p-4 rounded-lg">
                         <h3 className="font-semibold mb-2">획득 아이템</h3>
                         <div className="grid grid-cols-4 gap-2">
                             {items.map((item, index) => (
                                 <div key={index} className="flex flex-col items-center" title={item.name}>
                                     <img src={item.image!} alt={item.name} className="w-12 h-12 object-contain" />
                                     <span className="text-xs">{item.name}{item.quantity && item.quantity > 1 ? ` x${item.quantity}` : ''}</span>
                                 </div>
                             ))}
                         </div>
                     </div>
                )}
                <Button onClick={onClose} className="w-full mt-6 py-2.5">확인</Button>
            </div>
        </DraggableWindow>
    );
};

export default RewardSummaryModal;