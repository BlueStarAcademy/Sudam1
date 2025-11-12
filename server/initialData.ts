import { AppState, User, UserCredentials, QuestLog, DailyQuestData, InventoryItem, CoreStat, GameMode, LeagueTier, WeeklyCompetitor, WeeklyQuestData, MonthlyQuestData } from '../types.js';
import { randomUUID } from 'crypto';
import { SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES, BOT_NAMES, AVATAR_POOL } from '../constants';

export const createDefaultBaseStats = (): Record<CoreStat, number> => ({
    [CoreStat.Concentration]: 100,
    [CoreStat.ThinkingSpeed]: 100,
    [CoreStat.Judgment]: 100,
    [CoreStat.Calculation]: 100,
    [CoreStat.CombatPower]: 100,
    [CoreStat.Stability]: 100,
});

export const createDefaultQuests = (): QuestLog => ({
    daily: {
        quests: [],
        activityProgress: 0,
        claimedMilestones: [false, false, false, false, false],
        lastReset: 0,
    },
    weekly: {
        quests: [],
        activityProgress: 0,
        claimedMilestones: [false, false, false, false, false],
        lastReset: 0,
    },
    monthly: {
        quests: [],
        activityProgress: 0,
        claimedMilestones: [false, false, false, false, false],
        lastReset: 0,
    },
});

export const createDefaultSpentStatPoints = (): Record<CoreStat, number> => ({
    [CoreStat.Concentration]: 0,
    [CoreStat.ThinkingSpeed]: 0,
    [CoreStat.Judgment]: 0,
    [CoreStat.Calculation]: 0,
    [CoreStat.CombatPower]: 0,
    [CoreStat.Stability]: 0,
});

export const createDefaultInventory = (): InventoryItem[] => [];

const allGameModes = [...SPECIAL_GAME_MODES, ...PLAYFUL_GAME_MODES].map(m => m.mode);
export const defaultStats: User['stats'] = allGameModes.reduce((acc, mode) => {
    acc[mode] = { wins: 0, losses: 0, rankingScore: 1200 };
    return acc;
}, {} as Record<GameMode, { wins: number; losses: number; rankingScore: number }>);

export const createInitialBotCompetitors = (newUser: Pick<User, 'league' | 'tournamentScore'>): WeeklyCompetitor[] => {
    const competitors: WeeklyCompetitor[] = [];
    const botNames = [...BOT_NAMES].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < 15; i++) {
        const botAvatar = AVATAR_POOL[Math.floor(Math.random() * AVATAR_POOL.length)];
        competitors.push({
            id: `bot-weekly-${i}-${Date.now()}`,
            nickname: botNames[i % botNames.length],
            avatarId: botAvatar.id,
            borderId: 'default',
            league: newUser.league,
            initialScore: newUser.tournamentScore + Math.floor((Math.random() - 0.5) * 100) 
        });
    }
    return competitors;
};

export const createDefaultUser = (id: string, username: string, nickname: string, isAdmin = false): User => {
    const user: User = {
        id,
        username,
        nickname,
        isAdmin,
        strategyLevel: 1,
        strategyXp: 0,
        playfulLevel: 1,
        playfulXp: 0,
        baseStats: createDefaultBaseStats(),
        spentStatPoints: createDefaultSpentStatPoints(),
        inventory: createDefaultInventory(),
        inventorySlots: { equipment: 30, consumable: 30, material: 30 },
        equipment: {},
        actionPoints: { current: 30, max: 30 },
        lastActionPointUpdate: Date.now(),
        actionPointPurchasesToday: 0,
        lastActionPointPurchaseDate: 0,
        dailyShopPurchases: {},
        gold: 500,
        diamonds: 10,
        mannerScore: 200,
        mannerMasteryApplied: false,
        pendingPenaltyNotification: null,
        mail: [],
        quests: createDefaultQuests(),
        stats: JSON.parse(JSON.stringify(defaultStats)),
        chatBanUntil: 0,
        connectionBanUntil: 0,
        avatarId: 'profile_1',
        borderId: 'default',
        ownedBorders: ['default', 'simple_black'],
        previousSeasonTier: null,
        seasonHistory: {},
        tournamentScore: 0,
        league: LeagueTier.Sprout,
        weeklyCompetitors: [],
        lastWeeklyCompetitorsUpdate: 0,
        lastLeagueUpdate: 0,
        monthlyGoldBuffExpiresAt: 0,
        mbti: null,
        isMbtiPublic: false,
        singlePlayerProgress: 0,
        clearedSinglePlayerStages: [],
        bonusStatPoints: 0,
        blacksmithLevel: 1,
        blacksmithXp: 0,
        cumulativeTournamentScore: 0, // 챔피언십 누적 점수 초기값 0
        equipmentPresets: [
            { name: '프리셋 1', equipment: {} },
            { name: '프리셋 2', equipment: {} },
            { name: '프리셋 3', equipment: {} },
            { name: '프리셋 4', equipment: {} },
            { name: '프리셋 5', equipment: {} },
        ],
    };
    
    const botCompetitors = createInitialBotCompetitors(user);
    user.weeklyCompetitors = [
        {
            id: user.id,
            nickname: user.nickname,
            avatarId: user.avatarId,
            borderId: user.borderId,
            league: user.league,
            initialScore: user.tournamentScore
        },
        ...botCompetitors
    ];
    const now = Date.now();
    user.lastWeeklyCompetitorsUpdate = now;
    user.lastLeagueUpdate = now;

    return user;
};


export const getInitialState = (): Omit<AppState, 'liveGames' | 'singlePlayerGames' | 'towerGames' | 'negotiations' | 'userStatuses' | 'userConnections' | 'userLastChatMessage' | 'waitingRoomChats' | 'gameChats' | 'adminLogs' | 'announcements' | 'globalOverrideAnnouncement' | 'gameModeAvailability' | 'announcementInterval'> => {
    const adminUser = createDefaultUser(`user-admin-${randomUUID()}`, '푸른별바둑학원', '관리자', true);
    const testUser1 = createDefaultUser(`user-test-${randomUUID()}`, '푸른별', '푸른별');
    const testUser2 = createDefaultUser(`user-test-${randomUUID()}`, '노란별', '노란별');
    const testUser3 = createDefaultUser(`user-test-${randomUUID()}`, '녹색별', '녹색별');

    return {
        users: {
            [adminUser.id]: adminUser,
            [testUser1.id]: testUser1,
            [testUser2.id]: testUser2,
            [testUser3.id]: testUser3,
        },
        userCredentials: {
            '푸른별바둑학원': { passwordHash: '1217', userId: adminUser.id },
            '푸른별': { passwordHash: '1217', userId: testUser1.id },
            '노란별': { passwordHash: '1217', userId: testUser2.id },
            '녹색별': { passwordHash: '1217', userId: testUser3.id },
        },
    };
}