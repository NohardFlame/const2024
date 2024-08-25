#version 300 es
precision highp float;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform int time;
uniform int count;
uniform vec2 pos[518];

uniform float r;
uniform float sh;
uniform float sw;
uniform int act;
uniform int last_lit;


in vec3 aPosition;
in vec2 aTexCoord;


out vec2 TexCoord;
flat out int verId;
flat out int actF;


void main() {
  vec4 positionVec4 = vec4(aPosition, 1.0);
  //vec4 positionVec4;
  int vID = int(floor(float(gl_VertexID) / 4.0));
  positionVec4.x = pos[vID].x;
  positionVec4.y = pos[vID].y;
  float r_w;
  float r_h;

  if(vID > last_lit){
    r_w = r * sw * 0.4;
    r_h = r * sh * 0.4;
    if ((gl_VertexID % 4) == 0){
      TexCoord = vec2(0.66, 0.0);
      positionVec4.x -= r_w;
      positionVec4.y -= r_h;
    }
    if ((gl_VertexID % 4) == 1){
      TexCoord = vec2(1.0, 0.0);
      positionVec4.x += r_w;
      positionVec4.y -= r_h;
    }
    if ((gl_VertexID % 4) == 2){
      TexCoord = vec2(0.66, 1.0);
      positionVec4.x -= r_w;
      positionVec4.y += r_h;
    }
    if ((gl_VertexID % 4) == 3){
      TexCoord = vec2(1.0, 1.0);
      positionVec4.x += r_w;
      positionVec4.y += r_h;
    }
  }
  else{
    r_w = r * sw;
    r_h = r * sh;
    if ((gl_VertexID % 4) == 0){
      TexCoord = vec2(0.33, 0.0);
      positionVec4.x -= r_w;
      positionVec4.y -= r_h;
    }
    if ((gl_VertexID % 4) == 1){
      TexCoord = vec2(0.66, 0.0);
      positionVec4.x += r_w;
      positionVec4.y -= r_h;
    }
    if ((gl_VertexID % 4) == 2){
      TexCoord = vec2(0.33, 1.0);
      positionVec4.x -= r_w;
      positionVec4.y += r_h;
    }
    if ((gl_VertexID % 4) == 3){
      TexCoord = vec2(0.66, 1.0);
      positionVec4.x += r_w;
      positionVec4.y += r_h;
    }
  }
  if(vID == act){
    r_w = r * sw * 0.5;
    r_h = r * sh * 0.5;
    if ((gl_VertexID % 4) == 0){
      TexCoord = vec2(0.0, 0.0);
      positionVec4.x -= r_w;
      positionVec4.y -= r_h;
    }
    if ((gl_VertexID % 4) == 1){
      TexCoord = vec2(0.33, 0.0);
      positionVec4.x += r_w;
      positionVec4.y -= r_h;
    }
    if ((gl_VertexID % 4) == 2){
      TexCoord = vec2(0.0, 1.0);
      positionVec4.x -= r_w;
      positionVec4.y += r_h;
    }
    if ((gl_VertexID % 4) == 3){
      TexCoord = vec2(0.33, 1.0);
      positionVec4.x += r_w;
      positionVec4.y += r_h;
    }

  }
  gl_Position = positionVec4;
}