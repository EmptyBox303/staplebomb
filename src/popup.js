var resetButton = document.getElementById("resetButton");
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
};