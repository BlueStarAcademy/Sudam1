// constants/settings.ts
import { AppSettings } from '../types/index.js';

// This object defines the default application settings.
// It is defined without explicit types to prevent circular dependencies,
// as the `types` module itself may depend on other constants.
// Type safety is enforced where this object is consumed (e.g., in useApp.ts).
export const defaultSettings: AppSettings = {
    graphics: {
        // FIX: Explicitly cast the theme to the union of allowed theme strings to match the 'Theme' type.
        // This prevents TypeScript from inferring it as a generic 'string', which caused a type mismatch.
        theme: 'black' as 'black' | 'white' | 'blue' | 'sky' | 'green',
        panelEdgeStyle: 'default',
        panelColor: undefined,
        textColor: undefined,
    },
    sound: {
        masterVolume: 0.5,
        masterMuted: false,
        categoryMuted: {
            stone: false,
            notification: false,
            item: false,
            countdown: false,
            turn: false,
        },
    },
    features: {
        mobileConfirm: false,
        stonePreview: true,
        lastMoveMarker: true,
        questNotifications: true,
        chatNotifications: true,
    },
};

