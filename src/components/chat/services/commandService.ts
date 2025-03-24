import { MessageCommand, ElementType } from "@/types/chat";

export const commandService = {
    parseCommand(input: string): MessageCommand {
        const text = input.toLowerCase();

        if (text.includes("screenshot"))
        {
            return { type: "screenshot" };
        }

        if (text.includes("aria") && text.includes("snapshot"))
        {
            return { type: "aria-snapshot" };
        }

        if (text.includes("state") || text.includes("viewport") || text.includes("tabs"))
        {
            if (text.includes("viewport"))
            {
                return { type: "state", command: { type: "showViewport" } };
            }
            if (text.includes("tabs"))
            {
                return { type: "state", command: { type: "showTabs" } };
            }
            return { type: "state", command: { type: "showState" } };
        }

        if (text.includes("switch") && text.includes("tab"))
        {
            const target = input.replace(/switch\s+tab\s+/i, "").trim();
            const targetId = parseInt(target);
            return {
                type: "state",
                command: {
                    type: "switchTab",
                    target: isNaN(targetId) ? target : targetId
                }
            };
        }

        if (text.includes("scroll"))
        {
            const target = text.match(/scroll\s+to\s+(.+)/i)?.[1];
            if (target)
            {
                return {
                    type: "state",
                    command: { type: "scrollTo", target }
                };
            }
        }

        if (text.includes("find") || text.includes("show") || text.includes("get"))
        {
            if (text.includes("clickable") || text.includes("interactive"))
            {
                return {
                    type: "find",
                    target: "interactive" as ElementType,
                    detailed: text.includes("detail") || text.includes("attributes")
                };
            }
            if (text.includes("shadow"))
            {
                return {
                    type: "find",
                    target: "shadow" as ElementType,
                    detailed: text.includes("detail") || text.includes("attributes")
                };
            }
            if (text.includes("frame") || text.includes("iframe"))
            {
                return { type: "find", target: "iframe" as ElementType };
            }
            if (text.includes("file") || text.includes("upload"))
            {
                return { type: "find", target: "file" as ElementType };
            }
            if (text.includes("text near"))
            {
                const match = input.match(/text near\s+(.+)/i);
                return {
                    type: "find",
                    target: "text" as ElementType,
                    query: match?.[1] || ""
                };
            }
            return { type: "find", target: "interactive" as ElementType }; // Default to interactive elements
        }

        if (text.includes("extract"))
        {
            if (text.includes("tree"))
            {
                return { type: "extract", command: "tree" };
            }
            if (text.includes("elements") || text.includes("position"))
            {
                return { type: "extract", command: "elements" };
            }
            if (text.includes("text"))
            {
                return { type: "extract", command: "text" };
            }
        }

        return {
            type: "help",
            command: { type: "showState" }
        };
    },

    getAvailableCommands(): string {
        return `Available commands:
- Find clickable elements
- Find clickable elements with details
- Find shadow DOM elements
- Find shadow DOM elements with details
- Find iframe contents
- Find file inputs
- Find text near [element]
- Take a screenshot
- Show browser state
- Show viewport info
- Show open tabs
- Switch tab [number/title]
- Scroll to [element]
- Get aria snapshot
- Extract tree (get DOM tree structure)
- Extract elements (get elements with position)
- Extract text (get text representation)`;
    }
};
