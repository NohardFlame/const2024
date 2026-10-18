#version 300 es
precision highp float;
uniform vec2 coord;
uniform float w;
uniform float h;
uniform float tx_0;
uniform float ty_0;
uniform float tw;
uniform float th;

out vec2 TexCoord;
out vec2 CellCoord;

void main() {
  vec4 positionVec4 = vec4(1.0);
  int id = gl_VertexID % 4;
  if (id == 0) {
    TexCoord = vec2(tx_0, ty_0 + th);
    CellCoord = vec2(0.0, 0.0);
    positionVec4.x = coord.x;
    positionVec4.y = coord.y;
    positionVec4.z = 0.01;
  } else if (id == 1) {
    TexCoord = vec2(tx_0 + tw, ty_0 + th);
    CellCoord = vec2(1.0, 0.0);
    positionVec4.x = coord.x + w;
    positionVec4.y = coord.y;
    positionVec4.z = 0.01;
  } else if (id == 2) {
    TexCoord = vec2(tx_0, ty_0);
    CellCoord = vec2(0.0, 1.0);
    positionVec4.x = coord.x;
    positionVec4.y = coord.y + h;
    positionVec4.z = 0.01;
  } else {
    TexCoord = vec2(tx_0 + tw, ty_0);
    CellCoord = vec2(1.0, 1.0);
    positionVec4.x = coord.x + w;
    positionVec4.y = coord.y + h;
    positionVec4.z = 0.01;
  }
  gl_Position = positionVec4;
}
