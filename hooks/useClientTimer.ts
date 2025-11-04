import { useState, useEffect } from 'react';
// FIX: Import missing types from the centralized types file.
import { LiveGameSession, Player } from '../types/index.js';

export const useClientTimer = (session: LiveGameSession) => {
    const [clientTimes, setClientTimes] = useState({ black: session.blackTimeLeft, white: session.whiteTimeLeft });

    useEffect(() => {
        const isGameEnded = ['ended', 'no_contest', 'scoring'].includes(session.gameStatus);
        if (isGameEnded) {
            setClientTimes({ black: session.blackTimeLeft, white: session.whiteTimeLeft });
            return;
        }

        const deadline = session.turnDeadline || session.alkkagiTurnDeadline || session.curlingTurnDeadline || session.alkkagiPlacementDeadline || session.turnChoiceDeadline || session.guessDeadline || session.basePlacementDeadline || session.captureBidDeadline || session.itemUseDeadline;

        if (!deadline) {
            setClientTimes({ black: session.blackTimeLeft, white: session.whiteTimeLeft });
            return;
        }
        
        const isSharedDeadlinePhase = [
            'base_placement',
            'komi_bidding',
            'capture_bidding',
            'alkkagi_simultaneous_placement'
        ].includes(session.gameStatus);
        
        let animationFrameId: number;

        const updateTimer = () => {
            const newTimeLeft = Math.max(0, (deadline - Date.now()) / 1000);
            
            if (isSharedDeadlinePhase) {
                setClientTimes({ black: newTimeLeft, white: newTimeLeft });
            } else if (session.currentPlayer === Player.Black) {
                setClientTimes({ black: newTimeLeft, white: session.whiteTimeLeft });
            } else if (session.currentPlayer === Player.White) {
                setClientTimes({ black: session.blackTimeLeft, white: newTimeLeft });
            } else {
                setClientTimes({ black: session.blackTimeLeft, white: session.whiteTimeLeft });
            }
            animationFrameId = requestAnimationFrame(updateTimer);
        };
        
        animationFrameId = requestAnimationFrame(updateTimer);
        return () => cancelAnimationFrame(animationFrameId);
    }, [session.turnDeadline, session.alkkagiTurnDeadline, session.curlingTurnDeadline, session.alkkagiPlacementDeadline, session.turnChoiceDeadline, session.guessDeadline, session.basePlacementDeadline, session.captureBidDeadline, session.itemUseDeadline, session.currentPlayer, session.blackTimeLeft, session.whiteTimeLeft, session.gameStatus]);

    return { clientTimes };
};
