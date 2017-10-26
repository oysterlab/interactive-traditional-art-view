const THREE = require('three')
const path = require('path')
const TWEEN = require('es6-tween')
TWEEN.autoPlay(true)

const Ready = {
    name: 'starryNightReady',
    state: function(particlePainter, img, imageData) {
        const { computeWidth, computeHeight } = particlePainter
        particlePainter.mesh.geometry.copy(new THREE.BoxBufferGeometry(1, 1, 2))
        const nextPositions = new Float32Array(computeWidth * computeHeight * 4)

        for (let y = 0; y < computeHeight; y++) {
            for (let x = 0; x < computeWidth; x++) {
            const i = (y * computeHeight + x) * 4

            const r = Math.random() * Math.PI * 2
            nextPositions[i + 0] = Math.cos(r) * computeWidth * 0.5
            nextPositions[i + 1] = Math.sin(r) * computeHeight * 0.5
            nextPositions[i + 2] = 1200
            nextPositions[i + 3] = 1
            }
        }

        particlePainter.styleMesh.visible = false

        return {
            nextPositions,
        }
    },
    glslPaths: {
        velocity: path.resolve(__dirname, './ready-velocity.glsl')
    },
    cameraAnimation: function(cameraTwin) {
      return new Promise((resolve) => {
        cameraTwin.rotation.stop()
        cameraTwin.rotation
        .to({
          x: 0.,
          y: 0.,
          z: 0.
         }, 3000)
        .start()
  
        cameraTwin.position.stop()
        cameraTwin.position
        .to({
          x: 0,
          y: 0,
          z: 1500 }, 3000)
        .start()
        .on('complete', () => {
          resolve()
        })
      })
    }
}

const Show = {
    name: 'starryNightShow',
    state: function(particlePainter, img, imageData) {
      const { computeWidth, computeHeight } = particlePainter
      const nextPositions = new Float32Array(computeWidth * computeHeight * 4)
      const nextColors = new Float32Array(computeWidth * computeHeight * 4)
      const lumi = [0.2126, 0.7152, 0.0722]
  
      for (let y = 0; y < computeHeight; y++) {
        for (let x = 0; x < computeWidth; x++) {
          const i = (y * computeHeight + x) * 4
  
          const r = imageData.data[i + 0] / 255
          const g = imageData.data[i + 1] / 255
          const b = imageData.data[i + 2] / 255
  
          const l = r * lumi[0] + g * lumi[1] + b * lumi[2]
  
          nextPositions[i + 0] = x - computeWidth * 0.5
          nextPositions[i + 1] = y - computeHeight * 0.5
          nextPositions[i + 2] = Math.pow(1 - l, 20) * 10
          nextPositions[i + 3] = 1
  
          nextColors[i + 0] = r
          nextColors[i + 1] = g
          nextColors[i + 2] = b
          nextColors[i + 3] = imageData.data[i + 3] / 255
        }
      }
  
  
      const texture = new THREE.Texture(img)
      texture.needsUpdate = true
      particlePainter.styleMesh.visible = true
      particlePainter.styleMesh.material.map = texture
      particlePainter.styleMesh.material.needsUpdate = true
      particlePainter.styleMesh.material.opacity = 0.
  
      new TWEEN.Tween(particlePainter.styleMesh.material)
      .delay(3000)
      .to({
        opacity: 1.,
      }, 10000)
      .on('complete', () => {
  
      })
      .start()
  
      return {
        nextPositions,
        nextColors,
      }
    },
    glslPaths: {
      velocity: path.resolve(__dirname, './show-velocity.glsl')
    },
    cameraAnimation: function(cameraTwin) {
      return new Promise((resolve) => {
        cameraTwin.position.stop()
        cameraTwin.position
        .to({
          x: 0.000496596160302264,
          y: 2.00016908737111,
          z: 500.20168575666844
        }, 2000)
        .start();

        cameraTwin.rotation.stop()
        cameraTwin.rotation
        .to({
          x: 0.105588229570862,
          y: 0.0052092464675347165,
          z: 0.002205852746298365
         }, 2000)
        .start() 
        .on('complete', () => {
          resolve()
        })    
      })
    }
    
  }

  export default {
      Ready,
      Show
  }