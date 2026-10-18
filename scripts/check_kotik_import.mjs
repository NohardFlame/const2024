import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const require = createRequire(import.meta.url);
const SP = require(path.join(root, "assets/js/svg_points.js"));

const svg = fs.readFileSync(path.join(root, "assets/textures/Котик.svg"), "utf8");
const pathMatch = svg.match(/<path[^>]*\sd\s*=\s*"([^"]+)"/i);
const vb = svg.match(/viewBox\s*=\s*"([^"]+)"/i);
const parts = vb[1].trim().split(/[\s,]+/).map(Number);
const vw = parts[2];
const vh = parts[3];

const parsed = SP.parsePath(pathMatch[1], { sampleCurves: false });
const normalized = SP.pixelsToNormalized(parsed.points, vw, vh);
const deduped = SP.dedupePoints(normalized, 0.02);
const const2 = JSON.parse(fs.readFileSync(path.join(root, "assets/json/const2.json"), "utf8"));

const report = {
    polylines: parsed.polylines.length,
    rawPoints: parsed.points.length,
    deduped: deduped.kept.length,
    const2: const2.vert.length,
    match: deduped.kept.length === const2.vert.length,
};
console.log(JSON.stringify(report, null, 2));
if (!report.match) {
    process.exitCode = 1;
}
