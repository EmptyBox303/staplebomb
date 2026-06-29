let currentURL = window.location.href;
const domain = ParseDomain(currentURL);
const create_message = {
    type: "FOCUS",
    time: Date.now(),
    domain: domain
}
chrome.runtime.sendMessage(create_message, (response) => {
    return;
}).catch(error => {
    console.error(`Error: ${error}`);
});

window.addEventListener('blur', () => {
    const message = {
        type: "BLUR",
        time: Date.now(),
        domain: domain
    }
    chrome.runtime.sendMessage(message, (response) => {
        return;
    }).catch(error => {
        console.error(`Error: ${error}`);
    });
});

window.addEventListener('focus', () => {
    const message = {
        type: "FOCUS",
        time: Date.now(),
        domain: domain
    }
    chrome.runtime.sendMessage(message, (response) => {
        return;
    }).catch(error => {
        console.error(`Error: ${error}`);
    });
});





//alert(domain);
