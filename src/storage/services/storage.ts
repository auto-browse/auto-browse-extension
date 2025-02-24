/**
 * A wrapper service for Chrome's storage API that provides type-safe access
 */
export class StorageService {
    /**
     * Get a value from storage
     */
    static async get<T>(key: string): Promise<T | undefined> {
        try
        {
            const result = await chrome.storage.sync.get(key);
            return result[key] as T;
        } catch (error)
        {
            console.error(`Error getting storage key ${key}:`, error);
            return undefined;
        }
    }

    /**
     * Set a value in storage
     */
    static async set<T>(key: string, value: T): Promise<void> {
        try
        {
            await chrome.storage.sync.set({ [key]: value });
        } catch (error)
        {
            console.error(`Error setting storage key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Remove a value from storage
     */
    static async remove(key: string): Promise<void> {
        try
        {
            await chrome.storage.sync.remove(key);
        } catch (error)
        {
            console.error(`Error removing storage key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Clear all values from storage
     */
    static async clear(): Promise<void> {
        try
        {
            await chrome.storage.sync.clear();
        } catch (error)
        {
            console.error("Error clearing storage:", error);
            throw error;
        }
    }

    /**
     * Add a listener for storage changes
     */
    static addListener(
        callback: (changes: { [key: string]: chrome.storage.StorageChange; }) => void
    ): void {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === "sync")
            {
                callback(changes);
            }
        });
    }

    /**
     * Check if a key exists in storage
     */
    static async exists(key: string): Promise<boolean> {
        try
        {
            const result = await chrome.storage.sync.get(key);
            return key in result;
        } catch (error)
        {
            console.error(`Error checking storage key ${key}:`, error);
            return false;
        }
    }
}
