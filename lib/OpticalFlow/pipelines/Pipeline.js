const THREE = require('three')
import INFO from "./../information.js"

class Pipeline {

  constructor(rdrr) {
    this.rdrr = rdrr;

    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.canvas = new THREE.Object3D();
    this.geometry = new THREE.PlaneGeometry(2.0, 2.0);
    this.scene.add(this.canvas);

    this.texture = new THREE.WebGLRenderTarget(
      INFO.textureWidth, INFO.textureHeight,{
        minFilter : THREE.LinearFilter,
        magFilter : THREE.LinearFilter
      }
    );

    this.texture.isready = false;

  }

  render() {
    this.rdrr.render(this.scene, this.camera, this.texture)
    this.texture.isready = true;
  }

  isReady() { return this.texture.isready; }
  getTexture() { return this.texture; }
}


export default Pipeline;
