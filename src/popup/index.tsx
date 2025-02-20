import React from "react";
import ReactDOM from "react-dom/client";
import { Button } from "@/components/ui/button";
import "@/styles/globals.css";

const Popup: React.FC = () => {
    const openSidePanel = async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                await chrome.sidePanel.open({ tabId: tab.id });
                window.close(); // Close popup after opening side panel
            }
        } catch (error) {
            console.error('Failed to open side panel:', error);
        }
    };

    return (
        <div className="w-64 p-4 bg-background text-foreground">
            <h1 className="text-lg font-semibold mb-4">Auto Browser Extension</h1>
            <Button onClick={openSidePanel} className="w-full">
                Open Side Panel
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
                Click to open the side panel interface
            </p>
        </div>
    );
};

const root = document.getElementById("root");
if (root) {
    ReactDOM.createRoot(root).render(
        <React.StrictMode>
            <Popup />
        </React.StrictMode>
    );
}
