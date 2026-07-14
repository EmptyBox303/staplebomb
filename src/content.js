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

function MakeHiddenUntilHover(divToHover,divToHide,disp = 'block'){
    divToHide.style.display = 'none';
    divToHover.addEventListener('mouseenter',() => {
        let s = divToHover.parentElement.className;
        if (s.startsWith("collapsed")){
            divToHide.style.display = 'none';
        }
        else{
            divToHide.style.display = disp;
        }
        
    });

    divToHover.addEventListener('mouseleave',() => {
        divToHide.style.display = 'none';
    });
}



async function MakePort(){
    const currentURL = window.location.href;
    
    const PrecisionPolicies = Object.freeze({
        FLOATING: new Instr(1,"float"),
        SECOND: new Instr(1e3,"second"),
        MINUTE: new Instr(6e4,"minute"),
        HOUR: new Instr(36e5,"hour"),
        DAY: new Instr(864e5,"day")
    });

    const trackingModes = [
        new MonitorTime(15,"15 minutes",PrecisionPolicies.FLOATING),
        new MonitorTime(30,"half hour",PrecisionPolicies.FLOATING),
        new MonitorTime(60,"hour",PrecisionPolicies.FLOATING),
        new MonitorTime(120,"2 hours",PrecisionPolicies.MINUTE),
        new MonitorTime(360,"6 hours",PrecisionPolicies.MINUTE),
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
    var selectTrack;
    var selectTimer;
    var selectHide;
    var selectInner;
    var selectChoice = null;
    var selectRequireInit = false;

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
            //selectTrack.className = "";
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
        if(selectRequireInit){
            SelectTimeLoop();
        }
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
        
        
        saveAggregate = sessionTime;

    }

    async function SelectTimeLoop(){
        const choice = selectChoice;
        if (choice === null){
            selectTimer.innerText = "";
        }
        selectTimer.innerText = `Loading...`;

        const dbload = choice.policy.name;
        const isFloat = (dbload === "float");
        const loopInterval = (isFloat) ? 1000 : choice.policy.unit;


        while(selectChoice === choice){

            //do a bunch of stuff and set selectTimer, etc
            
            const message = {
                choice: choice,
                domain: domain
            };
            send(message,port,currentURL);

            await new Promise ((resolve) => setTimeout(resolve,loopInterval));

            if (!document.hasFocus()){
                selectRequireInit = true;
                break;
            }
        }
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
            
            var resetline = document.createElement("hr");
            resetline.style.position = "relative";
            resetline.style.top = "1pt";
            resetline.style.border = "0.5px solid";
            resetline.style.margin = "8pt 4pt 8pt 4pt";
            resetdiv.appendChild(resetline);
            div.appendChild(resetdiv);

            var selectdiv = document.createElement("div");

            var selectspan = document.createElement("span");
            selectspan.style.marginLeft = "8pt";
            selectspan.style.verticalAlign = "center";
            
            selectdiv.appendChild(selectspan);
            selectspan.innerText = "Track usage across the last";

            selectTrack = document.createElement("select");
            
            selectdiv.appendChild(selectTrack);
            selectdiv.style.display = "inline";

            selectTrack.id = "selectTrack";
            
            selectTrack.required = true;
            /* font-size: 10pt; */

            selectTimer = document.createElement("span");
            selectdiv.appendChild(selectTimer);
            selectTimer.innerText = "";
            selectTimer.style = `
                margin-left: 8pt;
            `;

            selectHide = document.createElement("span");
            MakeHiddenUntilHover(selectTimer,selectHide,'inline');
            selectdiv.appendChild(selectHide);

            selectBar = document.createElement("div");
            selectBar.style = `
                margin:auto;
                margin-top: 4pt;
                background-color: rgba(230, 230, 230, 1);
                z-axis: 1000008;
                width: 90%;
                text-align: center;
                box-sizing: border-box;
                height: 0pt;
            `;

            selectdiv.appendChild(selectBar);

            selectInner = document.createElement("div");
            selectBar.appendChild(selectInner);
            selectInner.style = `
                position:relative;
                height: 100%;
                width: 0%;
                left: 0px;
                top: 0px;
                background-color: rgba(37, 150, 190, 1);
                z-axis: 1000009;
            `

            div.appendChild(selectdiv);
            
            let defop = document.createElement("option");
            defop.innerText = "Choose time...";
            defop.hidden = true;
            defop.disabled = true;
            defop.defaultSelected = true;
            selectTrack.appendChild(defop);
            trackingModes.forEach((trackMode) => {
                let choice = document.createElement("option");
                console.log(trackMode);
                choice.value = JSON.stringify(trackMode);
                choice.innerText = trackMode.name;
                selectTrack.appendChild(choice);
            });
            
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
                    selectdiv.style.display = "none";
                    //console.log(selectdiv.style.display);

                }
                else if (innerbutton.dataset.collapse === "false"){
                    innerbutton.dataset.collapse = "true";
                    div.className = "expandedStopwatch";
                    //timediv.style = "margin: 8pt 8pt 0pt 8pt;";
                    innerbutton.innerText = "-";
                    resetbutton.className = "resetClick";
                    selectdiv.style.display = "inline";

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
        //add detection to selectTrack
        //once a choice has been made
        //update choice
        //run database collect happens either
        //at showTab(after choice is made)
        //or right after the change
        selectTrack.addEventListener('change', async () => {
            selectTimer.innerText = "hi";
            selectChoice = JSON.parse(selectTrack.value);
            SelectTimeLoop();
        });
        

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
    
    port.onMessage.addListener((message) => {
        //console.log(message);
        //reply contains information about a certain request
        //we need to make sure the info received is valid 
        //the request should be formatted as following:
        //info: {whatever the fuck info it is}
        //choice: {choice}
        //verify choice against select

        const choice = message.choice;
        //console.log(choice);
        if (choice.time != selectChoice.time){
            console.log("difference");
        }

        //const total = message.total;
        const interval = choice.time*60000;
        selectTimer.innerText = GetStopwatchTime(message.total).slice(0,-4);
        selectHide.innerText = " since " + UNIXtoDate(Date.now() - interval);
        selectBar.style.height = "12pt";
        const percent = 100 * message.total / interval;
        selectInner.style.width = `${percent}%`;
        selectInner.innerText = `${Math.round(100 * percent)/100}%`;
        //TODO: here
        
    })

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

        if (db_conn !== undefined){
            db_conn.close();
            db_conn = undefined;
            db = undefined;
        }
        
    });


    
}


MakePort();
