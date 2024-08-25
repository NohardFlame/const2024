let svg_txt = "E";
let d;

function preload() {
    d = new dataHandler();
    d.set_count(2);
    d.load_img_shader(loadShader);
    d.load_bg_shader(loadShader);
    d.load_text_shader(loadShader);
    d.load_star_shader(loadShader);
    d.load_class_shader(loadShader);
    d.load_class_selected_shader(loadShader);
    d.load_textures(loadImage);
    d.load_fonts(loadFont);
    d.load_constallations_verts(loadJSON);
}

function setup() {
    //svgAnalizer(1553, 1559);
    //setAttributes('alpha', true);
    //setAttributes({ alpha: true })
    //let ctx = createCanvas(windowWidth, windowHeight, WEBGL);
    createCanvas(windowWidth, windowHeight, WEBGL);
    setAttributes({ alpha: true, premultipliedAlpha: true });
    drawingContext.disable(drawingContext.DEPTH_TEST);

    //console.log(drawingContext);

    // for (let i = 0; i < int(consts.length / 2); ++i) {
    //     cshape.push(
    //         buildGeometry(() => {
    //             for (let j = 0; j < consts[i * 2].length; ++j) {
    //                 rect(0, 0, 0.1, 0.1);
    //             }
    //         })
    //     );
    // }

    // for (let i = 0; i < int(consts.length / 2); ++i) {
    //     for (let j = 0; j < consts[2 * i + 1].length; ++j) {
    //         consts[2 * i + 1][j][0] = consts[2 * i + 1][j][0] * 0.75 + 0.25;
    //         consts[2 * i + 1][j][0] *= scaleFW;
    //         consts[2 * i + 1][j][1] *= scaleFH;
    //     }
    // }

    d.setup(width, height);
    console.log(d);

    //buf = makeTextureAnim(consts[0], consts[1], 400, 1, 3)

    //svgAnalizer(1553, 1559);
    //console.log(cshape);
    //blendMode(ADD);
}

function draw() {
    clear();
    //background(255, 0,0);
    //image(buf, -500, -500, 900, 700);
    //text(frameRate(), -0.9, 0);

    d.draw_background();
    d.draw_achivements();
    for (let i = 0; i < d.const_count; ++i) {
        d.draw_const(i);
    }
    d.draw_class();
    //d.draw_const(0);
    d.draw_background_const(d.star_animation.current_constallation);
    d.transition_decider();

    // cshader.setUniform("sh", 1);
    // cshader.setUniform("sw", 1);

    // shaderT.setUniform("sh", scaleFH);
    // shaderT.setUniform("sw", scaleFW);

    // for (let i = 0; i < int(consts.length / 2); ++i) {
    //     if (currAnim == i) {
    //         shader(shaderT);
    //         shaderT.setUniform("txt", txt[i]);

    //         //shaderT.setUniform('t', );
    //         rect(0, 0, width, height);
    //         shader(cshader);
    //         cshader.setUniform("vel", buf[i]);
    //         let animProg = (millis() - startAnim) / (animLength * 10);
    //         if (animProg < 1) {
    //             if (animDir > 0) {
    //                 cshader.setUniform("r", animProg * 0.01);
    //                 shaderT.setUniform("t", animProg * 0.5);
    //             } else {
    //                 cshader.setUniform("r", animProg * 0.01);
    //                 shaderT.setUniform("t", animProg * 0.5);
    //             }
    //         } else {
    //             cshader.setUniform("r", 0.01);
    //             shaderT.setUniform("t", 0.5);
    //         }
    //         cshader.setUniform("act", active);
    //         cshader.setUniform("time", millis() - startAnim);
    //         cshader.setUniform("star", stTxt);
    //         cshader.setUniform("count", consts[i * 2].length - 1);
    //         model(cshape[i]);
    //     } else {
    //         shader(cshader);
    //         cshader.setUniform("act", -1);
    //         cshader.setUniform("vel", buf[i]);
    //         cshader.setUniform("time", 0);
    //         cshader.setUniform("r", 0.005);
    //         cshader.setUniform("star", ustTxt);
    //         cshader.setUniform("count", consts[i * 2].length - 1);
    //         model(cshape[i]);
    //     }
    // }

    // displayText(prevActive - currDiff, consts[currAnim * 2 + 1], textFB);
    // //console.log(currDiff, actDiff);
    // if (Math.abs(currDiff) < 0.02) {
    //     currDiff = currDiff;
    // } else if (Math.abs(currDiff) < 5) {
    //     currDiff = currDiff - Math.sign(currDiff) * 2.5 * smth(currDiff / 5);
    // } else {
    //     currDiff = currDiff - Math.sign(currDiff) * 1.33;
    // }
}

function mouseWheel(event) {
    // Change the red value according
    // to the scroll delta value
    if (d.star_animation.finished == 1) {
        d.wheel_handler(event.delta * 0.01);
    }
    //console.log("wheel", event.delta * 0.03);
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
function keyPressed() {
    if (typeof add_new_star === "function") {
        console.log(keyCode);
        if (keyCode === 65) {
            add_new_star(d, Math.round(d.text_animation.current_achivement + d.text_animation.delta));
        } else if (keyCode === 69) {
            console.log("qweqw");
            delete_star(d, Math.round(d.text_animation.current_achivement + d.text_animation.delta));
        }
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    d.update_all(windowWidth, windowHeight);
}

// function windowResized() {
//     let oldSW = scaleFW;
//     let oldSH = scaleFH;
//     if (width > height) {
//         scaleFW = height / width;
//         scaleFH = 1.0;
//     }

//     if (width <= height) {
//         scaleFW = 1.0;
//         scaleFH = width / height;
//     }
//     for (let i = 0; i < int(consts.length / 2); ++i) {
//         for (let j = 0; j < consts[2 * i + 1].length; ++j) {
//             consts[2 * i + 1][j][0] *= scaleFW / oldSW;
//             consts[2 * i + 1][j][1] *= scaleFH / oldSH;
//         }
//     }

//     //buf = makeTextureAnim(consts[0], consts[1], 400, 1, 3)
//     for (let i = 0; i < int(consts.length / 2); ++i) {
//         buf[i] = makeTextureAnim(consts[2 * i], consts[2 * i + 1], 400, 1, 3);
//     }
//     textFB = createFramebuffer({
//         channels: RGBA,
//         depth: false,
//         antialias: false,
//         width: int(width * 0.45),
//         height: int(height * 0.9),
//         textureFiltering: NEAREST,
//         density: 1,
//     });
//     resizeCanvas(windowWidth, windowHeight);
// }

// function mousePressed() {
//     if (millis() - startAnim < animLength * 10) {
//         startAnim = startAnim;
//     }
// }
