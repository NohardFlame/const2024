#version 300 es
precision highp float;

uniform float r;
uniform float sh;
uniform float sw;
uniform int act;
uniform int last_lit;
uniform int uMode;
uniform vec2 pos[64];
uniform float litMask[64];
uniform int batchSize;
uniform int batchBase;

in vec3 aPosition;
in vec2 aTexCoord;

out vec2 TexCoord;
flat out int verId;

void applyCorner(inout vec4 positionVec4, float r_w, float r_h, vec2 uv0, vec2 uv1, vec2 uv2, vec2 uv3) {
  int corner = gl_VertexID % 4;
  if (corner == 0) {
    TexCoord = uv0;
    positionVec4.x -= r_w;
    positionVec4.y -= r_h;
  } else if (corner == 1) {
    TexCoord = uv1;
    positionVec4.x += r_w;
    positionVec4.y -= r_h;
  } else if (corner == 2) {
    TexCoord = uv2;
    positionVec4.x -= r_w;
    positionVec4.y += r_h;
  } else {
    TexCoord = uv3;
    positionVec4.x += r_w;
    positionVec4.y += r_h;
  }
}

void main() {
  // Idle sky: positions and atlas UVs already baked into the mesh
  if (uMode == 0) {
    verId = 0;
    TexCoord = aTexCoord;
    gl_Position = vec4(aPosition, 1.0);
    return;
  }

  int localId = int(floor(float(gl_VertexID) / 4.0));

  if (localId >= batchSize) {
    gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
    TexCoord = vec2(0.0);
    verId = 0;
    return;
  }

  int vID = batchBase + localId;
  verId = vID;
  vec2 center = pos[localId];
  vec4 positionVec4 = vec4(center, 0.0, 1.0);
  float r_w;
  float r_h;

  bool lit = litMask[localId] > 0.5;
  // Fallback for older callers that only set last_lit prefix
  if (!lit && last_lit >= 0 && vID <= last_lit) {
    lit = true;
  }

  if (!lit) {
    r_w = r * sw * 0.4;
    r_h = r * sh * 0.4;
    applyCorner(positionVec4, r_w, r_h, vec2(0.66, 0.0), vec2(1.0, 0.0), vec2(0.66, 1.0), vec2(1.0, 1.0));
  } else {
    r_w = r * sw * 1.2;
    r_h = r * sh * 1.2;
    applyCorner(positionVec4, r_w, r_h, vec2(0.33, 0.0), vec2(0.66, 0.0), vec2(0.33, 1.0), vec2(0.66, 1.0));
  }

  if (vID == act) {
    r_w = r * sw * 1.2;
    r_h = r * sh * 1.2;
    positionVec4.xy = center;
    applyCorner(positionVec4, r_w, r_h, vec2(0.0, 0.0), vec2(0.33, 0.0), vec2(0.0, 1.0), vec2(0.33, 1.0));
  }

  gl_Position = positionVec4;
}
