function rgbToHex(rgb) {
    const toByte = (v) => {
        const clamped = Math.max(0, Math.min(1, v));
        const n = Math.round(clamped * 255);
        return n.toString(16).padStart(2, "0");
    };
    return `#${toByte(rgb[0])}${toByte(rgb[1])}${toByte(rgb[2])}`;
}

function hexToRgb(hex) {
    const raw = hex.replace("#", "");
    const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
    const num = parseInt(full, 16);
    return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

function bindNebulaPanel(handler) {
    const panel = document.getElementById("nebula-panel");
    if (!panel || !handler) {
        return;
    }

    const syncFromSettings = () => {
        const s = handler.nebula.settings;
        const setVal = (id, value) => {
            const el = document.getElementById(id);
            if (el) {
                el.value = value;
            }
        };
        const setLabel = (id, text) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = text;
            }
        };

        setVal("nebula-color-a", rgbToHex(s.colorA));
        setVal("nebula-color-b", rgbToHex(s.colorB));
        setVal("nebula-color-c", rgbToHex(s.colorC));
        setVal("nebula-color-d", rgbToHex(s.colorD));
        setVal("nebula-octaves", s.octaves);
        setVal("nebula-detail", s.detail);
        setVal("nebula-scale", s.scale);
        setVal("nebula-gain", s.gain);
        setVal("nebula-lacunarity", s.lacunarity);
        setVal("nebula-warp", s.warp);
        setVal("nebula-period", s.periodSec);
        setVal("nebula-contrast", s.contrast);
        setVal("nebula-brightness", s.brightness);
        setVal("nebula-fbo-scale", s.fboScale);
        setVal("nebula-update-hz", s.updateHz);

        setLabel("nebula-octaves-val", s.octaves === 0 ? "auto" : String(s.octaves));
        setLabel("nebula-detail-val", Number(s.detail).toFixed(2));
        setLabel("nebula-scale-val", Number(s.scale).toFixed(2));
        setLabel("nebula-gain-val", Number(s.gain).toFixed(2));
        setLabel("nebula-lacunarity-val", Number(s.lacunarity).toFixed(2));
        setLabel("nebula-warp-val", Number(s.warp).toFixed(2));
        setLabel("nebula-period-val", `${Number(s.periodSec).toFixed(0)}s`);
        setLabel("nebula-contrast-val", Number(s.contrast).toFixed(2));
        setLabel("nebula-brightness-val", Number(s.brightness).toFixed(2));
        setLabel("nebula-fbo-scale-val", Number(s.fboScale).toFixed(2));
        setLabel("nebula-update-hz-val", `${Number(s.updateHz).toFixed(0)} Hz`);
    };

    const onChange = (needsResize) => {
        handler.save_nebula_settings();
        handler.mark_nebula_dirty();
        if (needsResize) {
            handler.ensure_nebula_framebuffer(handler.nebula.screenW, handler.nebula.screenH);
        }
        syncFromSettings();
    };

    const bindColor = (id, key) => {
        const el = document.getElementById(id);
        if (!el) {
            return;
        }
        el.addEventListener("input", () => {
            handler.nebula.settings[key] = hexToRgb(el.value);
            onChange(false);
        });
    };

    const bindSlider = (id, key, parse = Number, needsResize = false) => {
        const el = document.getElementById(id);
        if (!el) {
            return;
        }
        el.addEventListener("input", () => {
            handler.nebula.settings[key] = parse(el.value);
            onChange(needsResize);
        });
    };

    bindColor("nebula-color-a", "colorA");
    bindColor("nebula-color-b", "colorB");
    bindColor("nebula-color-c", "colorC");
    bindColor("nebula-color-d", "colorD");
    bindSlider("nebula-octaves", "octaves", (v) => parseInt(v, 10));
    bindSlider("nebula-detail", "detail");
    bindSlider("nebula-scale", "scale");
    bindSlider("nebula-gain", "gain");
    bindSlider("nebula-lacunarity", "lacunarity");
    bindSlider("nebula-warp", "warp");
    bindSlider("nebula-period", "periodSec");
    bindSlider("nebula-contrast", "contrast");
    bindSlider("nebula-brightness", "brightness");
    bindSlider("nebula-fbo-scale", "fboScale", Number, true);
    bindSlider("nebula-update-hz", "updateHz");

    const statusEl = document.getElementById("nebula-status");
    const setStatus = (text, show = true) => {
        if (!statusEl) {
            return;
        }
        statusEl.hidden = !show;
        statusEl.textContent = text || "";
    };

    const resetBtn = document.getElementById("nebula-reset");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            handler.reset_nebula_settings();
            syncFromSettings();
            setStatus("Сброшено к общим настройкам по умолчанию.");
        });
    }

    const saveDefaultsBtn = document.getElementById("nebula-save-defaults");
    if (saveDefaultsBtn) {
        saveDefaultsBtn.addEventListener("click", async () => {
            if (!confirm("Сохранить текущие настройки как общие по умолчанию для всех?")) {
                return;
            }
            saveDefaultsBtn.disabled = true;
            setStatus("Сохранение…");
            try {
                const result = await handler.save_nebula_defaults_for_all();
                if (result.mode === "server") {
                    setStatus("Сохранено в assets/json/nebula_defaults.json — для всех на сервере.");
                } else {
                    setStatus(
                        "PHP недоступен: скачан nebula_defaults.json — положите его в assets/json/."
                    );
                }
            } catch (e) {
                setStatus("Ошибка сохранения: " + (e && e.message ? e.message : e));
            } finally {
                saveDefaultsBtn.disabled = false;
            }
        });
    }

    const closeBtn = document.getElementById("nebula-close");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            panel.hidden = true;
        });
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "n" || event.key === "N") {
            const tag = (event.target && event.target.tagName) || "";
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
                return;
            }
            panel.hidden = !panel.hidden;
            if (!panel.hidden) {
                syncFromSettings();
            }
        }
    });

    const syncStyle = () => {
        const s = handler.style.settings;
        if (!s) {
            return;
        }
        const setVal = (id, value) => {
            const el = document.getElementById(id);
            if (el) {
                el.value = value;
            }
        };
        const setLabel = (id, text) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = text;
            }
        };
        setVal("style-paper", rgbToHex(s.paper));
        setVal("style-ink", rgbToHex(s.ink));
        setVal("style-gold", rgbToHex(s.gold));
        setVal("style-star-dim", rgbToHex(s.starDim));
        setVal("style-star-lit", rgbToHex(s.starLit));
        setVal("style-star-hot", rgbToHex(s.starHot));
        setVal("style-star-brightness", s.starBrightness);
        setVal("style-header", s.headerScale);
        setLabel("style-star-brightness-val", Number(s.starBrightness).toFixed(2));
        setLabel("style-header-val", Number(s.headerScale).toFixed(2));
        if (s.silhouetteColor) {
            setVal("style-sil-color", rgbToHex(s.silhouetteColor));
        }
        if (s.silhouetteAlpha != null) {
            setVal("style-sil-alpha", s.silhouetteAlpha);
            setLabel("style-sil-alpha-val", Number(s.silhouetteAlpha).toFixed(2));
        }
        if (s.silhouetteWidth != null) {
            setVal("style-sil-width", s.silhouetteWidth);
            setLabel("style-sil-width-val", Number(s.silhouetteWidth).toFixed(1));
        }
        if (s.silhouetteDash != null) {
            setVal("style-sil-dash", s.silhouetteDash);
        }
        if (s.classPlate) {
            setVal("style-class-plate", rgbToHex(s.classPlate));
        }
        if (s.classPlateAlpha != null) {
            setVal("style-class-plate-alpha", s.classPlateAlpha);
            setLabel("style-class-plate-alpha-val", Number(s.classPlateAlpha).toFixed(2));
        }
        if (s.classGlyph) {
            setVal("style-class-glyph", rgbToHex(s.classGlyph));
        }
        if (s.classHover) {
            setVal("style-class-hover", rgbToHex(s.classHover));
        }
        if (s.classActive) {
            setVal("style-class-active", rgbToHex(s.classActive));
        }
    };

    const onStyleChange = () => {
        handler.save_style_settings();
        handler.refresh_achievement_buffers();
        syncStyle();
    };

    const bindStyleColor = (id, key) => {
        const el = document.getElementById(id);
        if (!el) {
            return;
        }
        el.addEventListener("input", () => {
            handler.style.settings[key] = hexToRgb(el.value);
            onStyleChange();
        });
    };

    const bindStyleSlider = (id, key) => {
        const el = document.getElementById(id);
        if (!el) {
            return;
        }
        el.addEventListener("input", () => {
            handler.style.settings[key] = Number(el.value);
            onStyleChange();
        });
    };

    bindStyleColor("style-paper", "paper");
    bindStyleColor("style-ink", "ink");
    bindStyleColor("style-gold", "gold");
    bindStyleColor("style-star-dim", "starDim");
    bindStyleColor("style-star-lit", "starLit");
    bindStyleColor("style-star-hot", "starHot");
    bindStyleSlider("style-star-brightness", "starBrightness");
    bindStyleSlider("style-header", "headerScale");
    bindStyleColor("style-sil-color", "silhouetteColor");
    bindStyleSlider("style-sil-alpha", "silhouetteAlpha");
    bindStyleSlider("style-sil-width", "silhouetteWidth");
    bindStyleColor("style-class-plate", "classPlate");
    bindStyleSlider("style-class-plate-alpha", "classPlateAlpha");
    bindStyleColor("style-class-glyph", "classGlyph");
    bindStyleColor("style-class-hover", "classHover");
    bindStyleColor("style-class-active", "classActive");

    const silDash = document.getElementById("style-sil-dash");
    if (silDash) {
        silDash.addEventListener("change", () => {
            handler.style.settings.silhouetteDash = silDash.value.trim() || "4 8 8 16 4 4";
            onStyleChange();
        });
    }

    const styleReset = document.getElementById("style-reset");
    if (styleReset) {
        styleReset.addEventListener("click", () => {
            handler.reset_style_settings();
            syncStyle();
            setStatus("Стиль сброшен.");
        });
    }

    const styleSave = document.getElementById("style-save-defaults");
    if (styleSave) {
        styleSave.addEventListener("click", async () => {
            if (!confirm("Сохранить стиль как общий по умолчанию?")) {
                return;
            }
            styleSave.disabled = true;
            try {
                const result = await handler.save_style_defaults_for_all();
                setStatus(
                    result.mode === "server"
                        ? "Стиль сохранён в assets/json/style_defaults.json"
                        : "PHP недоступен: скачан style_defaults.json"
                );
            } catch (e) {
                setStatus("Ошибка стиля: " + (e && e.message ? e.message : e));
            } finally {
                styleSave.disabled = false;
            }
        });
    }

    syncFromSettings();
    syncStyle();
    handler._syncNebulaPanel = () => {
        syncFromSettings();
        syncStyle();
    };
}
