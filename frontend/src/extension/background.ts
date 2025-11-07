chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
    if (request.action === "fillCredentials") {
        if (sender.tab?.id) {
            chrome.tabs.sendMessage(sender.tab.id, {
                action: "fillCredentials",
                email: request.email,
                password: request.password,
                website: request.website
            }).catch((err) => {
                console.error("Failed to send message to tab:", err);
            });
        }
    }
});