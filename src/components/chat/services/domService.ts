import { DOMBaseNode, DOMElementNode, DOMTextNode } from "@/types/dom";

class DomTextNodeImpl implements DOMTextNode {
    type: 'TEXT_NODE' = 'TEXT_NODE';
    text: string;
    isVisible: boolean;
    parent?: DOMElementNode;

    constructor(text: string, isVisible: boolean, parent?: DOMElementNode) {
        this.text = text;
        this.isVisible = isVisible;
        this.parent = parent;
    }

    hasParentWithHighlightIndex(): boolean {
        let current = this.parent;
        while (current)
        {
            if (current.highlightIndex !== undefined)
            {
                return true;
            }
            current = current.parent;
        }
        return false;
    }
}

class DomElementNodeImpl implements DOMElementNode {
    tagName: string;
    xpath: string;
    attributes: Record<string, string>;
    children: (DOMElementNode | DOMTextNode)[];
    isInteractive: boolean;
    isVisible: boolean;
    isTopElement?: boolean;
    shadowRoot?: boolean;
    highlightIndex?: number;
    parent?: DOMElementNode;

    constructor(
        tagName: string,
        xpath: string,
        attributes: Record<string, string>,
        isInteractive: boolean,
        isVisible: boolean,
        children: (DOMElementNode | DOMTextNode)[] = [],
        isTopElement?: boolean,
        shadowRoot?: boolean,
        highlightIndex?: number,
        parent?: DOMElementNode
    ) {
        this.tagName = tagName;
        this.xpath = xpath;
        this.attributes = attributes;
        this.isInteractive = isInteractive;
        this.isVisible = isVisible;
        this.children = children;
        this.isTopElement = isTopElement;
        this.shadowRoot = shadowRoot;
        this.highlightIndex = highlightIndex;
        this.parent = parent;
    }

    getAllTextTillNextClickableElement(maxDepth: number = -1): string {
        const textParts: string[] = [];

        const collectText = (node: DOMBaseNode, currentDepth: number) => {
            if (maxDepth !== -1 && currentDepth > maxDepth)
            {
                return;
            }

            // Skip this branch if we hit a highlighted element (except for the current node)
            if (
                'highlightIndex' in node &&
                node !== this &&
                node.highlightIndex !== undefined
            )
            {
                return;
            }

            if ('type' in node && node.type === 'TEXT_NODE')
            {
                textParts.push((node as DOMTextNode).text);
            } else if ('children' in node)
            {
                const elementNode = node as DOMElementNode;
                for (const child of elementNode.children)
                {
                    collectText(child, currentDepth + 1);
                }
            }
        };

        collectText(this, 0);
        return textParts.join('\n').trim();
    }

    clickableElementsToString(includeAttributes: string[] = []): string {
        const formattedText: string[] = [];

        const processNode = (node: DOMBaseNode) => {
            if ('tagName' in node)
            {
                const elementNode = node as DOMElementNode;
                // Add element with highlight_index
                if (elementNode.highlightIndex !== undefined)
                {
                    let attributesStr = '';
                    if (includeAttributes.length > 0)
                    {
                        attributesStr = ' ' + includeAttributes
                            .map(attr => {
                                const value = elementNode.attributes[attr];
                                return value ? `${attr}="${value}"` : '';
                            })
                            .filter(Boolean)
                            .join(' ');
                    }
                    formattedText.push(
                        `${elementNode.highlightIndex}[:]<${elementNode.tagName}${attributesStr}>${elementNode.getAllTextTillNextClickableElement()}</${elementNode.tagName}>`
                    );
                }

                // Process children regardless
                for (const child of elementNode.children)
                {
                    processNode(child);
                }
            } else if ('type' in node && node.type === 'TEXT_NODE')
            {
                const textNode = node as DOMTextNode;
                // Add text only if it doesn't have a highlighted parent
                if (!textNode.hasParentWithHighlightIndex())
                {
                    formattedText.push(`_[:]{textNode.text}`);
                }
            }
        };

        processNode(this);
        return formattedText.join('\n');
    }

    hasParentWithHighlightIndex(): boolean {
        let current = this.parent;
        while (current)
        {
            if (current.highlightIndex !== undefined)
            {
                return true;
            }
            current = current.parent;
        }
        return false;
    }
}

export const domService = {
    createTextNode(text: string, isVisible: boolean, parent?: DOMElementNode): DOMTextNode {
        return new DomTextNodeImpl(text, isVisible, parent);
    },

    createElement(
        tagName: string,
        xpath: string,
        attributes: Record<string, string>,
        isInteractive: boolean,
        isVisible: boolean,
        children: (DOMElementNode | DOMTextNode)[] = [],
        isTopElement?: boolean,
        shadowRoot?: boolean,
        highlightIndex?: number,
        parent?: DOMElementNode
    ): DOMElementNode {
        return new DomElementNodeImpl(
            tagName,
            xpath,
            attributes,
            isInteractive,
            isVisible,
            children,
            isTopElement,
            shadowRoot,
            highlightIndex,
            parent
        );
    }
};
