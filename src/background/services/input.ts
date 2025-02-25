import { debuggerService } from "./debugger";

export class InputService {
    async simulateMouseEvent(
        tabId: number,
        type: "move" | "click" | "wheel",
        x: number,
        y: number,
        options: { deltaX?: number; deltaY?: number; } = {}
    ) {
        try
        {
            const baseParams = {
                x,
                y,
                button: "left" as const,
                clickCount: type === "click" ? 1 : 0,
                ...options
            };

            if (type === "click")
            {
                // Mouse down
                await debuggerService.sendCommand(
                    tabId,
                    "Input.dispatchMouseEvent",
                    {
                        ...baseParams,
                        type: "mousePressed"
                    }
                );

                // Small delay to simulate real click
                await new Promise(resolve => setTimeout(resolve, 50));

                // Mouse up
                await debuggerService.sendCommand(
                    tabId,
                    "Input.dispatchMouseEvent",
                    {
                        ...baseParams,
                        type: "mouseReleased"
                    }
                );
            } else if (type === "wheel")
            {
                await debuggerService.sendCommand(
                    tabId,
                    "Input.dispatchMouseEvent",
                    {
                        type: "mouseWheel",
                        x,
                        y,
                        deltaX: options.deltaX || 0,
                        deltaY: options.deltaY || 0
                    }
                );
            } else
            {
                // Move
                await debuggerService.sendCommand(
                    tabId,
                    "Input.dispatchMouseEvent",
                    {
                        ...baseParams,
                        type: "mouseMoved"
                    }
                );
            }
        } catch (error)
        {
            console.error("Error simulating mouse event:", error);
            throw error;
        }
    }

    async simulateKeyEvent(
        tabId: number,
        key: string,
        type: "keyDown" | "keyUp",
        modifiers?: string[]
    ) {
        try
        {
            await debuggerService.sendCommand(
                tabId,
                "Input.dispatchKeyEvent",
                {
                    type,
                    windowsVirtualKeyCode: key.charCodeAt(0),
                    key,
                    code: `Key${key.toUpperCase()}`,
                    commands: modifiers || []
                }
            );
        } catch (error)
        {
            console.error("Error simulating key event:", error);
            throw error;
        }
    }

    async typeText(tabId: number, text: string, delay = 100) {
        for (const char of text)
        {
            await this.simulateKeyEvent(tabId, char, "keyDown");
            await new Promise(resolve => setTimeout(resolve, delay));
            await this.simulateKeyEvent(tabId, char, "keyUp");
        }
    }
}

// Create a singleton instance
export const inputService = new InputService();
