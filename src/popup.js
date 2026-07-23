

async function playSound(){
    await chrome.offscreen.hasDocument(async (exists) => {
        if(exists){
            await chrome.offscreen.closeDocument();
        }
        await chrome.offscreen.createDocument({
            url: 'audioPlayer.html',
            reasons: ["AUDIO_PLAYBACK"],
            justification: 'play alarm sfx',
        });
        
        await new Promise((resolve) => setTimeout(resolve,1500));

        chrome.offscreen.closeDocument();
    });
    
}

//playSound();


var setOfSites = new Set([]);
const resetButton = document.getElementById("resetButton");
const websitesList = document.getElementById("websitesList");
const websitesEnter = document.getElementById("enterDomain");
const domainMessage = document.getElementById("domainMessage");
const hidelist = document.getElementById("hidelist");

const hourEntry = document.getElementById("hourEntry");
const minuteEntry = document.getElementById("minuteEntry");
const secondEntry = document.getElementById("secondEntry");
const initButton = document.getElementById("initTimer");
const initWarn = document.getElementById("initWarn");

const ringAlarm = document.getElementById("RING");
const warnAlarm = document.getElementById("WARN");
const killTarget = document.getElementById("TARGET");
const killAll = document.getElementById("ALL");
const killNone = document.getElementById("NONE");


chrome.storage.local.get(["tentative"], (result) => {
    const tentativeTimer = result.tentative;
    if (tentativeTimer === undefined){
        return;
    }
    //console.log(tentativeTimer);
    setOfSites = new Set(tentativeTimer.targetList);
    renderWebsiteList();
    let timerLimit = Math.round(tentativeTimer.timeLimit/1000);
    //console.log(`timerlimit is ${timerLimit}`);
    let retrieveTime = (e,n) => {
        const numstr = n.toString();
        e.value = ((numstr.length < 2) ? "0" : "") + numstr;

        //console.log(`${e.value} is value of ${e.id}`);
    }
    retrieveTime(secondEntry,(timerLimit % 60));
    retrieveTime(minuteEntry,(Math.floor(timerLimit/60) % 60));
    retrieveTime(hourEntry,(Math.floor(timerLimit/3600) % 60));
    console.log(`list of alarm effects:`);
    console.log(tentativeTimer.alarmEffect);
    let effectSet = new Set(tentativeTimer.alarmEffect);
    let retrieveEffect = (e) => {
        if (effectSet.has(e.id)){
            e.checked = true;
        }
    }
    retrieveEffect(ringAlarm);
    retrieveEffect(warnAlarm);
    retrieveEffect(killTarget);
    retrieveEffect(killAll);
    retrieveEffect(killNone);
});
//alarmAlertSound.play();

function renderWebsiteList(){
    hidelist.style.display = "none";
    for(const domain of setOfSites){
        const newTracker = document.createElement("div");
        websitesList.appendChild(newTracker);
        newTracker.innerHTML = `${domain}`;
        newTracker.style.width = "180px";
        newTracker.style.position = "relative";
        const trackerDelete = document.createElement("button");
        trackerDelete.innerText = "-";
        trackerDelete.style = `
            position: absolute;
            right: 15px;
            height: 20px;
            vertical-align: center;
        `;
        newTracker.appendChild(trackerDelete);
        
        trackerDelete.onclick = () => {
            setOfSites.delete(domain);
            if (setOfSites.size === 0){
                hidelist.style.display = "block";
            }
            console.log(setOfSites.size);
            websitesList.removeChild(newTracker);
            
        };
    }
}

function addSite(inputSite){
    if (inputSite === ""){
        domainMessage.innerText = "Please enter domain";
        return false;
    }
    if (setOfSites.has(inputSite)){
        domainMessage.innerText = "Site tracking exists";
        return false;
    }
    setOfSites.add(inputSite);
    websitesList.innerHTML = "";
    domainMessage.innerText = "";
    domainMessage.style.color = "red";
    renderWebsiteList();
    return true;
    
}

function timeEntry(e,limit = true){
    console.log(e);
    e.addEventListener('change', () => {
        
        const inp = e.value;
        if(inp.length < 2){
            e.value = "0" + inp;
        }
        if (limit && Number(e.value) > 59){
            e.value = "59";
        }
    });
    
}

async function tentativeLoop(){
    while(true){
        let tentativeTimer = {};
        tentativeTimer.timeCounted = 0;
        tentativeTimer.startTime = 0;
        tentativeTimer.timeLimit = 
            (Number(hourEntry.value) * 3600 +
            Number(minuteEntry.value) * 60 + 
            Number(secondEntry.value)) * 1000;
        tentativeTimer.targetList = [...setOfSites];
        let AElist = [];
        tentativeTimer.alarmEffect = [];
        let addEffect = (e) => {
            if (e.checked){
                AElist.push(e.id);
            }
        }
        addEffect(ringAlarm);
        addEffect(warnAlarm);
        addEffect(killTarget);
        addEffect(killAll);
        addEffect(killNone);

        tentativeTimer.alarmEffect = AElist;
        //a timer has:
        //a timeCounted at 0
        //a startTime default 0
        //a targetList default null
        //a alarmEffect defaul null
        console.log(tentativeTimer);
        chrome.storage.local.set({tentative: tentativeTimer}, ()=>{
            if (chrome.runtime.lastError){
                console.log(chrome.runtime.lastError);
            }
        });
        await new Promise((resolve) => setTimeout(resolve,1000));
    }
}
tentativeLoop();

//request preferences info
const port = chrome.runtime.connect({name:"popup"});
try{
    port.postMessage({preferenceRequest: true});
    console.log("trying to send request of preference request");
}
catch(error){
    console.log(`message failed to send at popup: ${error}`);
}


timeEntry(hourEntry,false);
timeEntry(minuteEntry);
timeEntry(secondEntry);




resetButton.onclick = () =>{
    console.log("message to see if resetButton is triggered");
    var clearSession = document.getElementById("session");
    var clearCont = document.getElementById("continuous");
    var clearMinute = document.getElementById("minute");
    var clearHour = document.getElementById("hour");
    var clearDay = document.getElementById("day");
    var displayMessage = document.getElementById("display");
    //each time button is clicked, send new clear preferences to background
    let newClearList = [];
    const extractName = (e) => {
        if (e.checked){
            newClearList.push(e.id);
        }
        
    }
    extractName(clearSession);
    extractName(clearCont);
    extractName(clearMinute);
    extractName(clearHour);
    extractName(clearDay);

    try{
        port.postMessage({clearRequest: newClearList});
        //console.log("sending this: ", {clearRequest: newClearList});
    }
    catch(error){
        console.log(`message failed to send at popup: ${error}`);
    }
    if (clearSession.checked){
        //get all keys from local storage
        //for all storage not aggregate timer or recent
        //remove
        chrome.storage.local.get(null, (all) => {
            for (const [key,contents] of Object.entries(all)){
                if (key !== "aggregate" && key !== "tentative" && key !== "timer"){
                    chrome.storage.local.remove([key]);
                }
            }
        });
        /* chrome.storage.local.clear(() => {
            if (chrome.runtime.lastError){
                console.warn("Storage clear error:", chrome.runtime.lastError);
            }
            else{
                console.log("clear success");
            }
        }); */
    }

        
    
};

port.onMessage.addListener(async (response) => {
    //hideSpan.innerText = "received";
    await new Promise((resolve) => setTimeout(resolve,100));
    const hideSpan = document.getElementById("hiding");
    const showDiv = document.getElementById("showing");
    if (response.reply !== undefined && response.reply.clearRequest){
        const settingList = response.reply.clearRequest;
        
        for (const setting of settingList){
            //console.log ("setting this, ",setting);
            document.getElementById(setting).checked = true;
        }
    }
    hideSpan.style.display = "none";
    showDiv.style.display = "inline-block";

    
    
    /* for(let i = 0; i < 10; i++){
        scrolldiv.innerHTML += "hello<br><br>";
    } */
});

websitesEnter.addEventListener("keypress", (event) => {
    if (event.key === "Enter"){
        if (addSite(websitesEnter.value)){
            websitesEnter.value = "";
        }
    }
});

const scrolldiv = document.getElementById("scrollWebsites");
chrome.storage.local.get(["recent"],(items) => {
    if (chrome.runtime.lastError){
        
    }
    console.log(items);
    if (items.recent){
        let recentList = Object.entries(items.recent);
        recentList.sort((a,b) => (b[1]-a[1]));
        for (const [domain,content] of recentList){
            //scrolldiv.innerHTML += `${domain}<br>`;

            let thisspan = document.createElement("span");
            scrolldiv.append(thisspan);
            thisspan.innerHTML = `${domain}<br>`;
            thisspan.style.margin = "5px";
            thisspan.style.whiteSpace = "nowrap";
            thisspan.onclick = () => {
                addSite(domain);
            }
            //for each entry, append a span
            //each span has an onclick function
            //onclick: add bs to websitesEnter
        }
    }
    else{   
        scrolldiv.innerHTML = "No recent visits";
    }
});

initButton.onclick = () => {
    initWarn.style.color = "red";
    initWarn.style.display = "inline-block";
    //check some conditions
    //If duration is 0, warn to provide a time
    if (hourEntry.value === "00" && minuteEntry.value === "00" && secondEntry.value === "00"){
        initWarn.innerText = "Please enter time";
        return;
    }
    
    if (!ringAlarm.checked &&
        !warnAlarm.checked &&
        !killTarget.checked &&
        !killAll.checked
    ){
        initWarn.innerText = "Please select an effect";
        return;
    }
    initWarn.style.color = "black";
    initWarn.innerText = "Timer started.";



    //If no effect is selected, warn to select an effect
    
};




//what info should aggregate retain?
//choice of effect: what should happen when the timer goes off
//epoch: UNIXtime of start for this alarm
//timeConstraint: if current time exceeds this, effect goes off
//alarmEffect has a name