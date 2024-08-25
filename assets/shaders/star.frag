#version 300 es
precision highp float;

uniform sampler2D star;
uniform int act;

in vec2 TexCoord;
flat in int verId;

out vec4 FragColor;


void main() {
  vec4 myColor;
  //myColor = vec4(0.3);
  //FragColor = texture(vel, vec2(float(verId)/5.0, TexCoord.y));
  //FragColor = texture(vel, TexCoord);
  
  myColor += vec4(texture(star, TexCoord).xyz, 0.0);   
  
  
  
  FragColor = myColor;
  //FragColor = vec4(1.0);
  //FragColor = vec4(float(verId)*0.1, float(verId)*0.1, float(verId)*0.1, 1.0);
  //FragColor = vec4(0.5, 0.5, 0.5, 1);
}