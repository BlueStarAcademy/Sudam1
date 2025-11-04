import React, { useState, useEffect } from 'react';

interface DiceProps {
    value: number | null;
    isRolling: boolean;
    sides?: 6;
    size?: number;
    onClick?: () => void;
    disabled?: boolean;
    displayText?: string;
    color?: 'blue' | 'yellow' | 'gray';
}

const Dot: React.FC<{ pos: string }> = ({ pos }) => (
    <div className={`w-[22%] h-[22%] bg-black rounded-full absolute ${pos}`}></div>
);

const DiceFace: React.FC<{ value: number }> = ({ value }) => {
    const positions: { [key: number]: string[] } = {
        1: ['top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'],
        2: ['top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2', 'bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2'],
        3: ['top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2', 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2', 'bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2'],
        4: ['top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2', 'top-1/4 right-1/4 translate-x-1/2 -translate-y-1/2', 'bottom-1/4 left-1/4 -translate-x-1/2 translate-y-1/2', 'bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2'],
        5: ['top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2', 'top-1/4 right-1/4 translate-x-1/2 -translate-y-1/2', 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2', 'bottom-1/4 left-1/4 -translate-x-1/2 translate-y-1/2', 'bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2'],
        6: ['top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2', 'top-1/4 right-1/4 translate-x-1/2 -translate-y-1/2', 'top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2', 'top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2', 'bottom-1/4 left-1/4 -translate-x-1/2 translate-y-1/2', 'bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2'],
    };
    return <div className="w-full h-full relative">{positions[value]?.map((pos, i) => <Dot key={i} pos={pos} />)}</div>;
};

const Dice: React.FC<DiceProps> = ({ value, isRolling, sides = 6, size = 60, onClick, disabled = false, displayText, color = 'gray' }) => {
    const [displayValue, setDisplayValue] = useState(value || 1);
    const isClickable = !disabled && !isRolling && onClick;

    useEffect(() => {
        let intervalId: number | undefined;
        if (isRolling) {
            intervalId = window.setInterval(() => { setDisplayValue(Math.floor(Math.random() * sides) + 1); }, 50);
        } else {
            setDisplayValue(value || 1);
        }
        return () => { if (intervalId) clearInterval(intervalId); };
    }, [isRolling, value, sides]);

    const colorClasses = {
        gray: 'bg-gray-100 hover:bg-white text-black',
        blue: 'bg-blue-400 hover:bg-blue-300 text-white',
        yellow: 'bg-yellow-400 hover:bg-yellow-300 text-black',
    };

    return (
        <div
            onClick={isClickable ? onClick : undefined}
            className={`flex items-center justify-center rounded-lg shadow-md transition-all duration-200 p-1
                ${isClickable ? `cursor-pointer hover:shadow-lg hover:-translate-y-1 ${colorClasses[color]}` : `${colorClasses[color]}`}
                ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
                ${isRolling ? 'animate-dice-flicker' : ''}`}
            style={{ width: size, height: size }}
        >
            {displayText ? (
                <span className="select-none font-bold" style={{ fontSize: size * 0.5 }}>{displayText}</span>
            ) : (
                <DiceFace value={displayValue} />
            )}
        </div>
    );
};

export default Dice;
