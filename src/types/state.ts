export interface ViewportState {
    pixelsAbove: number;
    pixelsBelow: number;
    width: number;
    height: number;
}

export interface TabInfo {
    pageId: number;
    url: string;
    title: string;
}

export interface BrowserState {
    url: string;
    title: string;
    domTree: any; // Will be properly typed when we integrate with DOM types
    selectorMap: Map<number, any>;
    tabs: TabInfo[];
    viewport: ViewportState;
    screenshot?: string;
}

export interface StateUpdateMessage {
    type: 'stateUpdate';
    state: Partial<BrowserState>;
}

export interface StateCommand {
    type: 'showState' | 'showTabs' | 'showViewport' | 'scrollTo' | 'switchTab';
    target?: string | number; // For scrollTo (element id/xpath) or switchTab (tab id/title)
}

export interface StateResponse {
    state?: Partial<BrowserState>;
    error?: string;
}
