const fs = require('fs');
const path = require('path');

const contentJsPath = path.join(__dirname, '../src/content.js');
const content = fs.readFileSync(contentJsPath, 'utf8');

function check(condition, message) {
    if (condition) {
        console.log(`[PASS] ${message}`);
    } else {
        console.error(`[FAIL] ${message}`);
        process.exit(1);
    }
}

console.log("Verifying content.js changes...");

// 1. Check State Init
const stateRegex = /config:\s*{\s*urlWhitelist:\s*\[\],\s*username:\s*'',\s*productCode:\s*''\s*}/;
check(stateRegex.test(content), "State initialization includes username and productCode");

// 2. Check HTML inputs
check(content.includes('id="cfgProductCode"'), "HTML includes cfgProductCode input");
check(content.includes('id="cfgUsername"'), "HTML includes cfgUsername input");

// 3. Check HTML buttons
check(content.includes('id="selectAllBtn"'), "HTML includes selectAllBtn");
check(content.includes('id="deselectAllBtn"'), "HTML includes deselectAllBtn");

// 4. Check loadConfig
check(content.includes("chrome.storage.local.get(['urlWhitelist', 'username', 'productCode']"), "loadConfig gets new keys");
check(content.includes("state.config.username = result.username || '';"), "loadConfig sets state.username");

// 5. Check saveConfig
check(content.includes("const username = cfgUsername.value.trim();"), "saveConfig reads username input");
check(content.includes("username: username,"), "saveConfig saves username");

// 6. Check cleanData headers
const headersRegex = /headers:\s*{\s*'Content-Type':\s*'application\/json',\s*'x-test-app-id':\s*state\.config\.productCode,\s*'x-user-account':\s*state\.config\.username\s*}/;
// Whitespace might vary, so let's check simply
check(content.includes("'x-test-app-id': state.config.productCode"), "cleanData sends x-test-app-id header");
check(content.includes("'x-user-account': state.config.username"), "cleanData sends x-user-account header");

// 7. Check listeners
check(content.includes("selectAllBtn.onclick = selectAll;"), "selectAll listener added");
check(content.includes("deselectAllBtn.onclick = deselectAll;"), "deselectAll listener added");

console.log("All static checks passed!");
