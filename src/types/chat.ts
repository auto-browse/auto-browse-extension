import { BrowserState, StateCommand, TabInfo } from "./state";
export type { StateCommand, TabInfo } from "./state";

// Message types
export type ElementType = 'interactive' | 'shadow' | 'iframe' | 'file' | 'text';

export interface DOMElementInfo {
    type: ElementType;
    highlightIndex?: number;
    xpath?: string;
    attributes?: Record<string, string>;
    text?: string;
    isShadowHost?: boolean;
}

// Command types
export type MessageCommand =
    | { type: 'screenshot'; }
    | { type: 'find'; target?: ElementType; query?: string; }
    | { type: 'help'; command?: StateCommand; }
    | { type: 'state'; command: StateCommand; };

// Response types
export interface StateResponse {
    success: boolean;
    state?: Partial<BrowserState>;
    error?: string;
}

export interface DOMResponse {
    success: boolean;
    elements?: DOMElementInfo[];
    domTree?: any;
    error?: string;
    data?: string;
}

export interface ScreenshotResponse {
    success: boolean;
    screenshotUrl?: string;
    error?: string;
}

// Chat message types
export interface ChatMessage {
    id: string;
    content: string;
    type: 'user' | 'system';
    timestamp: Date;
    command?: MessageCommand;
    image?: string;
    elements?: DOMElementInfo[];
    state?: Partial<BrowserState>;
    error?: string;
}

export interface ChatState {
    messages: ChatMessage[];
    isProcessing: boolean;
    selectedElement?: number;
}
