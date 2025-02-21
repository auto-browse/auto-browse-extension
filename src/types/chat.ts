export type ElementType = 'interactive' | 'shadow' | 'iframe' | 'file' | 'text';

export interface DOMElementInfo {
    type: ElementType;
    highlightIndex?: number;
    xpath?: string;
    attributes?: Record<string, string>;
    text?: string;
    isShadowHost?: boolean;
}

export interface ChatMessage {
    id: string;
    content: string;
    type: 'user' | 'system';
    timestamp: Date;
    image?: string; // For screenshot URLs
    elements?: DOMElementInfo[]; // For DOM traversal results
    command?: {
        type: 'screenshot' | 'find' | 'help';
        target?: ElementType;
        query?: string;
    };
}

export interface ChatState {
    messages: ChatMessage[];
    isProcessing: boolean;
    selectedElement?: number; // highlightIndex of selected element
}
