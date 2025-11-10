

import * as types from '../../types.js';
import { getGoLogic } from '../goLogic.js';
// FIX: Changed import path to avoid circular dependency
import { transitionToPlaying } from './shared.js';
import { aiUserId } from '../aiPlayer.js';

export const initializeBase = (game: types.LiveGameSession, now: number) => {
    game.gameStatus = 'base_placement';
    game.basePlacementDeadline = now + 30000;
    game.baseStones_p1 = [];
    game.baseStones_p2 = [];
    game.settings.komi = 0.5; // Base komi for bidding
};

const placeRemainingStonesRandomly = (game: types.LiveGameSession, playerKey: 'baseStones_p1' | 'baseStones_p2') => {
    const target = game.settings.baseStones ?? 4;
    
    if (!game[playerKey]) {
        game[playerKey] = [];
    }
    const stonesToPlace = target - game[playerKey]!.length;

    if (stonesToPlace <= 0) {
        return;
    }

    const occupied = new Set<string>();
    (game.baseStones_p1 ?? []).forEach(p => occupied.add(`${p.x},${p.y}`));
    (game.baseStones_p2 ?? []).forEach(p => occupied.add(`${p.x},${p.y}`));
    
    const { boardSize } = game.settings;

    for (let i = 0; i < stonesToPlace; i++) {
        let x: number, y: number, key: string;
        let attempts = 0;
        const maxAttempts = boardSize * boardSize * 2;
        
        do {
            x = Math.floor(Math.random() * boardSize);
            y = Math.floor(Math.random() * boardSize);
            key = `${x},${y}`;
            attempts++;
            if (attempts > maxAttempts) {
                console.warn(`[BaseGo] Could not find a random spot after ${maxAttempts} attempts. Stopping placement.`);
                return;
            }
        } while (occupied.has(key));
        
        game[playerKey]!.push({ x, y });
        occupied.add(key);
    }
};

const resolveBasePlacementAndTransition = (game: types.LiveGameSession, now: number) => {
    const target = game.settings.baseStones ?? 4;

    // Place remaining stones for any player who hasn't finished
    if ((game.baseStones_p1?.length ?? 0) < target) {
        placeRemainingStonesRandomly(game, 'baseStones_p1');
    }
    if ((game.baseStones_p2?.length ?? 0) < target) {
        placeRemainingStonesRandomly(game, 'baseStones_p2');
    }

    const { boardSize } = game.settings;
    const p1Stones = [...(game.baseStones_p1 || [])];
    const p2Stones = [...(game.baseStones_p2 || [])];
    const coordMap = new Map<string, { player: 'p1' | 'p2', point: types.Point }[]>();
    p1Stones.forEach(p => {
        const key = `${p.x},${p.y}`;
        if (!coordMap.has(key)) coordMap.set(key, []);
        coordMap.get(key)!.push({ player: 'p1', point: p });
    });
    p2Stones.forEach(p => {
        const key = `${p.x},${p.y}`;
        if (!coordMap.has(key)) coordMap.set(key, []);
        coordMap.get(key)!.push({ player: 'p2', point: p });
    });
    const overlappingCoords = new Set<string>();
    for (const [key, stones] of coordMap.entries()) {
        if (stones.length > 1) {
            overlappingCoords.add(key);
        }
    }
    let validP1Stones = p1Stones.filter(p => !overlappingCoords.has(`${p.x},${p.y}`));
    let validP2Stones = p2Stones.filter(p => !overlappingCoords.has(`${p.x},${p.y}`));
    if (validP1Stones.length > 0 || validP2Stones.length > 0) {
        const tempBoard: types.BoardState = Array(boardSize).fill(0).map(() => Array(boardSize).fill(types.Player.None));
        validP1Stones.forEach(p => tempBoard[p.y][p.x] = types.Player.Black);
        validP2Stones.forEach(p => tempBoard[p.y][p.x] = types.Player.White);
        const tempGame = { boardState: tempBoard, settings: { boardSize } } as types.LiveGameSession;
        const logic = getGoLogic(tempGame);
        const stonesToRemove = new Set<string>();
        const allStones = [
            ...validP1Stones.map(p => ({ ...p, player: types.Player.Black })),
            ...validP2Stones.map(p => ({ ...p, player: types.Player.White }))
        ];
        for (const stone of allStones) {
            const group = logic.findGroup(stone.x, stone.y, stone.player, tempBoard);
            if (group && group.liberties === 0) {
                group.stones.forEach(s => stonesToRemove.add(`${s.x},${s.y}`));
            }
        }
        if (stonesToRemove.size > 0) {
            validP1Stones = validP1Stones.filter(p => !stonesToRemove.has(`${p.x},${p.y}`));
            validP2Stones = validP2Stones.filter(p => !stonesToRemove.has(`${p.x},${p.y}`));
        }
    }
    
    game.baseStones_p1 = validP1Stones;
    game.baseStones_p2 = validP2Stones;

    game.gameStatus = 'komi_bidding';
    game.komiBiddingDeadline = now + 30000;
    game.komiBids = { [game.player1.id]: null, [game.player2.id]: null };
    game.komiBiddingRound = 1;
    game.basePlacementDeadline = undefined;
};


export const updateBaseState = (game: types.LiveGameSession, now: number) => {
    const p1Id = game.player1.id;
    const p2Id = game.player2.id;
    
    switch (game.gameStatus) {
        case 'base_placement': {
            const p1StonesCount = game.baseStones_p1?.length ?? 0;
            const p2StonesCount = game.baseStones_p2?.length ?? 0;
            const target = game.settings.baseStones ?? 4;
            const bothDonePlacing = p1StonesCount >= target && p2StonesCount >= target;
            const deadlinePassed = game.basePlacementDeadline && now > game.basePlacementDeadline;

            if (bothDonePlacing || deadlinePassed) {
                resolveBasePlacementAndTransition(game, now);
            }
            break;
        }
        case 'komi_bidding': {
            const p1Id = game.player1.id;
            const p2Id = game.player2.id;
            const bothHaveBid = game.komiBids?.[p1Id] != null && game.komiBids?.[p2Id] != null;
            const deadlinePassed = game.komiBiddingDeadline && now > game.komiBiddingDeadline;
        
            if (bothHaveBid || deadlinePassed) {
                if (deadlinePassed) {
                    // A non-competitive bid as a penalty for timeout.
                    // This bid will lose to any player who also wants Black (by bidding a higher komi),
                    // and will give White to any player who wants it. This is a safe "pass".
                    const timeoutBid = { color: types.Player.Black, komi: 0 };
                    if (!game.komiBids![p1Id]) game.komiBids![p1Id] = timeoutBid;
                    if (!game.komiBids![p2Id]) game.komiBids![p2Id] = timeoutBid;
                }
                game.gameStatus = 'komi_bid_reveal';
                game.revealEndTime = now + 4000;
            }
            break;
        }
        case 'komi_bid_reveal':
             if (game.revealEndTime && now > game.revealEndTime && !game.komiBidRevealProcessed) {
                game.komiBidRevealProcessed = true;
                const p1 = game.player1;
                const p2 = game.player2;
                const p1Bid = game.komiBids![p1.id]!;
                const p2Bid = game.komiBids![p2.id]!;
                const baseKomi = game.settings.komi;
                let blackPlayerId: string | undefined, whitePlayerId: string | undefined, finalKomi: number | undefined;

                if (p1Bid.color !== p2Bid.color) {
                    blackPlayerId = p1Bid.color === types.Player.Black ? p1.id : p2.id;
                    whitePlayerId = blackPlayerId === p1.id ? p2.id : p1.id;
                    finalKomi = baseKomi;
                } else {
                     if (p1Bid.komi !== p2Bid.komi) {
                        const winnerId = p1Bid.komi > p2Bid.komi ? p1.id : p2.id;
                        const loserId = winnerId === p1.id ? p2.id : p1.id;
                        const winningBidKomi = Math.max(p1Bid.komi, p2Bid.komi);

                        if (p1Bid.color === types.Player.Black) {
                            blackPlayerId = winnerId;
                            whitePlayerId = loserId;
                            finalKomi = winningBidKomi + baseKomi;
                        } else {
                            whitePlayerId = winnerId;
                            blackPlayerId = loserId;
                            finalKomi = baseKomi - winningBidKomi;
                        }
                    } else {
                        if ((game.komiBiddingRound || 1) === 1) {
                            game.gameStatus = 'komi_bidding';
                            game.komiBiddingDeadline = now + 30000;
                            game.komiBids = { [p1.id]: null, [p2.id]: null };
                            game.komiBiddingRound = 2;
                            game.komiBidRevealProcessed = false;
                            game.revealEndTime = undefined;
                            return;
                        } else {
                            const winnerId = Math.random() < 0.5 ? p1.id : p2.id;
                            const loserId = winnerId === p1.id ? p2.id : p1.id;
                            
                            if (p1Bid.color === types.Player.Black) {
                                blackPlayerId = winnerId;
                                whitePlayerId = loserId;
                                finalKomi = p1Bid.komi + baseKomi;
                            } else {
                                whitePlayerId = winnerId;
                                blackPlayerId = loserId;
                                finalKomi = baseKomi - p1Bid.komi;
                            }
                        }
                    }
                }
                
                if (blackPlayerId && whitePlayerId && typeof finalKomi === 'number') {
                    game.blackPlayerId = blackPlayerId;
                    game.whitePlayerId = whitePlayerId;
                    game.finalKomi = finalKomi;
                    game.baseStones = [];
                    const newBoardState = Array(game.settings.boardSize).fill(0).map(() => Array(game.settings.boardSize).fill(types.Player.None));
                    const p1Color = p1.id === blackPlayerId ? types.Player.Black : types.Player.White;
                    const p2Color = p2.id === whitePlayerId ? types.Player.White : types.Player.Black;
                    (game.baseStones_p1 || []).forEach(p => { newBoardState[p.y][p.x] = p1Color; game.baseStones!.push({ ...p, player: p1Color }); });
                    (game.baseStones_p2 || []).forEach(p => { newBoardState[p.y][p.x] = p2Color; game.baseStones!.push({ ...p, player: p2Color }); });
                    game.boardState = newBoardState;
                    game.gameStatus = 'base_game_start_confirmation';
                    game.revealEndTime = now + 30000;
                    game.preGameConfirmations = { [p1.id]: false, [p2.id]: false };
                    if (game.isAiGame) {
                        const aiId = p1.id === aiUserId ? p1.id : p2.id;
                        game.preGameConfirmations[aiId] = true;
                    }
                    // Clean up bidding state
                    game.komiBids = undefined;
                    game.komiBiddingRound = undefined;
                    game.basePlacementDeadline = undefined;
                    game.komiBidRevealProcessed = undefined;
                }
            }
            break;
        case 'base_game_start_confirmation': {
            const bothConfirmed = game.preGameConfirmations?.[p1Id] && game.preGameConfirmations?.[p2Id];
            const deadlinePassed = game.revealEndTime && now > game.revealEndTime;
            if (bothConfirmed || deadlinePassed) {
                transitionToPlaying(game, now);
            }
            break;
        }
    }
};

export const handleBaseAction = (game: types.LiveGameSession, action: types.ServerAction & { userId: string }, user: types.User): types.HandleActionResult | null => {
    const { type, payload } = action;
    const now = Date.now();

    switch (type) {
        case 'PLACE_BASE_STONE':
            if (game.gameStatus !== 'base_placement') return { error: "Not in base placement phase." };
            const myStonesKey = user.id === game.player1.id ? 'baseStones_p1' : 'baseStones_p2';
            if (!game[myStonesKey]) game[myStonesKey] = [];
            if ((game[myStonesKey]?.length ?? 0) >= game.settings.baseStones!) return { error: "Already placed all stones." };
            if (game[myStonesKey]!.some(p => p.x === payload.x && p.y === payload.y)) return { error: "Already placed a stone there." };
            game[myStonesKey]!.push({ x: payload.x, y: payload.y });
            return {};
        case 'PLACE_REMAINING_BASE_STONES_RANDOMLY':
            if (game.gameStatus !== 'base_placement') return { error: "Not in base placement phase." };
            const playerStonesKey = user.id === game.player1.id ? 'baseStones_p1' : 'baseStones_p2';
            placeRemainingStonesRandomly(game, playerStonesKey);
            return {};
        case 'UPDATE_KOMI_BID':
            if (game.gameStatus !== 'komi_bidding' || game.komiBids?.[user.id]) return { error: "Cannot bid now." };
            if (!game.komiBids) game.komiBids = {};
            game.komiBids[user.id] = payload.bid;
            return {};
        case 'CONFIRM_BASE_REVEAL':
             if (game.gameStatus !== 'base_game_start_confirmation') return { error: "Not in confirmation phase." };
             if (!game.preGameConfirmations) game.preGameConfirmations = {};
             game.preGameConfirmations[user.id] = true;
             return {};
    }
    return null;
};