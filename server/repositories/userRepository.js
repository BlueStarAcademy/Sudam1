import { rowToUser } from './mappers.js';
export const getAllUsers = async (db) => {
    const rows = await db.all('SELECT * FROM users');
    return rows.map(rowToUser).filter((u) => u !== null);
};
export const getUser = async (db, id) => {
    return rowToUser(await db.get('SELECT * FROM users WHERE id = ?', id));
};
export const getUserByNickname = async (db, nickname) => {
    return rowToUser(await db.get('SELECT * FROM users WHERE LOWER(nickname) = ?', nickname.toLowerCase()));
};
export const createUser = async (db, user) => {
    await db.run(`INSERT INTO users ( 
            id, username, nickname, isAdmin, strategyLevel, strategyXp, playfulLevel, playfulXp, 
            gold, diamonds, inventory, inventorySlots, equipment, actionPoints, lastActionPointUpdate, 
            mannerScore, mail, quests, stats, chatBanUntil, connectionBanUntil, avatarId, borderId, previousSeasonTier, 
            seasonHistory, tournamentScore, league, mannerMasteryApplied, pendingPenaltyNotification,
            lastNeighborhoodPlayedDate, dailyNeighborhoodWins, neighborhoodRewardClaimed, lastNeighborhoodTournament,
            lastNationalPlayedDate, dailyNationalWins, nationalRewardClaimed, lastNationalTournament,
            lastWorldPlayedDate, dailyWorldWins, worldRewardClaimed, lastWorldTournament,
            baseStats, spentStatPoints, actionPointPurchasesToday, lastActionPointPurchaseDate, dailyShopPurchases,
            weeklyCompetitors, lastWeeklyCompetitorsUpdate, lastLeagueUpdate, ownedBorders,
            mbti, isMbtiPublic, monthlyGoldBuffExpiresAt, singlePlayerProgress, bonusStatPoints, blacksmithLevel, blacksmithXp, equipmentPresets
        ) 
         VALUES ( 
            ?, ?, ?, ?, ?, ?, ?, ?, 
            ?, ?, ?, ?, ?, ?, ?, 
            ?, ?, ?, ?, ?, ?, ?, ?, ?, 
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?
         )`, user.id, user.username, user.nickname, user.isAdmin, user.strategyLevel, user.strategyXp, user.playfulLevel, user.playfulXp, user.gold, user.diamonds, JSON.stringify(user.inventory), user.inventorySlots, JSON.stringify(user.equipment), JSON.stringify(user.actionPoints), user.lastActionPointUpdate, user.mannerScore, JSON.stringify(user.mail), JSON.stringify(user.quests), JSON.stringify(user.stats), user.chatBanUntil, user.connectionBanUntil, user.avatarId, user.borderId, user.previousSeasonTier, JSON.stringify(user.seasonHistory), user.tournamentScore, user.league, user.mannerMasteryApplied, user.pendingPenaltyNotification, user.lastNeighborhoodPlayedDate, user.dailyNeighborhoodWins, user.neighborhoodRewardClaimed, JSON.stringify(user.lastNeighborhoodTournament), user.lastNationalPlayedDate, user.dailyNationalWins, user.nationalRewardClaimed, JSON.stringify(user.lastNationalTournament), user.lastWorldPlayedDate, user.dailyWorldWins, user.worldRewardClaimed, JSON.stringify(user.lastWorldTournament), JSON.stringify(user.baseStats), JSON.stringify(user.spentStatPoints), user.actionPointPurchasesToday, user.lastActionPointPurchaseDate, JSON.stringify(user.dailyShopPurchases), JSON.stringify(user.weeklyCompetitors), user.lastWeeklyCompetitorsUpdate, user.lastLeagueUpdate, JSON.stringify(user.ownedBorders), user.mbti, user.isMbtiPublic, user.monthlyGoldBuffExpiresAt, user.singlePlayerProgress, user.bonusStatPoints, user.blacksmithLevel, user.blacksmithXp);
};
export const updateUser = async (db, user) => {
    const columns = [
        'username', 'nickname', 'isAdmin', 'strategyLevel', 'strategyXp', 'playfulLevel', 'playfulXp',
        'gold', 'diamonds', 'inventory', 'inventorySlots', 'equipment', 'actionPoints', 'lastActionPointUpdate',
        'mannerScore', 'mail', 'quests', 'stats', 'chatBanUntil', 'connectionBanUntil', 'avatarId', 'borderId', 'previousSeasonTier',
        'seasonHistory', 'tournamentScore', 'league', 'mannerMasteryApplied', 'pendingPenaltyNotification',
        'lastNeighborhoodPlayedDate', 'dailyNeighborhoodWins', 'neighborhoodRewardClaimed', 'lastNeighborhoodTournament',
        'lastNationalPlayedDate', 'dailyNationalWins', 'nationalRewardClaimed', 'lastNationalTournament',
        'lastWorldPlayedDate', 'dailyWorldWins', 'worldRewardClaimed', 'lastWorldTournament',
        'baseStats', 'spentStatPoints', 'actionPointPurchasesToday', 'lastActionPointPurchaseDate', 'dailyShopPurchases',
        'weeklyCompetitors', 'lastWeeklyCompetitorsUpdate', 'lastLeagueUpdate', 'ownedBorders', 'equipmentPresets', 'monthlyGoldBuffExpiresAt',
        'mbti', 'isMbtiPublic', 'singlePlayerProgress', 'bonusStatPoints',
        'blacksmithLevel', 'blacksmithXp', 'inventorySlotsMigrated' // Added blacksmith fields
    ];
    const values = [];
    for (const col of columns) {
        const key = col;
        const value = user[key];
        if (value === undefined) {
            values.push(null);
        }
        else if (typeof value === 'object' && value !== null) {
            values.push(JSON.stringify(value));
        }
        else if (typeof value === 'boolean') {
            values.push(value ? 1 : 0);
        }
        else {
            values.push(value);
        }
    }
    values.push(user.id);
    const setClause = columns.map(c => `${c} = ?`).join(', ');
    await db.run(`UPDATE users SET ${setClause} WHERE id = ?`, values);
};
export const deleteUser = async (db, id) => {
    await db.run('DELETE FROM users WHERE id = ?', id);
};
