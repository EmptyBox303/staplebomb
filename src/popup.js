var resetButton = document.getElementById("resetButton");

var clearSession = document.getElementById("session");
var clearCont = document.getElementById("continuous");

resetButton.onclick = () =>{
    //console.warn("this is happening");
    chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError){
            console.warn("Storage clear error:", chrome.runtime.lastError);
        }
        else{
            console.log("clear success");
        }
    });

    chrome.runtime.sendMessage({
        clearRequest: true
    });
};