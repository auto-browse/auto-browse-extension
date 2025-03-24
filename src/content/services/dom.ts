import { DOMElementInfo, ElementType } from "../../types/chat";
import { generateAriaTree, renderAriaTree, type AriaNode } from "../../asnap/ariaSnapshot";

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

type DOMNodeWithInteraction = DOMNode;

export class DOMService {
    /**
     * Process DOM nodes and return elements matching the specified criteria
     */
    processElements(
        domTree: DOMNodeWithInteraction,
        target: ElementType = "interactive",
        query?: string,
        detailed: boolean = false
    ): DOMElementInfo[] {
        const elements: DOMElementInfo[] = [];

        const processNode = (node: DOMNodeWithInteraction) => {
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
                        const text = this.getAllTextUntilNextClickable(node, node).toLowerCase();
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
                    text: detailed ? this.getAllTextUntilNextClickable(node, node) : undefined,
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
                node.children.forEach(child => processNode(child));
            }
        };

        processNode(domTree);
        return elements;
    }

    /**
     * Generate an ARIA snapshot of the current page
     */
    generateAriaSnapshot(): string {
        const ariaTree = generateAriaTree(document.body);
        return renderAriaTree(ariaTree.root, { mode: 'raw' });
    }

    /**
     * Collects all text content until the next clickable element is encountered
     */
    private getAllTextUntilNextClickable(node: DOMNode, startNode: DOMNode): string {
        const textParts: string[] = [];

        const collectText = (currentNode: DOMNode) => {
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
                currentNode.children.forEach(child => collectText(child));
            }
        };

        collectText(node);
        return textParts.join(' ').trim();
    }
}

// Create a singleton instance
export const domService = new DOMService();
