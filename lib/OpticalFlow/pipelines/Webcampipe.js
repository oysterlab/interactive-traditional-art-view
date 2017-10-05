const THREE = require('three')
import PIPE from "./Pipeline.js"
import INFO from "./../information.js"

class Webcampipe extends PIPE {
  constructor(rdrr) {
    super(rdrr);

    this.video = document.createElement("video");
    this.video.width = INFO.webcamWidth;
    this.video.height = INFO.webcamHeight;
    this.video.autoplay = true;

    // console.log(navigator.webkitGetUserMedia);
    // this.context = this.video.getContext('2d');
    navigator.webkitGetUserMedia({video : true}, this._gotStream.bind(this), this._noStream.bind(this));

    this.videotexture = new THREE.Texture(this.video);
    this.videotexture.minFilter = THREE.LinearFilter;
    this.videotexture.magFilter = THREE.LinearFilter;

    this.canvas.add(new THREE.Mesh(
      this.geometry,
      new THREE.MeshBasicMaterial({map : this.videotexture})
    ));
    this.scene.add(this.canvas);

  }

  _gotStream(stream) {
      if (window.URL)
      {
          this.video.src = window.URL.createObjectURL(stream);
      } else // Opera
      {
          this.video.src = stream;
      }
      this.video.onerror = function (e)
      {
          stream.stop();
      };
      stream.onended = this._noStream.bind(this);
      // this.isReady = true;
  }

  _noStream(e) {
    var msg = 'No camera available.';
    if (e.code == 1)
    {
        msg = 'User denied access to use camera.';
    }
    document.getElementById('errorMessage').textContent = msg;
  }

  update() {
    this.videotexture.needsUpdate = !this.video.paused;
    if(!this.video.paused) this.render();
  }
}


export default Webcampipe
