import React, { useState, useRef, useEffect } from "react";
import { FiSend } from "react-icons/fi";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ChatMessage } from "@/types/chat";
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isProcessing) return;

        const userMessage: ChatMessage = {
            id: uuidv4(),
            content: input,
            type: "user",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsProcessing(true);

        try {
            if (input.toLowerCase().includes("screenshot")) {
                // Message background script to take screenshot
                const response = await chrome.runtime.sendMessage({ type: "takeScreenshot" });

                const systemMessage: ChatMessage = {
                    id: uuidv4(),
                    content: "Screenshot taken successfully",
                    type: "system",
                    timestamp: new Date(),
                    image: response.screenshotUrl
                };
                setMessages((prev) => [...prev, systemMessage]);
            } else {
                const systemMessage: ChatMessage = {
                    id: uuidv4(),
                    content: "Command received, but not a screenshot request",
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
                            <p>{message.content}</p>
                            {message.image && (
                                <img
                                    src={message.image}
                                    alt="Screenshot"
                                    className="mt-2 rounded-md max-w-full"
                                />
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
