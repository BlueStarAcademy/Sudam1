import { CoreStat, LeagueTier } from '../types.js';
import { randomUUID } from 'crypto';
import { SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES, BOT_NAMES, AVATAR_POOL } from '../constants.js';
export const createDefaultBaseStats = () => ({
    [CoreStat.Concentration]: 100,
    [CoreStat.ThinkingSpeed]: 100,
    [CoreStat.Judgment]: 100,
    [CoreStat.Calculation]: 100,
    [CoreStat.CombatPower]: 100,
    [CoreStat.Stability]: 100,
});
export const createDefaultQuests = () => ({
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
export const createDefaultSpentStatPoints = () => ({
    [CoreStat.Concentration]: 0,
    [CoreStat.ThinkingSpeed]: 0,
    [CoreStat.Judgment]: 0,
    [CoreStat.Calculation]: 0,
    [CoreStat.CombatPower]: 0,
    [CoreStat.Stability]: 0,
});
export const createDefaultInventory = () => [];
const allGameModes = [...SPECIAL_GAME_MODES, ...PLAYFUL_GAME_MODES].map(m => m.mode);
export const defaultStats = allGameModes.reduce((acc, mode) => {
    acc[mode] = { wins: 0, losses: 0, rankingScore: 1200 };
    return acc;
}, {});
export const createInitialBotCompetitors = (newUser) => {
    const competitors = [];
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
export const createDefaultUser = (id, username, nickname, isAdmin = false) => {
    const defaultInventory = [];

    if (isAdmin) {
        // Example admin items
        defaultInventory.push(
            { id: `item-${randomUUID()}`, name: '푸른 바람 부채', description: '가볍고 실용적인 대나무 부채입니다.', type: 'equipment', slot: 'fan', quantity: 1, level: 1, isEquipped: false, createdAt: Date.now(), image: '/images/equipments/Fan1.png', grade: 'normal', stars: 0, options: { main: { type: CoreStat.ThinkingSpeed, value: 4, isPercentage: true, display: '사고속도 +4%' }, combatSubs: [], specialSubs: [], mythicSubs: [] } },
            { id: `item-${randomUUID()}`, name: '하급 강화석', description: '장비 강화에 사용되는 기본 재료.', type: 'material', slot: null, quantity: 100, level: 1, isEquipped: false, createdAt: Date.now(), image: '/images/materials/materials1.png', grade: 'normal' },
            { id: `item-${randomUUID()}`, name: '골드 꾸러미1', description: '10 ~ 500 골드 획득', type: 'consumable', slot: null, quantity: 5, level: 1, isEquipped: false, createdAt: Date.now(), image: '/images/Box/GoldBox1.png', grade: 'normal' },
            { id: `item-${randomUUID()}`, name: '장비 상자 I', description: '일반~희귀 등급 장비 획득', type: 'consumable', slot: null, quantity: 3, level: 1, isEquipped: false, createdAt: Date.now(), image: '/images/Box/EquipmentBox1.png', grade: 'normal' },
            { id: `item-${randomUUID()}`, name: '신비의 강화석', description: '장비 강화에 사용되는 고대 재료.', type: 'material', slot: null, quantity: 10, level: 1, isEquipped: false, createdAt: Date.now(), image: '/images/materials/materials5.png', grade: 'legendary' },
        );
    }

    const user = {
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
        inventory: defaultInventory,
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
        tournamentScore: 1200,
        league: LeagueTier.Sprout,
        weeklyCompetitors: [],
        lastWeeklyCompetitorsUpdate: 0,
        lastLeagueUpdate: 0,
        monthlyGoldBuffExpiresAt: 0,
        mbti: null,
        isMbtiPublic: false,
        singlePlayerProgress: 0,
        bonusStatPoints: 0,
        blacksmithLevel: 1,
        blacksmithXp: 0,
        cumulativeRankingScore?: Record<string, number>;
        inventorySlotsMigrated?: boolean;
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
export const getInitialState = () => {
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
};
