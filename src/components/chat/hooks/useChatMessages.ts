import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ChatMessage, MessageCommand, DOMElementInfo, StateCommand, DOMResponse } from "@/types/chat";
import { browserService } from "../services/browserService";
import { commandService } from "../services/commandService";
import { BrowserState } from "@/types/state";

export const useChatMessages = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const addUserMessage = (content: string, command: MessageCommand) => {
        const message: ChatMessage = {
            id: uuidv4(),
            content,
            type: "user",
            timestamp: new Date(),
            command
        };
        setMessages(prev => [...prev, message]);
    };

    const addSystemMessage = (content: string, extras?: {
        state?: Partial<BrowserState>;
        elements?: DOMElementInfo[];
        image?: string;
    }) => {
        const message: ChatMessage = {
            id: uuidv4(),
            content,
            type: "system",
            timestamp: new Date(),
            ...extras
        };
        setMessages(prev => [...prev, message]);
    };

    const handleCommand = async (input: string) => {
        if (!input.trim() || isProcessing) return;

        const command = commandService.parseCommand(input);
        if (!command) return;

        setIsProcessing(true);
        addUserMessage(input, command);

        try
        {
            switch (command.type)
            {
                case "screenshot": {
                    const response = await browserService.takeScreenshot();
                    addSystemMessage("Screenshot captured", { image: response.screenshotUrl });
                    break;
                }

                case "state": {
                    const response = await browserService.executeStateCommand(command.command);
                    const description = browserService.getCommandDescription(command.command);
                    addSystemMessage(description, { state: response.state });
                    break;
                }

                case "find": {
                    const response = await browserService.findElements(
                        command.target || "interactive",
                        command.query,
                        command.detailed
                    );
                    let content = "";
                    if (response.elements)
                    {
                        const count = response.elements.length;
                        content = count === 0
                            ? `No ${command.target || "interactive"} elements found.`
                            : `Found ${count} ${command.target || "interactive"} elements${command.detailed ? " with details" : ""}:\n\n${response.elements}`;
                    } else
                    {
                        content = response.data || "No elements found.";
                    }
                    addSystemMessage(content, { elements: response.elements });
                    break;
                }

                case "help": {
                    addSystemMessage(commandService.getAvailableCommands());
                    break;
                }
            }
        } catch (error)
        {
            addSystemMessage(`Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`);
        } finally
        {
            setIsProcessing(false);
        }
    };

    return {
        messages,
        isProcessing,
        handleCommand
    };
};
