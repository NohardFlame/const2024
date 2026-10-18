import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const require = createRequire(import.meta.url);
const SP = require(path.join(root, "assets/js/svg_points.js"));

function vertsFromSvg(svgPath) {
    const t = fs.readFileSync(svgPath, "utf8");
    const m = t.match(/<path[^>]*\sd\s*=\s*"([^"]+)"/i);
    const vb = t.match(/viewBox\s*=\s*"([^"]+)"/i)[1].trim().split(/[\s,]+/).map(Number);
    const parsed = SP.parsePath(m[1], { sampleCurves: false });
    const norm = SP.pixelsToNormalized(parsed.points, vb[2], vb[3]);
    return {
        kept: SP.dedupePoints(norm, 0.02).kept,
        vw: vb[2],
        vh: vb[3],
    };
}

function score(constVerts, svgKept) {
    if (constVerts.length !== svgKept.length) {
        return { sameLen: false, lenC: constVerts.length, lenS: svgKept.length, avgDist: null, exact: 0 };
    }
    // match each const vert to nearest svg vert
    let sum = 0;
    let exact = 0;
    for (const c of constVerts) {
        let best = Infinity;
        for (const s of svgKept) {
            const d = Math.hypot(c[0] - s[0], c[1] - s[1]);
            if (d < best) best = d;
        }
        sum += best;
        if (best < 1e-6) exact++;
    }
    return {
        sameLen: true,
        avgDist: sum / constVerts.length,
        exact,
        maxOk: exact === constVerts.length,
    };
}

const pairs = [
    [5, "Олень.svg"],
    [5, "Собака.svg"],
    [8, "Собака.svg"],
    [8, "Олень.svg"],
    [2, "Котик.svg"],
];

for (const [idx, svgName] of pairs) {
    const cj = JSON.parse(fs.readFileSync(path.join(root, `assets/json/const${idx}.json`), "utf8"));
    const svg = vertsFromSvg(path.join(root, "assets/textures", svgName));
    const s = score(
        cj.vert.map((v) => [v[0], v[1]]),
        svg.kept
    );
    console.log(JSON.stringify({ const: idx, svg: svgName, svgFrame: [svg.vw, svg.vh], ...s }));
}

// tex vs svg frame for kotik
const tex2 = fs.readFileSync(path.join(root, "assets/textures/tex2.png"));
console.log(
    JSON.stringify({
        tex2: { w: tex2.readUInt32BE(16), h: tex2.readUInt32BE(20) },
        kotikSvg: vertsFromSvg(path.join(root, "assets/textures/Котик.svg")),
        note: "height mismatch causes editor underlay vs path drift",
    })
);
