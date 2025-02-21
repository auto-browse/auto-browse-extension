import Protocol from "devtools-protocol";
import { StateManager } from "./state-manager";
import { StateCommand } from "../types/state";
import { StateResponse, DOMResponse, ScreenshotResponse } from "../types/chat";

let connections = new Map<number, chrome.debugger.Debuggee>();
let stateManager: StateManager | null = null;

// Initialize state manager
async function initStateManager(tabId: number) {
    try
    {
        await attachDebugger(tabId);
        stateManager = new StateManager();
        await stateManager.handleStateCommand({ type: "showState" }, tabId);
        console.log("State manager initialized for tab:", tabId);
    } catch (error)
    {
        console.error("Failed to initialize state manager:", error instanceof Error ? error.message : JSON.stringify(error));
        throw error;
    }
}

// Initialize on tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try
    {
        await initStateManager(activeInfo.tabId);
    } catch (error)
    {
        console.error("Tab activation error:", error instanceof Error ? error.message : JSON.stringify(error));
    }
});

// Message handler
chrome.runtime.onMessage.addListener((
    message: { type: string; target?: string; query?: string; command?: StateCommand; },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: StateResponse | DOMResponse | ScreenshotResponse) => void
) => {
    const handleMessage = async () => {
        try
        {
            // Get active tab if sender tab is not available
            const tabId = sender.tab?.id || (await getActiveTabId());
            if (!tabId)
            {
                throw new Error("No active tab found");
            }

            // Initialize state manager if not exists
            if (!stateManager)
            {
                await initStateManager(tabId);
            }

            switch (message.type)
            {
                case "takeScreenshot": {
                    const result = await handleScreenshot(tabId);
                    sendResponse({
                        success: true,
                        screenshotUrl: result.screenshotUrl
                    });
                    break;
                }

                case "traverseDOM": {
                    console.log('Background script received traverseDOM message:', message);
                    const result = await handleDOMTraversal(tabId, message.target, message.query);
                    console.log('Background script sending DOM tree:', result.domTree);
                    sendResponse({
                        success: result.domTree !== null,
                        domTree: result.domTree,
                        error: result.domTree === null ? "Failed to traverse DOM" : undefined
                    });
                    break;
                }

                case "state": {
                    if (!stateManager || !message.command)
                    {
                        sendResponse({
                            success: false,
                            error: "State manager not initialized or invalid command"
                        });
                        return;
                    }
                    const result = await stateManager.handleStateCommand(message.command, tabId);
                    if (result.error)
                    {
                        sendResponse({
                            success: false,
                            error: result.error
                        });
                    } else
                    {
                        sendResponse({
                            success: true,
                            state: result.state
                        });
                    }
                    break;
                }

                default:
                    sendResponse({
                        success: false,
                        error: "Unknown message type"
                    });
            }
        } catch (error)
        {
            console.error("Message handling error:", error instanceof Error ? error.message : JSON.stringify(error));
            sendResponse({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred"
            });
        }
    };

    handleMessage();
    return true; // Will respond asynchronously
});

async function getActiveTabId(): Promise<number> {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0 && tabs[0].id != null)
            {
                resolve(tabs[0].id);
            } else
            {
                reject(new Error("No active tab found"));
            }
        });
    });
}

async function handleScreenshot(tabId: number): Promise<{ screenshotUrl: string; }> {
    try
    {
        // Attach debugger if not already attached
        if (!connections.has(tabId))
        {
            await attachDebugger(tabId);
        }

        const target: chrome.debugger.Debuggee = { tabId };

        // Capture screenshot
        const result = await new Promise<Protocol.Page.CaptureScreenshotResponse>((resolve, reject) => {
            chrome.debugger.sendCommand(
                target,
                "Page.captureScreenshot",
                { format: "png", quality: 100 },
                (result) => {
                    if (chrome.runtime.lastError)
                    {
                        reject(chrome.runtime.lastError);
                    } else
                    {
                        resolve(result as Protocol.Page.CaptureScreenshotResponse);
                    }
                }
            );
        });

        // Return a data URL instead of using URL.createObjectURL
        const screenshotUrl = `data:image/png;base64,${result.data}`;
        return { screenshotUrl };
    } catch (error)
    {
        console.error("Screenshot error:", error);
        throw error;
    }
}

async function attachDebugger(tabId: number): Promise<void> {
    const target: chrome.debugger.Debuggee = { tabId };

    return new Promise((resolve, reject) => {
        chrome.debugger.attach(target, "1.3", () => {
            if (chrome.runtime.lastError)
            {
                reject(chrome.runtime.lastError);
            } else
            {
                connections.set(tabId, target);
                resolve();
            }
        });
    });
}

async function handleDOMTraversal(
    tabId: number,
    target?: string,
    query?: string
): Promise<{ domTree: any; }> {
    if (!tabId)
    {
        throw new Error("No active tab found");
    }

    try
    {
        // Attach debugger if not already attached
        if (!connections.has(tabId))
        {
            await attachDebugger(tabId);
        }

        const target: chrome.debugger.Debuggee = { tabId };

        // Execute the DOM traversal script
        const result = await new Promise<{ result: { value: any; }; }>((resolve, reject) => {
            try
            {
                chrome.debugger.sendCommand(
                    target,
                    "Runtime.evaluate",
                    {
                        expression: domTraversalScript,
                        returnByValue: true
                    },
                    (result: any) => {
                        if (chrome.runtime.lastError)
                        {
                            reject(chrome.runtime.lastError);
                        } else
                        {
                            resolve(result);
                        }
                    }
                );
            } catch (error)
            {
                reject(error);
            }
        });
        if (!result.result.value)
        {
            return { domTree: null };
        }
        return { domTree: result.result.value };
    } catch (error)
    {
        console.error("Error evaluating domTraversalScript:", error);
        return { domTree: null };
    }
}

// Clean up debugger connections when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    if (connections.has(tabId))
    {
        chrome.debugger.detach({ tabId });
        connections.delete(tabId);
    }
});

// DOM traversal script
const domTraversalScript = `(() => {
    try {
        window.domCapture = {
            highlightIndex: 0,

            getXPath(node) {
                if (!node || !node.nodeName) return '';
                let name = node.nodeName.toLowerCase();
                const parent = node.parentNode;
                if (!parent) return name;

                const siblings = parent.children;
                let siblingCount = 0;
                let siblingIndex = 0;

                for (let i = 0; i < siblings.length; i++) {
                    const sibling = siblings[i];
                    if (sibling.nodeName.toLowerCase() === name) {
                        if (sibling === node) {
                            siblingIndex = siblingCount;
                        }
                        siblingCount++;
                    }
                }

                if (siblingCount > 1) {
                    name += '[' + (siblingIndex + 1) + ']';
                }

                const parentPath = this.getXPath(parent);
                return parentPath ? parentPath + '/' + name : name;
            },

            isElementVisible(element) {
                if (!element) return false;
                const style = window.getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                return (
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.opacity !== '0' &&
                    rect.width > 0 &&
                    rect.height > 0
                );
            },

            isInteractive(element) {
                const interactiveTags = [
                    'a', 'button', 'input', 'select', 'textarea', 'summary',
                    'details', 'video', 'audio'
                ];
                const interactiveRoles = [
                    'button', 'link', 'checkbox', 'radio', 'tab', 'menuitem',
                    'option', 'searchbox', 'textbox', 'combobox', 'slider',
                    'spinbutton', 'switch'
                ];

                return (
                    interactiveTags.includes(element.tagName.toLowerCase()) ||
                    (element.hasAttribute('role') &&
                        interactiveRoles.includes(element.getAttribute('role').toLowerCase())) ||
                    element.hasAttribute('tabindex') ||
                    element.hasAttribute('contenteditable') ||
                    element.hasAttribute('onclick') ||
                    element.hasAttribute('onkeydown') ||
                    element.hasAttribute('onkeyup') ||
                    (element.tagName.toLowerCase() === 'div' && element.hasAttribute('role')) ||
                    this.isFileInput(element)
                );
            },

            isFileInput(element) {
                return element.tagName.toLowerCase() === 'input' &&
                    element.getAttribute('type') === 'file';
            },

            processShadowRoot(shadowRoot, options) {
                if (!shadowRoot) return [];
                const children = [];
                for (const child of shadowRoot.children) {
                    const childData = this.buildDomTree(child, options);
                    if (childData) children.push(childData);
                }
                return children;
            },

            processIframe(iframe, options) {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (!iframeDoc) return null;

                    const children = [];
                    for (const child of iframeDoc.body.children) {
                        const childData = this.buildDomTree(child, options);
                        if (childData) children.push(childData);
                    }
                    return children;
                } catch (e) {
                    console.warn('Failed to access iframe content:', e);
                    return null;
                }
            },

            buildDomTree(node, {
                highlightElements = true,
                focusHighlightIndex = -1,
                viewportExpansion = 0,
            } = {}) {
                if (!node) return null;

                if (node.nodeName.toLowerCase() === 'script' ||
                    node.nodeName.toLowerCase() === 'style') {
                    return null;
                }

                // Handle text nodes
                if (node.nodeType === 3) {
                    const text = node.textContent.trim();
                    if (!text) return null;
                    return {
                        type: 'TEXT_NODE',
                        text: text,
                        isVisible: this.isElementVisible(node.parentElement),
                    };
                }

                if (node.nodeType !== 1) return null;

                const isVisible = this.isElementVisible(node);
                const rect = node.getBoundingClientRect();
                const viewport = {
                    top: -viewportExpansion,
                    bottom: window.innerHeight + viewportExpansion,
                    left: 0,
                    right: window.innerWidth,
                };

                // Check if this is a shadow host
                const isShadowHost = !!node.shadowRoot;

                // Always include shadow hosts and interactive/visible elements
                if (!isShadowHost && !isVisible && !this.isInteractive(node)) {
                    return null;
                }
                if (!isShadowHost && rect.bottom < viewport.top || rect.top > viewport.bottom) {
                    return null;
                }

                const nodeData = {
                    tagName: node.nodeName.toLowerCase(),
                    xpath: this.getXPath(node),
                    attributes: {},
                    isVisible: isVisible,
                    isInteractive: this.isInteractive(node),
                    children: [],
                    shadowRoot: isShadowHost,
                };

                // Collect attributes
                for (let i = 0; i < node.attributes.length; i++) {
                    const attr = node.attributes[i];
                    nodeData.attributes[attr.name] = attr.value;
                }

                // Handle shadow DOM
                if (node.shadowRoot) {
                    const shadowChildren = this.processShadowRoot(node.shadowRoot, {
                        highlightElements,
                        focusHighlightIndex,
                        viewportExpansion,
                    });
                    nodeData.children.push(...shadowChildren);
                }

                // Handle iframes
                if (node.nodeName.toLowerCase() === 'iframe') {
                    const iframeChildren = this.processIframe(node, {
                        highlightElements,
                        focusHighlightIndex,
                        viewportExpansion,
                    });
                    if (iframeChildren) {
                        nodeData.children.push(...iframeChildren);
                    }
                }

                // Process regular children
                for (const child of node.childNodes) {
                    const childData = this.buildDomTree(child, {
                        highlightElements,
                        focusHighlightIndex,
                        viewportExpansion,
                    });
                    if (childData) nodeData.children.push(childData);
                }

                if (highlightElements && this.isInteractive(node)) {
                    nodeData.highlightIndex = this.highlightIndex++;
                    if (nodeData.highlightIndex === focusHighlightIndex) {
                        nodeData.isTopElement = true;
                    }
                    node.setAttribute(
                        'browser-user-highlight-id',
                        \`playwright-highlight-\${nodeData.highlightIndex}\`
                    );
                }

                return nodeData;
            },

            captureState(options = {}) {
                const existingContainer = document.getElementById('playwright-highlight-container');
                if (existingContainer) {
                    existingContainer.remove();
                }

                this.highlightIndex = 0;

                return this.buildDomTree(document.documentElement, options);
            }
        };

        return window.domCapture.captureState({
            highlightElements: true,
            focusHighlightIndex: -1,
            viewportExpansion: 0,
        });
    } catch (error) {
        console.error('Error in domCapture:', error);
        return null;
    }
})()`;
