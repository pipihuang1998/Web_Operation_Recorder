
// Mock Config with new 'filterGateway' property
let config = {
    urlWhitelist: [
        { alias: "gw-on", prefix: "https://example.com/gw", filterGateway: true },
        { alias: "gw-off", prefix: "https://example.com/other", filterGateway: false },
        { alias: "gw-default", prefix: "https://example.com/def" } // undefined should be treated as false
    ]
};

// Logic to test (Mirrors src/content.js)
function processNetworkLog(payload) {
    if (!config.urlWhitelist || config.urlWhitelist.length === 0) {
        return null;
    }

    // Sort by length desc (Longest Prefix Match)
    const sortedConfig = [...config.urlWhitelist].sort((a, b) => b.prefix.length - a.prefix.length);

    for (const item of sortedConfig) {
        if (payload.url.startsWith(item.prefix)) {
            let path = payload.url.substring(item.prefix.length);

            // --- New Logic Start ---
            if (item.filterGateway) {
                const colonIndex = path.indexOf(':');
                if (colonIndex !== -1) {
                     // Remove everything before and including the first colon
                     path = path.substring(colonIndex + 1);
                }
            }
            // --- New Logic End ---

            return {
                alias: item.alias,
                path: path
            };
        }
    }
    return null;
}

// Test Cases
const tests = [
    {
        name: "Filter Enabled: Path with colon",
        input: { url: "https://example.com/gw/gateway:service/api" },
        // Prefix "https://example.com/gw" matches. Path "/gateway:service/api".
        // First colon at index 8. Substring(9) -> "service/api"
        expected: { alias: "gw-on", path: "service/api" }
    },
    {
        name: "Filter Enabled: Path with multiple colons",
        input: { url: "https://example.com/gw/part1:part2:part3" },
        // Path "/part1:part2:part3". First colon at 6. Substring(7) -> "part2:part3"
        expected: { alias: "gw-on", path: "part2:part3" }
    },
    {
        name: "Filter Enabled: Path with NO colon",
        input: { url: "https://example.com/gw/simple/path" },
        expected: { alias: "gw-on", path: "/simple/path" }
    },
    {
        name: "Filter Disabled: Path with colon",
        input: { url: "https://example.com/other/gateway:service/api" },
        expected: { alias: "gw-off", path: "/gateway:service/api" }
    },
    {
        name: "Filter Undefined (Default): Path with colon",
        input: { url: "https://example.com/def/gateway:service/api" },
        expected: { alias: "gw-default", path: "/gateway:service/api" }
    }
];

let failed = false;
console.log("Running Gateway Filtering Tests...");

tests.forEach(t => {
    const result = processNetworkLog(t.input);

    // Helper to compare objects
    const matches = result && result.alias === t.expected.alias && result.path === t.expected.path;

    if (!matches) {
        console.error(`[FAIL] ${t.name}`);
        console.error(`  Expected:`, t.expected);
        console.error(`  Got:     `, result);
        failed = true;
    } else {
        console.log(`[PASS] ${t.name}`);
    }
});

if (failed) {
    console.error("Tests FAILED");
    process.exit(1);
} else {
    console.log("All tests PASSED");
}
