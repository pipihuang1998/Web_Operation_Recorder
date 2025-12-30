(function() {
  const XHR = XMLHttpRequest.prototype;
  const originalOpen = XHR.open;
  const originalSend = XHR.send;
  const originalFetch = window.fetch;

  function notify(data) {
    window.postMessage({ source: 'RECORDER_INJECT', payload: data }, '*');
  }

  function parseJSON(str) {
      try { return JSON.parse(str); } catch(e) { return str; }
  }

  // Hook XHR
  XHR.open = function(method, url) {
    this._method = method;
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  XHR.send = function(body) {
    const xhr = this;
    const startTime = Date.now();

    this.addEventListener('load', function() {
        const contentType = this.getResponseHeader('content-type') || '';
        if (contentType.includes('application/json')) {
             notify({
                type: 'NETWORK',
                timestamp: startTime,
                method: xhr._method,
                url: xhr._url,
                reqBody: body,
                resBody: parseJSON(this.responseText),
                status: this.status
            });
        }
    });

    return originalSend.apply(this, arguments);
  };

  // Hook Fetch
  window.fetch = async function(...args) {
    const startTime = Date.now();
    let [resource, config] = args;

    let method = 'GET';
    let url = resource;
    let body = null;

    if (resource instanceof Request) {
        method = resource.method;
        url = resource.url;
        // Body reading from Request object is async and consumes it, tricky.
        // We might skip body for Request objects for simplicity or try to clone.
    } else {
        method = config?.method || 'GET';
        body = config?.body;
    }

    const response = await originalFetch.apply(this, args);

    const clone = response.clone();
    const contentType = clone.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        clone.json().then(data => {
            notify({
                type: 'NETWORK',
                timestamp: startTime,
                method: method,
                url: url,
                reqBody: body,
                resBody: data,
                status: response.status
            });
        }).catch(err => {
             // Ignore non-json
        });
    }

    return response;
  };

  console.log("Recorder: Network interceptor initialized.");
})();
