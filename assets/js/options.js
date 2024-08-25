class dataHandler {
    /**
     *
     * contains normalized coordinates of initioal and target positions
     * @memberof dataHandler
     */
    const_verts = {};

    /**
     *contains relative paths to shaders used
     *
     * @memberof dataHandler
     */
    shader_path = {
        //
        bg_vert_path: ".\\assets\\shaders\\bg.vert",
        bg_frag_path: ".\\assets\\shaders\\bg.frag",
        img_vert_path: ".\\assets\\shaders\\img.vert",
        img_frag_path: ".\\assets\\shaders\\img.frag",
        text_vert_path: ".\\assets\\shaders\\text.vert",
        text_frag_path: ".\\assets\\shaders\\text.frag",
        star_vert_path: ".\\assets\\shaders\\star.vert",
        star_frag_path: ".\\assets\\shaders\\star.frag",
        class_vert_path: ".\\assets\\shaders\\class.vert",
        class_frag_path: ".\\assets\\shaders\\class.frag",
        class_selected_frag_path: ".\\assets\\shaders\\class_selected.frag",
    };

    /**
     *contain ralarive paths to JSONs, containig info about stars
     *
     * @memberof dataHandler
     */
    json_constallation_verts_path = [
        ".\\assets\\json\\const0.json",
        ".\\assets\\json\\const1.json",
        ".\\assets\\json\\const2.json",
        ".\\assets\\json\\const3.json",
        ".\\assets\\json\\const4.json",
        ".\\assets\\json\\const5.json",
        ".\\assets\\json\\const6.json",
        ".\\assets\\json\\const7.json",
        ".\\assets\\json\\const8.json",
    ];

    /**
     *ralative path to a font, used to dispay text
     *
     * @memberof dataHandler
     */
    font_path = ".\\assets\\fonts\\ARIALI.TTF";

    /**
     *contains paths to images used (constallations images)
     *
     * @memberof dataHandler
     */
    img_path = {
        /**array of paths to constallation textures */
        const_textures: [
            ".\\assets\\textures\\tex0.png",
            ".\\assets\\textures\\tex1.png",
            ".\\assets\\textures\\tex2.png",
            ".\\assets\\textures\\tex3.png",
            ".\\assets\\textures\\tex4.png",
            ".\\assets\\textures\\tex5.png",
            ".\\assets\\textures\\tex6.png",
            ".\\assets\\textures\\tex7.png",
            ".\\assets\\textures\\tex8.png",
        ],
        star_texture_path: ".\\assets\\textures\\star_texture.png",
        class_texture_path: ".\\assets\\textures\\class_texture.png",
    };

    /**
    contains info about animation status of stars 
    */
    star_animation = {
        /**current time of animation (in ms)*/
        current_frame: 0,
        finished: 0,
        transition: -1,
        /** 1 - forward, -1 - backwards*/
        direction: 1,
        /** current constallation, that being animated*/
        current_constallation: 0,
        /** length of animation*/
        length: 80,
        /** textures, that defines the coordinates of constallations during animations */
        animation_coord: [],
    };

    text_animation = {
        achivements_frame_buffer: [],
        achivements_frame_buffer_num: [-2, -2, -2],
        current_achivement: 1,
        current_achivement_buf: 1,
        block_height: [],
        block_size: 0.4,
        padding_top: 0.03,
        header_size: 0.3,
        content_size: 0.6,
        header_text_size: 0.15,
        content_text_size: 0.12,
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
    };

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
        //console.log(fb_num, num);
        if (target_fb_num != -1) {
            this.text_animation.achivements_frame_buffer[fb_num] =
                this.text_animation.achivements_frame_buffer[target_fb_num];
            //console.log("saved update");
        } else {
            let fb_w = this.text_animation.achivements_frame_buffer[0].width;
            let fb_h = this.text_animation.achivements_frame_buffer[0].height;

            //rect(-(fb_w / 2), -(fb_h / 2), fb_w, h * this.text_animation.block_size);
            this.text_animation.achivements_frame_buffer[fb_num].begin();
            clear();
            let j = num;

            //console.log(j);
            if (j < 0) {
                clear();
            } else if (j > this.const_verts["vert" + this.star_animation.current_constallation].number - 1) {
                clear();
            } else {
                textSize(int(fb_h * this.text_animation.header_text_size));
                textAlign(CENTER, TOP);
                text(
                    this.const_verts["vert" + this.star_animation.current_constallation].vert[j][2],
                    -(fb_w / 2),
                    -(fb_h / 2) + fb_h * this.text_animation.padding_top,
                    fb_w,
                    fb_h * this.text_animation.header_size
                );

                textSize(int(fb_h * this.text_animation.content_text_size));
                textAlign(CENTER, TOP);
                text(
                    this.const_verts["vert" + this.star_animation.current_constallation].vert[j][3],
                    -(fb_w / 2),
                    -(fb_h / 2) + fb_h * (this.text_animation.header_size + this.text_animation.padding_top),
                    fb_w,
                    fb_h * this.text_animation.content_size
                );
            }
            this.text_animation.achivements_frame_buffer[fb_num].end();
        }
        //rect(-(fb_w / 2), fb_h / 2 - h * this.text_animation.block_size, fb_w, h * this.text_animation.block_size);
    }

    framebuffer_update_desider(direction) {
        //console.log(this.text_animation.achivements_frame_buffer_num, int(this.text_animation.current_achivement_buf));
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
                    //console.log(i, j);
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
                //console.log("redrawing", i);
            }
        }
    }

    update_all(w, h) {
        if (0.65 * w > h) {
            this.scale.scale_screen_w = (h / (0.65 * w)) * 0.95;
            this.scale.scale_screen_h = 0.95;
        }
        //TODO: запилить все-таки нормальное масштабирование для вертикального просмотра
        else {
            this.scale.scale_screen_h = ((0.65 * w) / h) * 0.95;
            this.scale.scale_screen_w = 0.95;
        }
        this.class_options.w = this.class_options._w * this.scale.scale_screen_w;
        this.class_options.h = this.class_options.w / this.scale.scale_screen_w;
        this.class_options.sc_w = this.class_options.w * 0.5 * w;
        this.class_options.sc_h = this.class_options.h * 0.5 * h;
        this.class_options.sc_x0 = (this.class_options.x0 + 1) * 0.5 * w;
        this.class_options.sc_y0 = (this.class_options.y0 + 1) * 0.5 * h;

        for (let i = 0; i < this.const_count; ++i) {
            for (let j = 0; j < this.const_verts["vert" + i].vert.length; ++j) {
                this.const_verts["vert" + i].vert[j][0] =
                    ((this.const_verts["orig" + i].vert[j][0] + 1) * 0.65 - 0.3) * this.scale.scale_screen_w;
                this.const_verts["vert" + i].vert[j][1] =
                    this.const_verts["orig" + i].vert[j][1] * this.scale.scale_screen_h;
                // this.const_verts["vert" + i].vert[j][0] = 0.0;
                // this.const_verts["vert" + i].vert[j][1] = 0.0;
                this.const_verts["vert_screen_space" + i][j] = [
                    (this.const_verts["vert" + i].vert[j][0] + 1) * width * 0.5,
                    (this.const_verts["vert" + i].vert[j][1] + 1) * height * 0.5,
                ];
            }
        }
        //this.text_animation.achivements_frame_buffer =

        for (let i = 0; i < d.const_count; ++i) {
            this.star_animation.animation_coord[i] = makeTextureAnim(
                this.get_const_initial_vert(i),
                this.get_const_target_vert(i),
                this.star_animation.length
            );
        }
        for (let i = 0; i < 3; ++i) {
            //TODO вынести все числа в параметры и настройку масштаба текстуры текста тоже
            this.text_animation.achivements_frame_buffer.push(0);
            this.create_text_framebuffer(i, (w * 0.7) / 2, h / 2);
        }
        this.text_animation.achivements_frame_buffer.push(0);
        this.update_text_framebuffer(0, -1, -1);
        this.update_text_framebuffer(1, 0, -1);
        this.update_text_framebuffer(2, 1, -1);
        //this.update_text_framebuffer();
    }

    setup(w, h) {
        this.const_geometry = [];
        if (0.65 * w > h) {
            this.scale.scale_screen_w = (h / (0.65 * w)) * 0.95;
            this.scale.scale_screen_h = 0.95;
        }
        //TODO: запилить все-таки нормальное масштабирование для вертикального просмотра
        else {
            this.scale.scale_screen_h = ((0.65 * w) / h) * 0.95;
            this.scale.scale_screen_w = 0.95;
        }
        this.class_options.w = this.class_options._w * this.scale.scale_screen_w;
        this.class_options.h = this.class_options.w / this.scale.scale_screen_w;
        this.class_options.sc_w = this.class_options.w * 0.5 * w;
        this.class_options.sc_h = this.class_options.h * 0.5 * h;
        this.class_options.sc_x0 = (this.class_options.x0 + 1) * 0.5 * w;
        this.class_options.sc_y0 = (this.class_options.y0 + 1) * 0.5 * h;
        noStroke();
        for (let i = 0; i < this.const_count; ++i) {
            this.const_verts["vert" + i + this.const_count] = [];
            this.const_verts["vert_screen_space" + i] = [];
            this.const_geometry.push(
                buildGeometry(() => {
                    for (let j = 0; j < this.const_verts["vert" + i].vert.length; ++j) {
                        rect(0, 0, 0.1, 0.1);
                        this.const_verts["vert" + i].vert[j][0] =
                            ((this.const_verts["orig" + i].vert[j][0] + 1) * 0.65 - 0.3) * this.scale.scale_screen_w;
                        this.const_verts["vert" + i].vert[j][1] =
                            this.const_verts["orig" + i].vert[j][1] * this.scale.scale_screen_h;
                        // this.const_verts["vert" + i].vert[j][0] = 0.0;
                        // this.const_verts["vert" + i].vert[j][1] = 0.0;
                        this.const_verts["vert" + i + this.const_count].push([random() * 2 - 1, random() * 2 - 1]);
                        this.const_verts["vert_screen_space" + i].push([
                            (this.const_verts["vert" + i].vert[j][0] + 1) * width * 0.5,
                            (this.const_verts["vert" + i].vert[j][1] + 1) * height * 0.5,
                        ]);
                    }
                })
            );
        }
        //this.text_animation.achivements_frame_buffer =

        for (let i = 0; i < d.const_count; ++i) {
            this.star_animation.animation_coord.push(
                makeTextureAnim(
                    this.get_const_initial_vert(i),
                    this.get_const_target_vert(i),
                    this.star_animation.length
                )
            );
            // this.star_animation.animation_textures[i] = drawingContext.createTexture();
            // let src = makeTextureAnim(
            //     this.get_const_initial_vert(i),
            //     this.get_const_target_vert(i),
            //     this.star_animation.length
            // );
            // drawingContext.bindTexture(drawingContext.TEXTURE_2D, this.star_animation.animation_textures[i]);

            // drawingContext.texImage2D(
            //     drawingContext.TEXTURE_2D,
            //     0,
            //     drawingContext.RG32F,
            //     int(src.length) / (this.star_animation.length * 2),
            //     this.star_animation.length,
            //     0,
            //     drawingContext.RG,
            //     drawingContext.FLOAT,
            //     src
            // );
            // console.log(drawingContext.getParameter(drawingContext.TEXTURE_BINDING_2D));
        }
        for (let i = 0; i < 3; ++i) {
            //TODO вынести все числа в параметры и настройку масштаба текстуры текста тоже
            this.text_animation.achivements_frame_buffer.push(0);
            this.create_text_framebuffer(i, (w * 0.7) / 2, h / 2);
        }
        this.text_animation.achivements_frame_buffer.push(0);
        textFont(this.font);
        //this.update_text_framebuffer();
    }

    set_count(count) {
        this.const_count = count;
        for (let i = 0; i < this.const_count; ++i) {
            this.const_verts["vert" + i] = 0;
            this.const_verts["orig" + i] = 0;
            this.textures.const_textures["txt" + i] = 0;
        }
        //console.log(this.const_verts);
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

    async load_fonts(f) {
        this.font = await f(this.font_path);
    }

    async load_constallations_verts(f) {
        // for (let i = 0; i < count; ++i) {

        // }
        for (let i = 0; i < this.const_count; ++i) {
            this.const_verts["orig" + i] = await f(this.json_constallation_verts_path[i]);
            this.const_verts["vert" + i] = await f(this.json_constallation_verts_path[i]);

            //console.log(this.const_verts);
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
        shader(this.shaders.bg);
        this.shaders.bg.setUniform("col", [0.01, 0.01, 0.01, 1]);
        this.shaders.bg.setUniform("coord", [-1, -1, 0, 0]);
        this.shaders.bg.setUniform("w", 2.0);
        this.shaders.bg.setUniform("h", 2.0);
        //this.shaders.bg.setUniform("time", t);
        rect(0, 0, width, height);
    }

    draw_rect(x, y, r) {
        shader(this.shaders.bg);
        this.shaders.bg.setUniform("col", [1.0, 1.0, 1.0, 1.0]);
        this.shaders.bg.setUniform("coord", [x - r / 2, y - r / 2, 0, 0]);
        this.shaders.bg.setUniform("w", r);
        this.shaders.bg.setUniform("h", r);
        //this.shaders.bg.setUniform("time", t);
        rect(0, 0, width, height);
    }

    draw_class_selected(id, c) {
        shader(this.shaders.class_selected);
        this.shaders.class_selected.setUniform("tex", this.textures.class_texture);
        this.shaders.class_selected.setUniform("coord", [
            this.class_options.x0 - 0.003 + (id % 3) * 0.33333 * this.class_options.w,
            this.class_options.y0 - 0.003 + Math.floor(id / 3) * 0.33333 * this.class_options.h,
        ]);
        this.shaders.class_selected.setUniform("w", this.class_options.w * 0.33333);
        this.shaders.class_selected.setUniform("h", this.class_options.h * 0.33333);
        this.shaders.class_selected.setUniform("tx_0", (id % 3) * 0.33333);
        this.shaders.class_selected.setUniform("ty_0", (2 - Math.floor(id / 3)) * 0.3333);
        this.shaders.class_selected.setUniform("tw", 0.3333);
        this.shaders.class_selected.setUniform("th", 0.3333);
        this.shaders.class_selected.setUniform("c", c);
        rect(0, 0, width, height);
    }

    draw_class() {
        if (this.class_options.current_selection > -1) {
            this.draw_class_selected(this.class_options.current_selection, [1.0, 1.0, 0.0, 0.0]);
        }
        if (this.star_animation.current_constallation < 10) {
            this.draw_class_selected(this.star_animation.current_constallation, [1.0, 1.0, 0.0, 0.0]);
        }
        shader(this.shaders.class);
        this.shaders.class.setUniform("tex", this.textures.class_texture);
        this.shaders.class.setUniform("coord", [this.class_options.x0, this.class_options.y0]);
        this.shaders.class.setUniform("w", this.class_options.w);
        this.shaders.class.setUniform("h", this.class_options.h);
        this.shaders.class.setUniform("tx_0", 0.0);
        this.shaders.class.setUniform("ty_0", 0.0);
        this.shaders.class.setUniform("tw", 1.0);
        this.shaders.class.setUniform("th", 1.0);
        rect(0, 0, width, height);

        //this.shaders.bg.setUniform("time", t);

        //console.log(this.class_options.x0, this.class_options.y0);
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
        //TODO вынести все числа в настройки
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
        if (this.text_animation.current_achivement + this.text_animation.delta + delta < 0) {
            this.text_animation.delta = 0 - this.text_animation.current_achivement;
        } else if (
            this.text_animation.current_achivement + this.text_animation.delta + delta >
            this.const_verts["vert" + this.star_animation.current_constallation].number - 1
        ) {
            this.text_animation.delta =
                this.const_verts["vert" + this.star_animation.current_constallation].number -
                1 -
                this.text_animation.current_achivement;
        } else {
            this.text_animation.delta += delta;
        }
    }

    draw_background_const(num, percentage) {
        shader(this.shaders.img);
        this.shaders.img.setUniform("sh", this.scale.scale_screen_h);
        this.shaders.img.setUniform("sw", this.scale.scale_screen_w);
        this.shaders.img.setUniform("t", (0.8 * this.star_animation.current_frame) / this.star_animation.length);
        this.shaders.img.setUniform("txt", this.textures.const_textures["txt" + num]);
        rect(0, 0, 1, 1);
    }

    draw_const(num) {
        shader(this.shaders.star);
        let curr_frame = this.get_curr_frame(num);
        this.star_texture_decider(num);
        this.shaders.star.setUniform("sh", this.scale.scale_screen_h);
        this.shaders.star.setUniform("sw", this.scale.scale_screen_w);
        this.shaders.star.setUniform("pos", this.star_animation.animation_coord[num][curr_frame]);
        //console.log(this.star_animation.animation_textures[num][0]);
        this.shaders.star.setUniform("time", 0);
        this.shaders.star.setUniform("count", this.const_verts["vert" + num].length - 1);
        model(this.const_geometry[num]);
    }

    star_texture_decider(num) {
        if (num != this.star_animation.current_constallation) {
            this.shaders.star.setUniform("r", 0.005);
            this.shaders.star.setUniform("act", -1);
        } else {
            this.shaders.star.setUniform(
                "r",
                0.005 + 0.01 * (this.star_animation.current_frame / this.star_animation.length)
            );
            if (this.star_animation.finished != 1) {
                this.shaders.star.setUniform("act", -1);
            } else {
                this.shaders.star.setUniform(
                    "act",
                    Math.round(this.text_animation.current_achivement + this.text_animation.delta)
                );
            }
        }
        this.shaders.star.setUniform("star", this.textures.star_texture);
        this.shaders.star.setUniform("last_lit", this.const_verts["vert" + num].number - 1);
    }

    get_curr_frame(num) {
        if (num != this.star_animation.current_constallation) {
            return 0;
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
        return this.star_animation.current_frame;
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
        this.star_animation.current_constallation = num;
        this.star_animation.transition = -1;
        this.update_text_framebuffer(0, -1, -1);
        this.update_text_framebuffer(1, 0, -1);
        this.update_text_framebuffer(2, 1, -1);
    }

    mouseHandler(trashold) {
        //console.log(con);
        let con = this.const_verts["vert_screen_space" + this.star_animation.current_constallation];
        let x = mouseX;
        let y = height - mouseY;
        //console.log(x, y);
        let id = -1;
        this.class_options.current_selection = -1;

        if (x >= this.class_options.sc_x0 && x <= this.class_options.sc_x0 + this.class_options.sc_w) {
            if (y >= this.class_options.sc_y0 && y <= this.class_options.sc_y0 + this.class_options.sc_h) {
                id = Math.floor(((x - this.class_options.sc_x0) / this.class_options.sc_w) * 3);
                id += Math.floor(((y - this.class_options.sc_y0) / this.class_options.sc_h) * 3) * 3;
                this.class_options.current_selection = id;
            }
        } else {
            if (typeof add_new_star === "function") {
                for (
                    let i = 0;
                    i < this.const_verts["vert" + this.star_animation.current_constallation].vert.length;
                    ++i
                ) {
                    if (x > con[i][0] - trashold && x < con[i][0] + trashold) {
                        if (y > con[i][1] - trashold && y < con[i][1] + trashold) {
                            if (
                                this.text_animation.current_achivement + this.text_animation.delta < i - 0.1 ||
                                this.text_animation.current_achivement + this.text_animation.delta > i + 0.1
                            ) {
                                this.text_animation.delta +=
                                    i - (this.text_animation.current_achivement + this.text_animation.delta);
                            }
                        }
                    }
                }
            } else {
                for (let i = 0; i < this.const_verts["vert" + this.star_animation.current_constallation].number; ++i) {
                    if (x > con[i][0] - trashold && x < con[i][0] + trashold) {
                        if (y > con[i][1] - trashold && y < con[i][1] + trashold) {
                            if (
                                this.text_animation.current_achivement + this.text_animation.delta < i - 0.1 ||
                                this.text_animation.current_achivement + this.text_animation.delta > i + 0.1
                            ) {
                                this.text_animation.delta +=
                                    i - (this.text_animation.current_achivement + this.text_animation.delta);
                            }
                        }
                    }
                }
            }
        }
    }
}
