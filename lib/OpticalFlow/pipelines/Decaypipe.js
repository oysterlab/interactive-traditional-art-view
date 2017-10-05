const THREE = require('three')
import INFO from './../information.js'
import PIPE from './Pipeline.js'

class Decaypipe extends PIPE {
  constructor(rdrr, texture) {
    super(rdrr);

    this.timer = { type : "1f", value : 0.0 }

    this.currtexture = texture;
    this.temptexture = new THREE.WebGLRenderTarget(
      INFO.textureWidth, INFO.textureHeight, {
        minFilter : THREE.LinearFilter,
        magFilter : THREE.LinearFilter
      }
    );

    this.canvas.add(new THREE.Mesh(
      this.geometry,
      new THREE.ShaderMaterial({
        uniforms : {
          unif_prevtex : { type : "t", value : this.temptexture},
          unif_currtex : { type : "t", value : texture },
          unif_deltatime : this.timer,
        },
        vertexShader : `
        varying vec2 vtex;
        void main(void) {
          vtex = uv;
          gl_Position = vec4(position, 1.0);
        }
        `,
        fragmentShader : `
        uniform sampler2D unif_prevtex;
        uniform sampler2D unif_currtex;
        uniform float unif_deltatime;

        varying vec2 vtex;

        void main(void) {
          vec2 prev = texture2D(unif_prevtex, vtex).rg * 2.0 - 1.0;
          vec2 curr = texture2D(unif_currtex, vtex).rg * 2.0 - 1.0;

          prev.x -= sign(prev.x) * 0.5 * unif_deltatime;
          prev.y -= sign(prev.y) * 0.5 * unif_deltatime;

          vec2 retv = (prev + curr) * 0.5 + 0.5;


          gl_FragColor = vec4(retv, 0.0, 1.0);
        }
        `
      })
    ));
    this.tempinit = { type : "1f", value : 0.0 };
    this.tempunif = { type : "t" , value : this.currtexture};
    this.tempScene = new THREE.Scene();
    this.tempCanvas = new THREE.Object3D();
    this.tempScene.add(this.tempCanvas);
    this.tempCanvas.add(new THREE.Mesh(
      this.geometry,
      new THREE.ShaderMaterial({
        uniforms : {
          unif_init : this.tempinit,
          unif_texture : this.tempunif
        },
        fragmentShader : `
        uniform float unif_init;
        uniform sampler2D unif_texture;
        varying vec2 vtex;
        void main(void) {
          vec4 retcol = vec4(0.5, 0.5, 0.0, 1.0);
          if(unif_init > 0.5) {
            retcol = texture2D(unif_texture, vtex);
          }
          gl_FragColor = retcol;
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

  update(dt) {
    if(this.currtexture.isready) {
      // this.tempMaterial.needsUpdate = true;
      this.timer.value = dt;
      this.rdrr.render(this.tempScene, this.camera, this.temptexture);
      this.tempinit.value = 1.0;
      this.tempunif.value = this.texture;
      // this.tempMaterial.map = this.texture;
      this.render();
    }
  }

}

export default Decaypipe;
