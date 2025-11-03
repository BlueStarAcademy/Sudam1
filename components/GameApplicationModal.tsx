import React, { useState, useMemo } from 'react';
import { GameMode } from '../types.js';
import { SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES } from '../constants.js';
import Button from './Button.js';
import { useAppContext } from '../hooks/useAppContext.js';

interface GameApplicationModalProps {
  onClose: () => void;
}

const GameApplicationModal: React.FC<GameApplicationModalProps> = ({ onClose }) => {
  const { handlers } = useAppContext();

  const allGameModes = useMemo(() => {
    return [...SPECIAL_GAME_MODES, ...PLAYFUL_GAME_MODES];
  }, []);

  const [selectedGameMode, setSelectedGameMode] = useState(allGameModes[0] || null);

  const handleApplyForGame = () => {
    if (selectedGameMode) {
      handlers.handleEnterWaitingRoom(selectedGameMode.mode);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-panel rounded-xl shadow-2xl w-full max-w-4xl h-3/4 p-6 border border-gray-700 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-primary">게임 신청</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
        </div>

        <div className="flex flex-grow gap-6">
          {/* Left Sidebar for Game Selection */}
          <div className="w-1/3 bg-gray-800 rounded-lg p-4 shadow-inner overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4 border-b pb-3 border-gray-600">게임 종류</h3>
            <div className="flex flex-col space-y-2">
              {allGameModes.map(game => (
                <button
                  key={game.mode}
                  onClick={() => setSelectedGameMode(game)}
                  className={`p-3 rounded-md text-left transition-colors duration-200
                              ${selectedGameMode?.mode === game.mode ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                >
                  {game.mode}
                </button>
              ))}
            </div>
          </div>

          {/* Right Content Area for Application Form */}
          <div className="w-2/3 bg-gray-800 rounded-lg p-6 shadow-inner flex flex-col justify-between">
            {selectedGameMode ? (
              <div className="flex-grow">
                <h3 className="text-2xl font-bold mb-4 text-primary">{selectedGameMode.mode} 신청</h3>
                <div className="flex items-center mb-4">
                  <img src={selectedGameMode.image} alt={selectedGameMode.mode} className="w-20 h-20 object-cover rounded-md mr-4" />
                  <p className="text-lg text-gray-300">{selectedGameMode.description}</p>
                </div>
                {/* Actual application form elements would go here */}
                <div className="mt-4 text-gray-400">
                    <p>여기에 {selectedGameMode.mode} 게임에 대한 추가 설정 옵션이 들어갑니다.</p>
                    {/* Example: Number of players, game duration, etc. */}
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-400 text-xl mt-20">게임을 선택해주세요.</p>
            )}
            <div className="mt-6 flex-shrink-0">
              <Button onClick={handleApplyForGame} className="w-full py-3 text-lg" disabled={!selectedGameMode}>
                게임 신청
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameApplicationModal;
