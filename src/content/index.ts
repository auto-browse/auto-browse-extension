// Listen for messages from the side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "contentScript")
    {
        // Handle any content script specific actions here
        sendResponse({ success: true });
    }
    return true;
});

// Inject any necessary content script functionality
console.log("Auto Browser Extension Content Script Loaded");
