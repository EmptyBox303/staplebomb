
var resetButton = document.getElementById("resetButton");

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
    await new Promise((resolve) => setTimeout(resolve,300));
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
});