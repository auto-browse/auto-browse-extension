/**
 * Cache implementation for DOM operations
 */

declare global {
    interface Window {
        debugMode?: boolean;
    }
}

// Performance tracking and caching
export const PERF_METRICS = (typeof window !== 'undefined' && window.debugMode) ? {
    cacheMetrics: {
        boundingRectCacheHits: 0,
        boundingRectCacheMisses: 0,
        computedStyleCacheHits: 0,
        computedStyleCacheMisses: 0,
        cursorStyleCacheHits: 0,
        cursorStyleCacheMisses: 0
    }
} : null;

export const DOM_CACHE = {
    boundingRects: new WeakMap<Element, DOMRect>(),
    computedStyles: new WeakMap<Element, CSSStyleDeclaration>(),
    cursorStyles: new WeakMap<Element, string>(),
    clearCache: () => {
        DOM_CACHE.boundingRects = new WeakMap();
        DOM_CACHE.computedStyles = new WeakMap();
        DOM_CACHE.cursorStyles = new WeakMap();
    }
};

export function getCachedBoundingRect(element: Element): DOMRect | null {
    if (!element) return null;

    if (DOM_CACHE.boundingRects.has(element))
    {
        if (PERF_METRICS)
        {
            PERF_METRICS.cacheMetrics.boundingRectCacheHits++;
        }
        return DOM_CACHE.boundingRects.get(element) || null;
    }

    if (PERF_METRICS)
    {
        PERF_METRICS.cacheMetrics.boundingRectCacheMisses++;
    }

    const rect = element.getBoundingClientRect();
    if (rect)
    {
        DOM_CACHE.boundingRects.set(element, rect);
    }
    return rect;
}

export function getCachedComputedStyle(element: Element): CSSStyleDeclaration | null {
    if (!element) return null;

    if (DOM_CACHE.computedStyles.has(element))
    {
        if (PERF_METRICS)
        {
            PERF_METRICS.cacheMetrics.computedStyleCacheHits++;
        }
        return DOM_CACHE.computedStyles.get(element) || null;
    }

    if (PERF_METRICS)
    {
        PERF_METRICS.cacheMetrics.computedStyleCacheMisses++;
    }

    if (!element.ownerDocument?.defaultView) return null;

    const style = element.ownerDocument.defaultView.getComputedStyle(element);
    if (style)
    {
        DOM_CACHE.computedStyles.set(element, style);
    }
    return style;
}

export function isElementVisible(element: Element): boolean {
    const style = getCachedComputedStyle(element);
    if (!style) return true;

    if (!(element instanceof HTMLElement)) return true;

    return (
        element.offsetWidth > 0 &&
        element.offsetHeight > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        style.opacity !== "0"
    );
}

export function isTopElement(element: Element): boolean {
    const rect = getCachedBoundingRect(element);
    if (!rect) return false;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    try
    {
        if (!element.ownerDocument) return false;
        const topEl = element.ownerDocument.elementFromPoint(centerX, centerY);
        if (!topEl) return false;

        let current: Element | null = topEl instanceof Element ? topEl : null;
        if (!current) return false;
        while (current && current !== element.ownerDocument.documentElement)
        {
            if (current === element) return true;
            current = current.parentElement;
            if (!current) break;
        }
        return false;
    } catch (e)
    {
        return true;
    }
}

export function isInViewport(element: Element): boolean {
    const rect = getCachedBoundingRect(element);
    if (!rect) return false;

    if (!element.ownerDocument?.defaultView) return false;

    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (element.ownerDocument.defaultView.innerHeight || element.ownerDocument.documentElement.clientHeight) &&
        rect.right <= (element.ownerDocument.defaultView.innerWidth || element.ownerDocument.documentElement.clientWidth)
    );
}

export function getXPathTree(element: Element): string {
    if (!element) return '';

    if (element.id)
    {
        return '//*[@id="' + element.id + '"]';
    }

    const paths = [];
    let currentElement: Element | null = element;

    while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE)
    {
        let index = 0;
        let sibling: Node | null = currentElement;

        while (sibling)
        {
            if (sibling.nodeType === Node.ELEMENT_NODE &&
                sibling instanceof Element &&
                sibling.tagName === currentElement.tagName)
            {
                index++;
            }
            sibling = sibling.previousSibling;
        }

        const tagName = currentElement.tagName.toLowerCase();
        const pathIndex = (index > 1) ? '[' + index + ']' : '';
        paths.unshift(tagName + pathIndex);
        currentElement = currentElement.parentElement;
    }

    return '/' + paths.join('/');
}
