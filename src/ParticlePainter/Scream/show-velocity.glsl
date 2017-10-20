#pragma glslify: curlNoise = require('../shaders/curl-noise')


// 3 1 1 

vec4 commonShowVelocity(vec4 currPos, vec4 destPos, vec4 vel, vec4 currColor, float uTime,  vec2 flow) {

    float t = (sin(uTime * 0.00001) * cos(uTime * 0.001)) * 0.8 + 0.2;
    vec4 noise = vec4(curlNoise(vec3(currPos.xyz * 0.001)), t) * .05;

    float m = 0.01;

    vec4 diff = (destPos - currPos) * (abs(noise) + m);

    vel.xyz *= 0.1;    
    vel.xyz += diff.xyz; 

    flow.xy *= 2.;
    
    vec2 d = sin(cos(sin(flow.xy) * 2.0));

    vel.x += d.x * 0.8;
    vel.y += d.y * 0.4;

//    vel.xy += sin(flow.xy) * 0.4; //pow(flow * 2., vec2(0.6)).xy;
//    vel.z *= flow.x;

    return vel;
}

#pragma glslify: export(commonShowVelocity)