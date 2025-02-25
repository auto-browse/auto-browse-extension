import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { ChatInterface } from "@/components/ChatInterface";
import "@/styles/globals.css";

const App: React.FC = () => {
    useEffect(() => {
        // Notify background when sidepanel is mounted
        chrome.runtime.sendMessage({ type: "sidepanel-shown" });

        // Notify background when sidepanel is unmounted
        return () => {
            chrome.runtime.sendMessage({ type: "sidepanel-hidden" });
        };
    }, []);

    return (
        <div className="w-full h-screen bg-background text-foreground">
            <ChatInterface />
        </div>
    );
};

const root = document.getElementById("root");
if (root) {
    ReactDOM.createRoot(root).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
