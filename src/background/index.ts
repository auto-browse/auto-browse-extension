import Protocol from "devtools-protocol";
import { v4 as uuidv4 } from "uuid";

let connections = new Map<number, chrome.debugger.Debuggee>();

const domTraversalScript = `(() => {
  let highlightIndex = 0;

  function getXPath(node) {
    if (!node || !node.nodeName) return '';

    let name = node.nodeName.toLowerCase();
    const parent = node.parentNode;

    if (!parent) {
      return name;
    }

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

    const parentPath = getXPath(parent);
    return parentPath ? parentPath + '/' + name : name;
  }

  function isElementVisible(element) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function isInteractive(element) {
    const interactiveTags = [
      'a',
      'button',
      'input',
      'select',
      'textarea',
      'summary',
    ];
    const interactiveRoles = [
      'button',
      'link',
      'checkbox',
      'radio',
      'tab',
      'menuitem',
      'option',
    ];

    if (interactiveTags.includes(element.tagName.toLowerCase())) return true;
    if (
      element.hasAttribute('role') &&
      interactiveRoles.includes(element.getAttribute('role').toLowerCase())
    )
      return true;
    if (element.hasAttribute('tabindex')) return true;
    if (element.hasAttribute('contenteditable')) return true;
    if (element.hasAttribute('onclick')) return true;
    if (element.tagName.toLowerCase() === 'div' && element.hasAttribute('role'))
      return true;

    return false;
  }

  function buildTree(
    node,
    highlightElements = true,
    focusHighlightIndex = -1,
    viewportExpansion = 0
  ) {
    if (!node) return null;

    if (
      node.nodeName.toLowerCase() === 'script' ||
      node.nodeName.toLowerCase() === 'style'
    ) {
      return null;
    }

    if (node.nodeType === 3) {
      const text = node.textContent.trim();
      if (!text) return null;
      return {
        type: 'TEXT_NODE',
        text: text,
        isVisible: isElementVisible(node.parentElement),
      };
    }

    if (node.nodeType !== 1) return null;

    const isVisible = isElementVisible(node);
    const rect = node.getBoundingClientRect();
    const viewport = {
      top: -viewportExpansion,
      bottom: window.innerHeight + viewportExpansion,
      left: 0,
      right: window.innerWidth,
    };

    if (!isVisible && !isInteractive(node)) return null;
    if (rect.bottom < viewport.top || rect.top > viewport.bottom) return null;

    const nodeData = {
      tagName: node.nodeName.toLowerCase(),
      xpath: getXPath(node),
      attributes: {},
      isVisible: isVisible,
      isInteractive: isInteractive(node),
      children: [],
    };

    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i];
      nodeData.attributes[attr.name] = attr.value;
    }

    if (node.shadowRoot) {
      nodeData.shadowRoot = true;
    }

    for (const child of node.childNodes) {
      const childData = buildTree(
        child,
        highlightElements,
        focusHighlightIndex,
        viewportExpansion
      );
      if (childData) nodeData.children.push(childData);
    }

    if (highlightElements && isInteractive(node)) {
      nodeData.highlightIndex = highlightIndex++;
      if (nodeData.highlightIndex === focusHighlightIndex) {
        nodeData.isTopElement = true;
      }

      if (highlightElements) {
        node.setAttribute(
          'browser-user-highlight-id',
          \`playwright-highlight-\${nodeData.highlightIndex}\`
        );
      }
    }

    return nodeData;
  }

  const existingContainer = document.getElementById(
    'playwright-highlight-container'
  );
  if (existingContainer) {
    existingContainer.remove();
  }

  const args = { doHighlightElements: true, focusHighlightIndex: -1, viewportExpansion: 0 };
  highlightIndex = 0;

  return buildTree(
    document.documentElement,
    args.doHighlightElements,
    args.focusHighlightIndex,
    args.viewportExpansion
  );
})()`;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "takeScreenshot")
    {
        handleScreenshot(sender.tab?.id as number)
            .then(sendResponse)
            .catch((error) => sendResponse({ error: error.message }));
        return true; // Will respond asynchronously
    } else if (message.type === "traverseDOM")
    {
        handleDOMTraversal(sender.tab?.id as number)
            .then(sendResponse)
            .catch((error) => sendResponse({ error: error.message }));
        return true; // Will respond asynchronously
    }
});

// Add helper to get active tab ID
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

async function handleScreenshot(tabId?: number): Promise<{ screenshotUrl: string; }> {
    if (!tabId)
    {
        tabId = await getActiveTabId();
    }

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

async function handleDOMTraversal(tabId: number): Promise<{ domTree: any; }> {
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
        });

        return { domTree: result.result.value };
    } catch (error: any)
    {
        console.error("DOM traversal error:", error);
        throw error;
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
