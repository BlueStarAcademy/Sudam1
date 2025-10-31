import { useState, useEffect, useCallback } from 'react';
import { Theme, SoundSettings, FeatureSettings, AppSettings, SoundCategory } from '../types.js';

export const defaultSettings: AppSettings = {
    graphics: {
        theme: 'black',
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

export const SETTINGS_STORAGE_KEY = 'appSettings_v2';