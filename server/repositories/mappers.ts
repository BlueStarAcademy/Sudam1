import { createDefaultQuests, createDefaultBaseStats, createDefaultSpentStatPoints, defaultStats } from '../initialData.js';
import * as types from '../../types.js';

const safeParse = (jsonString: string | null, defaultValue: any, contextId: string, fieldName: string) => {
    if (jsonString === null || jsonString === undefined) return defaultValue;
    try {
        if (typeof jsonString === 'string' && jsonString.trim() === '') return defaultValue;
        const parsed = JSON.parse(jsonString);
        return parsed === null ? defaultValue : parsed;
    } catch (e) {
        console.warn(`[DB Mapper] Malformed JSON for ID ${contextId}, field ${fieldName}. Falling back to default. Data: "${jsonString}"`);
        return defaultValue;
    }
};

export const rowToUser = (row: any): types.User | null => {
    if (!row) return null;
    try {
        const defaultQuests = createDefaultQuests();
        const questsFromDb = safeParse(row.quests, {}, row.id, 'quests');
        
        const quests: types.QuestLog = {
            daily: {
                ...(defaultQuests.daily || {}),
                ...(questsFromDb.daily || {}),
                quests: questsFromDb.daily?.quests ?? defaultQuests.daily?.quests ?? [],
                claimedMilestones: questsFromDb.daily?.claimedMilestones ?? defaultQuests.daily?.claimedMilestones ?? [false, false, false, false, false],
            },
            weekly: {
                ...(defaultQuests.weekly || {}),
                ...(questsFromDb.weekly || {}),
                quests: questsFromDb.weekly?.quests ?? defaultQuests.weekly?.quests ?? [],
                claimedMilestones: questsFromDb.weekly?.claimedMilestones ?? defaultQuests.weekly?.claimedMilestones ?? [false, false, false, false, false],
            },
            monthly: {
                 ...(defaultQuests.monthly || {}),
                 ...(questsFromDb.monthly || {}),
                 quests: questsFromDb.monthly?.quests ?? defaultQuests.monthly?.quests ?? [],
                 claimedMilestones: questsFromDb.monthly?.claimedMilestones ?? defaultQuests.monthly?.claimedMilestones ?? [false, false, false, false, false],
            }
        };

        const actionPointsFromDb = safeParse(row.actionPoints, {}, row.id, 'actionPoints');
        const actionPoints = {
            current: typeof actionPointsFromDb.current === 'number' ? actionPointsFromDb.current : 30,
            max: typeof actionPointsFromDb.max === 'number' ? actionPointsFromDb.max : 30,
        };

        const user: types.User = {
            id: row.id,
            username: row.username,
            nickname: row.nickname,
            isAdmin: !!row.isAdmin,
            strategyLevel: row.strategyLevel ?? 1,
            strategyXp: row.strategyXp ?? 0,
            playfulLevel: row.playfulLevel ?? 1,
            playfulXp: row.playfulXp ?? 0,
            gold: row.gold ?? 0,
            diamonds: row.diamonds ?? 0,
            inventorySlots: (() => {
                const slots = safeParse(row.inventorySlots, { equipment: 30, consumable: 30, material: 30 }, row.id, 'inventorySlots');
                if (typeof slots === 'number') {
                    return { equipment: slots, consumable: 30, material: 30 };
                }
                return slots;
            })(),
            chatBanUntil: row.chatBanUntil,
            connectionBanUntil: row.connectionBanUntil,
            lastActionPointUpdate: row.lastActionPointUpdate ?? 0,
            actionPointPurchasesToday: row.actionPointPurchasesToday,
            lastActionPointPurchaseDate: row.lastActionPointPurchaseDate,
            avatarId: row.avatarId || 'profile_1',
            borderId: row.borderId || 'default',
            ownedBorders: safeParse(row.ownedBorders, ['default'], row.id, 'ownedBorders'),
            equipmentPresets: safeParse(row.equipmentPresets, [], row.id, 'equipmentPresets'),
            tournamentScore: row.tournamentScore ?? 1200,
            league: row.league || types.LeagueTier.Sprout,
            mannerMasteryApplied: !!row.mannerMasteryApplied,
            mannerScore: row.mannerScore ?? 200,
            pendingPenaltyNotification: row.pendingPenaltyNotification,
            previousSeasonTier: row.previousSeasonTier,
            stats: { ...defaultStats, ...safeParse(row.stats, {}, row.id, 'stats') },
            baseStats: { ...createDefaultBaseStats(), ...safeParse(row.baseStats, {}, row.id, 'baseStats') },
            spentStatPoints: { ...createDefaultSpentStatPoints(), ...safeParse(row.spentStatPoints, {}, row.id, 'spentStatPoints') },
            inventory: safeParse(row.inventory, [], row.id, 'inventory'),
            equipment: safeParse(row.equipment, {}, row.id, 'equipment'),
            actionPoints,
            mail: safeParse(row.mail, [], row.id, 'mail'),
            quests,
            seasonHistory: safeParse(row.seasonHistory, {}, row.id, 'seasonHistory'),
            dailyShopPurchases: safeParse(row.dailyShopPurchases, {}, row.id, 'dailyShopPurchases'),
            lastNeighborhoodPlayedDate: row.lastNeighborhoodPlayedDate,
            dailyNeighborhoodWins: row.dailyNeighborhoodWins ?? 0,
            neighborhoodRewardClaimed: !!row.neighborhoodRewardClaimed,
            lastNeighborhoodTournament: safeParse(row.lastNeighborhoodTournament, null, row.id, 'lastNeighborhoodTournament'),
            lastNationalPlayedDate: row.lastNationalPlayedDate,
            dailyNationalWins: row.dailyNationalWins ?? 0,
            nationalRewardClaimed: !!row.nationalRewardClaimed,
            lastNationalTournament: safeParse(row.lastNationalTournament, null, row.id, 'lastNationalTournament'),
            lastWorldPlayedDate: row.lastWorldPlayedDate,
            dailyWorldWins: row.dailyWorldWins ?? 0,
            worldRewardClaimed: !!row.worldRewardClaimed,
            lastWorldTournament: safeParse(row.lastWorldTournament, null, row.id, 'lastWorldTournament'),
            weeklyCompetitors: safeParse(row.weeklyCompetitors, [], row.id, 'weeklyCompetitors'),
            lastWeeklyCompetitorsUpdate: row.lastWeeklyCompetitorsUpdate,
            lastLeagueUpdate: row.lastLeagueUpdate,
            monthlyGoldBuffExpiresAt: row.monthlyGoldBuffExpiresAt ?? null,
            mbti: row.mbti,
            isMbtiPublic: !!row.isMbtiPublic,
            singlePlayerProgress: row.singlePlayerProgress ?? 0,
            bonusStatPoints: row.bonusStatPoints ?? 0,
            singlePlayerMissions: safeParse(row.singlePlayerMissions, {}, row.id, 'singlePlayerMissions'),
            blacksmithLevel: row.blacksmithLevel ?? 1,
            blacksmithXp: row.blacksmithXp ?? 0,
            cumulativeTournamentScore: row.cumulativeTournamentScore ?? 0,
        };
        return user;
    } catch (e) {
        console.error(`[FATAL] Unrecoverable error processing user data for row ID ${row?.id}:`, e);
        return null;
    }
};

export const rowToGame = (row: any): types.LiveGameSession | null => {
    if (!row) return null;
    try {
        const game: types.LiveGameSession = {
            ...row,
            player1: safeParse(row.player1, null, row.id, 'player1'),
            player2: safeParse(row.player2, null, row.id, 'player2'),
            settings: safeParse(row.settings, {}, row.id, 'settings'),
            boardState: safeParse(row.boardState, [], row.id, 'boardState'),
            moveHistory: safeParse(row.moveHistory, [], row.id, 'moveHistory'),
            captures: safeParse(row.captures, {}, row.id, 'captures'),
            baseStoneCaptures: safeParse(row.baseStoneCaptures, {}, row.id, 'baseStoneCaptures'),
            hiddenStoneCaptures: safeParse(row.hiddenStoneCaptures, {}, row.id, 'hiddenStoneCaptures'),
            finalScores: safeParse(row.finalScores, null, row.id, 'finalScores'),
            lastMove: safeParse(row.lastMove, null, row.id, 'lastMove'),
            koInfo: safeParse(row.koInfo, null, row.id, 'koInfo'),
            winningLine: safeParse(row.winningLine, null, row.id, 'winningLine'),
            summary: safeParse(row.summary, null, row.id, 'summary'),
            animation: safeParse(row.animation, null, row.id, 'animation'),
            disconnectionState: safeParse(row.disconnectionState, null, row.id, 'disconnectionState'),
            disconnectionCounts: safeParse(row.disconnectionCounts, {}, row.id, 'disconnectionCounts'),
            noContestInitiatorIds: safeParse(row.noContestInitiatorIds, null, row.id, 'noContestInitiatorIds'),
            currentActionButtons: safeParse(row.currentActionButtons, {}, row.id, 'currentActionButtons'),
            actionButtonCooldownDeadline: safeParse(row.actionButtonCooldownDeadline, null, row.id, 'actionButtonCooldownDeadline'),
            actionButtonUses: safeParse(row.actionButtonUses, null, row.id, 'actionButtonUses'),
            actionButtonUsedThisCycle: safeParse(row.actionButtonUsedThisCycle, null, row.id, 'actionButtonUsedThisCycle'),
            mannerScoreChanges: safeParse(row.mannerScoreChanges, {}, row.id, 'mannerScoreChanges'),
            nigiri: safeParse(row.nigiri, null, row.id, 'nigiri'),
            guessDeadline: safeParse(row.guessDeadline, null, row.id, 'guessDeadline'),
            bids: safeParse(row.bids, null, row.id, 'bids'),
            biddingRound: safeParse(row.biddingRound, null, row.id, 'biddingRound'),
            captureBidDeadline: safeParse(row.captureBidDeadline, null, row.id, 'captureBidDeadline'),
            effectiveCaptureTargets: safeParse(row.effectiveCaptureTargets, null, row.id, 'effectiveCaptureTargets'),
            baseStones: safeParse(row.baseStones, null, row.id, 'baseStones'),
            baseStones_p1: safeParse(row.baseStones_p1, null, row.id, 'baseStones_p1'),
            baseStones_p2: safeParse(row.baseStones_p2, null, row.id, 'baseStones_p2'),
            basePlacementDeadline: safeParse(row.basePlacementDeadline, null, row.id, 'basePlacementDeadline'),
            komiBids: safeParse(row.komiBids, null, row.id, 'komiBids'),
            komiBiddingDeadline: safeParse(row.komiBiddingDeadline, null, row.id, 'komiBiddingDeadline'),
            komiBiddingRound: safeParse(row.komiBiddingRound, null, row.id, 'komiBiddingRound'),
            komiBidRevealProcessed: safeParse(row.komiBidRevealProcessed, null, row.id, 'komiBidRevealProcessed'),
            finalKomi: safeParse(row.finalKomi, null, row.id, 'finalKomi'),
            hiddenMoves: safeParse(row.hiddenMoves, null, row.id, 'hiddenMoves'),
            scans_p1: safeParse(row.scans_p1, null, row.id, 'scans_p1'),
            scans_p2: safeParse(row.scans_p2, null, row.id, 'scans_p2'),
            revealedHiddenMoves: safeParse(row.revealedHiddenMoves, {}, row.id, 'revealedHiddenMoves'),
            newlyRevealed: safeParse(row.newlyRevealed, null, row.id, 'newlyRevealed'),
            justCaptured: safeParse(row.justCaptured, null, row.id, 'justCaptured'),
            pendingCapture: safeParse(row.pendingCapture, null, row.id, 'pendingCapture'),
            permanentlyRevealedStones: safeParse(row.permanentlyRevealedStones, null, row.id, 'permanentlyRevealedStones'),
            missiles_p1: safeParse(row.missiles_p1, null, row.id, 'missiles_p1'),
            missiles_p2: safeParse(row.missiles_p2, null, row.id, 'missiles_p2'),
            missileUsedThisTurn: safeParse(row.missileUsedThisTurn, null, row.id, 'missileUsedThisTurn'),
            rpsState: safeParse(row.rpsState, null, row.id, 'rpsState'),
            rpsRound: safeParse(row.rpsRound, null, row.id, 'rpsRound'),
            dice: safeParse(row.dice, null, row.id, 'dice'),
            stonesToPlace: safeParse(row.stonesToPlace, null, row.id, 'stonesToPlace'),
            turnOrderRolls: safeParse(row.turnOrderRolls, null, row.id, 'turnOrderRolls'),
            turnOrderRollReady: safeParse(row.turnOrderRollReady, null, row.id, 'turnOrderRollReady'),
            turnOrderRollResult: safeParse(row.turnOrderRollResult, null, row.id, 'turnOrderRollResult'),
            turnOrderRollDeadline: safeParse(row.turnOrderRollDeadline, null, row.id, 'turnOrderRollDeadline'),
            turnOrderAnimationEndTime: safeParse(row.turnOrderAnimationEndTime, null, row.id, 'turnOrderAnimationEndTime'),
            turnChoiceDeadline: safeParse(row.turnChoiceDeadline, null, row.id, 'turnChoiceDeadline'),
            turnChooserId: safeParse(row.turnChooserId, null, row.id, 'turnChooserId'),
            turnChoices: safeParse(row.turnChoices, null, row.id, 'turnChoices'),
            turnSelectionTiebreaker: safeParse(row.turnSelectionTiebreaker, null, row.id, 'turnSelectionTiebreaker'),
            diceRollHistory: safeParse(row.diceRollHistory, null, row.id, 'diceRollHistory'),
            diceRoundSummary: safeParse(row.diceRoundSummary, null, row.id, 'diceRoundSummary'),
            lastWhiteGroupInfo: safeParse(row.lastWhiteGroupInfo, null, row.id, 'lastWhiteGroupInfo'),
            diceGoItemUses: safeParse(row.diceGoItemUses, {}, row.id, 'diceGoItemUses'),
            diceGoBonuses: safeParse(row.diceGoBonuses, {}, row.id, 'diceGoBonuses'),
            diceCapturesThisTurn: safeParse(row.diceCapturesThisTurn, null, row.id, 'diceCapturesThisTurn'),
            diceLastCaptureStones: safeParse(row.diceLastCaptureStones, null, row.id, 'diceLastCaptureStones'),
            round: safeParse(row.round, null, row.id, 'round'),
            isDeathmatch: safeParse(row.isDeathmatch, null, row.id, 'isDeathmatch'),
            turnInRound: safeParse(row.turnInRound, null, row.id, 'turnInRound'),
            scores: safeParse(row.scores, {}, row.id, 'scores'),
            thiefPlayerId: safeParse(row.thiefPlayerId, null, row.id, 'thiefPlayerId'),
            policePlayerId: safeParse(row.policePlayerId, null, row.id, 'policePlayerId'),
            roleChoices: safeParse(row.roleChoices, null, row.id, 'roleChoices'),
            roleChoiceWinnerId: safeParse(row.roleChoiceWinnerId, null, row.id, 'roleChoiceWinnerId'),
            thiefRoundSummary: safeParse(row.thiefRoundSummary, null, row.id, 'thiefRoundSummary'),
            thiefDiceRollHistory: safeParse(row.thiefDiceRollHistory, null, row.id, 'thiefDiceRollHistory'),
            thiefCapturesThisRound: row.thiefCapturesThisRound,
            alkkagiStones: safeParse(row.alkkagiStones, null, row.id, 'alkkagiStones'),
            alkkagiStones_p1: safeParse(row.alkkagiStones_p1, null, row.id, 'alkkagiStones_p1'),
            alkkagiStones_p2: safeParse(row.alkkagiStones_p2, null, row.id, 'alkkagiStones_p2'),
            alkkagiTurnDeadline: safeParse(row.alkkagiTurnDeadline, null, row.id, 'alkkagiTurnDeadline'),
            alkkagiPlacementDeadline: safeParse(row.alkkagiPlacementDeadline, null, row.id, 'alkkagiPlacementDeadline'),
            alkkagiItemUses: safeParse(row.alkkagiItemUses, {}, row.id, 'alkkagiItemUses'),
            activeAlkkagiItems: safeParse(row.activeAlkkagiItems, {}, row.id, 'activeAlkkagiItems'),
            alkkagiRound: safeParse(row.alkkagiRound, null, row.id, 'alkkagiRound'),
            alkkagiRefillsUsed: safeParse(row.alkkagiRefillsUsed, {}, row.id, 'alkkagiRefillsUsed'),
            alkkagiStonesPlacedThisRound: safeParse(row.alkkagiStonesPlacedThisRound, {}, row.id, 'alkkagiStonesPlacedThisRound'),
            alkkagiRoundSummary: safeParse(row.alkkagiRoundSummary, null, row.id, 'alkkagiRoundSummary'),
            curlingStones: safeParse(row.curlingStones, null, row.id, 'curlingStones'),
            curlingTurnDeadline: safeParse(row.curlingTurnDeadline, null, row.id, 'curlingTurnDeadline'),
            curlingScores: safeParse(row.curlingScores, {}, row.id, 'curlingScores'),
            curlingRound: safeParse(row.curlingRound, null, row.id, 'curlingRound'),
            curlingRoundSummary: safeParse(row.curlingRoundSummary, null, row.id, 'curlingRoundSummary'),
            curlingItemUses: safeParse(row.curlingItemUses, {}, row.id, 'curlingItemUses'),
            activeCurlingItems: safeParse(row.activeCurlingItems, {}, row.id, 'activeCurlingItems'),
            hammerPlayerId: row.hammerPlayerId,
            isTiebreaker: safeParse(row.isTiebreaker, null, row.id, 'isTiebreaker'),
            tiebreakerStonesThrown: safeParse(row.tiebreakerStonesThrown, null, row.id, 'tiebreakerStonesThrown'),
            stonesThrownThisRound: safeParse(row.stonesThrownThisRound, {}, row.id, 'stonesThrownThisRound'),
            preGameConfirmations: safeParse(row.preGameConfirmations, null, row.id, 'preGameConfirmations'),
            roundEndConfirmations: safeParse(row.roundEndConfirmations, null, row.id, 'roundEndConfirmations'),
            rematchRejectionCount: safeParse(row.rematchRejectionCount, null, row.id, 'rematchRejectionCount'),
            timeoutFouls: safeParse(row.timeoutFouls, {}, row.id, 'timeoutFouls'),
            curlingStonesLostToFoul: safeParse(row.curlingStonesLostToFoul, {}, row.id, 'curlingStonesLostToFoul'),
            foulInfo: safeParse(row.foulInfo, null, row.id, 'foulInfo'),
            analysisResult: safeParse(row.analysisResult, null, row.id, 'analysisResult'),
            previousAnalysisResult: safeParse(row.previousAnalysisResult, null, row.id, 'previousAnalysisResult'),
            canRequestNoContest: safeParse(row.canRequestNoContest, null, row.id, 'canRequestNoContest'),
            mythicBonuses: safeParse(row.mythicBonuses, {}, row.id, 'mythicBonuses'),
            lastPlayfulGoldCheck: safeParse(row.lastPlayfulGoldCheck, {}, row.id, 'lastPlayfulGoldCheck'),
            pendingSystemMessages: safeParse(row.pendingSystemMessages, null, row.id, 'pendingSystemMessages'),
            lastTurnStones: safeParse(row.lastTurnStones, null, row.id, 'lastTurnStones'),
            stonesPlacedThisTurn: safeParse(row.stonesPlacedThisTurn, null, row.id, 'stonesPlacedThisTurn'),
            isSinglePlayer: !!row.isSinglePlayer,
            stageId: row.stageId,
            blackPatternStones: safeParse(row.blackPatternStones, null, row.id, 'blackPatternStones'),
            whitePatternStones: safeParse(row.whitePatternStones, null, row.id, 'whitePatternStones'),
            singlePlayerPlacementRefreshesUsed: row.singlePlayerPlacementRefreshesUsed,
        };
        // Boolean conversions for fields that might be stored as integers
        game.isAiGame = !!row.isAiGame;
        game.statsUpdated = !!row.statsUpdated;
        game.isDeathmatch = !!row.isDeathmatch;
        game.isTiebreaker = !!row.isTiebreaker;
        game.isAnalyzing = !!row.isAnalyzing;
        return game;
    } catch (e) {
        console.error(`Error processing game data for ${row.id}:`, e);
        return null;
    }
};