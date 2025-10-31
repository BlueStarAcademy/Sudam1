import React, { useState, useEffect } from 'react';
import { LiveGameSession, Player, ServerAction, User } from '../types.js';
import Avatar from './Avatar.js';
import Button from './Button.js';
import DraggableWindow from './DraggableWindow.js';

interface CaptureTiebreakerModalProps {
    session: LiveGameSession;
    currentUser: User;
    onAction: (action: ServerAction) => void;
}

const CaptureTiebreakerModal: React.FC<CaptureTiebreakerModalProps> = ({ session, currentUser, onAction }) => {
    const { id: gameId, player1, player2, blackPlayerId, whitePlayerId, effectiveCaptureTargets, gameStatus, settings, preGameConfirmations, revealEndTime } = session;
    const hasConfirmed = preGameConfirmations?.[currentUser.id];
    const [countdown, setCountdown] = useState(10);

    useEffect(() => {
        const deadline = revealEndTime || (Date.now() + 10000);
        const timerId = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            setCountdown(remaining);
        }, 1000);

        return () => {
            clearInterval(timerId);
        };
    }, [revealEndTime]);

    if (!blackPlayerId || !whitePlayerId || !effectiveCaptureTargets) return null;
    
    const blackPlayer = player1.id === blackPlayerId ? player1 : player2;
    const whitePlayer = player1.id === whitePlayerId ? player1 : player2;
    const blackTarget = effectiveCaptureTargets[Player.Black];
    const whiteTarget = effectiveCaptureTargets[Player.White];

    const isTiebreaker = gameStatus === 'capture_tiebreaker';

    const getTitleAndDescription = () => {
        if (isTiebreaker) {
            return {
                title: "흑백 결정 완료 (동점)",
                description: "두 번째 입찰에서도 동점이 되어, 흑/백이 랜덤으로 결정되었습니다."
            };
        }
        
        const winnerBid = effectiveCaptureTargets[Player.Black]! - settings.captureTarget!;
        const winner = blackPlayer; // Black player always wins the bid
        return {
            title: "흑백 결정 완료",
            description: `${winner.nickname}님이 ${winnerBid}개를 설정하여 흑(선)이 됩니다.`
        };
    };

    const { title, description } = getTitleAndDescription();

    const PlayerDisplay = ({ user, color, target }: { user: User, color: '흑' | '백', target: number | undefined }) => (
        <div className="flex flex-col items-center text-center p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <Avatar userId={user.id} userName={user.nickname} size={80} className={`border-4 ${color === '흑' ? 'border-gray-500' : 'border-gray-400'}`} />
            <p className="mt-3 text-xl font-bold">{user.nickname}</p>
            <p className={`text-lg font-semibold ${color === '흑' ? 'text-gray-300' : 'text-gray-300'}`}>{color}{color === '흑' && ' (선)'}</p>
            <div className="mt-2 text-sm bg-gray-800 px-3 py-1 rounded-full">
                <span className="text-gray-400">승리 조건: </span>
                <span className="font-bold text-yellow-300">{target}개</span>
                <span className="text-gray-400"> 따내기</span>
            </div>
        </div>
    );

    return (
        <DraggableWindow title={title} initialWidth={550} windowId="capture-tiebreaker">
            <div className="text-white">
                <p className="text-center text-gray-300 mb-6">{description}</p>
                <div className="grid grid-cols-2 gap-4 my-6">
                    <PlayerDisplay user={blackPlayer} color="흑" target={blackTarget} />
                    <PlayerDisplay user={whitePlayer} color="백" target={whiteTarget} />
                </div>
                <Button
                    onClick={() => onAction({ type: 'CONFIRM_CAPTURE_REVEAL', payload: { gameId }})} 
                    disabled={!!hasConfirmed}
                    className="w-full py-3"
                >
                    {hasConfirmed ? '상대방 확인 대기 중...' : `대국 시작 (${countdown})`}
                </Button>
            </div>
        </DraggableWindow>
    );
};

export default CaptureTiebreakerModal;