import React from 'react';
import { GameMode } from '../types.js';
import DraggableWindow from './DraggableWindow.js';
import { GAME_RULES } from '../gameRules.js';

interface HelpModalProps {
    mode: GameMode;
    onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ mode, onClose }) => {
    const rules = GAME_RULES[mode];

    if (!rules) {
        return (
            <DraggableWindow title="도움말" onClose={onClose} windowId={`help-${mode}`} initialWidth={500}>
                <p className="text-center text-gray-400">이 게임 모드에 대한 도움말을 찾을 수 없습니다.</p>
            </DraggableWindow>
        );
    }
    
    return (
        <DraggableWindow title={`${rules.title} 게임 방법`} onClose={onClose} windowId={`help-${mode}`} initialWidth={550}>
            <div className="max-h-[70vh] overflow-y-auto pr-2 text-gray-300">
                <div className="space-y-4">
                    {rules.sections.map((section, index) => (
                        <div key={index} className="bg-gray-900/50 p-4 rounded-lg">
                            <h3 className="font-bold text-lg text-yellow-300 mb-2">{section.subtitle}</h3>
                            <ul className="list-disc list-inside space-y-2 text-sm">
                                {section.content.map((point, i) => (
                                    <li key={i}>{point}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </DraggableWindow>
    );
};

export default HelpModal;