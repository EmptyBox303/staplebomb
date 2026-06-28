/* browser.tabs.onActivated.addListener(async (activeInfo) => {
    const tabId = activeInfo.tabId;
    console.log('User switched to tab:', tabId);
}); */
let p = 0;
while(true){
    if (p != Date.now()){
        p = Date.now();     
        console.log(Date.now());
    }
}
