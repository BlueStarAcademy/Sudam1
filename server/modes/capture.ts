import * as types from '../../types.js';
// FIX: Changed import path to avoid circular dependency
import { transitionToPlaying } from './shared.js';
import * as summaryService from '../summaryService.js';

export const initializeCapture = (game: types.LiveGameSession, now: number) => {
    const p1Id = game.player1.id;
    const p2Id = game.player2.id;
    game.gameStatus = 'capture_bidding';
    game.bids = { [p1Id]: null, [p2Id]: null };
    game.biddingRound = 1;
    game.captureBidDeadline = now + 30000;
};

export const updateCaptureState = (game: types.LiveGameSession, now: number) => {
    const p1Id = game.player1.id;
    const p2Id = game.player2.id;
    
    switch (game.gameStatus) {
        case 'capture_bidding': {
            const bothHaveBid = game.bids?.[p1Id] != null && game.bids?.[p2Id] != null;
            const deadlinePassedBid = game.captureBidDeadline && now > game.captureBidDeadline;

            if (bothHaveBid || deadlinePassedBid) {
                if (deadlinePassedBid) {
                    if (game.bids![p1Id] == null) game.bids![p1Id] = 1;
                    if (game.bids![p2Id] == null) game.bids![p2Id] = 1;
                }

                const p1Bid = game.bids![p1Id]!;
                const p2Bid = game.bids![p2Id]!;
                const baseTarget = game.settings.captureTarget || 20;

                if (p1Bid !== p2Bid) {
                    const winnerId = p1Bid > p2Bid ? p1Id : p2Id;
                    const loserId = winnerId === p1Id ? p2Id : p1Id;
                    const winnerBid = Math.max(p1Bid, p2Bid);
                    
                    game.blackPlayerId = winnerId;
                    game.whitePlayerId = loserId;
                    
                    game.effectiveCaptureTargets = {
                        [types.Player.None]: 0,
                        [types.Player.Black]: baseTarget + winnerBid,
                        [types.Player.White]: baseTarget,
                    };
                    
                    game.gameStatus = 'capture_reveal';
                    game.revealEndTime = now + 10000;
                } else { // Tie
                    if (game.biddingRound === 1) {
                        game.gameStatus = 'capture_reveal';
                        game.revealEndTime = now + 3000;
                    } else {
                        const winnerId = Math.random() < 0.5 ? p1Id : p2Id;
                        const loserId = winnerId === p1Id ? p2Id : p1Id;

                        game.blackPlayerId = winnerId;
                        game.whitePlayerId = loserId;

                        game.effectiveCaptureTargets = {
                            [types.Player.None]: 0,
                            [types.Player.Black]: baseTarget + p1Bid,
                            [types.Player.White]: baseTarget,
                        };

                        game.gameStatus = 'capture_tiebreaker';
                        game.revealEndTime = now + 3000;
                    }
                }
            }
            break;
        }
        case 'capture_reveal':
        case 'capture_tiebreaker': {
            const bothConfirmedCapture = game.preGameConfirmations?.[p1Id] && game.preGameConfirmations?.[p2Id];
            if (game.revealEndTime && (now > game.revealEndTime || bothConfirmedCapture)) {
                
                const p1Bid = game.bids?.[p1Id];
                const p2Bid = game.bids?.[p2Id];
                if (game.biddingRound === 1 && p1Bid === p2Bid) { // This is the condition for re-bidding.
                    game.biddingRound = 2;
                    game.bids = { [p1Id]: null, [p2Id]: null };
                    game.captureBidDeadline = now + 30000;
                    game.gameStatus = 'capture_bidding';
                    game.preGameConfirmations = {};
                    game.revealEndTime = undefined;
                    return;
                }
                
                transitionToPlaying(game, now);
                game.bids = undefined; 
                game.biddingRound = undefined;
            }
            break;
        }
        case 'playing': {
            if (game.turnDeadline && now > game.turnDeadline) {
                const timedOutPlayer = game.currentPlayer;
                const timeKey = timedOutPlayer === types.Player.Black ? 'blackTimeLeft' : 'whiteTimeLeft';
                const byoyomiKey = timedOutPlayer === types.Player.Black ? 'blackByoyomiPeriodsLeft' : 'whiteByoyomiPeriodsLeft';

                if (game[timeKey] > 0) { // Main time expired
                    game[timeKey] = 0;
                    if (game.settings.byoyomiCount > 0 && game[byoyomiKey] > 0) {
                        game[byoyomiKey]--;
                        game.turnDeadline = now + game.settings.byoyomiTime * 1000;
                        game.turnStartTime = now;
                        return;
                    }
                } else { // Byoyomi expired
                    if (game[byoyomiKey] > 0) {
                        game[byoyomiKey]--;
                        game.turnDeadline = now + game.settings.byoyomiTime * 1000;
                        game.turnStartTime = now;
                        return;
                    }
                }
                
                // No time or byoyomi left
                const winner = timedOutPlayer === types.Player.Black ? types.Player.White : types.Player.Black;
                game.lastTimeoutPlayerId = game.currentPlayer === types.Player.Black ? game.blackPlayerId : game.whitePlayerId;
                game.lastTimeoutPlayerIdClearTime = now + 5000;
                
                summaryService.endGame(game, winner, 'timeout');
            }
            break;
        }
    }
};

export const handleCaptureAction = (game: types.LiveGameSession, action: types.ServerAction & { userId: string }, user: types.User): types.HandleActionResult | null => {
    const { type, payload } = action;

    switch (type) {
        case 'UPDATE_CAPTURE_BID':
            if (game.gameStatus !== 'capture_bidding' || game.bids?.[user.id]) return { error: "Cannot bid now." };
            if (!game.bids) game.bids = {};
            game.bids[user.id] = payload.bid;
            return {};
        case 'CONFIRM_CAPTURE_REVEAL':
            if (!['capture_reveal', 'capture_tiebreaker'].includes(game.gameStatus)) return { error: "Not in confirmation phase." };
            if (!game.preGameConfirmations) game.preGameConfirmations = {};
            game.preGameConfirmations[user.id] = true;
            return {};
    }
    return null;
};