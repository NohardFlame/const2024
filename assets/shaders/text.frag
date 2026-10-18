#version 300 es
precision highp float;
uniform sampler2D txt;

uniform float tex_y0;
uniform float tex_y1;
uniform float c;

in vec2 TexCoord;

out vec4 FragColor;

void main() {
  vec4 myColor = texture(txt, vec2(TexCoord.x, TexCoord.y));
  myColor.a = max(myColor.a, max(myColor.r, max(myColor.g, myColor.b)));
  myColor.rgb *= c;
  myColor.a *= c;
  FragColor = myColor;
}
