import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const require = createRequire(import.meta.url);
const SP = require(path.join(root, "assets/js/svg_points.js"));

function pngSize(p) {
    const b = fs.readFileSync(p);
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

function svgVertCount(svgPath) {
    const t = fs.readFileSync(svgPath, "utf8");
    const m = t.match(/<path[^>]*\sd\s*=\s*"([^"]+)"/i);
    if (!m) return null;
    const vb = (t.match(/viewBox\s*=\s*"([^"]+)"/i) || [])[1];
    const parts = vb ? vb.trim().split(/[\s,]+/).map(Number) : [0, 0, 1000, 1000];
    const parsed = SP.parsePath(m[1], { sampleCurves: false });
    const norm = SP.pixelsToNormalized(parsed.points, parts[2], parts[3]);
    return {
        verts: SP.dedupePoints(norm, 0.02).kept.length,
        raw: parsed.points.length,
        vw: parts[2],
        vh: parts[3],
    };
}

const texDir = path.join(root, "assets/textures");
const svgs = fs.readdirSync(texDir).filter((f) => f.toLowerCase().endsWith(".svg"));
const svgStats = {};
for (const f of svgs) {
    svgStats[f] = svgVertCount(path.join(texDir, f));
}

const report = { tex: {}, const: {}, match: [] };
for (let i = 0; i <= 9; i++) {
    const cj = JSON.parse(fs.readFileSync(path.join(root, `assets/json/const${i}.json`), "utf8"));
    const texP = path.join(texDir, `tex${i}.png`);
    report.const[i] = cj.vert.length;
    report.tex[i] = fs.existsSync(texP) ? pngSize(texP) : null;
}

for (const [name, st] of Object.entries(svgStats)) {
    if (!st) continue;
    const hits = [];
    for (let i = 0; i <= 9; i++) {
        if (report.const[i] === st.verts) hits.push(i);
    }
    report.match.push({ svg: name, ...st, constHits: hits });
}

console.log(JSON.stringify({ svgStats: report.match, constCounts: report.const, texSizes: report.tex }, null, 2));
