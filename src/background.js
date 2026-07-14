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
const newTsName = "timeSegs";

var openDB;
var isDBOpen = false;
var isLoopActive = false;

function ProcessMessage(message){
    
    if (openDB && isDBOpen){
        const db = openDB.result;
        const tx = db.transaction(newTsName,"readwrite");
        const store = tx.objectStore(newTsName);
        const putreq = store.put(message);
        putreq.onerror = () => {
            console.log("message not stored: ",message);
        };
        putreq.onsuccess = () =>{
            console.log(`${message.name} at ${message.time/1000} visible? ${message.inView}`);
        }
        return;
    }
}

async function PostInfo(message,port){
    const choice = message.choice;
    const dom = message.domain;

    const polname = choice.policy.name;
    if (polname === undefined){
        console.error("invalid message: ", message);
        return;
    }

    //port.postMessage({reply: "just making sure things are received"});

    if (polname !== "float"){
        console.log("not implemented yet, nothing to be done");
        return;
    }

    const minToUnix = choice.time * 60000;
    const upper = Date.now();
    const lower = upper - minToUnix;
    console.log(minToUnix);

    const db = openDB.result;
    const tx = db.transaction(newTsName,"readonly");
    const store = tx.objectStore(newTsName);
    console.log(store.indexNames);
    const ind = store.index("website");
    const keyRangeVal = IDBKeyRange.bound([dom,lower],[dom,upper]);

    ind.getAll(keyRangeVal).onsuccess = (event) => {
        const arr = event.target.result;
        console.log(arr);
        let totalTime = 0;

        if (arr.length === 0){
            const newRangeVal = IDBKeyRange.only([dom,true]);
            const tryToFindRecord = ind.get(newRangeVal,"prev");
            tryToFindRecord.onsuccess = (event) => {

                let truetime = (event.target.result.policy === undefined) ? 0 : message.time*60000;
                port.postMessage({total: totalTime, choice: choice});
                
            }
            //query latest msg that is of domain and visible
            //if no such msg, return 0 time

            return;
        }

        let view = true;
        let startTime = lower;
        arr.forEach((msg) => {
            console.log(totalTime);
            if (msg.inView){
                view = true;
                startTime = msg.time;
            }
            else if (view){
                view = false;
                totalTime += msg.time - startTime;
            }
        });

        if (view){
            view = false;
            totalTime += upper - startTime;
        }
        console.log(totalTime);

        port.postMessage({total: totalTime, choice: choice});
        
    }

    //this point forward, message valid, polname float
    //we need to query
    //query: get
}

async function convertToPackets(){
    //conceptually what to happen:
    // take current time
    //cutoff by the most recently completed minute
    //get ALL timeSegment entries before this time
    const nowtime = Date.now();
    const minute_upperbound = nowtime - (nowtime % 60000);
    //convert into minute packets
    //but how?
    //Find most recently converted minute packet
    //if no such packet exist, then we convert all ts entries from beginning of time to most recently past minute
    //if the packet exists, suppose its time is T
    //it indicates that (supposedly) all msgs from < T + 60000 have been converted to minute packets
    const ts_destroy_upper = minute_upperbound - 2 * 3600 * 1000;
    //(effectively) DESTROY all timeSegment entries 2 hours before minute_upperbound;

    //next, cutoff by the most recently completed hour;
    //get ALL minute packets before this time
    const hour_upperbound = nowtime - (nowtime % 3600000);
    //convert into hour packets

    
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
        openDB = indexedDB.open("db", 11);

        openDB.onerror = () => setTimeout(OpenDatabase(i+1),500);

        openDB.onupgradeneeded = (event) => {
            let db = openDB.result;

            if(db.objectStoreNames.contains(tsName)){
                db.deleteObjectStore(tsName);
                console.log(db.objectStoreNames);
                //obstore.createIndex("isView","isView",{unique:false});
            }
            
            if (!db.objectStoreNames.contains("minute")){
                let obstore = db.createObjectStore("minute", {keyPath: "time"});
            }
            if (!db.objectStoreNames.contains("hour")){
                let obstore = db.createObjectStore("hour", {keyPath: "time"});
            }
            if (!db.objectStoreNames.contains("day")){
                let obstore = db.createObjectStore("day", {keyPath: "time"});
            }
        };  

        openDB.onsuccess = () => {
            let db = openDB.result;
            console.log(db.objectStoreNames);
            
            isDBOpen = true;
            console.log("DB is open");
        }
    }

    OpenDatabase(0);

    if (!isLoopActive){
        isLoopActive = true;
        
    }
    
}

chrome.runtime.onStartup.addListener(backgroundStart);

chrome.runtime.onInstalled.addListener(backgroundStart);


chrome.runtime.onConnect.addListener( (port) => {
    //ProcessMessage(port);
    port.onMessage.addListener(async (message) => {
        if (message.choice === undefined){
            ProcessMessage(message);
        }
        else{
            PostInfo(message,port);
        }
    });
});

//each tab switch updates the "session" db
//session db marks current website visited, and all segments of time of which the site was visited in unix
//split into the "inView" and "offView" arrays
//
//at precise minute mark, background should form a "packet" of website use times and send to indexedDB
//at precise hour mark, background should query packets in the last hour and form an hour packet to be consolidated into indexedDB
//at precise day mark(UNIX_TIME % (3600*24*1000) == 0), background should query last 24 hour packets and form a day packet to be consolidated
