/**
 * Settings stored in Chrome's storage.sync
 */
export interface StorageSettings {
    debugMode: boolean;
}

/**
 * Default values for settings
 */
export const defaultSettings: StorageSettings = {
    debugMode: false
};

/**
 * Keys used in Chrome's storage
 */
export const StorageKeys = {
    SETTINGS: "settings" // Key for settings object in storage
} as const;
