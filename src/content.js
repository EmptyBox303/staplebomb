async function send(message,port, url){
    try{
        port.postMessage(message);
    }
    catch(error){
        console.log(`message failed to send at ${url}: ${error}`);
        //MakePort();
    }
}


async function AsyncLoop(action_fn,condition_fn, interval = 10){

    while(condition_fn()){
        action_fn();
        await new Promise((resolve) => setTimeout(resolve,interval));
    }
}



function MakePort(){
    const currentURL = window.location.href;
    console.log("try again");
    const domain = ParseDomain(currentURL);
    var port;
    let port_success = false;
    let attempts = 0;

    var aggregate;
    var stopwatchPause = false;
    var timediv;
    var topline;
    var startTime;
    var sessionTime;
    var saveAggregate;
    while(!port_success && attempts < 10){
        try{
            port = chrome.runtime.connect({name: currentURL});
            port_success = true;
        }
        catch(err){
            //console.warn(`Connection failed with ${currentURL}: ${err}`);
        }
        setTimeout(()=>{},1000);
        attempts ++;
    }

    if (attempts == 10 && !port_success){
        console.warn(`Connection failed with ${currentURL} for maximum attempts; stopping now`);
        return;
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

    async function ShowTab(){
        
        //on showing the tab:
        //retrieve chrome.storage.local this domain
        //if none exist, use 0 as aggregateTime, and create an entry for 0
        //if exists, take as aggregateTime
        //use aggregateTime + Date.now() - startTime as timer
        startTime = Date.now();
        chrome.storage.local.get([domain], (result) =>{
            if (chrome.runtime.lastError){
                aggregate = saveAggregate;
                console.warn("local storage read error: ", chrome.runtime.lastError);
                console.log("error entry");
            }
            else if (Object.keys(result).length === 0){
                aggregate = saveAggregate;
                console.log("no entry");
                chrome.storage.local.set({[domain]: 0}, () => {
                    if (chrome.runtime.lastError){
                        console.warn("local storage write error: ", chrome.runtime.lastError);
                    }
                });
            }
            else{
                aggregate = result[domain];
                console.log("existing entry:",aggregate);
            }
            console.log("aggregate: ", aggregate);
        });

        if (aggregate < saveAggregate){
            aggregate = saveAggregate;
            chrome.storage.local.set({[domain]:aggregate}, () =>{
                if (chrome.runtime.lastError){
                    console.warn("local storage write error: ", chrome.runtime.lastError);
                }
            });
        }

        console.log("showing...");
        if (stopwatchPause){
            console.log("show run?");
            stopwatchPause = false;
            AsyncLoop(() => {
                sessionTime = aggregate + Date.now() - startTime;
                timediv.innerHTML = topline + GetStopwatchTime(sessionTime) + "</span>";
            }, () => !stopwatchPause);
        }
        
    }

    async function HideTab(){
        stopwatchPause = true;
        //in rare scenarios, tab switches occur too quickly; this results in possible sessionTime overwrite
        //where a tab with advanced timer sends sessionTime to data
        //a tab with regressed timer doesn't receive it
        //and at hide, the regressed tab sends a regressed sessionTime with override.
        //we need to make sure that our sessionTime writes are not overwriting a more advanced time;
        chrome.storage.local.get([domain], (result) => {

        });
        chrome.storage.local.set({[domain]: sessionTime}, () => {
            if (chrome.runtime.lastError){
                console.warn("local storage write fail: ", chrome.runtime.lastError);
            }
        });
        saveAggregate = sessionTime;

        
        //On hiding the tab:
        //pause timer
        //send to chrome.storage.local the "session time" of this tab being viewed
        //as in:
        /*  */

    }

    async function InitWindowStopwatch(){
        const logo_url = GetFaviconUrl();
        startTime = Date.now();
        //make overall div
            var div = document.createElement("div");
            div.className = "expandedStopwatch";
            document.body.appendChild(div);
        
        //make time div
            timediv = document.createElement("div");
            timediv.style = "margin: 15pt";
            div.appendChild(timediv);
            //
            
        //make draggable div
            var dragdiv = document.createElement("div");
            dragdiv.className = "stopwatchDrag";
            dragdiv.innerText = "Drag";
            div.appendChild(dragdiv);
            dragElement(div);

        //make buttondiv
            var buttondiv = document.createElement("div");
        //make innerbutton
            var innerbutton = document.createElement("button");
            innerbutton.dataset.collapse = "true";
            innerbutton.innerText = "-";
            innerbutton.className = "collapseClick";
            buttondiv.appendChild(innerbutton);
        //add script to buttondiv
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

        //
            topline = `
                <img src = ${logo_url} alt = ${"icon for " + domain} width = "24" height = "24" style= "display: inline-block; vertical-align: middle; margin: 0; padding: 0">
                <b>${domain}<br></b> <span>
            `;


            AsyncLoop(() => {
                sessionTime = aggregate + Date.now() - startTime;
                timediv.innerHTML = topline + GetStopwatchTime(sessionTime) + "</span>";
            }, () => !stopwatchPause);

    }



    if (!InjectionMarkerExist()){
        MakeInjectionMarker();
        InitWindowStopwatch();   
    }

    var beforeclose = true;
    if (document.hasFocus()){
        var start_message = {
            name: domain,
            inView: true,
            action: "OPEN",
            time: Date.now()
        }
        send(start_message,port,currentURL);
        ShowTab();
    }
    

    // Listen for messages from background script



    

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
        HideTab();

    });

    window.addEventListener('focus', async () => {
        const message = {
            name: domain,
            inView: true,
            action: "SHOW",
            time: Date.now()
        }
        send(message,port,currentURL);
        ShowTab();
    });

    window.addEventListener("beforeunload", () => {
        const message = {
            name: domain,
            inView: false,
            action: "CLOSE",
            time: Date.now()
        }
        send(message,port,currentURL);

        HideTab();
        beforeclose = false;

        if (port && !beforeclose){
            return;
        }
        
    });


    
}





//every time each website is switched to/from
//a message is sent to background

MakePort();








//alert(domain);




