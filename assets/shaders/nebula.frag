#version 300 es
precision highp float;

in vec2 TexCoord;
out vec4 FragColor;

uniform float u_phase;
uniform float u_aspect;
uniform float u_scale;
uniform float u_detail;
uniform float u_gain;
uniform float u_lacunarity;
uniform float u_warp;
uniform float u_contrast;
uniform float u_brightness;
uniform int u_octaves;

uniform vec3 u_colorA;
uniform vec3 u_colorB;
uniform vec3 u_colorC;
uniform vec3 u_colorD;

#define MAX_OCTAVES 6

float random(vec2 _st) {
  return fract(sin(dot(_st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise(vec2 _st) {
  vec2 i = floor(_st);
  vec2 f = fract(_st);

  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 _st) {
  float v = 0.0;
  float a = 0.5;
  vec2 shift = vec2(5.0);
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  // detail=1 → как в книге; <1 гасит мелкие слои, >1 усиливает «зерно»
  float fine = clamp(u_detail, 0.05, 3.0);
  for (int i = 0; i < MAX_OCTAVES; ++i) {
    if (i >= u_octaves) {
      break;
    }
    float layer = (i < 2) ? 1.0 : fine;
    v += a * noise(_st) * layer;
    _st = rot * _st * u_lacunarity + shift;
    a *= u_gain;
  }
  return v;
}

void main() {
  // scale — только зум домена; detail влияет на вес мелких октав в fbm()
  vec2 st = (TexCoord - 0.5) * vec2(u_aspect, 1.0) * u_scale;
  float c = cos(u_phase);
  float s = sin(u_phase);
  vec2 driftA = vec2(c, s);
  vec2 driftB = vec2(cos(u_phase + 1.7), sin(u_phase + 2.3));

  vec2 q = vec2(0.0);
  q.x = fbm(st + 0.35 * driftA);
  q.y = fbm(st + vec2(1.2, -0.8) + 0.45 * driftB);

  vec2 r = vec2(0.0);
  r.x = fbm(st + u_warp * q + vec2(1.7, 9.2) + 0.55 * driftA);
  r.y = fbm(st + u_warp * q + vec2(8.3, 2.8) + 0.48 * driftB);

  float f = fbm(st + r);

  vec3 color = mix(u_colorA, u_colorB, clamp((f * f) * 4.0, 0.0, 1.0));
  color = mix(color, u_colorC, clamp(length(q), 0.0, 1.0));
  color = mix(color, u_colorD, clamp(length(r.x), 0.0, 1.0));

  float shade = f * f * f + 0.6 * f * f + 0.5 * f;
  color = (color * shade - 0.5) * u_contrast + 0.5;
  color *= u_brightness;

  FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
