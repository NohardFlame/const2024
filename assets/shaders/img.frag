#version 300 es
precision highp float;
uniform sampler2D txt;
uniform float t;
uniform vec3 uSilhouetteColor;
uniform float uSilhouetteAlpha;

in vec2 TexCoord;

out vec4 FragColor;

void main() {
  vec4 tex = texture(txt, TexCoord);
  // texN lines are often dark red on black — amplify before masking
  float raw = max(max(tex.r, tex.g), max(tex.b, tex.a));
  if (raw < 0.02) {
    discard;
  }
  float mask = clamp(raw * 5.0, 0.0, 1.0);
  mask = smoothstep(0.08, 0.85, mask);
  // Morph: quiet at start, readable but always below stars at peak
  float fade = clamp(t, 0.0, 1.0);
  fade = fade * fade * (3.0 - 2.0 * fade);
  float a = mask * uSilhouetteAlpha * (0.4 + 0.6 * fade);
  a = clamp(a, 0.0, 0.72);
  FragColor = vec4(uSilhouetteColor * a, a);
}
