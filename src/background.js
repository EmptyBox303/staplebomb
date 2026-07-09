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
    chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });
    try{
        
        chrome.tabs.query({}, async (tabs) => {
            //console.log(tabs);
            if (chrome.runtime.lastError) {
                console.error("Error querying tabs:", chrome.runtime.lastError);
                return;
            }
            for(let i = 0; i < tabs.length; i++){
                const tab = tabs[i];
                try{
                    chrome.scripting.executeScript({
                    target: { tabId: tab.id }, // Replace with the actual tab ID
                    files: ["src/utils.js","src/content.js"]
                    });
                }
                catch(err) {console.warn(`Injection failed for ${tab.url}:`, err)};
            }
            
        });
        
    }
    catch(err){
        console.error("Unexpected error: ", err);
    }
    
}

const tsName = "timeSegments";
var openDB;
var isDBOpen = false;

function ProcessMessage(message){
    
    if (openDB && isDBOpen){
        let db = openDB.result;
        let tx = db.transaction(tsName,"readwrite");
        let store = tx.objectStore(tsName);
        const putreq = store.put(message);
        putreq.onerror = () => {
            console.log("message not stored: ",message);
        };
        putreq.onsuccess = () =>{
            console.log(`${message.name} at ${message.time/1000} visible? ${message.inView}`);
        }
    }
}


// Open (or create) the database


self.addEventListener('terminate', () => {
    if (openDB){
        openDB.close();
        openDB = undefined;
        isDBOpen = false;
    }
    console.log(`Database pending to close at ${Date.now()}`);
});

async function backgroundStart(){
    InjectScripts();
    if (openDB) return;

    async function OpenDatabase(i){
        if (i > 10){
            console.error("fatal: database cannot connect after maximum attempts; quitting");
            return;
        }
        openDB = indexedDB.open("db", 1);

        openDB.onerror = () => setTimeout(OpenDatabase(i+1),500);

        openDB.onupgradeneeded = () => {
            let db = openDB.result;
            if(!db.objectStoreNames.contains(tsName)){
                let obstore = db.createObjectStore(tsName, {keyPath: "time"});
                obstore.createIndex("domain","domain",{unique:false});
                //obstore.createIndex("isView","isView",{unique:false});
            }
        };  

        openDB.onsuccess = () => {
            isDBOpen = true;
            console.log("DB is open");
        }
    }

    OpenDatabase(0);
    
}

chrome.runtime.onStartup.addListener(backgroundStart);

chrome.runtime.onInstalled.addListener(backgroundStart);


chrome.runtime.onConnect.addListener( (port) => {
    //ProcessMessage(port);
    port.onMessage.addListener((message) => {
        ProcessMessage(message);
    });
});

//each tab switch updates the "session" db
//session db marks current website visited, and all segments of time of which the site was visited in unix
//split into the "inView" and "offView" arrays
//
//at precise minute mark, background should form a "packet" of website use times and send to indexedDB
//at precise hour mark, background should query packets in the last hour and form an hour packet to be consolidated into indexedDB
//at precise day mark(UNIX_TIME % (3600*24*1000) == 0), background should query last 24 hour packets and form a day packet to be consolidated
