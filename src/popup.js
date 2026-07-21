var resetButton = document.getElementById("resetButton");
var clearSession = document.getElementById("session");
var clearCont = document.getElementById("continuous");
var clearMinute = document.getElementById("minute");
var clearHour = document.getElementById("hour");
var clearDay = document.getElementById("day");
var displayMessage = document.getElementById("display");

resetButton.onclick = () =>{


    //each time button is clicked, send new clear preferences to background
    let newClearList = [];
    const extractName = (e) => {
        if (e.checked){
            displayMessage.innerHTML += `${e.id}<br>`;
            newClearList.push(e.id);
        }
        
    }
    extractName(clearSession);
    extractName(clearCont);
    extractName(clearMinute);
    extractName(clearHour);
    extractName(clearDay);

    let newClearPrefrences = new Set(newClearList);
    chrome.runtime.sendMessage({
        clearRequest: newClearPrefrences
    });

    if (clearSession.checked){
        chrome.storage.local.clear();
    }
    
};

chrome.runtime.onMessage.addListener((message) => {

});