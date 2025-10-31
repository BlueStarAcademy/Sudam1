
import { TournamentDefinition, TournamentType, QuestReward } from '../types.js';

export const TOURNAMENT_DEFINITIONS: Record<TournamentType, TournamentDefinition> = {
    neighborhood: { id: 'neighborhood', name: '동네바둑리그', description: '6인 풀리그 방식으로 진행됩니다. 가장 많은 승리를 거두세요!', format: 'round-robin', players: 6, image: '/images/Champ1.png' },
    national: { id: 'national', name: '전국바둑대회', description: '예선을 거쳐 8강 토너먼트로 최강자를 가립니다.', format: 'tournament', players: 8, image: '/images/Champ2.png' },
    world: { id: 'world', name: '월드챔피언십', description: '세계 각국의 강자들이 모인 16강 토너먼트입니다.', format: 'tournament', players: 16, image: '/images/Champ3.png' },
};

export type TournamentRewardInfo = QuestReward;

export const BASE_TOURNAMENT_REWARDS: Record<TournamentType, { rewardType: 'rank', rewards: Record<number, TournamentRewardInfo> }> = {
    neighborhood: { // 6인 풀리그, key = rank
        rewardType: 'rank',
        rewards: {
            1: { items: [{ itemId: '골드 꾸러미4', quantity: 1 }, { itemId: '다이아 꾸러미1', quantity: 1 }] }, // 우승
            2: { items: [{ itemId: '골드 꾸러미3', quantity: 1 }] }, // 준우승
            3: { items: [{ itemId: '골드 꾸러미2', quantity: 1 }] }, // 3위
            4: { items: [{ itemId: '골드 꾸러미1', quantity: 1 }] }, // 4-6위
        }
    },
    national: { // 8강 토너먼트, key = rank
        rewardType: 'rank',
        rewards: {
            1: { items: [{ itemId: '골드 꾸러미4', quantity: 1 }, { itemId: '다이아 꾸러미2', quantity: 1 }] }, // 우승
            2: { items: [{ itemId: '골드 꾸러미3', quantity: 1 }, { itemId: '다이아 꾸러미1', quantity: 1 }] }, // 준우승
            3: { items: [{ itemId: '골드 꾸러미2', quantity: 1 }, { itemId: '다이아 꾸러미1', quantity: 1 }] }, // 3위
            4: { items: [{ itemId: '골드 꾸러미1', quantity: 1 }, { itemId: '다이아 꾸러미1', quantity: 1 }] }, // 4위
            5: { items: [{ itemId: '골드 꾸러미1', quantity: 1 }] },   // 5-8위 (8강 탈락)
        }
    },
    world: { // 16강 토너먼트, key = rank
        rewardType: 'rank',
        rewards: {
            1: { items: [{ itemId: '골드 꾸러미4', quantity: 1 }, { itemId: '다이아 꾸러미3', quantity: 1 }] }, // 우승
            2: { items: [{ itemId: '골드 꾸러미3', quantity: 1 }, { itemId: '다이아 꾸러미2', quantity: 1 }] }, // 준우승
            3: { items: [{ itemId: '골드 꾸러미3', quantity: 1 }, { itemId: '다이아 꾸러미1', quantity: 1 }] }, // 3위
            4: { items: [{ itemId: '골드 꾸러미2', quantity: 1 }, { itemId: '다이아 꾸러미1', quantity: 1 }] }, // 4위
            5: { items: [{ itemId: '골드 꾸러미1', quantity: 1 }, { itemId: '다이아 꾸러미1', quantity: 1 }] },  // 5-8위 (8강 탈락)
            9: { items: [{ itemId: '골드 꾸러미1', quantity: 1 }] },   // 9-16위 (16강 탈락)
        }
    }
};

export const TOURNAMENT_SCORE_REWARDS: Record<TournamentType, Record<number, number>> = {
    neighborhood: { 1: 32, 2: 16, 3: 8, 4: 5, 5: 3, 6: 1 },
    national:     { 1: 46, 2: 29, 3: 15, 4: 7, 5: 2 },
    world:        { 1: 58, 2: 44, 3: 21, 4: 11, 5: 5, 9: 3 },
};