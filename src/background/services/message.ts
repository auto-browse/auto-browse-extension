import type { StateCommand } from "../../types/state";
import type { StateResponse, DOMResponse, ScreenshotResponse } from "../../types/chat";
import { debuggerService } from "./debugger";
import { tabService } from "./tab";
import { domTraversalScript } from "../domTraversal";

export class MessageHandler {
    /**
     * Handles incoming messages from the content script or popup
     */
    async handleMessage(
        message: {
            type: string;
            target?: string;
            query?: string;
            command?: StateCommand;
            detailed?: boolean;
        },
        sender: chrome.runtime.MessageSender
    ): Promise<StateResponse | DOMResponse | ScreenshotResponse> {
        try
        {
            // Get active tab if sender tab is not available
            const tabId = sender.tab?.id || await tabService.getActiveTabId();

            switch (message.type)
            {
                case "takeScreenshot":
                    return this.handleScreenshot(tabId);

                case "traverseDOM":
                    return this.handleDOMTraversal(tabId, message);

                case "state":
                    return this.handleStateCommand(tabId, message);

                default:
                    return {
                        success: false,
                        error: "Unknown message type"
                    };
            }
        } catch (error)
        {
            console.error("Message handling error:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred"
            };
        }
    }

    /**
     * Handles screenshot capture requests
     */
    private async handleScreenshot(tabId: number): Promise<ScreenshotResponse> {
        try
        {
            const screenshotUrl = await debuggerService.captureScreenshot(tabId);
            return {
                success: true,
                screenshotUrl
            };
        } catch (error)
        {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Failed to capture screenshot"
            };
        }
    }

    /**
     * Handles DOM traversal requests
     */
    private async handleDOMTraversal(
        tabId: number,
        message: { target?: string; query?: string; detailed?: boolean; }
    ): Promise<DOMResponse> {
        try
        {
            const domTree = await debuggerService.executeScript(tabId, domTraversalScript);
            return {
                success: domTree !== null,
                domTree,
                error: domTree === null ? "Failed to traverse DOM" : undefined
            };
        } catch (error)
        {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Failed to traverse DOM"
            };
        }
    }

    /**
     * Handles state-related commands
     */
    private async handleStateCommand(
        tabId: number,
        message: { command?: StateCommand; }
    ): Promise<StateResponse> {
        if (!message.command)
        {
            return {
                success: false,
                error: "No state command provided"
            };
        }

        try
        {
            switch (message.command.type)
            {
                case "showState": {
                    const [url, title, viewport, tabs] = await Promise.all([
                        tabService.getCurrentUrl(tabId),
                        tabService.getActiveTab().then(tab => tab.title || "Untitled"),
                        tabService.getViewportState(tabId),
                        tabService.getAllTabs()
                    ]);

                    return {
                        success: true,
                        state: { url, title, viewport, tabs }
                    };
                }

                case "showTabs": {
                    const tabs = await tabService.getAllTabs();
                    return {
                        success: true,
                        state: { tabs }
                    };
                }

                case "showViewport": {
                    const viewport = await tabService.getViewportState(tabId);
                    return {
                        success: true,
                        state: { viewport }
                    };
                }

                case "scrollTo": {
                    if (!message.command.target)
                    {
                        return {
                            success: false,
                            error: "No scroll target specified"
                        };
                    }

                    if (typeof message.command.target !== "string")
                    {
                        return {
                            success: false,
                            error: "Scroll target must be a string selector"
                        };
                    }

                    const success = await tabService.scrollToElement(tabId, message.command.target);
                    if (!success)
                    {
                        return {
                            success: false,
                            error: "Element not found or not scrollable"
                        };
                    }

                    // Wait for smooth scroll to complete
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const viewport = await tabService.getViewportState(tabId);
                    return {
                        success: true,
                        state: { viewport }
                    };
                }

                case "switchTab": {
                    if (message.command.target === undefined)
                    {
                        return {
                            success: false,
                            error: "No tab target specified"
                        };
                    }

                    await tabService.switchToTab(message.command.target);
                    const tabs = await tabService.getAllTabs();
                    return {
                        success: true,
                        state: { tabs }
                    };
                }

                default:
                    return {
                        success: false,
                        error: "Unknown state command"
                    };
            }
        } catch (error)
        {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Failed to handle state command"
            };
        }
    }
}

// Create a singleton instance
export const messageHandler = new MessageHandler();
