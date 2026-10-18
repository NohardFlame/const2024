/**
 * Pure helpers for SVG path → constellation vertices.
 * Matches legacy svg_parser.js: normalize to [-1,1], box-dedupe ±epsilon.
 */

const DEFAULT_DEDUPE_EPS = 0.02;

function parseFloatToken(str, index) {
    let output = 0;
    let mode = 0;
    let decimals = 0;
    let positive = true;
    let i = index;
    const n = str.length;

    while (i < n && (str[i] === " " || str[i] === "," || str[i] === "\n" || str[i] === "\t")) {
        i++;
    }
    if (i >= n) {
        return [0, true, i];
    }

    if (str[i] === "-") {
        positive = false;
        i++;
    } else if (str[i] === "+") {
        i++;
    }

    for (; i < n; ++i) {
        const ch = str[i];
        if (ch >= "0" && ch <= "9") {
            const digit = ch.charCodeAt(0) - 48;
            if (mode === 0) {
                output = output * 10 + digit;
            } else {
                decimals += 1;
                output = output + digit * Math.pow(0.1, decimals);
            }
        } else if (ch === ".") {
            mode = 1;
            decimals = 0;
        } else {
            break;
        }
    }

    if (!positive) {
        output *= -1;
    }
    const endedOnCommand = i < n && /[A-Za-z]/.test(str[i]);
    return [output, endedOnCommand, endedOnCommand ? i - 1 : i];
}

/**
 * Parse SVG path `d` into absolute polylines in viewBox pixels.
 * @param {string} d
 * @param {{ sampleCurves?: boolean, curveSteps?: number }} [opts]
 * @returns {{ polylines: number[][][], points: number[][] }}
 */
function parsePath(d, opts) {
    const sampleCurves = opts && opts.sampleCurves;
    const curveSteps = (opts && opts.curveSteps) || 8;
    const text = String(d || "").trim() + (String(d || "").endsWith("E") ? "" : "E");
    const polylines = [];
    let current = null;
    let cx = 0;
    let cy = 0;
    let startX = 0;
    let startY = 0;
    let i = 0;

    const pushPoint = (x, y, startNew) => {
        if (startNew || !current) {
            current = [];
            polylines.push(current);
        }
        current.push([x, y]);
        cx = x;
        cy = y;
    };

    const cubicPoint = (x0, y0, x1, y1, x2, y2, x3, y3, t) => {
        const u = 1 - t;
        const uu = u * u;
        const tt = t * t;
        const x = uu * u * x0 + 3 * uu * t * x1 + 3 * u * tt * x2 + tt * t * x3;
        const y = uu * u * y0 + 3 * uu * t * y1 + 3 * u * tt * y2 + tt * t * y3;
        return [x, y];
    };

    while (i < text.length && text[i] !== "E") {
        const cmd = text[i];
        if (cmd === "M" || cmd === "m") {
            const absolute = cmd === "M";
            let t1 = parseFloatToken(text, i + 1);
            let t2 = parseFloatToken(text, t1[2] + 1);
            let x = absolute ? t1[0] : cx + t1[0];
            let y = absolute ? t2[0] : cy + t2[0];
            pushPoint(x, y, true);
            startX = x;
            startY = y;
            i = t2[2] + 1;
            while (i < text.length && /[-+0-9.]/.test(text[i])) {
                t1 = parseFloatToken(text, i);
                t2 = parseFloatToken(text, t1[2] + 1);
                x = absolute ? t1[0] : cx + t1[0];
                y = absolute ? t2[0] : cy + t2[0];
                pushPoint(x, y, false);
                i = t2[2] + 1;
            }
            continue;
        }
        if (cmd === "L" || cmd === "l") {
            const absolute = cmd === "L";
            const t1 = parseFloatToken(text, i + 1);
            const t2 = parseFloatToken(text, t1[2] + 1);
            const x = absolute ? t1[0] : cx + t1[0];
            const y = absolute ? t2[0] : cy + t2[0];
            pushPoint(x, y, false);
            i = t2[2] + 1;
            continue;
        }
        if (cmd === "H" || cmd === "h") {
            const absolute = cmd === "H";
            const t1 = parseFloatToken(text, i + 1);
            const x = absolute ? t1[0] : cx + t1[0];
            pushPoint(x, cy, false);
            i = t1[2] + 1;
            continue;
        }
        if (cmd === "V" || cmd === "v") {
            const absolute = cmd === "V";
            const t1 = parseFloatToken(text, i + 1);
            const y = absolute ? t1[0] : cy + t1[0];
            pushPoint(cx, y, false);
            i = t1[2] + 1;
            continue;
        }
        if (cmd === "C" || cmd === "c") {
            const absolute = cmd === "C";
            let t = parseFloatToken(text, i + 1);
            const x1 = absolute ? t[0] : cx + t[0];
            t = parseFloatToken(text, t[2] + 1);
            const y1 = absolute ? t[0] : cy + t[0];
            t = parseFloatToken(text, t[2] + 1);
            const x2 = absolute ? t[0] : cx + t[0];
            t = parseFloatToken(text, t[2] + 1);
            const y2 = absolute ? t[0] : cy + t[0];
            t = parseFloatToken(text, t[2] + 1);
            const x3 = absolute ? t[0] : cx + t[0];
            t = parseFloatToken(text, t[2] + 1);
            const y3 = absolute ? t[0] : cy + t[0];
            if (sampleCurves) {
                const x0 = cx;
                const y0 = cy;
                for (let s = 1; s <= curveSteps; s++) {
                    const pt = cubicPoint(x0, y0, x1, y1, x2, y2, x3, y3, s / curveSteps);
                    pushPoint(pt[0], pt[1], false);
                }
            } else {
                // Legacy: keep only the cubic end point
                pushPoint(x3, y3, false);
            }
            i = t[2] + 1;
            continue;
        }
        if (cmd === "Z" || cmd === "z") {
            if (current && current.length) {
                pushPoint(startX, startY, false);
            }
            i++;
            continue;
        }
        i++;
    }

    const points = [];
    for (const line of polylines) {
        for (const pt of line) {
            points.push(pt);
        }
    }
    return { polylines, points };
}

function normalizePoint(x, y, w, h) {
    return [(x / w) * 2 - 1, (-y / h) * 2 + 1];
}

/**
 * Same box filter as pushInVert. First point wins.
 * @returns {{ kept: number[][], dropped: number[], map: number[] }}
 */
function dedupePoints(points, epsilon) {
    const eps = epsilon == null ? DEFAULT_DEDUPE_EPS : epsilon;
    const kept = [];
    const dropped = [];
    const map = [];
    for (let i = 0; i < points.length; ++i) {
        const vert = points[i];
        let found = -1;
        for (let j = 0; j < kept.length; ++j) {
            if (
                vert[0] >= kept[j][0] - eps &&
                vert[0] <= kept[j][0] + eps &&
                vert[1] >= kept[j][1] - eps &&
                vert[1] <= kept[j][1] + eps
            ) {
                found = j;
                break;
            }
        }
        if (found >= 0) {
            dropped.push(i);
            map.push(found);
        } else {
            map.push(kept.length);
            kept.push([vert[0], vert[1]]);
        }
    }
    return { kept, dropped, map };
}

/** Board placement used by dataHandler.update_all */
function toBoardCoords(nx, ny, scaleW, scaleH) {
    const sw = scaleW == null ? 1 : scaleW;
    const sh = scaleH == null ? 1 : scaleH;
    return [((nx + 1) * 0.65 - 0.3) * sw, ny * sh];
}

function pixelsToNormalized(pointsPx, frameW, frameH) {
    return pointsPx.map((p) => normalizePoint(p[0], p[1], frameW, frameH));
}

function epsilonToPixels(epsilon, frameW, frameH) {
    return {
        x: (epsilon * frameW) / 2,
        y: (epsilon * frameH) / 2,
    };
}

function pathToNormalizedVerts(d, frameW, frameH, epsilon, sampleCurves) {
    const parsed = parsePath(d, { sampleCurves: !!sampleCurves });
    const normalized = pixelsToNormalized(parsed.points, frameW, frameH);
    const deduped = dedupePoints(normalized, epsilon == null ? DEFAULT_DEDUPE_EPS : epsilon);
    return {
        polylines: parsed.polylines,
        raw: normalized,
        verts: deduped.kept,
        dropped: deduped.dropped,
        map: deduped.map,
    };
}

/** Point on cubic Bezier at t ∈ [0,1]. */
function sampleCubic(p0, c1, c2, p1, t) {
    const u = 1 - t;
    const uu = u * u;
    const tt = t * t;
    return [
        uu * u * p0[0] + 3 * uu * t * c1[0] + 3 * u * tt * c2[0] + tt * t * p1[0],
        uu * u * p0[1] + 3 * uu * t * c1[1] + 3 * u * tt * c2[1] + tt * t * p1[1],
    ];
}

/**
 * Normalize legacy `{ points }` strokes to `{ anchors, controls, closed }`.
 */
function migrateStroke(raw) {
    if (!raw) {
        return { closed: false, anchors: [], controls: [] };
    }
    if (Array.isArray(raw.anchors)) {
        const anchors = raw.anchors.map((p) => [p[0], p[1]]);
        const closed = !!raw.closed;
        const need = closed ? anchors.length : Math.max(0, anchors.length - 1);
        const controls = [];
        for (let i = 0; i < need; i++) {
            const c = raw.controls && raw.controls[i];
            if (c && c.c1 && c.c2) {
                controls.push({
                    c1: [c.c1[0], c.c1[1]],
                    c2: [c.c2[0], c.c2[1]],
                });
            } else {
                controls.push(null);
            }
        }
        return { closed, anchors, controls };
    }
    const anchors = (raw.points || []).map((p) => [p[0], p[1]]);
    const closed = !!raw.closed;
    const need = closed ? anchors.length : Math.max(0, anchors.length - 1);
    const controls = [];
    for (let i = 0; i < need; i++) {
        controls.push(null);
    }
    return { closed, anchors, controls };
}

function anchorsFromStroke(stroke) {
    const s = migrateStroke(stroke);
    return s.anchors.map((p) => [p[0], p[1]]);
}

function segmentCount(stroke) {
    const s = migrateStroke(stroke);
    if (s.anchors.length < 2) {
        return 0;
    }
    return s.closed ? s.anchors.length : s.anchors.length - 1;
}

function segmentEndpoints(stroke, segIndex) {
    const s = migrateStroke(stroke);
    const a = s.anchors[segIndex];
    const b = s.closed
        ? s.anchors[(segIndex + 1) % s.anchors.length]
        : s.anchors[segIndex + 1];
    return { a, b, control: s.controls[segIndex] || null };
}

/**
 * Build a Path2D for a stroke in image pixels, optionally shifted into crop-local space.
 */
function strokeToPath2D(stroke, offsetX, offsetY) {
    const ox = offsetX || 0;
    const oy = offsetY || 0;
    const s = migrateStroke(stroke);
    const path = new Path2D();
    if (!s.anchors.length) {
        return path;
    }
    path.moveTo(s.anchors[0][0] - ox, s.anchors[0][1] - oy);
    const n = segmentCount(s);
    for (let i = 0; i < n; i++) {
        const { a, b, control } = segmentEndpoints(s, i);
        if (control) {
            path.bezierCurveTo(
                control.c1[0] - ox,
                control.c1[1] - oy,
                control.c2[0] - ox,
                control.c2[1] - oy,
                b[0] - ox,
                b[1] - oy
            );
        } else {
            path.lineTo(b[0] - ox, b[1] - oy);
        }
    }
    if (s.closed) {
        path.closePath();
    }
    return path;
}

function parseDashArray(str) {
    if (!str || typeof str !== "string") {
        return [];
    }
    return str
        .trim()
        .split(/[\s,]+/)
        .map(Number)
        .filter((n) => !Number.isNaN(n) && n >= 0);
}

function rgb01ToCss(rgb) {
    const r = Math.round(Math.max(0, Math.min(1, rgb[0])) * 255);
    const g = Math.round(Math.max(0, Math.min(1, rgb[1])) * 255);
    const b = Math.round(Math.max(0, Math.min(1, rgb[2])) * 255);
    return `rgb(${r},${g},${b})`;
}

// Browser global + Node-friendly export for quick tests
if (typeof window !== "undefined") {
    window.SvgPoints = {
        DEFAULT_DEDUPE_EPS,
        parsePath,
        normalizePoint,
        dedupePoints,
        toBoardCoords,
        pixelsToNormalized,
        epsilonToPixels,
        pathToNormalizedVerts,
        parseFloatToken,
        sampleCubic,
        migrateStroke,
        anchorsFromStroke,
        segmentCount,
        segmentEndpoints,
        strokeToPath2D,
        parseDashArray,
        rgb01ToCss,
    };
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        DEFAULT_DEDUPE_EPS,
        parsePath,
        normalizePoint,
        dedupePoints,
        toBoardCoords,
        pixelsToNormalized,
        epsilonToPixels,
        pathToNormalizedVerts,
        parseFloatToken,
        sampleCubic,
        migrateStroke,
        anchorsFromStroke,
        segmentCount,
        segmentEndpoints,
        strokeToPath2D,
        parseDashArray,
        rgb01ToCss,
    };
}
