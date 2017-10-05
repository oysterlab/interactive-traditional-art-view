
attribute vec2 boxIndex;

uniform sampler2D positionTexture;
uniform sampler2D colorTexture;

varying vec4 vColor;

void main() {
    vec3 boxPos = texture2D(positionTexture, boxIndex).xyz;
    vec3 pos = position + boxPos;

    vColor = texture2D(colorTexture, vec2(boxIndex.x, 1.0 - boxIndex.y));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);
}