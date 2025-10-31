import { GameMode } from './enums.js';

export interface Stage {
    id: string;
    name: string;
    gameMode: GameMode;
    actionPointCost: number;
    boardSize: number;
    blackStones: number;
    whiteStones: number;
    blackPatternStones: number;
    whitePatternStones: number;
    aiBotSetting: string;
    firstClearReward: string;
    firstClearExp: number;
    repeatClearReward: string;
    repeatClearExp: number;
}

export interface TrainingAssignment {
    id: string;
    name: string;
    unlockStage: string;
    productionRate: number;
    rewardType: 'gold' | 'diamonds';
    rewardAmount: number;
    maxCapacity: number;
    upgradeCost: number;
}
