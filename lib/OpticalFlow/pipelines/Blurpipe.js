const THREE = require('three')
import INFO from './../information.js'
import PIPE from './Pipeline.js'


class Blurpipe extends PIPE {
  constructor(rdrr, texture) {
    super(rdrr);
    this.prevtexture = texture;

    this.xtexture = new THREE.WebGLRenderTarget(
      INFO.textureWidth,
      INFO.textureHeight, {
        minFilter : THREE.LinearFilter,
        magFilter : THREE.LinearFilter
      }
    );

    this.ytexture = new THREE.WebGLRenderTarget(
      INFO.textureWidth,
      INFO.textureHeight, {
        minFilter : THREE.LinearFilter,
        magFilter : THREE.LinearFilter
      }
    );


    this.xunif = { type : "t", value : this.ytexture };
    this.xscene = new THREE.Scene();
    this.xcanvas = new THREE.Mesh(this.geometry, new THREE.ShaderMaterial({
      uniforms : {
        unif_texture : this.xunif ,
        unif_reso : { type : "2f", value : [INFO.textureWidth, INFO.textureHeight]}
      },
      vertexShader : `
      varying vec2 vtex;
      void main(void) {
        vtex = uv;
        gl_Position = vec4(position, 1.0);
      }
      `,
      fragmentShader : `
      uniform sampler2D unif_texture;
      uniform vec2 unif_reso;

      varying vec2 vtex;
      void main(void) {
        vec4 retcol = vec4(0.0);
        vec2 offset = vec2(` + INFO.blurDetail + `.0, 0.0) / unif_reso;
        retcol += 0.02 * texture2D(unif_texture, vtex - 3.0 * offset);
        retcol += 0.13 * texture2D(unif_texture, vtex - 2.0 * offset);
        retcol += 0.20 * texture2D(unif_texture, vtex - 1.0 * offset);
        retcol += 0.30 * texture2D(unif_texture, vtex + 0.0 * offset);
        retcol += 0.20 * texture2D(unif_texture, vtex + 1.0 * offset);
        retcol += 0.13 * texture2D(unif_texture, vtex + 2.0 * offset);
        retcol += 0.02 * texture2D(unif_texture, vtex + 3.0 * offset);

        gl_FragColor = retcol;
      }
      `
    }));

    this.yunif = { type : "t", value : this.xtexture };
    this.yscene = new THREE.Scene();
    this.ycanvas = new THREE.Mesh(
      this.geometry, new THREE.ShaderMaterial({
      uniforms : {
        unif_texture : this.yunif ,
        unif_reso : { type : "2f", value : [INFO.textureWidth, INFO.textureHeight]}
      },
      vertexShader : `
      varying vec2 vtex;
      void main(void) {
        vtex = uv;
        gl_Position = vec4(position, 1.0);
      }
      `,
      fragmentShader : `
      uniform sampler2D unif_texture;
      uniform vec2 unif_reso;

      varying vec2 vtex;
      void main(void) {
        vec4 retcol = vec4(0.0);
        vec2 offset = vec2(0.0, ` + INFO.blurDetail + `.0) / unif_reso;
        retcol += 0.02 * texture2D(unif_texture, vtex - 3.0 * offset);
        retcol += 0.13 * texture2D(unif_texture, vtex - 2.0 * offset);
        retcol += 0.20 * texture2D(unif_texture, vtex - 1.0 * offset);
        retcol += 0.30 * texture2D(unif_texture, vtex + 0.0 * offset);
        retcol += 0.20 * texture2D(unif_texture, vtex + 1.0 * offset);
        retcol += 0.13 * texture2D(unif_texture, vtex + 2.0 * offset);
        retcol += 0.02 * texture2D(unif_texture, vtex + 3.0 * offset);

        gl_FragColor = retcol;
      }
      `
    }));
    this.xscene.add(this.xcanvas);
    this.yscene.add(this.ycanvas);

    this.canvas.add(new THREE.Mesh(
      this.geometry,
      new THREE.MeshBasicMaterial({ map : this.ytexture })
    ));

  }

  update(dt) {
    if(this.prevtexture.isready) {
      this.xunif.value = this.prevtexture;
      this.rdrr.render(this.xscene, this.camera, this.xtexture);

      for(var idx = 0; idx < INFO.blurRange; idx ++) {
        this.yunif.value = this.xtexture;
        this.rdrr.render(this.yscene, this.camera, this.ytexture);
        this.xunif.value = this.ytexture;
        this.rdrr.render(this.xscene, this.camera, this.xtexture);
      }

      this.yunif.value = this.xtexture;
      this.rdrr.render(this.yscene, this.camera, this.ytexture);

      this.render();
    }
  }
}

export default Blurpipe
