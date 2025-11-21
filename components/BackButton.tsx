import React from 'react';

interface BackButtonProps {
    onClick: () => void;
}

const BackButton: React.FC<BackButtonProps> = ({ onClick }) => {
    return (
        <button 
            onClick={onClick} 
            className="p-0 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all duration-100 active:shadow-inner active:scale-95 active:translate-y-0.5"
            aria-label="뒤로가기"
        >
            <img src="/images/button/back.png" alt="Back" className="w-full h-full" />
        </button>
    );
};

export default BackButton;

