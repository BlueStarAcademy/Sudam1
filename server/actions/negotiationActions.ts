import { randomUUID } from 'crypto';
import * as db from '../db.js';
import { type ServerAction, type User, type VolatileState, Negotiation, GameMode, UserStatus, Player } from '../../types.js';
import { SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES, STRATEGIC_ACTION_POINT_COST, PLAYFUL_ACTION_POINT_COST, DEFAULT_GAME_SETTINGS } from '../../constants.js';
import { initializeGame } from '../gameModes.js';
import { aiUserId, getAiUser } from '../aiPlayer.js';

type HandleActionResult = { 
    clientResponse?: any;
    error?: string;
};

const getActionPointCost = (mode: GameMode): number => {
    if (SPECIAL_GAME_MODES.some(m => m.mode === mode)) {
        return STRATEGIC_ACTION_POINT_COST;
    }
    if (PLAYFUL_GAME_MODES.some(m => m.mode === mode)) {
        return PLAYFUL_ACTION_POINT_COST;
    }
    return STRATEGIC_ACTION_POINT_COST; // Default to strategic cost
};

export const handleNegotiationAction = async (volatileState: VolatileState, action: ServerAction & { userId: string }, user: User): Promise<HandleActionResult> => {
    const { type, payload } = action;
    const now = Date.now();

    switch (type) {
        case 'CHALLENGE_USER': {
            const { opponentId, mode } = payload;
            const opponent = opponentId === aiUserId ? getAiUser(mode) : await db.getUser(opponentId);
        
            if (!opponent) return { error: 'Opponent not found.' };
            if (user.id === opponent.id) return { error: 'You cannot challenge yourself.' };

            // Clean up any of my own previous abandoned drafts
            const existingDraftId = Object.keys(volatileState.negotiations).find(id => {
                const neg = volatileState.negotiations[id];
                return neg.challenger.id === user.id && neg.status === 'draft';
            });
            if (existingDraftId) {
                delete volatileState.negotiations[existingDraftId];
            }
            
            // For real players, perform status checks
            if (opponentId !== aiUserId) {
                const myStatus = volatileState.userStatuses[user.id];
                const opponentStatus = volatileState.userStatuses[opponent.id];

                if (!opponentStatus) {
                    return { error: '상대방이 오프라인 상태입니다.' };
                }
                
                const canIChallenge = myStatus?.status === 'waiting';
                if (!canIChallenge) return { error: '대국 신청은 대기실에서만 가능합니다.' };
                
                const canOpponentBeChallenged = opponentStatus?.status === 'waiting' || opponentStatus?.status === 'online';
                if (!canOpponentBeChallenged) {
                    return { error: '상대방이 대국을 신청받을 수 있는 상태가 아닙니다.' };
                }

                // FIX: Only block if the opponent is in a *pending* negotiation (one they have to respond to).
                const isOpponentInPendingNegotiation = Object.values(volatileState.negotiations).some(
                    neg => (neg.opponent.id === opponent.id || neg.challenger.id === opponent.id) && neg.status === 'pending'
                );
                if (isOpponentInPendingNegotiation) {
                    return { error: '상대방은 현재 다른 대국 신청을 처리 중입니다.' };
                }

                if (opponent.actionPoints.current < getActionPointCost(mode) && !opponent.isAdmin) {
                    return { error: `상대방의 액션 포인트가 부족합니다.` };
                }
            }
            
            const cost = getActionPointCost(mode);
            if (user.actionPoints.current < cost && !user.isAdmin) {
                return { error: `액션 포인트가 부족합니다. (필요: ${cost})` };
            }
        
            const negotiationId = `neg-${randomUUID()}`;
            const newNegotiation: Negotiation = {
                id: negotiationId,
                challenger: user,
                opponent: opponent,
                mode: mode,
                settings: { ...DEFAULT_GAME_SETTINGS },
                proposerId: user.id,
                status: 'draft',
                turnCount: 0,
                deadline: now + 60000,
            };
        
            volatileState.negotiations[negotiationId] = newNegotiation;
            volatileState.userStatuses[user.id].status = 'negotiating';
            return {};
        }
        case 'SEND_CHALLENGE': {
            const { negotiationId, settings } = payload;
            const negotiation = volatileState.negotiations[negotiationId];
            if (!negotiation || negotiation.challenger.id !== user.id || negotiation.status !== 'draft') {
                return { error: 'Invalid challenge.' };
            }

            const cost = getActionPointCost(negotiation.mode);
            if (user.actionPoints.current < cost && !user.isAdmin) {
                return { error: `액션 포인트가 부족합니다. (필요: ${cost})` };
            }

            const opponent = negotiation.opponent;
            const isOpponentAlreadyInNegotiation = Object.values(volatileState.negotiations).some(
                neg => neg.id !== negotiationId &&
                       (neg.challenger.id === opponent.id || neg.opponent.id === opponent.id) &&
                       neg.status === 'pending'
            );

            if (isOpponentAlreadyInNegotiation) {
                delete volatileState.negotiations[negotiationId];
                volatileState.userStatuses[user.id].status = 'waiting';
                return { error: '상대방이 다른 대국 신청을 먼저 받았습니다. 잠시 후 다시 시도해주세요.' };
            }

            negotiation.settings = settings;
            negotiation.status = 'pending';
            negotiation.proposerId = negotiation.opponent.id;
            negotiation.turnCount = 1;
            negotiation.deadline = now + 60000;
            return {};
        }
        case 'UPDATE_NEGOTIATION': {
            const { negotiationId, settings } = payload;
            const negotiation = volatileState.negotiations[negotiationId];
            if (!negotiation || negotiation.proposerId !== user.id || negotiation.status !== 'pending') {
                return { error: 'Cannot update this negotiation now.' };
            }

            negotiation.settings = settings;
            negotiation.proposerId = negotiation.challenger.id === user.id ? negotiation.opponent.id : negotiation.challenger.id;
            negotiation.turnCount = (negotiation.turnCount || 0) + 1;
            negotiation.deadline = now + 60000;

            if (negotiation.turnCount >= 10) {
                volatileState.userStatuses[negotiation.challenger.id].status = 'waiting';
                delete volatileState.negotiations[negotiationId];
                return { error: 'Negotiation failed after too many turns.' };
            }
            return {};
        }
        case 'ACCEPT_NEGOTIATION': {
            const { negotiationId, settings } = payload;
            const negotiation = volatileState.negotiations[negotiationId];
            if (!negotiation || negotiation.proposerId !== user.id || negotiation.status !== 'pending') {
                return { error: 'Cannot accept this negotiation now.' };
            }
            
            const challenger = await db.getUser(negotiation.challenger.id);
            const opponent = await db.getUser(negotiation.opponent.id);
            if (!challenger || !opponent) return { error: "One of the players could not be found." };

            const cost = getActionPointCost(negotiation.mode);
            if ((challenger.actionPoints.current < cost && !challenger.isAdmin) || (opponent.actionPoints.current < cost && !opponent.isAdmin)) {
                volatileState.userStatuses[challenger.id].status = 'waiting';
                delete volatileState.negotiations[negotiationId];
                return { error: 'One of the players does not have enough action points.' };
            }

            if (!challenger.isAdmin) {
                challenger.actionPoints.current -= cost;
                challenger.lastActionPointUpdate = now;
            }
            if (!opponent.isAdmin) {
                opponent.actionPoints.current -= cost;
                opponent.lastActionPointUpdate = now;
            }

            await db.updateUser(challenger);
            await db.updateUser(opponent);

            negotiation.settings = settings;
            const game = await initializeGame(negotiation);
            await db.saveGame(game);
            
            volatileState.userStatuses[game.player1.id] = { status: 'in-game', mode: game.mode, gameId: game.id };
            volatileState.userStatuses[game.player2.id] = { status: 'in-game', mode: game.mode, gameId: game.id };
            
            if (negotiation.rematchOfGameId) {
                const originalGame = await db.getLiveGame(negotiation.rematchOfGameId);
                if (originalGame && originalGame.gameStatus === 'rematch_pending') {
                    originalGame.gameStatus = 'ended';
                    await db.saveGame(originalGame);
                }
            }
            
            const playerIdsInGame = new Set([game.player1.id, game.player2.id]);
            Object.values(volatileState.negotiations).forEach(negToCancel => {
                if (negToCancel.id !== negotiationId && (playerIdsInGame.has(negToCancel.challenger.id) || playerIdsInGame.has(negToCancel.opponent.id))) {
                    const challengerId = negToCancel.challenger.id;
                    if (volatileState.userStatuses[challengerId]?.status === 'negotiating') {
                        volatileState.userStatuses[challengerId].status = 'waiting';
                    }
                    delete volatileState.negotiations[negToCancel.id];
                }
            });

            delete volatileState.negotiations[negotiationId];
            return {};
        }
        case 'DECLINE_NEGOTIATION': {
            const { negotiationId } = payload;
            const negotiation = volatileState.negotiations[negotiationId];
            if (!negotiation) return {};
            if (negotiation.challenger.id !== user.id && negotiation.opponent.id !== user.id) {
                return { error: 'You are not part of this negotiation.' };
            }
        
            const { challenger, opponent, rematchOfGameId, mode } = negotiation;
        
            if (rematchOfGameId) {
                const originalGame = await db.getLiveGame(rematchOfGameId);
                if (originalGame?.gameStatus === 'rematch_pending') {
                    originalGame.gameStatus = 'ended';
                    await db.saveGame(originalGame);
                }
                [challenger.id, opponent.id].forEach(id => {
                    const status = volatileState.userStatuses[id];
                    if (status) {
                        status.status = 'in-game';
                        status.gameId = rematchOfGameId;
                    }
                });
            } else {
                const challengerStatus = volatileState.userStatuses[challenger.id];
                if (challengerStatus?.status === 'negotiating') {
                    challengerStatus.status = 'waiting';
                    challengerStatus.mode = mode;
                    challengerStatus.gameId = undefined;
                }
            }
        
            delete volatileState.negotiations[negotiationId];
            return {};
        }
        case 'START_AI_GAME': {
            const { mode, settings } = payload;
            const cost = getActionPointCost(mode);
            if (user.actionPoints.current < cost && !user.isAdmin) {
                return { error: `액션 포인트가 부족합니다. (필요: ${cost})` };
            }
            if (!user.isAdmin) {
                user.actionPoints.current -= cost;
                user.lastActionPointUpdate = now;
            }
        
            const negotiation: Negotiation = {
                id: `neg-ai-${randomUUID()}`,
                challenger: user,
                opponent: getAiUser(mode),
                mode, settings,
                proposerId: user.id,
                status: 'pending', deadline: 0,
            };
        
            const game = await initializeGame(negotiation);
            await db.saveGame(game);
            
            volatileState.userStatuses[game.player1.id] = { status: 'in-game', mode: game.mode, gameId: game.id };
            
            const draftNegId = Object.keys(volatileState.negotiations).find(id => {
                const neg = volatileState.negotiations[id];
                return neg.challenger.id === user.id && neg.opponent.id === aiUserId && neg.status === 'draft';
            });
            if (draftNegId) delete volatileState.negotiations[draftNegId];
            
            await db.updateUser(user);
            return {};
        }
        case 'REQUEST_REMATCH': {
            const { opponentId, originalGameId } = payload;
            const opponent = await db.getUser(opponentId);
            if (!opponent) return { error: 'Opponent not found.' };
        
            const originalGame = await db.getLiveGame(originalGameId);
            if (!originalGame || !['ended', 'no_contest', 'rematch_pending'].includes(originalGame.gameStatus)) {
                return { error: 'Cannot request a rematch for this game.' };
            }
        
            if (Object.values(volatileState.negotiations).some(n => n.rematchOfGameId === originalGameId)) {
                return { error: 'A rematch has already been requested.' };
            }
        
            originalGame.gameStatus = 'rematch_pending';
            await db.saveGame(originalGame);
        
            const negotiationId = `neg-${randomUUID()}`;
            const newNegotiation: Negotiation = {
                id: negotiationId,
                challenger: user,
                opponent: opponent,
                mode: originalGame.mode,
                settings: originalGame.settings,
                proposerId: user.id,
                status: 'draft',
                turnCount: 0,
                deadline: now + 60000,
                rematchOfGameId: originalGameId,
            };
        
            volatileState.negotiations[negotiationId] = newNegotiation;
        
            if (volatileState.userStatuses[user.id]) {
                volatileState.userStatuses[user.id].status = 'negotiating';
                volatileState.userStatuses[user.id].gameId = originalGameId;
            }
            if (volatileState.userStatuses[opponent.id]) {
                volatileState.userStatuses[opponent.id].status = 'negotiating';
                volatileState.userStatuses[opponent.id].gameId = originalGameId;
            }
        
            return {};
        }
        default:
            return { error: 'Unknown negotiation action.' };
    }
};