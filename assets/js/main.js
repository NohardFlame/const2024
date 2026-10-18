let d;

function preload() {
    d = new dataHandler();
    d.set_count(10);
    d.load_img_shader(loadShader);
    d.load_bg_shader(loadShader);
    d.load_text_shader(loadShader);
    d.load_star_shader(loadShader);
    d.load_class_shader(loadShader);
    d.load_class_selected_shader(loadShader);
    d.load_nebula_shader(loadShader);
    d.load_nebula_defaults(loadJSON);
    d.load_style_defaults(loadJSON);
    d.load_textures(loadImage);
    d.load_fonts(loadFont);
    d.load_constallations_verts(loadJSON);
}

function setup() {
    const w = Math.max(2, windowWidth || window.innerWidth || 1280);
    const h = Math.max(2, windowHeight || window.innerHeight || 800);
    createCanvas(w, h, WEBGL);
    pixelDensity(1);
    setAttributes({ alpha: true, premultipliedAlpha: true });
    drawingContext.disable(drawingContext.DEPTH_TEST);
    d.setup(width, height);
    if (typeof bindNebulaPanel === "function") {
        bindNebulaPanel(d);
    }
    loop();
}

function draw() {
    clear();

    d.draw_background();
    if (d.star_animation.current_constallation < 9) {
        d.draw_achivements();
    }
    // Silhouette under stars so nodes stay the visual focus
    d.draw_background_const(d.star_animation.current_constallation);
    d.draw_idle_sky();
    d.draw_const(d.star_animation.current_constallation);
    d.draw_class();
    d.transition_decider();
}

function mouseWheel(event) {
    if (d.star_animation.finished == 1) {
        d.wheel_handler(event.delta * 0.01);
    }
}

function mouseMoved() {
    if (d.star_animation.finished == 1) {
        d.mouseHandler(width * 0.006);
    }
}

function mouseClicked() {
    if (d.class_options.current_selection != -1) {
        if (d.star_animation.finished == 1) {
            d.unselect_const();
            d.star_animation.transition = d.class_options.current_selection;
        }
    }
}

function mousePressed() {
    if (typeof editor_mouse_pressed === "function") {
        editor_mouse_pressed();
    }
}

function mouseReleased() {
    if (typeof editor_mouse_released === "function") {
        editor_mouse_released();
    }
}

function windowResized() {
    const w = Math.max(2, windowWidth || window.innerWidth || 1280);
    const h = Math.max(2, windowHeight || window.innerHeight || 800);
    resizeCanvas(w, h);
    d.update_all(w, h);
}
