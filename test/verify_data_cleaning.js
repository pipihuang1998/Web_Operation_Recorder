// test/verify_data_cleaning.js

// --- Mock OptTraceService (Copied from src/content.js for testing) ---
const OptTraceService = {
    extractCaseId(jsonData) {
        if (!jsonData || !jsonData.meta) return "";
        return jsonData.meta.caseId || "";
    },

    simplifyJson(data) {
        if (data === null || data === undefined) return data;

        if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data);
                if (typeof parsed === 'object' && parsed !== null) {
                    return this.simplifyJson(parsed);
                }
                return data;
            } catch (e) {
                return data;
            }
        }

        if (Array.isArray(data)) {
            if (data.length === 0) return [];
            const firstItem = this.simplifyJson(data[0]);
            if (data.length > 1) {
                const remaining = data.length - 1;
                const truncationMsg = `# ...省略后续${remaining}个相同结构的数据`;
                return [firstItem, truncationMsg];
            }
            return [firstItem];
        }

        if (typeof data === 'object') {
            const newObj = {};
            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    newObj[key] = this.simplifyJson(data[key]);
                }
            }
            return newObj;
        }

        return data;
    },

    cleanPath(rawPath) {
        if (!rawPath) return "";
        const idx = rawPath.indexOf(':');
        if (idx !== -1) {
            return rawPath.substring(idx + 1);
        }
        return rawPath;
    },

    _createCleanedNetworkItem(item, seqCounter) {
        const rawPath = item.path || "";
        return {
            seq: seqCounter,
            type: "NETWORK",
            title: item.title || "",
            method: item.method,
            systemAlias: item.systemAlias,
            path: this.cleanPath(rawPath),
            reqBody: this.simplifyJson(item.reqBody),
            resBody: this.simplifyJson(item.resBody)
        };
    },

    processLogDataDeduplicated(jsonData) {
        const timeline = jsonData.timeline || [];
        const cleanedLogs = [];
        let seqCounter = 1;
        const seenApiSignatures = new Set();

        for (const item of timeline) {
            const itemType = item.type;

            if (itemType === "ACTION") {
                cleanedLogs.push({
                    seq: seqCounter,
                    type: "ACTION",
                    title: item.title || "Unknown Action"
                });
                seqCounter++;
            } else if (itemType === "NETWORK") {
                const rawPath = item.path || "";
                const cleanedPath = this.cleanPath(rawPath);
                const signature = `${item.systemAlias}|${item.method}:${cleanedPath}`;

                if (seenApiSignatures.has(signature)) {
                    continue;
                }

                seenApiSignatures.add(signature);
                const cleanedItem = this._createCleanedNetworkItem(item, seqCounter);
                cleanedLogs.push(cleanedItem);
                seqCounter++;
            }
        }
        return cleanedLogs;
    },

    _formatTimelineReport(cleanedLogs) {
        const lines = [];
        for (const log of cleanedLogs) {
            if (log.type === 'ACTION') {
                lines.push(`【用户操作】 ${log.title}`);
                lines.push("-".repeat(5));
            } else if (log.type === 'NETWORK') {
                const apiSignature = `${log.systemAlias}|${log.method}:${log.path}`;
                lines.push(`【API接口】  ${apiSignature}`);
                lines.push(`【请求内容】 ${JSON.stringify(log.reqBody)}`);
                lines.push(`【请求结果】 ${JSON.stringify(log.resBody)}`);
                lines.push("-".repeat(5));
            }
        }
        return lines.join("\n");
    },

    generateFullTextDedupReport(jsonData) {
        const caseId = this.extractCaseId(jsonData);
        const cleanedLogs = this.processLogDataDeduplicated(jsonData);

        const reportParts = [];
        reportParts.push("=".repeat(5) + ` 操作过程信息 (Case: ${caseId}) ` + "=".repeat(5));
        reportParts.push("注：已过滤重复的 API ，仅保留首次调用记录。\n");
        reportParts.push(this._formatTimelineReport(cleanedLogs));

        return reportParts.join("\n");
    }
};

// --- Tests ---

function assert(condition, message) {
    if (!condition) {
        throw new Error("Assertion failed: " + message);
    }
}

function testSimplifyJson() {
    console.log("Testing simplifyJson...");

    // 1. Test List Truncation
    const listData = [ {id:1}, {id:2}, {id:3} ];
    const simplifiedList = OptTraceService.simplifyJson(listData);
    assert(simplifiedList.length === 2, "List should be truncated to length 2");
    assert(typeof simplifiedList[1] === 'string', "Second item should be a string");
    assert(simplifiedList[1].includes("省略后续2个"), "Truncation message correct");

    // 2. Test Recursion
    const complexData = {
        data: {
            items: [ {a:1}, {a:2} ]
        }
    };
    const simplifiedComplex = OptTraceService.simplifyJson(complexData);
    assert(simplifiedComplex.data.items.length === 2, "Nested list truncated");

    // 3. Test Stringified JSON
    const strData = JSON.stringify([ {x:1}, {x:2} ]);
    const simplifiedStr = OptTraceService.simplifyJson(strData);
    assert(Array.isArray(simplifiedStr), "Stringified JSON parsed and simplified");
    assert(simplifiedStr.length === 2, "Simplified string list truncated");

    // 4. Test Nested Lists in Dict
    const nestedListInDict = [
        { items: [ {id:1}, {id:2} ] },
        { items: [ {id:3}, {id:4} ] }
    ];
    const simpleNested = OptTraceService.simplifyJson(nestedListInDict);
    assert(simpleNested.length === 2, "Outer list truncated");
    assert(simpleNested[0].items.length === 2, "Inner list truncated");
    assert(typeof simpleNested[0].items[1] === 'string', "Inner list truncated correctly");

    // 5. Test Dict in Dict in List
    const complexNested = {
        data: {
            matrix: [ [1,2,3], [4,5,6] ]
        }
    };
    const simpleComplex = OptTraceService.simplifyJson(complexNested);
    assert(simpleComplex.data.matrix.length === 2, "Matrix outer list truncated");
    assert(simpleComplex.data.matrix[0].length === 2, "Matrix inner list truncated");

    console.log("simplifyJson Passed.");
}

function testDeduplication() {
    console.log("Testing processLogDataDeduplicated...");

    const logs = {
        meta: { caseId: "TEST-001" },
        timeline: [
            { type: "ACTION", title: "Click 1" },
            {
                type: "NETWORK",
                systemAlias: "SysA",
                method: "GET",
                path: "/gateway:/api/v1/resource",
                reqBody: {}, resBody: {}
            },
            {
                type: "NETWORK",
                systemAlias: "SysA",
                method: "GET",
                path: "/gateway:/api/v1/resource", // Duplicate
                reqBody: {}, resBody: {}
            },
            {
                type: "NETWORK",
                systemAlias: "SysA",
                method: "POST",
                path: "/gateway:/api/v1/resource", // Different Method
                reqBody: {}, resBody: {}
            }
        ]
    };

    const cleaned = OptTraceService.processLogDataDeduplicated(logs);

    // Expect: Action, GET (first), POST
    assert(cleaned.length === 3, `Expected 3 logs, got ${cleaned.length}`);
    assert(cleaned[0].type === "ACTION", "First is Action");
    assert(cleaned[1].method === "GET", "Second is GET");
    assert(cleaned[2].method === "POST", "Third is POST");

    console.log("Deduplication Passed.");
}

function testReportGeneration() {
    console.log("Testing generateFullTextDedupReport...");
    const logs = {
        meta: { caseId: "TEST-001" },
        timeline: [
            { type: "ACTION", title: "Click 1" },
             {
                type: "NETWORK",
                systemAlias: "SysA",
                method: "GET",
                path: "/api/v1/resource",
                reqBody: {a:1}, resBody: {b:2}
            }
        ]
    };

    const report = OptTraceService.generateFullTextDedupReport(logs);
    console.log("Report Output:\n" + report);
    assert(report.includes("TEST-001"), "Report contains Case ID");
    assert(report.includes("Click 1"), "Report contains Action");
    assert(report.includes("SysA|GET:/api/v1/resource"), "Report contains API signature");

    console.log("Report Generation Passed.");
}


try {
    testSimplifyJson();
    testDeduplication();
    testReportGeneration();
    console.log("ALL TESTS PASSED");
} catch (e) {
    console.error(e);
    process.exit(1);
}
