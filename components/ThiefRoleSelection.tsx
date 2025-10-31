
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LiveGameSession, User, ServerAction } from '../types.js';
import Button from './Button.js';
import DraggableWindow from './DraggableWindow.js';

interface ThiefRoleSelectionProps {
    session: LiveGameSession;
    currentUser: User;
    onAction: (action: ServerAction) => void;
}

const ThiefRoleSelection: React.FC<ThiefRoleSelectionProps> = (props) => {
    const { session, currentUser } = props;
    const { player1, player2, roleChoices } = session;
    const [localChoice, setLocalChoice] = useState<'thief' | 'police' | null>(null);
    const [countdown, setCountdown] = useState(10);

    const latestProps = useRef(props);
    useEffect(() => {
        latestProps.current = props;
    });

    const myId = currentUser.id;
    const opponent = myId === player1.id ? player2 : player1;

    const myRoleChoice = roleChoices?.[myId];

    const handleChoice = useCallback((choice: 'thief' | 'police') => {
        const { session: currentSession, onAction: currentOnAction, currentUser: user } = latestProps.current;
        const myCurrentRoleChoice = currentSession.roleChoices?.[user.id];

        if (myCurrentRoleChoice) return;
        setLocalChoice(choice);
        currentOnAction({ type: 'THIEF_UPDATE_ROLE_CHOICE', payload: { gameId: currentSession.id, choice } });
    }, []);

    useEffect(() => {
        if (myRoleChoice || localChoice) return;

        const timerId = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timerId);
                    // Server handles timeout, no client action needed
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerId);
    }, [myRoleChoice, localChoice, handleChoice]);


    const renderContent = () => {
        if (myRoleChoice || localChoice) {
            return (
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">선택 완료!</h2>
                    <p className="text-gray-300 mb-6 animate-pulse">{opponent.nickname}님의 선택을 기다리고 있습니다...</p>
                    <div className="flex justify-center items-center h-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-100"></div>
                    </div>
                </div>
            );
        }

        return (
            <div className="text-center">
                <p className="text-gray-300 mb-6">원하는 역할을 선택하세요. 역할이 겹치면 가위바위보로 결정됩니다.</p>
                 <div className="my-4 text-center">
                    <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2 overflow-hidden">
                        <div className="bg-yellow-400 h-2.5 rounded-full" style={{ width: `${countdown * 10}%`, transition: 'width 1s linear' }}></div>
                    </div>
                    <div className="text-5xl font-mono text-yellow-300">{countdown}</div>
                </div>
                <div className="flex gap-4 mt-4">
                    <Button
                        onClick={() => handleChoice('thief')}
                        colorScheme="yellow"
                        className="w-full py-4 text-lg"
                    >
                        🏃 도둑
                    </Button>
                    <Button
                        onClick={() => handleChoice('police')}
                        colorScheme="blue"
                        className="w-full py-4 text-lg"
                    >
                        🚓 경찰
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <DraggableWindow title="역할 선택" windowId="thief-role-selection">
            {renderContent()}
        </DraggableWindow>
    );
};

export default ThiefRoleSelection;