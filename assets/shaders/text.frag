#version 300 es
precision highp float;
uniform sampler2D txt;

uniform float tex_y0;
uniform float tex_y1;
uniform float c;

in vec2 TexCoord;

out vec4 FragColor;


void main() {
  //FragColor = texture(vel, vec2(float(verId)/5.0, TexCoord.y));
  //FragColor = texture(vel, TexCoord);
  //vec4 myColor = texture(txt, vec2(TexCoord.x, 1.0-TexCoord.y));
  
  vec4 myColor = texture(txt, vec2(TexCoord.x, TexCoord.y));
  myColor.a = 0.0;
  myColor *= c;
  FragColor = myColor;
}