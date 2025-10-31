
import React, { useState, useEffect } from 'react';
import { LiveGameSession, User, Player } from '../types.js';
import DraggableWindow from './DraggableWindow.js';

interface AlkkagiPlacementModalProps {
    session: LiveGameSession;
    currentUser: User;
}

const AlkkagiPlacementModal: React.FC<AlkkagiPlacementModalProps> = ({ session, currentUser }) => {
    const { alkkagiPlacementDeadline, settings, player1, alkkagiStones, alkkagiStones_p1, alkkagiStones_p2, alkkagiStonesPlacedThisRound, blackPlayerId } = session;
    const stoneCount = settings.alkkagiStoneCount || 5;
    
    // Stones placed during this specific placement phase
    const myStonesPlacedThisPhase = alkkagiStonesPlacedThisRound?.[currentUser.id] || 0;
    
    const targetPlacements = stoneCount;
    const title = (session.alkkagiRound || 1) > 1 ? `추가 배치 (${session.alkkagiRound} 라운드)` : '알까기 돌 배치';
    
    const isDonePlacing = myStonesPlacedThisPhase >= targetPlacements;
    
    const [timer, setTimer] = useState(30);

    useEffect(() => {
        if (!alkkagiPlacementDeadline) return;
        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((alkkagiPlacementDeadline - Date.now())/1000));
            setTimer(remaining);
        }, 1000);
        return () => clearInterval(interval);
    }, [alkkagiPlacementDeadline]);

    return (
        <DraggableWindow title={title} windowId="alkkagi-placement" initialWidth={300} modal={false}>
            <div className="text-center">
                <p className="text-sm text-gray-200">{(session.alkkagiRound || 1) > 1 ? '부족한 돌을 배치하세요.' : '상대에게 보이지 않게 돌을 배치하세요.'}</p>
                <p className="text-lg font-bold my-2">({myStonesPlacedThisPhase}/{targetPlacements})</p>
                <div className="w-full bg-gray-700 rounded-full h-2.5 my-3 overflow-hidden">
                    <div className="bg-yellow-400 h-2.5 rounded-full" style={{ width: `${(timer / 30) * 100}%`, transition: 'width 0.5s linear' }}></div>
                </div>
                <div className="text-5xl font-mono font-bold mt-1 text-white">{timer}</div>
                
                {isDonePlacing && (
                     <p className="text-sm text-green-400 animate-pulse mt-4">
                        배치 완료! 상대방을 기다립니다...
                     </p>
                )}
            </div>
        </DraggableWindow>
    );
};

export default AlkkagiPlacementModal;