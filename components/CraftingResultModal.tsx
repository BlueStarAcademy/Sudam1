
import React from 'react';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import { MATERIAL_ITEMS } from '../constants';

interface CraftingResultModalProps {
    result: {
        gained: { name: string, amount: number }[];
        used: { name: string, amount: number }[];
        craftType: 'upgrade' | 'downgrade';
        jackpot?: boolean;
    };
    onClose: () => void;
    isTopmost?: boolean;
}

const CraftingResultModal: React.FC<CraftingResultModalProps> = ({ result, onClose, isTopmost }) => {
    const { gained, used, craftType, jackpot } = result;

    const title = jackpot ? (craftType === 'upgrade' ? "합성 대박!" : "분해 대박!") : (craftType === 'upgrade' ? "합성 결과" : "분해 결과");
    const gainedItem = gained[0];
    const usedItem = used[0];

    const gainedTemplate = MATERIAL_ITEMS[gainedItem.name as keyof typeof MATERIAL_ITEMS];
    const usedTemplate = MATERIAL_ITEMS[usedItem.name as keyof typeof MATERIAL_ITEMS];

    return (
        <DraggableWindow title={title} onClose={onClose} windowId="crafting-result" initialWidth={400} isTopmost={isTopmost} zIndex={70}>
            <div className="text-center">
                {jackpot && (
                    <div className="mb-4">
                        <div className="text-3xl font-bold text-yellow-400 animate-pulse">🎉 대박! 🎉</div>
                        <div className="text-lg text-yellow-300 mt-2">재료를 2배로 획득했습니다!</div>
                    </div>
                )}
                <h2 className="text-xl font-bold mb-4">아래와 같이 아이템을 변환했습니다.</h2>

                <div className="flex items-center justify-around text-center mb-4 bg-gray-900/50 p-4 rounded-lg">
                    <div className="flex flex-col items-center">
                        {usedTemplate?.image && <img src={usedTemplate.image} alt={usedItem.name} className="w-16 h-16" />}
                        <span className="font-semibold">{usedItem.name}</span>
                        <span className="text-sm text-red-400 mt-1">-{usedItem.amount.toLocaleString()}개</span>
                    </div>
                    <div className="text-4xl font-bold text-yellow-400 mx-4">→</div>
                    <div className="flex flex-col items-center">
                        {gainedTemplate?.image && <img src={gainedTemplate.image} alt={gainedItem.name} className="w-16 h-16" />}
                        <span className="font-semibold">{gainedItem.name}</span>
                        <span className={`text-sm mt-1 ${jackpot ? 'text-yellow-400 font-bold' : 'text-green-400'}`}>
                            +{gainedItem.amount.toLocaleString()}개
                        </span>
                    </div>
                </div>
                
                <Button onClick={onClose} className="w-full mt-6 py-2.5">확인</Button>
            </div>
        </DraggableWindow>
    );
};

export default CraftingResultModal;
