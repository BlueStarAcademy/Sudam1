import React from 'react';
import ClassNavigation from './singleplayer/ClassNavigation.js';
import StageSelection from './singleplayer/StageSelection.js';
import TrainingAssignments from './singleplayer/TrainingAssignments.js';
import Button from './Button.js';

const SinglePlayerLobby: React.FC = () => {
    const onBackToProfile = () => window.location.hash = '#/profile';

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto flex flex-col h-[calc(100vh-5rem)]">
            <header className="flex justify-between items-center mb-6 flex-shrink-0">
                <Button onClick={onBackToProfile} colorScheme="gray" className="p-0 flex items-center justify-center w-10 h-10 rounded-full">
                    <img src="/images/button/back.png" alt="Back" className="w-6 h-6" />
                </Button>
                <h1 className="text-3xl lg:text-4xl font-bold">싱글플레이</h1>
                <div className="w-10"></div> {/* Spacer to balance the back button */}
            </header>
            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                <div className="col-span-3">
                    <ClassNavigation />
                </div>
                <div className="col-span-6">
                    <StageSelection />
                </div>
                <div className="col-span-3">
                    <TrainingAssignments />
                </div>
            </div>
        </div>
    );
};

export default SinglePlayerLobby;