
vec4 starryNightShowVelocity(vec4 currPos, vec4 destPos, vec4 vel, vec4 currColor, float uTime) {

    float t = (sin(uTime * 0.0001) * cos(uTime * 0.001)) * 0.8 + 0.2;

    vec3 lumi = vec3(0.2126, 0.7152, 0.0722);

    float l = currColor.r * lumi.r + currColor.g * lumi.g + currColor.b * lumi.b;

    float m = pow((1. - l), 0.2) * 0.1;

    vec4 diff = (destPos - currPos) * m * pow((1. - l), 1.4);

    vel.xyz *= 0.1;    
    vel.xyz += diff.xyz; 

    return vel;
}

#pragma glslify: export(starryNightShowVelocity)