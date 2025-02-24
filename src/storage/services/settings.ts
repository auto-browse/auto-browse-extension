import { StorageSettings, defaultSettings, StorageKeys } from '../types';
import { StorageService } from './storage';

/**
 * Service for managing extension settings
 */
export class SettingsService {
    private static settings: StorageSettings | undefined;

    /**
     * Initialize settings on extension start
     */
    static async initialize(): Promise<void> {
        // Load settings from storage or use defaults
        const settings = await StorageService.get<StorageSettings>(StorageKeys.SETTINGS);
        this.settings = settings || defaultSettings;

        // Save defaults if no settings exist
        if (!settings)
        {
            await this.saveSettings();
        }

        // Listen for changes
        StorageService.addListener((changes) => {
            if (StorageKeys.SETTINGS in changes)
            {
                this.settings = changes[StorageKeys.SETTINGS].newValue;
            }
        });
    }

    /**
     * Get current settings
     */
    static async getSettings(): Promise<StorageSettings> {
        if (!this.settings)
        {
            await this.initialize();
        }
        return this.settings || defaultSettings;
    }

    /**
     * Get debug mode state
     */
    static async isDebugMode(): Promise<boolean> {
        const settings = await this.getSettings();
        return settings.debugMode;
    }

    /**
     * Set debug mode state
     */
    static async setDebugMode(enabled: boolean): Promise<void> {
        const settings = await this.getSettings();
        settings.debugMode = enabled;
        await this.saveSettings();
    }

    /**
     * Reset settings to defaults
     */
    static async resetSettings(): Promise<void> {
        this.settings = { ...defaultSettings };
        await this.saveSettings();
    }

    /**
     * Save current settings to storage
     */
    private static async saveSettings(): Promise<void> {
        if (this.settings)
        {
            await StorageService.set(StorageKeys.SETTINGS, this.settings);
        }
    }
}

// Initialize settings when the service is loaded
SettingsService.initialize().catch(console.error);
