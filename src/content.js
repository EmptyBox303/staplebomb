async function send(message,port){
    try{
        port.postMessage(message);
    }
    catch(error){
        console.warn(`message failed to send at ${port.name}: ${error}`);
    }
}

async function AsyncLoop(action_fn,condition_fn){
    while(condition_fn()){
        action_fn();
        await new Promise((resolve) => setTimeout(resolve,0));
    }
}

async function InitWindowStopwatch(){
    const logo_url = GetFaviconUrl();
    const currentURL = ParseDomain(window.location.href);
    const currTime = Date.now();

    var div = document.createElement("div");
    div.className = "expandedStopwatch";
    document.body.appendChild(div);
    
    var timediv = document.createElement("div");
    timediv.style = "padding: 15pt";
    div.appendChild(timediv);
    //
    
    
    var dragdiv = document.createElement("div");
    dragdiv.className = "expandedStopwatchDrag";
    dragdiv.innerText = "Drag";
    div.appendChild(dragdiv);
    dragElement(div);
    const topline = `
         <img src = ${logo_url} alt = ${"icon for " + currentURL} width = "24" height = "24" style= "display: inline-block; vertical-align: middle; margin: 0; padding: 0">
        ${currentURL} <p style = "border: 0; margin: 0; padding: 0">
    `;

    AsyncLoop(() => {
        timediv.innerHTML = topline + GetStopwatchTime(currTime) + "</p>";
    }, () => true);

    
    

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

function MakeInjectionMarker(){
    const div = document.createElement("div");
    div.className = "staplebombInjectionMarker";
    document.body.appendChild(div);
}

function InjectionMarkerExist(){
    const mark = document.getElementsByClassName('staplebombInjectionMarker');
    return (mark.length > 0);
}

if (!InjectionMarkerExist()){
    MakeInjectionMarker();
    InitWindowStopwatch();
    MakePort();
}








//alert(domain);
