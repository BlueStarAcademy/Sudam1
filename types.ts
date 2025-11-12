// This file acts as a barrel file, re-exporting all types from the new modular structure.
// This allows other files to continue importing from './types.js' without any changes.

export * from './types/enums';
export * from './types/entities';
export * from './types/api';
export * from './types/navigation';
export type { Theme, SoundCategory, GraphicsSettings, SoundSettings, FeatureSettings, AppSettings, PanelEdgeStyle } from './types/settings';