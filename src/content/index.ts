import { DOMElementNode, DOMTextNode } from "../types/dom";
import { ElementType, DOMElementInfo, StateResponse, DOMResponse, ScreenshotResponse, AriaResponse } from "../types/chat";
import { generateAriaTree, renderAriaTree } from "../asnap/ariaSnapshot";
import { BrowserState, StateCommand } from "../types/state";

// Listen for messages from the side panel
chrome.runtime.onMessage.addListener((
    message: { type: string; target?: ElementType; query?: string; command?: StateCommand; detailed?: boolean; },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: { success: boolean; error?: string; state?: Partial<BrowserState>; elements?: DOMElementInfo[]; snapshot?: string; }) => void
) => {
    const handleMessage = async () => {
        try
        {
            switch (message.type)
            {
                case "aria-snapshot": {
                    try
                    {
                        const ariaTree = generateAriaTree(document.body);
                        const snapshot = renderAriaTree(ariaTree.root, { mode: 'raw' });
                        sendResponse({ success: true, snapshot });
                    } catch (error)
                    {
                        sendResponse({
                            success: false,
                            error: error instanceof Error ? error.message : "Failed to generate ARIA snapshot"
                        });
                    }
                    break;
                }

                case "state": {
                    if (!message.command)
                    {
                        sendResponse({ success: false, error: "No state command provided" });
                        return;
                    }

                    const response = await chrome.runtime.sendMessage({
                        type: "state",
                        command: message.command
                    }) as StateResponse;

                    if (response.error)
                    {
                        sendResponse({ success: false, error: response.error });
                    } else
                    {
                        sendResponse({ success: true, state: response.state });
                    }
                    break;
                }

                case "traverseDOM": {
                    console.log('Content script sending traverseDOM message:', message);
                    const responsePromise = new Promise<DOMResponse>((resolve) => {
                        chrome.runtime.sendMessage({
                            type: "traverseDOM",
                            target: message.target,
                            query: message.query,
                            detailed: message.detailed
                        }, (response) => {
                            resolve(response as DOMResponse);
                        });
                    });
                    const response = await responsePromise;
                    console.log('Content script received DOM response:', response);
                    if (response.error)
                    {
                        sendResponse({ success: false, error: response.error });
                        return;
                    }

                    const domTree = response.domTree;
                    if (!domTree)
                    {
                        sendResponse({ success: false, error: "No DOM tree received" });
                        return;
                    }
                    const processedElements = processElements(
                        domTree,
                        message.target as ElementType,
                        message.query,
                        message.detailed
                    );

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
                    break;
                }

                default:
                    sendResponse({ success: false, error: "Unknown message type" });
            }
        } catch (error)
        {
            console.error('Content script error:', error);
            sendResponse({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred"
            });
        }
    };

    handleMessage();
    return true; // Will respond asynchronously
});

interface DOMNode {
    type?: 'TEXT_NODE';
    text?: string;
    isVisible?: boolean;
    children?: DOMNodeWithInteraction[];
    highlightIndex?: number;
    isInteractive?: boolean;
    shadowRoot?: boolean;
    tagName?: string;
    xpath?: string;
    attributes?: Record<string, string>;
}

function getAllTextUntilNextClickable(node: DOMNode, startNode: DOMNode): string {
    const textParts: string[] = [];

    function collectText(currentNode: DOMNode, depth: number = 0) {
        // Skip this branch if we hit a highlighted element (except for the starting node)
        if (currentNode !== startNode && currentNode.highlightIndex !== undefined)
        {
            return;
        }

        if (currentNode.type === 'TEXT_NODE' && currentNode.text)
        {
            const trimmedText = currentNode.text.trim();
            if (currentNode.isVisible && trimmedText)
            {
                textParts.push(trimmedText);
            }
        } else if (currentNode.children)
        {
            currentNode.children.forEach((child: DOMNode) => collectText(child, depth + 1));
        }
    }

    collectText(node);
    return textParts.join(' ').trim();
}

// DOMNodeWithInteraction is now equivalent to DOMNode
type DOMNodeWithInteraction = DOMNode;

function processElements(
    domTree: DOMNodeWithInteraction,
    target: ElementType = "interactive",
    query?: string,
    detailed: boolean = false
): DOMElementInfo[] {
    const elements: DOMElementInfo[] = [];

    function processNode(node: DOMNodeWithInteraction) {
        let shouldInclude = false;
        let elementType: ElementType = "interactive";

        switch (target)
        {
            case "interactive":
                shouldInclude = node.isInteractive || false;
                break;
            case "shadow":
                if (node.shadowRoot)
                {
                    // Only include visible shadow hosts
                    const isVisible = node.isVisible || false;
                    shouldInclude = isVisible;
                    elementType = "shadow";

                    // Check for interactivity within shadow root
                    if (node.children && node.children.length > 0)
                    {
                        const hasInteractiveChildren = node.children.some(child =>
                            child.isInteractive || (child.shadowRoot && child.isVisible)
                        );
                        shouldInclude = shouldInclude && hasInteractiveChildren;
                    }
                }
                break;
            case "iframe":
                shouldInclude = node.tagName === "iframe";
                elementType = "iframe";
                break;
            case "file":
                shouldInclude = node.tagName === "input" && node.attributes?.["type"] === "file";
                elementType = "file";
                break;
            case "text":
                if (query)
                {
                    const text = getAllTextUntilNextClickable(node, node).toLowerCase();
                    shouldInclude = text.includes(query.toLowerCase());
                    elementType = "text";
                }
                break;
        }

        if (shouldInclude)
        {
            let element: DOMElementInfo = {
                type: elementType,
                highlightIndex: node.highlightIndex,
                xpath: node.xpath,
                attributes: detailed ? node.attributes : undefined,
                text: detailed ? getAllTextUntilNextClickable(node, node) : undefined,
                isShadowHost: node.shadowRoot
            };

            // For shadow elements in detailed mode, include additional info about shadow root
            if (elementType === "shadow" && detailed && node.children)
            {
                const interactiveChildren = node.children.filter(child =>
                    child.isInteractive || (child.shadowRoot && child.isVisible)
                );
                if (interactiveChildren.length > 0)
                {
                    element.text = `Contains ${interactiveChildren.length} interactive elements`;
                }
            }
            elements.push(element);
        }

        if (node.children)
        {
            node.children.forEach((child: DOMNodeWithInteraction) => processNode(child));
        }
    }

    processNode(domTree);
    return elements;
}

// Inject any necessary content script functionality
console.log("Auto Browser Extension Content Script Loaded");
