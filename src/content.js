async function send(message,port, url){
    try{
        port.postMessage(message);
    }
    catch(error){
        console.log(`message failed to send at ${url}: ${error}`);
        //MakePort();
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
    timediv.style = "margin: 15pt";
    div.appendChild(timediv);
    //
    
    
    var dragdiv = document.createElement("div");
    dragdiv.className = "stopwatchDrag";
    dragdiv.innerText = "Drag";
    div.appendChild(dragdiv);
    dragElement(div);

    var buttondiv = document.createElement("div");

    var innerbutton = document.createElement("button");
    innerbutton.dataset.collapse = "true";
    innerbutton.innerText = "-";
    buttondiv.appendChild(innerbutton);

    buttondiv.className = "collapseClick";
    buttondiv.onclick = () =>{
        console.log("click");
        if (innerbutton.dataset.collapse === "true"){
            innerbutton.dataset.collapse = "false";
            div.className = "collapsedStopwatch";
            timediv.style = "margin: 8pt 15pt 15pt 15pt";
            innerbutton.innerText = "+";

        }
        else if (innerbutton.dataset.collapse === "false"){
            innerbutton.dataset.collapse = "true";
            div.className = "expandedStopwatch";
            timediv.style = "margin: 15pt";
            innerbutton.innerText = "-";
        }
        else{
            console.error("button error: invalid 'collapse' data");
        }
    };
    div.appendChild(buttondiv);

    const topline = `
         <img src = ${logo_url} alt = ${"icon for " + currentURL} width = "24" height = "24" style= "display: inline-block; vertical-align: middle; margin: 0; padding: 0">
        <b>${currentURL}<br></b> <span>
    `;

    AsyncLoop(() => {
        timediv.innerHTML = topline + GetStopwatchTime(currTime) + "</span>";
    }, () => true);

}

function MakePort(){
    const currentURL = window.location.href;
    console.log("try again");
    const domain = ParseDomain(currentURL);
    var port;
    let port_success = false;
    let attempts = 0;
    while(!port_success && attempts < 10){
        try{
            port = chrome.runtime.connect({name: currentURL});
            port_success = true;
        }
        catch(err){
            console.warn(`Connection failed with ${currentURL}: ${err}`);
        }
        setTimeout(()=>{},1000);
        attempts ++;
    }

    if (attempts == 10 && !port_success){
        console.warn(`Connection failed with ${currentURL} for maximum attempts; stopping now`);
        return;
    }

    
    var beforeclose = true;
    var start_message = {
        name: domain,
        inView: document.hasFocus(),
        action: "OPEN",
        time: Date.now()
    }

    // Listen for messages from background script



    send(start_message,port,currentURL);

    port.onDisconnect.addListener((p) => {
        if (p.error){
            console.error(p);
        }
        if (beforeclose){
            setTimeout(MakePort, 500);
        }
         // retry after delay
    });

    window.addEventListener('blur', async () => {
        const message = {
            name: domain,
            inView: false,
            action: "HIDE",
            time: Date.now()
        }
        send(message,port,currentURL);
    });

    window.addEventListener('focus', async () => {
        const message = {
            name: domain,
            inView: true,
            action: "SHOW",
            time: Date.now()
        }
        send(message,port,currentURL);
    });

    window.addEventListener("beforeunload", () => {
        const message = {
            name: domain,
            inView: false,
            action: "CLOSE",
            time: Date.now()
        }
        send(message,port,currentURL);
        beforeclose = false;

        if (port && !beforeclose){
            return;
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
    
}

MakePort();








//alert(domain);
