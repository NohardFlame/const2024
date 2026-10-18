#version 300 es
precision highp float;

uniform sampler2D u_tex;

in vec2 TexCoord;
out vec4 FragColor;

void main() {
  FragColor = texture(u_tex, TexCoord);
}
