import { useEffect, useRef } from "react";

export const useScrollToBottom = <T extends any[]>(deps: T) => {
    const messagesEndRef = useRef<HTMLDivElement>(document.createElement('div'));

    const scrollToBottom = () => {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, deps);

    return {
        messagesEndRef,
        scrollToBottom
    };
};
