/**
 * Achievement editor: drag lit achievements between star vertices.
 * Content comes from SheetSync.php; this page only rearranges.
 */

const editorDrag = {
    fromVert: -1,
    active: false,
};

function getEditorOrig() {
    if (typeof d === "undefined") {
        return null;
    }
    return d.const_verts["orig" + d.star_animation.current_constallation];
}

function hitStarVert(threshold) {
    if (typeof d === "undefined" || d.star_animation.finished != 1) {
        return -1;
    }
    const cnum = d.star_animation.current_constallation;
    const con = d.const_verts["vert_screen_space" + cnum];
    if (!con) {
        return -1;
    }
    const x = mouseX;
    const y = height - mouseY;
    const t = threshold != null ? threshold : width * 0.01;
    let best = -1;
    let bestDist = t * t;
    for (let i = 0; i < con.length; ++i) {
        const dx = x - con[i][0];
        const dy = y - con[i][1];
        const dd = dx * dx + dy * dy;
        if (dd <= bestDist) {
            bestDist = dd;
            best = i;
        }
    }
    return best;
}

function swap_star_content(d, a, b) {
    const orig = d.const_verts["orig" + d.star_animation.current_constallation];
    if (!orig || a < 0 || b < 0 || a === b || !orig.vert[a] || !orig.vert[b]) {
        return false;
    }
    const va = orig.vert[a];
    const vb = orig.vert[b];
    const ax = va[0];
    const ay = va[1];
    const bx = vb[0];
    const by = vb[1];
    // Swap payload, keep coordinates
    const aPayload = va.slice(2);
    const bPayload = vb.slice(2);
    orig.vert[a] = [ax, ay].concat(bPayload);
    orig.vert[b] = [bx, by].concat(aPayload);
    d.sync_lit_count(d.star_animation.current_constallation);
    SaveConstOnServer("const" + d.star_animation.current_constallation, JSON.stringify(orig));
    d.update_all(width, height);
    return true;
}

function editor_mouse_pressed() {
    if (typeof d === "undefined" || d.star_animation.finished != 1) {
        return;
    }
    if (d.class_options.current_selection != -1) {
        return;
    }
    const v = hitStarVert(width * 0.012);
    if (v < 0) {
        return;
    }
    const orig = getEditorOrig();
    if (!orig || !d.is_vert_lit(orig.vert[v])) {
        return;
    }
    editorDrag.fromVert = v;
    editorDrag.active = true;
    d.text_animation.focus_vert = v;
    const status = document.getElementById("editor-status");
    if (status) {
        status.textContent = `Перетащите достижение с вершины ${v} на другую звезду`;
    }
}

function editor_mouse_released() {
    if (!editorDrag.active) {
        return;
    }
    const from = editorDrag.fromVert;
    editorDrag.active = false;
    editorDrag.fromVert = -1;
    if (typeof d === "undefined" || d.star_animation.finished != 1) {
        return;
    }
    if (d.class_options.current_selection != -1) {
        return;
    }
    const to = hitStarVert(width * 0.012);
    const status = document.getElementById("editor-status");
    if (to < 0 || to === from) {
        if (status) {
            status.textContent = "Отмена: отпустите на другой звезде";
        }
        return;
    }
    if (swap_star_content(d, from, to)) {
        d.text_animation.focus_vert = to;
        if (status) {
            status.textContent = `Перемещено: ${from} ↔ ${to}`;
        }
    }
}

async function SaveConstOnServer(filename, JSONObj) {
    const response = await fetch("JSONSaver.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name: filename,
            obj: JSONObj,
        }),
    });
    return await response.text();
}

async function runSheetSync(dry) {
    const status = document.getElementById("editor-status");
    if (status) {
        status.textContent = dry ? "Проверка синка…" : "Синхронизация с таблицей…";
    }
    // Admin session cookie authorizes SheetSync (no sync_key in the browser).
    let url = "SheetSync.php";
    if (dry) {
        url += "?dry=1";
    }
    try {
        const res = await fetch(url, { credentials: "same-origin" });
        const data = await res.json();
        if (!data.ok) {
            if (status) {
                status.textContent =
                    "Ошибка: " +
                    (data.error || res.status) +
                    (res.status === 403 || res.status === 401 ? " — войдите снова (login.php)" : "");
            }
            return;
        }
        const lines = (data.report || []).map((r) => {
            if (r.error) {
                return `${r.id}: ${r.error}`;
            }
            return `${r.id}: +${r.placed} upd${r.updated} clr${r.cleared} lit${r.lit}`;
        });
        if (status) {
            status.textContent = (dry ? "Dry-run.\n" : "Сохранено.\n") + lines.join("\n");
        }
        if (!dry && typeof d !== "undefined") {
            location.reload();
        }
    } catch (e) {
        if (status) {
            status.textContent = "Сбой запроса: " + (e.message || e);
        }
    }
}

function bindEditorPanel() {
    const panel = document.getElementById("editor-panel");
    if (!panel) {
        return;
    }
    const closeBtn = document.getElementById("editor-close");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            panel.hidden = true;
        });
    }
    const syncBtn = document.getElementById("editor-sync");
    if (syncBtn) {
        syncBtn.addEventListener("click", () => runSheetSync(false));
    }
    const dryBtn = document.getElementById("editor-sync-dry");
    if (dryBtn) {
        dryBtn.addEventListener("click", () => runSheetSync(true));
    }
    document.addEventListener("keydown", (e) => {
        if (e.key === "s" || e.key === "S") {
            const tag = (e.target && e.target.tagName) || "";
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
                return;
            }
            panel.hidden = !panel.hidden;
        }
    });
}

if (typeof window !== "undefined") {
    window.bindEditorPanel = bindEditorPanel;
    window.editor_mouse_pressed = editor_mouse_pressed;
    window.editor_mouse_released = editor_mouse_released;
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bindEditorPanel);
    } else {
        bindEditorPanel();
    }
}
