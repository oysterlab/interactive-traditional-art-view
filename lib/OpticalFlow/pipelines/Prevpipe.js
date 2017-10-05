const THREE = require('three')
import PIPE from './Pipeline.js'
// import INFO from './../information.js'

class Prevpipe extends PIPE{

  constructor(rdrr, texture) {
    super(rdrr);
    this.gotTexture = texture;

    this.canvas.add(new THREE.Mesh( this.geometry,
      new THREE.MeshBasicMaterial({map : texture})
    ));

  }

  update() {
    if(this.gotTexture.isready) {
      this.render();
    }
  }
}

export default Prevpipe
