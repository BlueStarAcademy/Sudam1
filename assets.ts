
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
export const GUILD_BOSS_1_IMG = "/images/guild/boss1.png";
export const GUILD_BOSS_2_IMG = "/images/guild/boss2.png";
export const GUILD_BOSS_3_IMG = "/images/guild/boss3.png";
export const GUILD_BOSS_4_IMG = "/images/guild/boss4.png";
export const GUILD_BOSS_5_IMG = "/images/guild/boss5.png";

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

// Boss Skill Icon Map
export const BOSS_SKILL_ICON_MAP: { [bossId: number]: { [skillId: number]: string } } = {
    1: {
        1: BOSS_SKILL_IMG_1_1,
        2: BOSS_SKILL_IMG_1_2,
        3: BOSS_SKILL_IMG_1_3,
    },
    2: {
        1: BOSS_SKILL_IMG_2_1,
        2: BOSS_SKILL_IMG_2_2,
        3: BOSS_SKILL_IMG_2_3,
    },
    3: {
        1: BOSS_SKILL_IMG_3_1,
        2: BOSS_SKILL_IMG_3_2,
        3: BOSS_SKILL_IMG_3_3,
    },
    4: {
        1: BOSS_SKILL_IMG_4_1,
        2: BOSS_SKILL_IMG_4_2,
        3: BOSS_SKILL_IMG_4_3,
    },
    5: {
        1: BOSS_SKILL_IMG_5_1,
        2: BOSS_SKILL_IMG_5_2,
        3: BOSS_SKILL_IMG_5_3,
    },
};

// Guild Research Images
export const GUILD_ATTACK_ICON = "/images/guild/attack.png";
export const GUILD_RESEARCH_HEAL_BLOCK_IMG = "/images/guild/research/heal_block.png";
export const GUILD_RESEARCH_IGNITE_IMG = "/images/guild/research/ignite.png";
export const GUILD_RESEARCH_REGEN_IMG = "/images/guild/research/regen.png";