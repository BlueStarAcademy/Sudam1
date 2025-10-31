import { Player, GameMode, LeagueTier, UserStatus, WinReason, RPSChoice, DiceGoVariant, AlkkagiPlacementType, AlkkagiLayoutType, Point, Move, BoardState, EquipmentSlot, InventoryItemType, ItemGrade, CoreStat, ItemOptionType, TournamentType, TournamentSimulationStatus, GameStatus, SinglePlayerLevel } from './enums.js';
// FIX: ChatMessage is now defined in api.ts to break circular dependency.
import { UserStatusInfo, ChatMessage } from './api.js';

// --- Item & Equipment ---
export type Equipment = Partial<Record<EquipmentSlot, string>>;

export type ItemOption = {
  type: ItemOptionType;
  value: number;
  baseValue?: number;
  isPercentage: boolean;
  tier?: number; // For special stats
  display: string;
  range?: [number, number];
  enhancements?: number;
};

export type ItemOptions = {
  main: ItemOption;
  combatSubs: ItemOption[];
  specialSubs: ItemOption[];
  mythicSubs: ItemOption[];
};

export type InventoryItem = {
  id: string;
  name: string;
  description: string;
  type: InventoryItemType;
  slot: EquipmentSlot | null;
  quantity?: number;
  level: number;
  isEquipped: boolean;
  createdAt: number;
  image: string | null;
  grade: ItemGrade;
  stars: number;
  options?: ItemOptions;
  enhancementFails?: number;
};

// --- User & Associated Data ---
export type Mail = {
  id: string;
  from: string;
  title: string;
  message: string;
  attachments?: {
    gold?: number;
    diamonds?: number;
    actionPoints?: number;
    items?: (InventoryItem | { itemId: string; quantity: number })[];
  };
  receivedAt: number;
  expiresAt?: number;
  isRead: boolean;
  attachmentsClaimed: boolean;
};

export type QuestReward = {
  gold?: number;
  diamonds?: number;
  xp?: { type: 'strategy' | 'playful'; amount: number };
  items?: (InventoryItem | { itemId: string; quantity: number })[];
  actionPoints?: number;
};

export type Quest = {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: QuestReward;
  activityPoints: number;
  isClaimed: boolean;
};

export type DailyQuestData = {
  quests: Quest[];
  activityProgress: number;
  claimedMilestones: boolean[];
  lastReset: number;
};

export type WeeklyQuestData = {
  quests: Quest[];
  activityProgress: number;
  claimedMilestones: boolean[];
  lastReset: number;
};

export type MonthlyQuestData = {
  quests: Quest[];
  activityProgress: number;
  claimedMilestones: boolean[];
  lastReset: number;
};


export type QuestLog = {
    daily?: DailyQuestData;
    weekly?: WeeklyQuestData;
    monthly?: MonthlyQuestData;
};

export type AvatarInfo = {
  id: string;
  name: string;
  url: string;
  requiredLevel: number;
  type: 'strategy' | 'playful' | 'any';
};

export type BorderInfo = {
  id: string;
  name: string;
  url: string | null;
  description: string;
  unlockTier?: string;
  requiredLevelSum?: number;
};

export type ShopBorderItem = BorderInfo & {
    price: { gold?: number; diamonds?: number };
};

export type WeeklyCompetitor = {
    id: string;
    nickname: string;
    avatarId: string;
    borderId: string;
    league: LeagueTier;
    initialScore: number;
};

// --- Tournament ---
export type TournamentDefinition = {
    id: TournamentType;
    name: string;
    description: string;
    format: 'round-robin' | 'tournament';
    players: number;
    image: string;
};

export type CommentaryLine = {
    text: string;
    phase: 'early' | 'mid' | 'end';
    scores?: { player1: number; player2: number };
    isRandomEvent?: boolean;
};

export type Match = {
    id: string;
    players: (PlayerForTournament | null)[];
    winner: PlayerForTournament | null;
    isFinished: boolean;
    commentary: CommentaryLine[];
    isUserMatch: boolean;
    finalScore: { player1: number; player2: number } | null;
    sgfFileIndex?: number;
};

export type Round = {
    id: number;
    name: string;
    matches: Match[];
};

export type TournamentState = {
    type: TournamentType;
    status: TournamentSimulationStatus;
    title: string;
    players: PlayerForTournament[];
    rounds: Round[];
    currentSimulatingMatch: { roundIndex: number; matchIndex: number } | null;
    currentMatchCommentary: CommentaryLine[];
    currentRoundRobinRound?: number;
    lastPlayedDate: number;
    nextRoundStartTime: number | null;
    timeElapsed: number;
    currentMatchScores?: { player1: number; player2: number } | null;
    currentMatchResult?: {
        winnerId: string;
        loserId: string;
        rewards?: { gold: number; diamonds: number; };
    } | null;
};

export type LeagueOutcome = 'promote' | 'maintain' | 'demote';

export interface LeagueRewardTier {
    rankStart: number;
    rankEnd: number;
    diamonds: number;
    outcome: LeagueOutcome;
}

export type UserCredentials = {
    username: string;
    passwordHash: string;
    userId: string;
};

export type SinglePlayerMissionInfo = {
    id: string;
    name: string;
    description: string;
    unlockStageId: string;
    productionRateMinutes: number;
    rewardType: 'gold' | 'diamonds';
    rewardAmount: number;
    maxCapacity: number;
    image: string;
};

export type SinglePlayerMissionState = {
    id: string;
    isStarted: boolean;
    lastCollectionTime: number;
    accumulatedAmount: number;
};

export type User = {
  id: string;
  username: string;
  nickname: string;
  isAdmin: boolean;
  strategyLevel: number;
  strategyXp: number;
  playfulLevel: number;
  playfulXp: number;
  baseStats: Record<CoreStat, number>;
  spentStatPoints: Record<CoreStat, number>;
  inventory: InventoryItem[];
  inventorySlots: { equipment: number; consumable: number; material: number; };
  equipment: Equipment;
  actionPoints: { current: number; max: number };
  lastActionPointUpdate: number;
  actionPointPurchasesToday?: number;
  lastActionPointPurchaseDate?: number;
  dailyShopPurchases?: Record<string, { quantity: number; date: number }>;
  gold: number;
  diamonds: number;
  mannerScore: number;
  mail: Mail[];
  quests: QuestLog;
  stats?: Record<string, { wins: number; losses: number; rankingScore: number; aiWins?: number; aiLosses?: number; }>;
  chatBanUntil?: number | null;
  connectionBanUntil?: number | null;
  avatarId: string;
  borderId: string;
  ownedBorders: string[];
  previousSeasonTier?: string | null;
  seasonHistory?: Record<string, Partial<Record<GameMode, string>>>;
  tournamentScore: number;
  league: LeagueTier;
  mannerMasteryApplied?: boolean;
  pendingPenaltyNotification?: string | null;
  lastNeighborhoodPlayedDate?: number | null;
  dailyNeighborhoodWins?: number;
  neighborhoodRewardClaimed?: boolean;
  lastNeighborhoodTournament?: TournamentState | null;
  lastNationalPlayedDate?: number | null;
  dailyNationalWins?: number;
  nationalRewardClaimed?: boolean;
  lastNationalTournament?: TournamentState | null;
  lastWorldPlayedDate?: number | null;
  dailyWorldWins?: number;
  worldRewardClaimed?: boolean;
  lastWorldTournament?: TournamentState | null;
  weeklyCompetitors?: WeeklyCompetitor[];
  lastWeeklyCompetitorsUpdate?: number;
  lastLeagueUpdate?: number;
  monthlyGoldBuffExpiresAt?: number | null;
  mbti?: string | null;
  isMbtiPublic?: boolean;
  statResetCountToday?: number;
  lastStatResetDate?: string;
  singlePlayerProgress?: number;
  bonusStatPoints?: number;
  singlePlayerMissions?: Record<string, SinglePlayerMissionState>;
  guildId?: string;
  blacksmithLevel: number;
  blacksmithXp: number;
  cumulativeRankingScore?: Record<string, number>;
  inventorySlotsMigrated?: boolean;
};

export type UserWithStatus = User & UserStatusInfo;

export type PlayerForTournament = Pick<User, 'id' | 'nickname' | 'avatarId' | 'borderId' | 'league'> & {
    stats: Record<CoreStat, number>;
    originalStats?: Record<CoreStat, number>;
    wins: number;
    losses: number;
    condition: number;
};

export type StageInfo = {
    id: string;
    name: string;
    description: string;
    level: SinglePlayerLevel;
    mode: GameMode;
    boardState: BoardState;
    player: Player;
    reward: {
        gold: number;
        diamonds: number;
    };
};

export type SinglePlayerStageInfo = {
    id: string;
    name: string;
    level: SinglePlayerLevel;
    actionPointCost: number;
    boardSize: 7 | 9 | 11 | 13;
    targetScore: { black: number; white: number; };
    katagoLevel: number;
    placements: {
        black: number;
        white: number;
        blackPattern: number;
        whitePattern: number;
        centerBlackStoneChance?: number;
    };
    timeControl: {
        type: 'byoyomi' | 'fischer';
        mainTime: number; // minutes
        byoyomiTime?: number; // seconds
        byoyomiCount?: number;
        increment?: number; // seconds
    };
    rewards: {
        firstClear: { gold: number; exp: number; items?: { itemId: string; quantity: number }[]; bonus?: string };
        repeatClear: { gold: number; exp: number; items?: { itemId: string; quantity: number }[]; bonus?: string };
    };
};


// --- Game ---
export type KomiBid = { color: Player; komi: number; };

export type AlkkagiStone = {
    id: number;
    player: Player;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    onBoard: boolean;
    timeOffBoard?: number;
};

export type GameSettings = {
  boardSize: 9 | 13 | 19 | 7 | 11 | 15;
  komi: number;
  timeLimit: number; // in minutes
  byoyomiTime: number; // in seconds
  byoyomiCount: number;
  
  // Mode-specific settings
  captureTarget?: number;
  timeIncrement?: number; // Fischer
  baseStones?: number;
  hiddenStoneCount?: number;
  scanCount?: number;
  missileCount?: number;
  mixedModes?: GameMode[];
  
  // Omok settings
  has33Forbidden?: boolean;
  hasOverlineForbidden?: boolean;

  // Dice Go settings
  diceGoVariant?: DiceGoVariant;
  diceGoRounds?: 1 | 2 | 3;
  oddDiceCount?: number;
  evenDiceCount?: number;
  
  // Alkkagi settings
  alkkagiPlacementType?: AlkkagiPlacementType;
  alkkagiLayout?: AlkkagiLayoutType;
  alkkagiStoneCount?: number;
  alkkagiGaugeSpeed?: number;
  alkkagiSlowItemCount?: number;
  alkkagiAimingLineItemCount?: number;
  alkkagiRounds?: 1 | 2 | 3;

  // Curling settings
  curlingStoneCount?: number;
  curlingGaugeSpeed?: number;
  curlingSlowItemCount?: number;
  curlingAimingLineItemCount?: number;
  curlingRounds?: 1 | 2 | 3;

  // AI Game settings
  player1Color?: Player.Black | Player.White; // For AI games, P1 is always the human
  aiDifficulty?: number; // 1-5
};

// --- Round Summaries ---
export type AlkkagiRoundSummary = {
    round: number;
    winnerId: string;
    loserId: string;
    refillsRemaining: { [playerId: string]: number };
};

export type CurlingRoundSummary = {
    round: number;
    roundWinner?: Player | null; // Winner of the round
    black: { houseScore: number; knockoutScore: number; total: number; };
    white: { houseScore: number; knockoutScore: number; total: number; };
    cumulativeScores: { [key in Player]: number; };
    stonesState: AlkkagiStone[];
    scoredStones: { [stoneId: number]: number };
};

export type DiceRoundSummary = {
    round: number;
    scores: { [playerId: string]: number };
    diceStats?: {
        [playerId: string]: {
            rolls: { [roll: number]: number };
            totalRolls: number;
        };
    };
};

export type ThiefRoundSummary = {
    round: number;
    isDeathmatch?: boolean;
    player1: { id: string; role: 'thief' | 'police'; roundScore: number; cumulativeScore: number; };
    player2: { id: string; role: 'thief' | 'police'; roundScore: number; cumulativeScore: number; };
    diceStats?: {
        [playerId: string]: {
            rolls: { [roll: number]: number };
            totalRolls: number;
        };
    };
};

export type AnimationData =
  | { type: 'scan'; point: Point; success: boolean; startTime: number; duration: number; playerId: string }
  | { type: 'missile'; from: Point; to: Point; player: Player; startTime: number; duration: number }
  | { type: 'dice_roll_turn'; p1Roll: number; p2Roll: number; startTime: number; duration: number }
  | { type: 'dice_roll_main'; dice: { dice1: number, dice2: number, dice3: number }; startTime: number; duration: number }
  | { type: 'alkkagi_flick'; stoneId: number; vx: number; vy: number; startTime: number; duration: number }
  | { type: 'curling_flick'; stone: AlkkagiStone; velocity: Point; startTime: number; duration: number }
  | { type: 'hidden_reveal'; stones: { point: Point; player: Player }[]; startTime: number; duration: number }
  | { type: 'hidden_missile'; from: Point; to: Point; player: Player; startTime: number; duration: number }
  | { type: 'bonus_text'; text: string; point: Point; player: Player; startTime: number; duration: number }
  | { type: 'bonus_score'; playerId: string; bonus: number; startTime: number; duration: number };

// --- Analysis & Summary ---
export type RecommendedMove = {
  x: number;
  y: number;
  winrate: number;
  scoreLead: number;
  order: number;
};

export type AnalysisResult = {
  winRateBlack: number;
  winRateChange?: number;
  scoreLead?: number;
  blackConfirmed: Point[];
  whiteConfirmed: Point[];
  blackRight: Point[];
  whiteRight: Point[];
  blackLikely: Point[];
  whiteLikely: Point[];
  deadStones: Point[];
  ownershipMap: number[][] | null;
  recommendedMoves: RecommendedMove[];
  areaScore: { black: number; white: number; };
  scoreDetails: {
    black: { territory: number; captures: number; liveCaptures?: number; deadStones?: number; baseStoneBonus: number; hiddenStoneBonus: number; timeBonus: number; itemBonus: number; total: number; };
    white: { territory: number; captures: number; liveCaptures?: number; deadStones?: number; komi: number; baseStoneBonus: number; hiddenStoneBonus: number; timeBonus: number; itemBonus: number; total: number; };
  };
};

export type StatChange = {
  initial: number;
  change: number;
  final: number;
};

export type GameSummary = {
  xp: StatChange;
  rating: StatChange;
  manner: StatChange;
  mannerActionChange?: number;
  mannerGrade?: { initial: string; final: string; };
  actionPoints?: StatChange;
  level?: {
      initial: number;
      final: number;
      progress: { initial: number; final: number; max: number };
  };
  overallRecord?: { wins: number; losses: number; aiWins?: number; aiLosses?: number; };
  gold?: number;
  items?: InventoryItem[];
};


// --- Core Entities ---
export type LiveGameSession = {
  id: string;
  mode: GameMode;
  settings: GameSettings;
  description?: string;
  player1: User;
  player2: User;
  blackPlayerId: string | null;
  whitePlayerId: string | null;
  gameStatus: GameStatus;
  currentPlayer: Player;
  boardState: BoardState;
  moveHistory: Move[];
  captures: { [key in Player]: number };
  baseStoneCaptures: { [key in Player]: number };
  hiddenStoneCaptures: { [key in Player]: number };
  winner: Player | null;
  winReason: WinReason | null;
  finalScores?: { black: number, white: number };
  createdAt: number;
  lastMove: Point | null;
  lastTurnStones?: Point[] | null;
  stonesPlacedThisTurn?: Point[] | null;
  passCount: number;
  koInfo: { point: Point; turn: number } | null;
  winningLine?: Point[] | null;
  statsUpdated?: boolean;
  summary?: { [playerId: string]: GameSummary };
  animation?: AnimationData | null;
  blackTimeLeft: number;
  whiteTimeLeft: number;
  blackByoyomiPeriodsLeft: number;
  whiteByoyomiPeriodsLeft: number;
  turnDeadline?: number;
  turnStartTime?: number;
  canRequestNoContest?: { [playerId: string]: boolean };
  pausedTurnTimeLeft?: number;
  itemUseDeadline?: number;
  lastTimeoutPlayerId?: string | null;
  lastTimeoutPlayerIdClearTime?: number;
  revealAnimationEndTime?: number;
  revealEndTime?: number;
  disconnectionState?: { disconnectedPlayerId: string; timerStartedAt: number; } | null;
  disconnectionCounts: { [playerId: string]: number; };
  noContestInitiatorIds?: string[];
  currentActionButtons: { [playerId: string]: any[] }; // ActionButton
  actionButtonCooldownDeadline?: { [playerId: string]: number | undefined };
  actionButtonUses?: { [playerId: string]: number };
  maxActionButtonUses?: number;
  actionButtonUsedThisCycle?: { [playerId: string]: boolean };
  mannerScoreChanges?: { [playerId: string]: number };
  nigiri?: { holderId: string; guesserId: string; stones: number | null; guess: 1 | 2 | null; result: 'correct' | 'incorrect' | null; processed?: boolean; purpose?: 'determine_colors' | 'turn_choice_tiebreaker'; };
  guessDeadline?: number;
  bids?: { [userId: string]: number | null };
  biddingRound?: number;
  captureBidDeadline?: number;
  effectiveCaptureTargets?: { [key in Player]: number };
  baseStones?: { x: number; y: number; player: Player; }[];
  baseStones_p1?: Point[];
  baseStones_p2?: Point[];
  basePlacementDeadline?: number;
  komiBids?: { [userId: string]: KomiBid | null };
  komiBiddingDeadline?: number;
  komiBiddingRound?: number;
  komiBidRevealProcessed?: boolean;
  finalKomi?: number;
  hiddenMoves?: { [moveIndex: number]: boolean };
  scans_p1?: number;
  scans_p2?: number;
  revealedHiddenMoves?: { [playerId: string]: number[] };
  newlyRevealed?: { point: Point, player: Player }[];
  justCaptured?: { point: Point; player: Player; wasHidden: boolean }[];
  hidden_stones_used_p1?: number;
  hidden_stones_used_p2?: number;
  pendingCapture?: { stones: Point[]; move: Move; hiddenContributors: Point[] } | null;
  permanentlyRevealedStones?: Point[];
  missiles_p1?: number;
  missiles_p2?: number;
  missileUsedThisTurn?: boolean;
  rpsState?: { [userId:string]: RPSChoice | null };
  rpsRound?: number;
  dice?: { dice1: number, dice2: number, dice3: number };
  stonesToPlace?: number;
  turnOrderRolls?: { [userId: string]: number | null };
  turnOrderRollReady?: { [userId: string]: boolean };
  turnOrderRollResult?: 'tie' | null;
  turnOrderRollTies?: number;
  turnOrderRollDeadline?: number;
  turnOrderAnimationEndTime?: number;
  turnChoiceDeadline?: number;
  turnChooserId?: string | null;
  turnChoices?: { [userId: string]: 'first' | 'second' | null };
  turnSelectionTiebreaker?: 'rps' | 'nigiri' | 'dice_roll';
  diceRollHistory?: { [playerId: string]: number[] };
  diceRoundSummary?: DiceRoundSummary;
  lastWhiteGroupInfo?: { size: number; liberties: number } | null;
  diceGoItemUses?: { [playerId: string]: { odd: number; even: number } };
  diceGoBonuses?: { [playerId: string]: number };
  diceCapturesThisTurn?: number;
  diceLastCaptureStones?: Point[];
  round: number;
  isDeathmatch?: boolean;
  turnInRound: number;
  scores: { [userId: string]: number };
  thiefPlayerId?: string;
  policePlayerId?: string;
  roleChoices?: { [userId: string]: 'thief' | 'police' | null };
  roleChoiceWinnerId?: string | null;
  thiefRoundSummary?: ThiefRoundSummary;
  thiefDiceRollHistory?: { [playerId: string]: number[] };
  thiefCapturesThisRound?: number;
  alkkagiStones?: AlkkagiStone[];
  alkkagiStones_p1?: AlkkagiStone[];
  alkkagiStones_p2?: AlkkagiStone[];
  alkkagiTurnDeadline?: number;
  alkkagiPlacementDeadline?: number;
  alkkagiItemUses?: { [playerId: string]: { slow: number; aimingLine: number } };
  activeAlkkagiItems?: { [playerId: string]: ('slow' | 'aimingLine')[] };
  alkkagiRound?: number;
  alkkagiRefillsUsed?: { [playerId: string]: number };
  alkkagiStonesPlacedThisRound?: { [playerId: string]: number };
  alkkagiRoundSummary?: AlkkagiRoundSummary;
  curlingStones?: AlkkagiStone[];
  curlingTurnDeadline?: number;
  curlingScores?: { [key in Player]: number };
  curlingRound?: number;
  curlingRoundSummary?: CurlingRoundSummary;
  curlingItemUses?: { [playerId: string]: { slow: number; aimingLine: number } };
  activeCurlingItems?: { [playerId: string]: ('slow' | 'aimingLine')[] };
  hammerPlayerId?: string; // Player with last stone advantage
  isTiebreaker?: boolean;
  tiebreakerStonesThrown?: number;
  stonesThrownThisRound?: { [playerId: string]: number };
  preGameConfirmations?: { [playerId: string]: boolean | number };
  roundEndConfirmations?: { [playerId: string]: number };
  rematchRejectionCount?: { [playerId: string]: number };
  timeoutFouls?: { [playerId: string]: number };
  curlingStonesLostToFoul?: { [playerId: string]: number };
  foulInfo?: { message: string; expiry: number; } | null;
  isAnalyzing?: boolean;
  analysisResult?: { [playerId: string]: AnalysisResult } | null;
  previousAnalysisResult?: { [playerId: string]: AnalysisResult } | null;
  isAiGame?: boolean;
  aiTurnStartTime?: number;
  mythicBonuses?: {
    [playerId: string]: {
        strategicGoldTriggers: number;
        playfulGoldTriggers: number;
    }
  };
  lastPlayfulGoldCheck?: {
      [playerId: string]: number;
  };
  pendingSystemMessages?: ChatMessage[];
  isSinglePlayer?: boolean;
  stageId?: string;
  blackPatternStones?: Point[];
  whitePatternStones?: Point[];
  singlePlayerPlacementRefreshesUsed?: number;
};

export type Negotiation = {
  id: string;
  challenger: User;
  opponent: User;
  mode: GameMode;
  settings: GameSettings;
  proposerId: string;
  status: 'draft' | 'pending';
  turnCount?: number;
  deadline: number;
  rematchOfGameId?: string;
};

export type SanctionLogData = {
    sanctionType: 'chat' | 'connection';
    durationMinutes?: number;
};

export type AdminLog = {
  id: string;
  timestamp: number;
  adminId: string;
  adminNickname: string;
  targetUserId: string;
  targetNickname: string;
  action: 'reset_stats' | 'reset_full' | 'delete_user' | 'force_logout' | 'force_delete_game' | 'send_mail' | 'set_game_description' | 'update_user_details' | 'apply_sanction' | 'lift_sanction' | 'force_win';
  backupData: Partial<User> | { status: UserStatusInfo } | LiveGameSession | { mailTitle: string } | SanctionLogData | { gameId: string, winnerId: string };
};

export type Announcement = {
    id: string;
    message: string;
};

export type OverrideAnnouncement = {
    message: string;
    modes: GameMode[] | 'all';
};

export type ActionButton = {
  name: string;
  message: string;
  type: 'manner' | 'unmannerly';
};
