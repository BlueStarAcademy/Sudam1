import React from 'react';

interface GameRejectionSettingsModalProps {
  onClose: () => void;
}

const GameRejectionSettingsModal: React.FC<GameRejectionSettingsModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-panel rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-700 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-primary">대국 신청 거부 설정</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
        </div>
        <div className="text-on-panel">
          <p>여기에 대국 신청 거부 설정 내용이 들어갑니다.</p>
        </div>
      </div>
    </div>
  );
};

export default GameRejectionSettingsModal;