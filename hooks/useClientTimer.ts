import { useState, useEffect } from 'react';
// FIX: Import missing types from the centralized types file.
import { LiveGameSession, Player } from '../types/index.js';

interface ClientTimerOptions {
    isPaused?: boolean;
}

export const useClientTimer = (session: LiveGameSession, options: ClientTimerOptions = {}) => {
    const coerce = (v: any) => (typeof v === 'number' && isFinite(v) && v > 0 ? v : 0);
    // 게임이 pending 상태이고 시간이 없으면 설정에서 기본값 가져오기
    const defaultTime = session.settings?.timeLimit ? session.settings.timeLimit * 60 : 0;
    const initialBlackTime = session.gameStatus === 'pending' && !session.blackTimeLeft ? defaultTime : coerce(session.blackTimeLeft);
    const initialWhiteTime = session.gameStatus === 'pending' && !session.whiteTimeLeft ? defaultTime : coerce(session.whiteTimeLeft);
    const [clientTimes, setClientTimes] = useState({ black: initialBlackTime, white: initialWhiteTime });

    useEffect(() => {
        const isGameEnded = ['ended', 'no_contest', 'scoring'].includes(session.gameStatus);
        if (isGameEnded) {
            setClientTimes({ black: coerce(session.blackTimeLeft), white: coerce(session.whiteTimeLeft) });
            return;
        }

        if (options.isPaused) {
            // Keep the current displayed times while paused
            return;
        }

        // pending 상태의 게임은 시간이 흐르지 않도록 함
        if (session.gameStatus === 'pending') {
            // pending 상태에서는 설정에서 기본값 사용
            const defaultTime = session.settings?.timeLimit ? session.settings.timeLimit * 60 : 0;
            const blackTime = session.blackTimeLeft ? coerce(session.blackTimeLeft) : defaultTime;
            const whiteTime = session.whiteTimeLeft ? coerce(session.whiteTimeLeft) : defaultTime;
            setClientTimes({ black: blackTime, white: whiteTime });
            return;
        }

        const baseDeadline = session.turnDeadline
            || session.alkkagiTurnDeadline
            || session.curlingTurnDeadline
            || session.alkkagiPlacementDeadline
            || session.turnChoiceDeadline
            || session.guessDeadline
            || session.basePlacementDeadline
            || session.captureBidDeadline
            || session.itemUseDeadline;

        if (!baseDeadline) {
            // deadline이 없으면 서버 시간 사용, 없으면 설정에서 기본값 사용
            const defaultTime = session.settings?.timeLimit ? session.settings.timeLimit * 60 : 0;
            const blackTime = session.blackTimeLeft ? coerce(session.blackTimeLeft) : defaultTime;
            const whiteTime = session.whiteTimeLeft ? coerce(session.whiteTimeLeft) : defaultTime;
            setClientTimes({ black: blackTime, white: whiteTime });
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
            const newTimeLeft = Math.max(0, (baseDeadline - Date.now()) / 1000);
            
            if (isSharedDeadlinePhase) {
                setClientTimes({ black: newTimeLeft, white: newTimeLeft });
            } else if (session.currentPlayer === Player.Black) {
                const whiteTime = session.whiteTimeLeft ? coerce(session.whiteTimeLeft) : (session.settings?.timeLimit ? session.settings.timeLimit * 60 : 0);
                setClientTimes({ black: newTimeLeft, white: whiteTime });
            } else if (session.currentPlayer === Player.White) {
                const blackTime = session.blackTimeLeft ? coerce(session.blackTimeLeft) : (session.settings?.timeLimit ? session.settings.timeLimit * 60 : 0);
                setClientTimes({ black: blackTime, white: newTimeLeft });
            } else {
                const defaultTime = session.settings?.timeLimit ? session.settings.timeLimit * 60 : 0;
                const blackTime = session.blackTimeLeft ? coerce(session.blackTimeLeft) : defaultTime;
                const whiteTime = session.whiteTimeLeft ? coerce(session.whiteTimeLeft) : defaultTime;
                setClientTimes({ black: blackTime, white: whiteTime });
            }
            animationFrameId = requestAnimationFrame(updateTimer);
        };

        animationFrameId = requestAnimationFrame(updateTimer);
        return () => cancelAnimationFrame(animationFrameId);
    }, [
        session.turnDeadline,
        session.alkkagiTurnDeadline,
        session.curlingTurnDeadline,
        session.alkkagiPlacementDeadline,
        session.turnChoiceDeadline,
        session.guessDeadline,
        session.basePlacementDeadline,
        session.captureBidDeadline,
        session.itemUseDeadline,
        session.currentPlayer,
        session.blackTimeLeft,
        session.whiteTimeLeft,
        session.gameStatus,
        session.id,
        session.settings?.timeLimit,
        options.isPaused,
    ]);

    return { clientTimes };
};
