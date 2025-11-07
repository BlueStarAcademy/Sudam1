import React from 'react';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import { InventoryItem } from '../types.js';
import { MATERIAL_ITEMS } from '../constants';

interface DisassemblyResultModalProps {
    isOpen?: boolean;
    onClose: () => void;
    result: {
        gained: { name: string; amount: number }[];
        jackpot: boolean;
        xpGained?: number;
    } | null;
    isTopmost?: boolean;
}

const DisassemblyResultModal: React.FC<DisassemblyResultModalProps> = ({ isOpen = true, onClose, result, isTopmost }) => {
    if (!result) return null;

    return (
        <DraggableWindow title="분해 결과" onClose={onClose} windowId="disassemblyResult" isTopmost zIndex={60}>
            <div className="p-4 text-on-panel flex flex-col items-center">
                <h3 className="text-xl font-bold mb-4">장비 분해 완료!</h3>

                {result.jackpot && (
                    <div className="text-center mb-4">
                        <p className="text-yellow-400 text-2xl font-bold animate-pulse">대박!</p>
                        <p className="text-lg text-green-400">모든 재료 획득량이 2배가 되었습니다!</p>
                    </div>
                )}

                <div className="w-full max-h-60 overflow-y-auto bg-gray-800/50 p-3 rounded-lg mb-4">
                    <p className="font-semibold text-secondary mb-2">획득한 재료:</p>
                    {result.gained.length > 0 ? (
                        result.gained.map((material, index) => {
                            const template = MATERIAL_ITEMS[material.name as keyof typeof MATERIAL_ITEMS];
                            return (
                                <div key={index} className="flex items-center justify-between text-sm py-1 border-b border-gray-700 last:border-b-0">
                                    <span className="flex items-center gap-2">
                                        {template?.image && <img src={template.image} alt={material.name} className="w-6 h-6" />}
                                        {material.name}
                                    </span>
                                    <span className="font-mono text-primary">x {material.amount.toLocaleString()}</span>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-sm text-tertiary">획득한 재료가 없습니다.</p>
                    )}
                </div>

                {result.xpGained !== undefined && result.xpGained > 0 && (
                    <div className="w-full max-w-xs bg-gray-800/50 p-3 rounded-lg mb-4 text-center">
                        <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1">
                                <img src="/images/equipments/moru.png" alt="대장간 경험치" className="w-5 h-5" />
                                대장간 경험치:
                            </span>
                            <span className="font-bold text-orange-400">+{result.xpGained.toLocaleString()}</span>
                        </div>
                    </div>
                )}

                <Button onClick={onClose} colorScheme="blue" className="w-full max-w-xs">
                    확인
                </Button>
            </div>
        </DraggableWindow>
    );
};

export default DisassemblyResultModal;