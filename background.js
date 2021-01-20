const BROWSER_CHROME = "chrome";
const BROWSER_FIREFOX = "firefox";
const SERVICE_URL = "https://dscan.info/";

async function readClipboard(browser) {
    //chrome: won't let you read from the clipboard unless the page is active, and the page is never active as it is a background page.
    //fuck you google.
    if (browser === BROWSER_CHROME) {
        let promise = new Promise((res, rej) => {
            let input = document.createElement("input");
            document.body.appendChild(input);
            input.focus();
            document.execCommand("paste");
            let data = input.value;
            document.body.removeChild(input);
            res(data);
        });

        return await promise;
    }

    //firefox: just works.
    //thank you mozilla.
    if (browser === BROWSER_FIREFOX || browser === BROWSER_UNKNOWN) {
        let data = await navigator.clipboard.readText();
        return data;
    }
}

async function makeRequest(data) {
    let xhr = await fetch(SERVICE_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        body: `paste=${data}`
    });

    return xhr;
}

//valid data received in the format of: OK;<resulthere>
async function handleResponse(browserName, response) {
    let b = browserName === BROWSER_CHROME ? chrome : browser;
    let data = await response.text();
    if (data.indexOf("OK;") !== -1) {
        let result = data.replace(/OK;/g, "");
        await b.tabs.create({
            "active": true,
            "url": `${SERVICE_URL}/v/${result}`
        });
    }
    else {
        console.log(`Invalid data from dscan.info: '${data}'`);
    }
}

function listener(browserName) {
    return async () => {
        let data = await readClipboard(browserName);
        let escapedData = encodeURIComponent(data);
        let xhr = await makeRequest(escapedData);
        await handleResponse(browserName, xhr);
    };
}

function getBrowserName() {
    if (typeof(browser) !== "undefined") {
        return BROWSER_FIREFOX;
    }
    else if (typeof(chrome) !== "undefined") {
        return BROWSER_CHROME;
    }
    else {
        return null;
    }
}

let browserName = getBrowserName();
switch(browserName) {
case BROWSER_CHROME:
    chrome.browserAction.onClicked.addListener(listener(browserName));
    break;

//default to firefox action if they're using something else. if it doesn't work, fuck em.
case BROWSER_FIREFOX:
default:
    browser.browserAction.onClicked.addListener(listener(browserName));
    break;
}
