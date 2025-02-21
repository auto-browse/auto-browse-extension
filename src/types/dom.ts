export interface DOMBaseNode {
    isVisible: boolean;
    parent?: DOMElementNode;
}

export interface DOMTextNode extends DOMBaseNode {
    type: 'TEXT_NODE';
    text: string;
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
