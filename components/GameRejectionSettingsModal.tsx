import React, { useState, useEffect } from 'react';
import { GameMode, ServerAction } from '../types';
import { useAppContext } from '../hooks/useAppContext';
import Button from './Button';

const gameOptions = [
    { mode: GameMode.Omok, name: '오목' },
    { mode: GameMode.Dice, name: '주사위 바둑' },
    { mode: GameMode.Ttamok, name: '따목' },
    { mode: GameMode.Thief, name: '도둑잡기' },
    { mode: GameMode.Alkkagi, name: '알까기' },
    { mode: GameMode.Curling, name: '컬링' },
    { mode: GameMode.Go, name: '일반 바둑' },
];

interface GameRejectionSettingsModalProps {
  onClose: () => void;
}

const GameRejectionSettingsModal: React.FC<GameRejectionSettingsModalProps> = ({ onClose }) => {
  const { currentUserWithStatus, handlers } = useAppContext();
  const [rejectedGameModes, setRejectedGameModes] = useState<GameMode[]>([]);

  useEffect(() => {
    if (currentUserWithStatus?.gameRejectionSettings?.rejectedModes) {
      setRejectedGameModes(currentUserWithStatus.gameRejectionSettings.rejectedModes);
    }
  }, [currentUserWithStatus]);

  const handleToggleGameMode = (mode: GameMode) => {
    setRejectedGameModes(prev =>
      prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]
    );
  };

  const handleSaveSettings = () => {
    handlers.handleAction({
      type: ServerAction.UpdateUserSettings,
      payload: {
        gameRejectionSettings: {
          rejectedModes: rejectedGameModes,
        },
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-panel rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-700 flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-white">대국 거부 설정</h2>
        <p className="text-gray-300 mb-4">선택한 게임 모드의 대국 신청을 자동으로 거부합니다.</p>
        <div className="flex flex-col gap-2 mb-6">
          {gameOptions.map((option) => (
            <label key={option.mode} className="flex items-center text-white cursor-pointer">
              <input
                type="checkbox"
                checked={rejectedGameModes.includes(option.mode)}
                onChange={() => handleToggleGameMode(option.mode)}
                className="form-checkbox h-5 w-5 text-accent rounded"
              />
              <span className="ml-2">{option.name}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3">
          <Button onClick={onClose} variant="secondary">취소</Button>
          <Button onClick={handleSaveSettings} variant="primary">저장</Button>
        </div>
      </div>
    </div>
  );
};

export default GameRejectionSettingsModal;