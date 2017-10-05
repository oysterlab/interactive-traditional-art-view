const THREE = require('three')
import PIPE from './Pipeline.js'
import INFO from './../information.js'

class Diffpipe extends PIPE{
  constructor(rdrr, prevtex, currtex) {
    super(rdrr);
    this.prevtex = prevtex;
    this.currtex = currtex;

    this.canvas.add(new THREE.Mesh( this.geometry,
      new THREE.ShaderMaterial({
        uniforms : {
          unif_prev : { type : "t", value : this.prevtex},
          unif_curr : { type : "t", value : this.currtex},
          unif_reso : { type : "2f",value : [INFO.textureWidth, INFO.textureHeight]}
        },
        fragmentShader : `
        uniform sampler2D unif_prev;
        uniform sampler2D unif_curr;
        uniform vec2 unif_reso;

        varying vec2 vtex;

        const float lambda = 0.002;
        const float thres = 0.1;

        void main(void) {
          vec2 offset_x = vec2(1.0, 0.0) / unif_reso.x;
          vec2 offset_y = vec2(0.0, 1.0) / unif_reso.y;

          vec4 sd = texture2D(unif_curr, vtex) - texture2D(unif_prev, vtex);
          vec4 gx =
            texture2D(unif_prev, vtex + offset_x) - texture2D(unif_prev, vtex - offset_x) +
            texture2D(unif_curr, vtex + offset_x) - texture2D(unif_curr, vtex - offset_x);
          vec4 gy =
            texture2D(unif_prev, vtex + offset_y) - texture2D(unif_prev, vtex - offset_y) +
            texture2D(unif_curr, vtex + offset_y) - texture2D(unif_curr, vtex - offset_y);

          vec4 gd = max(vec4(lambda) * 2.0, sqrt((gx * gx) + (gy * gy) * vec4(lambda)));

          vec4 vx = sd * (gx / gd);
          vec4 vy = sd * (gy / gd);

          vec2 flow = vec2(0.0);
          flow.x = (vx.r + vx.g + vx.b) / 3.0;
          flow.y = (vy.r + vy.g + vy.b) / 3.0;

          float str = length(flow);
          if(str * thres > 0.0) {
            if(str < thres) {
              flow = vec2 (0.0);
            }
            else {
              str = (str - thres) / ( 1.0 - thres);
              flow = normalize(flow) * str;
            }
          }
          gl_FragColor = vec4(flow * 0.5 + 0.5, 0.0 , 1.0);

          //
          // //현재의 색깔
          // vec3 currcol = texture2D(unif_curr, vtex).rgb;
          // vec3 prevcol = texture2D(unif_prev, vtex).rgb;
          // vec3 diffcol = prevcol - currcol;
          //
          // float power = smoothstep(0.0, 0.5, length(diffcol));
          //
          // float mdiff = length(vec3(1.0));
          // vec3 diffr = texture2D(unif_prev, vtex + offset_x).rgb - currcol;
          // vec3 diffl = texture2D(unif_prev, vtex - offset_x).rgb - currcol;
          // vec3 difft = texture2D(unif_prev, vtex + offset_y).rgb - currcol;
          // vec3 diffb = texture2D(unif_prev, vtex - offset_y).rgb - currcol;
          //
          // vec2 dir = vec2(0.0);
          // dir.x += mdiff - length(diffr);
          // dir.x -= mdiff - length(diffl);
          // dir.y += mdiff - length(difft);
          // dir.y -= mdiff - length(diffb);
          //
          // vec2 force = power * normalize(dir);
          //
          // if(length(dir) < 0.01) force = vec2(0.0, 0.0);
          // gl_FragColor = vec4(force * 0.5 + 0.5 , 0.0, 1.0);
        }

        `,
        vertexShader : `
        varying vec2 vtex;
        void main(void) {
          vtex = uv;
          gl_Position = vec4(position, 1.0);
        }
        `
      })
    ));
  }

  update() {
    if(this.prevtex.isready && this.currtex.isready) {
      this.render();
    }
  }
}

export default Diffpipe
