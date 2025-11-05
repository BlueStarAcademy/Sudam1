
import { GameMode } from "../types.js";

export type AppRoute = {
    view: 'login' | 'register' | 'profile' | 'lobby' | 'waiting' | 'game' | 'admin' | 'tournament' | 'singleplayer';
    params: any;
};

export function parseHash(hash: string): AppRoute {
    const path = hash.replace(/^#\/?/, '');
    const [view, ...rest] = path.split('/');

    switch (view) {
        case 'lobby': return { view: 'lobby', params: { type: rest[0] || 'strategic' } };
        case 'waiting': return { view: 'waiting', params: { mode: rest[0] ? decodeURIComponent(rest[0]) as GameMode : null } };
        case 'game': return { view: 'game', params: { id: rest[0] } };
        case 'tournament': return { view: 'tournament', params: { type: rest[0] || null } };
        case 'singleplayer': return { view: 'singleplayer', params: {} };
        case 'admin': return { view: 'admin', params: {} };
        case 'register': return { view: 'register', params: {} };
        case 'profile': return { view: 'profile', params: {} };
        default: return { view: 'login', params: {} };
    }
}

export const stableStringify = (data: any): string => {
    const processValue = (value: any): any => {
        if (value === null || typeof value !== 'object') {
            return value;
        }

        if (Array.isArray(value)) {
            const processedArray = value.map(processValue);
            try {
                return processedArray.sort((a, b) => {
                    const strA = JSON.stringify(a);
                    const strB = JSON.stringify(b);
                    return strA.localeCompare(strB);
                });
            } catch (e) {
                console.error("Could not sort array for stableStringify:", e);
                return processedArray;
            }
        }
        
        const sortedKeys = Object.keys(value).sort();
        const newObj: { [key: string]: any } = {};
        for (const key of sortedKeys) {
            newObj[key] = processValue(value[key]);
        }
        return newObj;
    };
    
    return JSON.stringify(processValue(data));
};