// Verification Script for URL Matching Logic
const assert = require('assert');

function runTest() {
    console.log("Starting URL Matching Verification...");

    // Mock Config
    const config = [
        { alias: "ROOT", prefix: "https://example.com/" },
        { alias: "API", prefix: "https://example.com/api/v1/" },
        { alias: "DEEP", prefix: "https://example.com/api/v1/deep/endpoint" }
    ];

    // Simulate Sorting Logic from content.js
    const sortedConfig = [...config].sort((a, b) => b.prefix.length - a.prefix.length);

    console.log("Sorted Config Order:", sortedConfig.map(c => c.alias));
    assert.strictEqual(sortedConfig[0].alias, "DEEP", "Longest prefix should be first");
    assert.strictEqual(sortedConfig[1].alias, "API", "Medium prefix should be second");
    assert.strictEqual(sortedConfig[2].alias, "ROOT", "Shortest prefix should be last");

    // Test Case 1: Matching Deepest
    let url1 = "https://example.com/api/v1/deep/endpoint/action?id=1";
    let match1 = null;
    for (const item of sortedConfig) {
        if (url1.startsWith(item.prefix)) {
            match1 = { alias: item.alias, path: url1.substring(item.prefix.length) };
            break;
        }
    }
    assert.deepStrictEqual(match1, { alias: "DEEP", path: "/action?id=1" });
    console.log("✓ Test 1 Passed: Matched DEEP");

    // Test Case 2: Matching Middle
    let url2 = "https://example.com/api/v1/users";
    let match2 = null;
    for (const item of sortedConfig) {
        if (url2.startsWith(item.prefix)) {
            match2 = { alias: item.alias, path: url2.substring(item.prefix.length) };
            break;
        }
    }
    assert.deepStrictEqual(match2, { alias: "API", path: "users" });
    console.log("✓ Test 2 Passed: Matched API");

    // Test Case 3: Matching Root
    let url3 = "https://example.com/dashboard";
    let match3 = null;
    for (const item of sortedConfig) {
        if (url3.startsWith(item.prefix)) {
            match3 = { alias: item.alias, path: url3.substring(item.prefix.length) };
            break;
        }
    }
    assert.deepStrictEqual(match3, { alias: "ROOT", path: "dashboard" });
    console.log("✓ Test 3 Passed: Matched ROOT");

    // Test Case 4: No Match
    let url4 = "https://google.com";
    let match4 = null;
    for (const item of sortedConfig) {
        if (url4.startsWith(item.prefix)) {
            match4 = { alias: item.alias, path: url4.substring(item.prefix.length) };
            break;
        }
    }
    assert.strictEqual(match4, null);
    console.log("✓ Test 4 Passed: No Match");

    // Test Case 5: Partial Prefix Match Failure (ensure exact startsWith)
    // "https://example.com/api/v1" matches "https://example.com/" but logic should prefer longer if configured
    // Wait, if config is "https://example.com/api/v1/", and url is "https://example.com/api/v1" (missing slash),
    // it won't match the API config (length mismatch), it will match ROOT.
    // This is expected behavior unless we normalize slashes.
    // User requirement implied strict prefix behavior.

    let url5 = "https://example.com/api/v1";
    // sortedConfig[0] (DEEP) - startsWith check: false
    // sortedConfig[1] (API) - "https://example.com/api/v1/" - startsWith check: false (missing slash in url)
    // sortedConfig[2] (ROOT) - "https://example.com/" - startsWith check: true

    let match5 = null;
    for (const item of sortedConfig) {
        if (url5.startsWith(item.prefix)) {
            match5 = { alias: item.alias, path: url5.substring(item.prefix.length) };
            break;
        }
    }
    assert.deepStrictEqual(match5, { alias: "ROOT", path: "api/v1" });
    console.log("✓ Test 5 Passed: Handled missing slash by falling back to shorter match");

    console.log("All matching logic tests passed.");
}

runTest();
