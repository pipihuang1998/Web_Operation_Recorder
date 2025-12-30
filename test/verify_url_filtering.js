
// Mock Config
let config = {
    urlWhitelist: [
        { alias: "flow", prefix: "https://fincloud-sit.aaa.bbb.com/saasone/#/citc-portal-flow" },
        { alias: "gw", prefix: "https://fincloud-sit.finance.huawei.com/authority-tenant-gw" }
    ]
};

// Logic to test
function processNetworkLog(payload) {
    if (!config.urlWhitelist || config.urlWhitelist.length === 0) {
        // If whitelist is empty, do we capture everything or nothing?
        // Requirement: "In the list will be included". Implies whitelist only.
        return null;
    }

    for (const item of config.urlWhitelist) {
        if (payload.url.startsWith(item.prefix)) {
            const path = payload.url.substring(item.prefix.length);
            // Remove leading slash if present in path but not in prefix ending?
            // Usually path is just the rest.
            // If prefix ends with 'gw' and url is 'gw/foo', path is '/foo'.

            return {
                alias: item.alias,
                path: path,
                fullUrl: payload.url,
                method: payload.method,
                status: payload.status
            };
        }
    }
    return null; // Not in whitelist
}

// Test Cases
const tests = [
    {
        name: "Match Whitelist 1",
        input: { url: "https://fincloud-sit.aaa.bbb.com/saasone/#/citc-portal-flow/some/page", method: "GET" },
        expected: { alias: "flow", path: "/some/page" }
    },
    {
        name: "Match Whitelist 2",
        input: { url: "https://fincloud-sit.finance.huawei.com/authority-tenant-gw/api/v1/data", method: "POST" },
        expected: { alias: "gw", path: "/api/v1/data" }
    },
    {
        name: "No Match",
        input: { url: "https://google.com/search", method: "GET" },
        expected: null
    },
    {
        name: "Partial Match (Prefix not full)",
        // Note: StartsWith checks entire string.
        // If prefix is 'http://example.com' and url is 'http://example.com.evil.com', it matches.
        // User said "Prefix match is enough".
        input: { url: "https://fincloud-sit.finance.huawei.com/authority-tenant-gw-extra", method: "GET" },
        expected: { alias: "gw", path: "-extra" }
    }
];

let failed = false;

console.log("Running URL Filtering Tests...");

tests.forEach(t => {
    const result = processNetworkLog(t.input);
    if (t.expected === null) {
        if (result !== null) {
            console.error(`[FAIL] ${t.name}: Expected null, got`, result);
            failed = true;
        } else {
            console.log(`[PASS] ${t.name}`);
        }
    } else {
        if (!result) {
            console.error(`[FAIL] ${t.name}: Expected match, got null`);
            failed = true;
        } else if (result.alias !== t.expected.alias || result.path !== t.expected.path) {
            console.error(`[FAIL] ${t.name}: Expected`, t.expected, "Got", result);
            failed = true;
        } else {
            console.log(`[PASS] ${t.name}`);
        }
    }
});

if (failed) {
    console.error("Some tests failed.");
    process.exit(1);
} else {
    console.log("All tests passed.");
}
