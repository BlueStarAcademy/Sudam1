import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
const DB_FILE_PATH = path.resolve('database.sqlite');
let dbInstance = null;
const migrations = {
    2: 'ALTER TABLE users ADD COLUMN inventorySlots INTEGER;',
    3: 'ALTER TABLE users ADD COLUMN actionPoints TEXT; ALTER TABLE users ADD COLUMN lastActionPointUpdate INTEGER;',
    4: 'ALTER TABLE users ADD COLUMN mannerScore INTEGER;',
    5: 'ALTER TABLE users ADD COLUMN mail TEXT;',
    6: 'ALTER TABLE users ADD COLUMN quests TEXT;',
    7: 'ALTER TABLE users ADD COLUMN chatBanUntil INTEGER;',
    8: 'ALTER TABLE users ADD COLUMN avatarId TEXT; ALTER TABLE users ADD COLUMN borderId TEXT;',
    9: 'ALTER TABLE users ADD COLUMN previousSeasonTier TEXT;',
    10: 'ALTER TABLE users ADD COLUMN seasonHistory TEXT;',
    11: 'ALTER TABLE users ADD COLUMN baseStats TEXT; ALTER TABLE users ADD COLUMN spentStatPoints TEXT;',
    12: 'ALTER TABLE users ADD COLUMN actionPointPurchasesToday INTEGER; ALTER TABLE users ADD COLUMN lastActionPointPurchaseDate INTEGER;',
    13: 'ALTER TABLE users ADD COLUMN dailyShopPurchases TEXT;',
    14: 'ALTER TABLE users ADD COLUMN tournamentScore INTEGER; ALTER TABLE users ADD COLUMN league TEXT; ALTER TABLE users ADD COLUMN mannerMasteryApplied BOOLEAN; ALTER TABLE users ADD COLUMN pendingPenaltyNotification TEXT;',
    15: 'ALTER TABLE users ADD COLUMN lastNeighborhoodPlayedDate INTEGER; ALTER TABLE users ADD COLUMN dailyNeighborhoodWins INTEGER; ALTER TABLE users ADD COLUMN neighborhoodRewardClaimed BOOLEAN; ALTER TABLE users ADD COLUMN lastNeighborhoodTournament TEXT;',
    16: 'ALTER TABLE users ADD COLUMN lastNationalPlayedDate INTEGER; ALTER TABLE users ADD COLUMN dailyNationalWins INTEGER; ALTER TABLE users ADD COLUMN nationalRewardClaimed BOOLEAN; ALTER TABLE users ADD COLUMN lastNationalTournament TEXT;',
    17: 'ALTER TABLE users ADD COLUMN lastWorldPlayedDate INTEGER; ALTER TABLE users ADD COLUMN dailyWorldWins INTEGER; ALTER TABLE users ADD COLUMN worldRewardClaimed BOOLEAN; ALTER TABLE users ADD COLUMN lastWorldTournament TEXT;',
    18: 'ALTER TABLE users ADD COLUMN weeklyCompetitors TEXT; ALTER TABLE users ADD COLUMN lastWeeklyCompetitorsUpdate INTEGER; ALTER TABLE users ADD COLUMN lastLeagueUpdate INTEGER;',
    19: 'ALTER TABLE users ADD COLUMN ownedBorders TEXT;',
    20: 'ALTER TABLE live_games ADD COLUMN mythicBonuses TEXT; ALTER TABLE live_games ADD COLUMN lastPlayfulGoldCheck TEXT; ALTER TABLE live_games ADD COLUMN pendingSystemMessages TEXT;',
    21: 'ALTER TABLE live_games ADD COLUMN thiefCapturesThisRound INTEGER;',
    22: 'ALTER TABLE users ADD COLUMN connectionBanUntil INTEGER;',
    23: `
        ALTER TABLE live_games ADD COLUMN alkkagiStones TEXT;
        ALTER TABLE live_games ADD COLUMN alkkagiStones_p1 TEXT;
        ALTER TABLE live_games ADD COLUMN alkkagiStones_p2 TEXT;
        ALTER TABLE live_games ADD COLUMN alkkagiTurnDeadline REAL;
        ALTER TABLE live_games ADD COLUMN alkkagiPlacementDeadline REAL;
        ALTER TABLE live_games ADD COLUMN alkkagiItemUses TEXT;
        ALTER TABLE live_games ADD COLUMN activeAlkkagiItems TEXT;
        ALTER TABLE live_games ADD COLUMN alkkagiRound INTEGER;
        ALTER TABLE live_games ADD COLUMN alkkagiRefillsUsed TEXT;
        ALTER TABLE live_games ADD COLUMN alkkagiStonesPlacedThisRound TEXT;
        ALTER TABLE live_games ADD COLUMN alkkagiRoundSummary TEXT;
        ALTER TABLE live_games ADD COLUMN curlingStones TEXT;
        ALTER TABLE live_games ADD COLUMN curlingTurnDeadline REAL;
        ALTER TABLE live_games ADD COLUMN curlingScores TEXT;
        ALTER TABLE live_games ADD COLUMN curlingRound INTEGER;
        ALTER TABLE live_games ADD COLUMN curlingRoundSummary TEXT;
        ALTER TABLE live_games ADD COLUMN curlingItemUses TEXT;
        ALTER TABLE live_games ADD COLUMN activeCurlingItems TEXT;
        ALTER TABLE live_games ADD COLUMN hammerPlayerId TEXT;
        ALTER TABLE live_games ADD COLUMN isTiebreaker BOOLEAN;
        ALTER TABLE live_games ADD COLUMN tiebreakerStonesThrown INTEGER;
        ALTER TABLE live_games ADD COLUMN stonesThrownThisRound TEXT;
        ALTER TABLE live_games ADD COLUMN preGameConfirmations TEXT;
        ALTER TABLE live_games ADD COLUMN roundEndConfirmations TEXT;
        ALTER TABLE live_games ADD COLUMN rematchRejectionCount TEXT;
        ALTER TABLE live_games ADD COLUMN timeoutFouls TEXT;
        ALTER TABLE live_games ADD COLUMN curlingStonesLostToFoul TEXT;
        ALTER TABLE live_games ADD COLUMN foulInfo TEXT;
    `,
    24: 'ALTER TABLE live_games ADD COLUMN mannerScoreChanges TEXT;',
    25: 'ALTER TABLE users ADD COLUMN mbti TEXT; ALTER TABLE users ADD COLUMN isMbtiPublic BOOLEAN;',
    26: 'ALTER TABLE live_games ADD COLUMN revealedHiddenMoves TEXT;',
    27: 'ALTER TABLE live_games ADD COLUMN lastTurnStones TEXT; ALTER TABLE live_games ADD COLUMN stonesPlacedThisTurn TEXT;',
    28: 'ALTER TABLE users ADD COLUMN singlePlayerProgress INTEGER;',
    29: 'ALTER TABLE users ADD COLUMN bonusStatPoints INTEGER;',
    30: `
        ALTER TABLE live_games ADD COLUMN isSinglePlayer BOOLEAN;
        ALTER TABLE live_games ADD COLUMN stageId TEXT;
        ALTER TABLE live_games ADD COLUMN blackPatternStones TEXT;
        ALTER TABLE live_games ADD COLUMN whitePatternStones TEXT;
        ALTER TABLE live_games ADD COLUMN singlePlayerPlacementRefreshesUsed INTEGER;
    `,
    31: 'ALTER TABLE users ADD COLUMN blacksmithLevel INTEGER;',
    32: 'ALTER TABLE users ADD COLUMN blacksmithXp INTEGER;',
    33: 'ALTER TABLE users ADD COLUMN monthlyGoldBuffExpiresAt INTEGER;',
    34: 'ALTER TABLE users ADD COLUMN inventorySlotsMigrated BOOLEAN;',
};
export const initializeAndGetDb = async () => {
    console.log('[DB] initializeAndGetDb: Start');
    if (dbInstance) {
        console.log('[DB] initializeAndGetDb: Returning existing instance');
        return dbInstance;
    }
    console.log('[DB] initializeAndGetDb: Opening database...');
    const db = await open({
        filename: DB_FILE_PATH,
        driver: sqlite3.Database
    });
    console.log('[DB] initializeAndGetDb: Database opened.');
    console.log('[DB] initializeAndGetDb: Executing CREATE TABLE statements...');
    await db.exec(`
        CREATE TABLE IF NOT EXISTS kv ( 
            key TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS users ( 
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE,
            nickname TEXT UNIQUE,
            isAdmin BOOLEAN,
            strategyLevel INTEGER,
            strategyXp INTEGER,
            playfulLevel INTEGER,
            playfulXp INTEGER,
            gold INTEGER,
            diamonds INTEGER,
            inventory TEXT,
            equipment TEXT,
            stats TEXT,
            inventorySlots TEXT,
            actionPoints TEXT,
            lastActionPointUpdate INTEGER,
            mannerScore INTEGER,
            mail TEXT,
            quests TEXT,
            chatBanUntil INTEGER,
            connectionBanUntil INTEGER,
            avatarId TEXT,
            borderId TEXT,
            previousSeasonTier TEXT,
            seasonHistory TEXT,
            baseStats TEXT,
            spentStatPoints TEXT,
            actionPointPurchasesToday INTEGER,
            lastActionPointPurchaseDate INTEGER,
            dailyShopPurchases TEXT,
            tournamentScore INTEGER,
            league TEXT,
            mannerMasteryApplied BOOLEAN,
            pendingPenaltyNotification TEXT,
            lastNeighborhoodPlayedDate INTEGER,
            dailyNeighborhoodWins INTEGER,
            neighborhoodRewardClaimed BOOLEAN,
            lastNeighborhoodTournament TEXT,
            lastNationalPlayedDate INTEGER,
            dailyNationalWins INTEGER,
            nationalRewardClaimed BOOLEAN,
            lastNationalTournament TEXT,
            lastWorldPlayedDate INTEGER,
            dailyWorldWins INTEGER,
            worldRewardClaimed BOOLEAN,
            lastWorldTournament TEXT,
            weeklyCompetitors TEXT,
            lastWeeklyCompetitorsUpdate INTEGER,
            lastLeagueUpdate INTEGER,
            ownedBorders TEXT,
            equipmentPresets TEXT,
            mbti TEXT,
            isMbtiPublic BOOLEAN,
            monthlyGoldBuffExpiresAt INTEGER,
            singlePlayerProgress INTEGER,
            bonusStatPoints INTEGER,
            inventorySlotsMigrated BOOLEAN,
            blacksmithLevel INTEGER,
            blacksmithXp INTEGER
        );

        CREATE TABLE IF NOT EXISTS user_credentials ( 
            username TEXT PRIMARY KEY,
            passwordHash TEXT,
            userId TEXT
        );

        CREATE TABLE IF NOT EXISTS live_games ( 
            id TEXT PRIMARY KEY,
            mode TEXT,
            description TEXT,
            player1 TEXT,
            player2 TEXT,
            blackPlayerId TEXT,
            whitePlayerId TEXT,
            gameStatus TEXT,
            currentPlayer INTEGER,
            boardState TEXT,
            moveHistory TEXT,
            captures TEXT,
            baseStoneCaptures TEXT,
            hiddenStoneCaptures TEXT,
            winner INTEGER,
            winReason TEXT,
            finalScores TEXT,
            createdAt INTEGER,
            lastMove TEXT,
            passCount INTEGER,
            koInfo TEXT,
            winningLine TEXT,
            statsUpdated BOOLEAN,
            summary TEXT,
            animation TEXT,
            blackTimeLeft REAL,
            whiteTimeLeft REAL,
            blackByoyomiPeriodsLeft INTEGER,
            whiteByoyomiPeriodsLeft INTEGER,
            turnDeadline REAL,
            turnStartTime REAL,
            disconnectionState TEXT,
            disconnectionCounts TEXT,
            noContestInitiatorIds TEXT,
            currentActionButtons TEXT,
            actionButtonCooldownDeadline TEXT,
            actionButtonUses TEXT,
            maxActionButtonUses INTEGER,
            actionButtonUsedThisCycle TEXT,
            mannerScoreChanges TEXT,
            nigiri TEXT,
            guessDeadline REAL,
            bids TEXT,
            biddingRound INTEGER,
            captureBidDeadline REAL,
            effectiveCaptureTargets TEXT,
            baseStones TEXT,
            baseStones_p1 TEXT,
            baseStones_p2 TEXT,
            basePlacementDeadline REAL,
            komiBids TEXT,
            komiBiddingDeadline REAL,
            komiBiddingRound INTEGER,
            komiBidRevealProcessed BOOLEAN,
            finalKomi REAL,
            hiddenMoves TEXT,
            scans_p1 INTEGER,
            scans_p2 INTEGER,
            revealedStones TEXT,
            revealedHiddenMoves TEXT,
            newlyRevealed TEXT,
            justCaptured TEXT,
            hidden_stones_used_p1 INTEGER,
            hidden_stones_used_p2 INTEGER,
            pendingCapture TEXT,
            permanentlyRevealedStones TEXT,
            missiles_p1 INTEGER,
            missiles_p2 INTEGER,
            missileUsedThisTurn BOOLEAN,
            rpsState TEXT,
            rpsRound INTEGER,
            dice TEXT,
            stonesToPlace INTEGER,
            turnOrderRolls TEXT,
            turnOrderRollReady TEXT,
            turnOrderRollResult TEXT,
            turnOrderRollDeadline REAL,
            turnOrderAnimationEndTime REAL,
            turnChoiceDeadline REAL,
            turnChooserId TEXT,
            turnChoices TEXT,
            turnSelectionTiebreaker TEXT,
            diceRollHistory TEXT,
            diceRoundSummary TEXT,
            lastWhiteGroupInfo TEXT,
            diceGoItemUses TEXT,
            diceGoBonuses TEXT,
            diceCapturesThisTurn INTEGER,
            diceLastCaptureStones TEXT,
            round INTEGER,
            isDeathmatch BOOLEAN,
            turnInRound INTEGER,
            scores TEXT,
            thiefPlayerId TEXT,
            policePlayerId TEXT,
            roleChoices TEXT,
            roleChoiceWinnerId TEXT,
            thiefRoundSummary TEXT,
            thiefDiceRollHistory TEXT,
            thiefCapturesThisRound INTEGER,
            alkkagiStones TEXT,
            alkkagiStones_p1 TEXT,
            alkkagiStones_p2 TEXT,
            alkkagiTurnDeadline REAL,
            alkkagiPlacementDeadline REAL,
            alkkagiItemUses TEXT,
            activeAlkkagiItems TEXT,
            alkkagiRound INTEGER,
            alkkagiRefillsUsed TEXT,
            alkkagiStonesPlacedThisRound TEXT,
            alkkagiRoundSummary TEXT,
            curlingStones TEXT,
            curlingTurnDeadline REAL,
            curlingScores TEXT,
            curlingRound INTEGER,
            curlingRoundSummary TEXT,
            curlingItemUses TEXT,
            activeCurlingItems TEXT,
            hammerPlayerId TEXT,
            isTiebreaker BOOLEAN,
            tiebreakerStonesThrown INTEGER,
            stonesThrownThisRound TEXT,
            preGameConfirmations TEXT,
            roundEndConfirmations TEXT,
            rematchRejectionCount TEXT,
            timeoutFouls TEXT,
            curlingStonesLostToFoul TEXT,
            foulInfo TEXT,
            isAnalyzing BOOLEAN,
            analysisResult TEXT,
            previousAnalysisResult TEXT,
            settings TEXT,
            canRequestNoContest TEXT,
            pausedTurnTimeLeft REAL,
            itemUseDeadline REAL,
            lastTimeoutPlayerId TEXT,
            lastTimeoutPlayerIdClearTime REAL,
            revealAnimationEndTime REAL,
            revealEndTime REAL,
            isAiGame BOOLEAN,
            aiTurnStartTime REAL,
            mythicBonuses TEXT,
            lastPlayfulGoldCheck TEXT,
            pendingSystemMessages TEXT
        );
    `);
    console.log('[DB] initializeAndGetDb: CREATE TABLE statements executed.');
    console.log('[DB] initializeAndGetDb: Starting MIGRATION LOGIC...');
    await db.exec(`
        CREATE TABLE IF NOT EXISTS schema_version ( 
            version INTEGER
        );
    `);
    console.log('[DB] initializeAndGetDb: schema_version table created/ensured.');
    const versionRow = await db.get('SELECT version FROM schema_version');
    console.log(`[DB] initializeAndGetDb: Fetched schema version: ${versionRow?.version}`);
    let version = versionRow ? versionRow.version : 0;
    if (!versionRow) {
        console.log('[DB] initializeAndGetDb: No schema version found, inserting version 1.');
        await db.run('INSERT INTO schema_version (version) VALUES (1)');
        version = 1;
    }
    for (let v = version + 1; v <= Math.max(...Object.keys(migrations).map(Number)); v++) {
        if (migrations[v]) {
            console.log(`[DB] Running migration version ${v}...`);
            const statements = migrations[v].split(';').filter(s => s.trim());
            for (const statement of statements) {
                try {
                    console.log(`[DB] Migration ${v}: Executing statement: ${statement}`);
                    await db.exec(statement);
                }
                catch (e) {
                    if (e.message.includes('duplicate column name')) {
                        console.warn(`[DB] Column in migration ${v} already exists, skipping.`);
                    }
                    else {
                        console.error(`[DB] Migration ${v} failed:`, e);
                        throw e;
                    }
                }
            }
            console.log(`[DB] Migration ${v}: Updating schema version to ${v}`);
            await db.run('UPDATE schema_version SET version = ?', v);
            console.log(`[DB] Migration ${v} complete.`);
        }
    }
    console.log('[DB] initializeAndGetDb: MIGRATION LOGIC finished.');
    console.log('[DB] initializeAndGetDb: Starting Manual verification...');
    try {
        console.log('[DB] Manual verification: Verifying users table columns...');
        const usersColumns = await db.all("PRAGMA table_info(users)");
        if (!usersColumns.some(col => col.name === 'connectionBanUntil')) {
            console.log('[DB] Verification: connectionBanUntil column is missing. Adding it now.');
            await db.exec('ALTER TABLE users ADD COLUMN connectionBanUntil INTEGER;');
        }
        if (!usersColumns.some(col => col.name === 'blacksmithLevel')) {
            console.log('[DB] Verification: blacksmithLevel column is missing. Adding it now.');
            await db.exec('ALTER TABLE users ADD COLUMN blacksmithLevel INTEGER;');
        }
        if (!usersColumns.some(col => col.name === 'blacksmithXp')) {
            console.log('[DB] Verification: blacksmithXp column is missing. Adding it now.');
            await db.exec('ALTER TABLE users ADD COLUMN blacksmithXp INTEGER;');
        }
        if (!usersColumns.some(col => col.name === 'inventorySlotsMigrated')) {
            console.log('[DB] Verification: inventorySlotsMigrated column is missing. Adding it now.');
            await db.exec('ALTER TABLE users ADD COLUMN inventorySlotsMigrated BOOLEAN;');
        }
        console.log('[DB] Manual verification: Verifying live_games table columns...');
        const liveGamesColumns = await db.all("PRAGMA table_info(live_games)");
        const liveGamesColumnNames = liveGamesColumns.map(c => c.name);
        const criticalLiveGameColumns = [
            'mannerScoreChanges',
            'activeCurlingItems', // This was misspelled in a previous migration
            'alkkagiStones', // Representative of the alkkagi update
            'preGameConfirmations' // Representative of the pre-game update
        ];
        for (const col of criticalLiveGameColumns) {
            if (!liveGamesColumnNames.includes(col)) {
                console.log(`[DB] Verification: Column '${col}' is missing in 'live_games'. Adding it.`);
                await db.exec(`ALTER TABLE live_games ADD COLUMN ${col} TEXT;`);
            }
        }
        console.log('[DB] Manual verification: Finished.');
    }
    catch (e) {
        if (!e.message.includes('no such table')) {
            console.error('[DB] Error during manual column verification:', e);
        }
    }
    console.log('[DB] initializeAndGetDb: Setting dbInstance...');
    dbInstance = db;
    console.log('[DB] initializeAndGetDb: Finished.');
    return dbInstance;
};
export const getDb = async () => {
    return dbInstance ?? initializeAndGetDb();
};
