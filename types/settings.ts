// Define setting types
export type Theme = 'black' | 'white' | 'blue' | 'sky' | 'green';
export type SoundCategory = 'stone' | 'notification' | 'item' | 'countdown' | 'turn';

export interface GraphicsSettings {
    theme: Theme;
    panelColor?: string;
    textColor?: string;
}

export interface SoundSettings {
    masterVolume: number;
    masterMuted: boolean;
    categoryMuted: Record<SoundCategory, boolean>;
}

export interface FeatureSettings {
    mobileConfirm: boolean;
    stonePreview: boolean;
    lastMoveMarker: boolean;
    questNotifications: boolean;
    chatNotifications: boolean;
}

export interface AppSettings {
    graphics: GraphicsSettings;
    sound: SoundSettings;
    features: FeatureSettings;
}