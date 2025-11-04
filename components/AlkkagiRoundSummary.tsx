import React, { useState, useEffect, useMemo } from 'react';
import { LiveGameSession, ServerAction, User, Player, AlkkagiStone, AvatarInfo, BorderInfo } from '../types.js';
import Avatar from './Avatar.js';
import Button from './Button.js';
import DraggableWindow from './DraggableWindow.js';
import { AVATAR_POOL, BORDER_POOL } from '../constants';

interface AlkkagiRoundSummaryProps {
    session: LiveGameSession;
    currentUser: User;
    onAction: (action: ServerAction) => void;
}

const AlkkagiRoundSummary: React.FC<AlkkagiRoundSummaryProps> = ({ session, currentUser, onAction }) => {
    const { id: gameId, alkkagiRoundSummary, player1, player2, roundEndConfirmations, revealEndTime, alkkagiStones } = session;
    const [countdown, setCountdown] = useState(30);
    const hasConfirmed = !!(roundEndConfirmations?.[currentUser.id]);

    useEffect(() => {
        const deadline = revealEndTime || (Date.now() + 30000);
        const timerId = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            setCountdown(remaining);
        }, 1000);
        return () => clearInterval(timerId);
    }, [revealEndTime]);

    if (!alkkagiRoundSummary) return null;

    const { round, winnerId } = alkkagiRoundSummary;
    const winner = player1.id === winnerId ? player1 : player2;
    
    const p1Enum = player1.id === session.blackPlayerId ? Player.Black : Player.White;
    const p2Enum = player2.id === session.blackPlayerId ? Player.Black : Player.White;

    const p1StonesLeft = alkkagiStones?.filter((s: AlkkagiStone) => s.player === p1Enum && s.onBoard).length ?? 0;
    const p2StonesLeft = alkkagiStones?.filter((s: AlkkagiStone) => s.player === p2Enum && s.onBoard).length ?? 0;
    
    const p1AvatarUrl = AVATAR_POOL.find((a: AvatarInfo) => a.id === player1.avatarId)?.url;
    const p1BorderUrl = BORDER_POOL.find((b: BorderInfo) => b.id === player1.borderId)?.url;
    const p2AvatarUrl = AVATAR_POOL.find((a: AvatarInfo) => a.id === player2.avatarId)?.url;
    const p2BorderUrl = BORDER_POOL.find((b: BorderInfo) => b.id === player2.borderId)?.url;

    const nextRound = round + 1;
    const totalRounds = session.settings.alkkagiRounds || 1;

    let description = `이제 양쪽 모두 다음 라운드를 위해 부족한 돌을 배치합니다.`;
    if (nextRound > totalRounds) {
        description = '모든 라운드가 종료되었습니다. 최종 결과를 확인합니다.';
    }

    return (
        <DraggableWindow title={`${round} 라운드 결과`} initialWidth={550} windowId="alkkari-round-summary">
            <div className="text-white text-center">
                <h2 className="text-2xl font-bold mb-2">{winner.nickname}님 라운드 승리!</h2>
                <p className="text-gray-300 mb-6">{description}</p>
                
                <div className="grid grid-cols-2 gap-4 my-6">
                    <div className="flex flex-col items-center p-4 bg-gray-900/50 rounded-lg border-2 border-gray-600">
                        <Avatar userId={player1.id} userName={player1.nickname} size={80} avatarUrl={p1AvatarUrl} borderUrl={p1BorderUrl} />
                        <p className="mt-2 text-xl font-bold">{player1.nickname}</p>
                        <p className="text-lg font-semibold">남은 돌: {p1StonesLeft}개</p>
                    </div>
                     <div className="flex flex-col items-center p-4 bg-gray-900/50 rounded-lg border-2 border-gray-600">
                        <Avatar userId={player2.id} userName={player2.nickname} size={80} avatarUrl={p2AvatarUrl} borderUrl={p2BorderUrl} />
                        <p className="mt-2 text-xl font-bold">{player2.nickname}</p>
                        <p className="text-lg font-semibold">남은 돌: {p2StonesLeft}개</p>
                    </div>
                </div>

                <Button
                    onClick={() => onAction({ type: 'CONFIRM_ROUND_END', payload: { gameId }})} 
                    disabled={!!hasConfirmed}
                    className="w-full py-3"
                >
                    {hasConfirmed ? '상대방 확인 대기 중...' : `${nextRound > totalRounds ? '최종 결과 보기' : '다음 라운드 시작'} (${countdown})`}
                </Button>
            </div>
        </DraggableWindow>
    );
};

export default AlkkagiRoundSummary;