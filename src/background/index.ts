import Protocol from "devtools-protocol";
import { StateManager } from "./state-manager";
import { StateCommand } from "../types/state";
import { StateResponse, DOMResponse, ScreenshotResponse } from "../types/chat";
import { domTraversalScript } from "./domTraversal";

let connections = new Map<number, chrome.debugger.Debuggee>();
let stateManager: StateManager | null = null;

// Initialize state manager
async function initStateManager(tabId: number) {
    try
    {
        await attachDebugger(tabId);
        stateManager = new StateManager();
        await stateManager.handleStateCommand({ type: "showState" }, tabId);
        console.log("State manager initialized for tab:", tabId);
    } catch (error)
    {
        console.error("Failed to initialize state manager:", error instanceof Error ? error.message : JSON.stringify(error));
        throw error;
    }
}

// Initialize on tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try
    {
        await initStateManager(activeInfo.tabId);
    } catch (error)
    {
        console.error("Tab activation error:", error instanceof Error ? error.message : JSON.stringify(error));
    }
});

// Message handler
chrome.runtime.onMessage.addListener((
    message: { type: string; target?: string; query?: string; command?: StateCommand; detailed?: boolean; },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: StateResponse | DOMResponse | ScreenshotResponse) => void
) => {
    const handleMessage = async () => {
        try
        {
            // Get active tab if sender tab is not available
            const tabId = sender.tab?.id || (await getActiveTabId());
            if (!tabId)
            {
                throw new Error("No active tab found");
            }

            // Initialize state manager if not exists
            if (!stateManager)
            {
                await initStateManager(tabId);
            }

            switch (message.type)
            {
                case "takeScreenshot": {
                    const result = await handleScreenshot(tabId);
                    sendResponse({
                        success: true,
                        screenshotUrl: result.screenshotUrl
                    });
                    break;
                }

                case "traverseDOM": {
                    console.log('Background script received traverseDOM message:', message);
                    const result = await handleDOMTraversal(tabId, message.target, message.query, message.detailed);
                    console.log('Background script sending DOM tree:', result.domTree);
                    sendResponse({
                        success: result.domTree !== null,
                        domTree: result.domTree,
                        error: result.domTree === null ? "Failed to traverse DOM" : undefined
                    });
                    break;
                }

                case "state": {
                    if (!stateManager || !message.command)
                    {
                        sendResponse({
                            success: false,
                            error: "State manager not initialized or invalid command"
                        });
                        return;
                    }
                    const result = await stateManager.handleStateCommand(message.command, tabId);
                    if (result.error)
                    {
                        sendResponse({
                            success: false,
                            error: result.error
                        });
                    } else
                    {
                        sendResponse({
                            success: true,
                            state: result.state
                        });
                    }
                    break;
                }

                default:
                    sendResponse({
                        success: false,
                        error: "Unknown message type"
                    });
            }
        } catch (error)
        {
            console.error("Message handling error:", error instanceof Error ? error.message : JSON.stringify(error));
            sendResponse({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred"
            });
        }
    };

    handleMessage();
    return true; // Will respond asynchronously
});

async function getActiveTabId(): Promise<number> {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0 && tabs[0].id != null)
            {
                resolve(tabs[0].id);
            } else
            {
                reject(new Error("No active tab found"));
            }
        });
    });
}

async function handleScreenshot(tabId: number): Promise<{ screenshotUrl: string; }> {
    try
    {
        // Attach debugger if not already attached
        if (!connections.has(tabId))
        {
            await attachDebugger(tabId);
        }

        const target: chrome.debugger.Debuggee = { tabId };

        // Capture screenshot
        const result = await new Promise<Protocol.Page.CaptureScreenshotResponse>((resolve, reject) => {
            chrome.debugger.sendCommand(
                target,
                "Page.captureScreenshot",
                { format: "png", quality: 100 },
                (result) => {
                    if (chrome.runtime.lastError)
                    {
                        reject(chrome.runtime.lastError);
                    } else
                    {
                        resolve(result as Protocol.Page.CaptureScreenshotResponse);
                    }
                }
            );
        });

        // Return a data URL instead of using URL.createObjectURL
        const screenshotUrl = `data:image/png;base64,${result.data}`;
        return { screenshotUrl };
    } catch (error)
    {
        console.error("Screenshot error:", error);
        throw error;
    }
}

async function attachDebugger(tabId: number): Promise<void> {
    const target: chrome.debugger.Debuggee = { tabId };

    return new Promise((resolve, reject) => {
        chrome.debugger.attach(target, "1.3", () => {
            if (chrome.runtime.lastError)
            {
                reject(chrome.runtime.lastError);
            } else
            {
                connections.set(tabId, target);
                resolve();
            }
        });
    });
}

async function handleDOMTraversal(
    tabId: number,
    target?: string,
    query?: string,
    detailed?: boolean
): Promise<{ domTree: any; }> {
    if (!tabId)
    {
        throw new Error("No active tab found");
    }

    try
    {
        // Attach debugger if not already attached
        if (!connections.has(tabId))
        {
            await attachDebugger(tabId);
        }

        const target: chrome.debugger.Debuggee = { tabId };

        // Execute the DOM traversal script
        const result = await new Promise<{ result: { value: any; }; }>((resolve, reject) => {
            try
            {
                chrome.debugger.sendCommand(
                    target,
                    "Runtime.evaluate",
                    {
                        expression: domTraversalScript,
                        returnByValue: true
                    },
                    (result: any) => {
                        if (chrome.runtime.lastError)
                        {
                            reject(chrome.runtime.lastError);
                        } else
                        {
                            resolve(result);
                        }
                    }
                );
            } catch (error)
            {
                reject(error);
            }
        });
        if (!result.result.value)
        {
            return { domTree: null };
        }
        return { domTree: result.result.value };
    } catch (error)
    {
        console.error("Error evaluating domTraversalScript:", error);
        return { domTree: null };
    }
}

// Clean up debugger connections when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    if (connections.has(tabId))
    {
        chrome.debugger.detach({ tabId });
        connections.delete(tabId);
    }
});
