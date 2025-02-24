import React from "react";
import { createRoot } from "react-dom/client";
import { DebugToggle } from "./components/DebugToggle";
import "@/styles/globals.css";

const Options: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="container mx-auto max-w-2xl py-8">
                <h1 className="text-2xl font-bold mb-8">Auto Browser Extension Options</h1>

                <div className="space-y-8">
                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold">Debug Settings</h2>
                        <div className="rounded-lg border bg-card p-6">
                            <DebugToggle />
                            <p className="mt-4 text-sm text-muted-foreground">
                                When debug mode is disabled, chat commands will not be processed.
                                Enable debug mode to use all chat functionality.
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

// Initialize React
const container = document.getElementById("root");
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <Options />
        </React.StrictMode>
    );
}
