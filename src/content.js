async function send(message){
    chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Message failed:", chrome.runtime.lastError);
            return;
        }
    });
}



let currentURL = window.location.href;
console.log("try again");
const domain = ParseDomain(currentURL);
const create_message = {
    type: "FOCUS",
    time: Date.now(),
    domain: domain
}
send(create_message);/* .catch((error) => {
    console.error(`Error: ${error}`);
}); */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "injectionCheck") {
    sendResponse({ isInjected : true });
  }
});
window.addEventListener('blur', async () => {
    const message = {
        type: "BLUR",
        time: Date.now(),
        domain: domain
    }
    send(message);/* .catch((error) => {
        console.error(`Error: ${error}`);
    }); */
});

window.addEventListener('focus', async () => {
    const message = {
        type: "FOCUS",
        time: Date.now(),
        domain: domain
    }
    send(message);/* .catch((error) => {
        console.error(`Error: ${error}`);
    }); */
});





//alert(domain);
