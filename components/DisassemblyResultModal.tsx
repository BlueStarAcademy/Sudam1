import React from 'react';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import { MATERIAL_ITEMS } from '../constants.js';

interface DisassemblyResultModalProps {
    result: {
        gained: { name: string, amount: number }[];
        jackpot: boolean;
    };
    onClose: () => void;
    isTopmost?: boolean;
}

const DisassemblyResultModal: React.FC<DisassemblyResultModalProps> = ({ result, onClose, isTopmost }) => {
    const { gained, jackpot } = result;

    return (
        <DraggableWindow title={jackpot ? "✨ 대박! ✨" : "분해 결과"} onClose={onClose} windowId="disassembly-result" initialWidth={400} isTopmost={isTopmost}>
            <div className="text-center">
                {jackpot && (
                    <h2 className="text-2xl font-bold text-yellow-300 mb-4 animate-pulse">모든 재료 획득량이 2배가 되었습니다!</h2>
                )}
                <p className="text-gray-300 mb-4">아래 아이템을 획득했습니다.</p>
                <div className="space-y-3 bg-gray-900/50 p-4 rounded-lg text-lg">
                    {gained.map((item, index) => {
                        const template = MATERIAL_ITEMS[item.name as keyof typeof MATERIAL_ITEMS];
                        return (
                             <div key={index} className="flex justify-between items-center">
                                <span className="flex items-center gap-2">
                                    {template?.image && <img src={template.image} alt={item.name} className="w-6 h-6" />}
                                    {item.name}:
                                </span>
                                <span className="font-bold text-green-300">+{item.amount.toLocaleString()}개</span>
                            </div>
                        )
                    })}
                </div>
                <Button onClick={onClose} className="w-full mt-6 py-2.5">확인</Button>
            </div>
        </DraggableWindow>
    );
};

export default DisassemblyResultModal;