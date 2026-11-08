// The settings and their defaults. The file format is the one the Electron versions wrote, so
// settings carried over from them load unchanged.
import { DEFAULT_LANGUAGE } from '../data/locales.ts';

export const PROFILE_KEYS = ['pool', 'counterOverrides', 'flashOnD'] as const;

export interface OverlaySettings {
  enabled: boolean;
  opacity: number;
  // Logical (DPI-independent) position of the widget, null: default place.
  bounds: { x: number; y: number } | null;
  toggleKey: string;
  moveKey: string;
}

export interface SettingsData {
  language: string;
  leagueDir: string;
  // Champion ids per role.
  pool: Record<string, string[]>;
  // Enemy champion id -> champions that beat it (replaces the curated list).
  counterOverrides: Record<string, string[]>;
  alwaysOnTop: boolean;
  autoOpenDraft: boolean;
  autoOpenLive: boolean;
  flashOnD: boolean;
  overlay: OverlaySettings;
  profilesMigrated?: boolean;
}

export type ProfileSettings = Pick<SettingsData, typeof PROFILE_KEYS[number]>;

export const DEFAULTS: SettingsData = {
  language: DEFAULT_LANGUAGE,
  leagueDir: '',
  pool: { TOP: [], JUNGLE: [], MIDDLE: [], BOTTOM: [], SUPPORT: [] },
  counterOverrides: {},
  alwaysOnTop: false,
  autoOpenDraft: true,
  autoOpenLive: true,
  flashOnD: true,
  overlay: {
    enabled: true,
    opacity: 0.92,
    bounds: null,
    toggleKey: 'CommandOrControl+Shift+H',
    moveKey: 'CommandOrControl+Shift+J',
  },
};
