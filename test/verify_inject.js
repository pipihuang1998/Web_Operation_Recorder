const fs = require('fs');
const path = require('path');
// Setup Mock Environment
global.window = {};
global.document = {
    head: { appendChild: () => {} },
    documentElement: { appendChild: () => {} },
    createElement: () => ({ src: '' })
};
global.Request = function Request(input, init) {
    this.url = input;
    this.method = init ? init.method : 'GET';
};

// Mock PostMessage
let postedMessages = [];
global.window.postMessage = (msg) => {
    postedMessages.push(msg);
};

// Mock XMLHttpRequest
class MockXHR {
    constructor() {
        this.headers = {};
        this.listeners = {};
        this.status = 200;
        this.responseText = '{"mock": "response"}';
    }
    open(method, url) {
        this._method = method;
        this._url = url;
    }
    setRequestHeader(k, v) {
        this.headers[k] = v;
    }
    getResponseHeader(k) {
        if (k.toLowerCase() === 'content-type') return 'application/json';
        return '';
    }
    addEventListener(event, fn) {
        this.listeners[event] = fn;
    }
    send(body) {
        this._body = body;
        // Simulate load
        if (this.listeners['load']) {
            this.listeners['load'].call(this);
        }
    }
}
global.XMLHttpRequest = MockXHR;

// Mock Fetch
global.window.fetch = async (url, config) => {
    return {
        clone: () => ({
            headers: {
                get: (h) => (h === 'content-type' ? 'application/json' : '')
            },
            json: async () => ({ mock: "fetch_response" })
        }),
        status: 200
    };
};

// Load the inject script
// Since inject.js is an IIFE, we read it and eval it
const injectCode = fs.readFileSync(path.join(__dirname, '../src/inject.js'), 'utf8');
eval(injectCode);

async function runTests() {
    console.log("Running Interceptor Tests...");

    // Test XHR
    console.log("Testing XHR...");
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/test');
    xhr.send(JSON.stringify({foo: 'bar'}));

    // Check message
    const xhrMsg = postedMessages.find(m => m.payload && m.payload.url === '/api/test');
    if (!xhrMsg) throw new Error("XHR message not captured");
    if (xhrMsg.payload.method !== 'POST') throw new Error("XHR method wrong");
    if (xhrMsg.payload.resBody.mock !== 'response') throw new Error("XHR response body wrong");
    console.log("XHR Test Passed.");

    // Test Fetch
    console.log("Testing Fetch...");
    await window.fetch('/api/fetch', { method: 'PUT', body: '{"a":1}' });

    // Allow promise microtasks to run
    await new Promise(resolve => setTimeout(resolve, 10));

    const fetchMsg = postedMessages.find(m => m.payload && m.payload.url === '/api/fetch');
    if (!fetchMsg) throw new Error("Fetch message not captured");
    if (fetchMsg.payload.method !== 'PUT') throw new Error("Fetch method wrong");
    if (fetchMsg.payload.resBody.mock !== 'fetch_response') throw new Error("Fetch response body wrong");
    console.log("Fetch Test Passed.");
}

runTests().catch(err => {
    console.error("FAILED:", err);
    process.exit(1);
});
