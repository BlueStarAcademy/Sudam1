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
        <div className="bg-primary text-primary p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto flex flex-col h-[calc(100vh-5rem)]">
            {/* Header */}
            <header className="flex justify-between items-center mb-6 flex-shrink-0">
                <Button 
                    onClick={onBackToProfile} 
                    colorScheme="gray" 
                    className="p-0 flex items-center justify-center w-10 h-10 rounded-full"
                >
                    <img src="/images/button/back.png" alt="Back" className="w-6 h-6" />
                </Button>
                <h1 className="text-3xl lg:text-4xl font-bold">싱글플레이</h1>
                <div className="w-10"></div> {/* Spacer to balance the back button */}
            </header>

            {/* Main Content - 3 Column Layout */}
            <div className="flex-1 grid grid-cols-12 gap-4 lg:gap-6 min-h-0">
                {/* Left: Class Navigation Panel */}
                <div className="col-span-12 lg:col-span-3 flex flex-col min-h-0">
                    <ClassNavigationPanel 
                        selectedClass={selectedClass}
                        onClassSelect={setSelectedClass}
                    />
                </div>

                {/* Center: Stage Grid */}
                <div className="col-span-12 lg:col-span-6 flex flex-col min-h-0">
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
