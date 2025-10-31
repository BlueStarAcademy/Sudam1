import React from 'react';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';

interface ClaimAllSummaryModalProps {
    summary: { gold: number, diamonds: number, actionPoints: number };
    onClose: () => void;
    isTopmost?: boolean;
}

const ClaimAllSummaryModal: React.FC<ClaimAllSummaryModalProps> = ({ summary, onClose, isTopmost }) => {
    return (
        <DraggableWindow title="일괄 수령 결과" onClose={onClose} windowId="claim-all-summary" initialWidth={400} isTopmost={isTopmost}>
            <div className="text-center">
                <h2 className="text-xl font-bold mb-4">아래 보상을 모두 수령했습니다!</h2>
                <div className="space-y-3 bg-gray-900/50 p-4 rounded-lg text-lg">
                    {summary.gold > 0 && (
                        <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1"><img src="/images/icon/Gold.png" alt="골드" className="w-5 h-5" /> 골드:</span>
                            <span className="font-bold text-yellow-300">+{summary.gold.toLocaleString()}</span>
                        </div>
                    )}
                    {summary.diamonds > 0 && (
                        <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1"><img src="/images/icon/Zem.png" alt="다이아" className="w-5 h-5" /> 다이아:</span>
                            <span className="font-bold text-cyan-300">+{summary.diamonds.toLocaleString()}</span>
                        </div>
                    )}
                    {summary.actionPoints > 0 && (
                        <div className="flex justify-between items-center">
                            <span>⚡ 행동력:</span>
                            <span className="font-bold text-green-300">+{summary.actionPoints.toLocaleString()}</span>
                        </div>
                    )}
                </div>
                <Button onClick={onClose} className="w-full mt-6 py-2.5">확인</Button>
            </div>
        </DraggableWindow>
    );
};

export default ClaimAllSummaryModal;