#pragma glslify: curlNoise = require('./curl-noise')

uniform sampler2D destColorTexture;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec4 currColor = texture2D(colorTexture, uv);
    vec4 destColor = texture2D(destColorTexture, uv);

    gl_FragColor = destColor;

//    vec4 diff = destColor - currColor;

//    if(destColor.x * destColor.y * destColor.z < 0.0001 ) {
//        destColor.x = 0.01;
//        destColor.y = 0.01;
//        destColor.z = 0.01;       
//    }

//    currColor += diff * destColor * 0.1 * vec4(vec3(0.4), 1.0);

//    gl_FragColor = currColor;
}

