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

function MakeHiddenUntilHover(divToHover,divToHide){
    divToHide.style.display = 'none';
    divToHover.addEventListener('mouseenter',() => {
        let s = divToHover.parentElement.className;
        if (s.startsWith("collapsed")){
            divToHide.style.display = 'none';
        }
        else{
            divToHide.style.display = 'block';
        }
        
    });

    divToHover.addEventListener('mouseleave',() => {
        divToHide.style.display = 'none';
    });
}



async function MakePort(){
    const currentURL = window.location.href;
    
    const PrecisionPolicies = Object.freeze({
        FLOATING: 1,
        SECOND: 1000,
        MINUTE: 60000,
        HOUR: 3600000,
        DAY: 24*3600000
    });

    const trackingModes = [
        new MonitorTime(15,"15 minutes",PrecisionPolicies.FLOATING),
        new MonitorTime(30,"half hour",PrecisionPolicies.FLOATING),
        new MonitorTime(60,"hour",PrecisionPolicies.MINUTE),
        new MonitorTime(120,"2 hours",PrecisionPolicies.MINUTE),
        new MonitorTime(360,"6 hours",PrecisionPolicies.HOUR),
        new MonitorTime(1440, "day", PrecisionPolicies.HOUR),
        new MonitorTime(2880, "2 days", PrecisionPolicies.HOUR),
        new MonitorTime(7*1440, "week", PrecisionPolicies.DAY),
        new MonitorTime(30*1440, "month", PrecisionPolicies.DAY),
        new MonitorTime(365*1440, "year", PrecisionPolicies.DAY),
    ];

    console.log("try again");
    const domain = ParseDomain(currentURL);
    var port;
    let port_success = false;
    let attempts = 0;

    var aggregate = 0;
    var stopwatchPause = true;
    var timediv = {};
    var hidediv = {};
    var topline;
    var startTime;
    var sessionTime;
    var saveAggregate = 0;
    var aggregateRecord = false;
    var sessionStart;
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

    async function updateLoop() {
        AsyncLoop(() => {
            sessionTime = aggregate + Date.now() - startTime;
            timediv[0].innerHTML = topline + GetStopwatchTime(sessionTime) + "</span>";
        }, () => !stopwatchPause);
        /* AsyncLoop(() => {
            hidediv[0].innerText = `Since: ${(sessionStart !== undefined) ? UNIXtoDate(sessionStart) : ""}`;
        }, () => !stopwatchPause,1000); */
    }
    async function ShowTab(){
        
        //on showing the tab:
        //retrieve chrome.storage.local this domain
        //if none exist, use 0 as aggregateTime, and create an entry for 0
        //if exists, take as aggregateTime
        //use aggregateTime + Date.now() - startTime as timer

        timediv[0].innerHTML = topline + "Loading...</span>";

        if (aggregateRecord) return;

        for(let i = 0; i < 30; i++){
            await new Promise((resolve) => {setTimeout(resolve,10)});
            if (!document.hasFocus()) return;
        }
        
        //abort showtab if window is no longer focused;

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
                sessionStart = Date.now();
                
                chrome.storage.local.set({[domain]: {time:0,start:sessionStart}}, () => {
                    if (chrome.runtime.lastError){
                        console.warn("local storage write error: ", chrome.runtime.lastError);
                    }
                });
            }
            else{
                aggregate = result[domain].time;
                sessionStart = result[domain].start;
                if (hidediv[0] !== undefined){
                    hidediv[0].innerText = `Since: ${UNIXtoDate(sessionStart)}`;
                }
                console.log("existing entry:",aggregate);
                console.log("sessionstart: ",sessionStart);
            }
            //console.log("aggregate: ", aggregate);
            console.log(`Show tab: latency ${Date.now() - startTime} ms`);
        });

        if (aggregate < saveAggregate){
            aggregate = saveAggregate;
            chrome.storage.local.set({[domain]:{time:aggregate, start:sessionStart}}, () =>{
                if (chrome.runtime.lastError){
                    console.warn("local storage write error: ", chrome.runtime.lastError);
                }
            });
        }

       // console.log("showing...");
        stopwatchPause = false;
        updateLoop();
        aggregateRecord = true;
        
        
    }

    async function HideTab(){
        if (!aggregateRecord) return;
        aggregateRecord = false;
        stopwatchPause = true;
        var proposalTime;
        proposalTime = sessionTime;
        chrome.storage.local.set({[domain]: {time:proposalTime,start:sessionStart}}, () => {
            if (chrome.runtime.lastError){
                console.warn("local storage write fail: ", chrome.runtime.lastError);
            }
                //console.log(`Hide tab latency: ${Date.now() - thisTimeTest} ms`);
        });
        /* let thisTimeTest = Date.now();
        chrome.storage.local.get([domain], (result) => {
            if (chrome.runtime.lastError){
                console.warn("local storage read error: ", chrome.runtime.lastError);
                proposalTime = sessionTime;

            }
            else if (Object.keys(result).length === 0){
                proposalTime = sessionTime;
                //if no such sessionTime exists?
                //nothing to worry about, make write
            }
            else if (result[domain] <= aggregate){
                proposalTime = sessionTime;
            }
            else{
                proposalTime = result[domain] + sessionTime - aggregate; 
            }
            //console.log(proposalTime);
            chrome.storage.local.set({[domain]: proposalTime}, () => {
                if (chrome.runtime.lastError){
                    console.warn("local storage write fail: ", chrome.runtime.lastError);
                }
                console.log(`Hide tab latency: ${Date.now() - thisTimeTest} ms`);
            });
        }); */
        
        //proposalTime = sessionTime;
        
        
        saveAggregate = sessionTime;

        
        //suppose somehow multiple time proposals are made before some semi-canonical time T
        //we can reasonably assume that any sessionTime write will finish 1 second at the latest from when it is called
        //given such circumstances we can assume that even if any time segment is buried/lost, the net effect is < 1 second
        //protocol:
        //at HideTab, get most recent proposal of sessionTime as T;
        //if aggregate < T:
        //  propose (sessionTime - aggregate + T)
        //otherwise propose (sessionTime)

    }

    async function InitWindowStopwatch(){
        const logo_url = GetFaviconUrl();
        startTime = Date.now();
        //make overall div
            var div = document.createElement("div");
            div.className = "expandedStopwatch";
            document.body.appendChild(div);
        
        //make time div 0 (session div)
            timediv[0] = document.createElement("div");
            timediv[0].style = "margin: 8pt 8pt 0pt 8pt;";
            div.appendChild(timediv[0]);

            hidediv[0] = document.createElement("div");
            hidediv[0].style = "margin: 0pt 8pt 0pt 8pt; font-size: 8pt;";
            hidediv[0].innerText = "Since: ";
            if (sessionStart !== undefined){
                hidediv[0].innerText += UNIXtoDate(sessionStart);
            }
            div.appendChild(hidediv[0]);

            MakeHiddenUntilHover(timediv[0],hidediv[0]);
            
        
        //add button to reset time for this domain
        //resetdiv
            var resetdiv = document.createElement("div");

            var resetbutton = document.createElement("button");
            resetbutton.onclick = async () =>{
                aggregate = 0;
                startTime = Date.now();
                sessionStart = startTime;
                if (hidediv[0]){
                    hidediv[0].innerText = `Since: ${UNIXtoDate(sessionStart)}`;
                }
                chrome.storage.local.set({[domain]: {time: 0, start:startTime}}, () => {
                    if (chrome.runtime.lastError){
                        console.warn("local storage write error: ", chrome.runtime.lastError);
                    }
                });
            };
            resetbutton.innerText = "Reset Session";
            resetbutton.className = "resetClick";

            resetdiv.appendChild(resetbutton);
            div.appendChild(resetdiv);
            
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
                    //timediv.style = "margin: 8pt 15pt 15pt 15pt";
                    innerbutton.innerText = "+";
                    resetbutton.className = "resetClickCollapse";

                }
                else if (innerbutton.dataset.collapse === "false"){
                    innerbutton.dataset.collapse = "true";
                    div.className = "expandedStopwatch";
                    //timediv.style = "margin: 8pt 8pt 0pt 8pt;";
                    innerbutton.innerText = "-";
                    resetbutton.className = "resetClick";
                }
                else{
                    console.error("button error: invalid 'collapse' data");
                }
            };
            div.appendChild(buttondiv);

        //
            topline = `
                <img src = ${logo_url} alt = ${"icon for " + domain} width = "16" height = "16" style= "display: inline-block; vertical-align: middle; margin: 0; padding: 0">
                <b>${domain}<br> Session: </b> <span>
            `;


            //updateLoop();
        

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


MakePort();
