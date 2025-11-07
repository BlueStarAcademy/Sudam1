import { Database } from 'sqlite';
import { LiveGameSession } from '../../types.js';
import * as types from '../../types.js';
import { rowToGame } from './mappers.js';

export const getLiveGame = async (db: Database, id: string): Promise<LiveGameSession | null> => {
    return rowToGame(await db.get('SELECT * FROM live_games WHERE id = ?', id));
};

export const getAllActiveGames = async (db: Database): Promise<LiveGameSession[]> => {
    const rows = await db.all("SELECT * FROM live_games WHERE gameStatus NOT IN ('ended', 'no_contest')");
    return rows.map(rowToGame).filter((g): g is LiveGameSession => g !== null);
};

export const getAllEndedGames = async (db: Database): Promise<LiveGameSession[]> => {
    const rows = await db.all("SELECT * FROM live_games WHERE gameStatus IN ('ended', 'no_contest')");
    return rows.map(rowToGame).filter((g): g is LiveGameSession => g !== null);
};

export const saveGame = async (db: Database, game: LiveGameSession): Promise<void> => {
    const columns = [
        'id', 'mode', 'description', 'player1', 'player2', 'blackPlayerId', 'whitePlayerId', 'gameStatus', 'currentPlayer', 'boardState', 'moveHistory', 'captures', 'baseStoneCaptures', 'hiddenStoneCaptures', 'winner', 'winReason', 'finalScores', 'createdAt', 'lastMove', 'lastTurnStones', 'stonesPlacedThisTurn', 'passCount', 'koInfo', 'winningLine', 'statsUpdated', 'summary', 'animation', 'blackTimeLeft', 'whiteTimeLeft', 'blackByoyomiPeriodsLeft', 'whiteByoyomiPeriodsLeft', 'turnDeadline', 'turnStartTime', 'disconnectionState', 'disconnectionCounts', 'noContestInitiatorIds', 'currentActionButtons', 'actionButtonCooldownDeadline', 'actionButtonUses', 'maxActionButtonUses', 'actionButtonUsedThisCycle', 'mannerScoreChanges', 'nigiri', 'guessDeadline', 'bids', 'biddingRound', 'captureBidDeadline', 'effectiveCaptureTargets', 'baseStones', 'baseStones_p1', 'baseStones_p2', 'basePlacementDeadline', 'komiBids', 'komiBiddingDeadline', 'komiBiddingRound', 'komiBidRevealProcessed', 'finalKomi', 'hiddenMoves', 'scans_p1', 'scans_p2', 'revealedStones', 'revealedHiddenMoves', 'newlyRevealed', 'justCaptured', 'hidden_stones_used_p1', 'hidden_stones_used_p2', 'pendingCapture', 'permanentlyRevealedStones', 'missiles_p1', 'missiles_p2', 'missileUsedThisTurn', 'rpsState', 'rpsRound', 'dice', 'stonesToPlace', 'turnOrderRolls', 'turnOrderRollReady', 'turnOrderRollResult', 'turnOrderRollDeadline', 'turnOrderAnimationEndTime', 'turnChoiceDeadline', 'turnChooserId', 'turnChoices', 'turnSelectionTiebreaker', 'diceRollHistory', 'diceRoundSummary', 'lastWhiteGroupInfo', 'diceGoItemUses', 'diceGoBonuses', 'diceCapturesThisTurn', 'diceLastCaptureStones', 'round', 'isDeathmatch', 'turnInRound', 'scores', 'thiefPlayerId', 'policePlayerId', 'roleChoices', 'roleChoiceWinnerId', 'thiefRoundSummary', 'thiefDiceRollHistory', 'thiefCapturesThisRound', 'alkkagiStones', 'alkkagiStones_p1', 'alkkagiStones_p2', 'alkkagiTurnDeadline', 'alkkagiPlacementDeadline', 'alkkagiItemUses', 'activeAlkkagiItems', 'alkkagiRound', 'alkkagiRefillsUsed', 'alkkagiStonesPlacedThisRound', 'alkkagiRoundSummary', 'curlingStones', 'curlingTurnDeadline', 'curlingScores', 'curlingRound', 'curlingRoundSummary', 'curlingItemUses', 'activeCurlingItems', 'hammerPlayerId', 'isTiebreaker', 'tiebreakerStonesThrown', 'stonesThrownThisRound', 'preGameConfirmations', 'roundEndConfirmations', 'rematchRejectionCount', 'timeoutFouls', 'curlingStonesLostToFoul', 'foulInfo', 'isAnalyzing', 'analysisResult', 'previousAnalysisResult', 'settings', 'canRequestNoContest', 'pausedTurnTimeLeft', 'itemUseDeadline', 'lastTimeoutPlayerId', 'lastTimeoutPlayerIdClearTime', 'revealAnimationEndTime', 'revealEndTime', 'isAiGame', 'aiTurnStartTime', 'mythicBonuses', 'lastPlayfulGoldCheck', 'pendingSystemMessages',
        'isSinglePlayer', 'gameCategory', 'stageId', 'towerFloor', 'blackPatternStones', 'whitePatternStones', 'singlePlayerPlacementRefreshesUsed'
    ];
    
    // 문자열 타입 필드 목록 (JSON.stringify하지 않음)
    const stringFields = ['turnSelectionTiebreaker', 'turnOrderRollResult', 'gameStatus', 'mode', 'winReason', 'description', 'blackPlayerId', 'whitePlayerId', 'turnChooserId', 'thiefPlayerId', 'policePlayerId', 'roleChoiceWinnerId', 'hammerPlayerId', 'lastTimeoutPlayerId', 'stageId', 'gameCategory'];
    
    const values: { [key: string]: any } = {};
    for (const col of columns) {
        const key = col as keyof types.LiveGameSession;
        const value = game[key];
        const paramName = `$${col}`;

        if (value === undefined) {
            values[paramName] = null;
        } else if (stringFields.includes(col)) {
            // 문자열 타입 필드는 그대로 저장
            values[paramName] = value;
        } else {
            values[paramName] = typeof value === 'object' && value !== null ? JSON.stringify(value) : value;
        }
    }

    const columnNames = columns.join(',');
    const paramNames = columns.map(c => `$${c}`).join(',');

    await db.run(
        `INSERT OR REPLACE INTO live_games (${columnNames}) VALUES (${paramNames})`,
        values
    );
};

export const deleteGame = async (db: Database, id: string): Promise<void> => {
    await db.run('DELETE FROM live_games WHERE id = ?', id);
};