/**
 * Service to track the state of the extension's side panel
 */
export class SidePanelService {
    private isOpen = false;

    /**
     * Update the side panel state
     */
    setOpen(isOpen: boolean) {
        this.isOpen = isOpen;
    }

    /**
     * Check if the side panel is currently shown
     */
    isShown(): boolean {
        return this.isOpen;
    }

    /**
     * Get the current active tab if the side panel is open
     */
    async getActiveTabIfPanelOpen(): Promise<number | null> {
        if (!this.isOpen)
        {
            return null;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab?.id || null;
    }
}

export const sidePanelService = new SidePanelService();
