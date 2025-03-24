import type { StateCommand } from "../../types/state";
import type { StateResponse, DOMResponse, ScreenshotResponse } from "../../types/chat";
import { webExtractTextWithPosition, webExtractNodeTree, webExtractNodeTreeAsString } from "../../../extractor";
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
            command?: StateCommand | 'tree' | 'elements' | 'text';
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

                case "extract":
                    return this.handleExtract(tabId, {
                        command: typeof message.command === 'string' ? message.command as 'tree' | 'elements' | 'text' : undefined
                    });

                case "state":
                    return this.handleStateCommand(tabId, {
                        command: typeof message.command === 'object' ? message.command as StateCommand : undefined
                    });

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

    /**
     * Handles extraction requests using the extractor functions
     */
    private async handleExtract(
        tabId: number,
        message: { command?: 'tree' | 'elements' | 'text'; }
    ): Promise<DOMResponse> {
        try
        {
            // Get the document.body from the active tab
            const result = await debuggerService.executeScript(
                tabId,
                `document.body`
            );

            if (!result)
            {
                return {
                    success: false,
                    error: "Could not access document body"
                };
            }

            let data;
            switch (message.command)
            {
                case "elements":
                    data = await debuggerService.executeScript(
                        tabId,
                        `(${webExtractTextWithPosition.toString()})(document.body)`
                    );
                    break;
                case "tree":
                    data = await debuggerService.executeScript(
                        tabId,
                        `(${webExtractNodeTree.toString()})(document.body)`
                    );
                    break;
                case "text":
                    data = await debuggerService.executeScript(
                        tabId,
                        `(${webExtractNodeTreeAsString.toString()})(document.body)`
                    );
                    break;
                default:
                    return {
                        success: false,
                        error: "Invalid extract command"
                    };
            }

            return {
                success: true,
                domTree: data
            };
        } catch (error)
        {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Failed to extract"
            };
        }
    }
}

// Create a singleton instance
export const messageHandler = new MessageHandler();
