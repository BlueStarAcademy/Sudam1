import * as summaryService from '../summaryService.js';
import { UserStatus } from '../../types.js';
import * as db from '../db.js';
import { randomUUID } from 'crypto';
import { PLAYFUL_MODE_FOUL_LIMIT } from '../../constants';
import { aiUserId } from '../aiPlayer.js';
import { updateQuestProgress } from '../questService.js';
import * as types from '../../types.js';
// FIX: Corrected the type definition for `rpsStatusMap`. `Partial` takes one type argument, and the original code provided two. This also fixes a typo with an extra '>' and resolves subsequent parsing errors on the following lines.
const rpsStatusMap = {
    [types.GameMode.Alkkagi]: 'alkkagi_rps',
    [types.GameMode.Curling]: 'curling_rps',
    [types.GameMode.Omok]: 'omok_rps',
    [types.GameMode.Ttamok]: 'ttamok_rps',
    [types.GameMode.Thief]: 'thief_rps',
};
export const transitionToPlaying = (game, now) => {
    game.gameStatus = 'playing';
    game.currentPlayer = types.Player.Black;
    game.turnStartTime = now;
    if (game.settings.timeLimit > 0) {
        game.turnDeadline = now + game.blackTimeLeft * 1000;
    }
    else {
        game.turnDeadline = undefined;
    }
    game.revealEndTime = undefined;
    game.preGameConfirmations = {};
};
const transitionFromTurnPreference = (game, p1Choice, p2Choice, now) => {
    const p1Id = game.player1.id;
    const p2Id = game.player2.id;
    if (p1Choice !== p2Choice) { // No tie
        const p1IsBlack = p1Choice === 'first';
        game.blackPlayerId = p1IsBlack ? p1Id : p2Id;
        game.whitePlayerId = p1IsBlack ? p2Id : p1Id;
        if (game.mode === types.GameMode.Alkkagi) {
            game.gameStatus = 'alkkagi_start_confirmation';
            game.revealEndTime = now + 30000;
            game.preGameConfirmations = { [p1Id]: false, [p2Id]: false };
            if (game.isAiGame)
                game.preGameConfirmations[aiUserId] = true;
        }
        else if (game.mode === types.GameMode.Curling) {
            game.gameStatus = 'curling_start_confirmation';
            game.revealEndTime = now + 30000;
            game.preGameConfirmations = { [p1Id]: false, [p2Id]: false };
            if (game.isAiGame)
                game.preGameConfirmations[aiUserId] = true;
        }
        else { // Omok, Ttamok - direct start
            transitionToPlaying(game, now);
        }
        game.turnChoices = undefined;
    }
    else { // Tie, proceed to RPS tiebreaker
        const rpsStatus = rpsStatusMap[game.mode];
        if (rpsStatus) {
            game.gameStatus = rpsStatus;
            game.rpsState = { [p1Id]: null, [p2Id]: null };
            game.rpsRound = 1;
            game.turnDeadline = now + 30000;
        }
    }
    game.turnChoiceDeadline = undefined;
};
export const updateSharedGameState = (game, now) => {
    const p1Id = game.player1.id;
    const p2Id = game.player2.id;
    if (game.gameStatus === 'turn_preference_selection') {
        const p1Choice = game.turnChoices?.[p1Id];
        const p2Choice = game.turnChoices?.[p2Id];
        const deadlinePassed = game.turnChoiceDeadline && now > game.turnChoiceDeadline;
        if ((p1Choice && p2Choice) || deadlinePassed) {
            let finalP1Choice = p1Choice;
            let finalP2Choice = p2Choice;
            const choices = ['first', 'second'];
            if (deadlinePassed) {
                if (!game.turnChoices)
                    game.turnChoices = {};
                if (!finalP1Choice)
                    finalP1Choice = choices[Math.floor(Math.random() * 2)];
                if (!finalP2Choice)
                    finalP2Choice = choices[Math.floor(Math.random() * 2)];
            }
            if (finalP1Choice && finalP2Choice) {
                transitionFromTurnPreference(game, finalP1Choice, finalP2Choice, now);
                return true;
            }
        }
    }
    const rpsRevealStatus = game.gameStatus.endsWith('_rps_reveal');
    if (rpsRevealStatus && game.revealEndTime && now > game.revealEndTime) {
        const p1Choice = game.rpsState?.[p1Id];
        const p2Choice = game.rpsState?.[p2Id];
        if (p1Choice && p2Choice) {
            let winnerId;
            const p1Wins = (p1Choice === 'rock' && p2Choice === 'scissors') || (p1Choice === 'scissors' && p2Choice === 'paper') || (p1Choice === 'paper' && p2Choice === 'rock');
            if (p1Choice === p2Choice) { // Draw
                if ((game.rpsRound || 1) < 3) {
                    game.rpsRound = (game.rpsRound || 1) + 1;
                    game.gameStatus = game.gameStatus.replace('_reveal', '');
                    game.rpsState = { [p1Id]: null, [p2Id]: null };
                    game.turnDeadline = now + 30000;
                    return true;
                }
                else { // Final draw, random winner
                    winnerId = Math.random() < 0.5 ? p1Id : p2Id;
                }
            }
            else { // Clear winner
                winnerId = p1Wins ? p1Id : p2Id;
            }
            if (game.turnChoices) {
                const loserId = winnerId === p1Id ? p2Id : p1Id;
                const winnerChoice = game.turnChoices[winnerId];
                const winnerIsBlack = winnerChoice === 'first';
                game.blackPlayerId = winnerIsBlack ? winnerId : loserId;
                game.whitePlayerId = winnerIsBlack ? loserId : winnerId;
                game.turnChoices[loserId] = winnerChoice === 'first' ? 'second' : 'first';
            }
            if (game.mode === types.GameMode.Alkkagi) {
                game.gameStatus = 'alkkagi_start_confirmation';
                game.revealEndTime = now + 30000;
                game.preGameConfirmations = { [p1Id]: false, [p2Id]: false };
                if (game.isAiGame)
                    game.preGameConfirmations[aiUserId] = true;
            }
            else if (game.mode === types.GameMode.Curling) {
                game.gameStatus = 'curling_start_confirmation';
                game.revealEndTime = now + 30000;
                game.preGameConfirmations = { [p1Id]: false, [p2Id]: false };
                if (game.isAiGame)
                    game.preGameConfirmations[aiUserId] = true;
            }
            else if (game.mode === types.GameMode.Thief) {
                const loserId = winnerId === p1Id ? p2Id : p1Id;
                const winnerChoice = game.roleChoices[winnerId];
                if (winnerChoice === 'thief') {
                    game.thiefPlayerId = winnerId;
                    game.policePlayerId = loserId;
                }
                else {
                    game.policePlayerId = winnerId;
                    game.thiefPlayerId = loserId;
                }
                game.blackPlayerId = game.thiefPlayerId;
                game.whitePlayerId = game.policePlayerId;
                game.gameStatus = 'thief_role_confirmed';
                game.revealEndTime = now + 10000;
                if (game.isAiGame)
                    game.preGameConfirmations = { [aiUserId]: true };
            }
            else { // Omok, Ttamok
                transitionToPlaying(game, now);
            }
            return true;
        }
    }
    else if (game.gameStatus.endsWith('_rps')) {
        const p1RpsChoice = game.rpsState?.[p1Id];
        const p2RpsChoice = game.rpsState?.[p2Id];
        const bothRpsChosen = p1RpsChoice && p2RpsChoice;
        const deadlinePassedRps = game.turnDeadline && now > game.turnDeadline;
        if (bothRpsChosen || deadlinePassedRps) {
            if (deadlinePassedRps) {
                const choices = ['rock', 'paper', 'scissors'];
                if (!p1RpsChoice)
                    game.rpsState[p1Id] = choices[Math.floor(Math.random() * 3)];
                if (!p2RpsChoice)
                    game.rpsState[p2Id] = choices[Math.floor(Math.random() * 3)];
            }
            game.gameStatus = game.gameStatus.replace('_rps', '_rps_reveal');
            game.revealEndTime = now + 4000;
            game.turnDeadline = undefined;
            return true;
        }
    }
    return false;
};
export const handleSharedAction = async (volatileState, game, action, user) => {
    const { type, payload } = action;
    const myPlayerEnum = user.id === game.blackPlayerId ? types.Player.Black : (user.id === game.whitePlayerId ? types.Player.White : types.Player.None);
    const now = Date.now();
    switch (type) {
        case 'USE_ACTION_BUTTON': {
            if (game.gameStatus === 'ended' || game.gameStatus === 'no_contest') {
                return { error: 'Game has already ended.' };
            }
            const myButtons = game.currentActionButtons?.[user.id];
            const button = myButtons?.find(b => b.name === payload.buttonName);
            if (!button)
                return { error: 'Invalid action button.' };
            if (game.actionButtonUsedThisCycle?.[user.id])
                return { error: 'Action button already used this cycle.' };
            if ((game.actionButtonUses?.[user.id] ?? 0) >= (game.maxActionButtonUses ?? 5)) {
                return { error: `You have used all your action buttons for this game (${game.maxActionButtonUses ?? 5}).` };
            }
            const getRandomInt = (min, max) => {
                return Math.floor(Math.random() * (max - min + 1)) + min;
            };
            const scoreChange = button.type === 'manner'
                ? getRandomInt(1, 5)
                : getRandomInt(-7, -1);
            const message = {
                id: `msg-${randomUUID()}`,
                user: { id: user.id, nickname: user.nickname },
                system: true,
                timestamp: now,
                actionInfo: {
                    message: button.message,
                    scoreChange: scoreChange
                },
            };
            if (!volatileState.gameChats[game.id])
                volatileState.gameChats[game.id] = [];
            volatileState.gameChats[game.id].push(message);
            user.mannerScore = Math.max(0, user.mannerScore + scoreChange);
            if (!game.actionButtonUses)
                game.actionButtonUses = {};
            game.actionButtonUses[user.id] = (game.actionButtonUses[user.id] ?? 0) + 1;
            if (!game.actionButtonUsedThisCycle)
                game.actionButtonUsedThisCycle = {};
            game.actionButtonUsedThisCycle[user.id] = true;
            updateQuestProgress(user, 'action_button');
            await db.updateUser(user);
            await db.saveGame(game);
            return {};
        }
        case 'CHOOSE_TURN_PREFERENCE': {
            const { choice } = payload;
            if (game.gameStatus !== 'turn_preference_selection' || !game.turnChoices || typeof game.turnChoices[user.id] === 'string') {
                return { error: 'Cannot choose turn now.' };
            }
            game.turnChoices[user.id] = choice;
            const p1Id = game.player1.id;
            const p2Id = game.player2.id;
            const p1Choice = game.turnChoices[p1Id];
            const p2Choice = game.turnChoices[p2Id];
            if (p1Choice && p2Choice) {
                transitionFromTurnPreference(game, p1Choice, p2Choice, now);
            }
            return {};
        }
        case 'SUBMIT_RPS_CHOICE': {
            const { choice } = payload;
            if (!game.rpsState || typeof game.rpsState[user.id] === 'string') {
                return { error: 'Cannot make RPS choice now.' };
            }
            game.rpsState[user.id] = choice;
            return {};
        }
        case 'RESIGN_GAME': {
            if (game.gameStatus === 'ended' || game.gameStatus === 'no_contest') {
                return { error: 'Game has already ended.' };
            }
            // In 2-player games, if one player resigns, the other wins.
            const winner = myPlayerEnum === types.Player.Black ? types.Player.White : types.Player.Black;
            await summaryService.endGame(game, winner, 'resign');
            if (payload?.andLeave) {
                if (volatileState.userStatuses[user.id]) {
                    volatileState.userStatuses[user.id] = { status: UserStatus.Waiting, mode: game.mode };
                }
            }
            return {};
        }
        default:
            return null; // Action was not a shared one
    }
};
export const handleTimeoutFoul = (game, timedOutPlayerId, now) => {
    if (!game.timeoutFouls)
        game.timeoutFouls = {};
    game.timeoutFouls[timedOutPlayerId] = (game.timeoutFouls[timedOutPlayerId] || 0) + 1;
    const foulPlayer = game.player1.id === timedOutPlayerId ? game.player1 : game.player2;
    game.foulInfo = { message: `${foulPlayer.nickname}님의 타임오버 파울!`, expiry: now + 4000 };
    if (game.timeoutFouls[timedOutPlayerId] >= PLAYFUL_MODE_FOUL_LIMIT) {
        const winnerId = game.player1.id === timedOutPlayerId ? game.player2.id : game.player1.id;
        const winnerEnum = winnerId === game.blackPlayerId ? types.Player.Black : types.Player.White;
        summaryService.endGame(game, winnerEnum, 'foul_limit');
        return true; // Game ended
    }
    return false; // Game continues
};
