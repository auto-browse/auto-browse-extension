import React, { useState, useRef, useEffect } from "react";
import { FiSend } from "react-icons/fi";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ChatMessage, ElementType, DOMElementInfo } from "@/types/chat";
import { v4 as uuidv4 } from "uuid";

export const ChatInterface: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const parseCommand = (input: string): ChatMessage['command'] => {
        const text = input.toLowerCase();
        if (text.includes("screenshot")) {
            return { type: "screenshot" };
        }

        if (text.includes("find") || text.includes("show") || text.includes("get")) {
            if (text.includes("clickable") || text.includes("interactive")) {
                return { type: "find", target: "interactive" };
            }
            if (text.includes("shadow")) {
                return { type: "find", target: "shadow" };
            }
            if (text.includes("frame") || text.includes("iframe")) {
                return { type: "find", target: "iframe" };
            }
            if (text.includes("file") || text.includes("upload")) {
                return { type: "find", target: "file" };
            }
            if (text.includes("text near")) {
                const match = input.match(/text near\s+(.+)/i);
                return {
                    type: "find",
                    target: "text",
                    query: match?.[1] || ""
                };
            }
            return { type: "find", target: "interactive" }; // Default to interactive elements
        }

        return { type: "help" };
    };

    const formatElementInfo = (element: DOMElementInfo): string => {
        let result = "";

        // Format based on element type
        if (element.type === "interactive" || element.type === "file") {
            const attrs = element.attributes || {};
            const xpath = element.xpath || "unknown";
            result += `${element.highlightIndex !== undefined ? element.highlightIndex + '[:] ' : ''}`;
            result += `<${attrs['tagName'] || 'element'}`;

            ['id', 'class', 'role', 'aria-label', 'type'].forEach(attr => {
                if (attrs[attr]) {
                    result += ` ${attr}="${attrs[attr]}"`;
                }
            });

            result += ">";
            if (element.text) {
                result += ` ${element.text}`;
            }
            result += `\n   XPath: ${xpath}\n`;
        } else if (element.type === "shadow") {
            result += `Shadow DOM Host: ${element.xpath || "unknown"}\n`;
            if (element.attributes?.['tagName']) {
                result += `   Type: ${element.attributes['tagName']}\n`;
            }
        } else if (element.type === "iframe") {
            result += `IFrame: ${element.xpath || "unknown"}\n`;
            if (element.attributes?.['src']) {
                result += `   Source: ${element.attributes['src']}\n`;
            }
        }

        return result;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isProcessing) return;

        const parsedCommand = parseCommand(input);
        if (!parsedCommand) return;

        const userMessage: ChatMessage = {
            id: uuidv4(),
            content: input,
            type: "user",
            timestamp: new Date(),
            command: parsedCommand
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsProcessing(true);

        try {
            if (parsedCommand.type === "screenshot") {
                const response = await chrome.runtime.sendMessage({ type: "takeScreenshot" });
                const systemMessage: ChatMessage = {
                    id: uuidv4(),
                    content: "Screenshot taken successfully",
                    type: "system",
                    timestamp: new Date(),
                    image: response.screenshotUrl
                };
                setMessages((prev) => [...prev, systemMessage]);
            }
            else if (parsedCommand.type === "find") {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                const response = await chrome.tabs.sendMessage(tab.id!, {
                    type: "traverseDOM",
                    target: parsedCommand.target || "interactive",
                    query: parsedCommand.query
                });

                if (response.error) {
                    throw new Error(response.error);
                }

                let content = "";
                if (response.elements) {
                    content = response.elements
                        .map((el: DOMElementInfo) => formatElementInfo(el))
                        .join("\n");
                    if (!content) {
                        content = `No ${parsedCommand.target || "interactive"} elements found.`;
                    } else {
                        content = `Found ${response.elements.length} ${parsedCommand.target || "interactive"} elements:\n\n${content}`;
                    }
                } else {
                    content = response.data || "No elements found.";
                }

                const systemMessage: ChatMessage = {
                    id: uuidv4(),
                    content,
                    type: "system",
                    timestamp: new Date(),
                    elements: response.elements
                };
                setMessages((prev) => [...prev, systemMessage]);
            }
            else {
                const systemMessage: ChatMessage = {
                    id: uuidv4(),
                    content: `Available commands:
- Find clickable elements
- Find shadow DOM elements
- Find iframe contents
- Find file inputs
- Find text near [element]
- Take a screenshot`,
                    type: "system",
                    timestamp: new Date()
                };
                setMessages((prev) => [...prev, systemMessage]);
            }
        } catch (error) {
            const errorMessage: ChatMessage = {
                id: uuidv4(),
                content: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
                type: "system",
                timestamp: new Date()
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${
                            message.type === "user" ? "justify-end" : "justify-start"
                        }`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                                message.type === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-secondary-foreground"
                            }`}
                        >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            {message.image && (
                                <img
                                    src={message.image}
                                    alt="Screenshot"
                                    className="mt-2 rounded-md max-w-full"
                                />
                            )}
                            {message.elements && message.elements.length > 0 && (
                                <div className="mt-2 space-y-2">
                                    {message.elements.map((element, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-2 rounded ${
                                                element.isShadowHost
                                                    ? "bg-purple-100 dark:bg-purple-900"
                                                    : element.type === "file"
                                                    ? "bg-green-100 dark:bg-green-900"
                                                    : element.type === "iframe"
                                                    ? "bg-blue-100 dark:bg-blue-900"
                                                    : "bg-gray-100 dark:bg-gray-800"
                                            }`}
                                        >
                                            <div className="text-sm font-mono">
                                                {element.xpath && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        XPath: {element.xpath}
                                                    </div>
                                                )}
                                                {element.text && (
                                                    <div className="mt-1">{element.text}</div>
                                                )}
                                                {element.attributes && (
                                                    <div className="mt-1 text-xs">
                                                        {Object.entries(element.attributes)
                                                            .filter(([key]) =>
                                                                [
                                                                    "id",
                                                                    "class",
                                                                    "role",
                                                                    "type",
                                                                    "src",
                                                                ].includes(key)
                                                            )
                                                            .map(([key, value]) => (
                                                                <span
                                                                    key={key}
                                                                    className="inline-block mr-2"
                                                                >
                                                                    {key}="{value}"
                                                                </span>
                                                            ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <span className="text-xs opacity-70 mt-1 block">
                                {message.timestamp.toLocaleTimeString()}
                            </span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="p-4 border-t">
                <div className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your instruction..."
                        disabled={isProcessing}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={isProcessing}>
                        <FiSend className="h-5 w-5" />
                    </Button>
                </div>
            </form>
        </div>
    );
};
