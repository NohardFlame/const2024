class dataHandler {
    const_verts = {};

    shader_path = {
        bg_vert_path: "assets/shaders/bg.vert",
        bg_frag_path: "assets/shaders/bg.frag",
        img_vert_path: "assets/shaders/img.vert",
        img_frag_path: "assets/shaders/img.frag?v=28",
        text_vert_path: "assets/shaders/text.vert?v=15",
        text_frag_path: "assets/shaders/text.frag?v=15",
        star_vert_path: "assets/shaders/star.vert?v=15",
        star_frag_path: "assets/shaders/star.frag?v=15",
        class_vert_path: "assets/shaders/class.vert?v=27",
        class_frag_path: "assets/shaders/class.frag?v=27",
        class_selected_frag_path: "assets/shaders/class_selected.frag?v=27",
        nebula_vert_path: "assets/shaders/nebula.vert?v=12",
        nebula_frag_path: "assets/shaders/nebula.frag?v=12",
        nebula_blit_frag_path: "assets/shaders/nebula_blit.frag?v=12",
    };

    json_constallation_verts_path = [
        "assets/json/const0.json",
        "assets/json/const1.json",
        "assets/json/const2.json",
        "assets/json/const3.json",
        "assets/json/const4.json",
        "assets/json/const5.json",
        "assets/json/const6.json",
        "assets/json/const7.json",
        "assets/json/const8.json",
        "assets/json/const9.json",
    ];

    font_path = "assets/fonts/Oranienbaum-Regular.ttf";

    img_path = {
        const_textures: [
            "assets/textures/tex0.png?v=25",
            "assets/textures/tex1.png?v=25",
            "assets/textures/tex2.png?v=25",
            "assets/textures/tex3.png?v=25",
            "assets/textures/tex4.png?v=25",
            "assets/textures/tex5.png?v=25",
            "assets/textures/tex6.png?v=25",
            "assets/textures/tex7.png?v=25",
            "assets/textures/tex8.png?v=25",
            "assets/textures/tex9.png?v=25",
        ],
        star_texture_path: "assets/textures/star_texture.png?v=25",
        class_texture_path: "assets/textures/class_texture.png?v=27",
    };

    star_animation = {
        current_frame: 0,
        finished: 0,
        transition: -1,
        direction: 1,
        current_constallation: 9,
        length: 80,
        min_size: 0.005,
        add_size: 0.015,
        batch_size: 64,
        start_data: [],
        end_data: [],
        batch_pos: null,
        batch_pos_uniform: null,
        batch_lit_uniform: null,
    };

    text_animation = {
        achivements_frame_buffer: [],
        achivements_frame_buffer_num: [-2, -2, -2],
        current_achivement: 0,
        current_achivement_buf: 0,
        focus_vert: -1,
        block_height: [],
        block_size: 0.4,
        padding_top: 0.03,
        header_size: 0.3,
        content_size: 0.6,
        header_text_size: 0.15,
        content_text_size: 0.11,
        delta: 0,
    };

    class_options = {
        x0: -0.95,
        y0: -0.95,
        _w: 0.7,
        current_selection: -1,
    };

    textures = {
        const_textures: {},
        star_texture: 0,
        class_texture: 0,
    };

    scale = {
        scale_screen_w: 1,
        scale_screen_h: 1,
    };

    shaders = {
        img: 0,
        bg: 0,
        text: 0,
        star: 0,
        class: 0,
        class_selected: 0,
        nebula: 0,
        nebula_blit: 0,
    };

    static NEBULA_DEFAULTS = {
        colorA: [0.101961, 0.619608, 0.666667],
        colorB: [0.666667, 0.666667, 0.498039],
        colorC: [0.0, 0.0, 0.164706],
        colorD: [0.666667, 1.0, 1.0],
        octaves: 0,
        detail: 1.0,
        scale: 3.0,
        gain: 0.5,
        lacunarity: 2.0,
        warp: 2.0,
        periodSec: 48,
        contrast: 1.0,
        brightness: 1.0,
        fboScale: 0.5,
        updateHz: 8,
    };

    nebula = {
        settings: null,
        siteDefaults: null,
        siteDefaultsJson: null,
        framebuffer: null,
        fbW: 0,
        fbH: 0,
        lastUpdateMs: 0,
        startMs: 0,
        dirty: true,
        screenW: 0,
        screenH: 0,
        lastBakeMs: 0,
    };

    static STYLE_DEFAULTS = {
        paper: [0.12, 0.1, 0.07],
        ink: [0.93, 0.86, 0.62],
        gold: [0.82, 0.68, 0.28],
        goldDim: [0.42, 0.34, 0.16],
        starDim: [0.55, 0.62, 0.72],
        starLit: [1.0, 0.85, 0.48],
        starHot: [1.0, 0.95, 0.75],
        starBrightness: 1.15,
        cardBorder: 0.035,
        headerScale: 0.18,
        contentScale: 0.11,
        silhouetteColor: [0.72, 0.58, 0.32],
        silhouetteAlpha: 0.58,
        silhouetteWidth: 1.2,
        silhouetteDash: "4 8 8 16 4 4",
        classPlate: [0.09, 0.08, 0.06],
        classPlateAlpha: 0.84,
        classGlyph: [0.82, 0.7, 0.42],
        classHover: [0.94, 0.8, 0.38],
        classActive: [0.48, 0.36, 0.14],
    };

    style = {
        settings: null,
        siteDefaults: null,
        siteDefaultsJson: null,
    };

    deep_clone(obj) {
        if (typeof structuredClone === "function") {
            return structuredClone(obj);
        }
        return JSON.parse(JSON.stringify(obj));
    }

    is_vert_lit(v) {
        return (
            v &&
            v.length >= 4 &&
            v[2] != null &&
            v[3] != null &&
            v[2] !== "" &&
            v[3] !== "" &&
            v[2] !== "DELETED" &&
            v[3] !== "DELETED"
        );
    }

    get_lit_indices(num) {
        // Prefer orig: editor writes titles there; vert is the scaled draw copy.
        const data = this.const_verts["orig" + num] || this.const_verts["vert" + num];
        if (!data || !data.vert) {
            return [];
        }
        const out = [];
        for (let i = 0; i < data.vert.length; ++i) {
            if (this.is_vert_lit(data.vert[i])) {
                out.push(i);
            }
        }
        if (!out.length && data.number > 0) {
            for (let i = 0; i < data.number && i < data.vert.length; ++i) {
                out.push(i);
            }
        }
        return out;
    }

    sync_lit_count(num) {
        const lit = this.get_lit_indices(num);
        if (this.const_verts["orig" + num]) {
            this.const_verts["orig" + num].number = lit.length;
        }
        if (this.const_verts["vert" + num]) {
            this.const_verts["vert" + num].number = lit.length;
        }
        return lit;
    }

    lit_list_index_to_vert(num, listIndex) {
        const lit = this.get_lit_indices(num);
        const i = Math.round(listIndex);
        if (i < 0 || i >= lit.length) {
            return -1;
        }
        return lit[i];
    }

    vert_to_lit_list_index(num, vertIndex) {
        const lit = this.get_lit_indices(num);
        return lit.indexOf(vertIndex);
    }

    fill_pos_array(target, verts) {
        for (let j = 0; j < verts.length; ++j) {
            target[j * 2] = verts[j][0];
            target[j * 2 + 1] = verts[j][1];
        }
    }

    rebuild_morph_data() {
        for (let i = 0; i < this.const_count; ++i) {
            const n = this.const_verts["vert" + i].vert.length;
            const start = this.get_const_initial_vert(i);
            const end = this.get_const_target_vert(i);
            this.star_animation.start_data[i] = new Float32Array(Math.max(1, n) * 2);
            this.star_animation.end_data[i] = new Float32Array(Math.max(1, n) * 2);
            this.fill_pos_array(this.star_animation.start_data[i], start);
            this.fill_pos_array(this.star_animation.end_data[i], end);
        }
        if (!this.star_animation.batch_pos) {
            this.star_animation.batch_pos = new Float32Array(this.star_animation.batch_size * 2);
            this.star_animation.batch_pos_uniform = new Array(this.star_animation.batch_size * 2).fill(0);
            this.star_animation.batch_lit_uniform = new Array(this.star_animation.batch_size).fill(0);
        }
    }

    build_batch_geometry() {
        const n = this.star_animation.batch_size;
        return buildGeometry(() => {
            for (let j = 0; j < n; ++j) {
                rect(0, 0, 0.1, 0.1);
            }
        });
    }

    push_star_quad(cx, cy, rw, rh, u0, u1) {
        beginShape();
        vertex(cx - rw, cy - rh, 0, u0, 0);
        vertex(cx + rw, cy - rh, 0, u1, 0);
        vertex(cx + rw, cy + rh, 0, u1, 1);
        vertex(cx - rw, cy + rh, 0, u0, 1);
        endShape(CLOSE);
    }

    rebuild_idle_geometry() {
        const sw = this.scale.scale_screen_w;
        const sh = this.scale.scale_screen_h;
        const r = this.star_animation.min_size;
        const current = this.star_animation.current_constallation;
        const dimRw = r * sw * 0.4;
        const dimRh = r * sh * 0.4;
        const litRw = r * sw * 1.2;
        const litRh = r * sh * 1.2;

        this.idle_geometry = buildGeometry(() => {
            let count = 0;
            for (let i = 0; i < this.const_count; ++i) {
                if (i === current) {
                    continue;
                }
                const scatter = this.get_const_initial_vert(i);
                if (!scatter) {
                    continue;
                }
                this.sync_lit_count(i);
                const orig = this.const_verts["orig" + i];
                const hasExplicitLit = orig.vert.some((v) => this.is_vert_lit(v));
                for (let j = 0; j < scatter.length; ++j) {
                    const lit = hasExplicitLit ? this.is_vert_lit(orig.vert[j]) : j < orig.number;
                    if (lit) {
                        this.push_star_quad(scatter[j][0], scatter[j][1], litRw, litRh, 0.33, 0.66);
                    } else {
                        this.push_star_quad(scatter[j][0], scatter[j][1], dimRw, dimRh, 0.66, 1.0);
                    }
                    count++;
                }
            }
            if (count === 0) {
                this.push_star_quad(2, 2, 0.001, 0.001, 0.66, 1.0);
            }
        });
    }

    notify_stars_changed() {
        this.rebuild_morph_data();
        this.rebuild_idle_geometry();
    }

    ensure_text_framebuffers(w, h) {
        const bufs = this.text_animation.achivements_frame_buffer;
        while (bufs.length < 5) {
            bufs.push(null);
        }
        for (let i = 0; i < 3; ++i) {
            if (bufs[i] && typeof bufs[i].remove === "function") {
                bufs[i].remove();
            }
            this.create_text_framebuffer(i, (w * 0.7) / 2, h / 2);
        }
        bufs[4] = null;
    }

    create_text_framebuffer(num, w, h) {
        this.text_animation.achivements_frame_buffer[num] = createFramebuffer({
            format: UNSIGNED_BYTE,
            channels: RGBA,
            depth: false,
            antialias: false,
            width: int(w),
            height: int(h * this.text_animation.block_size),
            textureFiltering: NEAREST,
            density: 1,
        });
    }

    update_text_framebuffer(fb_num, num, target_fb_num) {
        if (target_fb_num != -1) {
            this.text_animation.achivements_frame_buffer[fb_num] =
                this.text_animation.achivements_frame_buffer[target_fb_num];
        } else {
            let fb_w = this.text_animation.achivements_frame_buffer[0].width;
            let fb_h = this.text_animation.achivements_frame_buffer[0].height;

            this.text_animation.achivements_frame_buffer[fb_num].begin();
            clear();
            let j = num;

            const cnum = this.star_animation.current_constallation;
            const lit = this.get_lit_indices(cnum);
            const st = this.style.settings || dataHandler.STYLE_DEFAULTS;
            if (j < 0 || j > lit.length - 1) {
                clear();
            } else {
                const vertIndex = lit[j];
                const star =
                    this.const_verts["orig" + cnum].vert[vertIndex] ||
                    this.const_verts["vert" + cnum].vert[vertIndex];
                const paper = this.rgb01_to_255(st.paper);
                const ink = this.rgb01_to_255(st.ink);
                const gold = this.rgb01_to_255(st.gold);
                const border = Math.max(2, fb_w * st.cardBorder);

                // Parchment fill via background (WEBGL-safe inside framebuffer)
                background(paper[0], paper[1], paper[2]);
                // Gold frame as four bars
                noStroke();
                fill(gold[0], gold[1], gold[2], 255);
                const t = Math.max(1, border * 0.5);
                rect(-fb_w / 2 + border, -fb_h / 2 + border, fb_w - border * 2, t);
                rect(-fb_w / 2 + border, fb_h / 2 - border - t, fb_w - border * 2, t);
                rect(-fb_w / 2 + border, -fb_h / 2 + border, t, fb_h - border * 2);
                rect(fb_w / 2 - border - t, -fb_h / 2 + border, t, fb_h - border * 2);

                fill(ink[0], ink[1], ink[2], 255);
                textSize(int(fb_h * this.text_animation.header_text_size));
                textAlign(CENTER, TOP);
                text(
                    star[2],
                    -(fb_w / 2) + border * 2,
                    -(fb_h / 2) + fb_h * this.text_animation.padding_top + border,
                    fb_w - border * 4,
                    fb_h * this.text_animation.header_size
                );

                fill(gold[0], gold[1], gold[2], 255);
                textSize(int(fb_h * this.text_animation.content_text_size));
                textAlign(CENTER, TOP);
                text(
                    star[3],
                    -(fb_w / 2) + border * 2,
                    -(fb_h / 2) + fb_h * (this.text_animation.header_size + this.text_animation.padding_top) + border,
                    fb_w - border * 4,
                    fb_h * this.text_animation.content_size
                );
            }
            this.text_animation.achivements_frame_buffer[fb_num].end();
        }
    }

    framebuffer_update_desider(direction) {
        let result = [0, 0, 0];
        let num = 0;
        if (direction >= 0) {
            for (let i = 0; i < 3; ++i) {
                for (let j = i; j < 3; ++j) {
                    num = int(this.text_animation.current_achivement_buf) + (i - 1);
                    if (num == this.text_animation.achivements_frame_buffer_num[j]) {
                        this.update_text_framebuffer(4, num, i);
                        this.update_text_framebuffer(i, num, j);
                        this.update_text_framebuffer(j, num, 4);
                        result[i] = 1;
                        this.text_animation.achivements_frame_buffer_num[i] = num;
                        break;
                    }
                }
            }
        } else {
            for (let i = 2; i > -1; --i) {
                for (let j = i; j > -1; --j) {
                    num = int(this.text_animation.current_achivement_buf) + (i - 1);
                    if (num == this.text_animation.achivements_frame_buffer_num[j]) {
                        this.update_text_framebuffer(4, num, i);
                        this.update_text_framebuffer(i, num, j);
                        this.update_text_framebuffer(j, num, 4);
                        result[i] = 1;
                        this.text_animation.achivements_frame_buffer_num[i] = num;
                        break;
                    }
                }
            }
        }
        for (let i = 0; i < 3; ++i) {
            num = int(this.text_animation.current_achivement_buf) + (i - 1);
            if (result[i] == 0) {
                this.update_text_framebuffer(i, num, -1);
                this.text_animation.achivements_frame_buffer_num[i] = num;
            }
        }
    }

    apply_scale(w, h, verticalFactor) {
        if (0.6 * w > h) {
            this.scale.scale_screen_w = (h / (0.53 * w)) * 0.95;
            this.scale.scale_screen_h = 0.95;
        } else {
            this.scale.scale_screen_h = ((0.65 * w) / h) * verticalFactor;
            this.scale.scale_screen_w = verticalFactor;
        }
        this.class_options.w = this.class_options._w * this.scale.scale_screen_w;
        this.class_options.h = this.class_options.w / this.scale.scale_screen_w;
        this.class_options.sc_w = this.class_options.w * 0.5 * w;
        this.class_options.sc_h = this.class_options.h * 0.5 * h;
        this.class_options.sc_x0 = (this.class_options.x0 + 1) * 0.5 * w;
        this.class_options.sc_y0 = (this.class_options.y0 + 1) * 0.5 * h;
    }

    rescale_constellation_verts() {
        for (let i = 0; i < this.const_count; ++i) {
            if (!this.const_verts["vert_screen_space" + i]) {
                this.const_verts["vert_screen_space" + i] = [];
            }
            const origVerts = this.const_verts["orig" + i].vert;
            const drawVerts = this.const_verts["vert" + i].vert;
            for (let j = 0; j < drawVerts.length; ++j) {
                const src = origVerts[j];
                const dst = drawVerts[j];
                // Scale x/y for the board frame; copy title/text/starId from orig
                // so editor writes to orig stay visible without a full page reload.
                dst[0] = ((src[0] + 1) * 0.65 - 0.3) * this.scale.scale_screen_w;
                dst[1] = src[1] * this.scale.scale_screen_h;
                for (let k = 2; k < src.length; ++k) {
                    dst[k] = src[k];
                }
                if (dst.length > src.length) {
                    dst.length = src.length;
                }
                this.const_verts["vert_screen_space" + i][j] = [
                    (dst[0] + 1) * width * 0.5,
                    (dst[1] + 1) * height * 0.5,
                ];
            }
        }
    }

    update_all(w, h) {
        this.apply_scale(w, h, 0.98);
        this.rescale_constellation_verts();
        for (let i = 0; i < this.const_count; ++i) {
            this.const_verts["vert" + i].number = this.const_verts["orig" + i].number;
        }
        this.notify_stars_changed();
        this.ensure_text_framebuffers(w, h);
        this.update_text_framebuffer(0, -1, -1);
        this.update_text_framebuffer(1, 0, -1);
        this.update_text_framebuffer(2, 1, -1);
        this.ensure_nebula_framebuffer(w, h);
    }

    setup(w, h) {
        this.const_geometry = [];
        this.batch_geometry = null;
        this.idle_geometry = null;
        this.apply_scale(w, h, 0.95);
        noStroke();

        for (let i = 0; i < this.const_count; ++i) {
            this.const_verts["vert" + i] = this.deep_clone(this.const_verts["orig" + i]);
            this.const_verts["vert" + i + this.const_count] = [];
            this.const_verts["vert_screen_space" + i] = [];
            const starCount = this.const_verts["vert" + i].vert.length;
            for (let j = 0; j < starCount; ++j) {
                this.const_verts["vert" + i].vert[j][0] =
                    ((this.const_verts["orig" + i].vert[j][0] + 1) * 0.65 - 0.3) * this.scale.scale_screen_w;
                this.const_verts["vert" + i].vert[j][1] =
                    this.const_verts["orig" + i].vert[j][1] * this.scale.scale_screen_h;
                this.const_verts["vert" + i + this.const_count].push([random() * 2 - 1, random() * 2 - 1]);
                this.const_verts["vert_screen_space" + i].push([
                    (this.const_verts["vert" + i].vert[j][0] + 1) * width * 0.5,
                    (this.const_verts["vert" + i].vert[j][1] + 1) * height * 0.5,
                ]);
            }
        }

        this.batch_geometry = this.build_batch_geometry();
        this.notify_stars_changed();
        this.ensure_text_framebuffers(w, h);
        this.load_nebula_settings();
        this.load_style_settings();
        this.nebula.startMs = millis();
        this.ensure_nebula_framebuffer(w, h);
        textFont(this.font);
    }

    set_count(count) {
        this.const_count = count;
        for (let i = 0; i < this.const_count; ++i) {
            this.const_verts["vert" + i] = 0;
            this.const_verts["orig" + i] = 0;
            this.textures.const_textures["txt" + i] = 0;
        }
    }

    async load_textures(f) {
        for (let i = 0; i < this.const_count; ++i) {
            this.textures.const_textures["txt" + i] = f(this.img_path.const_textures[i]);
        }
        this.textures.star_texture = f(this.img_path.star_texture_path);
        this.textures.class_texture = f(this.img_path.class_texture_path);
    }

    async load_img_shader(f) {
        this.shaders.img = f(this.shader_path.img_vert_path, this.shader_path.img_frag_path);
    }
    async load_bg_shader(f) {
        this.shaders.bg = f(this.shader_path.bg_vert_path, this.shader_path.bg_frag_path);
    }
    async load_text_shader(f) {
        this.shaders.text = f(this.shader_path.text_vert_path, this.shader_path.text_frag_path);
    }
    async load_star_shader(f) {
        this.shaders.star = f(this.shader_path.star_vert_path, this.shader_path.star_frag_path);
    }
    async load_class_shader(f) {
        this.shaders.class = f(this.shader_path.class_vert_path, this.shader_path.class_frag_path);
    }
    async load_class_selected_shader(f) {
        this.shaders.class_selected = f(this.shader_path.class_vert_path, this.shader_path.class_selected_frag_path);
    }
    async load_nebula_shader(f) {
        this.shaders.nebula = f(this.shader_path.nebula_vert_path, this.shader_path.nebula_frag_path);
        this.shaders.nebula_blit = f(this.shader_path.nebula_vert_path, this.shader_path.nebula_blit_frag_path);
    }

    async load_nebula_defaults(f) {
        this.nebula.siteDefaultsJson = f("assets/json/nebula_defaults.json");
    }

    async load_style_defaults(f) {
        this.style.siteDefaultsJson = f("assets/json/style_defaults.json");
    }

    nebula_defaults() {
        const base = this.deep_clone(dataHandler.NEBULA_DEFAULTS);
        const fromFile = this.nebula.siteDefaultsJson;
        if (fromFile && typeof fromFile === "object" && !Array.isArray(fromFile)) {
            Object.assign(base, this.deep_clone(fromFile));
        }
        this.nebula.siteDefaults = this.deep_clone(base);
        return this.deep_clone(base);
    }

    load_nebula_settings() {
        const defaults = this.nebula_defaults();
        try {
            const raw = localStorage.getItem("nebulaSettings");
            if (!raw) {
                this.nebula.settings = defaults;
                return;
            }
            const parsed = JSON.parse(raw);
            this.nebula.settings = Object.assign(defaults, parsed);
        } catch (e) {
            this.nebula.settings = defaults;
        }
    }

    save_nebula_settings() {
        try {
            localStorage.setItem("nebulaSettings", JSON.stringify(this.nebula.settings));
        } catch (e) {
            // ignore quota / private mode
        }
    }

    reset_nebula_settings() {
        this.nebula.settings = this.nebula_defaults();
        this.nebula.dirty = true;
        this.save_nebula_settings();
        this.ensure_nebula_framebuffer(this.nebula.screenW, this.nebula.screenH);
    }

    async save_nebula_defaults_for_all() {
        const payload = JSON.stringify(this.nebula.settings);
        this.nebula.siteDefaults = this.deep_clone(this.nebula.settings);
        this.nebula.siteDefaultsJson = this.deep_clone(this.nebula.settings);
        this.save_nebula_settings();

        try {
            const response = await fetch("JSONSaver.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: "nebula_defaults",
                    obj: payload,
                }),
            });
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            return { ok: true, mode: "server" };
        } catch (e) {
            const blob = new Blob([payload], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "nebula_defaults.json";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            return { ok: true, mode: "download", error: String(e && e.message ? e.message : e) };
        }
    }

    style_defaults() {
        const base = this.deep_clone(dataHandler.STYLE_DEFAULTS);
        const fromFile = this.style.siteDefaultsJson;
        if (fromFile && typeof fromFile === "object" && !Array.isArray(fromFile)) {
            Object.assign(base, this.deep_clone(fromFile));
        }
        this.style.siteDefaults = this.deep_clone(base);
        return this.deep_clone(base);
    }

    load_style_settings() {
        const defaults = this.style_defaults();
        try {
            const raw = localStorage.getItem("boardStyleSettings");
            if (!raw) {
                this.style.settings = defaults;
                return;
            }
            this.style.settings = Object.assign(defaults, JSON.parse(raw));
        } catch (e) {
            this.style.settings = defaults;
        }
        this.apply_style_to_text_metrics();
    }

    save_style_settings() {
        try {
            localStorage.setItem("boardStyleSettings", JSON.stringify(this.style.settings));
        } catch (e) {
            /* ignore */
        }
        this.apply_style_to_text_metrics();
    }

    apply_style_to_text_metrics() {
        const s = this.style.settings || this.style_defaults();
        this.text_animation.header_text_size = s.headerScale;
        this.text_animation.content_text_size = s.contentScale;
    }

    reset_style_settings() {
        this.style.settings = this.style_defaults();
        this.save_style_settings();
        this.refresh_achievement_buffers();
    }

    refresh_achievement_buffers() {
        if (!this.text_animation.achivements_frame_buffer[0]) {
            return;
        }
        this.update_text_framebuffer(0, -1, -1);
        this.update_text_framebuffer(1, Math.max(0, Math.floor(this.text_animation.current_achivement) - 0), -1);
        const cur = Math.floor(this.text_animation.current_achivement);
        this.update_text_framebuffer(0, cur - 1, -1);
        this.update_text_framebuffer(1, cur, -1);
        this.update_text_framebuffer(2, cur + 1, -1);
    }

    async save_style_defaults_for_all() {
        const payload = JSON.stringify(this.style.settings);
        this.style.siteDefaults = this.deep_clone(this.style.settings);
        this.style.siteDefaultsJson = this.deep_clone(this.style.settings);
        this.save_style_settings();
        try {
            const response = await fetch("JSONSaver.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "style_defaults", obj: payload }),
            });
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            return { ok: true, mode: "server" };
        } catch (e) {
            const blob = new Blob([payload], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "style_defaults.json";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            return { ok: true, mode: "download", error: String(e && e.message ? e.message : e) };
        }
    }

    rgb01_to_255(rgb) {
        return [Math.round(rgb[0] * 255), Math.round(rgb[1] * 255), Math.round(rgb[2] * 255)];
    }

    apply_star_style_uniforms(shader) {
        const s = this.style.settings || dataHandler.STYLE_DEFAULTS;
        shader.setUniform("uStarDim", s.starDim);
        shader.setUniform("uStarLit", s.starLit);
        shader.setUniform("uStarHot", s.starHot);
        shader.setUniform("uStarBrightness", s.starBrightness);
    }

    resolve_nebula_octaves(w, h) {
        const manual = int(this.nebula.settings.octaves);
        if (manual > 0) {
            return constrain(manual, 1, 6);
        }
        const shortSide = Math.min(w, h);
        if (shortSide < 700) {
            return 3;
        }
        if (shortSide < 1400) {
            return 4;
        }
        return 5;
    }

    resolve_nebula_detail(w, h) {
        const base = this.nebula.settings.detail;
        if (int(this.nebula.settings.octaves) > 0) {
            return base;
        }
        const shortSide = Math.min(w, h);
        if (shortSide < 700) {
            return base * 0.85;
        }
        if (shortSide < 1400) {
            return base;
        }
        return base * 1.1;
    }

    ensure_nebula_framebuffer(w, h) {
        this.nebula.screenW = w;
        this.nebula.screenH = h;
        const scale = constrain(this.nebula.settings.fboScale, 0.25, 1.0);
        const fbW = Math.max(16, int(w * scale));
        const fbH = Math.max(16, int(h * scale));
        if (
            this.nebula.framebuffer &&
            this.nebula.fbW === fbW &&
            this.nebula.fbH === fbH
        ) {
            return;
        }
        if (this.nebula.framebuffer && typeof this.nebula.framebuffer.remove === "function") {
            this.nebula.framebuffer.remove();
        }
        this.nebula.framebuffer = createFramebuffer({
            format: UNSIGNED_BYTE,
            channels: RGBA,
            depth: false,
            antialias: false,
            width: fbW,
            height: fbH,
            textureFiltering: LINEAR,
            density: 1,
        });
        this.nebula.fbW = fbW;
        this.nebula.fbH = fbH;
        this.nebula.dirty = true;
    }

    apply_nebula_uniforms(shader) {
        const s = this.nebula.settings;
        const w = this.nebula.screenW || width;
        const h = this.nebula.screenH || height;
        const period = Math.max(4, s.periodSec);
        const elapsed = (millis() - this.nebula.startMs) * 0.001;
        const phase = ((elapsed % period) / period) * TWO_PI;

        shader.setUniform("u_phase", phase);
        shader.setUniform("u_aspect", w / Math.max(1, h));
        shader.setUniform("u_scale", s.scale);
        shader.setUniform("u_detail", this.resolve_nebula_detail(w, h));
        shader.setUniform("u_gain", s.gain);
        shader.setUniform("u_lacunarity", s.lacunarity);
        shader.setUniform("u_warp", s.warp);
        shader.setUniform("u_contrast", s.contrast);
        shader.setUniform("u_brightness", s.brightness);
        shader.setUniform("u_octaves", this.resolve_nebula_octaves(w, h));
        shader.setUniform("u_colorA", s.colorA);
        shader.setUniform("u_colorB", s.colorB);
        shader.setUniform("u_colorC", s.colorC);
        shader.setUniform("u_colorD", s.colorD);
    }

    update_nebula_framebuffer() {
        if (!this.nebula.framebuffer || !this.shaders.nebula) {
            return;
        }
        const hz = Math.max(1, this.nebula.settings.updateHz);
        const interval = 1000 / hz;
        const now = millis();
        if (!this.nebula.dirty && now - this.nebula.lastUpdateMs < interval) {
            return;
        }

        const bakeStart = performance.now();
        this.nebula.framebuffer.begin();
        clear();
        shader(this.shaders.nebula);
        this.apply_nebula_uniforms(this.shaders.nebula);
        this.shaders.nebula.setUniform("coord", [-1, -1, 0, 0]);
        this.shaders.nebula.setUniform("w", 2.0);
        this.shaders.nebula.setUniform("h", 2.0);
        rect(0, 0, this.nebula.fbW, this.nebula.fbH);
        this.nebula.framebuffer.end();
        this.nebula.lastBakeMs = performance.now() - bakeStart;

        this.nebula.lastUpdateMs = now;
        this.nebula.dirty = false;
    }

    mark_nebula_dirty() {
        this.nebula.dirty = true;
    }

    async load_fonts(f) {
        this.font = await f(this.font_path);
    }

    async load_constallations_verts(f) {
        // One request per file; p5 preload fills the object before setup().
        // Clone into vert* only in setup(), after JSON is actually loaded.
        for (let i = 0; i < this.const_count; ++i) {
            this.const_verts["orig" + i] = f(this.json_constallation_verts_path[i]);
        }
    }

    get_const_target_vert(num) {
        return this.const_verts["vert" + num].vert;
    }
    get_const_initial_vert(num) {
        return this.const_verts["vert" + num + this.const_count];
    }

    draw_background() {
        clear();
        this.update_nebula_framebuffer();
        if (!this.nebula.framebuffer || !this.shaders.nebula_blit) {
            shader(this.shaders.bg);
            this.shaders.bg.setUniform("col", [0.01, 0.01, 0.01, 1]);
            this.shaders.bg.setUniform("coord", [-1, -1, 0, 0]);
            this.shaders.bg.setUniform("w", 2.0);
            this.shaders.bg.setUniform("h", 2.0);
            rect(0, 0, width, height);
            return;
        }
        shader(this.shaders.nebula_blit);
        this.shaders.nebula_blit.setUniform("u_tex", this.nebula.framebuffer);
        this.shaders.nebula_blit.setUniform("coord", [-1, -1, 0, 0]);
        this.shaders.nebula_blit.setUniform("w", 2.0);
        this.shaders.nebula_blit.setUniform("h", 2.0);
        rect(0, 0, width, height);
    }

    draw_rect(x, y, r) {
        shader(this.shaders.bg);
        this.shaders.bg.setUniform("col", [1.0, 1.0, 1.0, 1.0]);
        this.shaders.bg.setUniform("coord", [x - r / 2, y - r / 2, 0, 0]);
        this.shaders.bg.setUniform("w", r);
        this.shaders.bg.setUniform("h", r);
        rect(0, 0, width, height);
    }

    draw_flat_rect(x, y, w, h, rgba) {
        // Canvas uses premultiplied alpha
        const a = rgba[3] != null ? rgba[3] : 1;
        const premul = [rgba[0] * a, rgba[1] * a, rgba[2] * a, a];
        shader(this.shaders.bg);
        this.shaders.bg.setUniform("col", premul);
        this.shaders.bg.setUniform("coord", [x, y, 0, 0]);
        this.shaders.bg.setUniform("w", w);
        this.shaders.bg.setUniform("h", h);
        rect(0, 0, width, height);
    }

    draw_class_plate() {
        const s = this.style.settings || dataHandler.STYLE_DEFAULTS;
        const pad = 0.018;
        const plate = s.classPlate || dataHandler.STYLE_DEFAULTS.classPlate;
        const a = s.classPlateAlpha != null ? s.classPlateAlpha : 0.84;
        const x0 = this.class_options.x0;
        const y0 = this.class_options.y0;
        const gw = this.class_options.w;
        const gh = this.class_options.h;
        // Stone slab
        this.draw_flat_rect(x0 - pad, y0 - pad, gw + pad * 2, gh + pad * 2, [plate[0], plate[1], plate[2], a]);
        // Outer bright rim + inner dim rim (Skyrim tablet)
        const gold = s.gold || dataHandler.STYLE_DEFAULTS.gold;
        const goldDim = s.goldDim || dataHandler.STYLE_DEFAULTS.goldDim;
        const outer = 0.0055;
        const gap = 0.004;
        const inner = 0.0028;
        const ox = x0 - pad;
        const oy = y0 - pad;
        const ow = gw + pad * 2;
        const oh = gh + pad * 2;
        const rim = (x, y, w, h, rgb, alpha) => this.draw_flat_rect(x, y, w, h, [rgb[0], rgb[1], rgb[2], alpha]);
        rim(ox, oy, ow, outer, gold, 0.85);
        rim(ox, oy + oh - outer, ow, outer, gold, 0.85);
        rim(ox, oy, outer, oh, gold, 0.85);
        rim(ox + ow - outer, oy, outer, oh, gold, 0.85);
        const ix = ox + outer + gap;
        const iy = oy + outer + gap;
        const iw = ow - (outer + gap) * 2;
        const ih = oh - (outer + gap) * 2;
        rim(ix, iy, iw, inner, goldDim, 0.55);
        rim(ix, iy + ih - inner, iw, inner, goldDim, 0.55);
        rim(ix, iy, inner, ih, goldDim, 0.55);
        rim(ix + iw - inner, iy, inner, ih, goldDim, 0.55);
        // Quiet cell dividers
        const lw = 0.0022;
        const lineCol = [goldDim[0], goldDim[1], goldDim[2], 0.4];
        for (let i = 1; i <= 2; i++) {
            const fx = x0 + (i / 3) * gw - lw * 0.5;
            this.draw_flat_rect(fx, y0, lw, gh, lineCol);
            const fy = y0 + (i / 3) * gh - lw * 0.5;
            this.draw_flat_rect(x0, fy, gw, lw, lineCol);
        }
    }

    /**
     * @param {number} id cell 0..8
     * @param {"active"|"hover"} mode
     */
    draw_class_cell(id, mode) {
        if (id < 0 || id > 8) {
            return;
        }
        const s = this.style.settings || dataHandler.STYLE_DEFAULTS;
        const glyph =
            mode === "active"
                ? s.gold || dataHandler.STYLE_DEFAULTS.gold
                : s.classHover || dataHandler.STYLE_DEFAULTS.classHover;
        const fillRgb = s.classActive || dataHandler.STYLE_DEFAULTS.classActive;
        const borderRgb =
            mode === "active"
                ? s.gold || dataHandler.STYLE_DEFAULTS.gold
                : s.classHover || dataHandler.STYLE_DEFAULTS.classHover;
        const fillA = mode === "active" ? 0.38 : 0.14;
        const borderA = mode === "active" ? 0.95 : 0.8;
        const glyphA = mode === "active" ? 1.2 : 1.08;

        shader(this.shaders.class_selected);
        this.shaders.class_selected.setUniform("tex", this.textures.class_texture);
        this.shaders.class_selected.setUniform("coord", [
            this.class_options.x0 + (id % 3) * 0.33333 * this.class_options.w,
            this.class_options.y0 + Math.floor(id / 3) * 0.33333 * this.class_options.h,
        ]);
        this.shaders.class_selected.setUniform("w", this.class_options.w * 0.33333);
        this.shaders.class_selected.setUniform("h", this.class_options.h * 0.33333);
        this.shaders.class_selected.setUniform("tx_0", (id % 3) * 0.33333);
        this.shaders.class_selected.setUniform("ty_0", (2 - Math.floor(id / 3)) * 0.3333);
        this.shaders.class_selected.setUniform("tw", 0.3333);
        this.shaders.class_selected.setUniform("th", 0.3333);
        this.shaders.class_selected.setUniform("uGlyphColor", glyph);
        this.shaders.class_selected.setUniform("uGlyphAlpha", glyphA);
        this.shaders.class_selected.setUniform("uFill", [fillRgb[0], fillRgb[1], fillRgb[2], fillA]);
        this.shaders.class_selected.setUniform("uBorder", [borderRgb[0], borderRgb[1], borderRgb[2], borderA]);
        this.shaders.class_selected.setUniform("uBorderWidth", mode === "active" ? 0.07 : 0.055);
        rect(0, 0, width, height);
    }

    draw_class() {
        const s = this.style.settings || dataHandler.STYLE_DEFAULTS;
        this.draw_class_plate();

        const glyph = s.classGlyph || dataHandler.STYLE_DEFAULTS.classGlyph;
        shader(this.shaders.class);
        this.shaders.class.setUniform("tex", this.textures.class_texture);
        this.shaders.class.setUniform("coord", [this.class_options.x0, this.class_options.y0]);
        this.shaders.class.setUniform("w", this.class_options.w);
        this.shaders.class.setUniform("h", this.class_options.h);
        this.shaders.class.setUniform("tx_0", 0.0);
        this.shaders.class.setUniform("ty_0", 0.0);
        this.shaders.class.setUniform("tw", 1.0);
        this.shaders.class.setUniform("th", 1.0);
        this.shaders.class.setUniform("uGlyphColor", glyph);
        this.shaders.class.setUniform("uGlyphAlpha", 0.95);
        rect(0, 0, width, height);

        const active =
            this.star_animation.current_constallation < 9
                ? this.star_animation.current_constallation
                : -1;
        const hover = this.class_options.current_selection;
        // One overlay pass so premul alpha does not muddy
        if (active > -1) {
            this.draw_class_cell(active, "active");
        }
        if (hover > -1 && hover !== active) {
            this.draw_class_cell(hover, "hover");
        }
    }

    draw_achivement_block(buf_num, h_0, h) {
        let persantage = 1 - (this.text_animation.block_size - h) / this.text_animation.block_size;
        persantage *= smth(this.star_animation.current_frame / (this.star_animation.length - 1));
        this.shaders.text.setUniform("txt", this.text_animation.achivements_frame_buffer[buf_num]);
        this.shaders.text.setUniform("coord", [-0.95, h_0, 0, 0]);
        this.shaders.text.setUniform("h", h);
        this.shaders.text.setUniform("w", 0.5 * persantage + 0.2);
        this.shaders.text.setUniform("c", persantage);
        rect(0, 0, 1, 1);
    }

    achivements_scroll_decider(high_value, normal_value) {
        if (Math.abs(this.text_animation.delta) > high_value * 2) {
            this.text_animation.current_achivement += high_value * Math.sign(this.text_animation.delta);
            this.text_animation.delta -= high_value * Math.sign(this.text_animation.delta);
        } else if (Math.abs(this.text_animation.delta) >= 0.001) {
            this.text_animation.current_achivement += this.text_animation.delta * normal_value;
            this.text_animation.delta -= this.text_animation.delta * normal_value;
        } else if (this.text_animation.delta != 0) {
            this.text_animation.current_achivement = int(this.text_animation.current_achivement);
            if (this.text_animation.delta > 0) {
                this.text_animation.current_achivement += 1;
            }
            this.text_animation.delta = 0;
        }
    }

    draw_achivements(h, w) {
        this.achivements_scroll_decider(2.23, 0.09);
        let half_block = this.text_animation.block_size / 2;
        let offsetY = this.text_animation.current_achivement - Math.trunc(this.text_animation.current_achivement);
        offsetY *= this.text_animation.block_size;
        shader(this.shaders.text);
        if (half_block - offsetY > 0) {
            this.text_animation.current_achivement_buf = this.text_animation.current_achivement;
            this.framebuffer_update_desider(this.text_animation.delta);
            this.draw_achivement_block(0, 0.75 + offsetY, half_block - offsetY);
            this.draw_achivement_block(1, 0.35 + offsetY, this.text_animation.block_size);
            this.draw_achivement_block(2, 0.15, half_block + offsetY);
        } else {
            this.text_animation.current_achivement_buf = this.text_animation.current_achivement + 1;
            this.framebuffer_update_desider(this.text_animation.delta);
            offsetY = offsetY - half_block;
            this.draw_achivement_block(0, 0.55 + offsetY, this.text_animation.block_size - offsetY);
            this.draw_achivement_block(1, 0.15 + offsetY, this.text_animation.block_size);
            this.draw_achivement_block(2, 0.15, offsetY);
        }
    }

    wheel_handler(delta) {
        const litCount = this.get_lit_indices(this.star_animation.current_constallation).length;
        const maxIdx = Math.max(0, litCount - 1);
        if (this.text_animation.current_achivement + this.text_animation.delta + delta < 0) {
            this.text_animation.delta = 0 - this.text_animation.current_achivement;
        } else if (this.text_animation.current_achivement + this.text_animation.delta + delta > maxIdx) {
            this.text_animation.delta = maxIdx - this.text_animation.current_achivement;
        } else {
            this.text_animation.delta += delta;
        }
    }

    draw_background_const(num, percentage) {
        if (num == null || num < 0 || num > 9) {
            return;
        }
        const s = this.style.settings || dataHandler.STYLE_DEFAULTS;
        const col = s.silhouetteColor || dataHandler.STYLE_DEFAULTS.silhouetteColor;
        const alpha = s.silhouetteAlpha != null ? s.silhouetteAlpha : 0.42;
        shader(this.shaders.img);
        this.shaders.img.setUniform("sh", this.scale.scale_screen_h);
        this.shaders.img.setUniform("sw", this.scale.scale_screen_w);
        this.shaders.img.setUniform("t", (0.8 * this.star_animation.current_frame) / this.star_animation.length);
        this.shaders.img.setUniform("txt", this.textures.const_textures["txt" + num]);
        this.shaders.img.setUniform("uSilhouetteColor", col);
        this.shaders.img.setUniform("uSilhouetteAlpha", alpha);
        rect(0, 0, 1, 1);
    }

    draw_idle_sky() {
        if (!this.idle_geometry) {
            return;
        }
        shader(this.shaders.star);
        this.shaders.star.setUniform("uMode", 0);
        this.shaders.star.setUniform("star", this.textures.star_texture);
        this.apply_star_style_uniforms(this.shaders.star);
        this.shaders.star.setUniform("act", -1);
        this.shaders.star.setUniform("last_lit", -1);
        this.shaders.star.setUniform("batchSize", 0);
        this.shaders.star.setUniform("batchBase", 0);
        model(this.idle_geometry);
    }

    draw_star_batches(num, start, end, t) {
        const n = this.const_verts["vert" + num].vert.length;
        const batch = this.star_animation.batch_size;
        const posArr = this.star_animation.batch_pos;
        const posUniform = this.star_animation.batch_pos_uniform;
        const litUniform = this.star_animation.batch_lit_uniform;
        const verts = this.const_verts["vert" + num].vert;
        const origVerts = this.const_verts["orig" + num].vert;
        const prefixFallback =
            this.const_verts["orig" + num].number > 0 &&
            !origVerts.some((v) => this.is_vert_lit(v));

        shader(this.shaders.star);
        this.star_texture_decider(num);
        this.shaders.star.setUniform("uMode", 1);
        this.shaders.star.setUniform("sh", this.scale.scale_screen_h);
        this.shaders.star.setUniform("sw", this.scale.scale_screen_w);
        this.shaders.star.setUniform("star", this.textures.star_texture);
        this.apply_star_style_uniforms(this.shaders.star);

        for (let base = 0; base < n; base += batch) {
            const count = Math.min(batch, n - base);
            for (let j = 0; j < count; ++j) {
                const i = base + j;
                const i2 = i * 2;
                const x = start[i2] + (end[i2] - start[i2]) * t;
                const y = start[i2 + 1] + (end[i2 + 1] - start[i2 + 1]) * t;
                posArr[j * 2] = x;
                posArr[j * 2 + 1] = y;
                posUniform[j * 2] = x;
                posUniform[j * 2 + 1] = y;
                const lit =
                    this.is_vert_lit(origVerts[i] || verts[i]) ||
                    (prefixFallback && i < this.const_verts["orig" + num].number);
                litUniform[j] = lit ? 1 : 0;
            }
            for (let j = count; j < batch; ++j) {
                litUniform[j] = 0;
            }
            this.shaders.star.setUniform("pos", posUniform);
            this.shaders.star.setUniform("litMask", litUniform);
            this.shaders.star.setUniform("batchBase", base);
            this.shaders.star.setUniform("batchSize", count);
            model(this.batch_geometry);
        }
    }

    draw_const(num) {
        this.advance_animation(num);
        const start = this.star_animation.start_data[num];
        const end = this.star_animation.end_data[num];
        const rawT = this.star_animation.current_frame / (this.star_animation.length - 1);
        this.draw_star_batches(num, start, end, smth(rawT));
    }

    star_texture_decider(num) {
        if (num != this.star_animation.current_constallation) {
            this.shaders.star.setUniform("r", this.star_animation.min_size);
            this.shaders.star.setUniform("act", -1);
        } else {
            this.shaders.star.setUniform(
                "r",
                this.star_animation.min_size +
                    this.star_animation.add_size * (this.star_animation.current_frame / this.star_animation.length)
            );
            if (this.star_animation.finished != 1) {
                this.shaders.star.setUniform("act", -1);
            } else {
                let act = this.text_animation.focus_vert;
                if (act < 0) {
                    act = this.lit_list_index_to_vert(
                        num,
                        this.text_animation.current_achivement + this.text_animation.delta
                    );
                }
                this.shaders.star.setUniform("act", act);
            }
        }
        this.shaders.star.setUniform("last_lit", -1);
    }

    advance_animation(num) {
        if (num != this.star_animation.current_constallation) {
            return;
        }
        if (this.star_animation.direction == 1) {
            this.star_animation.current_frame += 1;
            this.star_animation.finished = 0;
            if (this.star_animation.current_frame >= this.star_animation.length - 1) {
                this.star_animation.finished = 1;
                this.star_animation.current_frame = this.star_animation.length - 1;
            }
        } else {
            this.star_animation.current_frame -= 1;
            this.star_animation.finished = 0;
            if (this.star_animation.current_frame <= 0) {
                this.star_animation.current_frame = 0;
                this.star_animation.finished = -1;
            }
        }
    }

    transition_decider() {
        if (this.star_animation.transition != -1) {
            if (this.star_animation.finished == -1) {
                this.select_const(this.star_animation.transition);
            }
        }
    }

    unselect_const() {
        this.star_animation.direction = -1;
    }
    select_const(num) {
        this.star_animation.direction = 1;
        this.text_animation.current_achivement = 0;
        this.text_animation.focus_vert = this.lit_list_index_to_vert(num, 0);
        this.star_animation.current_constallation = num;
        this.star_animation.transition = -1;
        this.sync_lit_count(num);
        this.rebuild_idle_geometry();
        this.update_text_framebuffer(0, -1, -1);
        this.update_text_framebuffer(1, 0, -1);
        this.update_text_framebuffer(2, 1, -1);
    }

    mouseHandler(trashold) {
        let con = this.const_verts["vert_screen_space" + this.star_animation.current_constallation];
        let x = mouseX;
        let y = height - mouseY;
        let id = -1;
        this.class_options.current_selection = -1;
        const cnum = this.star_animation.current_constallation;
        const editor = typeof add_new_star === "function";

        if (x >= this.class_options.sc_x0 && x <= this.class_options.sc_x0 + this.class_options.sc_w) {
            if (y >= this.class_options.sc_y0 && y <= this.class_options.sc_y0 + this.class_options.sc_h) {
                id = Math.floor(((x - this.class_options.sc_x0) / this.class_options.sc_w) * 3);
                id += Math.floor(((y - this.class_options.sc_y0) / this.class_options.sc_h) * 3) * 3;
                this.class_options.current_selection = id;
            }
        } else {
            const lit = this.get_lit_indices(cnum);
            const n = this.const_verts["vert" + cnum].vert.length;
            for (let i = 0; i < n; ++i) {
                if (!editor && lit.indexOf(i) < 0) {
                    continue;
                }
                if (x > con[i][0] - trashold && x < con[i][0] + trashold) {
                    if (y > con[i][1] - trashold && y < con[i][1] + trashold) {
                        this.text_animation.focus_vert = i;
                        const listIdx = this.vert_to_lit_list_index(cnum, i);
                        if (listIdx >= 0) {
                            const cur = this.text_animation.current_achivement + this.text_animation.delta;
                            if (cur < listIdx - 0.1 || cur > listIdx + 0.1) {
                                this.text_animation.delta += listIdx - cur;
                            }
                        }
                        if (editor && typeof window.onEditorStarFocus === "function") {
                            window.onEditorStarFocus(i);
                        }
                    }
                }
            }
        }
    }
}
