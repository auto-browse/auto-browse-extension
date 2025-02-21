import { StateCommand, StateResponse, DOMResponse, ScreenshotResponse, ElementType } from "@/types/chat";

export const browserService = {
    async executeStateCommand(command: StateCommand): Promise<StateResponse> {
        const [stateTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!stateTab?.id)
        {
            throw new Error("No active tab found");
        }

        const response = await chrome.tabs.sendMessage(stateTab.id, {
            type: "state",
            command
        });

        if (response.error)
        {
            throw new Error(response.error);
        }

        return response;
    },

    async findElements(target: ElementType, query?: string): Promise<DOMResponse> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id)
        {
            throw new Error("No active tab found");
        }

        const response = await chrome.tabs.sendMessage(tab.id, {
            type: "traverseDOM",
            target,
            query
        });

        if (response.error)
        {
            throw new Error(response.error);
        }

        return response;
    },

    async takeScreenshot(): Promise<ScreenshotResponse> {
        const response = await chrome.runtime.sendMessage({ type: "takeScreenshot" });
        if (response.error || !response.screenshotUrl)
        {
            throw new Error(response.error || "Failed to capture screenshot");
        }
        return response;
    },

    async switchTab(tabId: number): Promise<void> {
        const command: StateCommand = {
            type: "switchTab",
            target: tabId
        };
        await chrome.runtime.sendMessage({
            type: "state",
            command
        });
    },

    getCommandDescription(command: StateCommand): string {
        switch (command.type)
        {
            case "showViewport":
                return "Current viewport metrics:";
            case "showTabs":
                return "Open browser tabs:";
            case "showState":
                return "Current browser state:";
            case "scrollTo":
                return "Scrolled to element. New viewport position:";
            case "switchTab":
                return "Switched to tab. Updated tab list:";
            default:
                return "State updated:";
        }
    }
};
