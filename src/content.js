async function send(message,port){
    try{
        port.postMessage(message);
    }
    catch(error){
        console.warn(`message failed to send at ${port.name}: ${error}`);
    }
}





//const vis = /* (document.visibilityState === "visible"); */ document.hasFocus();

function MakePort(){
    var currentURL = window.location.href;
    console.log("try again");
    const domain = ParseDomain(currentURL);
    var port;
    try{
        port = chrome.runtime.connect({name: currentURL});
    }
    catch(err){
        console.warn(`Connection failed with ${port.name}: ${err}`);
    }
    var beforeclose = true;
    var start_message = {
        name: domain,
        inView: document.hasFocus(),
        action: "OPEN",
        time: Date.now()
    }

    // Listen for messages from background script



    send(start_message,port);

    port.onDisconnect.addListener(() => {
        setTimeout(MakePort, 500); // retry after delay
    });

    window.addEventListener('blur', async () => {
        const message = {
            name: domain,
            inView: false,
            action: "HIDE",
            time: Date.now()
        }
        send(message,port);
    });

    window.addEventListener('focus', async () => {
        const message = {
            name: domain,
            inView: true,
            action: "SHOW",
            time: Date.now()
        }
        send(message,port);
    });

    window.addEventListener("beforeunload", () => {
        const message = {
            name: domain,
            inView: false,
            action: "CLOSE",
            time: Date.now()
        }
        send(message,port);
        beforeclose = false;

        if (port && !beforeclose){
            try{
                port.disconnect();
            }catch(err){
                console.warn("Disconnect failed: ", err);
            }
        }
        
    });
}

function InitWindowStopwatch(){
    const logo_url = GetFaviconUrl();
    const currentURL = ParseDomain(window.location.href);
    var div = document.createElement("div");
    div.className = "expandedStopwatch";
    //<img src = ${logo_url} alt = ${"icon for " + currentURL}>
    div.innerHTML = 
    `
        Viewport: ${window.innerWidth} x ${window.innerHeight} <br>
        ${currentURL}
    `;
    document.body.appendChild(div);

    /* const div = document.createElement("div");
  div.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #222;
      color: white;
      padding: 10px 15px;
      border-radius: 8px;
      z-index: 999999;
      font-family: sans-serif;
    ">
      🚀 Injected HTML Content!
    </div>
  `;
  document.body.appendChild(div); */
}

InitWindowStopwatch();
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received:", message);

  // Optional: send a response back
  sendResponse({ isInjected: true });

  // Return true if you want to send an async response
  return true;
});


MakePort();







//alert(domain);
