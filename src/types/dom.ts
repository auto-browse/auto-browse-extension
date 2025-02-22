export interface DOMBaseNode {
    isVisible: boolean;
    parent?: DOMElementNode;

    hasParentWithHighlightIndex?(): boolean;
}

export interface DOMTextNode extends DOMBaseNode {
    type: 'TEXT_NODE';
    text: string;

    hasParentWithHighlightIndex(): boolean;
}

export interface DOMElementNode extends DOMBaseNode {
    tagName: string;
    xpath: string;
    attributes: Record<string, string>;
    children: (DOMElementNode | DOMTextNode)[];
    isInteractive: boolean;
    isTopElement?: boolean;
    shadowRoot?: boolean;
    highlightIndex?: number;

    getAllTextTillNextClickableElement(maxDepth?: number): string;
    clickableElementsToString(includeAttributes?: string[]): string;
}

export interface DOMState {
    elementTree: DOMElementNode;
    selectorMap: Map<number, DOMElementNode>;
}

// Helper type for the result from DOM traversal
export interface DOMTraversalResult {
    domTree: DOMElementNode;
    error?: string;
}
