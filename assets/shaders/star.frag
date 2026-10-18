#version 300 es
precision highp float;

uniform sampler2D star;
uniform int act;
uniform vec3 uStarDim;
uniform vec3 uStarLit;
uniform vec3 uStarHot;
uniform float uStarBrightness;

in vec2 TexCoord;
flat in int verId;

out vec4 FragColor;

void main() {
  vec4 tex = texture(star, TexCoord);
  float lum = max(tex.a, max(tex.r, max(tex.g, tex.b)));
  vec3 tint = uStarDim;
  if (TexCoord.x < 0.33) {
    tint = uStarHot;
  } else if (TexCoord.x < 0.66) {
    tint = uStarLit;
  }
  vec3 rgb = tex.rgb * tint * uStarBrightness;
  FragColor = vec4(rgb, lum);
}
