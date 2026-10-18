(() => {
    const panel = document.getElementById("sheet-panel");
    if (!panel || typeof SheetImport === "undefined") {
        return;
    }

    const state = {
        classesMeta: null,
        groups: [],
        selectedGroup: -1,
        title: "",
        classHint: "",
        warnings: [],
    };

    const listEl = document.getElementById("sheet-group-list");
    const statusEl = document.getElementById("sheet-status");
    const fileInput = document.getElementById("sheet-file");
    const urlInput = document.getElementById("sheet-url");
    const loadUrlBtn = document.getElementById("sheet-load-url");
    const loadClassBtn = document.getElementById("sheet-load-class");
    const closeBtn = document.getElementById("sheet-close");

    function spreadsheetId() {
        const meta = state.classesMeta;
        return (meta && meta.spreadsheetId) || "1saCYj_XhQvxHrJ0ROIiVAdER-kCvrtMwFchNUvLbfOQ";
    }

    function rebindFromOrig() {
        if (typeof d === "undefined") {
            return;
        }
        const orig = d.const_verts["orig" + d.star_animation.current_constallation];
        if (!orig) {
            return;
        }
        for (const g of state.groups) {
            g.bound = false;
            g.vertIndex = -1;
        }
        for (let i = 0; i < orig.vert.length; i++) {
            const sid = orig.vert[i][4];
            if (!sid) {
                continue;
            }
            const g = state.groups.find((x) => x.starId === sid);
            if (g) {
                g.bound = true;
                g.vertIndex = i;
            }
        }
    }

    function bindGroupToVert(vertIndex) {
        if (typeof d === "undefined" || typeof apply_sheet_group_to_star !== "function") {
            return false;
        }
        const g = state.groups[state.selectedGroup];
        const v = vertIndex != null ? vertIndex : window.__sheetPendingVert;
        if (v == null || v < 0) {
            setStatus("Сначала наведите курсор на звезду фигуры");
            return false;
        }
        if (!g) {
            setStatus("Выберите группу в списке (клавиша S)");
            return false;
        }
        const orig = d.const_verts["orig" + d.star_animation.current_constallation];
        const prevId = orig && orig.vert[v] && orig.vert[v][4];
        if (prevId && prevId !== g.starId) {
            const old = state.groups.find((x) => x.starId === prevId);
            if (old) {
                old.bound = false;
                old.vertIndex = -1;
            }
        }
        // Move this group off a previous vertex if rebinding
        if (g.bound && g.vertIndex >= 0 && g.vertIndex !== v && orig) {
            if (orig.vert[g.vertIndex] && orig.vert[g.vertIndex][4] === g.starId) {
                orig.vert[g.vertIndex][2] = "";
                orig.vert[g.vertIndex][3] = "";
                orig.vert[g.vertIndex][4] = "";
            }
        }
        if (apply_sheet_group_to_star(d, v, g)) {
            rebindFromOrig();
            renderList();
            saveCache();
            setStatus(`Привязано ${g.starId} → вершина ${v}. Сохранено в const${d.star_animation.current_constallation}.json`);
            return true;
        }
        return false;
    }

    window.bindSelectedSheetGroup = bindGroupToVert;

    function setStatus(msg) {
        statusEl.textContent = msg || "";
    }

    function cacheKey() {
        return "sheetImportCache_v1";
    }

    function saveCache() {
        try {
            localStorage.setItem(
                cacheKey(),
                JSON.stringify({
                    title: state.title,
                    classHint: state.classHint,
                    groups: state.groups,
                    at: Date.now(),
                })
            );
        } catch (e) {
            /* ignore */
        }
    }

    function loadCache() {
        try {
            const raw = localStorage.getItem(cacheKey());
            if (!raw) {
                return;
            }
            const data = JSON.parse(raw);
            state.title = data.title || "";
            state.classHint = data.classHint || "";
            state.groups = data.groups || [];
            renderList();
            setStatus(`Кэш: ${state.title || "без названия"} (${state.groups.length} звёзд)`);
        } catch (e) {
            /* ignore */
        }
    }

    function renderList() {
        listEl.innerHTML = "";
        state.groups.forEach((g, idx) => {
            const li = document.createElement("li");
            li.className = "sheet-group" + (idx === state.selectedGroup ? " is-selected" : "");
            if (g.bound) {
                li.classList.add("is-bound");
            }
            li.innerHTML = `<strong>${g.starId || "?"}</strong> ${g.label || ""}` +
                `<span>${g.lines.length} строк${g.bound ? " · vert " + g.vertIndex : ""}${g.autoId ? " · auto-id" : ""}</span>`;
            li.addEventListener("click", () => {
                state.selectedGroup = idx;
                renderList();
                setStatus(`Выбрана ${g.starId}. Кликните звезду на фигуре (или A после наведения).`);
            });
            listEl.appendChild(li);
        });
    }

    function ingestCsv(text, isInd) {
        if (isInd && state.groups.length) {
            const warnings = SheetImport.mergeIndSheetIntoGroups(state.groups, text);
            state.warnings = warnings;
            renderList();
            saveCache();
            setStatus(`Индивидуальный лист слит. Групп: ${state.groups.length}`);
            return;
        }
        const parsed = isInd
            ? SheetImport.parseIndSheetCsv(text)
            : SheetImport.parseClassSheetCsv(text);
        state.title = parsed.title;
        state.classHint = parsed.classHint;
        state.groups = parsed.groups;
        state.warnings = parsed.warnings;
        state.selectedGroup = state.groups.length ? 0 : -1;

        if (state.classesMeta && typeof d !== "undefined") {
            const meta = SheetImport.findClassMeta(
                state.classesMeta,
                state.classHint,
                d.star_animation.current_constallation
            );
            if (meta && meta.gridIndex !== d.star_animation.current_constallation) {
                setStatus(
                    `${parsed.title}: лист для ${meta.id}, сейчас открыт класс ${d.star_animation.current_constallation}. Выберите нужный класс на сетке.`
                );
            } else {
                setStatus(`${parsed.title}: ${parsed.groups.length} групп` + (parsed.warnings.length ? ` · предупреждений ${parsed.warnings.length}` : ""));
            }
        } else {
            setStatus(`${parsed.title}: ${parsed.groups.length} групп`);
        }

        rebindFromOrig();
        renderList();
        saveCache();
    }

    async function fetchCsvSmart(sheetRef) {
        const id = spreadsheetId();
        try {
            return await SheetImport.fetchSheetCsv(id, sheetRef, false);
        } catch (e1) {
            return await SheetImport.fetchSheetCsv(id, sheetRef, true);
        }
    }

    fileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) {
            return;
        }
        const text = await file.text();
        const isInd = /инд/i.test(file.name);
        ingestCsv(text, isInd);
    });

    loadUrlBtn.addEventListener("click", async () => {
        const url = (urlInput.value || "").trim();
        if (!url) {
            setStatus("Вставьте URL export?format=csv&gid=… или gid");
            return;
        }
        try {
            setStatus("Загрузка…");
            let text;
            if (/^\d+$/.test(url)) {
                text = await fetchCsvSmart(url);
            } else if (url.includes("docs.google.com")) {
                try {
                    const res = await fetch(url);
                    if (!res.ok) {
                        throw new Error("cors");
                    }
                    text = await res.text();
                } catch (e2) {
                    const gidMatch = url.match(/gid=(\d+)/);
                    text = await fetchCsvSmart(gidMatch ? gidMatch[1] : url);
                }
            } else {
                text = await fetchCsvSmart(url);
            }
            ingestCsv(text, /инд/i.test(url));
        } catch (e) {
            setStatus("Не удалось загрузить. Сохраните CSV и откройте файлом. " + (e.message || e));
        }
    });

    if (loadClassBtn) {
        loadClassBtn.addEventListener("click", async () => {
            if (typeof d === "undefined") {
                return;
            }
            const meta = SheetImport.findClassMeta(
                state.classesMeta,
                null,
                d.star_animation.current_constallation
            );
            if (!meta) {
                setStatus("Нет записи класса в classes.json для текущего созвездия");
                return;
            }
            try {
                setStatus(`Загрузка «${meta.sheetClass}»…`);
                const classCsv = await fetchCsvSmart(meta.sheetClass);
                ingestCsv(classCsv, false);
                if (meta.sheetInd) {
                    try {
                        const indCsv = await fetchCsvSmart(meta.sheetInd);
                        ingestCsv(indCsv, true);
                        setStatus(
                            `${meta.id}: класс + инд, групп ${state.groups.length}. Выберите группу и кликните звезду.`
                        );
                    } catch (eInd) {
                        setStatus(
                            `${meta.id}: лист класса загружен (${state.groups.length}), инд недоступен — ${eInd.message || eInd}`
                        );
                    }
                } else {
                    setStatus(
                        `${meta.id}: ${state.groups.length} групп. Выберите группу и кликните звезду.`
                    );
                }
            } catch (e) {
                setStatus(
                    `Не удалось загрузить «${meta.sheetClass}». Нужен PHP SheetProxy или CSV-файл. ` +
                        (e.message || e)
                );
            }
        });
    }

    closeBtn.addEventListener("click", () => {
        panel.hidden = true;
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "s" || e.key === "S") {
            const tag = (e.target && e.target.tagName) || "";
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
                return;
            }
            if (!panel) {
                return;
            }
            panel.hidden = !panel.hidden;
            if (!panel.hidden) {
                rebindFromOrig();
                renderList();
            }
        }
    });

    window.onEditorStarFocus = (vertIndex) => {
        window.__sheetPendingVert = vertIndex;
    };

    document.getElementById("sheet-bind").addEventListener("click", () => {
        bindGroupToVert(window.__sheetPendingVert);
    });

    document.getElementById("sheet-reapply").addEventListener("click", () => {
        if (typeof d === "undefined") {
            return;
        }
        const orig = d.const_verts["orig" + d.star_animation.current_constallation];
        let n = 0;
        for (const g of state.groups) {
            if (!g.starId) {
                continue;
            }
            for (let i = 0; i < orig.vert.length; i++) {
                if (orig.vert[i][4] === g.starId) {
                    const fields = SheetImport.groupToVertFields(g);
                    orig.vert[i][2] = fields.title;
                    orig.vert[i][3] = fields.content;
                    g.bound = true;
                    g.vertIndex = i;
                    n++;
                }
            }
        }
        d.sync_lit_count(d.star_animation.current_constallation);
        SaveConstOnServer("const" + d.star_animation.current_constallation, JSON.stringify(orig));
        d.update_all(width, height);
        renderList();
        saveCache();
        setStatus(`Обновлено текстов: ${n}`);
    });

    fetch("assets/json/classes.json")
        .then((r) => r.json())
        .then((j) => {
            state.classesMeta = j;
            if (j.spreadsheetId && urlInput && !urlInput.value) {
                urlInput.placeholder = `gid или URL (книга ${j.spreadsheetId.slice(0, 6)}…)`;
            }
        })
        .catch(() => {});

    loadCache();
})();
