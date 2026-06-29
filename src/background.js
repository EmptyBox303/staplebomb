//monitor tabs open, close, or focus, unfocus
//whenever a tab gets focused on, get Date.now()
//
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Background received:", message);
    sendResponse({ status: "ok" });
    return true;
});

chrome.runtime.onStartup.addListener(
    () => {
        const tabs = chrome.tabs.query({});
        for(const tab of tabs){
            chrome.scripting.executeScript({
                target: { tabId: tab.id }, // Replace with the actual tab ID
                function: () => {
                    console.log("hi");
                }
            }).then(() => console.log("content injected into tab ", tab.id))
            .catch(err => console.warn(`Injection failed for ${tab.url}:`, err));
            
        }
    }
);
