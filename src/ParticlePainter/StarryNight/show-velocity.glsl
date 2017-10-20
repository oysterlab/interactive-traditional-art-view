
vec4 starryNightShowVelocity(vec4 currPos, vec4 destPos, vec4 vel, vec4 currColor, float uTime, vec2 flow) {

    float t = (sin(uTime * 0.0001) * cos(uTime * 0.001)) * 0.8 + 0.2;

    vec3 lumi = vec3(0.3126, 0.6652, 0.0222);

    float l = currColor.r * lumi.r + currColor.g * lumi.g + currColor.b * lumi.b;

    float m = pow((1. - l), 0.2) * 0.1;

    vec4 diff = (destPos - currPos) * m;// * pow((1. - l), 1.4);

    vel.xyz *= 0.1;    
    vel.xyz += diff.xyz; 

    float z = (destPos - currPos).z;

    if ((l > 0.76 && z < 0.0001) && length(flow) > 0.5 ){
        vel.xy += pow(flow * 2., vec2(2.)).xy;
        vel.z += 1000. * length(flow); //pow(length(flow) * 4., 2.);                        
    }


    return vel;
}

#pragma glslify: export(starryNightShowVelocity)