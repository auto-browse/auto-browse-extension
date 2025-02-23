import { DOMElementInfo } from "@/types/chat";

const CLICKABLE_ELEMENT_ATTRIBUTES = [
    'title',
    'type',
    'name',
    'role',
    'tabindex',
    'aria-label',
    'placeholder',
    'value',
    'alt',
    'aria-expanded',
    'aria_name'
];

export const elementService = {
    getClickableElementAttributes(): string[] {
        return CLICKABLE_ELEMENT_ATTRIBUTES;
    },

    formatElementInfo(element: DOMElementInfo): string {
        let result = "";

        switch (element.type)
        {
            case "interactive":
            case "file":
                result += this.formatInteractiveElement(element);
                break;
            case "shadow":
                result += this.formatShadowElement(element);
                break;
            case "iframe":
                result += this.formatIframeElement(element);
                break;
            case "text":
                result += this.formatTextElement(element);
                break;
        }

        return result;
    },

    formatInteractiveElement(element: DOMElementInfo): string {
        const attrs = element.attributes || {};
        const xpath = element.xpath || "unknown";
        let result = "";

        if (element.highlightIndex !== undefined)
        {
            result += `${element.highlightIndex}[:]\n`;
        }

        result += `<${attrs["tagName"] || "element"}`;

        CLICKABLE_ELEMENT_ATTRIBUTES.concat(["id", "class"]).forEach(attr => {
            if (attrs[attr])
            {
                result += ` ${attr}="${attrs[attr]}"`;
            }
        });

        result += ">";
        if (element.text)
        {
            result += ` ${element.text}`;
        }
        result += `\n   XPath: ${xpath}\n`;

        return result;
    },

    formatShadowElement(element: DOMElementInfo): string {
        let result = `Shadow DOM Host: ${element.xpath || "unknown"}\n`;
        if (element.attributes?.["tagName"])
        {
            result += `   Type: ${element.attributes["tagName"]}\n`;
        }
        return result;
    },

    formatIframeElement(element: DOMElementInfo): string {
        let result = `IFrame: ${element.xpath || "unknown"}\n`;
        if (element.attributes?.["src"])
        {
            result += `   Source: ${element.attributes["src"]}\n`;
        }
        return result;
    },

    formatTextElement(element: DOMElementInfo): string {
        return element.text ? `Text: ${element.text}\n` : "";
    },

    getElementClasses(element: DOMElementInfo): string {
        if (element.isShadowHost)
        {
            return "bg-purple-100 dark:bg-purple-900";
        }
        switch (element.type)
        {
            case "file":
                return "bg-green-100 dark:bg-green-900";
            case "iframe":
                return "bg-blue-100 dark:bg-blue-900";
            default:
                return "bg-gray-100 dark:bg-gray-800";
        }
    }
};
