import { DOMElementNode, DOMTextNode } from "../types/dom";
import { ElementType, DOMElementInfo } from "../types/chat";

interface DOMTraversalResponse {
    error?: string;
    domTree?: any;
}

interface ContentScriptResponse {
    success: boolean;
    data?: string;
    error?: string;
    elements?: DOMElementInfo[];
}

interface DOMTraversalMessage {
    type: "traverseDOM";
    target?: ElementType;
    query?: string;
}

interface ContentScriptMessage {
    type: "contentScript" | "traverseDOM";
    target?: ElementType;
    query?: string;
}

// Listen for messages from the side panel
chrome.runtime.onMessage.addListener((
    message: ContentScriptMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: ContentScriptResponse) => void
) => {
    if (message.type === "contentScript")
    {
        // Handle any content script specific actions here
        sendResponse({ success: true });
    }
    else if (message.type === "traverseDOM")
    {
        // Forward the message to background script with target info
        chrome.runtime.sendMessage({
            type: "traverseDOM",
            target: message.target,
            query: message.query
        }, (response: DOMTraversalResponse) => {
            if (response.error)
            {
                sendResponse({ success: false, error: response.error });
            }
            else
            {
                // Process and filter elements based on target type
                const elements = processElements(response.domTree, message.target, message.query);
                sendResponse({
                    success: true,
                    elements
                });
            }
        });
        return true; // Will respond asynchronously
    }
    return true;
});

interface DOMNode {
    type?: 'TEXT_NODE';
    text?: string;
    isVisible?: boolean;
    children?: DOMNode[];
    highlightIndex?: number;
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

interface DOMNodeWithInteraction extends DOMNode {
    tagName?: string;
    xpath?: string;
    attributes?: Record<string, string>;
    isInteractive?: boolean;
    shadowRoot?: boolean;
}

function processElements(
    domTree: DOMNodeWithInteraction,
    target: ElementType = "interactive",
    query?: string
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
                shouldInclude = node.shadowRoot || false;
                elementType = "shadow";
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
            const element: DOMElementInfo = {
                type: elementType,
                highlightIndex: node.highlightIndex,
                xpath: node.xpath,
                attributes: node.attributes,
                text: getAllTextUntilNextClickable(node, node),
                isShadowHost: node.shadowRoot
            };
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
