const THREE = require('three')
import WebCam from './pipelines/Webcampipe.js'
import Prevpipe from './pipelines/Prevpipe.js'
import Diffpipe from './pipelines/Diffpipe.js'
import Decaypipe from './pipelines/Decaypipe.js'
import Blurpipe from './pipelines/Blurpipe.js'

class OptFlow {
  constructor(rdrr) {
    if(rdrr == undefined) {
      this.rdrr = new THREE.WebGLRenderer({alpha : false});
      this.rdrr.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(this.rdrr.domElement);
    } else {
      this.rdrr = rdrr;
    }
    // console.log(THREE);

    this.pipeline_webc = new WebCam(this.rdrr);

    this.pipeline_prev = new Prevpipe(this.rdrr,
      this.pipeline_webc.getTexture());

    this.pipeline_diff = new Diffpipe(this.rdrr,
      this.pipeline_prev.getTexture(),
      this.pipeline_webc.getTexture()
    );

    this.pipeline_decay = new Decaypipe(this.rdrr,
      this.pipeline_diff.getTexture()
    );

    this.pipeline_blur = new Blurpipe(this.rdrr,
      this.pipeline_decay.getTexture()
    );

    this.prevTime = new Date()
    // console.log(this.pipeline_prev);
  }

  update() {
    const currTime = new Date()
    const dt = currTime - this.prevTime
    this.pipeline_prev.update(dt);
    this.pipeline_webc.update(dt);
    this.pipeline_diff.update(dt);
    this.pipeline_decay.update(dt);
    this.pipeline_blur.update(dt);

    this.prevTime = currTime
  }

  getTexture() {
    return this.pipeline_blur.getTexture();
  }

  isReady() {
    return this.pipeline_blur.isReady();
  }
}

export default OptFlow
