import React, { useState, useEffect } from 'react';
import { LiveGameSession, User, ServerAction, Player } from '../types.js';
import Avatar from './Avatar.js';
import Button from './Button.js';
import DraggableWindow from './DraggableWindow.js';
import { AVATAR_POOL, BORDER_POOL } from '../constants';
import Dice from './Dice.js';

interface DiceGoStartConfirmationModalProps {
    session: LiveGameSession;
    currentUser: User;
    onAction: (action: ServerAction) => void;
}

const DiceGoStartConfirmationModal: React.FC<DiceGoStartConfirmationModalProps> = ({ session, currentUser, onAction }) => {
    const { id: gameId, player1, player2, blackPlayerId, whitePlayerId, preGameConfirmations, revealEndTime, turnOrderRolls } = session;
    const hasConfirmed = preGameConfirmations?.[currentUser.id];
    const [countdown, setCountdown] = useState(10);

    useEffect(() => {
        const deadline = revealEndTime || (Date.now() + 10000);
        const timerId = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            setCountdown(remaining);
        }, 1000);

        return () => clearInterval(timerId);
    }, [revealEndTime]);

    if (!blackPlayerId || !whitePlayerId) return null;
    
    const blackPlayer = player1.id === blackPlayerId ? player1 : player2;
    const whitePlayer = player1.id === whitePlayerId ? player1 : player2;
    
    const myRole = currentUser.id === blackPlayerId ? '선공 (흑)' : '후공 (백)';
    
    const p1Roll = turnOrderRolls?.[player1.id] ?? null;
    const p2Roll = turnOrderRolls?.[player2.id] ?? null;

    const winner = p1Roll !== null && p2Roll !== null && p1Roll > p2Roll ? player1 : player2;

    const blackAvatarUrl = AVATAR_POOL.find(a => a.id === blackPlayer.avatarId)?.url;
    const blackBorderUrl = BORDER_POOL.find(b => b.id === blackPlayer.borderId)?.url;
    const whiteAvatarUrl = AVATAR_POOL.find(a => a.id === whitePlayer.avatarId)?.url;
    const whiteBorderUrl = BORDER_POOL.find(b => b.id === whitePlayer.borderId)?.url;

    return (
        <DraggableWindow title="대국 시작 확인" initialWidth={600} windowId="dice-go-start-confirm">
            <div className="text-white">
                {p1Roll !== null && p2Roll !== null && (
                    <p className="text-center text-gray-300 mb-2">주사위 결과 <span className="font-bold text-yellow-300">{winner.nickname}</span>님이 승리하여 선/후공이 결정되었습니다.</p>
                )}
                <p className="text-center text-gray-400 mb-4 text-sm">아래 시작 버튼을 누르거나 10초 후 대국이 자동으로 시작됩니다.</p>

                {p1Roll !== null && p2Roll !== null && (
                     <div className="flex justify-around items-center my-4 bg-gray-900/50 p-3 rounded-lg">
                        <div className="flex flex-col items-center gap-2">
                            <Avatar userId={player1.id} userName={player1.nickname} size={48} />
                            <span className="font-semibold text-sm">{player1.nickname}</span>
                            <Dice value={p1Roll} isRolling={false} size={48} />
                        </div>
                        <span className="text-2xl font-bold">VS</span>
                         <div className="flex flex-col items-center gap-2">
                            <Avatar userId={player2.id} userName={player2.nickname} size={48} />
                            <span className="font-semibold text-sm">{player2.nickname}</span>
                            <Dice value={p2Roll} isRolling={false} size={48} />
                        </div>
                    </div>
                )}
                
                <div className="flex gap-4 mt-4">
                    <div className="w-1/2 flex flex-col items-center p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <Avatar userId={blackPlayer.id} userName={blackPlayer.nickname} size={64} avatarUrl={blackAvatarUrl} borderUrl={blackBorderUrl} />
                        <p className="mt-2 font-bold">{blackPlayer.nickname}</p>
                        <p className="font-semibold">선공 (흑)</p>
                    </div>
                    <div className="w-1/2 flex flex-col items-center p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <Avatar userId={whitePlayer.id} userName={whitePlayer.nickname} size={64} avatarUrl={whiteAvatarUrl} borderUrl={whiteBorderUrl} />
                        <p className="mt-2 font-bold">{whitePlayer.nickname}</p>
                        <p className="font-semibold">후공 (백)</p>
                    </div>
                </div>

                <Button
                    onClick={() => onAction({ type: 'DICE_CONFIRM_START', payload: { gameId }})} 
                    disabled={!!hasConfirmed}
                    className="w-full py-3 mt-6"
                >
                    {hasConfirmed ? '상대방 확인 대기 중...' : `대국 시작 (${countdown})`}
                </Button>
            </div>
        </DraggableWindow>
    );
};

export default DiceGoStartConfirmationModal;