import Protocol from "devtools-protocol";
import { tabService } from "./tab";

export class DebuggerService {
    private connections = new Map<number, chrome.debugger.Debuggee>();
    private attachingDebuggers = new Map<number, Promise<void>>();

    private isRestrictedUrl(url: string): boolean {
        return (
            url.startsWith("chrome://") ||
            url.startsWith("chrome-extension://") ||
            url.startsWith("devtools://") ||
            url.startsWith("edge://")
        );
    }

    private async notifyError(tabId: number, error: unknown) {
        await chrome.runtime.sendMessage({
            type: "debugger-error",
            tabId,
            error: error instanceof Error ? error.message : String(error)
        });
    }

    async attach(tabId: number): Promise<void> {
        // If already attaching, wait for completion
        if (this.attachingDebuggers.has(tabId))
        {
            await this.attachingDebuggers.get(tabId);
            return;
        }

        const attachPromise = (async () => {
            try
            {
                const url = await tabService.getCurrentUrl(tabId);
                if (this.isRestrictedUrl(url))
                {
                    console.log(`Skipping debugger attachment for restricted URL: ${url}`);
                    return;
                }

                const target: chrome.debugger.Debuggee = { tabId };

                if (!this.connections.has(tabId))
                {
                    await new Promise<void>((resolve, reject) => {
                        chrome.debugger.attach(target, "1.3", () => {
                            if (chrome.runtime.lastError)
                            {
                                reject(chrome.runtime.lastError);
                            } else
                            {
                                this.connections.set(tabId, target);
                                // Add small delay for debugger initialization
                                setTimeout(resolve, 200);
                            }
                        });
                    });
                }
            } catch (error)
            {
                console.error(`Failed to attach debugger to tab ${tabId}:`, error);
                await this.notifyError(tabId, error);
                throw error;
            }
        })();

        this.attachingDebuggers.set(tabId, attachPromise);

        try
        {
            await attachPromise;
        } finally
        {
            this.attachingDebuggers.delete(tabId);
        }
    }

    getConnectedTabs(): number[] {
        return Array.from(this.connections.keys());
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
