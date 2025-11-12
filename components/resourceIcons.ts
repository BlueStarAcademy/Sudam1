export type ResourceIconKey = 'gold' | 'diamonds';

const iconPaths: Record<ResourceIconKey | 'actionPlus', string> = {
    gold: new URL('/images/icon/Gold.png', import.meta.url).href,
    diamonds: new URL('/images/icon/Zem.png', import.meta.url).href,
    actionPlus: new URL('/images/icon/applus.png', import.meta.url).href,
};

export const resourceIcons = {
    gold: iconPaths.gold,
    diamonds: iconPaths.diamonds,
    actionPlus: iconPaths.actionPlus,
} as const;


