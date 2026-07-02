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


async function InjectScripts(){
    try{
        chrome.tabs.query({}, async (tabs) => {
            if (chrome.runtime.lastError) {
                console.error("Error querying tabs:", chrome.runtime.lastError);
                return;
            }
            tabs.forEach(async (tab) => {
                const isInjected = await injectionCheck(tab.id);
                if (isInjected){
                    console.log(`tab ${tab.id} is already injected`);
                }
                else{
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id }, // Replace with the actual tab ID
                        files: ["src/utils.js","src/content.js"]
                    }).then(() => console.log("content injected into tab ", tab.id))
                    .catch(err => console.warn(`Injection failed for ${tab.url}:`, err));
                }
            });
        });
    }
    catch(err){
        console.error("Unexpected error: ", err);
    }
    
}

function ProcessMessage(message){
    console.log(`${message.name} at ${message.time/1000} visible? ${message.inView}`);
}

chrome.runtime.onStartup.addListener(
    InjectScripts()
);

chrome.runtime.onInstalled.addListener(
    InjectScripts()
);


chrome.runtime.onConnect.addListener( (port) => {
    //ProcessMessage(port);
    port.onMessage.addListener((message) => {
        ProcessMessage(message);
    });
});
