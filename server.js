const express = require('express');
const app = express();

const glsl = require('glslify')

const glslifyCode = `
#pragma glslify: starryNightHideVelocity0 = require('./src/ParticlePainter/shaders/starry-night-show/dt-velocity.glsl')


uniform sampler2D positionTexture;
uniform sampler2D destPosTexture;
uniform float uTime;
uniform int styleType;

void main() {
    vec4 nextVel = vec4(0.);

    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec4 destPos = texture2D(destPosTexture, uv);
    vec4 currPos = texture2D(positionTexture, uv);
    vec4 currVel = texture2D(velocityTexture, uv);
    
    if (styleType == 0) {
         nextVel = starryNightHideVelocity0(currPos, destPos, currVel, uTime); 
    } 

    gl_FragColor = nextVel;
}
`
// const compiled = glsl(glslifyCode)

// console.log(compiled)
 
const cors = require('cors')
const bodyParser = require('body-parser')
app.use( bodyParser.json() ); 

app.use(cors());

app.get('/', function(req,res){ 
    res.send('hello');
});

app.post('/compile-glsl', function(req,res){ 
    const glslifys = req.body.glslifys

    const compiledSet = Object.keys(glslifys).reduce((result, name) => {
        const compiled = glsl(glslifys[name])
        result[name] = compiled
        return result
    }, {})

    res.json(compiledSet);
});  

app.listen(3000, function () {
    console.log('Server is running. Point your browser to: http://localhost:3000');
  });