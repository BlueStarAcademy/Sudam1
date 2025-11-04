import React, { useState, useEffect } from 'react';
import { LiveGameSession, User, ServerAction, Player } from '../types.js';
import Avatar from './Avatar.js';
import Button from './Button.js';
import DraggableWindow from './DraggableWindow.js';
import { AVATAR_POOL, BORDER_POOL } from '../constants';

interface ThiefRoleConfirmedModalProps {
    session: LiveGameSession;
    currentUser: User;
    onAction: (action: ServerAction) => void;
}

const ThiefRoleConfirmedModal: React.FC<ThiefRoleConfirmedModalProps> = ({ session, currentUser, onAction }) => {
    const { id: gameId, player1, player2, thiefPlayerId, policePlayerId, preGameConfirmations, revealEndTime, rpsState, turnChoices } = session;
    const hasConfirmed = !!(preGameConfirmations?.[currentUser.id]);
    const [countdown, setCountdown] = useState(10);

    useEffect(() => {
        const deadline = revealEndTime || (Date.now() + 10000);
        const timerId = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            setCountdown(remaining);
        }, 1000);

        return () => clearInterval(timerId);
    }, [revealEndTime]);

    if (!thiefPlayerId || !policePlayerId) return null;

    const thiefPlayer = player1.id === thiefPlayerId ? player1 : player2;
    const policePlayer = player1.id === policePlayerId ? player1 : player2;
    const thiefAvatarUrl = AVATAR_POOL.find(a => a.id === thiefPlayer.avatarId)?.url;
    const thiefBorderUrl = BORDER_POOL.find(b => b.id === thiefPlayer.borderId)?.url;
    const policeAvatarUrl = AVATAR_POOL.find(a => a.id === policePlayer.avatarId)?.url;
    const policeBorderUrl = BORDER_POOL.find(b => b.id === policePlayer.borderId)?.url;

    // Determine who won the tiebreaker
    let description = '역할이 결정되었습니다.';
    const myChoice = session.roleChoices?.[currentUser.id];
    const opponentId = currentUser.id === player1.id ? player2.id : player1.id;
    const opponentChoice = session.roleChoices?.[opponentId];
    if (myChoice === opponentChoice) {
        description = `가위바위보 결과, ${thiefPlayer.id === currentUser.id ? '승리하여' : '패배하여'} 역할이 결정되었습니다.`
    }
    
    return (
        <DraggableWindow title="역할 결정 완료" initialWidth={600} windowId="thief-role-confirm">
            <div className="text-white">
                <p className="text-center text-gray-300 mb-4">{description}</p>
                
                <div className="flex gap-4">
                    <div className="w-1/2 flex flex-col items-center p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <Avatar userId={thiefPlayer.id} userName={thiefPlayer.nickname} size={64} avatarUrl={thiefAvatarUrl} borderUrl={thiefBorderUrl} />
                        <p className="mt-2 font-bold">{thiefPlayer.nickname}</p>
                        <p className="font-semibold px-2 py-0.5 rounded-full text-sm my-1 bg-yellow-600 text-black">🏃 도둑 (선공)</p>
                    </div>
                    <div className="w-1/2 flex flex-col items-center p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <Avatar userId={policePlayer.id} userName={policePlayer.nickname} size={64} avatarUrl={policeAvatarUrl} borderUrl={policeBorderUrl} />
                        <p className="mt-2 font-bold">{policePlayer.nickname}</p>
                        <p className="font-semibold px-2 py-0.5 rounded-full text-sm my-1 bg-blue-600 text-white">🚓 경찰 (후공)</p>
                    </div>
                </div>

                <Button
                    onClick={() => onAction({ type: 'CONFIRM_THIEF_ROLE', payload: { gameId }})} 
                    disabled={!!hasConfirmed}
                    className="w-full py-3 mt-6"
                >
                    {hasConfirmed ? '상대방 확인 대기 중...' : `대국 시작 (${countdown})`}
                </Button>
            </div>
        </DraggableWindow>
    );
};

export default ThiefRoleConfirmedModal;