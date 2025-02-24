import { messageHandler } from "./services/message";

// Set up message listener
chrome.runtime.onMessage.addListener((
    message: {
        type: string;
        target?: string;
        query?: string;
        command?: any;
        detailed?: boolean;
    },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: { success: boolean; error?: string; state?: any; elements?: any[]; snapshot?: string; }) => void
) => {
    // Handle message using our message handler service
    messageHandler.handleMessage(message, sendResponse)
        .catch(error => {
            console.error("Content script error:", error);
            sendResponse({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred"
            });
        });

    return true; // Will respond asynchronously
});

// Log successful injection
console.log("Auto Browser Extension Content Script Loaded");
