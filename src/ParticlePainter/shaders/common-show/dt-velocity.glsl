#pragma glslify: curlNoise = require('../curl-noise')

vec4 commonShowVelocity(vec4 currPos, vec4 destPos, vec4 vel, vec4 currColor, float uTime) {

    float t = (sin(uTime * 0.00001) * cos(uTime * 0.001)) * 0.8 + 0.2;
    vec4 noise = vec4(curlNoise(vec3(currPos.xyz * 0.001)), t) * .05;

    float m = 0.01;

    vec4 diff = (destPos - currPos) * (abs(noise) + m);

    vel.xyz *= 0.1;    
    vel.xyz += diff.xyz; 

    return vel;
}

#pragma glslify: export(commonShowVelocity)