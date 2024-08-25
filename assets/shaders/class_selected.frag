#version 300 es
precision highp float;

uniform sampler2D tex;
uniform int act;
uniform vec4 c;

in vec2 TexCoord;


out vec4 FragColor;


void main() {
  vec4 myColor = vec4(0.0);
  //myColor = vec4(0.3);
  //FragColor = texture(vel, vec2(float(verId)/5.0, TexCoord.y));
  //FragColor = texture(vel, TexCoord);
  
  myColor = vec4(texture(tex, TexCoord).xyz, 0.0);   
  
  //   // else if(texture(tex, TexCoord + vec2(-0.01, 0.01)).r > 0.1){
  //   //   myColor = vec4(0.1, 0.5, 0.9, 0.2);
  //   // }
  //   // else if(texture(tex, TexCoord + vec2(-0.01, -0.01)).r > 0.1){
  //   //   myColor = vec4(0.1, 0.5, 0.9, 0.2);
  //   // }
  //   // else if(texture(tex, TexCoord + vec2(0.01, -0.01)).r > 0.1){
  //   //   myColor = vec4(0.1, 0.5, 0.9, 0.2);
  //   // }
    
  

  
  if (myColor.r > 0.01){
    myColor = c;
  }
  
  
  FragColor = myColor;
  //FragColor = vec4(1.0);
  //FragColor = vec4(float(verId)*0.1, float(verId)*0.1, float(verId)*0.1, 1.0);
  //FragColor = vec4(0.5, 0.5, 0.5, 1);
}