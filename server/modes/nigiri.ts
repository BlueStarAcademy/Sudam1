
import * as types from '../../types.js';
import { transitionToPlaying } from './shared.js';

export const initializeNigiri = (game: types.LiveGameSession, now: number) => {
    const p1 = game.player1;
    const p2 = game.player2;
    const holderId = Math.random() < 0.5 ? p1.id : p2.id;
    game.nigiri = {
        holderId,
        guesserId: holderId === p1.id ? p2.id : p1.id,
        stones: Math.floor(Math.random() * 20) + 1,
        guess: null,
        result: null,
    };
    game.gameStatus = 'nigiri_choosing';
    game.guessDeadline = now + 30000;
    game.nigiriStartTime = now;
};

export const updateNigiriState = (game: types.LiveGameSession, now: number) => {
    switch (game.gameStatus) {
        case 'nigiri_choosing':
            if (!game.nigiriStartTime) {
                game.nigiriStartTime = now;
            }
            if (now > (game.nigiriStartTime + 1000)) {
                game.gameStatus = 'nigiri_guessing';
            }
            break;
        case 'nigiri_guessing':
            if (game.guessDeadline && now > game.guessDeadline && game.nigiri && game.nigiri.guess === null) {
                const randomGuess = (Math.random() < 0.5 ? 1 : 2) as 1 | 2;
                game.nigiri.guess = randomGuess;
                game.nigiri.result = (game.nigiri.stones! % 2 === 0) === (randomGuess === 2) ? 'correct' : 'incorrect';
                game.gameStatus = 'nigiri_reveal';
                game.revealEndTime = now + 5000;

                const winnerId = game.nigiri.result === 'correct' ? game.nigiri.guesserId : game.nigiri.holderId;
                game.blackPlayerId = winnerId;
                game.whitePlayerId = winnerId === game.player1.id ? game.player2.id : game.player1.id;
            }
            break;
        case 'nigiri_reveal':
            if (game.revealEndTime && now > game.revealEndTime && !game.nigiri?.processed) {
                game.nigiri!.processed = true;
                transitionToPlaying(game, now);
            }
            break;
    }
};

export const handleNigiriAction = (game: types.LiveGameSession, action: types.ServerAction & { userId: string }, user: types.User): types.HandleActionResult | null => {
    const { type, payload } = action as any; // Cast to any to access payload without TS complaining before the switch
    const now = Date.now();

    if (type === 'NIGIRI_GUESS') {
        if (game.gameStatus !== 'nigiri_guessing' || !game.nigiri || user.id !== game.nigiri.guesserId) {
            return { error: "Not your turn to guess." };
        }
        game.nigiri.guess = payload.guess;
        game.nigiri.result = (game.nigiri.stones! % 2 === 0) === (payload.guess === 2) ? 'correct' : 'incorrect';
        game.gameStatus = 'nigiri_reveal';
        game.revealEndTime = now + 5000;

        const winnerId = game.nigiri.result === 'correct' ? game.nigiri.guesserId : game.nigiri.holderId;
        game.blackPlayerId = winnerId;
        game.whitePlayerId = winnerId === game.player1.id ? game.player2.id : game.player1.id;
        return {};
    }

    return null;
};
