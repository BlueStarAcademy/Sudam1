import React from 'react';
import { SinglePlayerLevel } from '../../types.js';

interface ClassNavigationPanelProps {
    selectedClass: SinglePlayerLevel;
    onClassSelect: (level: SinglePlayerLevel) => void;
}

const CLASS_INFO = [
    { level: SinglePlayerLevel.입문, name: '입문반', image: '/images/single/Academy1.png' },
    { level: SinglePlayerLevel.초급, name: '초급반', image: '/images/single/Academy2.png' },
    { level: SinglePlayerLevel.중급, name: '중급반', image: '/images/single/Academy3.png' },
    { level: SinglePlayerLevel.고급, name: '고급반', image: '/images/single/Academy4.png' },
    { level: SinglePlayerLevel.유단자, name: '유단자', image: '/images/single/Academy5.png' },
];

const ClassNavigationPanel: React.FC<ClassNavigationPanelProps> = ({ selectedClass, onClassSelect }) => {
    return (
        <div className="bg-panel rounded-lg shadow-lg p-4 h-full flex flex-col">
            <h2 className="text-xl font-bold text-on-panel mb-4 border-b border-color pb-2">단계 선택</h2>
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                {CLASS_INFO.map((classInfo) => {
                    const isSelected = selectedClass === classInfo.level;
                    return (
                        <button
                            key={classInfo.level}
                            onClick={() => onClassSelect(classInfo.level)}
                            className={`
                                relative w-full h-24 rounded-lg overflow-hidden transition-all duration-200
                                ${isSelected 
                                    ? 'ring-4 ring-primary shadow-lg transform scale-105' 
                                    : 'hover:shadow-md hover:scale-102 opacity-90 hover:opacity-100'
                                }
                            `}
                        >
                            <img 
                                src={classInfo.image} 
                                alt={classInfo.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    // Fallback if image doesn't exist
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                        parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-tertiary text-on-panel font-bold">${classInfo.name}</div>`;
                                    }
                                }}
                            />
                            {isSelected && (
                                <div className="absolute inset-0 bg-primary/20 border-2 border-primary"></div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-center py-2 font-bold text-sm">
                                {classInfo.name}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default ClassNavigationPanel;

