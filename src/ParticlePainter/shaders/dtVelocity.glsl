#pragma glslify: curlNoise = require('./curl-noise')

uniform sampler2D destPosTexture;
uniform float uTime;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec4 destPos = texture2D(destPosTexture, uv);
    vec4 pos = texture2D(positionTexture, uv);
    vec4 vel = texture2D(velocityTexture, uv);

    float t = (sin(uTime * 0.0001) * cos(uTime * 0.001)) * 0.8 + 0.2;
    vec4 vel_ = vec4(curlNoise(vec3(pos.xyz * 0.002)), t) * .1;

    float l = length(destPos - pos) * 0.01;
   
    vec4 diff = (destPos - pos) * 0.007;

    diff.xyz += vel_.xyz * l;

    vel.xyz *= 0.1;    
    vel.xyz += diff.xyz; 

    gl_FragColor = vel;
}
