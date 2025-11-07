import React, { useState, useMemo } from 'react';
import { useAppContext } from '../hooks/useAppContext.js';
import Button from './Button.js';
import ClassNavigationPanel from './singleplayer/ClassNavigationPanel.js';
import StageGrid from './singleplayer/StageGrid.js';
import TrainingQuestPanel from './singleplayer/TrainingQuestPanel.js';
import { SinglePlayerLevel } from '../types.js';

const SinglePlayerLobby: React.FC = () => {
    const { currentUser } = useAppContext();
    const [selectedClass, setSelectedClass] = useState<SinglePlayerLevel>(SinglePlayerLevel.입문);

    const onBackToProfile = () => window.location.hash = '#/profile';

    if (!currentUser) {
        return null;
    }

    return (
        <div className="bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8 w-full mx-auto flex flex-col h-[calc(100vh-5rem)]">
            {/* Header */}
            <header className="flex justify-between items-center mb-6 flex-shrink-0">
                <button 
                    onClick={onBackToProfile} 
                    className="transition-transform active:scale-90 filter hover:drop-shadow-lg p-0 flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-800"
                    aria-label="뒤로가기"
                >
                    <img src="/images/button/back.png" alt="Back" className="w-6 h-6" />
                </button>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-100">싱글플레이</h1>
                <div className="w-10"></div> {/* Spacer to balance the back button */}
            </header>

            {/* Main Content - 가로폭을 더 활용한 레이아웃 */}
            <div className="flex-1 grid grid-cols-12 gap-4 lg:gap-6 min-h-0">
                {/* Left: 큰 이미지 클래스 선택 슬라이더 */}
                <div className="col-span-12 lg:col-span-4 flex flex-col min-h-0">
                    <ClassNavigationPanel 
                        selectedClass={selectedClass}
                        onClassSelect={setSelectedClass}
                    />
                </div>

                {/* Center: Stage Grid - 더 넓게 */}
                <div className="col-span-12 lg:col-span-5 flex flex-col min-h-0">
                    <StageGrid 
                        selectedClass={selectedClass}
                        currentUser={currentUser}
                    />
                </div>

                {/* Right: Training Quest Panel */}
                <div className="col-span-12 lg:col-span-3 flex flex-col min-h-0">
                    <TrainingQuestPanel 
                        currentUser={currentUser}
                    />
                </div>
            </div>
        </div>
    );
};

export default SinglePlayerLobby;
