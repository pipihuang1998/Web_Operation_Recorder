const fs = require('fs');
const path = require('path');

console.log("Verifying manifest.json...");
try {
    const manifestPath = path.join(__dirname, '../src/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    if (!manifest.manifest_version) throw new Error("Missing manifest_version");
    if (manifest.manifest_version !== 3) throw new Error("manifest_version must be 3");
    if (!manifest.background || !manifest.background.service_worker) throw new Error("Missing background service worker");

    console.log("Manifest is valid JSON and has basic V3 structure.");
} catch (e) {
    console.error("Manifest verification failed:", e.message);
    process.exit(1);
}

console.log("Verifying background.js syntax...");
try {
    // Just try to parse/compile it. Since it uses chrome.* APIs, we can't run it easily.
    // We can just check for syntax errors by reading it.
    // Actually, require() might fail due to 'chrome' not being defined if it executes immediately.
    // But background.js usually just adds listeners.
    // Let's rely on node's syntax check via --check is not available programmatically easily without exec.
    // We can try to new Function() it, wrapped in a proxy for chrome.

    const bgPath = path.join(__dirname, '../src/background.js');
    const bgCode = fs.readFileSync(bgPath, 'utf8');

    // Simple syntax check using Function constructor
    new Function('chrome', bgCode);
    console.log("background.js syntax seems valid.");
} catch (e) {
    console.error("background.js syntax error:", e.message);
    process.exit(1);
}

console.log("All static checks passed.");
