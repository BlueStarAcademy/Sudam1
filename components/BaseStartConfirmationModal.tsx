import React, { useState, useEffect } from 'react';
import { LiveGameSession, User, ServerAction, Player } from '../types.js';
import Avatar from './Avatar.js';
import Button from './Button.js';
import DraggableWindow from './DraggableWindow.js';
import { WHITE_BASE_STONE_IMG, BLACK_BASE_STONE_IMG } from '../assets.js';
import { AVATAR_POOL, BORDER_POOL } from '../constants.js';

interface BaseStartConfirmationModalProps {
    session: LiveGameSession;
    currentUser: User;
    onAction: (action: ServerAction) => void;
}

const MiniGoBoard: React.FC<{ session: LiveGameSession }> = ({ session }) => {
    const { boardState, baseStones, settings: { boardSize } } = session;
    const boardSizePx = 300;
    const cell_size = boardSizePx / boardSize;
    const padding = cell_size / 2;
    const stone_radius = cell_size * 0.47;
    const specialImageSize = stone_radius * 2 * 0.7;
    const specialImageOffset = specialImageSize / 2;

    const toSvgCoords = (p: {x: number, y: number}) => ({
        cx: padding + p.x * cell_size,
        cy: padding + p.y * cell_size,
    });

    return (
        <svg viewBox={`0 0 ${boardSizePx} ${boardSizePx}`} className="w-full h-full bg-[#e0b484] rounded-md shadow-inner">
            {Array.from({ length: boardSize }).map((_, i) => (
                <g key={i}>
                    <line x1={padding + i * cell_size} y1={padding} x2={padding + i * cell_size} y2={boardSizePx - padding} stroke="#54432a" strokeWidth="1" />
                    <line x1={padding} y1={padding + i * cell_size} x2={boardSizePx - padding} y2={padding + i * cell_size} stroke="#54432a" strokeWidth="1" />
                </g>
            ))}
            {baseStones?.map((stone, i) => {
                const { cx, cy } = toSvgCoords(stone);
                return (
                    <g key={`base-stone-${i}`}>
                        <circle cx={cx} cy={cy} r={stone_radius} fill={stone.player === Player.Black ? "#111827" : "#f5f2e8"} />
                        <image href={stone.player === Player.Black ? BLACK_BASE_STONE_IMG : WHITE_BASE_STONE_IMG} x={cx - specialImageOffset} y={cy - specialImageOffset} width={specialImageSize} height={specialImageSize} />
                    </g>
                );
            })}
        </svg>
    );
};

const BaseStartConfirmationModal: React.FC<BaseStartConfirmationModalProps> = ({ session, currentUser, onAction }) => {
    const { id: gameId, player1, player2, blackPlayerId, whitePlayerId, preGameConfirmations, revealEndTime, finalKomi } = session;
    const hasConfirmed = preGameConfirmations?.[currentUser.id];
    const [countdown, setCountdown] = useState(20);

    useEffect(() => {
        const deadline = revealEndTime || (Date.now() + 20000);
        const timerId = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            setCountdown(remaining);
        }, 1000);

        return () => clearInterval(timerId);
    }, [revealEndTime]);

    if (!blackPlayerId || !whitePlayerId) return null;
    
    const blackPlayer = player1.id === blackPlayerId ? player1 : player2;
    const whitePlayer = player1.id === whitePlayerId ? player1 : player2;

    const blackAvatarUrl = AVATAR_POOL.find(a => a.id === blackPlayer.avatarId)?.url;
    const blackBorderUrl = BORDER_POOL.find(b => b.id === blackPlayer.borderId)?.url;
    const whiteAvatarUrl = AVATAR_POOL.find(a => a.id === whitePlayer.avatarId)?.url;
    const whiteBorderUrl = BORDER_POOL.find(b => b.id === whitePlayer.borderId)?.url;

    return (
        <DraggableWindow title="대국 시작 확인" initialWidth={600} windowId="base-start-confirm">
            <div className="text-white">
                <p className="text-center text-gray-300 mb-4">흑/백이 결정되었습니다. 아래 시작 버튼을 누르거나 20초 후 대국이 시작됩니다.</p>
                
                <div className="flex gap-4">
                    <div className="w-1/2 flex flex-col items-center p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <Avatar userId={blackPlayer.id} userName={blackPlayer.nickname} size={64} avatarUrl={blackAvatarUrl} borderUrl={blackBorderUrl} />
                        <p className="mt-2 font-bold">{blackPlayer.nickname}</p>
                        <p className="font-semibold">흑 (선수)</p>
                    </div>
                    <div className="w-1/2 flex flex-col items-center p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <Avatar userId={whitePlayer.id} userName={whitePlayer.nickname} size={64} avatarUrl={whiteAvatarUrl} borderUrl={whiteBorderUrl} />
                        <p className="mt-2 font-bold">{whitePlayer.nickname}</p>
                        <p className="font-semibold">백 (덤: {finalKomi}집)</p>
                    </div>
                </div>

                <div className="my-4 mx-auto w-full max-w-xs">
                    <MiniGoBoard session={session} />
                </div>

                <Button
                    onClick={() => onAction({ type: 'CONFIRM_BASE_REVEAL', payload: { gameId }})} 
                    disabled={!!hasConfirmed}
                    className="w-full py-3"
                >
                    {hasConfirmed ? '상대방 확인 대기 중...' : `대국 시작 (${countdown})`}
                </Button>
            </div>
        </DraggableWindow>
    );
};

export default BaseStartConfirmationModal;