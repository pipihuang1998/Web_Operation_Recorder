// --- State ---
let state = {
  isRecording: false,
  logs: [],
  sessionID: null,
  testCase: null,
  sidebarVisible: false,
  startTime: 0,
  config: { urlWhitelist: [] }
};

// --- DOM Injection of Interceptor ---
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(script);

// --- UI Construction ---
const shadowHost = document.createElement('div');
shadowHost.id = 'recorder-sidebar-host';
const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

const style = document.createElement('style');
style.textContent = `
  :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .sidebar {
    position: fixed; top: 0; right: 0; width: 400px; height: 100vh;
    background: #f8f9fa; border-left: 1px solid #ccc; z-index: 2147483647;
    display: none; flex-direction: column;
    box-shadow: -2px 0 5px rgba(0,0,0,0.1);
    box-sizing: border-box;
  }
  .sidebar.visible { display: flex; }
  .header { padding: 15px; background: #343a40; color: #fff; display: flex; justify-content: space-between; align-items: center; }
  .content { flex: 1; overflow-y: auto; padding: 15px; }
  .footer { padding: 15px; background: #e9ecef; border-top: 1px solid #ddd; display: flex; flex-wrap: wrap; gap: 5px; justify-content: flex-end;}
  .btn { padding: 8px 12px; cursor: pointer; border: none; border-radius: 4px; color: white; font-weight: bold; font-size: 14px;}
  .btn-sm { padding: 4px 8px; font-size: 12px; margin-left: 5px;}
  .btn-primary { background: #007bff; }
  .btn-primary:hover { background: #0056b3; }
  .btn-danger { background: #dc3545; }
  .btn-danger:hover { background: #a71d2a; }
  .btn-success { background: #28a745; }
  .btn-success:hover { background: #1e7e34; }
  .btn-secondary { background: #6c757d; }
  .btn-link { background: none; color: #007bff; padding: 0; font-size: 12px; text-decoration: underline; }

  .log-item { position: relative; margin-bottom: 8px; padding: 8px; border-radius: 4px; font-size: 12px; word-break: break-all; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
  .log-delete { position: absolute; top: 2px; right: 2px; cursor: pointer; color: #aaa; font-weight: bold; font-size: 14px; padding: 0 4px; display: none; }
  .log-item:hover .log-delete { display: block; }
  .log-delete:hover { color: #dc3545; }
  .log-action { background: #fff; border-left: 4px solid #6c757d; }
  .log-network { background: #e3f2fd; border-left: 4px solid #17a2b8; }
  .log-timestamp { color: #888; font-size: 10px; display: block; margin-bottom: 2px; }
  .log-title { font-weight: bold; color: #333; }

  .case-card { background: #fff; padding: 10px; border: 1px solid #ddd; margin-bottom: 10px; cursor: pointer; border-radius: 4px; transition: 0.2s; }
  .case-card:hover { background: #f1f1f1; border-color: #aaa; }
  .case-card.selected { border-color: #007bff; background: #e7f1ff; }

  .hidden { display: none !important; }
  h3 { margin-top: 0; }
  textarea { width: 100%; box-sizing: border-box; margin-top: 10px; border: 1px solid #ccc; padding: 5px; border-radius: 4px; }
  .config-item { border: 1px solid #eee; padding: 5px; margin-bottom: 5px; border-radius: 3px; background: #fff; }
  .config-row { display: flex; gap: 5px; margin-bottom: 5px; }
  .config-row input { flex: 1; padding: 4px; border: 1px solid #ccc; border-radius: 3px; }

  /* Review View Styles */
  .review-item { display: flex; gap: 10px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee; align-items: flex-start; }
  .review-item input[type="checkbox"] { margin-top: 5px; }
  .review-item .review-details { flex: 1; }
  .review-item textarea { width: 100%; font-size: 12px; padding: 4px; margin-top: 2px; height: 40px;}
  .review-item .review-meta { font-size: 10px; color: #888; margin-bottom: 2px; }

  .output-box { background: #f1f1f1; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 11px; white-space: pre-wrap; word-break: break-all; max-height: 200px; overflow-y: auto; margin-top: 10px; border: 1px solid #ccc; }
`;
shadowRoot.appendChild(style);

const container = document.createElement('div');
container.className = 'sidebar';
container.innerHTML = `
  <div class="header">
    <span style="font-size: 16px; font-weight: bold;">Test Recorder</span>
    <div>
        <button id="settingsBtn" style="background:none;border:none;color:white;cursor:pointer;font-size:14px;margin-right:10px;">Settings</button>
        <button id="closeBtn" style="background:none;border:none;color:white;cursor:pointer;font-size:20px;">&times;</button>
    </div>
  </div>

  <div class="content" id="mainContent">

    <!-- View 0: Configuration -->
    <div id="configView" class="hidden">
        <h3>Configuration</h3>
        <p style="font-size:12px; color:#666;">Define URL whitelists and aliases. Only matching URLs will be captured.</p>
        <div id="configList"></div>
        <button id="addConfigBtn" class="btn btn-secondary btn-sm" style="margin-top:5px;">+ Add Item</button>
        <div style="margin-top: 20px; text-align: right;">
             <button id="saveConfigBtn" class="btn btn-primary">Save & Back</button>
        </div>
    </div>

    <!-- View 1: Setup -->
    <div id="setupView">
       <h3>Select Test Case</h3>
       <div id="caseList">Loading cases...</div>
    </div>

    <!-- View 2: Recording -->
    <div id="recordingView" class="hidden">
       <div id="caseInfoDisplay" style="padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 4px; margin-bottom:10px;"></div>
       <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Event Log:</div>
       <div id="logContainer"></div>
    </div>

    <!-- View 3: Review/Pass -->
    <div id="reviewView" class="hidden">
        <h3>Review & Edit</h3>
        <p style="font-size:12px; color:#666;">Verify logs, edit descriptions, and select items to report.</p>
        <div id="reviewList"></div>
    </div>

    <!-- View 4: Result -->
    <div id="resultView" class="hidden">
       <h3>Submission Output</h3>
       <div id="outputSection">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
              <span style="font-weight: bold;">JSON Result</span>
              <button id="copyBtn" class="btn btn-secondary btn-sm">Copy to Clipboard</button>
          </div>
          <div id="outputBox" class="output-box"></div>
          <p style="font-size:10px; color:#28a745; margin-top:5px; visibility: hidden;" id="copySuccessMsg">✓ Copied to clipboard</p>

          <div style="margin-top: 10px;">
              <button id="cleanBtn" class="btn btn-primary btn-sm" style="width:100%">Data Cleaning</button>
          </div>

          <div id="cleanOutputSection" class="hidden" style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                  <span style="font-weight: bold;">Cleaned Result</span>
                  <button id="copyCleanBtn" class="btn btn-secondary btn-sm">Copy Cleaned Data</button>
              </div>
              <div id="cleanOutputBox" class="output-box"></div>
              <p style="font-size:10px; color:#28a745; margin-top:5px; visibility: hidden;" id="copyCleanSuccessMsg">✓ Copied to clipboard</p>
          </div>
       </div>
    </div>

  </div>

  <div class="footer">
     <button id="recordBtn" class="btn btn-primary hidden">Start Recording</button>
     <button id="stopBtn" class="btn btn-secondary hidden">Stop</button>

     <!-- Review View Buttons -->
     <button id="reportPassBtn" class="btn btn-success hidden">Report Pass Case</button>
     <button id="reportBugBtn" class="btn btn-danger hidden">Report Bug</button>

     <button id="resetBtn" class="btn btn-secondary hidden">Reset</button>
  </div>
`;
shadowRoot.appendChild(container);
document.body.appendChild(shadowHost);

// --- Elements ---
const configView = shadowRoot.getElementById('configView');
const setupView = shadowRoot.getElementById('setupView');
const recordingView = shadowRoot.getElementById('recordingView');
const reviewView = shadowRoot.getElementById('reviewView');
const resultView = shadowRoot.getElementById('resultView');

const mainContent = shadowRoot.getElementById('mainContent');
const caseList = shadowRoot.getElementById('caseList');
const logContainer = shadowRoot.getElementById('logContainer');
const reviewList = shadowRoot.getElementById('reviewList');
const caseInfoDisplay = shadowRoot.getElementById('caseInfoDisplay');
const outputBox = shadowRoot.getElementById('outputBox');
const copyBtn = shadowRoot.getElementById('copyBtn');
const copySuccessMsg = shadowRoot.getElementById('copySuccessMsg');
const cleanBtn = shadowRoot.getElementById('cleanBtn');
const cleanOutputSection = shadowRoot.getElementById('cleanOutputSection');
const cleanOutputBox = shadowRoot.getElementById('cleanOutputBox');
const copyCleanBtn = shadowRoot.getElementById('copyCleanBtn');
const copyCleanSuccessMsg = shadowRoot.getElementById('copyCleanSuccessMsg');
const configList = shadowRoot.getElementById('configList');

const settingsBtn = shadowRoot.getElementById('settingsBtn');
const addConfigBtn = shadowRoot.getElementById('addConfigBtn');
const saveConfigBtn = shadowRoot.getElementById('saveConfigBtn');

const recordBtn = shadowRoot.getElementById('recordBtn');
const stopBtn = shadowRoot.getElementById('stopBtn');
const reportPassBtn = shadowRoot.getElementById('reportPassBtn');
const reportBugBtn = shadowRoot.getElementById('reportBugBtn');
const resetBtn = shadowRoot.getElementById('resetBtn');
const closeBtn = shadowRoot.getElementById('closeBtn');

// --- Mock Data ---
const MOCK_CASES = [
  { id: "TC-202501", title: "User Login", desc: "1. Click Login Button\n2. Enter 'admin'\n3. Verify Success" },
  { id: "TC-202502", title: "Add to Cart", desc: "1. Select Item\n2. Click Add to Cart\n3. Verify Cart Count" },
  { id: "TC-202503", title: "Search Item", desc: "1. Enter 'iPhone'\n2. Click Search\n3. Verify Results" }
];

// --- Helpers ---
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getFingerprint(el) {
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const selectors = {
        css: el.className ? '.' + el.className.split(' ').join('.') : el.tagName.toLowerCase(),
        fullPath: getFullPath(el)
    };

    return {
        tagName: el.tagName,
        id: el.id || null,
        className: el.className || null,
        name: el.name || null,
        type: el.type || null,
        innerText: el.innerText ? el.innerText.substring(0, 50) : null,
        placeholder: el.placeholder || null,
        ariaLabel: el.ariaLabel || null,
        title: el.title || null,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
        selectors: selectors
    };
}

function getFullPath(el) {
    if (!el) return;
    const path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.nodeName.toLowerCase();
        if (el.id) {
            selector += '#' + el.id;
            path.unshift(selector);
            break;
        } else {
            let sib = el, nth = 1;
            while (sib = sib.previousElementSibling) {
                if (sib.nodeName.toLowerCase() == selector)
                   nth++;
            }
            if (nth != 1)
                selector += ":nth-of-type("+nth+")";
        }
        path.unshift(selector);
        el = el.parentNode;
    }
    return path.join(" > ");
}

function addLog(type, title, details) {
    if (!state.isRecording) return;

    const timestamp = Date.now() - state.startTime;
    const id = generateUUID();
    const logData = {
        id: id,
        sequence: state.logs.length + 1,
        type: type, // ACTION or NETWORK
        title: title, // Store title for editing later
        timestamp: timestamp,
        ...details
    };
    state.logs.push(logData);

    const div = document.createElement('div');
    div.className = `log-item log-${type.toLowerCase()}`;
    div.dataset.id = id;

    // Use DOM methods to avoid XSS
    const delBtn = document.createElement('div');
    delBtn.className = 'log-delete';
    delBtn.title = 'Delete Log';
    delBtn.textContent = '×';
    delBtn.onclick = (e) => { e.stopPropagation(); removeLog(id, div); };

    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-timestamp';
    timeSpan.textContent = `${timestamp}ms`;

    const titleDiv = document.createElement('div');
    titleDiv.className = 'log-title';
    titleDiv.textContent = `[${type}] ${title}`;

    div.appendChild(delBtn);
    div.appendChild(timeSpan);
    div.appendChild(titleDiv);

    logContainer.appendChild(div);

    // Auto-scroll to bottom of the main content area
    // setTimeout to allow rendering
    setTimeout(() => {
        mainContent.scrollTop = mainContent.scrollHeight;
    }, 10);
}

function removeLog(id, element) {
    state.logs = state.logs.filter(l => l.id !== id);
    element.remove();
}

// --- Config Logic ---

function loadConfig(callback) {
    chrome.storage.local.get(['urlWhitelist'], (result) => {
        if (result.urlWhitelist) {
            state.config.urlWhitelist = result.urlWhitelist;
        } else {
             state.config.urlWhitelist = [];
        }
        renderConfig();
        if (callback) callback();
    });
}

function saveConfig() {
    const items = [];
    configList.querySelectorAll('.config-item').forEach(div => {
        const alias = div.querySelector('.inp-alias').value.trim();
        const prefix = div.querySelector('.inp-prefix').value.trim();
        const filterGateway = div.querySelector('.inp-filter-gateway').checked;
        if (alias && prefix) {
            items.push({ alias, prefix, filterGateway });
        }
    });
    state.config.urlWhitelist = items;
    chrome.storage.local.set({ urlWhitelist: items }, () => {
        alert("Configuration saved.");
        toggleConfig(false);
    });
}

function renderConfig() {
    configList.innerHTML = '';
    state.config.urlWhitelist.forEach(item => addConfigItem(item.alias, item.prefix, item.filterGateway));
}

function addConfigItem(alias = '', prefix = '', filterGateway = false) {
    const div = document.createElement('div');
    div.className = 'config-item';

    const row1 = document.createElement('div');
    row1.className = 'config-row';

    const inpAlias = document.createElement('input');
    inpAlias.type = 'text';
    inpAlias.className = 'inp-alias';
    inpAlias.placeholder = 'Alias (e.g. system)';
    inpAlias.value = alias;

    const btnDel = document.createElement('button');
    btnDel.className = 'btn btn-danger btn-sm del-cfg';
    btnDel.textContent = '×';
    btnDel.onclick = () => div.remove();

    row1.appendChild(inpAlias);
    row1.appendChild(btnDel);

    const row2 = document.createElement('div');
    row2.className = 'config-row';

    const inpPrefix = document.createElement('input');
    inpPrefix.type = 'text';
    inpPrefix.className = 'inp-prefix';
    inpPrefix.placeholder = 'URL Prefix (e.g. https://...)';
    inpPrefix.value = prefix;

    row2.appendChild(inpPrefix);

    const row3 = document.createElement('div');
    row3.className = 'config-row';
    row3.style.alignItems = 'center';

    const lblFilter = document.createElement('label');
    lblFilter.style.fontSize = '12px';
    lblFilter.style.display = 'flex';
    lblFilter.style.alignItems = 'center';

    const chkFilter = document.createElement('input');
    chkFilter.type = 'checkbox';
    chkFilter.className = 'inp-filter-gateway';
    chkFilter.style.marginRight = '5px';
    chkFilter.style.flex = 'none'; // Prevent input from stretching
    chkFilter.checked = filterGateway;

    lblFilter.appendChild(chkFilter);
    lblFilter.appendChild(document.createTextNode('【自动过滤网关】'));

    row3.appendChild(lblFilter);

    div.appendChild(row1);
    div.appendChild(row2);
    div.appendChild(row3);

    configList.appendChild(div);
}

function toggleConfig(show) {
    if (show) {
        setupView.classList.add('hidden');
        recordingView.classList.add('hidden');
        resultView.classList.add('hidden');
        reviewView.classList.add('hidden');
        configView.classList.remove('hidden');
    } else {
        configView.classList.add('hidden');
        if (state.isRecording) {
            recordingView.classList.remove('hidden');
        } else if (state.testCase) {
             setupView.classList.remove('hidden');
        } else {
            setupView.classList.remove('hidden');
        }
    }
}


// --- UI Logic ---

function renderCases() {
    caseList.innerHTML = '';
    MOCK_CASES.forEach(c => {
        const div = document.createElement('div');
        div.className = 'case-card';
        div.innerHTML = `<strong>${c.id}: ${c.title}</strong><br><small>${c.desc.replace(/\n/g, '<br>')}</small>`;
        div.onclick = () => selectCase(c, div);
        caseList.appendChild(div);
    });
}

function selectCase(c, el) {
    state.testCase = c;
    const cards = shadowRoot.querySelectorAll('.case-card');
    cards.forEach(card => card.classList.remove('selected'));
    el.classList.add('selected');

    recordBtn.classList.remove('hidden');
}

function startRecording() {
    loadConfig(() => {
        state.isRecording = true;
        state.logs = [];
        state.sessionID = generateUUID();
        state.startTime = Date.now();

        logContainer.innerHTML = '';
        setupView.classList.add('hidden');
        recordingView.classList.remove('hidden');
        resultView.classList.add('hidden');
        reviewView.classList.add('hidden');

        recordBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');

        caseInfoDisplay.innerHTML = `<strong>${state.testCase.title}</strong><br><small>${state.testCase.desc}</small>`;
    });
}

function stopRecording() {
    state.isRecording = false;
    recordingView.classList.add('hidden');

    // Go directly to Review View
    openReview();

    stopBtn.classList.add('hidden');
}

function openReview() {
    recordingView.classList.add('hidden');
    resultView.classList.add('hidden');
    reviewView.classList.remove('hidden');

    reportPassBtn.classList.remove('hidden');
    reportBugBtn.classList.remove('hidden');

    renderReviewList();
}

function renderReviewList() {
    reviewList.innerHTML = '';
    state.logs.forEach((log, index) => {
        const div = document.createElement('div');
        div.className = 'review-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.dataset.id = log.id;

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'review-details';

        const meta = document.createElement('div');
        meta.className = 'review-meta';
        meta.textContent = `#${index+1} [${log.type}] ${new Date(log.timestamp + state.startTime).toLocaleTimeString()}`;

        const textarea = document.createElement('textarea');
        textarea.value = log.title || ''; // Allow editing the title/desc

        detailsDiv.appendChild(meta);
        detailsDiv.appendChild(textarea);

        div.appendChild(checkbox);
        div.appendChild(detailsDiv);

        reviewList.appendChild(div);
    });
}

function gatherLogs() {
    const finalLogs = [];
    const items = reviewList.querySelectorAll('.review-item');
    let sequence = 1;

    items.forEach(item => {
        const cb = item.querySelector('input[type="checkbox"]');
        const txt = item.querySelector('textarea');

        if (cb && cb.checked) {
            const logId = cb.dataset.id;
            const originalLog = state.logs.find(l => l.id === logId);
            if (originalLog) {
                const { id, url, ...rest } = originalLog;
                finalLogs.push({
                    ...rest,
                    title: txt.value,
                    sequence: sequence++
                });
            }
        }
    });
    return finalLogs;
}

function reportPass() {
    const logs = gatherLogs();
    // #todo: send request to PASS API
    submit("PASS", { customLogs: logs });
}

function reportBug() {
    const logs = gatherLogs();
    const defectInfo = prompt("Please enter defect description:");
    if (defectInfo === null) return; // User cancelled

    // #todo: send request to FAIL API
    submit("FAIL", { customLogs: logs, defectInfo: defectInfo });
}

function submit(result, details = {}) {
    let logsToSubmit = details.customLogs;

    // Fallback if not coming from Review
    if (!logsToSubmit) {
         logsToSubmit = state.logs.map((log, index) => {
            const { id, url, ...rest } = log;
            return { ...rest, sequence: index + 1 };
        });
    }

    const finalData = {
        meta: {
            caseId: state.testCase ? state.testCase.id : "UNKNOWN",
            sessionID: state.sessionID,
            result: result,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            systems: state.config.urlWhitelist
        },
        timeline: logsToSubmit,
        defectInfo: details.defectInfo || null,
        screenshot: details.screenshot || null
    };

    const jsonOutput = JSON.stringify(finalData, null, 2);
    console.log("---------------- SUBMISSION ----------------");
    console.log(jsonOutput);

    // Copy to clipboard
    navigator.clipboard.writeText(jsonOutput).then(() => {
        showOutput(jsonOutput);
    }).catch(err => {
        console.error("Clipboard write failed:", err);
        showOutput(jsonOutput);
        alert("Clipboard copy failed. Please copy manually from the box.");
    });
}

function showOutput(json) {
    reviewView.classList.add('hidden');
    resultView.classList.remove('hidden');

    outputBox.textContent = json;

    // Hide buttons
    reportPassBtn.classList.add('hidden');
    reportBugBtn.classList.add('hidden');
    resetBtn.classList.remove('hidden');

    // Reset copy success message
    copySuccessMsg.style.visibility = 'hidden';
    copyCleanSuccessMsg.style.visibility = 'hidden';
    cleanOutputSection.classList.add('hidden');
    cleanOutputBox.textContent = '';
}

function cleanData() {
    try {
        const rawJson = outputBox.textContent;
        if (!rawJson) {
            alert("No data to clean.");
            return;
        }
        const parsedData = JSON.parse(rawJson);
        const payload = { optJson: parsedData };

        fetch('http://citc-dev.taas.huawei.com/citc/testCaseAutomation/data_process/optTraceJson/compressed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            cleanOutputSection.classList.remove('hidden');
            cleanOutputBox.textContent = JSON.stringify(data, null, 2);
            // Auto scroll to the result
             setTimeout(() => {
                cleanOutputSection.scrollIntoView({ behavior: "smooth" });
            }, 100);
        })
        .catch(error => {
            console.error('Error cleaning data:', error);
            alert("Failed to clean data: " + error.message);
        });

    } catch (e) {
        console.error('Invalid JSON:', e);
        alert("Failed to parse existing data for cleaning.");
    }
}

function copyCleanedData() {
    const text = cleanOutputBox.textContent;
    navigator.clipboard.writeText(text).then(() => {
        copyCleanSuccessMsg.style.visibility = 'visible';
        setTimeout(() => {
             copyCleanSuccessMsg.style.visibility = 'hidden';
        }, 3000);
    });
}

function copyToClipboard() {
    const text = outputBox.textContent;
    navigator.clipboard.writeText(text).then(() => {
        copySuccessMsg.style.visibility = 'visible';
        setTimeout(() => {
             copySuccessMsg.style.visibility = 'hidden';
        }, 3000);
    });
}

function resetUI() {
    const currentConfig = state.config;
    state = {
        isRecording: false,
        logs: [],
        sessionID: null,
        testCase: null,
        sidebarVisible: true,
        startTime: 0,
        config: currentConfig
    };

    resultView.classList.add('hidden');
    setupView.classList.remove('hidden');
    configView.classList.add('hidden');
    reviewView.classList.add('hidden');

    reportPassBtn.classList.add('hidden');
    reportBugBtn.classList.add('hidden');
    resetBtn.classList.add('hidden');

    renderCases();
}

// --- Event Handlers ---

recordBtn.onclick = startRecording;
stopBtn.onclick = stopRecording;
closeBtn.onclick = () => { container.classList.remove('visible'); state.sidebarVisible = false; };
resetBtn.onclick = resetUI;

settingsBtn.onclick = () => {
    loadConfig();
    toggleConfig(true);
};
addConfigBtn.onclick = () => addConfigItem();
saveConfigBtn.onclick = saveConfig;

reportPassBtn.onclick = reportPass;
reportBugBtn.onclick = reportBug;

copyBtn.onclick = copyToClipboard;
cleanBtn.onclick = cleanData;
copyCleanBtn.onclick = copyCleanedData;

// --- Listeners for Actions ---

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "TOGGLE_SIDEBAR") {
        state.sidebarVisible = !state.sidebarVisible;
        if (state.sidebarVisible) {
            container.classList.add('visible');
            renderCases();
        } else {
            container.classList.remove('visible');
        }
    }
});

// Network Interceptor
window.addEventListener('message', (event) => {
    if (event.data.source === 'RECORDER_INJECT' && event.data.payload) {
        if (!state.isRecording) return;
        const p = event.data.payload;
        if (p.type === 'NETWORK') {

            // Logic: Longest Prefix Match
            let match = null;
            if (state.config.urlWhitelist && state.config.urlWhitelist.length > 0) {
                 // Sort by length desc
                 const sortedConfig = [...state.config.urlWhitelist].sort((a, b) => b.prefix.length - a.prefix.length);

                 for (const item of sortedConfig) {
                    if (p.url.startsWith(item.prefix)) {
                        let path = p.url.substring(item.prefix.length);
                        if (item.filterGateway) {
                             const colonIndex = path.indexOf(':');
                             if (colonIndex !== -1) {
                                 path = path.substring(colonIndex + 1);
                             }
                        }
                        match = { alias: item.alias, path: path };
                        break;
                    }
                 }
                 if (!match) return;
            } else {
                 return;
            }

            const title = `[${match.alias}] ${match.path}`;

            addLog('NETWORK', `${p.method} ${title} (${p.status})`, {
                method: p.method,
                systemAlias: match.alias,
                path: match.path,
                url: p.url,
                reqBody: p.reqBody,
                resBody: p.resBody
            });
        }
    }
});

// DOM Observer
document.addEventListener('click', (e) => {
    if (!state.isRecording) return;
    if (shadowHost.contains(e.target)) return;

    const fingerprint = getFingerprint(e.target);

    const originalOutline = e.target.style.outline;
    e.target.style.outline = "2px solid red";
    setTimeout(() => {
        e.target.style.outline = originalOutline;
    }, 500);

    addLog('ACTION', `click "${fingerprint.innerText || fingerprint.tagName}"`, {
        actionType: 'click',
        target: fingerprint
    });
}, true);

document.addEventListener('change', (e) => {
    if (!state.isRecording) return;
    if (shadowHost.contains(e.target)) return;

    const fingerprint = getFingerprint(e.target);
    addLog('ACTION', `change "${fingerprint.tagName}" value: ${e.target.value}`, {
        actionType: 'change',
        value: e.target.value,
        target: fingerprint
    });
}, true);
