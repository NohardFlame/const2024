#version 300 es
precision highp float;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform float sh;
uniform float sw;

in vec3 aPosition;
in vec2 aTexCoord;

out vec2 TexCoord;

void main() {
  vec4 positionVec4 = vec4(1.0);
  if ((gl_VertexID % 4) == 0){
    TexCoord = vec2(0.0, 1.0);
    positionVec4.x = -0.3;
    positionVec4.y = -1.0;
    positionVec4.z = -0.01;
  }
  if ((gl_VertexID % 4) == 1){
    TexCoord = vec2(1.0, 1.0);
    positionVec4.x = 1.0;
    positionVec4.y = -1.0;
    positionVec4.z = -0.001;
  }
  if ((gl_VertexID % 4) == 2){
    TexCoord = vec2(0.0, 0.0);
    positionVec4.x = -0.3;
    positionVec4.y = 1.00;
    positionVec4.z = -0.01;
  }
  if ((gl_VertexID % 4) == 3){
    TexCoord = vec2(1.0, 0.0);
    positionVec4.x = 1.0;
    positionVec4.y = 1.00;
    positionVec4.z = -0.01;
  }
  positionVec4.x *= sw;
  positionVec4.y *= sh;

  
  gl_Position = positionVec4;
}