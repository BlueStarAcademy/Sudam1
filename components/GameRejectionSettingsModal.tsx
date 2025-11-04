import React, { useState, useEffect, useMemo } from 'react';
import { GameMode } from '../types';
import { useAppContext } from '../hooks/useAppContext';
import Button from './Button';
import { SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES } from '../constants';

interface GameRejectionSettingsModalProps {
  onClose: () => void;
  lobbyType?: 'strategic' | 'playful';
}

const GameRejectionSettingsModal: React.FC<GameRejectionSettingsModalProps> = ({ onClose, lobbyType }) => {
  const { currentUserWithStatus, handlers } = useAppContext();
  const [rejectedGameModes, setRejectedGameModes] = useState<GameMode[]>([]);

  useEffect(() => {
    if (currentUserWithStatus?.rejectedGameModes) {
      setRejectedGameModes(currentUserWithStatus.rejectedGameModes);
    }
  }, [currentUserWithStatus]);

  // lobbyType에 따라 표시할 게임 모드 필터링
  const gameOptions = useMemo(() => {
    if (lobbyType === 'strategic') {
      // 전략바둑 게임만 표시
      return SPECIAL_GAME_MODES.map(mode => ({
        mode: mode.mode,
        name: mode.name
      }));
    } else if (lobbyType === 'playful') {
      // 놀이바둑 게임만 표시
      return PLAYFUL_GAME_MODES.map(mode => ({
        mode: mode.mode,
        name: mode.name
      }));
    } else {
      // lobbyType이 없으면 모든 게임 모드 표시 (하위 호환성)
      return [
        ...SPECIAL_GAME_MODES.map(mode => ({ mode: mode.mode, name: mode.name })),
        ...PLAYFUL_GAME_MODES.map(mode => ({ mode: mode.mode, name: mode.name }))
      ];
    }
  }, [lobbyType]);

  const handleToggleGameMode = (mode: GameMode) => {
    setRejectedGameModes(prev =>
      prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]
    );
  };

  const handleSaveSettings = () => {
    handlers.handleAction({
      type: 'UPDATE_REJECTION_SETTINGS',
      payload: {
        rejectedGameModes: rejectedGameModes,
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
          {gameOptions.length > 0 ? (
            gameOptions.map((option, index) => (
              <label key={`${option.mode}-${index}`} className="flex items-center text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={rejectedGameModes.includes(option.mode)}
                  onChange={() => handleToggleGameMode(option.mode)}
                  className="form-checkbox h-5 w-5 text-accent rounded"
                />
                <span className="ml-2">{option.name}</span>
              </label>
            ))
          ) : (
            <p className="text-gray-400 text-sm">표시할 게임 모드가 없습니다.</p>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <Button onClick={onClose} colorScheme="gray">취소</Button>
          <Button onClick={handleSaveSettings} colorScheme="green">저장</Button>
        </div>
      </div>
    </div>
  );
};

export default GameRejectionSettingsModal;