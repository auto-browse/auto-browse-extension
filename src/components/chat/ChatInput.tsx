import React, { useState } from "react";
import { FiSend } from "react-icons/fi";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface ChatInputProps {
    onSubmit: (input: string) => void;
    isProcessing: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSubmit, isProcessing }) => {
    const [input, setInput] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isProcessing) return;
        onSubmit(input);
        setInput("");
    };

    return (
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
    );
};
