import React from "react";
import ReactDOM from "react-dom/client";
import { ChatInterface } from "@/components/ChatInterface";
import "@/styles/globals.css";

const App: React.FC = () => {
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
