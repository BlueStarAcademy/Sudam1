
import React, { useState, useEffect } from 'react';
import { LiveGameSession, User, ServerAction } from '../types.js';
import DraggableWindow from './DraggableWindow.js';
import Button from './Button.js';

interface BasePlacementModalProps {
    session: LiveGameSession;
    currentUser: User;
    onAction: (action: ServerAction) => void;
}

const BasePlacementModal: React.FC<BasePlacementModalProps> = ({ session, currentUser, onAction }) => {
    const { basePlacementDeadline, settings, player1, baseStones_p1, baseStones_p2 } = session;
    const baseStoneCount = settings.baseStones || 4;
    
    const myStones = (currentUser.id === player1.id ? baseStones_p1 : baseStones_p2);
    const myPlacements = myStones?.length || 0;

    const isDonePlacing = myPlacements >= baseStoneCount;
    
    const [timer, setTimer] = useState(30);

    useEffect(() => {
        if (!basePlacementDeadline) return;
        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((basePlacementDeadline - Date.now())/1000));
            setTimer(remaining);
        }, 1000);
        return () => clearInterval(interval);
    }, [basePlacementDeadline]);

    return (
        <DraggableWindow title="베이스돌 배치" windowId="base-placement" initialWidth={300} modal={false}>
            <div className="text-center">
                <p className="text-sm text-gray-200">상대에게 보이지 않는 베이스돌을 놓아주세요.</p>
                <p className="text-lg font-bold my-2">({myPlacements}/{baseStoneCount})</p>
                <div className="w-full bg-gray-700 rounded-full h-2.5 my-3 overflow-hidden">
                    <div className="bg-yellow-400 h-2.5 rounded-full" style={{ width: `${(timer / 30) * 100}%`, transition: 'width 0.5s linear' }}></div>
                </div>
                <div className="text-5xl font-mono font-bold mt-1 text-white">{timer}</div>
                
                {!isDonePlacing && (
                    <Button 
                        onClick={() => onAction({ type: 'PLACE_REMAINING_BASE_STONES_RANDOMLY' })}
                        colorScheme="yellow"
                        className="w-full mt-4 !text-sm !py-2"
                    >
                        남은 돌 무작위 배치
                    </Button>
                )}

                {isDonePlacing && (
                     <p className="text-sm text-green-400 animate-pulse mt-4">
                        배치 완료! 상대방을 기다립니다...
                     </p>
                )}
            </div>
        </DraggableWindow>
    );
};

export default BasePlacementModal;