/**
 * Parse Zodiac Google Sheet CSV into star groups.
 * Class tabs: A=n, B=text, C=title, publish (опублик* or col D).
 * Ind tabs: title=Итог, content=текст звезды, publish on group start.
 * Only published rows sync. Merge: class wins on same starId.
 */

function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;
    const s = String(text || "").replace(/^\uFEFF/, "");
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (inQuotes) {
            if (ch === '"') {
                if (s[i + 1] === '"') {
                    cell += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                cell += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ",") {
            row.push(cell);
            cell = "";
        } else if (ch === "\n") {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = "";
        } else if (ch === "\r") {
            // skip
        } else {
            cell += ch;
        }
    }
    if (cell.length || row.length) {
        row.push(cell);
        rows.push(row);
    }
    return rows;
}

function normalizeHeader(h) {
    return String(h || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function cell(row, idx) {
    if (idx < 0 || row == null || row[idx] == null) {
        return "";
    }
    return String(row[idx]).trim();
}

function isPublished(raw) {
    const v = String(raw || "")
        .trim()
        .toLowerCase();
    if (!v) {
        return false;
    }
    if (v === "true" || v === "1" || v === "yes" || v === "да" || v === "on") {
        return true;
    }
    if (v === "✓" || v === "✔" || v === "☑" || v === "x" || v === "х") {
        return true;
    }
    return false;
}

function findPublishCol(rows, fallback = 3) {
    const limit = Math.min(3, rows.length);
    for (let i = 0; i < limit; i++) {
        const row = rows[i] || [];
        for (let ci = 0; ci < row.length; ci++) {
            if (normalizeHeader(row[ci]).includes("опублик")) {
                return ci;
            }
        }
    }
    return fallback;
}

function normalizeTitle(label) {
    let lab = String(label || "")
        .trim()
        .replace(/\s+и\s*$/i, "")
        .trim();
    return lab || "ЗВЕЗДА";
}

function makeGroup(n, title, content, starId = null) {
    title = normalizeTitle(title);
    content = String(content || "").trim();
    if (!content) {
        content = title;
    }
    if (!starId && n != null && n !== "") {
        starId = `s${String(n).padStart(2, "0")}`;
    }
    return {
        starId,
        label: title,
        title,
        content,
        lines: content ? [content] : [],
        n,
        bound: false,
        vertIndex: -1,
    };
}

/**
 * Class sheet: A=n, B=text, C=title, publish col.
 * @returns {{ title: string, classHint: string, groups: Array, warnings: string[] }}
 */
function parseClassSheetCsv(text) {
    const rows = parseCsv(text);
    const warnings = [];
    if (rows.length < 2) {
        return { title: "", classHint: "", groups: [], warnings: ["Пустой CSV"] };
    }

    const title = cell(rows[0], 0);
    let classHint = "";
    const m = title.match(/(\d)\s*[-–]\s*(\d)/);
    if (m) {
        classHint = `${m[1]}-${m[2]}`;
    }

    const pubCol = findPublishCol(rows, 3);
    const groups = [];
    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const nRaw = cell(row, 0);
        if (!/^\d+$/.test(nRaw)) {
            continue;
        }
        if (!isPublished(cell(row, pubCol))) {
            continue;
        }
        const content = cell(row, 1);
        const starTitle = cell(row, 2);
        if (!content && !starTitle) {
            continue;
        }
        groups.push(makeGroup(nRaw, starTitle || "ЗВЕЗДА", content));
    }
    return { title, classHint, groups, warnings };
}

function detectIndColumns(headerRow) {
    const cols = {
        n: 0,
        label: 4,
        starText: -1,
        publish: -1,
        star: -1,
    };
    (headerRow || []).forEach((h, i) => {
        const n = normalizeHeader(h);
        if (n === "star" || n.includes("якорь") || n === "id") {
            cols.star = i;
        } else if (n.includes("текст звезд") || n === "текст звезды") {
            cols.starText = i;
        } else if (n.includes("опублик")) {
            cols.publish = i;
        } else if (n.includes("итог") || n === "label" || n.includes("подпись")) {
            cols.label = i;
        } else if (n.includes("п/п") || n === "n" || n.startsWith("n ")) {
            cols.n = i;
        }
    });
    return cols;
}

/**
 * Ind sheet: group by N; title=Итог; content=текст звезды; publish on group start.
 */
function parseIndSheetCsv(text) {
    const rows = parseCsv(text);
    const warnings = [];
    if (rows.length < 2) {
        return { title: "", classHint: "", groups: [], warnings: ["Пустой CSV"] };
    }

    const title = cell(rows[0], 0);
    let classHint = "";
    const m = title.match(/(\d)\s*[-–]\s*(\d)/);
    if (m) {
        classHint = `${m[1]}-${m[2]}`;
    }

    let headerIdx = 1;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
        const joined = (rows[i] || []).map(normalizeHeader).join("|");
        if (
            joined.includes("итог") ||
            joined.includes("п/п") ||
            joined.includes("текст звезд") ||
            joined.includes("опублик")
        ) {
            headerIdx = i;
            break;
        }
    }
    const cols = detectIndColumns(rows[headerIdx] || []);
    if (cols.starText < 0) {
        warnings.push("инд: нет столбца «текст звезды»");
    }
    if (cols.publish < 0) {
        warnings.push("инд: нет столбца «опубликовать»");
    }

    const groups = [];
    let pending = null;
    for (let r = headerIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !row.some((c) => String(c || "").trim())) {
            continue;
        }
        const nRaw = cell(row, cols.n);
        if (/^\d+$/.test(nRaw)) {
            if (pending) {
                groups.push(pending);
                pending = null;
            }
            if (cols.publish < 0 || !isPublished(cell(row, cols.publish))) {
                continue;
            }
            const label = cell(row, cols.label);
            const starText = cols.starText >= 0 ? cell(row, cols.starText) : "";
            const starId = cols.star >= 0 ? cell(row, cols.star) || null : null;
            if (!label && !starText) {
                continue;
            }
            pending = makeGroup(nRaw, label || "ЗВЕЗДА", starText, starId);
            continue;
        }
        if (!pending) {
            continue;
        }
        if (cols.star >= 0) {
            const sid = cell(row, cols.star);
            if (sid && !pending.starId) {
                pending.starId = sid;
            }
        }
        if (cols.starText >= 0) {
            const more = cell(row, cols.starText);
            if (more && pending.content === pending.title) {
                pending.content = more;
                pending.lines = [more];
            }
        }
    }
    if (pending) {
        groups.push(pending);
    }
    return { title, classHint, groups, warnings };
}

/** Class wins on same starId; new ind ids appended. */
function mergeIndSheetIntoGroups(groups, indCsvText) {
    const parsed = parseIndSheetCsv(indCsvText);
    const byId = new Map(groups.map((g) => [g.starId, g]));
    for (const g of parsed.groups) {
        if (g.starId && byId.has(g.starId)) {
            continue;
        }
        groups.push(g);
        if (g.starId) {
            byId.set(g.starId, g);
        }
    }
    return parsed.warnings;
}

function findClassMeta(classesJson, classHint, gridIndex) {
    const list = (classesJson && classesJson.classes) || [];
    if (classHint) {
        const hit = list.find((c) => c.id === classHint);
        if (hit) {
            return hit;
        }
    }
    if (gridIndex != null && gridIndex >= 0) {
        return list.find((c) => c.gridIndex === gridIndex) || null;
    }
    return null;
}

function groupToVertFields(group) {
    const title = normalizeTitle(group.title || group.label || "ЗВЕЗДА");
    const content =
        (group.content && String(group.content).trim()) ||
        (group.lines && group.lines.length ? group.lines.join("\n") : "") ||
        title;
    return { title, content, starId: group.starId || null };
}

async function fetchSheetCsv(spreadsheetId, sheetNameOrGid, useProxy) {
    let url;
    if (/^\d+$/.test(String(sheetNameOrGid))) {
        url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${sheetNameOrGid}`;
    } else {
        url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
            sheetNameOrGid
        )}`;
    }
    if (useProxy) {
        url = `SheetProxy.php?url=${encodeURIComponent(url)}`;
    }
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    return await res.text();
}

if (typeof window !== "undefined") {
    window.SheetImport = {
        parseCsv,
        parseClassSheetCsv,
        parseIndSheetCsv,
        mergeIndSheetIntoGroups,
        findClassMeta,
        groupToVertFields,
        fetchSheetCsv,
    };
}
