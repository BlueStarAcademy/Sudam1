// --- Base Enums ---
export enum Player {
  None = 0,
  Black = 1,
  White = 2,
}

export enum GameMode {
  Standard = "클래식 바둑",
  Capture = "따내기 바둑",
  Speed = "스피드 바둑",
  Base = "베이스 바둑",
  Hidden = "히든 바둑",
  Missile = "미사일 바둑",
  Mix = "믹스룰 바둑",
  Dice = "주사위 바둑",
  Omok = "오목",
  Ttamok = "따목",
  Thief = "도둑과 경찰",
  Alkkagi = "알까기",
  Curling = "바둑 컬링",
}



export enum LeagueTier {
    Sprout = '새싹',
    Rookie = '루키',
    Rising = '라이징',
    Ace = '에이스',
    Diamond = '다이아',
    Master = '마스터',
    Grandmaster = '그랜드마스터',
    Challenger = '챌린저',
}

export type GameStatus =
  | 'pending' // Legacy, for direct challenges
  | 'negotiating'
  // Pre-game phases
  | 'nigiri_choosing'
  | 'nigiri_guessing'
  | 'nigiri_reveal'
  | 'base_placement'
  | 'komi_bidding'
  | 'komi_bid_reveal'
  | 'base_game_start_confirmation'
  | 'capture_bidding'
  | 'capture_reveal'
  | 'capture_tiebreaker'
  // Hidden Go Item Usage
  | 'hidden_placing'
  | 'scanning'
  | 'scanning_animating' // New state for scan result animation
  | 'hidden_reveal_animating' // For when a hidden stone contributes to a capture
  | 'hidden_final_reveal'
  // Missile Go
  | 'missile_selecting'
  | 'missile_animating'
  // RPS Minigames for various modes
  | 'dice_rps' | 'dice_rps_reveal'
  | 'thief_rps' | 'thief_rps_reveal'
  | 'alkkagi_rps' | 'alkkagi_rps_reveal'
  | 'curling_rps' | 'curling_rps_reveal'
  | 'omok_rps' | 'omok_rps_reveal'
  | 'ttamok_rps' | 'ttamok_rps_reveal'
  | 'curling_tiebreaker_rps' | 'curling_tiebreaker_rps_reveal'
  // Role/Turn Selection
  | 'turn_preference_selection' // Unified state for choosing turn
  | 'alkkagi_turn_selection'
  | 'curling_turn_selection'
  | 'thief_role_selection'
  | 'thief_role_confirmed'
  | 'thief_role_dice_roll' // Tiebreaker for role choice
  // Alkkagi phases
  | 'alkkagi_placement'
  | 'alkkagi_simultaneous_placement'
  | 'alkkagi_playing'
  | 'alkkagi_animating'
  | 'alkkagi_scoring'
  | 'alkkagi_round_end'
  | 'alkkagi_start_confirmation'
  // Curling phases
  | 'curling_playing'
  | 'curling_animating'
  | 'curling_scoring'
  | 'curling_round_end'
  | 'curling_start_confirmation'
  | 'curling_tiebreaker_preference_selection'
  | 'curling_tiebreaker_playing'
  // Dice Go phases
  | 'dice_turn_rolling' // Players are rolling for turn order
  | 'dice_turn_rolling_animating' // Animation for the turn roll
  | 'dice_turn_choice'
  | 'dice_start_confirmation' // Players confirm to start
  | 'dice_rolling' // Main game turn: rolling dice
  | 'dice_rolling_animating'
  | 'dice_placing' // Main game turn: placing stones
  | 'dice_round_end' // Round summary screen for dice go
  // Thief Go phases
  | 'thief_rolling'
  | 'thief_rolling_animating'
  | 'thief_placing'
  | 'thief_round_end'
  // Main phase
  | 'playing'
  // End-game phases
  | 'scoring' // NEW: For strategic games awaiting analysis
  | 'ended'
  | 'rematch_pending'
  | 'no_contest'
  // Disconnected
  | 'disconnected';


export enum UserStatus {
  Online = 'online',
  Waiting = 'waiting',
  Resting = 'resting',
  Negotiating = 'negotiating',
  InGame = 'in-game',
  Spectating = 'spectating',
}

export type WinReason = 'resign' | 'timeout' | 'disconnect' | 'score' | 'capture_limit' | 'omok_win' | 'thief_captured' | 'police_win' | 'alkkagi_win' | 'curling_win' | 'total_score' | 'dice_win' | 'foul_limit';
export type RPSChoice = 'rock' | 'paper' | 'scissors';
export enum DiceGoVariant {
    Basic = 'basic',
}
export enum AlkkagiPlacementType {
    TurnByTurn = '교대 배치',
    Simultaneous = '일괄 배치',
}
export enum AlkkagiLayoutType {
    Normal = '일반배치',
    Battle = '전투배치',
}

// --- User and Item Enums ---
export type EquipmentSlot = 'fan' | 'board' | 'top' | 'bottom' | 'bowl' | 'stones';
export type InventoryItemType = 'equipment' | 'consumable' | 'material';
export type ItemGrade = 'normal' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export enum CoreStat {
    Concentration = '집중력',
    ThinkingSpeed = '사고속도',
    Judgment = '판단력',
    Calculation = '계산력',
    CombatPower = '전투력',
    Stability = '안정감',
}
export enum SpecialStat {
    ActionPointMax = '행동력 최대치',
    ActionPointRegen = '행동력 회복속도',
    StrategyXpBonus = '전략 경험치 추가획득',
    PlayfulXpBonus = '놀이 경험치 추가획득',
    GoldBonus = '경기 승리시 골드보상 추가',
    ItemDropRate = '장비상자 획득확률 증가',
    MaterialDropRate = '재료상자 획득확률 증가',
}
export enum MythicStat {
    MannerActionCooldown = '매너 액션 버튼 생성시간 감소',
    StrategicGoldBonus = '전략 바둑 경기중 착수시 20%확률로 골드획득(10~50골드) 최대5회',
    PlayfulGoldBonus = '놀이 바둑 경기중 60초마다 20%확률로 골드획득(10~50골드) 최대5회',
    DiceGoOddBonus = '주사위 홀/짝 보너스',
    AlkkagiSlowBonus = '알까기 및 바둑컬링에서 슬로우 아이템 1개추가',
    AlkkagiAimingBonus = '알까기 및 바둑컬링에서 조준선 아이템 1개추가',
}
export type ItemOptionType = CoreStat | SpecialStat | MythicStat;

// --- Tournament Enums ---
export type TournamentType = 'neighborhood' | 'national' | 'world';

export type TournamentSimulationStatus =
  | 'idle'
  | 'enrolled'
  | 'bracket_ready'
  | 'round_in_progress'
  | 'round_complete'
  | 'eliminated'
  | 'complete'
  | 'awaiting_start'
  | 'awaiting_next_round';
export enum SinglePlayerLevel {
    입문 = '입문',
    초급 = '초급',
    중급 = '중급',
    고급 = '고급',
    유단자 = '유단자'
}

// --- Game Primitives ---
export type Point = { x: number; y: number; };
export type Move = { player: Player; x: number; y: number; };
export type BoardState = Player[][];