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
    const currentIndex = CLASS_INFO.findIndex(c => c.level === selectedClass);
    const currentClass = CLASS_INFO[currentIndex];

    const handlePrevious = () => {
        if (currentIndex > 0) {
            onClassSelect(CLASS_INFO[currentIndex - 1].level);
        }
    };

    const handleNext = () => {
        if (currentIndex < CLASS_INFO.length - 1) {
            onClassSelect(CLASS_INFO[currentIndex + 1].level);
        }
    };

    const isMobile = window.innerWidth < 1024;
    
    return (
        <div className={`bg-gray-800 rounded-lg shadow-lg ${isMobile ? 'p-2' : 'p-4'} h-full flex flex-col`}>
            <h2 className={`${isMobile ? 'text-base' : 'text-xl'} font-bold text-gray-200 ${isMobile ? 'mb-2' : 'mb-4'} border-b border-gray-700 ${isMobile ? 'pb-1' : 'pb-2'} text-center`}>단계 선택</h2>
            
            {/* 큰 이미지와 좌우 화살표 */}
            <div className="flex-1 flex items-center justify-center relative">
                {/* 좌측 화살표 버튼 */}
                <button
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className={`
                        absolute left-0 z-10 ${isMobile ? 'w-8 h-8' : 'w-12 h-12'} rounded-full bg-gray-700 hover:bg-gray-600
                        flex items-center justify-center transition-all duration-200
                        ${currentIndex === 0 ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:scale-110 cursor-pointer active:scale-95'}
                        shadow-lg ${isMobile ? 'border' : 'border-2'} border-gray-600
                    `}
                    aria-label="이전 단계"
                >
                    <svg 
                        className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'} text-gray-200`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                {/* 현재 선택된 클래스 이미지 */}
                <div className={`flex-1 h-full flex flex-col items-center justify-center ${isMobile ? 'mx-8' : 'mx-12'} relative`}>
                    <div className={`relative w-full h-full ${isMobile ? 'max-h-[200px]' : 'max-h-[500px]'} rounded-lg overflow-hidden shadow-xl ${isMobile ? 'border-2' : 'border-4'} border-purple-600`}>
                        <img 
                            src={currentClass.image} 
                            alt={currentClass.name}
                            className="w-full h-full object-cover brightness-100"
                            onError={(e) => {
                                // Fallback if image doesn't exist
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                    parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gray-700 text-gray-200 font-bold ${isMobile ? 'text-lg' : 'text-2xl'}">${currentClass.name}</div>`;
                                }
                            }}
                        />
                        {/* 클래스 이름 오버레이 */}
                        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent text-white text-center ${isMobile ? 'py-2 px-2' : 'py-4 px-4'}`}>
                            <div className={`${isMobile ? 'text-lg' : 'text-2xl lg:text-3xl'} font-bold mb-1`}>{currentClass.name}</div>
                            <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-300`}>
                                {currentIndex + 1} / {CLASS_INFO.length}
                            </div>
                        </div>
                    </div>
                    
                    {/* 하단 클래스 선택 인디케이터 */}
                    <div className={`flex gap-2 ${isMobile ? 'mt-2' : 'mt-4'}`}>
                        {CLASS_INFO.map((classInfo, index) => {
                            const isSelected = selectedClass === classInfo.level;
                            return (
                                <button
                                    key={classInfo.level}
                                    onClick={() => onClassSelect(classInfo.level)}
                                    className={`
                                        ${isMobile ? 'w-2 h-2' : 'w-3 h-3'} rounded-full transition-all duration-200
                                        ${isSelected 
                                            ? `bg-purple-500 ${isMobile ? 'w-6' : 'w-8'}` 
                                            : 'bg-gray-600 hover:bg-gray-500'
                                        }
                                    `}
                                    aria-label={classInfo.name}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* 우측 화살표 버튼 */}
                <button
                    onClick={handleNext}
                    disabled={currentIndex === CLASS_INFO.length - 1}
                    className={`
                        absolute right-0 z-10 ${isMobile ? 'w-8 h-8' : 'w-12 h-12'} rounded-full bg-gray-700 hover:bg-gray-600
                        flex items-center justify-center transition-all duration-200
                        ${currentIndex === CLASS_INFO.length - 1 ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:scale-110 cursor-pointer active:scale-95'}
                        shadow-lg ${isMobile ? 'border' : 'border-2'} border-gray-600
                    `}
                    aria-label="다음 단계"
                >
                    <svg 
                        className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'} text-gray-200`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default ClassNavigationPanel;

