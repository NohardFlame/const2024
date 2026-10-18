<?php
require_once __DIR__ . "/AdminAuth.php";
admin_require();
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Настройки по умолчанию — Школьный зодиак</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.js"></script>
  <link rel="stylesheet" href="style.css" />
  <style>
    body.settings-page {
      margin: 0;
      min-height: 100vh;
      background: #070a12;
      color: #e8eef8;
      font: 14px/1.4 system-ui, sans-serif;
    }
    .settings-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: rgba(12, 16, 28, 0.95);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .settings-bar a {
      color: #9eb6d4;
      margin-right: 12px;
    }
    .settings-page #nebula-panel {
      position: relative;
      top: auto;
      right: auto;
      width: min(420px, calc(100vw - 32px));
      max-height: none;
      margin: 16px;
    }
    .settings-page #nebula-panel[hidden] {
      display: block !important;
    }
    .settings-page main canvas {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      opacity: 0.35;
    }
    .settings-page .nebula-panel,
    .settings-page .settings-bar {
      position: relative;
      z-index: 2;
    }
  </style>
</head>
<body class="settings-page">
  <div class="settings-bar">
    <div>
      <strong>Дефолты для всех посетителей</strong>
      <span style="opacity:0.65;margin-left:8px">запись в nebula_defaults.json / style_defaults.json</span>
    </div>
    <nav>
      <a href="index.html">Доска</a>
      <a href="add_new_star.php">Звёзды</a>
      <a href="trace.php">Обводка</a>
      <a href="logout.php">Выйти</a>
    </nav>
  </div>

  <main></main>

  <aside id="nebula-panel" class="nebula-panel">
    <header class="nebula-panel__header">
      <h2>Настройки сайта</h2>
    </header>
    <p class="nebula-panel__hint">Кнопки «для всех» пишут файлы на сервер. На публичной доске <kbd>N</kbd> — только локально.</p>

    <section class="nebula-panel__section">
      <h3 class="nebula-panel__section-title">Доска / Skyrim</h3>
      <label>
        <span class="nebula-panel__name">Paper</span>
        <input type="color" id="style-paper">
      </label>
      <label>
        <span class="nebula-panel__name">Ink</span>
        <input type="color" id="style-ink">
      </label>
      <label>
        <span class="nebula-panel__name">Gold</span>
        <input type="color" id="style-gold">
      </label>
      <label>
        <span class="nebula-panel__name">Star dim</span>
        <input type="color" id="style-star-dim">
      </label>
      <label>
        <span class="nebula-panel__name">Star lit</span>
        <input type="color" id="style-star-lit">
      </label>
      <label>
        <span class="nebula-panel__name">Star hot</span>
        <input type="color" id="style-star-hot">
      </label>
      <label>
        <span class="nebula-panel__name">Star brightness</span>
        <span id="style-star-brightness-val">1.15</span>
        <input type="range" id="style-star-brightness" min="0.4" max="2.2" step="0.05">
      </label>
      <label>
        <span class="nebula-panel__name">Header size</span>
        <span id="style-header-val">0.18</span>
        <input type="range" id="style-header" min="0.1" max="0.28" step="0.01">
      </label>
      <p class="nebula-panel__hint" style="margin:8px 0 4px">Силуэт</p>
      <label class="nebula-panel__row">
        <span class="nebula-panel__name">Silhouette color</span>
        <input type="color" id="style-sil-color">
      </label>
      <label class="nebula-panel__row">
        <span class="nebula-panel__name">Silhouette width</span>
        <span id="style-sil-width-val">1.2</span>
        <input type="range" id="style-sil-width" min="0.2" max="6" step="0.1">
      </label>
      <label class="nebula-panel__row">
        <span class="nebula-panel__name">Silhouette dash</span>
        <input type="text" id="style-sil-dash" style="width:9em;font:inherit">
      </label>
      <div class="nebula-panel__actions">
        <button type="button" id="style-reset" class="nebula-panel__btn nebula-panel__btn--ghost">Сброс стиля</button>
        <button type="button" id="style-save-defaults" class="nebula-panel__btn">Стиль для всех</button>
      </div>
    </section>

    <h3 class="nebula-panel__section-title">Туманность</h3>

    <section class="nebula-panel__section">
      <label>
        <span class="nebula-panel__name">Color A</span>
        <input type="color" id="nebula-color-a">
      </label>
      <label>
        <span class="nebula-panel__name">Color B</span>
        <input type="color" id="nebula-color-b">
      </label>
      <label>
        <span class="nebula-panel__name">Color C</span>
        <input type="color" id="nebula-color-c">
      </label>
      <label>
        <span class="nebula-panel__name">Color D</span>
        <input type="color" id="nebula-color-d">
      </label>
    </section>

    <section class="nebula-panel__section">
      <label>
        <span class="nebula-panel__name">Octaves</span>
        <span id="nebula-octaves-val">auto</span>
        <input type="range" id="nebula-octaves" min="0" max="6" step="1">
      </label>
      <label>
        <span class="nebula-panel__name">Detail</span>
        <span id="nebula-detail-val">1.00</span>
        <input type="range" id="nebula-detail" min="0.3" max="2.5" step="0.05">
      </label>
      <label>
        <span class="nebula-panel__name">Scale</span>
        <span id="nebula-scale-val">3.00</span>
        <input type="range" id="nebula-scale" min="0.5" max="8" step="0.1">
      </label>
      <label>
        <span class="nebula-panel__name">Gain</span>
        <span id="nebula-gain-val">0.50</span>
        <input type="range" id="nebula-gain" min="0.2" max="0.8" step="0.01">
      </label>
      <label>
        <span class="nebula-panel__name">Lacunarity</span>
        <span id="nebula-lacunarity-val">2.00</span>
        <input type="range" id="nebula-lacunarity" min="1.2" max="3.5" step="0.05">
      </label>
      <label>
        <span class="nebula-panel__name">Warp</span>
        <span id="nebula-warp-val">2.00</span>
        <input type="range" id="nebula-warp" min="0" max="4" step="0.05">
      </label>
      <label>
        <span class="nebula-panel__name">Period</span>
        <span id="nebula-period-val">48s</span>
        <input type="range" id="nebula-period" min="8" max="120" step="1">
      </label>
      <label>
        <span class="nebula-panel__name">Contrast</span>
        <span id="nebula-contrast-val">1.00</span>
        <input type="range" id="nebula-contrast" min="0.4" max="2" step="0.05">
      </label>
      <label>
        <span class="nebula-panel__name">Brightness</span>
        <span id="nebula-brightness-val">1.00</span>
        <input type="range" id="nebula-brightness" min="0.2" max="2" step="0.05">
      </label>
      <label>
        <span class="nebula-panel__name">Buffer scale</span>
        <span id="nebula-fbo-scale-val">0.50</span>
        <input type="range" id="nebula-fbo-scale" min="0.25" max="1" step="0.05">
      </label>
      <label>
        <span class="nebula-panel__name">Update rate</span>
        <span id="nebula-update-hz-val">8 Hz</span>
        <input type="range" id="nebula-update-hz" min="2" max="30" step="1">
      </label>
    </section>

    <div class="nebula-panel__actions">
      <button type="button" id="nebula-reset" class="nebula-panel__btn nebula-panel__btn--ghost">Сброс по умолчанию</button>
      <button type="button" id="nebula-save-defaults" class="nebula-panel__btn">Сохранить для всех</button>
    </div>
    <p id="nebula-status" class="nebula-panel__status" hidden></p>
  </aside>

  <script src="assets/js/options.js?v=20"></script>
  <script src="assets/js/make_a_texture.js?v=16"></script>
  <script src="assets/js/nebula_panel.js?v=20"></script>
  <script>
    let d;
    function preload() {
      d = new dataHandler();
      d.set_count(10);
      d.load_nebula_shader(loadShader);
      d.load_nebula_defaults(loadJSON);
      d.load_style_defaults(loadJSON);
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
      const w = Math.max(2, windowWidth || 800);
      const h = Math.max(2, windowHeight || 600);
      createCanvas(w, h, WEBGL);
      pixelDensity(1);
      setAttributes({ alpha: true, premultipliedAlpha: true });
      drawingContext.disable(drawingContext.DEPTH_TEST);
      d.setup(width, height);
      if (typeof bindNebulaPanel === "function") {
        bindNebulaPanel(d);
      }
      const panel = document.getElementById("nebula-panel");
      if (panel) {
        panel.hidden = false;
      }
      loop();
    }
    function draw() {
      clear();
      d.draw_background();
      d.draw_idle_sky();
      d.draw_const(d.star_animation.current_constallation);
      d.draw_background_const(d.star_animation.current_constallation);
    }
    function windowResized() {
      const w = Math.max(2, windowWidth || 800);
      const h = Math.max(2, windowHeight || 600);
      resizeCanvas(w, h);
      d.update_all(w, h);
    }
  </script>
</body>
</html>
