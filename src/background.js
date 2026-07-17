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

async function updateLoop(){
    let currTime = Date.now();
    //
    let nextFif = (currTime-1) - ((currTime-1) % 15000) + 15000;
    await new Promise((resolve) => setTimeout(resolve,nextFif));
    while(isLoopActive){
        convertToPackets();
        await new Promise((resolve) => setTimeout(resolve,15000));
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
        const putreq = store.add(message);
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


    let PostFloat = async () => {
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
    };

    
    if (polname !== "float"){
        console.log("not implemented yet, nothing to be done");
    }
    else{
        PostFloat();
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


    

    let hourset = async () => {
        console.log("this is hourset");
        const hour_upperbound = nowtime - (nowtime % 3600000);
        console.log((new Date(hour_upperbound)).toLocaleString());


        const tx_hour = db.transaction(["minute","hour"],"readwrite");
        const hourStore = tx_hour.objectStore("hour");
        const hourIndex = hourStore.index("time");
        const minStore = tx_hour.objectStore("minute");
        const minIndex = minStore.index("time");

        hourIndex.openCursor(null,"prev").onsuccess = (event) => {
            const cursor = event.target.result;
            const hour_lowerbound = (cursor === null) ? 0 : (Number(cursor.value.time) + 3600000);

            const minuteDeletion = () => {
                console.log("minuteDeletion");
                const minute_delete_upper = hour_upperbound - (24 * 3600 * 1000);
                console.log((new Date(minute_delete_upper)).toLocaleString());

                const deleteMinuteRange = IDBKeyRange.upperBound(minute_delete_upper);
                
                minIndex.openCursor(deleteMinuteRange).onsuccess = (event) => {
                    const cursor = event.target.result;
                    let count = 0;
                    if (cursor){
                        console.log(cursor.value);
                        count++;
                        cursor.delete();
                        cursor.continue();
                    }
                    else{
                        console.log(`${count} deleted from minute db`);
                        minIndex.getAll().onsuccess = (event) => {
                            const arr = event.target.result;
                            console.log(arr);
                        }
                    }
                }
            };
            if (hour_lowerbound >= hour_upperbound){
                minuteDeletion();
                return;
            }
           
            const targetMinuteRange = IDBKeyRange.bound(hour_lowerbound,hour_upperbound);

            minIndex.getAll(targetMinuteRange).onsuccess = (event) => {

                const minArr = event.target.result;
                console.log(minArr.length);
                if (minArr.length === 0){
                    minuteDeletion();
                    return;
                    //no conversion; go to minute deletion
                }

                let hourPackets = {};
                for(let i = 0; i < minArr.length; i++){
                    const minuteP = minArr[i];
                    
                    //each minute maps to some hour
                    const minuteTime = Number(minuteP.time);
                    const hourMap = minuteTime - (minuteTime % 3600000);

                    if (!(hourMap in hourPackets)){
                        hourPackets[hourMap] = {};
                        for (const [domain,time] in Object.entries(minuteP.dict)){
                            //each is a domain name and time usage
                            if (!(domain in hourPackets[hourMap])){
                                hourPackets[hourMap][domain] = Number(time);
                            }
                            else{
                                hourPackets[hourMap][domain] += Number(time);
                            }
                        }
                    }

                    
                }

                for(const [hour,content] in hourPackets){
                    hourStore.add({time:hour, dict: content});
                }
                minuteDeletion();
                return;
                //all work doen now; go to hour deletion
            }
        }
        
    }

    let minuteset = async () => {
        
        minuteIndex.openCursor(null,"prev").onsuccess = async (event) => {
            const cursor = event.target.result;
            console.log("Upper: ", minute_upperbound);

            let lowerbound = (cursor === null) ? 0 : Number(cursor.value.time) + 60000;
            //console.log(typeof cursor.value.time);
            let upperbound = minute_upperbound;
            const tsQueryRange = IDBKeyRange.bound(lowerbound,upperbound);
            
            const tsStore = tx.objectStore(newTsName);
            const tsIndex = tsStore.index("time");

            tsIndex.getAll().onsuccess = (event) => {
                console.log(event.target.result);
            }

            tsIndex.getAll(/* tsQueryRange */).onsuccess = async (event) => {
                let convertFunc = async () => {
                    const arr = event.target.result;
                    console.log(arr);
                    //this gives us the range of messages
                    if (event.target.result.length === 0){
                        return;
                    }

                    
                    const firstTime = arr[0].time;
                    const startTime = (lowerbound === 0) ? (firstTime - firstTime % 60000) : lowerbound;

                
                    if (arr.length === 0) return;
                    let trueTimeSegments = [];
                    let lastEntry = arr[0];
                    if(!lastEntry.inView){
                        trueTimeSegments.push(new TrueSegment(startTime,lastEntry.time,lastEntry.name));
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
                        tsStore.add({name: lastEntry.name, time: upperbound, inView: true, action: "GEN"});
                    }

                    //we now have a complete list of trueTimeSegments
                    //iterate through them to create minute packets
                    const l = trueTimeSegments.length;
                    console.log(trueTimeSegments);
                    let minutePackets = {};
                    for (let i = 0; i < l; i++){
                        
                        const currSeg = trueTimeSegments[i];
                        
                        const currDomain = currSeg.domain;
                        //we look at the start and end times of this segment
                        const startSpan = currSeg.start - currSeg.start % 60000;
                        const endSpan = (currSeg.end - 1) - (currSeg.end - 1) % 60000 + 60000;
                        if (startSpan === endSpan){
                            //do nothing
                        }
                        else if (startSpan + 60000 === endSpan){
                            if (!(startSpan in minutePackets)){
                                minutePackets[startSpan] = {};
                                
                            }
                            if (currDomain in minutePackets[startSpan]){
                                minutePackets[startSpan][currDomain] += currSeg.end - currSeg.start;
                            }
                            else{
                                minutePackets[startSpan][currDomain] = currSeg.end - currSeg.start;
                            }
                        
                        }else for(let t = startSpan; t < endSpan; t += 60000){
                            const t_end = t + 60000;
                            if (!(t in minutePackets)){
                                minutePackets[t] = {};
                                console.log("created ", t);
                            }

                            //1. currSeg starts within this minutePackete but doesn't end in it
                            //currSeg.start in [t,t_end), currSeg.end not in [t,t_end)
                            //
                            //
                            if (currSeg.start >= t && currSeg.start < t_end && currSeg.end >= t_end){
                                if (!(currDomain in minutePackets[t])){
                                    console.log(`${currDomain} not in ${t} (begin)`);
                                    minutePackets[t][currDomain] = t_end - currSeg.start;
                                }
                                else minutePackets[t][currDomain] += t_end - currSeg.start;
                            }
                            //2. currSeg starts before this minute packet and ends outside
                            //currSeg.start < t
                            else if (currSeg.start < t && currSeg.end > t_end){
                                if (!(currDomain in minutePackets[t])){
                                    console.log(`${currDomain} not in ${t} (middle)`);
                                    minutePackets[t][currDomain] = 60000;
                                }
                                else minutePackets[t][currDomain] += 60000;
                            }
                            else{
                                if (!(currDomain in minutePackets[t])){
                                    console.log(`${currDomain} not in ${t} (end)`);
                                    minutePackets[t][currDomain] = currSeg.end - t;
                                }
                                else minutePackets[t][currDomain] += currSeg.end - t;
                            }
                        }

                    }

                    for(const [key,value] of Object.entries(minutePackets)){
                        //minuteStore.add({time:Number(key), dict: value});
                        console.log(`${key}:`,value);
                    }
                    return;
                

                }

                await convertFunc();
                /* const deleteUpperBound = minute_upperbound - 2 * 3600 * 1000;
                console.log("deleting all ts entries before ", new Date(deleteUpperBound).toLocaleString());
                console.log(deleteUpperBound);
                tsIndex.openCursor(IDBKeyRange.upperBound(deleteUpperBound)).onsuccess = (event) => {
                    let count = 0;
                    const cursor = event.target.result;
                    if (cursor){
                        cursor.delete();
                        count++;
                        cursor.continue();
                    }
                    else{
                        console.log(`${count} deleted\n`);
                    }
                }
                hourset(); */
            }
            
        };
    }

    minuteset();

    
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

chrome.runtime.onMessage.addListener((message) => {
    if (message.clearRequest && openDB){
        const db = openDB.result;
        const tx = db.transaction([newTsName,"minute","hour","day"],"readwrite");
        tx.objectStore(newTsName).clear();
        tx.objectStore("minute").clear();
        tx.objectStore("hour").clear();
        tx.objectStore("day").clear();
    }
})

//each tab switch updates the "session" db
//session db marks current website visited, and all segments of time of which the site was visited in unix
//split into the "inView" and "offView" arrays
//
//at precise minute mark, background should form a "packet" of website use times and send to indexedDB
//at precise hour mark, background should query packets in the last hour and form an hour packet to be consolidated into indexedDB
//at precise day mark(UNIX_TIME % (3600*24*1000) == 0), background should query last 24 hour packets and form a day packet to be consolidated
