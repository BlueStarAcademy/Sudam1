import React from 'react';

const TrainingAssignments: React.FC = () => {
    return (
        <div className="bg-gray-800/50 rounded-lg p-4 h-full">
            <h2 className="text-xl font-bold mb-4 text-center">수련 과제</h2>
            <div className="space-y-2">
                <div className="bg-gray-700 p-2 rounded-md">과제 1</div>
                <div className="bg-gray-700 p-2 rounded-md">과제 2</div>
                <div className="bg-gray-700 p-2 rounded-md">과제 3</div>
            </div>
        </div>
    );
};

export default TrainingAssignments;
