import React from "react";
import { ChatMessage, DOMElementInfo, TabInfo } from "@/types/chat";
import { browserService } from "./services/browserService";
import { elementService } from "./services/elementService";

interface ChatMessagesProps {
    messages: ChatMessage[];
    messagesEndRef: React.RefObject<HTMLDivElement>;
    onSwitchTab: (tabId: number) => void;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
    messages,
    messagesEndRef,
    onSwitchTab
}) => {
    const renderViewportInfo = (viewport: any) => (
        <div className="mt-2 p-2 bg-muted rounded">
            <h4 className="font-semibold">Viewport Info</h4>
            <div className="text-sm">
                <p>Height: {viewport.height}px</p>
                <p>Width: {viewport.width}px</p>
                <p>Scroll: {viewport.pixelsAbove}px from top</p>
                <p>{viewport.pixelsBelow}px remaining</p>
            </div>
        </div>
    );

    const renderTabs = (tabs: TabInfo[]) => (
        <div className="mt-2 space-y-2">
            <h4 className="font-semibold">Open Tabs</h4>
            {tabs.map((tab) => (
                <div
                    key={tab.pageId}
                    className="text-sm p-2 bg-muted rounded flex justify-between items-center"
                >
                    <span className="truncate flex-1">{tab.title}</span>
                    <button
                        onClick={() => onSwitchTab(tab.pageId)}
                        className="ml-2 px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                        Switch
                    </button>
                </div>
            ))}
        </div>
    );

    const renderElements = (elements: DOMElementInfo[]) => (
        <div className="mt-2 space-y-2">
            {elements.map((element, idx) => (
                <div
                    key={idx}
                    className={`p-2 rounded ${elementService.getElementClasses(element)}`}
                >
                    <div className="text-sm font-mono">
                        {element.xpath && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                XPath: {element.xpath}
                            </div>
                        )}
                        {element.text && <div className="mt-1">{element.text}</div>}
                        {element.attributes && (
                            <div className="mt-1 text-xs">
                                {Object.entries(element.attributes)
                                    .filter(([key]) =>
                                        ["id", "class", "role", "type", "src"].includes(key)
                                    )
                                    .map(([key, value]) => (
                                        <span key={key} className="inline-block mr-2">
                                            {key}="{value}"
                                        </span>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
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
                                : message.state
                                ? "bg-muted text-muted-foreground"
                                : "bg-secondary text-secondary-foreground"
                        }`}
                    >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        {message.state?.viewport && renderViewportInfo(message.state.viewport)}
                        {message.state?.tabs && renderTabs(message.state.tabs)}
                        {message.image && (
                            <img
                                src={message.image}
                                alt="Screenshot"
                                className="mt-2 rounded-md max-w-full"
                            />
                        )}
                        {message.elements && message.elements.length > 0 && renderElements(message.elements)}
                        <span className="text-xs opacity-70 mt-1 block">
                            {message.timestamp.toLocaleTimeString()}
                        </span>
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
};
