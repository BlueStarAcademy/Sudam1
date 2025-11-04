import React, { useState, useMemo } from 'react';
import { UserWithStatus, GameMode, ServerAction } from '../types';
import DraggableWindow from './DraggableWindow';
import Button from './Button';
import Avatar from './Avatar';
import { AVATAR_POOL, BORDER_POOL, SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES } from '../constants';

interface ChallengeSelectionModalProps {
    opponentUser: UserWithStatus;
    currentMode: GameMode;
    onClose: () => void;
    onChallenge: (opponentId: string, mode: GameMode) => void; // This will be the final challenge action
}

const gameOptions = [
    { mode: GameMode.Omok, name: '오목', description: '다섯 개의 돌을 먼저 놓는 사람이 승리합니다.', image: '/images/game/omok.png', available: true },
    { mode: GameMode.Dice, name: '주사위 바둑', description: '주사위를 굴려 나온 숫자만큼 이동합니다.', image: '/images/game/dice.png', available: true },
    { mode: GameMode.Ttamok, name: '따목', description: '상대방의 돌을 따먹는 게임입니다.', image: '/images/game/ttamok.png', available: true },
    { mode: GameMode.Thief, name: '도둑잡기', description: '도둑을 잡는 사람이 승리합니다.', image: '/images/game/thief.png', available: true },
    { mode: GameMode.Alkkagi, name: '알까기', description: '상대방의 알을 판 밖으로 밀어내는 게임입니다.', image: '/images/game/alkkagi.png', available: true },
    { mode: GameMode.Curling, name: '컬링', description: '컬링처럼 돌을 밀어 점수를 얻는 게임입니다.', image: '/images/game/curling.png', available: true },
    { mode: GameMode.Go, name: '일반 바둑', description: '전통적인 바둑 규칙으로 대국합니다.', image: '/images/game/go.png', available: true },
];

const GameCard: React.FC<{ mode: GameMode, name: string, description: string, image: string, available: boolean, onSelect: () => void, isSelected: boolean }> = ({ mode, name, description, image, available, onSelect, isSelected }) => {
    const [imgError, setImgError] = useState(false);

    const hoverColorClass = SPECIAL_GAME_MODES.some(m => m.mode === mode) ? 'hover:shadow-blue-500/20' : 'hover:shadow-yellow-500/20';

    return (
        <div
            className={`bg-panel text-on-panel rounded-lg p-3 flex flex-col text-center transition-all transform hover:-translate-y-0.5 shadow-md ${hoverColorClass} ${!available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isSelected ? 'border-2 border-accent' : ''}`}
            onClick={available ? onSelect : undefined}
        >
            <div className="w-[120px] h-[90px] mx-auto bg-tertiary rounded-md mb-2 flex items-center justify-center text-tertiary overflow-hidden shadow-inner">
                {!imgError ? (
                    <img
                        src={image}
                        alt={name}
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <span className="text-xs">{name}</span>
                )}
            </div>
            <div className="flex-grow flex flex-col">
                <h3 className="text-base font-bold text-primary mb-1">{name}</h3>
                <p className="text-tertiary text-xs flex-grow">{description}</p>
            </div>
        </div>
    );
};

const ChallengeSelectionModal: React.FC<ChallengeSelectionModalProps> = ({
    opponentUser,
    currentMode,
    onClose,
    onChallenge,
}) => {
    const [selectedGameMode, setSelectedGameMode] = useState<GameMode>(currentMode);

    const filteredGameOptions = useMemo(() => {
        const isStrategicLobby = SPECIAL_GAME_MODES.some(m => m.mode === currentMode);
        return gameOptions.filter(game => {
            const isStrategicGame = SPECIAL_GAME_MODES.some(m => m.mode === game.mode);
            return (isStrategicLobby && isStrategicGame) || (!isStrategicLobby && !isStrategicGame);
        });
    }, [currentMode]);

    const avatarUrl = AVATAR_POOL.find(a => a.id === opponentUser.avatarId)?.url;
    const borderUrl = BORDER_POOL.find(b => b.id === opponentUser.borderId)?.url;

    const handleChallengeClick = () => {
        // Here, we would ideally show a game-specific application form
        // For now, we'll directly call onChallenge
        onChallenge(opponentUser.id, selectedGameMode);
        onClose();
    };

    return (
        <DraggableWindow onClose={onClose} title="대국 신청" initialWidth={800} initialHeight={600}>
            <div className="flex flex-col lg:flex-row gap-4 p-4 h-full">
                {/* Left Panel: Game Selection */}
                <div className="flex-1 flex flex-col gap-2 border border-color rounded-lg bg-panel-alt overflow-y-auto">
                    <h3 className="text-lg font-bold text-primary mb-2 p-2 border-b border-color">게임 선택</h3>
                    <div className="grid grid-cols-2 gap-3 p-2">
                        {filteredGameOptions.map((game) => (
                            <GameCard
                                key={game.mode}
                                mode={game.mode}
                                name={game.name}
                                description={game.description}
                                image={game.image}
                                available={game.available}
                                onSelect={() => setSelectedGameMode(game.mode)}
                                isSelected={selectedGameMode === game.mode}
                            />
                        ))}
                    </div>
                </div>

                {/* Right Panel: Opponent Info and Challenge Button */}
                <div className="flex-1 flex flex-col gap-4 p-4 border border-color rounded-lg bg-panel">
                    <h3 className="text-lg font-bold text-primary mb-2">상대방 정보</h3>
                    <div className="flex items-center gap-4">
                        <Avatar userId={opponentUser.id} userName={opponentUser.nickname} size={64} className="border-2 border-accent" avatarUrl={avatarUrl} borderUrl={borderUrl} />
                        <div>
                            <p className="text-xl font-bold text-highlight">{opponentUser.nickname}</p>
                            <p className="text-sm text-tertiary">전적: {opponentUser.wins}승 {opponentUser.losses}패</p>
                            <p className="text-sm text-tertiary">매너 점수: {opponentUser.mannerScore ?? 200}</p>
                            {/* Add more opponent info here */}
                        </div>
                    </div>

                    <div className="flex-1 flex items-end justify-end">
                        <Button onClick={handleChallengeClick} colorScheme="blue" className="w-full">
                            {selectedGameMode} 대국 신청
                        </Button>
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};

export default ChallengeSelectionModal;