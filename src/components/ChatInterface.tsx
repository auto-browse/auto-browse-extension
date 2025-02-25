import React, { useEffect } from "react";
import { ChatInput } from "./chat/ChatInput";
import { ChatMessages } from "./chat/ChatMessages";
import { useChatMessages } from "./chat/hooks/useChatMessages";
import { useScrollToBottom } from "./chat/hooks/useScrollToBottom";
import { browserService } from "./chat/services/browserService";

interface DebuggerError {
    type: "debugger-error";
    tabId: number;
    error: string;
}

export const ChatInterface: React.FC = () => {
    const { messages, isProcessing, handleCommand } = useChatMessages();
    const { messagesEndRef } = useScrollToBottom([messages]);

    useEffect(() => {
        const handleDebuggerError = (message: any) => {
            if (message.type === "debugger-error") {
                const error = message as DebuggerError;
                // Show error message directly
                handleCommand(`Debugger Error: ${error.error}`);
            }
        };

        chrome.runtime.onMessage.addListener(handleDebuggerError);
        return () => chrome.runtime.onMessage.removeListener(handleDebuggerError);
    }, [handleCommand]);

    const handleSwitchTab = async (tabId: number) => {
        try {
            await browserService.switchTab(tabId);
        } catch (error) {
            console.error("Failed to switch tab:", error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background">
            <ChatMessages
                messages={messages}
                messagesEndRef={messagesEndRef}
                onSwitchTab={handleSwitchTab}
            />
            <ChatInput onSubmit={handleCommand} isProcessing={isProcessing} />
        </div>
    );
};
