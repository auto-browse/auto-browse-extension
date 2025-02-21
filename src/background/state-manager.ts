import { BrowserState, ViewportState, TabInfo, StateCommand, StateResponse } from "../types/state";

export class StateManager {
    private currentState: Partial<BrowserState> = {};

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

            // Ensure we have a valid response
            if (!result?.[0]?.result)
            {
                console.warn("No viewport data returned from script execution");
                return defaultViewport;
            }

            // Validate the result structure
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

    private async getCurrentUrl(tabId: number): Promise<string> {
        try
        {
            const tab = await chrome.tabs.get(tabId);
            return tab.url || 'about:blank';
        } catch
        {
            return 'about:blank';
        }
    }

    async getTabsInfo(): Promise<TabInfo[]> {
        const tabs = await chrome.tabs.query({});
        return tabs.map((tab, index) => ({
            pageId: tab.id || index,
            url: tab.url || "",
            title: tab.title || "Untitled"
        }));
    }

    async handleStateCommand(command: StateCommand, tabId: number): Promise<StateResponse> {
        try
        {
            switch (command.type)
            {
                case "showState": {
                    const url = await this.getCurrentUrl(tabId);
                    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    const viewport = await this.getViewportState(tabId);
                    const tabs = await this.getTabsInfo();

                    return {
                        state: {
                            url,
                            title: tab?.title || 'Untitled',
                            tabs,
                            viewport
                        }
                    };
                }

                case "showTabs": {
                    const tabs = await this.getTabsInfo();
                    return { state: { tabs } };
                }

                case "showViewport": {
                    const viewport = await this.getViewportState(tabId);
                    return { state: { viewport } };
                }

                case "scrollTo": {
                    if (!command.target || typeof command.target !== "string")
                    {
                        throw new Error("Invalid scroll target specified");
                    }

                    const scrollResult = await chrome.scripting.executeScript<[string], boolean>({
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
                        args: [command.target]
                    });

                    if (!scrollResult?.[0]?.result)
                    {
                        throw new Error("Element not found or not scrollable");
                    }

                    // Wait for smooth scroll to complete
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const viewport = await this.getViewportState(tabId);
                    return { state: { viewport } };
                }

                case "switchTab": {
                    if (command.target === undefined)
                    {
                        throw new Error("No tab target specified");
                    }

                    if (typeof command.target === "number")
                    {
                        await chrome.tabs.update(command.target, { active: true });
                    }
                    else
                    {
                        const targetTitle = String(command.target);
                        const tabs = await chrome.tabs.query({});
                        const targetTab = tabs.find(t =>
                            t.title?.toLowerCase().includes(targetTitle.toLowerCase())
                        );

                        if (!targetTab?.id)
                        {
                            throw new Error("Target tab not found");
                        }
                        await chrome.tabs.update(targetTab.id, { active: true });
                    }

                    const tabs = await this.getTabsInfo();
                    return { state: { tabs } };
                }

                default:
                    throw new Error("Unknown command type");
            }
        }
        catch (error)
        {
            console.error("State command error:", error);
            return { error: error instanceof Error ? error.message : "Unknown error" };
        }
    }

    updateState(partialState: Partial<BrowserState>): void {
        this.currentState = {
            ...this.currentState,
            ...partialState
        };
    }

    getState(): Partial<BrowserState> {
        return this.currentState;
    }
}
