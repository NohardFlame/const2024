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

void main() {
  vec4 positionVec4 = vec4(1.0);
  if ((gl_VertexID % 4) == 0){
    TexCoord = vec2(tx_0, ty_0 + th);
    positionVec4.x = coord.x;
    positionVec4.y = coord.y;
    // positionVec4.x = 0.5;
    // positionVec4.y = 0.5;
    positionVec4.z = 0.01;
  }
  if ((gl_VertexID % 4) == 1){
    TexCoord = vec2(tx_0 + tw, ty_0 + th);
    positionVec4.x = coord.x + w;
    positionVec4.y = coord.y;
    // positionVec4.x = 0.7;
    // positionVec4.y = 0.5;
    positionVec4.z = 0.01;
  }
  if ((gl_VertexID % 4) == 2){
    TexCoord = vec2(tx_0, ty_0);
    positionVec4.x = coord.x;
    positionVec4.y = coord.y + h;
    // positionVec4.x = 0.5;
    // positionVec4.y = 0.7;
    positionVec4.z = 0.01;
  }
  if ((gl_VertexID % 4) == 3){
    TexCoord = vec2(tx_0 + tw, ty_0);
    positionVec4.x = coord.x + w;
    positionVec4.y = coord.y + h;
    // positionVec4.x = 0.7;
    // positionVec4.y = 0.7;
    positionVec4.z = 0.01;
  }


  gl_Position = positionVec4;
}