export const domTraversalScript = `(() => {
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
})();
`;
