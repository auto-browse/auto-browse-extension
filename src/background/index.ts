import { StateResponse, DOMResponse, ScreenshotResponse } from "../types/chat";
import { messageHandler } from "./services/message";
import { debuggerService } from "./services/debugger";
import { tabService } from "./services/tab";

// Initialize state management for newly activated tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try
    {
        // Pre-attach debugger to the tab for faster subsequent operations
        await debuggerService.attach(activeInfo.tabId);
    } catch (error)
    {
        console.error("Tab activation error:", error instanceof Error ? error.message : JSON.stringify(error));
    }
});

// Handle all incoming messages using the message handler service
chrome.runtime.onMessage.addListener((
    message: {
        type: string;
        target?: string;
        query?: string;
        command?: any;
        detailed?: boolean;
    },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: StateResponse | DOMResponse | ScreenshotResponse) => void
) => {
    messageHandler.handleMessage(message, sender)
        .then(sendResponse)
        .catch((error) => {
            console.error("Message handling error:", error);
            sendResponse({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred"
            });
        });

    return true; // Indicates we will send response asynchronously
});

// Clean up resources when extension is unloaded
chrome.runtime.onSuspend.addListener(() => {
    debuggerService.cleanup();
});
