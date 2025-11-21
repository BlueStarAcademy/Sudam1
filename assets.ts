
// This file centralizes all image assets for the game for easy management and future updates.

// White base stone: Triquetra symbol
export const WHITE_BASE_STONE_IMG = "/images/Base.png";
// Black base stone: Triskelion symbol
export const BLACK_BASE_STONE_IMG = "/images/Base.png";

// White hidden stone: Odal rune
export const WHITE_HIDDEN_STONE_IMG = "/images/Hidden.png";
// Black hidden stone: Heart-shaped knot
export const BLACK_HIDDEN_STONE_IMG = "/images/Hidden.png";

// Lobby card images
export const STRATEGIC_GO_LOBBY_IMG = "/images/RatingArena.png";
export const PLAYFUL_GO_LOBBY_IMG = "/images/PlayingArena.png";
export const TOURNAMENT_LOBBY_IMG = "/images/Championship.png";
export const SINGLE_PLAYER_LOBBY_IMG = "/images/single/Map.png";
export const TOWER_CHALLENGE_LOBBY_IMG = "/images/tower/Tower.png";

// Guild Boss Images
export const GUILD_BOSS_1_IMG = "/images/guild/boss/boss1.png";
export const GUILD_BOSS_2_IMG = "/images/guild/boss/boss2.png";
export const GUILD_BOSS_3_IMG = "/images/guild/boss/boss3.png";
export const GUILD_BOSS_4_IMG = "/images/guild/boss/boss4.png";
export const GUILD_BOSS_5_IMG = "/images/guild/boss/boss5.png";

// Guild Boss Skill Icons
export const BOSS_SKILL_IMG_1_1 = "/images/guild/skill/boss1skill1.png";
export const BOSS_SKILL_IMG_1_2 = "/images/guild/skill/boss1skill2.png";
export const BOSS_SKILL_IMG_1_3 = "/images/guild/skill/boss1skill3.png";
export const BOSS_SKILL_IMG_2_1 = "/images/guild/skill/boss2skill1.png";
export const BOSS_SKILL_IMG_2_2 = "/images/guild/skill/boss2skill2.png";
export const BOSS_SKILL_IMG_2_3 = "/images/guild/skill/boss2skill3.png";
export const BOSS_SKILL_IMG_3_1 = "/images/guild/skill/boss3skill1.png";
export const BOSS_SKILL_IMG_3_2 = "/images/guild/skill/boss3skill2.png";
export const BOSS_SKILL_IMG_3_3 = "/images/guild/skill/boss3skill3.png";
export const BOSS_SKILL_IMG_4_1 = "/images/guild/skill/boss4skill1.png";
export const BOSS_SKILL_IMG_4_2 = "/images/guild/skill/boss4skill2.png";
export const BOSS_SKILL_IMG_4_3 = "/images/guild/skill/boss4skill3.png";
export const BOSS_SKILL_IMG_5_1 = "/images/guild/skill/boss5skill1.png";
export const BOSS_SKILL_IMG_5_2 = "/images/guild/skill/boss5skill2.png";
export const BOSS_SKILL_IMG_5_3 = "/images/guild/skill/boss5skill3.png";

// Boss Skill Icon Map (by skill ID string)
export const BOSS_SKILL_ICON_MAP: Record<string, string> = {
    // Boss 1 (청해)
    '청해_물결의압박': BOSS_SKILL_IMG_1_1,
    '청해_심해의고요': BOSS_SKILL_IMG_1_2,
    '청해_회복억제': BOSS_SKILL_IMG_1_3,
    // Boss 2 (홍염)
    '홍염_불꽃돌파': BOSS_SKILL_IMG_2_1,
    '홍염_광열의폭발': BOSS_SKILL_IMG_2_2,
    '홍염_화상': BOSS_SKILL_IMG_2_3,
    // Boss 3 (녹수)
    '녹수_숲의압박': BOSS_SKILL_IMG_3_1,
    '녹수_포자확산': BOSS_SKILL_IMG_3_2,
    '녹수_자연의치유': BOSS_SKILL_IMG_3_3,
    // Boss 4 (현묘)
    '현묘_혼란의수수께끼': BOSS_SKILL_IMG_4_1,
    '현묘_뒤바뀐계산': BOSS_SKILL_IMG_4_2,
    '현묘_심리전': BOSS_SKILL_IMG_4_3,
    // Boss 5 (백광)
    '백광_천벌의일격': BOSS_SKILL_IMG_5_1,
    '백광_광휘의결계': BOSS_SKILL_IMG_5_2,
    '백광_심판의빛': BOSS_SKILL_IMG_5_3,
};

// Guild Research Images
export const GUILD_ATTACK_ICON = "/images/guild/attack.png";
export const GUILD_RESEARCH_HEAL_BLOCK_IMG = "/images/guild/research/heal_block.png";
export const GUILD_RESEARCH_IGNITE_IMG = "/images/guild/research/ignite.png";
export const GUILD_RESEARCH_REGEN_IMG = "/images/guild/research/regen.png";