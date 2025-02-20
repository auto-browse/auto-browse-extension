import Protocol from "devtools-protocol";
import { v4 as uuidv4 } from "uuid";

let connections = new Map<number, chrome.debugger.Debuggee>();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "takeScreenshot")
    {
        handleScreenshot(sender.tab?.id as number)
            .then(sendResponse)
            .catch((error) => sendResponse({ error: error.message }));
        return true; // Will respond asynchronously
    }
});

async function handleScreenshot(tabId: number): Promise<{ screenshotUrl: string; }> {
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

        // Convert base64 to blob URL
        const byteCharacters = atob(result.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++)
        {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/png" });
        const screenshotUrl = URL.createObjectURL(blob);

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

// Clean up debugger connections when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    if (connections.has(tabId))
    {
        chrome.debugger.detach({ tabId });
        connections.delete(tabId);
    }
});
