import type { DOMResponse, StateResponse, ScreenshotResponse } from "../../types/chat";
import type { StateCommand } from "../../types/state";
import { webExtractTextWithPosition, webExtractNodeTree, webExtractNodeTreeAsString } from "../../../extractor";
import { domService } from "./dom";

export class MessageHandler {
    /**
     * Handles messages from the extension's background script
     */
    async handleMessage(
        message: {
            type: string;
            target?: string;
            query?: string;
            command?: StateCommand | 'tree' | 'elements' | 'text';
            detailed?: boolean;
        },
        sendResponse: (response: { success: boolean; error?: string; state?: any; elements?: any[]; snapshot?: string; }) => void
    ): Promise<void> {
        try
        {
            switch (message.type)
            {
                case "aria-snapshot":
                    await this.handleAriaSnapshot(sendResponse);
                    break;

                case "state":
                    await this.handleStateCommand({
                        command: typeof message.command === 'object' ? message.command as StateCommand : undefined
                    }, sendResponse);
                    break;

                case "traverseDOM":
                    await this.handleDOMTraversal({
                        target: message.target,
                        query: message.query,
                        detailed: message.detailed
                    }, sendResponse);
                    break;

                case "extract":
                    await this.handleExtract({
                        command: typeof message.command === 'string' ? message.command as 'tree' | 'elements' | 'text' : undefined
                    }, sendResponse);
                    break;

                default:
                    sendResponse({
                        success: false,
                        error: "Unknown message type"
                    });
            }
        } catch (error)
        {
            console.error("Content script error:", error);
            sendResponse({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred"
            });
        }
    }

    /**
     * Handles requests to generate ARIA snapshots
     */
    private async handleAriaSnapshot(
        sendResponse: (response: { success: boolean; snapshot?: string; error?: string; }) => void
    ): Promise<void> {
        try
        {
            const snapshot = domService.generateAriaSnapshot();
            sendResponse({ success: true, snapshot });
        } catch (error)
        {
            sendResponse({
                success: false,
                error: error instanceof Error ? error.message : "Failed to generate ARIA snapshot"
            });
        }
    }

    /**
     * Handles state-related commands by forwarding them to the background script
     */
    private async handleStateCommand(
        message: { command?: StateCommand; },
        sendResponse: (response: StateResponse) => void
    ): Promise<void> {
        if (!message.command)
        {
            sendResponse({
                success: false,
                error: "No state command provided"
            });
            return;
        }

        // Forward state commands to background script
        const response = await chrome.runtime.sendMessage({
            type: "state",
            command: message.command
        }) as StateResponse;

        if (response.error)
        {
            sendResponse({
                success: false,
                error: response.error
            });
        } else
        {
            sendResponse({
                success: true,
                state: response.state
            });
        }
    }

    /**
     * Handles DOM traversal requests
     */
    private async handleDOMTraversal(
        message: { target?: string; query?: string; detailed?: boolean; },
        sendResponse: (response: DOMResponse) => void
    ): Promise<void> {
        // Forward traversal request to background script to get the DOM tree
        const response = await chrome.runtime.sendMessage({
            type: "traverseDOM",
            target: message.target,
            query: message.query,
            detailed: message.detailed
        }) as DOMResponse;

        if (response.error)
        {
            sendResponse({
                success: false,
                error: response.error
            });
            return;
        }

        const domTree = response.domTree;
        if (!domTree)
        {
            sendResponse({
                success: false,
                error: "No DOM tree received"
            });
            return;
        }

        // Process the DOM tree using our service
        const processedElements = domService.processElements(
            domTree,
            message.target as any,
            message.query,
            message.detailed
        );

        // Return the processed elements
        if (processedElements.length > 0)
        {
            sendResponse({
                success: true,
                elements: processedElements
            });
        } else
        {
            sendResponse({
                success: true,
                error: `No ${message.target || 'interactive'} elements found`
            });
        }
    }

    /**
     * Handles extraction requests using the extractor functions
     */
    private async handleExtract(
        message: { command?: 'tree' | 'elements' | 'text'; },
        sendResponse: (response: DOMResponse) => void
    ): Promise<void> {
        try
        {
            let data;
            switch (message.command)
            {
                case "elements":
                    data = webExtractTextWithPosition(document.body);
                    break;
                case "tree":
                    data = webExtractNodeTree(document.body);
                    break;
                case "text":
                    data = webExtractNodeTreeAsString(document.body);
                    break;
                default:
                    sendResponse({
                        success: false,
                        error: "Invalid extract command"
                    });
                    return;
            }

            sendResponse({
                success: true,
                domTree: data
            });
        } catch (error)
        {
            sendResponse({
                success: false,
                error: error instanceof Error ? error.message : "Failed to extract"
            });
        }
    }
}

// Create a singleton instance
export const messageHandler = new MessageHandler();
