//monitor tabs open, close, or focus, unfocus
//whenever a tab gets focused on, get Date.now()
//

async function injectionCheck(tabId){
    try{
        const reply = await chrome.tabs.sendMessage(tabId, "injectionCheck");
        
        return reply && reply.isInjected;
    }catch(err){
        return false;
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Background received:", message);
    sendResponse({ status: "ok" });
    return true;
});

chrome.runtime.onStartup.addListener(
    async () => {
        const tabs = chrome.tabs.query({});
        for(const tab of tabs){
            const isInjected = await injectionCheck(tab.id);
            if (isInjected){
                console.log("tab ${tab.id} is already injected");
            }
            else{
                chrome.scripting.executeScript({
                    target: { tabId: tab.id }, // Replace with the actual tab ID
                    files: ["content.js"]
                }).then(() => console.log("content injected into tab ", tab.id))
                .catch(err => console.warn(`Injection failed for ${tab.url}:`, err));
            }
            
            
        }
    }
);
