
import React, { useMemo } from 'react';
import { UserWithStatus, ServerAction, SinglePlayerLevel } from '../types.js';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';
import { SINGLE_PLAYER_STAGES } from '../constants/singlePlayerConstants';
import { CONSUMABLE_ITEMS } from '../constants';

interface StageSelectionModalProps {
    currentUser: UserWithStatus;
    onClose: () => void;
    onAction: (action: ServerAction) => void;
    levelName: string;
    levelIdPrefix: SinglePlayerLevel;
}

const StageSelectionModal: React.FC<StageSelectionModalProps> = ({ currentUser, onClose, onAction, levelName, levelIdPrefix }) => {
    
    const userProgress = currentUser.singlePlayerProgress ?? 0;

    const stagesForLevel = useMemo(() => {
        return SINGLE_PLAYER_STAGES.filter(stage => stage.level === levelIdPrefix);
    }, [levelIdPrefix]);

    const handleStageClick = (stageId: string) => {
        onAction({ type: 'START_SINGLE_PLAYER_GAME', payload: { stageId } });
    };

    return (
        <DraggableWindow title={`${levelName} 스테이지 선택`} onClose={onClose} windowId={`stage-selection-${levelIdPrefix}`} initialWidth={800}>
            <div className="h-[60vh] flex flex-col">
                <div className="grid grid-cols-5 gap-4 overflow-y-auto pr-2 flex-grow">
                    {stagesForLevel.map(stage => {
                        const stageIndex = (SINGLE_PLAYER_STAGES.findIndex(s => s.id === stage.id));
                        const isLocked = userProgress < stageIndex;
                        const isCleared = userProgress > stageIndex;

                        return (
                            <div
                                key={stage.id}
                                onClick={() => !isLocked && handleStageClick(stage.id)}
                                className={`p-4 rounded-lg flex flex-col items-center justify-between text-center transition-all duration-200 relative border-2 ${
                                    isLocked 
                                    ? 'bg-gray-800/50 opacity-60 cursor-not-allowed border-transparent' 
                                    : `bg-gray-700/50 hover:bg-gray-600/50 hover:scale-105 cursor-pointer ${isCleared ? 'border-green-500' : 'border-yellow-500'}`
                                }`}
                            >
                                {isCleared && <div className="absolute top-2 right-2 text-2xl">✅</div>}
                                <div className="flex-grow flex flex-col items-center justify-center">
                                    <h3 className="font-bold text-lg">{stage.name}</h3>
                                    {/* FIX: The 'stage.targetScore' object is formatted as a string to be properly rendered as a ReactNode. */}
                                    <p className="text-xs text-gray-400 mt-1">목표 점수: 흑{stage.targetScore.black}/백{stage.targetScore.white}집</p>
                                    <p className="text-xs text-gray-400 mt-1">AI 레벨: {stage.katagoLevel}</p>
                                </div>
                                <div className="mt-4 pt-2 border-t border-gray-600 w-full flex-shrink-0">
                                    <p className="text-xs font-semibold text-yellow-300">최초 보상</p>
                                    <div className="flex items-center justify-center gap-2 mt-1 text-xs">
                                        {stage.rewards.firstClear.gold > 0 && (
                                            <span className="flex items-center gap-1">
                                                <img src="/images/icon/Gold.png" alt="골드" className="w-4 h-4" />
                                                {stage.rewards.firstClear.gold}
                                            </span>
                                        )}
                                        {stage.rewards.firstClear.items?.map((itemRef, idx) => {
                                            const itemTemplate = CONSUMABLE_ITEMS.find(ci => ci.name === itemRef.itemId);
                                            if (!itemTemplate?.image) return null;
                                            return (
                                                <span key={idx} className="flex items-center gap-1" title={`${itemRef.itemId} x${itemRef.quantity}`}>
                                                    <img src={itemTemplate.image} alt={itemRef.itemId} className="w-5 h-5 object-contain" />
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                                {isLocked && (
                                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                        <span className="text-4xl" role="img" aria-label="Locked">🔒</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </DraggableWindow>
    );
};

export default StageSelectionModal;