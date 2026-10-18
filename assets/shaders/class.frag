#version 300 es
precision highp float;

uniform sampler2D tex;
uniform vec3 uGlyphColor;
uniform float uGlyphAlpha;

in vec2 TexCoord;
in vec2 CellCoord;

out vec4 FragColor;

void main() {
  float mask = texture(tex, TexCoord).r;
  // Soft edge so serif glyphs don't look punched-out
  float m = smoothstep(0.04, 0.55, mask);
  if (m < 0.01) {
    discard;
  }
  float a = clamp(m * uGlyphAlpha, 0.0, 1.0);
  FragColor = vec4(uGlyphColor * a, a);
}
