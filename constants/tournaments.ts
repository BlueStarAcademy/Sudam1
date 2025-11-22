
import { TournamentDefinition, TournamentType, QuestReward } from '../types/index.js';
import { LeagueTier } from '../types/enums.js';

export const TOURNAMENT_DEFINITIONS: Record<TournamentType, TournamentDefinition> = {
    neighborhood: { id: 'neighborhood', name: '동네바둑리그', description: '6인 풀리그 방식으로 진행됩니다. 가장 많은 승리를 거두세요!', format: 'round-robin', players: 6, image: '/images/championship/Champ1.png' },
    national: { id: 'national', name: '전국바둑대회', description: '예선을 거쳐 8강 토너먼트로 최강자를 가립니다.', format: 'tournament', players: 8, image: '/images/championship/Champ2.png' },
    world: { id: 'world', name: '월드챔피언십', description: '세계 각국의 강자들이 모인 16강 토너먼트입니다.', format: 'tournament', players: 16, image: '/images/championship/Champ3.png' },
};

export type TournamentRewardInfo = QuestReward;

// 동네바둑리그 리그별 경기 보상 (승리/패배)
export const NEIGHBORHOOD_MATCH_REWARDS: Record<LeagueTier, { win: number; loss: number }> = {
    [LeagueTier.Sprout]: { win: 100, loss: 50 },
    [LeagueTier.Rookie]: { win: 200, loss: 75 },
    [LeagueTier.Rising]: { win: 300, loss: 100 },
    [LeagueTier.Ace]: { win: 500, loss: 150 },
    [LeagueTier.Diamond]: { win: 1000, loss: 200 },
    [LeagueTier.Master]: { win: 1500, loss: 300 },
    [LeagueTier.Grandmaster]: { win: 2000, loss: 500 },
    [LeagueTier.Challenger]: { win: 3000, loss: 1000 },
};

// 전국바둑대회 리그별 경기 보상 (승리/패배) - 강화석
export const NATIONAL_MATCH_REWARDS: Record<LeagueTier, { win: { materialName: string; quantity: number }; loss: { materialName: string; quantity: number } }> = {
    [LeagueTier.Sprout]: { win: { materialName: '하급 강화석', quantity: 10 }, loss: { materialName: '하급 강화석', quantity: 4 } },
    [LeagueTier.Rookie]: { win: { materialName: '중급 강화석', quantity: 10 }, loss: { materialName: '중급 강화석', quantity: 4 } },
    [LeagueTier.Rising]: { win: { materialName: '중급 강화석', quantity: 20 }, loss: { materialName: '중급 강화석', quantity: 8 } },
    [LeagueTier.Ace]: { win: { materialName: '상급 강화석', quantity: 10 }, loss: { materialName: '상급 강화석', quantity: 4 } },
    [LeagueTier.Diamond]: { win: { materialName: '상급 강화석', quantity: 20 }, loss: { materialName: '상급 강화석', quantity: 8 } },
    [LeagueTier.Master]: { win: { materialName: '최상급 강화석', quantity: 5 }, loss: { materialName: '최상급 강화석', quantity: 2 } },
    [LeagueTier.Grandmaster]: { win: { materialName: '최상급 강화석', quantity: 10 }, loss: { materialName: '최상급 강화석', quantity: 4 } },
    [LeagueTier.Challenger]: { win: { materialName: '신비의 강화석', quantity: 10 }, loss: { materialName: '신비의 강화석', quantity: 4 } },
};

// 월드챔피언십 리그별 경기 보상 (승리/패배) - 장비상자
export const WORLD_MATCH_REWARDS: Record<LeagueTier, { win: { boxName: string; quantity: number }; loss: { boxName: string; quantity: number } }> = {
    [LeagueTier.Sprout]: { win: { boxName: '장비 상자 I', quantity: 2 }, loss: { boxName: '장비 상자 I', quantity: 1 } },
    [LeagueTier.Rookie]: { win: { boxName: '장비 상자 I', quantity: 4 }, loss: { boxName: '장비 상자 I', quantity: 2 } },
    [LeagueTier.Rising]: { win: { boxName: '장비 상자 II', quantity: 2 }, loss: { boxName: '장비 상자 II', quantity: 1 } },
    [LeagueTier.Ace]: { win: { boxName: '장비 상자 II', quantity: 4 }, loss: { boxName: '장비 상자 II', quantity: 2 } },
    [LeagueTier.Diamond]: { win: { boxName: '장비 상자 III', quantity: 2 }, loss: { boxName: '장비 상자 III', quantity: 1 } },
    [LeagueTier.Master]: { win: { boxName: '장비 상자 III', quantity: 4 }, loss: { boxName: '장비 상자 III', quantity: 2 } },
    [LeagueTier.Grandmaster]: { win: { boxName: '장비 상자 IV', quantity: 2 }, loss: { boxName: '장비 상자 IV', quantity: 1 } },
    [LeagueTier.Challenger]: { win: { boxName: '장비 상자 IV', quantity: 4 }, loss: { boxName: '장비 상자 IV', quantity: 2 } },
};

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