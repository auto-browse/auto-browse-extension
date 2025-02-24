import type { TabInfo } from "../../types/state";
import type { ViewportState } from "../../types/state";

export class TabService {
    async getActiveTab(): Promise<chrome.tabs.Tab> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab)
        {
            throw new Error("No active tab found");
        }
        return tab;
    }

    async getActiveTabId(): Promise<number> {
        const tab = await this.getActiveTab();
        if (!tab.id)
        {
            throw new Error("Active tab has no ID");
        }
        return tab.id;
    }

    async getAllTabs(): Promise<TabInfo[]> {
        const tabs = await chrome.tabs.query({});
        return tabs.map((tab, index) => ({
            pageId: tab.id || index,
            url: tab.url || "",
            title: tab.title || "Untitled"
        }));
    }

    async getViewportState(tabId: number): Promise<ViewportState> {
        const defaultViewport: ViewportState = {
            pixelsAbove: 0,
            pixelsBelow: 0,
            width: 0,
            height: 0
        };

        try
        {
            const result = await chrome.scripting.executeScript<[], ViewportState>({
                target: { tabId },
                func: () => {
                    const docHeight = Math.max(
                        document.body.scrollHeight,
                        document.body.offsetHeight,
                        document.documentElement.clientHeight,
                        document.documentElement.scrollHeight,
                        document.documentElement.offsetHeight
                    );
                    const viewportHeight = window.innerHeight;
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

                    return {
                        pixelsAbove: scrollTop,
                        pixelsBelow: docHeight - viewportHeight - scrollTop,
                        width: window.innerWidth,
                        height: viewportHeight
                    };
                }
            });

            if (!result?.[0]?.result)
            {
                console.warn("No viewport data returned from script execution");
                return defaultViewport;
            }

            const viewportData = result[0].result;
            if (
                typeof viewportData.pixelsAbove !== 'number' ||
                typeof viewportData.pixelsBelow !== 'number' ||
                typeof viewportData.width !== 'number' ||
                typeof viewportData.height !== 'number'
            )
            {
                console.warn("Invalid viewport data structure:", viewportData);
                return defaultViewport;
            }

            return viewportData;
        } catch (error)
        {
            console.error("Failed to get viewport state:", error instanceof Error ? error.message : JSON.stringify(error));
            return defaultViewport;
        }
    }

    async scrollToElement(tabId: number, selector: string): Promise<boolean> {
        const result = await chrome.scripting.executeScript<[string], boolean>({
            target: { tabId },
            func: (selector: string): boolean => {
                const element = document.querySelector(selector);
                if (!element) return false;

                const elementRect = element.getBoundingClientRect();
                const scrollOptions = {
                    top: window.pageYOffset + elementRect.top - (window.innerHeight / 4),
                    behavior: 'smooth' as ScrollBehavior
                };

                window.scrollTo(scrollOptions);
                return true;
            },
            args: [selector]
        });

        return result?.[0]?.result || false;
    }

    async switchToTab(target: number | string): Promise<void> {
        if (typeof target === "number")
        {
            await chrome.tabs.update(target, { active: true });
            return;
        }

        const tabs = await chrome.tabs.query({});
        const targetTab = tabs.find(t =>
            t.title?.toLowerCase().includes(target.toLowerCase())
        );

        if (!targetTab?.id)
        {
            throw new Error("Target tab not found");
        }

        await chrome.tabs.update(targetTab.id, { active: true });
    }

    getCurrentUrl(tabId: number): Promise<string> {
        return chrome.tabs.get(tabId).then(tab => tab.url || 'about:blank');
    }
}

// Create a singleton instance
export const tabService = new TabService();
