#version 300 es
precision highp float;
uniform sampler2D txt;
uniform float t;

in vec2 TexCoord;
flat in int verId;

out vec4 FragColor;


void main() {
  //FragColor = texture(vel, vec2(float(verId)/5.0, TexCoord.y));
  //FragColor = texture(vel, TexCoord);
  vec4 myColor = texture(txt, vec2(TexCoord.x, TexCoord.y));
  //myColor.a = 0.2;
  if (myColor.r < 0.05){
    discard;
  }
  //FragColor = myColor;
  //FragColor = vec4(float(verId)*0.1, float(verId)*0.1, float(verId)*0.1, 1.0);
  FragColor = vec4(t, t, t, 0.01);
  //FragColor = vec4(1.0, 1.0, 1.0, 1.0);
}