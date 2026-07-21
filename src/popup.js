var resetButton = document.getElementById("resetButton");
var clearSession = document.getElementById("session");
var clearCont = document.getElementById("continuous");
var clearMinute = document.getElementById("minute");
var clearHour = document.getElementById("hour");
var clearDay = document.getElementById("day");
var displayMessage = document.getElementById("display");

resetButton.onclick = () =>{
    displayMessage.innerText = ("this is working");
    //console.warn("this is happening");
    /* chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError){
            console.warn("Storage clear error:", chrome.runtime.lastError);
        }
        else{
            console.log("clear success");
        }
    }); */

    /* chrome.runtime.sendMessage({
        clearRequest: true
    }); */
};