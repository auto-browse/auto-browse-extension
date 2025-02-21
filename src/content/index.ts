// Listen for messages from the side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "contentScript")
    {
        // Handle any content script specific actions here
        sendResponse({ success: true });
    }
    else if (message.type === "traverseDOM")
    {
        // Forward the message to background script
        chrome.runtime.sendMessage({ type: "traverseDOM" }, (response) => {
            if (response.error)
            {
                sendResponse({ error: response.error });
            }
            else
            {
                // Format the DOM tree data for chat response
                const formattedResponse = formatDOMTreeForChat(response.domTree);
                sendResponse({ success: true, data: formattedResponse });
            }
        });
        return true; // Will respond asynchronously
    }
    return true;
});

function formatDOMTreeForChat(domTree: any): string {
    // Count interactive elements
    let interactiveCount = 0;
    function countInteractive(node: any) {
        if (node.isInteractive) interactiveCount++;
        if (node.children)
        {
            node.children.forEach(countInteractive);
        }
    }
    countInteractive(domTree);

    // Get a summary of interactive elements
    const interactiveElements: { xpath: string; type: string; attributes: any; }[] = [];
    function collectInteractive(node: any) {
        if (node.isInteractive)
        {
            interactiveElements.push({
                xpath: node.xpath,
                type: node.tagName,
                attributes: node.attributes
            });
        }
        if (node.children)
        {
            node.children.forEach(collectInteractive);
        }
    }
    collectInteractive(domTree);

    // Create a readable summary
    let summary = `Found ${interactiveCount} interactive elements on the page:\n\n`;
    interactiveElements.forEach((el, index) => {
        summary += `${index + 1}. ${el.type.toUpperCase()} element\n`;
        summary += `   XPath: ${el.xpath}\n`;
        if (el.attributes.id) summary += `   ID: ${el.attributes.id}\n`;
        if (el.attributes.class) summary += `   Class: ${el.attributes.class}\n`;
        if (el.attributes.role) summary += `   Role: ${el.attributes.role}\n`;
        summary += '\n';
    });

    return summary;
}

// Inject any necessary content script functionality
console.log("Auto Browser Extension Content Script Loaded");
