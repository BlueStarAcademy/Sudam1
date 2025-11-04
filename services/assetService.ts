import {
    emptySlotImages, TOURNAMENT_DEFINITIONS, SPECIAL_GAME_MODES, PLAYFUL_GAME_MODES, LEAGUE_DATA, AVATAR_POOL, BORDER_POOL, RANKING_TIERS, EQUIPMENT_POOL, CONSUMABLE_ITEMS, MATERIAL_ITEMS
} from '../constants.js';
import { WHITE_BASE_STONE_IMG, BLACK_BASE_STONE_IMG, WHITE_HIDDEN_STONE_IMG, BLACK_HIDDEN_STONE_IMG, STRATEGIC_GO_LOBBY_IMG, PLAYFUL_GO_LOBBY_IMG, TOURNAMENT_LOBBY_IMG, SINGLE_PLAYER_LOBBY_IMG, TOWER_CHALLENGE_LOBBY_IMG } from '../assets.js';
import { ItemGrade } from '../types.js';

const gradeBackgrounds: Record<ItemGrade, string> = {
    normal: '/images/equipments/normalbgi.png',
    uncommon: '/images/equipments/uncommonbgi.png',
    rare: '/images/equipments/rarebgi.png',
    epic: '/images/equipments/epicbgi.png',
    legendary: '/images/equipments/legendarybgi.png',
    mythic: '/images/equipments/mythicbgi.png',
};

const starImages = [
    '/images/equipments/Star1.png',
    '/images/equipments/Star2.png',
    '/images/equipments/Star3.png',
    '/images/equipments/Star4.png',
];

const uiImages = [
    '/images/icon/Gold.png',
    '/images/icon/Zem.png',
    '/images/quest.png',
    '/images/gibo.png',
    '/images/mail.png',
    '/images/store.png',
    '/images/bag.png',
    '/images/BlankEquipmentsSlot.png'
];

const allUrls = new Set<string>();

const addUrls = (urls: (string | undefined | null)[]) => {
    for (const url of urls) {
        if (url && typeof url === 'string' && url.startsWith('/')) {
            allUrls.add(url);
        }
    }
};

addUrls(Object.values(emptySlotImages));
addUrls(TOURNAMENT_DEFINITIONS.neighborhood.image ? [TOURNAMENT_DEFINITIONS.neighborhood.image, TOURNAMENT_DEFINITIONS.national.image, TOURNAMENT_DEFINITIONS.world.image] : []);
addUrls(SPECIAL_GAME_MODES.map(m => m.image));
addUrls(PLAYFUL_GAME_MODES.map(m => m.image));
addUrls(LEAGUE_DATA.map(l => l.icon));
addUrls(AVATAR_POOL.map(a => a.url));
addUrls(BORDER_POOL.map(b => b.url));
addUrls(RANKING_TIERS.map(t => t.icon));
addUrls(EQUIPMENT_POOL.map(e => e.image));
addUrls(CONSUMABLE_ITEMS.map(c => c.image));
addUrls(Object.values(MATERIAL_ITEMS).map(m => m.image));
addUrls([WHITE_BASE_STONE_IMG, BLACK_BASE_STONE_IMG, WHITE_HIDDEN_STONE_IMG, BLACK_HIDDEN_STONE_IMG, STRATEGIC_GO_LOBBY_IMG, PLAYFUL_GO_LOBBY_IMG, TOURNAMENT_LOBBY_IMG, SINGLE_PLAYER_LOBBY_IMG, TOWER_CHALLENGE_LOBBY_IMG]);
addUrls(Object.values(gradeBackgrounds));
addUrls(starImages);
addUrls(uiImages);

export const ALL_IMAGE_URLS = Array.from(allUrls);

export const preloadImages = (urls: string[]): Promise<(Event | string)[]> => {
    const promises = urls.map(url => {
        return new Promise<Event | string>((resolve) => {
            const img = new Image();
            img.src = url;
            img.onload = resolve;
            // Resolve on error too, so one failed image doesn't block everything.
            img.onerror = (err) => resolve(`Failed to load ${url}: ${err.toString()}`); 
        });
    });
    return Promise.all(promises);
};