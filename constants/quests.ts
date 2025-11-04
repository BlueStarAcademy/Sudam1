import { Quest, QuestReward } from '../types.js';

export const DAILY_QUESTS: Omit<Quest, 'id' | 'progress' | 'isClaimed'>[] = [
    { title: '출석하기', description: '게임에 접속하여 출석체크하기', target: 1, reward: { gold: 50 }, activityPoints: 10 },
    { title: '채팅창에 인사하기', description: '채팅으로 다른 유저에게 인사하기', target: 1, reward: { gold: 50 }, activityPoints: 10 },
    { title: '전략바둑 플레이하기', description: '전략바둑 5회 플레이', target: 5, reward: { gold: 200 }, activityPoints: 10 },
    { title: '놀이바둑 플레이하기', description: '놀이바둑 5회 플레이', target: 5, reward: { gold: 200 }, activityPoints: 10 },
    { title: '전략바둑 승리하기', description: '전략바둑 3회 승리', target: 3, reward: { gold: 200 }, activityPoints: 10 },
    { title: '놀이바둑 승리하기', description: '놀이바둑 3회 승리', target: 3, reward: { gold: 200 }, activityPoints: 10 },
    { title: '액션버튼 사용하기', description: '액션버튼 3회 사용', target: 3, reward: { gold: 100 }, activityPoints: 10 },
    { title: '자동대국 토너먼트 완료하기', description: '자동대국 토너먼트 1회 완료', target: 1, reward: { gold: 100 }, activityPoints: 10 },
    { title: '장비 강화시도', description: '장비 강화 1회 시도', target: 1, reward: { gold: 300 }, activityPoints: 10 },
    { title: '재료 합성시도', description: '재료 1회 합성/분해', target: 1, reward: { gold: 300 }, activityPoints: 10 },
];

export const WEEKLY_QUESTS: Omit<Quest, 'id' | 'progress' | 'isClaimed'>[] = [
    { title: '출석하기', description: '주 5회 출석하기', target: 5, reward: { gold: 500 }, activityPoints: 10 },
    { title: '전략바둑 플레이하기', description: '전략바둑 30회 플레이', target: 30, reward: { gold: 500 }, activityPoints: 15 },
    { title: '놀이바둑 플레이하기', description: '놀이바둑 30회 플레이', target: 30, reward: { gold: 500 }, activityPoints: 15 },
    { title: '전략바둑 승리하기', description: '전략바둑 15회 승리', target: 15, reward: { gold: 1000 }, activityPoints: 15 },
    { title: '놀이바둑 승리하기', description: '놀이바둑 15회 승리', target: 15, reward: { gold: 1000 }, activityPoints: 15 },
    { title: '자동대국 토너먼트 참여하기', description: '자동대국 토너먼트 9회 참여', target: 9, reward: { gold: 1000 }, activityPoints: 15 },
    { title: '일일퀘스트 활약도100보상 받기(3/3)', description: '일일퀘스트 활약도 100 보상 3회 받기', target: 3, reward: { gold: 1000 }, activityPoints: 15 },
];

export const MONTHLY_QUESTS: Omit<Quest, 'id' | 'progress' | 'isClaimed'>[] = [
    { title: '출석하기', description: '월 10회 출석하기', target: 10, reward: { gold: 1000 }, activityPoints: 10 },
    { title: '전략바둑 플레이하기', description: '전략바둑 50회 플레이', target: 50, reward: { gold: 2000 }, activityPoints: 20 },
    { title: '놀이바둑 플레이하기', description: '놀이바둑 50회 플레이', target: 50, reward: { gold: 2000 }, activityPoints: 20 },
    { title: '일일 퀘스트 활약도100 보상받기 10회', description: '일일퀘스트 활약도 100 보상 10회 받기', target: 10, reward: { gold: 3000 }, activityPoints: 25 },
    { title: '주간퀘스트 활약도100보상 받기(2/2)', description: '주간퀘스트 활약도 100 보상 2회 받기', target: 2, reward: { gold: 3000 }, activityPoints: 25 },
];

export const DAILY_MILESTONE_THRESHOLDS = [20, 40, 60, 80, 100];
export const WEEKLY_MILESTONE_THRESHOLDS = [20, 40, 60, 80, 100];
export const MONTHLY_MILESTONE_THRESHOLDS = [20, 40, 60, 80, 100];

export const DAILY_MILESTONE_REWARDS: QuestReward[] = [
    { items: [{ itemId: '골드 꾸러미1', quantity: 1 }] },
    { items: [{ itemId: '골드 꾸러미2', quantity: 1 }] },
    { items: [{ itemId: '재료 상자 I', quantity: 1 }] },
    { items: [{ itemId: '장비 상자 I', quantity: 1 }] },
    { items: [{ itemId: '다이아 꾸러미1', quantity: 1 }] },
];

export const WEEKLY_MILESTONE_REWARDS: QuestReward[] = [
    { items: [{ itemId: '골드 꾸러미2', quantity: 1 }] },
    { items: [{ itemId: '골드 꾸러미3', quantity: 1 }] },
    { items: [{ itemId: '재료 상자 II', quantity: 1 }] },
    { items: [{ itemId: '장비 상자 II', quantity: 1 }] },
    { items: [{ itemId: '다이아 꾸러미2', quantity: 1 }] },
];

export const MONTHLY_MILESTONE_REWARDS: QuestReward[] = [
    { items: [{ itemId: '골드 꾸러미3', quantity: 1 }] },
    { items: [{ itemId: '골드 꾸러미4', quantity: 1 }] },
    { items: [{ itemId: '재료 상자 III', quantity: 1 }] },
    { items: [{ itemId: '장비 상자 III', quantity: 1 }] },
    { items: [{ itemId: '다이아 꾸러미3', quantity: 1 }] },
];
