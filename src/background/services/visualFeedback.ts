import { debuggerService } from "./debugger";

export class VisualFeedbackService {
    private async injectStyles(tabId: number) {
        await chrome.scripting.insertCSS({
            target: { tabId },
            css: `
                .extension-pointer {
                    position: fixed;
                    width: 20px;
                    height: 20px;
                    background: rgba(255, 0, 0, 0.5);
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 10000;
                    transition: all 0.3s ease;
                    transform: translate(-50%, -50%);
                }
            `
        });
    }

    async showPointer(tabId: number, x: number, y: number) {
        try
        {
            await this.injectStyles(tabId);
            await debuggerService.executeScript(tabId, `
                (() => {
                    let pointer = document.querySelector('.extension-pointer');
                    if (!pointer) {
                        pointer = document.createElement('div');
                        pointer.className = 'extension-pointer';
                        document.body.appendChild(pointer);
                    }
                    pointer.style.left = '${x}px';
                    pointer.style.top = '${y}px';
                })()
            `);
        } catch (error)
        {
            console.error('Error showing pointer:', error);
        }
    }

    async hidePointer(tabId: number) {
        try
        {
            await debuggerService.executeScript(tabId, `
                (() => {
                    const pointer = document.querySelector('.extension-pointer');
                    if (pointer) {
                        pointer.remove();
                    }
                })()
            `);
        } catch (error)
        {
            console.error('Error hiding pointer:', error);
        }
    }
}

// Create a singleton instance
export const visualFeedbackService = new VisualFeedbackService();
