import React from 'react';

const ClassNavigation: React.FC = () => {
    return (
        <div className="bg-gray-800/50 rounded-lg p-4 h-full flex flex-col items-center justify-center">
            <h2 className="text-xl font-bold mb-4">입문반</h2>
            <div className="flex items-center gap-4">
                <button className="text-2xl">⬅️</button>
                <img src="/images/championship/Champ1.png" alt="Beginner Class" className="w-48 h-32" />
                <button className="text-2xl">➡️</button>
            </div>
        </div>
    );
};

export default ClassNavigation;
