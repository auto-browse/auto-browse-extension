import Protocol from "devtools-protocol";

export class DebuggerService {
    private connections = new Map<number, chrome.debugger.Debuggee>();

    async attach(tabId: number): Promise<void> {
        const target: chrome.debugger.Debuggee = { tabId };

        if (this.connections.has(tabId))
        {
            return;
        }

        return new Promise((resolve, reject) => {
            chrome.debugger.attach(target, "1.3", () => {
                if (chrome.runtime.lastError)
                {
                    reject(chrome.runtime.lastError);
                } else
                {
                    this.connections.set(tabId, target);
                    resolve();
                }
            });
        });
    }

    async detach(tabId: number): Promise<void> {
        if (!this.connections.has(tabId))
        {
            return;
        }

        await chrome.debugger.detach({ tabId });
        this.connections.delete(tabId);
    }

    async sendCommand<T>(
        tabId: number,
        method: string,
        params?: any
    ): Promise<T> {
        await this.attach(tabId);
        const target = this.connections.get(tabId)!;

        return new Promise((resolve, reject) => {
            chrome.debugger.sendCommand(
                target,
                method,
                params,
                (result) => {
                    if (chrome.runtime.lastError)
                    {
                        reject(chrome.runtime.lastError);
                    } else
                    {
                        resolve(result as T);
                    }
                }
            );
        });
    }

    async captureScreenshot(tabId: number): Promise<string> {
        const result = await this.sendCommand<Protocol.Page.CaptureScreenshotResponse>(
            tabId,
            "Page.captureScreenshot",
            { format: "png", quality: 100 }
        );

        return `data:image/png;base64,${result.data}`;
    }

    async executeScript<T>(tabId: number, script: string): Promise<T | null> {
        try
        {
            const result = await this.sendCommand<{ result: { value: T; }; }>(
                tabId,
                "Runtime.evaluate",
                {
                    expression: script,
                    returnByValue: true
                }
            );

            return result.result.value;
        } catch (error)
        {
            console.error("Error executing script:", error);
            return null;
        }
    }

    cleanup(): void {
        // Detach from all tabs when extension is unloaded
        this.connections.forEach((_, tabId) => {
            this.detach(tabId).catch(console.error);
        });
    }
}

// Create a singleton instance
export const debuggerService = new DebuggerService();

// Cleanup on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
    debuggerService.detach(tabId).catch(console.error);
});
