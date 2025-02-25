import { StateResponse, DOMResponse, ScreenshotResponse } from "../types/chat";
import { messageHandler } from "./services/message";
import { debuggerService } from "./services/debugger";
import { tabService } from "./services/tab";
import { visualFeedbackService } from "./services/visualFeedback";
import { inputService } from "./services/input";
import { sidePanelService } from "./services/sidePanel";

// Handle messages from the sidepanel
chrome.runtime.onMessage.addListener(async (message) => {
    if (message.type === "sidepanel-shown")
    {
        try
        {
            sidePanelService.setOpen(true);
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id)
            {
                await debuggerService.attach(tab.id);
            }
        } catch (error)
        {
            console.error("Side panel show error:", error instanceof Error ? error.message : JSON.stringify(error));
        }
    }
    else if (message.type === "sidepanel-hidden")
    {
        try
        {
            sidePanelService.setOpen(false);
            await debuggerService.cleanup();
        } catch (error)
        {
            console.error("Side panel hide error:", error instanceof Error ? error.message : JSON.stringify(error));
        }
    }
});

// Handle tab state changes only when side panel is open
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try
    {
        if (sidePanelService.isShown())
        {
            await debuggerService.attach(activeInfo.tabId);
        }
    } catch (error)
    {
        console.error("Tab activation error:", error instanceof Error ? error.message : JSON.stringify(error));
    }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (changeInfo.status === "complete" && sidePanelService.isShown())
    {
        try
        {
            await debuggerService.attach(tabId);
        } catch (error)
        {
            console.error("Tab update error:", error instanceof Error ? error.message : JSON.stringify(error));
        }
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
