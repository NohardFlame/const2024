import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const texDir = path.join(root, "assets/textures");

function pngSize(p) {
    const b = fs.readFileSync(p);
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

function svgVb(p) {
    const t = fs.readFileSync(p, "utf8");
    const vb = t.match(/viewBox\s*=\s*"([^"]+)"/i);
    if (!vb) return null;
    const parts = vb[1].trim().split(/[\s,]+/).map(Number);
    return { w: parts[2], h: parts[3] };
}

const pairs = [
    ["tex2.png", "Котик.svg"],
    ["tex5.png", "Олень.svg"],
    ["tex8.png", "Собака.svg"],
    ["tex0.png", "медведь.svg"],
    ["tex3.png", "Сова.svg"],
];

for (const [tex, svg] of pairs) {
    const t = pngSize(path.join(texDir, tex));
    const s = svgVb(path.join(texDir, svg));
    console.log(
        JSON.stringify({
            pair: `${tex} / ${svg}`,
            tex: t,
            svg: s,
            sameW: t.w === s.w,
            sameH: t.h === s.h,
            scaleIfStretch: { sx: t.w / s.w, sy: t.h / s.h },
        })
    );
}
