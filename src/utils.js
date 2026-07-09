function ParseDomain(url){
    let i = 0;
    let l = url.length;
    
    //O(n)
    for(i = 0; i < l-2; i++){
        if(url[i] === ':' && url[i+1] === '/' && url[i+2] === '/'){
            break;
        }
    }
    if(i === l-2){
        throw new Error("url has no scheme?\n");
    }
    let domain_start = i+3;
    for(i = domain_start; i < l; i++){
    if (url[i] === '/' || url[i] === ':')
        break;
    }
    //domain_end is either the end of the URL or at index of first / or : after scheme
    let domain_end = i;
    let domain = url.substring(domain_start,domain_end);
    return domain;
}

//ts is straightup copied output
function GetFaviconUrl() {
    try {
        // Query all possible favicon link rel values
        const faviconEl = document.querySelector(
            'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
        );

        if (faviconEl && faviconEl.href) {
            return faviconEl.href;
        }

        // Fallback: assume default location
        return `${location.origin}/favicon.ico`;
    } catch (err) {
        console.error("Error getting favicon:", err);
        return null;
    }
}

function GetStopwatchTime(t){
    const timeDiff = t;
    const seconds = timeDiff % 60000;
    var second_str = String(seconds);
    if (second_str.length < 5){
        second_str = "0".repeat(5-second_str.length) + second_str;
    }
    second_str = second_str.slice(0,2) + "." + second_str.slice(2);

    const minutes = Math.floor(timeDiff/60000) % 60;
    var minute_str = String(minutes);
    if (minute_str.length < 2){
        minute_str = "0".repeat(2-minute_str.length) + minute_str;
    }

    const hours = Math.floor(timeDiff/3600000);
    var hour_str = String(hours);
    if (hour_str.length < 2){
        hour_str = "0".repeat(2-hour_str.length) + hour_str;
    }

    return `${hour_str}:${minute_str}:${second_str}`;
}


function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  const drag = document.getElementsByClassName("stopwatchDrag");
  if (drag.length == 0) return;

  drag[0].onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    //new right offset + new mouse x= old right offset + old mouse x - new mouse x ;
    //new left offset  = old left offset - old mouse offset +new mouse offset;
    //
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    var top_offset = elmnt.offsetTop - pos2;
    if (top_offset < 0) 
        top_offset = 0;
    if (top_offset > window.innerHeight - elmnt.offsetHeight) 
        top_offset = window.innerHeight - elmnt.offsetHeight;

    var right_str = elmnt.style.right;
    console.log(typeof right_str);
    var right_offset = Number(right_str.slice(0,(right_str.indexOf('p'))));
    right_offset += pos1;
    if (right_offset < 0) 
        right_offset = 0; 
    if (right_offset > window.innerWidth - elmnt.offsetWidth) 
        right_offset = window.innerWidth - elmnt.offsetWidth;
    
    //console.log(right_offset);
    elmnt.style.top = top_offset + "px";
    elmnt.style.right = right_offset + "px";
    /* console.log(elmnt.offsetLeft);
    console.log("group");
    console.log(left_offset); */

  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function MonitorTime(minute_time,time_name,policy){
    this.time = minute_time;
    this.name = time_name;
    this.policy = policy;
}