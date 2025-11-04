import React, { useState, useMemo } from 'react';
import DraggableWindow from '../DraggableWindow.js';
import Button from '../Button.js';
import { GameMode, ServerAction, UserWithStatus } from '../../types.js'; // Import UserWithStatus
import { SPECIAL_GAME_MODES } from '../../constants';
import Avatar from '../Avatar.js'; // Import Avatar
import { AVATAR_POOL, BORDER_POOL } from '../../constants'; // Import AVATAR_POOL, BORDER_POOL

interface ChallengeApplicationModalProps {
    opponentUser: UserWithStatus; // Changed from opponentId to opponentUser
    onClose: () => void;
    onAction: (action: ServerAction) => void;
}

const ChallengeApplicationModal: React.FC<ChallengeApplicationModalProps> = ({ opponentUser, onClose, onAction }) => {
    const [selectedGameMode, setSelectedGameMode] = useState<GameMode>(SPECIAL_GAME_MODES[0].mode);

    const selectedGameDefinition = useMemo(() => {
        return SPECIAL_GAME_MODES.find(mode => mode.mode === selectedGameMode);
    }, [selectedGameMode]);

    const isGameModeRejected = useMemo(() => {
        return opponentUser.rejectedGameModes?.includes(selectedGameMode);
    }, [opponentUser.rejectedGameModes, selectedGameMode]);

    const handleChallenge = () => {
        if (isGameModeRejected) {
            alert(`상대방이 ${selectedGameMode}을(를) 거부한 상태입니다.`);
            return;
        }
        onAction({ type: 'CHALLENGE_USER', payload: { opponentId: opponentUser.id, mode: selectedGameMode } });
        onClose();
    };

    const avatarUrl = AVATAR_POOL.find(a => a.id === opponentUser.avatarId)?.url;
    const borderUrl = BORDER_POOL.find(b => b.id === opponentUser.borderId)?.url;

    return (
        <DraggableWindow title="대국 신청" onClose={onClose} windowId="challenge-application" initialWidth={600} isTopmost>
            <div className="flex h-[400px]">
                {/* Left Panel: Opponent Info and Game Description */}
                <div className="w-1/3 bg-tertiary/30 p-4 flex flex-col text-on-panel rounded-l-lg">
                    <div className="flex items-center gap-2 mb-4">
                        <Avatar userId={opponentUser.id} userName={opponentUser.nickname} size={48} className="border-2 border-color" avatarUrl={avatarUrl} borderUrl={borderUrl} />
                        <h3 className="font-bold text-lg">{opponentUser.nickname}</h3>
                    </div>
                    {isGameModeRejected && (
                        <p className="text-sm text-red-400 mb-2">
                            상대방이 <span className="font-bold">{selectedGameMode}</span>을(를) 거부한 상태입니다.
                        </p>
                    )}
                    <h3 className="font-bold text-lg mb-2">{selectedGameDefinition?.name}</h3>
                    <p className="text-sm text-tertiary flex-grow overflow-y-auto">
                        {selectedGameDefinition?.description || '게임을 선택하여 설명을 확인하세요.'}
                    </p>
                </div>

                {/* Right Panel: Game Selection and Challenge Button */}
                <div className="w-2/3 bg-primary p-4 flex flex-col rounded-r-lg">
                    <div className="flex border-b border-color mb-4">
                        {SPECIAL_GAME_MODES.map(game => (
                            <button
                                key={game.mode}
                                onClick={() => setSelectedGameMode(game.mode)}
                                className={`px-4 py-2 text-sm font-semibold ${
                                    selectedGameMode === game.mode
                                        ? 'border-b-2 border-accent text-accent'
                                        : 'text-secondary hover:bg-secondary/20'
                                }`}
                            >
                                {game.name}
                            </button>
                        ))}
                    </div>
                    <div className="flex-grow flex items-center justify-center text-tertiary">
                        <p>선택된 게임: <span className="font-bold text-primary">{selectedGameDefinition?.name}</span></p>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                        <Button onClick={onClose} colorScheme="gray">취소</Button>
                        <Button onClick={handleChallenge} colorScheme="blue" disabled={isGameModeRejected}>신청</Button>
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default ChallengeApplicationModal;
