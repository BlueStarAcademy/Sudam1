import React, { useState } from 'react';
import { GameMode, UserWithStatus } from '../types';
import { SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES } from '../constants';
import Button from './Button';
import DraggableWindow from './DraggableWindow';

interface ChallengeSelectionModalProps {
  opponent: UserWithStatus;
  onChallenge: (mode: GameMode) => void;
  onClose: () => void;
  lobbyType: 'strategic' | 'playful';
}

const GameCard: React.FC<{ mode: GameMode, image: string, onChallenge: (mode: GameMode) => void }> = ({ mode, image, onChallenge }) => {
    const [imgError, setImgError] = useState(false);

    return (
        <div
            className={`bg-panel text-on-panel rounded-lg p-3 flex flex-col text-center transition-all transform hover:-translate-y-1 shadow-lg cursor-pointer`}
            onClick={() => onChallenge(mode)}
        >
            <div className="w-[120px] h-[90px] mx-auto bg-tertiary rounded-md mb-2 flex items-center justify-center text-tertiary overflow-hidden shadow-inner">
                {!imgError ? (
                    <img 
                        src={image} 
                        alt={mode} 
                        className="w-full h-full object-cover" 
                        onError={() => setImgError(true)} 
                    />
                ) : (
                    <span className="text-xs">{mode}</span>
                )}
            </div>
            <div className="flex-grow flex flex-col">
                <h3 className="text-lg font-bold text-primary mb-1">{mode}</h3>
            </div>
        </div>
    );
};

const ChallengeSelectionModal: React.FC<ChallengeSelectionModalProps> = ({ opponent, onChallenge, onClose, lobbyType }) => {

  return (
    <DraggableWindow title="대국 신청" windowId="challenge-selection" onClose={onClose} initialWidth={600}>
      <div onMouseDown={(e) => e.stopPropagation()} className="text-sm">
        <p className="text-center text-yellow-300 mb-4">{opponent.nickname}님에게 대국을 신청합니다.</p>

        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-4">
              {(lobbyType === 'strategic' ? SPECIAL_GAME_MODES : PLAYFUL_GAME_MODES).map((game) => (
                <GameCard
                  key={game.mode}
                  mode={game.mode}
                  image={game.image}
                  onChallenge={onChallenge}
                />
              ))}
            </div>
        </div>
        
        <div className="mt-6 border-t border-gray-700 pt-6 flex justify-end gap-4">
             <Button onClick={onClose} variant="secondary">취소</Button>
        </div>
      </div>
    </DraggableWindow>
  );
};

export default ChallengeSelectionModal;
