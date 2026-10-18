/**
 * Bake texN.png from animal SVG for each classes.json slot.
 * Usage: node scripts/bake_tex_from_svg.mjs
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import zlib from "zlib";

const require = createRequire(import.meta.url);
const SP = require("../assets/js/svg_points.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const TEX_DIR = path.join(REPO, "assets", "textures");
const CLASSES = path.join(REPO, "assets", "json", "classes.json");

const ALIASES = {
    Кролик: ["Заяц"],
    кролик: ["Заяц"],
};

function animalCandidates(animal) {
    const raw = String(animal || "").trim();
    if (!raw) {
        return [];
    }
    const out = [];
    const push = (n) => {
        if (n && !out.includes(n)) {
            out.push(n);
        }
    };
    push(raw);
    push(raw.replace(/_\d{4}$/u, ""));
    const base = raw.replace(/_\d{4}$/u, "");
    for (const a of ALIASES[base] || ALIASES[raw] || []) {
        push(a);
    }
    return out;
}

function findSvg(animal) {
    for (const name of animalCandidates(animal)) {
        const direct = path.join(TEX_DIR, `${name}.svg`);
        if (fs.existsSync(direct)) {
            return direct;
        }
        const files = fs.readdirSync(TEX_DIR).filter((f) => f.toLowerCase().endsWith(".svg"));
        const hit = files.find((f) => f.slice(0, -4).toLowerCase() === name.toLowerCase());
        if (hit) {
            return path.join(TEX_DIR, hit);
        }
    }
    return null;
}

function parseSvg(text) {
    const pathMatch = text.match(/<path[^>]*\sd\s*=\s*"([^"]+)"/i);
    if (!pathMatch) {
        throw new Error("no path");
    }
    const vbMatch = text.match(/viewBox\s*=\s*"([^"]+)"/i);
    const wMatch = text.match(/\bwidth\s*=\s*"([\d.]+)"/i);
    const hMatch = text.match(/\bheight\s*=\s*"([\d.]+)"/i);
    let vw = 1000;
    let vh = 1000;
    if (vbMatch) {
        const p = vbMatch[1].trim().split(/[\s,]+/).map(Number);
        vw = p[2];
        vh = p[3];
    } else if (wMatch && hMatch) {
        vw = Number(wMatch[1]);
        vh = Number(hMatch[1]);
    }
    const dashMatch = text.match(/stroke-dasharray\s*=\s*"([^"]+)"/i);
    const widthMatch = text.match(/stroke-width\s*=\s*"([\d.]+)"/i);
    const colorMatch = text.match(/stroke\s*=\s*"([^"]+)"/i);
    return {
        d: pathMatch[1],
        vw,
        vh,
        dash: dashMatch ? dashMatch[1].trim() : "4 8 8 16 4 4",
        strokeWidth: widthMatch ? Math.max(0.05, Number(widthMatch[1])) : 0.2,
        color: colorMatch ? colorMatch[1] : "#FF0000",
    };
}

function hexToRgba(hex) {
    const h = hex.replace("#", "");
    if (h.length === 3) {
        const r = parseInt(h[0] + h[0], 16);
        const g = parseInt(h[1] + h[1], 16);
        const b = parseInt(h[2] + h[2], 16);
        return [r, g, b, 255];
    }
    if (h.length >= 6) {
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
    }
    return [255, 0, 0, 255];
}

function parseDash(str) {
    return String(str || "")
        .trim()
        .split(/[\s,]+/)
        .map(Number)
        .filter((n) => !Number.isNaN(n) && n >= 0);
}

/** Minimal PNG writer (RGBA). */
function writePng(file, width, height, rgba) {
    const raw = Buffer.alloc((width * 4 + 1) * height);
    for (let y = 0; y < height; y++) {
        const row = y * (width * 4 + 1);
        raw[row] = 0;
        rgba.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
    }
    const compressed = zlib.deflateSync(raw);

    function chunk(type, data) {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(data.length);
        const typeBuf = Buffer.from(type);
        const crc = Buffer.alloc(4);
        const crcVal = zlib.crc32 ? null : null;
        // CRC32
        let c = ~0;
        const table = writePng._t || (writePng._t = (() => {
            const t = new Uint32Array(256);
            for (let n = 0; n < 256; n++) {
                let c0 = n;
                for (let k = 0; k < 8; k++) {
                    c0 = c0 & 1 ? 0xedb88320 ^ (c0 >>> 1) : c0 >>> 1;
                }
                t[n] = c0;
            }
            return t;
        })());
        const buf = Buffer.concat([typeBuf, data]);
        for (let i = 0; i < buf.length; i++) {
            c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
        }
        crc.writeUInt32BE((~c) >>> 0);
        return Buffer.concat([len, typeBuf, data, crc]);
    }

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    fs.writeFileSync(file, Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))]));
}

function setPixel(buf, w, h, x, y, rgba) {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= w || yi >= h) {
        return;
    }
    const i = (yi * w + xi) * 4;
    buf[i] = rgba[0];
    buf[i + 1] = rgba[1];
    buf[i + 2] = rgba[2];
    buf[i + 3] = rgba[3];
}

function drawDashedLine(buf, w, h, x0, y0, x1, y1, rgba, width, dash) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
        return;
    }
    const ux = dx / len;
    const uy = dy / len;
    const pattern = dash.length ? dash : [1e9];
    let dist = 0;
    let pi = 0;
    let drawOn = true;
    let segLeft = pattern[0];
    const step = 0.35;
    for (let d = 0; d <= len; d += step) {
        while (segLeft <= 0) {
            pi = (pi + 1) % pattern.length;
            segLeft = pattern[pi];
            drawOn = !drawOn;
        }
        if (drawOn) {
            const x = x0 + ux * d;
            const y = y0 + uy * d;
            const r = Math.max(0.5, width * 0.5);
            for (let oy = -r; oy <= r; oy++) {
                for (let ox = -r; ox <= r; ox++) {
                    if (ox * ox + oy * oy <= r * r + 0.25) {
                        setPixel(buf, w, h, x + ox, y + oy, rgba);
                    }
                }
            }
        }
        segLeft -= step;
    }
}

function bakeSvgFile(svgPath, outPng, outConst) {
    const text = fs.readFileSync(svgPath, "utf8");
    const meta = parseSvg(text);
    const w = Math.max(2, Math.round(meta.vw));
    const h = Math.max(2, Math.round(meta.vh));
    const rgba = Buffer.alloc(w * h * 4);
    const color = hexToRgba(meta.color.startsWith("#") ? meta.color : "#FF0000");
    const dash = parseDash(meta.dash);
    const parsed = SP.parsePath(meta.d, { sampleCurves: false });
    for (const line of parsed.polylines) {
        for (let i = 1; i < line.length; i++) {
            drawDashedLine(
                rgba,
                w,
                h,
                line[i - 1][0],
                line[i - 1][1],
                line[i][0],
                line[i][1],
                color,
                meta.strokeWidth,
                dash
            );
        }
    }
    writePng(outPng, w, h, rgba);
    const norm = SP.pixelsToNormalized(parsed.points, meta.vw, meta.vh);
    const kept = SP.dedupePoints(norm, SP.DEFAULT_DEDUPE_EPS || 0.02).kept;
    if (outConst) {
        const obj = { number: 0, vert: kept.map((p) => [p[0], p[1]]) };
        fs.writeFileSync(outConst, JSON.stringify(obj) + "\n", "utf8");
    }
    return { w, h, verts: kept.length, bytes: fs.statSync(outPng).size };
}

function main() {
    // Prefer remote-like classes if present in probe, else local
    let classesPath = CLASSES;
    const probe = path.join(REPO, "scripts", "_probe_out", "classes.json");
    if (fs.existsSync(probe)) {
        classesPath = probe;
    }
    const classes = JSON.parse(fs.readFileSync(classesPath, "utf8"));
    const jsonDir = path.join(REPO, "assets", "json");
    for (const c of classes.classes || []) {
        const idx = c.gridIndex;
        const animal = c.animal || "";
        const svg = findSvg(animal);
        if (!svg) {
            console.log(`SKIP const${idx} animal=${animal} (no svg)`);
            continue;
        }
        const out = path.join(TEX_DIR, `tex${idx}.png`);
        const outConst = path.join(jsonDir, `const${idx}.json`);
        const info = bakeSvgFile(svg, out, outConst);
        console.log(
            `OK const${idx} animal=${animal} svg=${path.basename(svg)} -> tex+const ${info.w}x${info.h} ${info.verts}★ ${info.bytes}b`
        );
    }
}

main();
