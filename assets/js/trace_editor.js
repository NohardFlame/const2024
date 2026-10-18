(() => {
    const SP = window.SvgPoints;
    if (!SP) {
        console.error("SvgPoints missing");
        return;
    }

    const editCanvas = document.getElementById("edit-canvas");
    const previewCanvas = document.getElementById("preview-canvas");
    const editCtx = editCanvas.getContext("2d");
    const previewCtx = previewCanvas.getContext("2d");
    const statusEl = document.getElementById("status");
    const previewStats = document.getElementById("preview-stats");

    const LS_CLASS = "traceSaveClassIndex";

    const state = {
        tool: "poly",
        bgImage: null,
        bgNaturalW: 0,
        bgNaturalH: 0,
        bgAlpha: 0.55,
        zoom: 1,
        panX: 0,
        panY: 0,
        crop: { x: 0, y: 0, w: 1, h: 1 },
        cropPct: { x: 0, y: 0, w: 100, h: 100 },
        epsilon: 0.02,
        strokes: [],
        beads: [],
        currentStroke: null,
        drawingStroke: false,
        lastStrokeSample: null,
        strokeMinDist: 6,
        history: [],
        future: [],
        spaceDown: false,
        panning: false,
        panLast: null,
        cropDragging: false,
        cropDragStart: null,
        bendDrag: null,
        moveDrag: null,
        classesMeta: null,
        librarySelected: null,
        archiveSelected: null,
        archiveItems: [],
        vertCountCache: {},
        lineStyle: {
            silhouetteColor: [0.75, 0.13, 0.13],
            silhouetteWidth: 1.2,
            silhouetteDash: "4 8 8 16 4 4",
        },
    };

    function setStatus(msg) {
        statusEl.textContent = msg || "";
    }

    function migrateAllStrokes() {
        state.strokes = state.strokes.map((s) => SP.migrateStroke(s));
        if (state.currentStroke) {
            state.currentStroke = SP.migrateStroke(state.currentStroke);
        }
    }

    function pushHistory() {
        state.history.push(
            JSON.stringify({
                strokes: state.strokes,
                beads: state.beads,
            })
        );
        if (state.history.length > 80) {
            state.history.shift();
        }
        state.future = [];
    }

    function restoreSnapshot(raw) {
        const data = JSON.parse(raw);
        state.strokes = (data.strokes || []).map((s) => SP.migrateStroke(s));
        state.beads = data.beads || [];
        state.currentStroke = null;
        state.bendDrag = null;
        state.moveDrag = null;
        redraw();
    }

    function undo() {
        if (!state.history.length) {
            return;
        }
        state.future.push(
            JSON.stringify({ strokes: state.strokes, beads: state.beads })
        );
        restoreSnapshot(state.history.pop());
    }

    function redo() {
        if (!state.future.length) {
            return;
        }
        state.history.push(
            JSON.stringify({ strokes: state.strokes, beads: state.beads })
        );
        restoreSnapshot(state.future.pop());
    }

    function syncCropFromPct() {
        const iw = state.bgNaturalW || 1;
        const ih = state.bgNaturalH || 1;
        const p = state.cropPct;
        state.crop.x = (p.x / 100) * iw;
        state.crop.y = (p.y / 100) * ih;
        state.crop.w = (p.w / 100) * iw;
        state.crop.h = (p.h / 100) * ih;
        if (state.crop.x + state.crop.w > iw) {
            state.crop.w = iw - state.crop.x;
        }
        if (state.crop.y + state.crop.h > ih) {
            state.crop.h = ih - state.crop.y;
        }
    }

    function frameSize() {
        return {
            w: Math.max(1, state.crop.w),
            h: Math.max(1, state.crop.h),
        };
    }

    function allImagePoints() {
        const pts = [];
        for (const s of state.strokes) {
            const m = SP.migrateStroke(s);
            for (const p of m.anchors) {
                pts.push([p[0], p[1]]);
            }
        }
        for (const b of state.beads) {
            pts.push([b[0], b[1]]);
        }
        return pts;
    }

    function imageToCropLocal(x, y) {
        return [x - state.crop.x, y - state.crop.y];
    }

    function pointsNormalized() {
        const frame = frameSize();
        const rawPx = allImagePoints().map((p) => imageToCropLocal(p[0], p[1]));
        const filtered = rawPx.filter(
            (p) => p[0] >= -1 && p[1] >= -1 && p[0] <= frame.w + 1 && p[1] <= frame.h + 1
        );
        const normalized = SP.pixelsToNormalized(filtered, frame.w, frame.h);
        return SP.dedupePoints(normalized, state.epsilon);
    }

    function findNearbyAnchor(imgX, imgY, maxPx) {
        let best = null;
        let bestD = maxPx;
        for (let si = 0; si < state.strokes.length; si++) {
            const s = SP.migrateStroke(state.strokes[si]);
            for (let ai = 0; ai < s.anchors.length; ai++) {
                const p = s.anchors[ai];
                const d = Math.hypot(p[0] - imgX, p[1] - imgY);
                if (d < bestD) {
                    bestD = d;
                    best = { strokeIndex: si, anchorIndex: ai, point: p, dist: d, source: "stroke" };
                }
            }
        }
        for (let bi = 0; bi < state.beads.length; bi++) {
            const p = state.beads[bi];
            const d = Math.hypot(p[0] - imgX, p[1] - imgY);
            if (d < bestD) {
                bestD = d;
                best = { strokeIndex: -1, anchorIndex: bi, point: p, dist: d, source: "bead" };
            }
        }
        if (state.currentStroke) {
            const s = SP.migrateStroke(state.currentStroke);
            for (let ai = 0; ai < s.anchors.length; ai++) {
                const p = s.anchors[ai];
                const d = Math.hypot(p[0] - imgX, p[1] - imgY);
                if (d < bestD) {
                    bestD = d;
                    best = {
                        strokeIndex: -2,
                        anchorIndex: ai,
                        point: p,
                        dist: d,
                        source: "current",
                    };
                }
            }
        }
        return best;
    }

    function distToSegment(px, py, ax, ay, bx, by) {
        const dx = bx - ax;
        const dy = by - ay;
        const len2 = dx * dx + dy * dy;
        if (len2 < 1e-9) {
            return { dist: Math.hypot(px - ax, py - ay), t: 0, x: ax, y: ay };
        }
        let t = ((px - ax) * dx + (py - ay) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const x = ax + t * dx;
        const y = ay + t * dy;
        return { dist: Math.hypot(px - x, py - y), t, x, y };
    }

    function hitTestEdge(imgX, imgY, maxPx) {
        let best = null;
        let bestD = maxPx;
        for (let si = 0; si < state.strokes.length; si++) {
            const s = SP.migrateStroke(state.strokes[si]);
            const n = SP.segmentCount(s);
            for (let i = 0; i < n; i++) {
                const { a, b, control } = SP.segmentEndpoints(s, i);
                if (!control) {
                    const hit = distToSegment(imgX, imgY, a[0], a[1], b[0], b[1]);
                    if (hit.dist < bestD) {
                        bestD = hit.dist;
                        best = {
                            strokeIndex: si,
                            segIndex: i,
                            t: hit.t,
                            point: [hit.x, hit.y],
                            kind: "edge",
                        };
                    }
                } else {
                    const steps = 24;
                    for (let sIdx = 0; sIdx <= steps; sIdx++) {
                        const t = sIdx / steps;
                        const p = SP.sampleCubic(a, control.c1, control.c2, b, t);
                        const d = Math.hypot(p[0] - imgX, p[1] - imgY);
                        if (d < bestD) {
                            bestD = d;
                            best = {
                                strokeIndex: si,
                                segIndex: i,
                                t,
                                point: p,
                                kind: "edge",
                            };
                        }
                    }
                    for (const [which, hp] of [
                        ["c1", control.c1],
                        ["c2", control.c2],
                    ]) {
                        const d = Math.hypot(hp[0] - imgX, hp[1] - imgY);
                        if (d < bestD) {
                            bestD = d;
                            best = {
                                strokeIndex: si,
                                segIndex: i,
                                handle: which,
                                point: hp,
                                kind: "handle",
                            };
                        }
                    }
                }
            }
        }
        return best;
    }

    function snapRadiusPx() {
        const frame = frameSize();
        const px = SP.epsilonToPixels(state.epsilon, frame.w, frame.h);
        return Math.max(px.x, px.y);
    }

    function screenToImage(sx, sy) {
        const rect = editCanvas.getBoundingClientRect();
        const x = (sx - rect.left - state.panX) / state.zoom;
        const y = (sy - rect.top - state.panY) / state.zoom;
        return [x, y];
    }

    function applyLineStyle(ctx, scaleForWidth, opts) {
        const ls = state.lineStyle;
        const minW = opts && opts.minWidth != null ? opts.minWidth : 0.5;
        const cap = opts && opts.lineCap ? opts.lineCap : "round";
        ctx.strokeStyle = SP.rgb01ToCss(ls.silhouetteColor);
        ctx.lineWidth = Math.max(minW, (ls.silhouetteWidth || 1) * (scaleForWidth || 1));
        ctx.setLineDash(SP.parseDashArray(ls.silhouetteDash));
        ctx.lineJoin = "round";
        // SVG default is butt; round caps fill dash gaps when bake width is inflated.
        ctx.lineCap = cap;
    }

    function resizeCanvas() {
        const main = editCanvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        const w = main.clientWidth;
        const h = main.clientHeight;
        editCanvas.width = Math.max(1, Math.floor(w * dpr));
        editCanvas.height = Math.max(1, Math.floor(h * dpr));
        editCanvas.style.width = w + "px";
        editCanvas.style.height = h + "px";
        editCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        redraw();
    }

    function fitView() {
        if (!state.bgImage) {
            return;
        }
        const main = editCanvas.parentElement;
        const w = main.clientWidth;
        const h = main.clientHeight;
        const iw = state.bgNaturalW;
        const ih = state.bgNaturalH;
        const z = Math.min(w / iw, h / ih) * 0.92;
        state.zoom = z;
        state.panX = (w - iw * z) / 2;
        state.panY = (h - ih * z) / 2;
    }

    function drawStrokePath(ctx, stroke) {
        const path = SP.strokeToPath2D(stroke, 0, 0);
        ctx.stroke(path);
    }

    function redraw() {
        migrateAllStrokes();
        const w = editCanvas.clientWidth;
        const h = editCanvas.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        editCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        editCtx.clearRect(0, 0, w, h);
        editCtx.fillStyle = "#05070c";
        editCtx.fillRect(0, 0, w, h);

        editCtx.save();
        editCtx.translate(state.panX, state.panY);
        editCtx.scale(state.zoom, state.zoom);

        if (state.bgImage) {
            editCtx.globalAlpha = state.bgAlpha;
            editCtx.drawImage(state.bgImage, 0, 0);
            editCtx.globalAlpha = 1;
        }

        const c = state.crop;
        editCtx.save();
        editCtx.fillStyle = "rgba(0,0,0,0.45)";
        const iw = state.bgNaturalW || w;
        const ih = state.bgNaturalH || h;
        editCtx.fillRect(0, 0, iw, c.y);
        editCtx.fillRect(0, c.y + c.h, iw, Math.max(0, ih - c.y - c.h));
        editCtx.fillRect(0, c.y, c.x, c.h);
        editCtx.fillRect(c.x + c.w, c.y, Math.max(0, iw - c.x - c.w), c.h);
        editCtx.strokeStyle = "rgba(255,220,120,0.9)";
        editCtx.lineWidth = 1.5 / state.zoom;
        editCtx.setLineDash([]);
        editCtx.strokeRect(c.x, c.y, c.w, c.h);
        editCtx.restore();

        const dedupePreview = pointsNormalized();
        const frame = frameSize();
        const localNorm = allImagePoints().map((p) => {
            const local = imageToCropLocal(p[0], p[1]);
            return SP.normalizePoint(local[0], local[1], frame.w, frame.h);
        });
        const mergeFlags = new Array(localNorm.length).fill(false);
        const keptIdx = [];
        for (let i = 0; i < localNorm.length; i++) {
            let merged = false;
            for (const j of keptIdx) {
                const a = localNorm[i];
                const b = localNorm[j];
                if (
                    Math.abs(a[0] - b[0]) <= state.epsilon &&
                    Math.abs(a[1] - b[1]) <= state.epsilon
                ) {
                    mergeFlags[i] = true;
                    merged = true;
                    break;
                }
            }
            if (!merged) {
                keptIdx.push(i);
            }
        }

        let pointIndex = 0;
        for (let si = 0; si < state.strokes.length; si++) {
            const m = SP.migrateStroke(state.strokes[si]);
            if (m.anchors.length >= 2) {
                // Re-apply before every stroke: handles/anchors clear dash, and SVG
                // imports are hundreds of short polylines — without this only the
                // first stroke kept the dash pattern.
                applyLineStyle(editCtx, 1 / state.zoom);
                drawStrokePath(editCtx, m);
            }
            // Bezier handles (not stars)
            editCtx.setLineDash([]);
            editCtx.strokeStyle = "rgba(120,180,255,0.7)";
            editCtx.fillStyle = "rgba(120,180,255,0.9)";
            editCtx.lineWidth = 1 / state.zoom;
            const nSeg = SP.segmentCount(m);
            for (let i = 0; i < nSeg; i++) {
                const ctrl = m.controls[i];
                if (!ctrl) {
                    continue;
                }
                const { a, b } = SP.segmentEndpoints(m, i);
                editCtx.beginPath();
                editCtx.moveTo(a[0], a[1]);
                editCtx.lineTo(ctrl.c1[0], ctrl.c1[1]);
                editCtx.moveTo(b[0], b[1]);
                editCtx.lineTo(ctrl.c2[0], ctrl.c2[1]);
                editCtx.stroke();
                for (const hp of [ctrl.c1, ctrl.c2]) {
                    editCtx.beginPath();
                    editCtx.arc(hp[0], hp[1], 2.4 / state.zoom, 0, Math.PI * 2);
                    editCtx.fill();
                }
            }
            for (let ai = 0; ai < m.anchors.length; ai++) {
                const p = m.anchors[ai];
                const merged = mergeFlags[pointIndex++];
                const moving = isMoveHighlight("anchor", si, ai);
                editCtx.setLineDash([]);
                editCtx.beginPath();
                editCtx.fillStyle = moving
                    ? "rgba(255,240,120,1)"
                    : merged
                      ? "rgba(160,160,160,0.9)"
                      : "rgba(255,70,70,0.95)";
                editCtx.arc(p[0], p[1], (moving ? 5 : 3.2) / state.zoom, 0, Math.PI * 2);
                editCtx.fill();
            }
        }
        for (let bi = 0; bi < state.beads.length; bi++) {
            const b = state.beads[bi];
            const merged = mergeFlags[pointIndex++];
            const moving = isMoveHighlight("bead", -1, bi);
            editCtx.setLineDash([]);
            editCtx.beginPath();
            editCtx.fillStyle = moving
                ? "rgba(255,240,120,1)"
                : merged
                  ? "rgba(160,160,160,0.9)"
                  : "rgba(255,200,80,0.95)";
            editCtx.arc(b[0], b[1], (moving ? 5.5 : 3.8) / state.zoom, 0, Math.PI * 2);
            editCtx.fill();
        }

        if (state.currentStroke && state.currentStroke.anchors.length) {
            const cur = SP.migrateStroke(state.currentStroke);
            if (cur.anchors.length >= 2) {
                applyLineStyle(editCtx, 1 / state.zoom);
                editCtx.strokeStyle = "rgba(255,140,140,0.95)";
                drawStrokePath(editCtx, cur);
            }
            editCtx.setLineDash([]);
            for (const p of cur.anchors) {
                editCtx.beginPath();
                editCtx.fillStyle = "rgba(255,140,140,0.95)";
                editCtx.arc(p[0], p[1], 3 / state.zoom, 0, Math.PI * 2);
                editCtx.fill();
            }
        }

        editCtx.restore();
        drawPreview();
        updateEpsLabel();
        const kept = dedupePreview.kept.length;
        const dropped = dedupePreview.dropped.length;
        previewStats.textContent =
            `Звёзд после дедупа: ${kept}` + (dropped ? ` (схлопнуто ${dropped})` : "");
    }

    function drawPreview() {
        const ctx = previewCtx;
        const W = previewCanvas.width;
        const H = previewCanvas.height;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "rgba(40,36,28,0.85)";
        ctx.fillRect(8, 20, W * 0.28, H * 0.7);
        ctx.strokeStyle = "rgba(200,170,90,0.5)";
        ctx.strokeRect(8, 20, W * 0.28, H * 0.7);

        const { kept } = pointsNormalized();
        const frame = frameSize();
        ctx.save();
        ctx.translate(W / 2, H / 2);
        const scale = Math.min(W, H) * 0.42;

        for (const s of state.strokes) {
            const m = SP.migrateStroke(s);
            if (m.anchors.length < 2) {
                continue;
            }
            applyLineStyle(ctx, 1);
            ctx.lineWidth = 1;
            ctx.beginPath();
            const n = SP.segmentCount(m);
            const firstLocal = imageToCropLocal(m.anchors[0][0], m.anchors[0][1]);
            const firstN = SP.normalizePoint(firstLocal[0], firstLocal[1], frame.w, frame.h);
            const firstB = SP.toBoardCoords(firstN[0], firstN[1], 1, 1);
            ctx.moveTo(firstB[0] * scale, -firstB[1] * scale);
            for (let i = 0; i < n; i++) {
                const { a, b, control } = SP.segmentEndpoints(m, i);
                if (control) {
                    const steps = 12;
                    for (let k = 1; k <= steps; k++) {
                        const t = k / steps;
                        const p = SP.sampleCubic(a, control.c1, control.c2, b, t);
                        const local = imageToCropLocal(p[0], p[1]);
                        const nn = SP.normalizePoint(local[0], local[1], frame.w, frame.h);
                        const bb = SP.toBoardCoords(nn[0], nn[1], 1, 1);
                        ctx.lineTo(bb[0] * scale, -bb[1] * scale);
                    }
                } else {
                    const local = imageToCropLocal(b[0], b[1]);
                    const nn = SP.normalizePoint(local[0], local[1], frame.w, frame.h);
                    const bb = SP.toBoardCoords(nn[0], nn[1], 1, 1);
                    ctx.lineTo(bb[0] * scale, -bb[1] * scale);
                }
            }
            ctx.stroke();
        }
        ctx.setLineDash([]);

        for (const n of kept) {
            const b = SP.toBoardCoords(n[0], n[1], 1, 1);
            ctx.beginPath();
            ctx.fillStyle = "#ffd27a";
            ctx.arc(b[0] * scale, -b[1] * scale, 2.4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function updateEpsLabel() {
        const frame = frameSize();
        const px = SP.epsilonToPixels(state.epsilon, frame.w, frame.h);
        document.getElementById("eps-val").textContent = state.epsilon.toFixed(3);
        document.getElementById("eps-px").textContent = `≈ ${px.x.toFixed(1)} × ${px.y.toFixed(
            1
        )} px на кадре кропа`;
    }

    function finishCurrentStroke(close) {
        if (!state.currentStroke || state.currentStroke.anchors.length < 1) {
            state.currentStroke = null;
            return;
        }
        pushHistory();
        let s = SP.migrateStroke(state.currentStroke);
        if (close && s.anchors.length >= 3) {
            const first = s.anchors[0];
            const last = s.anchors[s.anchors.length - 1];
            if (Math.hypot(first[0] - last[0], first[1] - last[1]) < 0.5) {
                s.anchors.pop();
                if (s.controls.length >= s.anchors.length) {
                    s.controls.pop();
                }
            }
            s.closed = true;
            while (s.controls.length < s.anchors.length) {
                s.controls.push(null);
            }
            s.controls.length = s.anchors.length;
        } else {
            s.closed = false;
            const need = Math.max(0, s.anchors.length - 1);
            while (s.controls.length < need) {
                s.controls.push(null);
            }
            s.controls.length = need;
        }
        state.strokes.push(s);
        state.currentStroke = null;
        state.drawingStroke = false;
        state.lastStrokeSample = null;
        redraw();
    }

    function addPointToCurrent(imgX, imgY, allowSnap) {
        let x = imgX;
        let y = imgY;
        if (allowSnap) {
            const near = findNearbyAnchor(imgX, imgY, snapRadiusPx());
            if (near && state.currentStroke && state.currentStroke.anchors.length >= 1) {
                x = near.point[0];
                y = near.point[1];
                const first = state.currentStroke.anchors[0];
                const snapsToFirst = Math.hypot(first[0] - x, first[1] - y) < 0.5;
                if (snapsToFirst && state.currentStroke.anchors.length >= 3) {
                    finishCurrentStroke(true);
                    return;
                }
                const last = state.currentStroke.anchors[state.currentStroke.anchors.length - 1];
                if (Math.hypot(last[0] - x, last[1] - y) >= 0.5) {
                    state.currentStroke.anchors.push([x, y]);
                    state.currentStroke.controls.push(null);
                }
                finishCurrentStroke(false);
                return;
            }
            if (near && (!state.currentStroke || state.currentStroke.anchors.length === 0)) {
                x = near.point[0];
                y = near.point[1];
            } else if (near) {
                x = near.point[0];
                y = near.point[1];
            }
        }
        if (!state.currentStroke) {
            state.currentStroke = { closed: false, anchors: [], controls: [] };
        }
        const pts = state.currentStroke.anchors;
        if (pts.length) {
            const last = pts[pts.length - 1];
            if (Math.hypot(last[0] - x, last[1] - y) < 0.5) {
                return;
            }
            state.currentStroke.controls.push(null);
        }
        pts.push([x, y]);
        redraw();
    }

    function isMoveHighlight(kind, strokeIndex, index) {
        if (!state.moveDrag || !state.moveDrag.refs) {
            return false;
        }
        return state.moveDrag.refs.some(
            (r) =>
                r.kind === kind &&
                (kind === "bead" ? r.bi === index : r.si === strokeIndex && r.ai === index)
        );
    }

    function beginMoveAt(imgX, imgY) {
        const near = findNearbyAnchor(imgX, imgY, snapRadiusPx());
        if (!near) {
            return;
        }
        const ox = near.point[0];
        const oy = near.point[1];
        const r = snapRadiusPx();
        const refs = [];
        for (let si = 0; si < state.strokes.length; si++) {
            const s = SP.migrateStroke(state.strokes[si]);
            state.strokes[si] = s;
            for (let ai = 0; ai < s.anchors.length; ai++) {
                const p = s.anchors[ai];
                if (Math.hypot(p[0] - ox, p[1] - oy) <= r) {
                    refs.push({ kind: "anchor", si, ai });
                }
            }
        }
        for (let bi = 0; bi < state.beads.length; bi++) {
            const p = state.beads[bi];
            if (Math.hypot(p[0] - ox, p[1] - oy) <= r) {
                refs.push({ kind: "bead", bi });
            }
        }
        if (!refs.length) {
            return;
        }
        pushHistory();
        state.moveDrag = { refs, lastX: imgX, lastY: imgY };
        redraw();
    }

    function updateMove(imgX, imgY) {
        if (!state.moveDrag) {
            return;
        }
        const dx = imgX - state.moveDrag.lastX;
        const dy = imgY - state.moveDrag.lastY;
        if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) {
            return;
        }
        for (const r of state.moveDrag.refs) {
            if (r.kind === "anchor") {
                const s = state.strokes[r.si];
                if (!s || !s.anchors[r.ai]) {
                    continue;
                }
                s.anchors[r.ai][0] += dx;
                s.anchors[r.ai][1] += dy;
            } else if (r.kind === "bead") {
                const b = state.beads[r.bi];
                if (!b) {
                    continue;
                }
                b[0] += dx;
                b[1] += dy;
            }
        }
        state.moveDrag.lastX = imgX;
        state.moveDrag.lastY = imgY;
        redraw();
    }

    function beginBendAt(imgX, imgY) {
        const hit = hitTestEdge(imgX, imgY, Math.max(10 / state.zoom, snapRadiusPx()));
        if (!hit) {
            return;
        }
        pushHistory();
        const s = SP.migrateStroke(state.strokes[hit.strokeIndex]);
        state.strokes[hit.strokeIndex] = s;
        if (hit.kind === "handle") {
            state.bendDrag = {
                strokeIndex: hit.strokeIndex,
                segIndex: hit.segIndex,
                handle: hit.handle,
            };
            return;
        }
        let ctrl = s.controls[hit.segIndex];
        if (!ctrl) {
            const { a, b } = SP.segmentEndpoints(s, hit.segIndex);
            const gx = hit.point[0];
            const gy = hit.point[1];
            ctrl = {
                c1: [a[0] + (gx - a[0]) * (2 / 3), a[1] + (gy - a[1]) * (2 / 3)],
                c2: [b[0] + (gx - b[0]) * (2 / 3), b[1] + (gy - b[1]) * (2 / 3)],
            };
            s.controls[hit.segIndex] = ctrl;
        }
        state.bendDrag = {
            strokeIndex: hit.strokeIndex,
            segIndex: hit.segIndex,
            handle: "both",
        };
        redraw();
    }

    function updateBend(imgX, imgY) {
        if (!state.bendDrag) {
            return;
        }
        const s = state.strokes[state.bendDrag.strokeIndex];
        if (!s) {
            return;
        }
        const ctrl = s.controls[state.bendDrag.segIndex];
        if (!ctrl) {
            return;
        }
        if (state.bendDrag.handle === "c1") {
            ctrl.c1 = [imgX, imgY];
        } else if (state.bendDrag.handle === "c2") {
            ctrl.c2 = [imgX, imgY];
        } else {
            const { a, b } = SP.segmentEndpoints(s, state.bendDrag.segIndex);
            ctrl.c1 = [a[0] + (imgX - a[0]) * (2 / 3), a[1] + (imgY - a[1]) * (2 / 3)];
            ctrl.c2 = [b[0] + (imgX - b[0]) * (2 / 3), b[1] + (imgY - b[1]) * (2 / 3)];
        }
        redraw();
    }

    function loadImageFile(file) {
        if (!file) {
            return;
        }
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            state.bgImage = img;
            state.bgNaturalW = img.naturalWidth || img.width;
            state.bgNaturalH = img.naturalHeight || img.height;
            state.cropPct = { x: 0, y: 0, w: 100, h: 100 };
            syncCropFromPct();
            syncCropSliders();
            fitView();
            redraw();
            setStatus(`Подложка: ${file.name} (${state.bgNaturalW}×${state.bgNaturalH})`);
            URL.revokeObjectURL(url);
        };
        img.onerror = () => {
            setStatus("Не удалось загрузить изображение");
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }

    function loadSvgFile(file) {
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            applySvgText(String(reader.result || ""), file.name);
        };
        reader.readAsText(file);
    }

    /**
     * Bake underlay into SVG viewBox size by stretching (not cover).
     * Board maps tex UV onto the same [-1,1] frame as verts from the SVG —
     * so path pixels and silhouette must share that frame, even if PNG aspect differs
     * (e.g. Котик.svg 838×952 vs tex2 838×1001).
     */
    function makeFrameCanvas(vw, vh, underlayImg) {
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(vw));
        c.height = Math.max(1, Math.round(vh));
        const cx = c.getContext("2d");
        cx.fillStyle = "#111";
        cx.fillRect(0, 0, c.width, c.height);
        if (underlayImg) {
            cx.imageSmoothingEnabled = true;
            cx.drawImage(underlayImg, 0, 0, c.width, c.height);
        }
        return c;
    }

    function setBgFromCanvas(canvas, then) {
        const img = new Image();
        img.onload = () => {
            state.bgImage = img;
            state.bgNaturalW = canvas.width;
            state.bgNaturalH = canvas.height;
            state.cropPct = { x: 0, y: 0, w: 100, h: 100 };
            syncCropFromPct();
            syncCropSliders();
            fitView();
            if (then) {
                then();
            }
        };
        img.src = canvas.toDataURL();
    }

    function applySvgText(text, label) {
        const vbMatch = text.match(/viewBox\s*=\s*"([^"]+)"/i);
        const wMatch = text.match(/\bwidth\s*=\s*"([\d.]+)"/i);
        const hMatch = text.match(/\bheight\s*=\s*"([\d.]+)"/i);
        let vw = 0;
        let vh = 0;
        if (vbMatch) {
            const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
            vw = parts[2];
            vh = parts[3];
        } else {
            vw = wMatch ? Number(wMatch[1]) : 1000;
            vh = hMatch ? Number(hMatch[1]) : 1000;
        }
        const pathMatch = text.match(/<path[^>]*\sd\s*=\s*"([^"]+)"/i);
        if (!pathMatch) {
            setStatus("В SVG не найден path");
            return;
        }
        const dashMatch = text.match(/stroke-dasharray\s*=\s*"([^"]+)"/i);
        const widthMatch = text.match(/stroke-width\s*=\s*"([\d.]+)"/i);
        if (dashMatch) {
            state.lineStyle.silhouetteDash = dashMatch[1].trim();
            const dashInput = document.getElementById("sil-dash");
            if (dashInput) {
                dashInput.value = state.lineStyle.silhouetteDash;
            }
        }
        if (widthMatch) {
            state.lineStyle.silhouetteWidth = Math.max(0.2, Number(widthMatch[1]) || 1.2);
            const wInput = document.getElementById("sil-width");
            if (wInput) {
                wInput.value = state.lineStyle.silhouetteWidth;
                document.getElementById("sil-width-val").textContent =
                    state.lineStyle.silhouetteWidth.toFixed(1);
            }
        }
        // Anchors only: do not sample cubics into extra stars
        const parsed = SP.parsePath(pathMatch[1], { sampleCurves: false });
        pushHistory();
        state.strokes = [];
        state.beads = [];
        for (const line of parsed.polylines) {
            if (line.length) {
                state.strokes.push(
                    SP.migrateStroke({
                        points: line.map((p) => [p[0], p[1]]),
                        closed: false,
                    })
                );
            }
        }
        const afterLoad = () => {
            redraw();
            const { kept } = pointsNormalized();
            setStatus(
                `Импорт SVG${label ? " " + label : ""}: ${state.strokes.length} штрихов, ${kept.length} якорей после дедупа`
            );
        };
        // Always place path in SVG viewBox frame; rebake any tex underlay into that frame
        const underlay = state.bgImage;
        const frame = makeFrameCanvas(vw, vh, underlay);
        setBgFromCanvas(frame, afterLoad);
    }

    function syncCropSliders() {
        document.getElementById("crop-x").value = state.cropPct.x;
        document.getElementById("crop-y").value = state.cropPct.y;
        document.getElementById("crop-w").value = state.cropPct.w;
        document.getElementById("crop-h").value = state.cropPct.h;
        document.getElementById("crop-x-val").textContent = state.cropPct.x;
        document.getElementById("crop-y-val").textContent = state.cropPct.y;
        document.getElementById("crop-w-val").textContent = state.cropPct.w;
        document.getElementById("crop-h-val").textContent = state.cropPct.h;
    }

    function getSelectedClassIndex() {
        const sel = document.getElementById("save-class");
        if (sel && sel.value !== "") {
            return Number(sel.value);
        }
        const legacy = document.getElementById("const-index");
        return Number(legacy && legacy.value) || 0;
    }

    function buildJsonObject(index) {
        const { kept } = pointsNormalized();
        const idx = index == null ? getSelectedClassIndex() : index;
        return {
            index: idx,
            obj: {
                number: 0,
                vert: kept.map((p) => [p[0], p[1]]),
            },
        };
    }

    async function maybeMergeExistingTexts(vert, idx) {
        try {
            const res = await fetch(`assets/json/const${idx}.json?_=${Date.now()}`);
            if (!res.ok) {
                return { vert, number: 0, warned: false };
            }
            const old = await res.json();
            if (!old || !Array.isArray(old.vert)) {
                return { vert, number: 0, warned: false };
            }
            if (old.vert.length !== vert.length) {
                return {
                    vert,
                    number: 0,
                    warned: true,
                    message: `Число точек изменилось (${old.vert.length} → ${vert.length}). Тексты достижений не перенесены.`,
                };
            }
            for (let i = 0; i < vert.length; i++) {
                if (old.vert[i][2] != null) {
                    vert[i][2] = old.vert[i][2];
                }
                if (old.vert[i][3] != null) {
                    vert[i][3] = old.vert[i][3];
                }
                if (old.vert[i][4] != null) {
                    vert[i][4] = old.vert[i][4];
                }
            }
            const number =
                typeof old.number === "number"
                    ? old.number
                    : vert.filter((v) => v[2] && v[3] && v[2] !== "DELETED").length;
            return { vert, number, warned: false };
        } catch (e) {
            return { vert, number: 0, warned: false };
        }
    }

    function downloadText(filename, text, mime) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([text], { type: mime || "application/json" }));
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function downloadBlob(filename, blob) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function hasDrawableStrokes() {
        return state.strokes.some((s) => SP.migrateStroke(s).anchors.length >= 2);
    }

    function renderSilhouettePng() {
        const frame = frameSize();
        const out = document.createElement("canvas");
        out.width = Math.max(2, Math.round(frame.w));
        out.height = Math.max(2, Math.round(frame.h));
        const ctx = out.getContext("2d");
        // Transparent background — board shader masks by red channel and discards dark pixels.
        ctx.clearRect(0, 0, out.width, out.height);
        // Bake in SVG viewBox units (same as editor path coords): do NOT inflate
        // stroke width — old Math.max(1, w/700*…) turned 0.2+dash into a solid blob
        // that no longer matched the editor / original SVG on the main board.
        const bakeOpts = { minWidth: 0.05, lineCap: "butt" };
        for (const s of state.strokes) {
            const m = SP.migrateStroke(s);
            if (m.anchors.length < 2) {
                continue;
            }
            applyLineStyle(ctx, 1, bakeOpts);
            const path = SP.strokeToPath2D(m, state.crop.x, state.crop.y);
            ctx.stroke(path);
        }
        ctx.setLineDash([]);
        ctx.fillStyle = SP.rgb01ToCss(state.lineStyle.silhouetteColor);
        for (const b of state.beads) {
            const local = imageToCropLocal(b[0], b[1]);
            ctx.beginPath();
            ctx.arc(local[0], local[1], Math.max(1.5, out.width / 400), 0, Math.PI * 2);
            ctx.fill();
        }
        return out;
    }

    async function blobToPngBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = String(reader.result || "");
                resolve(dataUrl.split(",")[1] || "");
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Bake outline from strokes when present.
     * If editor has only beads, try animal SVG (Олень_2026 → Олень.svg) so we never
     * keep a stale tex from another constellation on the board.
     */
    async function resolveTexForSave(classIndex, animalName) {
        if (hasDrawableStrokes()) {
            const canvas = renderSilhouettePng();
            const packed = await canvasToPngBase64(canvas);
            return { ...packed, mode: "baked" };
        }
        if (animalName) {
            const loaded = await tryLoadAnimalSvg(animalName, null);
            if (loaded && hasDrawableStrokes()) {
                const canvas = renderSilhouettePng();
                const packed = await canvasToPngBase64(canvas);
                return { ...packed, mode: "baked-from-svg" };
            }
        }
        try {
            const res = await fetch(`assets/textures/tex${classIndex}.png?_=${Date.now()}`);
            if (res.ok) {
                const blob = await res.blob();
                if (blob && blob.size > 64) {
                    const b64 = await blobToPngBase64(blob);
                    if (b64) {
                        return { blob, b64, mode: "kept" };
                    }
                }
            }
        } catch (e) {
            /* fall through */
        }
        const canvas = renderSilhouettePng();
        const packed = await canvasToPngBase64(canvas);
        return { ...packed, mode: "beads-fallback" };
    }

    async function canvasToPngBase64(canvas) {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error("PNG blob failed"));
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = String(reader.result || "");
                    const b64 = dataUrl.split(",")[1] || "";
                    resolve({ blob, b64 });
                };
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(blob);
            }, "image/png");
        });
    }

    async function postAssetSaver(payload) {
        const response = await fetch("AssetSaver.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const text = await response.text();
        if (!response.ok) {
            throw new Error(text || "HTTP " + response.status);
        }
        try {
            return JSON.parse(text);
        } catch (e) {
            return { ok: true, raw: text };
        }
    }

    async function saveConstellation(name, classIndex) {
        const built = buildJsonObject(classIndex);
        const merged = await maybeMergeExistingTexts(built.obj.vert, classIndex);
        built.obj.vert = merged.vert;
        built.obj.number = merged.number;
        if (merged.warned && merged.message) {
            setStatus(merged.message);
        }
        const texPacked = await resolveTexForSave(classIndex, name);
        const { blob, b64 } = texPacked;
        const jsonName = `const${classIndex}`;
        const texName = `tex${classIndex}`;
        const jsonStr = JSON.stringify(built.obj);
        const texNote =
            texPacked.mode === "kept"
                ? ", tex сохранён как был (не найден SVG/путь — проверьте имя животного)"
                : texPacked.mode === "baked-from-svg"
                  ? `, ${texName}.png из SVG`
                  : texPacked.mode === "beads-fallback"
                    ? ", tex только из бусин (загрузите SVG-обводку)"
                    : `, ${texName}.png`;

        try {
            const result = await postAssetSaver({
                action: "save_all",
                constName: jsonName,
                texName: texName,
                obj: jsonStr,
                pngBase64: b64,
                animal: name,
                classIndex: classIndex,
                archiveBefore: true,
                archiveReason: "save",
            });
            try {
                localStorage.setItem(LS_CLASS, String(classIndex));
            } catch (e) {
                /* ignore */
            }
            state.vertCountCache[classIndex] = built.obj.vert.length;
            const archNote = formatArchiveNote(result && result.archive);
            setStatus(
                `Сохранено: ${jsonName}.json (${built.obj.vert.length} вершин)` +
                    texNote +
                    `, имя «${name}»` +
                    archNote
            );
            await loadArchiveList();
            return { mode: "server" };
        } catch (e) {
            await archiveSlotClientFallback(classIndex, "save");
            downloadText(`${jsonName}.json`, JSON.stringify(built.obj, null, 2));
            downloadBlob(`${texName}.png`, blob);
            setStatus(
                `PHP недоступен — скачаны ${jsonName}.json и ${texName}.png (и архив прежнего слота, если был). Положите файлы в assets/.`
            );
            return { mode: "download" };
        }
    }

    function formatArchiveNote(archive) {
        if (!archive || archive.skipped) {
            return "";
        }
        if (archive.id) {
            return ` · в архив: ${archive.id}`;
        }
        return "";
    }

    async function archiveSlotClientFallback(classIndex, reason) {
        try {
            const res = await fetch(`assets/json/const${classIndex}.json?_=${Date.now()}`);
            if (!res.ok) {
                return;
            }
            const obj = await res.json();
            if (!obj || !Array.isArray(obj.vert) || !obj.vert.length) {
                return;
            }
            const slots = librarySlots();
            const slot = slots.find((s) => s.gridIndex === classIndex);
            const animal = (slot && slot.animal) || "unnamed";
            const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
            downloadText(
                `archive_${stamp}_const${classIndex}_${animal}_const.json`,
                JSON.stringify(obj, null, 2)
            );
            try {
                const texRes = await fetch(`assets/textures/tex${classIndex}.png?_=${Date.now()}`);
                if (texRes.ok) {
                    downloadBlob(
                        `archive_${stamp}_const${classIndex}_${animal}_tex.png`,
                        await texRes.blob()
                    );
                }
            } catch (e) {
                /* optional */
            }
            downloadText(
                `archive_${stamp}_const${classIndex}_${animal}_meta.json`,
                JSON.stringify(
                    {
                        fromIndex: classIndex,
                        animal,
                        vertCount: obj.vert.length,
                        archivedAt: new Date().toISOString(),
                        reason,
                        note: "Положите в assets/archive/<id>/ как const.json, tex.png, meta.json",
                    },
                    null,
                    2
                )
            );
        } catch (e) {
            /* ignore */
        }
    }

    async function loadArchiveList() {
        try {
            const result = await postAssetSaver({ action: "list_archive" });
            state.archiveItems = (result && result.items) || [];
        } catch (e) {
            state.archiveItems = [];
        }
        renderArchiveList();
    }

    function renderArchiveList() {
        const root = document.getElementById("archive-library");
        if (!root) {
            return;
        }
        root.innerHTML = "";
        if (!state.archiveItems.length) {
            const empty = document.createElement("p");
            empty.className = "trace-hint";
            empty.textContent = "Пока пусто (нужен PHP / AssetSaver).";
            root.appendChild(empty);
            const actions = document.getElementById("archive-actions");
            if (actions) {
                actions.hidden = true;
            }
            return;
        }
        for (const item of state.archiveItems) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "trace-library__row";
            if (state.archiveSelected === item.id) {
                btn.classList.add("is-active");
            }
            const title = document.createElement("span");
            title.className = "trace-library__title";
            const animal = item.animal || "без имени";
            title.textContent = `${animal} · было const${item.fromIndex}`;
            const meta = document.createElement("span");
            meta.className = "trace-library__meta";
            const when = item.archivedAt ? String(item.archivedAt).slice(0, 16).replace("T", " ") : "";
            meta.textContent = `${item.vertCount || "?"}★ · ${when}`;
            btn.appendChild(title);
            btn.appendChild(meta);
            btn.addEventListener("click", () => {
                state.archiveSelected = item.id;
                document.getElementById("archive-restore-panel").hidden = true;
                renderArchiveList();
            });
            root.appendChild(btn);
        }
        const actions = document.getElementById("archive-actions");
        if (actions) {
            actions.hidden = state.archiveSelected == null;
        }
    }

    function selectedArchiveItem() {
        return state.archiveItems.find((i) => i.id === state.archiveSelected) || null;
    }

    async function openArchiveInEditor(item) {
        if (!item || !item.constUrl) {
            setStatus("Нет данных архива");
            return;
        }
        try {
            if (item.texUrl) {
                const texRes = await fetch(item.texUrl + `?_=${Date.now()}`);
                if (texRes.ok) {
                    const blob = await texRes.blob();
                    const url = URL.createObjectURL(blob);
                    await new Promise((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => {
                            state.bgImage = img;
                            state.bgNaturalW = img.naturalWidth || img.width;
                            state.bgNaturalH = img.naturalHeight || img.height;
                            state.cropPct = { x: 0, y: 0, w: 100, h: 100 };
                            syncCropFromPct();
                            syncCropSliders();
                            fitView();
                            URL.revokeObjectURL(url);
                            resolve();
                        };
                        img.onerror = reject;
                        img.src = url;
                    });
                }
            }
            const res = await fetch(item.constUrl + `?_=${Date.now()}`);
            if (!res.ok) {
                setStatus("Не удалось загрузить const из архива");
                return;
            }
            const data = await res.json();
            const verts = data.vert || [];
            if (!state.bgImage) {
                const c = document.createElement("canvas");
                c.width = 800;
                c.height = 800;
                const cx = c.getContext("2d");
                cx.fillStyle = "#111";
                cx.fillRect(0, 0, c.width, c.height);
                await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        state.bgImage = img;
                        state.bgNaturalW = c.width;
                        state.bgNaturalH = c.height;
                        state.cropPct = { x: 0, y: 0, w: 100, h: 100 };
                        syncCropFromPct();
                        syncCropSliders();
                        fitView();
                        resolve();
                    };
                    img.src = c.toDataURL();
                });
            }
            let usedSvg = false;
            if (item.animal) {
                usedSvg = await tryLoadAnimalSvg(item.animal, verts.length);
            }
            if (!usedSvg) {
                pushHistory();
                state.strokes = [];
                state.beads = verts.map((v) => {
                    const frame = frameSize();
                    const lx = ((v[0] + 1) / 2) * frame.w;
                    const ly = ((1 - v[1]) / 2) * frame.h;
                    return [lx + state.crop.x, ly + state.crop.y];
                });
                redraw();
            }
            setStatus(
                `Архив «${item.animal || item.id}»: ${verts.length} точек` +
                    (usedSvg ? " (SVG-сетка)" : " (бусины)") +
                    (item.fromIndex != null ? ` · было const${item.fromIndex}` : "")
            );
        } catch (e) {
            setStatus("Ошибка архива: " + (e && e.message ? e.message : e));
        }
    }

    async function restoreArchiveToClass(item, dst) {
        if (!item) {
            return;
        }
        try {
            const result = await postAssetSaver({
                action: "restore_archive",
                archiveId: item.id,
                classIndex: dst,
            });
            state.vertCountCache[dst] = undefined;
            await loadClassesMeta();
            fillClassSelects();
            await loadArchiveList();
            setStatus(
                `Восстановлено в const${dst}` +
                    (result.animal ? ` «${result.animal}»` : "") +
                    formatArchiveNote(result.archive)
            );
        } catch (e) {
            setStatus("Восстановление не удалось (нужен PHP): " + (e && e.message ? e.message : e));
        }
    }

    async function loadClassesMeta() {
        try {
            const res = await fetch(`assets/json/classes.json?_=${Date.now()}`);
            if (!res.ok) {
                return null;
            }
            state.classesMeta = await res.json();
            return state.classesMeta;
        } catch (e) {
            return null;
        }
    }

    function librarySlots() {
        const classes = (state.classesMeta && state.classesMeta.classes) || [];
        const slots = [];
        if (classes.length) {
            for (const c of classes) {
                slots.push({
                    gridIndex: c.gridIndex,
                    label: c.label || `const${c.gridIndex}`,
                    animal: c.animal || "",
                });
            }
            slots.push({ gridIndex: 9, label: "дом", animal: "" });
        } else {
            for (let i = 0; i <= 9; i++) {
                slots.push({ gridIndex: i, label: `const${i}`, animal: "" });
            }
        }
        return slots;
    }

    function fillClassSelects() {
        const sel = document.getElementById("save-class");
        if (!sel) {
            return;
        }
        const slots = librarySlots();
        let saved = 2;
        try {
            const raw = localStorage.getItem(LS_CLASS);
            if (raw != null) {
                saved = Number(raw);
            }
        } catch (e) {
            /* ignore */
        }
        sel.innerHTML = "";
        for (const c of slots) {
            const opt = document.createElement("option");
            opt.value = String(c.gridIndex);
            const animal = c.animal ? ` — ${c.animal}` : "";
            opt.textContent = `${c.label} (const${c.gridIndex})${animal}`;
            sel.appendChild(opt);
        }
        sel.value = String(saved);
        const nameInput = document.getElementById("save-name");
        if (nameInput) {
            const cur = slots.find((c) => c.gridIndex === saved);
            if (cur && cur.animal) {
                nameInput.value = cur.animal;
            }
        }
        renderLibraryList();
    }

    async function fetchVertCount(idx) {
        if (state.vertCountCache[idx] != null) {
            return state.vertCountCache[idx];
        }
        try {
            const res = await fetch(`assets/json/const${idx}.json?_=${Date.now()}`);
            if (!res.ok) {
                state.vertCountCache[idx] = 0;
                return 0;
            }
            const data = await res.json();
            const n = Array.isArray(data.vert) ? data.vert.length : 0;
            state.vertCountCache[idx] = n;
            return n;
        } catch (e) {
            state.vertCountCache[idx] = 0;
            return 0;
        }
    }

    function renderLibraryList() {
        const root = document.getElementById("const-library");
        if (!root) {
            return;
        }
        const slots = librarySlots();
        root.innerHTML = "";
        for (const slot of slots) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "trace-library__row";
            if (state.librarySelected === slot.gridIndex) {
                btn.classList.add("is-active");
            }
            btn.dataset.index = String(slot.gridIndex);
            const name = slot.animal || "без имени";
            const title = document.createElement("span");
            title.className = "trace-library__title";
            title.textContent = `${slot.label} · ${name}`;
            const meta = document.createElement("span");
            meta.className = "trace-library__meta";
            meta.textContent = `const${slot.gridIndex} · …★`;
            btn.appendChild(title);
            btn.appendChild(meta);
            btn.addEventListener("click", () => {
                state.librarySelected = slot.gridIndex;
                document.getElementById("library-copy-panel").hidden = true;
                renderLibraryList();
                const actions = document.getElementById("library-actions");
                if (actions) {
                    actions.hidden = false;
                }
            });
            root.appendChild(btn);
            fetchVertCount(slot.gridIndex).then((n) => {
                meta.textContent = `const${slot.gridIndex} · ${n}★`;
            });
        }
        const actions = document.getElementById("library-actions");
        if (actions) {
            actions.hidden = state.librarySelected == null;
        }
    }

    async function tryLoadTexAsBg(idx) {
        try {
            const res = await fetch(`assets/textures/tex${idx}.png?_=${Date.now()}`);
            if (!res.ok) {
                return false;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    state.bgImage = img;
                    state.bgNaturalW = img.naturalWidth || img.width;
                    state.bgNaturalH = img.naturalHeight || img.height;
                    state.cropPct = { x: 0, y: 0, w: 100, h: 100 };
                    syncCropFromPct();
                    syncCropSliders();
                    fitView();
                    URL.revokeObjectURL(url);
                    resolve();
                };
                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    reject(new Error("tex load failed"));
                };
                img.src = url;
            });
            return true;
        } catch (e) {
            return false;
        }
    }

    function svgDedupeCount(text) {
        const pathMatch = text.match(/<path[^>]*\sd\s*=\s*"([^"]+)"/i);
        if (!pathMatch) {
            return null;
        }
        const vbMatch = text.match(/viewBox\s*=\s*"([^"]+)"/i);
        let vw = 1000;
        let vh = 1000;
        if (vbMatch) {
            const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
            vw = parts[2];
            vh = parts[3];
        }
        const parsed = SP.parsePath(pathMatch[1], { sampleCurves: false });
        const norm = SP.pixelsToNormalized(parsed.points, vw, vh);
        return SP.dedupePoints(norm, state.epsilon).kept.length;
    }

    function animalSvgNameCandidates(animal) {
        const raw = String(animal || "").trim();
        if (!raw) {
            return [];
        }
        const names = [];
        const push = (n) => {
            if (n && !names.includes(n)) {
                names.push(n);
            }
        };
        push(raw);
        // «Олень_2026» → «Олень» (файлы SVG без суффикса года)
        push(raw.replace(/_\d{4}$/u, ""));
        const base = raw.replace(/_\d{4}$/u, "");
        const aliases = {
            Кролик: ["Заяц"],
            кролик: ["Заяц"],
        };
        for (const a of aliases[base] || aliases[raw] || []) {
            push(a);
        }
        return names;
    }

    async function tryLoadAnimalSvg(animal, expectedVerts) {
        if (!animal) {
            return false;
        }
        const names = animalSvgNameCandidates(animal);
        const urls = [];
        for (const name of names) {
            urls.push(`assets/textures/${name}.svg`);
            urls.push(`assets/textures/${encodeURIComponent(name)}.svg`);
        }
        let lastMismatch = null;
        for (const url of urls) {
            try {
                const res = await fetch(url + `?_=${Date.now()}`);
                if (!res.ok) {
                    continue;
                }
                const text = await res.text();
                if (expectedVerts != null) {
                    const n = svgDedupeCount(text);
                    if (n != null && n !== expectedVerts) {
                        lastMismatch = { url, n, expectedVerts };
                        continue;
                    }
                }
                applySvgText(text, url.split("/").pop());
                return true;
            } catch (e) {
                /* try next */
            }
        }
        if (lastMismatch) {
            setStatus(
                `SVG даёт ${lastMismatch.n}★, а const — ${lastMismatch.expectedVerts}★; обводка не подставлена (проверьте animal / SVG)`
            );
        }
        return false;
    }

    async function openSlotInEditor(idx) {
        const slots = librarySlots();
        const slot = slots.find((s) => s.gridIndex === idx);
        const animal = slot && slot.animal ? slot.animal : "";
        const expectedVerts = await fetchVertCount(idx);
        // Prefer SVG first so a stale tex from another animal is not shown as "truth"
        let hadSvg = await tryLoadAnimalSvg(animal, expectedVerts || null);
        if (!hadSvg && animal) {
            // Name/year mismatch or vert count drift: still load SVG for correct outline
            hadSvg = await tryLoadAnimalSvg(animal, null);
        }
        const hadTex = hadSvg ? false : await tryLoadTexAsBg(idx);
        if (hadSvg) {
            setStatus(
                `Слот const${idx}` +
                    (animal ? ` «${animal}»` : "") +
                    `: SVG-сетка в кадре viewBox` +
                    (expectedVerts ? ` (${expectedVerts}★ в const)` : "")
            );
            return;
        }
        await loadConstIntoEditor(idx);
        if (!hadTex) {
            await tryLoadTexAsBg(idx);
            redraw();
        }
        setStatus(
            `Слот const${idx}` +
                (animal ? ` «${animal}»` : "") +
                `: точки как бусины` +
                (state.bgImage ? " + tex-подложка" : "")
        );
    }

    function fillLibraryCopyDst(excludeIdx) {
        const sel = document.getElementById("library-copy-dst");
        if (!sel) {
            return;
        }
        sel.innerHTML = "";
        for (const slot of librarySlots()) {
            if (slot.gridIndex === excludeIdx) {
                continue;
            }
            const opt = document.createElement("option");
            opt.value = String(slot.gridIndex);
            const animal = slot.animal ? ` — ${slot.animal}` : "";
            opt.textContent = `${slot.label} (const${slot.gridIndex})${animal}`;
            sel.appendChild(opt);
        }
    }

    async function copyGeometry(src, dst) {
        if (src === dst) {
            setStatus("Источник и цель совпадают");
            return;
        }
        const res = await fetch(`assets/json/const${src}.json?_=${Date.now()}`);
        if (!res.ok) {
            setStatus(`Не удалось загрузить const${src}.json`);
            return;
        }
        const srcJson = await res.json();
        const verts = (srcJson.vert || []).map((v) => [v[0], v[1]]);
        const obj = { number: 0, vert: verts };
        const jsonStr = JSON.stringify(obj);
        const srcSlot = librarySlots().find((s) => s.gridIndex === src);
        const srcAnimal = (srcSlot && srcSlot.animal) || "";
        // gridIndex 9 («дом») не в classes.json — имя пишем только для 0..8
        const dstHasClass = dst >= 0 && dst <= 8;
        const srcHasClass = src >= 0 && src <= 8;

        let pngB64 = null;
        let pngBlob = null;
        try {
            const texRes = await fetch(`assets/textures/tex${src}.png?_=${Date.now()}`);
            if (texRes.ok) {
                pngBlob = await texRes.blob();
                pngB64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
                    reader.onerror = reject;
                    reader.readAsDataURL(pngBlob);
                });
            }
        } catch (e) {
            /* optional */
        }

        try {
            const result = await postAssetSaver({
                action: "save_all",
                constName: `const${dst}`,
                texName: pngB64 ? `tex${dst}` : null,
                obj: jsonStr,
                pngBase64: pngB64,
                animal: dstHasClass ? srcAnimal : null,
                classIndex: dst,
                skipAnimal: !dstHasClass,
                archiveBefore: true,
                archiveReason: "copy",
            });
            // Перенос имени: у источника очищаем animal, иначе библиотека врёт
            if (srcHasClass && srcAnimal) {
                await postAssetSaver({
                    action: "save_all",
                    animal: "",
                    classIndex: src,
                    skipAnimal: false,
                });
            }
            state.vertCountCache[dst] = verts.length;
            state.vertCountCache[src] = undefined;
            await loadClassesMeta();
            fillClassSelects();
            setStatus(
                `Перенесено const${src} → const${dst} (${verts.length} точек)` +
                    (srcAnimal ? `, имя «${srcAnimal}»` : "") +
                    (pngB64 ? `, tex${dst}.png` : " (tex не найден)") +
                    formatArchiveNote(result && result.archive)
            );
            await loadArchiveList();
        } catch (e) {
            await archiveSlotClientFallback(dst, "copy");
            downloadText(`const${dst}.json`, JSON.stringify(obj, null, 2));
            if (pngBlob) {
                downloadBlob(`tex${dst}.png`, pngBlob);
            }
            if (dstHasClass || srcHasClass) {
                downloadText(
                    `classes_animal_hint.json`,
                    JSON.stringify(
                        {
                            note: "Обновите animal вручную в assets/json/classes.json",
                            set: dstHasClass ? { gridIndex: dst, animal: srcAnimal } : null,
                            clear: srcHasClass && srcAnimal ? { gridIndex: src, animal: "" } : null,
                        },
                        null,
                        2
                    )
                );
            }
            setStatus(
                `PHP недоступен — скачаны const${dst}.json` +
                    (pngBlob ? ` и tex${dst}.png` : "") +
                    ` (+ архив прежнего слота). Положите в assets/ и поправьте animal в classes.json.`
            );
        }
    }

    async function loadConstIntoEditor(idx) {
        try {
            const res = await fetch(`assets/json/const${idx}.json?_=${Date.now()}`);
            if (!res.ok) {
                setStatus(`Нет const${idx}.json`);
                return;
            }
            const data = await res.json();
            const verts = data.vert || [];
            pushHistory();
            state.strokes = [];
            state.beads = verts.map((v) => {
                const frame = frameSize();
                // normalized → crop-local pixels → image
                const lx = ((v[0] + 1) / 2) * frame.w;
                const ly = ((1 - v[1]) / 2) * frame.h;
                return [lx + state.crop.x, ly + state.crop.y];
            });
            if (!state.bgImage) {
                const c = document.createElement("canvas");
                c.width = 800;
                c.height = 800;
                const cx = c.getContext("2d");
                cx.fillStyle = "#111";
                cx.fillRect(0, 0, c.width, c.height);
                await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        state.bgImage = img;
                        state.bgNaturalW = c.width;
                        state.bgNaturalH = c.height;
                        state.cropPct = { x: 0, y: 0, w: 100, h: 100 };
                        syncCropFromPct();
                        // re-map beads with real crop
                        state.beads = verts.map((v) => {
                            const frame = frameSize();
                            const lx = ((v[0] + 1) / 2) * frame.w;
                            const ly = ((1 - v[1]) / 2) * frame.h;
                            return [lx + state.crop.x, ly + state.crop.y];
                        });
                        syncCropSliders();
                        fitView();
                        resolve();
                    };
                    img.src = c.toDataURL();
                });
            }
            redraw();
            setStatus(`Загружено ${verts.length} точек из const${idx} как бусины`);
        } catch (e) {
            setStatus("Ошибка загрузки const: " + (e && e.message ? e.message : e));
        }
    }

    function loadLineStyleFromStorage() {
        try {
            const raw = localStorage.getItem("boardStyleSettings");
            if (!raw) {
                return;
            }
            const s = JSON.parse(raw);
            if (s.silhouetteColor) {
                state.lineStyle.silhouetteColor = s.silhouetteColor;
            }
            if (s.silhouetteWidth != null) {
                state.lineStyle.silhouetteWidth = Number(s.silhouetteWidth);
            }
            if (s.silhouetteDash) {
                state.lineStyle.silhouetteDash = String(s.silhouetteDash);
            }
        } catch (e) {
            /* ignore */
        }
    }

    async function loadLineStyleFromDefaults() {
        try {
            const res = await fetch("assets/json/style_defaults.json?_=" + Date.now());
            if (!res.ok) {
                return;
            }
            const s = await res.json();
            if (s.silhouetteColor) {
                state.lineStyle.silhouetteColor = s.silhouetteColor;
            }
            if (s.silhouetteWidth != null) {
                state.lineStyle.silhouetteWidth = Number(s.silhouetteWidth);
            }
            if (s.silhouetteDash) {
                state.lineStyle.silhouetteDash = String(s.silhouetteDash);
            }
        } catch (e) {
            /* ignore */
        }
    }

    function syncLineStyleUi() {
        const hex = (rgb) => {
            const h = (n) =>
                Math.round(Math.max(0, Math.min(1, n)) * 255)
                    .toString(16)
                    .padStart(2, "0");
            return `#${h(rgb[0])}${h(rgb[1])}${h(rgb[2])}`;
        };
        const colorEl = document.getElementById("sil-color");
        const widthEl = document.getElementById("sil-width");
        const dashEl = document.getElementById("sil-dash");
        if (colorEl) {
            colorEl.value = hex(state.lineStyle.silhouetteColor);
        }
        if (widthEl) {
            widthEl.value = state.lineStyle.silhouetteWidth;
            document.getElementById("sil-width-val").textContent = Number(
                state.lineStyle.silhouetteWidth
            ).toFixed(1);
        }
        if (dashEl) {
            dashEl.value = state.lineStyle.silhouetteDash;
        }
    }

    function persistLineStyleToBoardStorage() {
        try {
            let s = {};
            const raw = localStorage.getItem("boardStyleSettings");
            if (raw) {
                s = JSON.parse(raw);
            }
            s.silhouetteColor = state.lineStyle.silhouetteColor;
            s.silhouetteWidth = state.lineStyle.silhouetteWidth;
            s.silhouetteDash = state.lineStyle.silhouetteDash;
            localStorage.setItem("boardStyleSettings", JSON.stringify(s));
        } catch (e) {
            /* ignore */
        }
    }

    // ---- events ----
    document.getElementById("bg-file").addEventListener("change", (e) => {
        loadImageFile(e.target.files[0]);
    });
    document.getElementById("svg-file").addEventListener("change", (e) => {
        loadSvgFile(e.target.files[0]);
    });
    document.getElementById("bg-alpha").addEventListener("input", (e) => {
        state.bgAlpha = Number(e.target.value);
        document.getElementById("bg-alpha-val").textContent = state.bgAlpha.toFixed(2);
        redraw();
    });
    document.getElementById("eps").addEventListener("input", (e) => {
        state.epsilon = Number(e.target.value);
        redraw();
    });

    ["crop-x", "crop-y", "crop-w", "crop-h"].forEach((id) => {
        document.getElementById(id).addEventListener("input", () => {
            state.cropPct.x = Number(document.getElementById("crop-x").value);
            state.cropPct.y = Number(document.getElementById("crop-y").value);
            state.cropPct.w = Number(document.getElementById("crop-w").value);
            state.cropPct.h = Number(document.getElementById("crop-h").value);
            if (state.cropPct.x + state.cropPct.w > 100) {
                state.cropPct.w = 100 - state.cropPct.x;
            }
            if (state.cropPct.y + state.cropPct.h > 100) {
                state.cropPct.h = 100 - state.cropPct.y;
            }
            syncCropFromPct();
            syncCropSliders();
            redraw();
        });
    });

    document.querySelectorAll(".trace-tools button[data-tool]").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".trace-tools button").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            state.tool = btn.getAttribute("data-tool");
            if (state.tool !== "poly" && state.tool !== "stroke") {
                if (state.currentStroke) {
                    finishCurrentStroke(false);
                }
            }
        });
    });

    document.getElementById("btn-undo").addEventListener("click", undo);
    document.getElementById("btn-redo").addEventListener("click", redo);
    document.getElementById("btn-clear").addEventListener("click", () => {
        if (!confirm("Очистить всю обводку?")) {
            return;
        }
        pushHistory();
        state.strokes = [];
        state.beads = [];
        state.currentStroke = null;
        redraw();
    });

    const silColor = document.getElementById("sil-color");
    if (silColor) {
        silColor.addEventListener("input", () => {
            const h = silColor.value;
            state.lineStyle.silhouetteColor = [
                parseInt(h.slice(1, 3), 16) / 255,
                parseInt(h.slice(3, 5), 16) / 255,
                parseInt(h.slice(5, 7), 16) / 255,
            ];
            persistLineStyleToBoardStorage();
            redraw();
        });
    }
    const silWidth = document.getElementById("sil-width");
    if (silWidth) {
        silWidth.addEventListener("input", () => {
            state.lineStyle.silhouetteWidth = Number(silWidth.value);
            document.getElementById("sil-width-val").textContent =
                state.lineStyle.silhouetteWidth.toFixed(1);
            persistLineStyleToBoardStorage();
            redraw();
        });
    }
    const silDash = document.getElementById("sil-dash");
    if (silDash) {
        silDash.addEventListener("change", () => {
            state.lineStyle.silhouetteDash = silDash.value.trim() || "4 8 8 16 4 4";
            persistLineStyleToBoardStorage();
            redraw();
        });
    }

    document.getElementById("btn-save-open").addEventListener("click", () => {
        const dlg = document.getElementById("save-dialog");
        const idx = getSelectedClassIndex();
        const classes = (state.classesMeta && state.classesMeta.classes) || [];
        const cur = classes.find((c) => c.gridIndex === idx);
        const nameInput = document.getElementById("save-name");
        if (nameInput && cur && cur.animal && !nameInput.value) {
            nameInput.value = cur.animal;
        }
        dlg.hidden = false;
    });
    document.getElementById("btn-save-cancel").addEventListener("click", () => {
        document.getElementById("save-dialog").hidden = true;
    });
    document.getElementById("btn-save-confirm").addEventListener("click", async () => {
        const name = (document.getElementById("save-name").value || "").trim();
        const classIndex = Number(document.getElementById("save-class").value);
        if (!name) {
            setStatus("Укажите имя созвездия");
            return;
        }
        if (Number.isNaN(classIndex)) {
            setStatus("Выберите класс");
            return;
        }
        document.getElementById("btn-save-confirm").disabled = true;
        try {
            await saveConstellation(name, classIndex);
            document.getElementById("save-dialog").hidden = true;
            await loadClassesMeta();
            fillClassSelects();
            document.getElementById("save-class").value = String(classIndex);
            document.getElementById("save-name").value = name;
        } finally {
            document.getElementById("btn-save-confirm").disabled = false;
        }
    });

    const saveClassSel = document.getElementById("save-class");
    if (saveClassSel) {
        saveClassSel.addEventListener("change", () => {
            const idx = Number(saveClassSel.value);
            const classes = (state.classesMeta && state.classesMeta.classes) || [];
            const cur = classes.find((c) => c.gridIndex === idx);
            const nameInput = document.getElementById("save-name");
            if (nameInput && cur) {
                nameInput.value = cur.animal || "";
            }
        });
    }

    document.getElementById("btn-dl-json").addEventListener("click", async () => {
        const built = buildJsonObject();
        const merged = await maybeMergeExistingTexts(built.obj.vert, built.index);
        built.obj.vert = merged.vert;
        built.obj.number = merged.number;
        downloadText(`const${built.index}.json`, JSON.stringify(built.obj, null, 2));
        setStatus(`Скачан const${built.index}.json (${built.obj.vert.length} вершин)`);
    });

    document.getElementById("btn-dl-png").addEventListener("click", () => {
        const idx = getSelectedClassIndex();
        const c = renderSilhouettePng();
        c.toBlob((blob) => {
            downloadBlob(`tex${idx}.png`, blob);
            setStatus(`Скачан tex${idx}.png`);
        });
    });

    document.getElementById("btn-lib-open").addEventListener("click", async () => {
        if (state.librarySelected == null) {
            setStatus("Выберите слот в библиотеке");
            return;
        }
        await openSlotInEditor(state.librarySelected);
    });

    document.getElementById("btn-lib-copy").addEventListener("click", () => {
        if (state.librarySelected == null) {
            setStatus("Выберите слот в библиотеке");
            return;
        }
        fillLibraryCopyDst(state.librarySelected);
        document.getElementById("library-copy-panel").hidden = false;
    });

    document.getElementById("btn-lib-copy-cancel").addEventListener("click", () => {
        document.getElementById("library-copy-panel").hidden = true;
    });

    document.getElementById("btn-lib-copy-confirm").addEventListener("click", async () => {
        const src = state.librarySelected;
        const dst = Number(document.getElementById("library-copy-dst").value);
        if (src == null || Number.isNaN(dst)) {
            setStatus("Укажите цель копирования");
            return;
        }
        if (
            !confirm(
                `Перенести const${src} → const${dst}? Имя тоже переносится; прежнее содержимое цели уйдёт в архив.`
            )
        ) {
            return;
        }
        await copyGeometry(src, dst);
        state.vertCountCache[dst] = undefined;
        state.vertCountCache[src] = undefined;
        document.getElementById("library-copy-panel").hidden = true;
        renderLibraryList();
    });

    document.getElementById("btn-arch-open").addEventListener("click", async () => {
        const item = selectedArchiveItem();
        if (!item) {
            setStatus("Выберите запись в архиве");
            return;
        }
        await openArchiveInEditor(item);
    });

    document.getElementById("btn-arch-restore").addEventListener("click", () => {
        if (!selectedArchiveItem()) {
            setStatus("Выберите запись в архиве");
            return;
        }
        const sel = document.getElementById("archive-restore-dst");
        sel.innerHTML = "";
        for (const slot of librarySlots()) {
            const opt = document.createElement("option");
            opt.value = String(slot.gridIndex);
            const animal = slot.animal ? ` — ${slot.animal}` : "";
            opt.textContent = `${slot.label} (const${slot.gridIndex})${animal}`;
            sel.appendChild(opt);
        }
        const item = selectedArchiveItem();
        if (item && item.fromIndex != null) {
            sel.value = String(item.fromIndex);
        }
        document.getElementById("archive-restore-panel").hidden = false;
    });

    document.getElementById("btn-arch-restore-cancel").addEventListener("click", () => {
        document.getElementById("archive-restore-panel").hidden = true;
    });

    document.getElementById("btn-arch-restore-confirm").addEventListener("click", async () => {
        const item = selectedArchiveItem();
        const dst = Number(document.getElementById("archive-restore-dst").value);
        if (!item || Number.isNaN(dst)) {
            setStatus("Укажите цель восстановления");
            return;
        }
        if (
            !confirm(
                `Восстановить «${item.animal || item.id}» в const${dst}? Текущий слот уйдёт в архив.`
            )
        ) {
            return;
        }
        await restoreArchiveToClass(item, dst);
        document.getElementById("archive-restore-panel").hidden = true;
    });

    editCanvas.addEventListener(
        "wheel",
        (e) => {
            e.preventDefault();
            const [ix, iy] = screenToImage(e.clientX, e.clientY);
            const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
            const newZoom = Math.min(40, Math.max(0.05, state.zoom * factor));
            const rect = editCanvas.getBoundingClientRect();
            state.panX = e.clientX - rect.left - ix * newZoom;
            state.panY = e.clientY - rect.top - iy * newZoom;
            state.zoom = newZoom;
            redraw();
        },
        { passive: false }
    );

    editCanvas.addEventListener("mousedown", (e) => {
        if (e.button === 1 || e.button === 2 || state.tool === "pan" || state.spaceDown) {
            state.panning = true;
            state.panLast = [e.clientX, e.clientY];
            return;
        }
        if (e.button !== 0) {
            return;
        }
        const [ix, iy] = screenToImage(e.clientX, e.clientY);
        if (state.tool === "crop") {
            state.cropDragging = true;
            state.cropDragStart = [ix, iy];
            return;
        }
        if (state.tool === "move") {
            beginMoveAt(ix, iy);
            return;
        }
        if (state.tool === "bend") {
            beginBendAt(ix, iy);
            return;
        }
        if (state.tool === "bead") {
            pushHistory();
            state.beads.push([ix, iy]);
            redraw();
            return;
        }
        if (state.tool === "poly") {
            addPointToCurrent(ix, iy, true);
            return;
        }
        if (state.tool === "stroke") {
            state.drawingStroke = true;
            state.currentStroke = {
                closed: false,
                anchors: [[ix, iy]],
                controls: [],
            };
            state.lastStrokeSample = [ix, iy];
            redraw();
        }
    });

    editCanvas.addEventListener("mousemove", (e) => {
        if (state.panning && state.panLast) {
            state.panX += e.clientX - state.panLast[0];
            state.panY += e.clientY - state.panLast[1];
            state.panLast = [e.clientX, e.clientY];
            redraw();
            return;
        }
        if (state.moveDrag) {
            const [ix, iy] = screenToImage(e.clientX, e.clientY);
            updateMove(ix, iy);
            return;
        }
        if (state.bendDrag) {
            const [ix, iy] = screenToImage(e.clientX, e.clientY);
            updateBend(ix, iy);
            return;
        }
        if (state.cropDragging && state.cropDragStart) {
            const [ix, iy] = screenToImage(e.clientX, e.clientY);
            const x0 = Math.min(state.cropDragStart[0], ix);
            const y0 = Math.min(state.cropDragStart[1], iy);
            const x1 = Math.max(state.cropDragStart[0], ix);
            const y1 = Math.max(state.cropDragStart[1], iy);
            const iw = state.bgNaturalW || 1;
            const ih = state.bgNaturalH || 1;
            state.cropPct.x = Math.max(0, (x0 / iw) * 100);
            state.cropPct.y = Math.max(0, (y0 / ih) * 100);
            state.cropPct.w = Math.min(100 - state.cropPct.x, ((x1 - x0) / iw) * 100);
            state.cropPct.h = Math.min(100 - state.cropPct.y, ((y1 - y0) / ih) * 100);
            syncCropFromPct();
            syncCropSliders();
            redraw();
            return;
        }
        if (state.drawingStroke && state.tool === "stroke" && state.currentStroke) {
            const [ix, iy] = screenToImage(e.clientX, e.clientY);
            const last = state.lastStrokeSample;
            const minDist = Math.max(state.strokeMinDist, snapRadiusPx() * 0.8);
            if (!last || Math.hypot(ix - last[0], iy - last[1]) >= minDist) {
                state.currentStroke.anchors.push([ix, iy]);
                state.currentStroke.controls.push(null);
                state.lastStrokeSample = [ix, iy];
                redraw();
            }
        }
    });

    window.addEventListener("mouseup", () => {
        if (state.panning) {
            state.panning = false;
            state.panLast = null;
        }
        if (state.moveDrag) {
            state.moveDrag = null;
            redraw();
        }
        if (state.bendDrag) {
            state.bendDrag = null;
        }
        if (state.cropDragging) {
            state.cropDragging = false;
            state.cropDragStart = null;
        }
        if (state.drawingStroke && state.tool === "stroke") {
            if (state.currentStroke && state.currentStroke.anchors.length >= 2) {
                pushHistory();
                state.strokes.push(SP.migrateStroke(state.currentStroke));
            }
            state.currentStroke = null;
            state.drawingStroke = false;
            state.lastStrokeSample = null;
            redraw();
        }
    });

    editCanvas.addEventListener("contextmenu", (e) => e.preventDefault());

    window.addEventListener("keydown", (e) => {
        if (e.code === "Space") {
            state.spaceDown = true;
            e.preventDefault();
        }
        if (e.key === "Enter") {
            finishCurrentStroke(false);
        }
        if (e.key === "Escape") {
            state.currentStroke = null;
            state.drawingStroke = false;
            state.bendDrag = null;
            state.moveDrag = null;
            redraw();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
            e.preventDefault();
            if (e.shiftKey) {
                redo();
            } else {
                undo();
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
            e.preventDefault();
            redo();
        }
    });
    window.addEventListener("keyup", (e) => {
        if (e.code === "Space") {
            state.spaceDown = false;
        }
    });

    window.addEventListener("resize", resizeCanvas);

    (async () => {
        await loadLineStyleFromDefaults();
        loadLineStyleFromStorage();
        syncLineStyleUi();
        await loadClassesMeta();
        fillClassSelects();
        await loadArchiveList();
        resizeCanvas();
        setStatus(
            "Загрузите подложку или откройте слот из библиотеки. При сохранении/копировании прежний слот уходит в архив."
        );
    })();
})();
