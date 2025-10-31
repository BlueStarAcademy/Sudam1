import { LeagueTier, QuestReward, LeagueRewardTier } from '../types.js';

export const LEAGUE_DATA: { tier: LeagueTier, name: string, scoreThreshold: number, icon: string }[] = [
    { tier: LeagueTier.Sprout, name: '새싹 리그', scoreThreshold: 0, icon: '/images/tire/auto1.png' },
    { tier: LeagueTier.Rookie, name: '루키 리그', scoreThreshold: 1300, icon: '/images/tire/auto2.png' },
    { tier: LeagueTier.Rising, name: '라이징 리그', scoreThreshold: 1400, icon: '/images/tire/auto3.png' },
    { tier: LeagueTier.Ace, name: '에이스 리그', scoreThreshold: 1500, icon: '/images/tire/auto4.png' },
    { tier: LeagueTier.Diamond, name: '다이아 리그', scoreThreshold: 1600, icon: '/images/tire/auto5.png' },
    { tier: LeagueTier.Master, name: '마스터 리그', scoreThreshold: 1700, icon: '/images/tire/auto6.png' },
    { tier: LeagueTier.Grandmaster, name: '그랜드마스터 리그', scoreThreshold: 1800, icon: '/images/tire/auto7.png' },
    { tier: LeagueTier.Challenger, name: '챌린저 리그', scoreThreshold: 2000, icon: '/images/tire/auto8.png' },
];

export const LEAGUE_WEEKLY_REWARDS: Record<LeagueTier, LeagueRewardTier[]> = {
    [LeagueTier.Sprout]: [
        { rankStart: 1, rankEnd: 1, diamonds: 50, outcome: 'promote' },
        { rankStart: 2, rankEnd: 2, diamonds: 30, outcome: 'promote' },
        { rankStart: 3, rankEnd: 3, diamonds: 15, outcome: 'promote' },
        { rankStart: 4, rankEnd: 16, diamonds: 5, outcome: 'maintain' },
    ],
    [LeagueTier.Rookie]: [
        { rankStart: 1, rankEnd: 1, diamonds: 65, outcome: 'promote' },
        { rankStart: 2, rankEnd: 2, diamonds: 40, outcome: 'promote' },
        { rankStart: 3, rankEnd: 3, diamonds: 25, outcome: 'promote' },
        { rankStart: 4, rankEnd: 13, diamonds: 15, outcome: 'maintain' },
        { rankStart: 14, rankEnd: 16, diamonds: 5, outcome: 'demote' },
    ],
    [LeagueTier.Rising]: [
        { rankStart: 1, rankEnd: 1, diamonds: 80, outcome: 'promote' },
        { rankStart: 2, rankEnd: 2, diamonds: 50, outcome: 'promote' },
        { rankStart: 3, rankEnd: 3, diamonds: 35, outcome: 'promote' },
        { rankStart: 4, rankEnd: 13, diamonds: 20, outcome: 'maintain' },
        { rankStart: 14, rankEnd: 16, diamonds: 10, outcome: 'demote' },
    ],
    [LeagueTier.Ace]: [
        { rankStart: 1, rankEnd: 1, diamonds: 95, outcome: 'promote' },
        { rankStart: 2, rankEnd: 2, diamonds: 60, outcome: 'promote' },
        { rankStart: 3, rankEnd: 3, diamonds: 45, outcome: 'promote' },
        { rankStart: 4, rankEnd: 13, diamonds: 25, outcome: 'maintain' },
        { rankStart: 14, rankEnd: 16, diamonds: 15, outcome: 'demote' },
    ],
    [LeagueTier.Diamond]: [
        { rankStart: 1, rankEnd: 1, diamonds: 110, outcome: 'promote' },
        { rankStart: 2, rankEnd: 2, diamonds: 70, outcome: 'promote' },
        { rankStart: 3, rankEnd: 3, diamonds: 55, outcome: 'promote' },
        { rankStart: 4, rankEnd: 13, diamonds: 30, outcome: 'maintain' },
        { rankStart: 14, rankEnd: 16, diamonds: 20, outcome: 'demote' },
    ],
    [LeagueTier.Master]: [
        { rankStart: 1, rankEnd: 1, diamonds: 125, outcome: 'promote' },
        { rankStart: 2, rankEnd: 2, diamonds: 80, outcome: 'promote' },
        { rankStart: 3, rankEnd: 3, diamonds: 65, outcome: 'promote' },
        { rankStart: 4, rankEnd: 13, diamonds: 35, outcome: 'maintain' },
        { rankStart: 14, rankEnd: 16, diamonds: 25, outcome: 'demote' },
    ],
    [LeagueTier.Grandmaster]: [
        { rankStart: 1, rankEnd: 1, diamonds: 150, outcome: 'promote' },
        { rankStart: 2, rankEnd: 2, diamonds: 100, outcome: 'promote' },
        { rankStart: 3, rankEnd: 3, diamonds: 80, outcome: 'promote' },
        { rankStart: 4, rankEnd: 13, diamonds: 50, outcome: 'maintain' },
        { rankStart: 14, rankEnd: 16, diamonds: 35, outcome: 'demote' },
    ],
    [LeagueTier.Challenger]: [
        { rankStart: 1, rankEnd: 1, diamonds: 200, outcome: 'promote' }, // Stays in Challenger
        { rankStart: 2, rankEnd: 2, diamonds: 125, outcome: 'promote' }, // Stays in Challenger
        { rankStart: 3, rankEnd: 3, diamonds: 100, outcome: 'promote' }, // Stays in Challenger
        { rankStart: 4, rankEnd: 13, diamonds: 75, outcome: 'maintain' },
        { rankStart: 14, rankEnd: 16, diamonds: 50, outcome: 'demote' },
    ],
};

export const RANKING_TIERS: { name: string; icon: string; color: string; threshold: (rank: number, total: number) => boolean; }[] = [
    { name: '챌린저', icon: '/images/tire/tire9.png', color: 'text-cyan-400', threshold: (rank, total) => rank / total <= 0.001 },
    { name: '마스터', icon: '/images/tire/tire8.png', color: 'text-purple-400', threshold: (rank, total) => rank / total <= 0.03 },
    { name: '다이아', icon: '/images/tire/tire7.png', color: 'text-blue-400', threshold: (rank, total) => rank / total <= 0.05 },
    { name: '플래티넘', icon: '/images/tire/tire6.png', color: 'text-teal-400', threshold: (rank, total) => rank / total <= 0.10 },
    { name: '골드', icon: '/images/tire/tire5.png', color: 'text-yellow-400', threshold: (rank, total) => rank / total <= 0.25 },
    { name: '실버', icon: '/images/tire/tire4.png', color: 'text-gray-300', threshold: (rank, total) => rank / total <= 0.40 },
    { name: '브론즈', icon: '/images/tire/tire3.png', color: 'text-orange-400', threshold: (rank, total) => rank / total <= 0.60 },
    { name: '루키', icon: '/images/tire/tire2.png', color: 'text-green-400', threshold: (rank, total) => rank / total <= 0.80 },
    { name: '새싹', icon: '/images/tire/tire1.png', color: 'text-green-200', threshold: () => true },
];

export const SEASONAL_TIER_REWARDS: Record<string, QuestReward> = {
    '새싹': { diamonds: 100, items: [{ itemId: '장비 상자 I', quantity: 1 }, { itemId: '재료 상자 I', quantity: 1 }, { itemId: '골드 꾸러미1', quantity: 1 }] },
    '루키': { diamonds: 150, items: [{ itemId: '장비 상자 I', quantity: 1 }, { itemId: '재료 상자 II', quantity: 1 }, { itemId: '골드 꾸러미2', quantity: 1 }] },
    '브론즈': { diamonds: 200, items: [{ itemId: '장비 상자 II', quantity: 1 }, { itemId: '재료 상자 II', quantity: 1 }, { itemId: '골드 꾸러미2', quantity: 1 }] },
    '실버': { diamonds: 350, items: [{ itemId: '장비 상자 II', quantity: 1 }, { itemId: '재료 상자 III', quantity: 1 }, { itemId: '골드 꾸러미3', quantity: 1 }] },
    '골드': { diamonds: 500, items: [{ itemId: '장비 상자 III', quantity: 1 }, { itemId: '재료 상자 III', quantity: 1 }, { itemId: '골드 꾸러미3', quantity: 1 }] },
    '플래티넘': { diamonds: 750, items: [{ itemId: '장비 상자 III', quantity: 1 }, { itemId: '재료 상자 IV', quantity: 1 }, { itemId: '골드 꾸러미4', quantity: 1 }] },
    '다이아': { diamonds: 1000, items: [{ itemId: '장비 상자 IV', quantity: 1 }, { itemId: '재료 상자 IV', quantity: 1 }, { itemId: '골드 꾸러미4', quantity: 1 }] },
    '마스터': { diamonds: 1500, items: [{ itemId: '장비 상자 IV', quantity: 1 }, { itemId: '재료 상자 IV', quantity: 1 }, { itemId: '골드 꾸러미4', quantity: 1 }] },
    '챌린저': { diamonds: 2000, items: [{ itemId: '장비 상자 V', quantity: 1 }, { itemId: '재료 상자 V', quantity: 1 }, { itemId: '골드 꾸러미4', quantity: 1 }] },
};
