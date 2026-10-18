#version 300 es
precision highp float;

uniform sampler2D tex;
uniform vec3 uGlyphColor;
uniform float uGlyphAlpha;
uniform vec4 uFill;
uniform vec4 uBorder;
uniform float uBorderWidth;

in vec2 TexCoord;
in vec2 CellCoord;

out vec4 FragColor;

void main() {
  vec4 outC = vec4(0.0);

  // Soft stone fill (active / hover wash)
  if (uFill.a > 0.001) {
    float inset = smoothstep(0.0, 0.12, min(min(CellCoord.x, 1.0 - CellCoord.x), min(CellCoord.y, 1.0 - CellCoord.y)));
    float fa = uFill.a * (0.55 + 0.45 * inset);
    outC = vec4(uFill.rgb * fa, fa);
  }

  // Double gold frame: bright outer band + dimmer inner hairline
  float bw = max(0.01, uBorderWidth);
  float edge = min(min(CellCoord.x, 1.0 - CellCoord.x), min(CellCoord.y, 1.0 - CellCoord.y));
  if (uBorder.a > 0.001 && edge < bw) {
    float outer = 1.0 - smoothstep(0.0, bw * 0.55, edge);
    float inner = smoothstep(bw * 0.35, bw * 0.7, edge) * (1.0 - smoothstep(bw * 0.7, bw, edge));
    float ba = uBorder.a * max(outer, inner * 0.65);
    outC.rgb = outC.rgb * (1.0 - ba) + uBorder.rgb * ba;
    outC.a = max(outC.a, ba);
  }

  float mask = texture(tex, TexCoord).r;
  float m = smoothstep(0.04, 0.55, mask);
  if (m > 0.01) {
    float ga = clamp(m * uGlyphAlpha, 0.0, 1.0);
    outC.rgb = outC.rgb * (1.0 - ga) + uGlyphColor * ga;
    outC.a = max(outC.a, ga);
  }

  if (outC.a < 0.001) {
    discard;
  }
  FragColor = outC;
}
