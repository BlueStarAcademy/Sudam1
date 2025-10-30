import { ActionButton, GameMode } from '../types.js';
import type { ItemGrade } from '../types/enums.js';

type CombinationGreatSuccessRates = {
    'normal'?: number;
    'uncommon'?: number;
    'rare'?: number;
    'epic'?: number;
    'legendary'?: number;
    'mythic'?: number;
};

// --- Action Point Costs ---
export const STRATEGIC_ACTION_POINT_COST = 5;
export const PLAYFUL_ACTION_POINT_COST = 3;
export const ACTION_POINT_REGEN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// --- Action Point Purchase Costs ---
export const ACTION_POINT_PURCHASE_COSTS_DIAMONDS = [10, 20, 30, 50, 80, 120, 180, 250, 350, 500];
export const MAX_ACTION_POINT_PURCHASES_PER_DAY = 10;
export const ACTION_POINT_PURCHASE_REFILL_AMOUNT = 30;

// --- Action Buttons by Game Phase ---

// STRATEGIC GAMES
export const STRATEGIC_ACTION_BUTTONS_EARLY: ActionButton[] = [
    { name: '안녕하세요', message: '정중하게 인사를 건넵니다.', type: 'manner' },
    { name: '잘 부탁드립니다', message: '좋은 대국을 기대하며 정중히 부탁합니다.', type: 'manner' },
    { name: '자세 바로잡기', message: '자세를 바로잡고 대국에 집중합니다.', type: 'manner' },
    { name: '헛기침하기', message: '헛기침을 하며 목을 가다듬습니다.', type: 'unmannerly' },
    { name: '다리 꼬기', message: '거만하게 다리를 꼬고 상대를 봅니다.', type: 'unmannerly' },
];

export const STRATEGIC_ACTION_BUTTONS_MID: ActionButton[] = [
    { name: '상대의 묘수 인정', message: '상대의 좋은 수를 인정합니다.', type: 'manner' },
    { name: '차분히 생각', message: '차분하게 다음 수를 생각합니다.', type: 'manner' },
    { name: '다리 떨기', message: '다리를 떨기 시작합니다.', type: 'unmannerly' },
    { name: '바둑돌 만지작', message: '바둑돌을 잘그락거리며 소음을 냅니다.', type: 'unmannerly' },
    { name: '흥얼거리기', message: '콧노래를 부르며 흥얼거립니다.', type: 'unmannerly' },
    { name: '문자하기', message: '휴대폰을 꺼내 문자를 보냅니다.', type: 'unmannerly' },
];

export const STRATEGIC_ACTION_BUTTONS_LATE: ActionButton[] = [
    { name: '끝까지 집중', message: '끝까지 최선을 다해 집중합니다.', type: 'manner' },
    { name: '계가 신청?', message: '슬슬 끝내자는 눈치를 줍니다.', type: 'manner' },
    { name: '한숨 쉬기', message: '깊은 한숨을 내쉬며 불만을 표합니다.', type: 'unmannerly' },
    { name: '하품하기', message: '대국이 지겹다는 듯이 하품을 합니다.', type: 'unmannerly' },
    { name: '통화하기', message: '전화를 받으며 대국에 집중하지 않습니다.', type: 'unmannerly' },
];


// PLAYFUL GAMES
export const PLAYFUL_ACTION_BUTTONS_EARLY: ActionButton[] = [
    { name: '손가락 풀기', message: '결전의 시간을 위해 손가락을 풉니다.', type: 'manner' },
    { name: '기원하기', message: '좋은 결과가 있기를 기원합니다.', type: 'manner' },
    { name: '심호흡', message: '크게 심호흡하며 집중력을 높입니다.', type: 'manner' },
    { name: '약올리기', message: '상대를 약올리는 표정을 짓습니다.', type: 'unmannerly' },
];

export const PLAYFUL_ACTION_BUTTONS_MID: ActionButton[] = [
    { name: '응원하기', message: '좋은 승부를 기대하며 응원합니다.', type: 'manner' },
    { name: '책상 쿵!', message: '책상을 쿵! 치며 상대를 놀라게 합니다.', type: 'unmannerly' },
    { name: '입김 불기', message: '주사위/돌에 입김을 불어넣습니다.', type: 'unmannerly' },
    { name: '안타까워하기', message: '자신의 실수를 안타까워합니다.', type: 'unmannerly' },
];

export const PLAYFUL_ACTION_BUTTONS_LATE: ActionButton[] = [
    { name: '거의 다왔다!', message: '승리가 눈 앞에 있다는 듯 미소짓습니다.', type: 'manner' },
    { name: '초조해하기', message: '초조한 듯 손톱을 물어뜯습니다.', type: 'unmannerly' },
    { name: '상대 실수 기원', message: '상대방이 실수하기를 간절히 기도합니다.', type: 'unmannerly' },
];

// --- No Contest Rules ---
export const NO_CONTEST_MOVE_THRESHOLD = 10;
export const NO_CONTEST_TIME_THRESHOLD_SECONDS = 180;
export const NO_CONTEST_MANNER_PENALTY = 20;
export const NO_CONTEST_RANKING_PENALTY = 50;

// --- Blacksmith XP Gain ---
export const BLACKSMITH_MAX_LEVEL = 20;

export const BLACKSMITH_COMBINATION_XP_GAIN: Record<ItemGrade, [number, number]> = {
    normal: [10, 30],
    uncommon: [20, 50],
    rare: [30, 80],
    epic: [50, 150],
    legendary: [100, 300],
    mythic: [200, 500],
};

export const BLACKSMITH_ENHANCEMENT_XP_GAIN: Record<ItemGrade, [number, number]> = {
    normal: [1, 10],
    uncommon: [5, 20],
    rare: [10, 30],
    epic: [20, 50],
    legendary: [50, 100],
    mythic: [100, 300],
};

export const BLACKSMITH_DISASSEMBLY_XP_GAIN: Record<ItemGrade, [number, number]> = {
    normal: [1, 5],
    uncommon: [5, 10],
    rare: [10, 20],
    epic: [20, 40],
    legendary: [50, 100],
    mythic: [100, 300],
};

export const BLACKSMITH_COMBINABLE_GRADES_BY_LEVEL: ItemGrade[] = [
    'uncommon', // Level 1: 고급 이하 (Uncommon or lower)
    'rare',     // Level 2: 희귀 이하 (Rare or lower)
    'epic',     // Level 3: 에픽 이하 (Epic or lower)
    'legendary',// Level 4: 전설 이하 (Legendary or lower)
    'mythic',   // Level 5: 모든 장비 (All equipment)
    'mythic',   // Level 6
    'mythic',   // Level 7
    'mythic',   // Level 8
    'mythic',   // Level 9
    'mythic',   // Level 10
    'mythic',   // Level 11
    'mythic',   // Level 12
    'mythic',   // Level 13
    'mythic',   // Level 14
    'mythic',   // Level 15
    'mythic',   // Level 16
    'mythic',   // Level 17
    'mythic',   // Level 18
    'mythic',   // Level 19
    'mythic',   // Level 20
];

export const BLACKSMITH_COMBINATION_GREAT_SUCCESS_RATES: CombinationGreatSuccessRates[] = [
    // Level 1
    { 'normal': 50, 'uncommon': 30 },
    // Level 2
    { 'normal': 50, 'uncommon': 30, 'rare': 20 },
    // Level 3
    { 'normal': 50, 'uncommon': 30, 'rare': 20, 'epic': 10 },
    // Level 4
    { 'normal': 50, 'uncommon': 30, 'rare': 20, 'epic': 10, 'legendary': 1 },
    // Level 5
    { 'normal': 50, 'uncommon': 30, 'rare': 20, 'epic': 10, 'legendary': 1.5, 'mythic': 25 },
    // Level 6
    { 'normal': 65, 'uncommon': 40, 'rare': 25, 'epic': 12.5, 'legendary': 2, 'mythic': 30 },
    // Level 7
    { 'normal': 80, 'uncommon': 50, 'rare': 30, 'epic': 15, 'legendary': 2.5, 'mythic': 35 },
    // Level 8
    { 'normal': 95, 'uncommon': 60, 'rare': 35, 'epic': 17.5, 'legendary': 3, 'mythic': 40 },
    // Level 9
    { 'normal': 100, 'uncommon': 70, 'rare': 40, 'epic': 20, 'legendary': 3.5, 'mythic': 45 },
    // Level 10
    { 'normal': 100, 'uncommon': 80, 'rare': 45, 'epic': 22.5, 'legendary': 4, 'mythic': 50 },
    // Level 11
    { 'normal': 100, 'uncommon': 90, 'rare': 50, 'epic': 25, 'legendary': 4.5, 'mythic': 55 },
    // Level 12
    { 'normal': 100, 'uncommon': 100, 'rare': 55, 'epic': 27.5, 'legendary': 5, 'mythic': 60 },
    // Level 13
    { 'normal': 100, 'uncommon': 100, 'rare': 60, 'epic': 30, 'legendary': 5.5, 'mythic': 65 },
    // Level 14
    { 'normal': 100, 'uncommon': 100, 'rare': 65, 'epic': 32.5, 'legendary': 6, 'mythic': 70 },
    // Level 15
    { 'normal': 100, 'uncommon': 100, 'rare': 70, 'epic': 35, 'legendary': 6.5, 'mythic': 75 },
    // Level 16
    { 'normal': 100, 'uncommon': 100, 'rare': 75, 'epic': 37.5, 'legendary': 7, 'mythic': 80 },
    // Level 17
    { 'normal': 100, 'uncommon': 100, 'rare': 80, 'epic': 40, 'legendary': 7.5, 'mythic': 85 },
    // Level 18
    { 'normal': 100, 'uncommon': 100, 'rare': 85, 'epic': 42.5, 'legendary': 8, 'mythic': 90 },
    // Level 19
    { 'normal': 100, 'uncommon': 100, 'rare': 90, 'epic': 45, 'legendary': 8.5, 'mythic': 95 },
    // Level 20
    { 'normal': 100, 'uncommon': 100, 'rare': 100, 'epic': 50, 'legendary': 10, 'mythic': 100 },
];

export const BLACKSMITH_DISASSEMBLY_JACKPOT_RATES: number[] = [
    2, 4, 6, 8, 10, 12, 14, 16, 18, 20,
    22, 24, 26, 28, 30, 32, 34, 36, 38, 40,
];

export const BLACKSMITH_XP_REQUIRED_FOR_LEVEL_UP = (level: number): number => {
    if (level < 1) return 0; // No XP needed for level 0 or less
    if (level >= BLACKSMITH_MAX_LEVEL) return Infinity; // Max level, no more XP needed
    return level * 10000;
};