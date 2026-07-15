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

function TrueSegment(start,end,domain){
    this.start = start;
    this.end = end;
    this.domain = domain;
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
    const nowtime = Date.now();
    const minute_upperbound = nowtime - (nowtime % 60000);
    //goal rn: simply convert existing time entries up to most recently completed minute;
    //try to find most recent  minute packet
    const db = openDB.result;
    const tx = db.transaction([newTsName,"minute"],"readwrite");
    const minuteStore = tx.objectStore("minute");
    const minuteIndex = minuteStore.index("time");
    minuteIndex.openCursor(null,"prev").onsuccess = (event) => {
        const cursor = event.target.result;
        
        let lowerbound = (cursor === null) ? 0 : (cursor.value.time + 60000);
        console.log(lowerbound);
        let upperbound = minute_upperbound;
        const tsQueryRange = IDBKeyRange.bound(lowerbound,upperbound);
        
        const tsStore = tx.objectStore(newTsName);
        const tsIndex = tsStore.index("time");

        tsIndex.getAll(tsQueryRange).onsuccess = (event) => {
            const arr = event.target.result;
            console.log(arr);
            //this gives us the range of messages
            if (event.target.result === null){
                return;
            }

            
            const firstTime = arr[0].time;
            const startTime = (lowerbound === 0) ? (firstTime - firstTime % 60000) : lowerbound;

           
            if (arr.length === 0) return;
            let trueTimeSegments = [];
            let lastEntry = arr[0];
            if(!lastEntry.inView){
                trueTimeSegments.push(new TrueSegment(startTime,lastEntry.time,lastEntry.name));
                currTime = lastEntry.time;
            }
            for(let i = 1; i < arr.length; i++){
                const currEntry = arr[i];
                //a new TrueSegment only ever needs creation if lastEntry is a SHOW event
                //two cases of creation: 
                //if currEntry has different domain(interruption)
                //or if domain matches and currEntry is a matching HIDE
                
                if (lastEntry.inView && 
                    ((lastEntry.name !== currEntry.name) || 
                    (lastEntry.name === currEntry.name && !currEntry.inView))
                ){
                    trueTimeSegments.push(new TrueSegment(lastEntry.time,currEntry.time,lastEntry.name));
                }
                lastEntry = currEntry;
            }
            if (lastEntry.inView){
                trueTimeSegments.push(new TrueSegment(lastEntry.time,upperbound,lastEntry.name));
            }

            //we now have a complete list of trueTimeSegments
            
        }
        
    };

    
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
        openDB = indexedDB.open("db", 14);

        openDB.onerror = () => setTimeout(OpenDatabase(i+1),500);

        openDB.onupgradeneeded = (event) => {
            let db = openDB.result;

            /* if(db.objectStoreNames.contains(newTsName)){
                let obstore = event.target.transaction.objectStore(newTsName);
                obstore.createIndex("time","time",{unique:false});
            } */
            
            if (db.objectStoreNames.contains("minute")){
                db.deleteObjectStore("minute");
                let obstore = db.createObjectStore("minute",{autoIncrement: true});
                obstore.createIndex("time","time",{unique:false});
            }
            if (db.objectStoreNames.contains("hour")){
                db.deleteObjectStore("hour");
                let obstore = db.createObjectStore("hour",{autoIncrement: true});
                obstore.createIndex("time","time",{unique:false});
            }
            if (db.objectStoreNames.contains("day")){
                db.deleteObjectStore("day");
                let obstore = db.createObjectStore("day",{autoIncrement: true});
                obstore.createIndex("time","time",{unique:false});
            }
        };  

        openDB.onsuccess = () => {
            let db = openDB.result;
            console.log(db.objectStoreNames);
            
            isDBOpen = true;
            console.log("DB is open");
            convertToPackets();
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
