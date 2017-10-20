#pragma glslify: curlNoise = require('../shaders/curl-noise')

vec4 commonShowVelocity(vec4 currPos, vec4 destPos, vec4 vel, vec4 currColor, float uTime,  vec2 flow) {

    float t = (sin(uTime * 0.00001) * cos(uTime * 0.001)) * 0.8 + 0.2;
    vec4 noise = vec4(curlNoise(vec3(currPos.xyz * 0.001)), t) * .005;

    float m = 0.01;

    vec4 diff = (destPos - currPos) * (noise);
    diff.z = -length(flow.xy) * 0.1; 
    diff.z *= length(destPos - currPos);

    vel.xyz *= 0.001;    
    vel.xyz += diff.xyz;

//    vel.xy += flow.xy * 30.;

    return vel;
}

#pragma glslify: export(commonShowVelocity)