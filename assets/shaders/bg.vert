#version 300 es
precision highp float;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec4 coord;
uniform float w;
uniform float h;

in vec3 aPosition;
in vec2 aTexCoord;

out vec2 TexCoord;

void main() {
  vec4 positionVec4 = vec4(1.0);
  if ((gl_VertexID % 4) == 0){
    TexCoord = vec2(0.0, 0.0);
    positionVec4.x = coord.x;
    positionVec4.y = coord.y;
    positionVec4.z = 0.01;
  }
  if ((gl_VertexID % 4) == 1){
    TexCoord = vec2(1.0, 0.0);
    positionVec4.x = coord.x + w;
    positionVec4.y = coord.y;
    positionVec4.z = 0.01;
  }
  if ((gl_VertexID % 4) == 2){
    TexCoord = vec2(0.0, 1.0);
    positionVec4.x = coord.x;
    positionVec4.y = coord.y + h;
    positionVec4.z = 0.01;
  }
  if ((gl_VertexID % 4) == 3){
    TexCoord = vec2(1.0, 1.0);
    positionVec4.x = coord.x + w;
    positionVec4.y = coord.y + h;
    positionVec4.z = 0.01;
  }
  gl_Position = positionVec4;
}