



const resetButton = document.getElementById("resetButton");
const websitesList = document.getElementById("websitesList");
const websitesEnter = document.getElementById("enterDomain");
const setOfSites = new Set([]);
const domainMessage = document.getElementById("domainMessage");

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
            right: 0px;
            height: 20px;
            vertical-align: center;
        `;
        newTracker.appendChild(trackerDelete);
        trackerDelete.onclick = () => {
            websitesList.removeChild(newTracker);
            setOfSites.delete(domain);
        };
    }
    return true;
    
}
//request preferences info
const port = chrome.runtime.connect({name:"popup"});
try{
    port.postMessage({preferenceRequest: true});
    console.log("trying to send request of preference request");
}
catch(error){
    console.log(`message failed to send at popup: ${error}`);
}

console.log("test");

resetButton.onclick = () =>{
    
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
        chrome.storage.local.clear(() => {
            if (chrome.runtime.lastError){
                console.warn("Storage clear error:", chrome.runtime.lastError);
            }
            else{
                console.log("clear success");
            }
        });
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

