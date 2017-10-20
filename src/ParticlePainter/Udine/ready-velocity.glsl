#pragma glslify: curlNoise = require('../shaders/curl-noise')

vec4 starryNightShowVelocity(vec4 currPos, vec4 destPos, vec4 vel, vec4 currColor, float uTime, vec2 flow) {

    float t = (sin(uTime * 0.0001) * cos(uTime * 0.0001)) * 0.8 + 0.2;
    vec4 vel_ = vec4(curlNoise(vec3(vec2(currPos.xy * 0.004), t)), t) * .2;

    float l = length(destPos - currPos) * 0.05;
   
    vec4 diff = (destPos - currPos) * 0.01;

    diff.xyz += vel_.xyz * l;

    vel.xyz *= 0.1;
    vel.xyz += diff.xyz; 

    return vel;
}

#pragma glslify: export(starryNightShowVelocity)