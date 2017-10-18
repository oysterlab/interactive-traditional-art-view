const THREE = require('three')
const OrbitControls = require('three-orbit-controls')(THREE)
const path = require('path')

const TWEEN = require('es6-tween')
TWEEN.autoPlay(true)

import ParticlePainter from './ParticlePainter'

const WIDTH = window.innerWidth
const HEIGHT = window.innerHeight
const renderer = new THREE.WebGLRenderer()
renderer.setSize(WIDTH, HEIGHT)

const camera = new THREE.PerspectiveCamera(75, WIDTH/HEIGHT, 1, 10000)
camera.position.z = 500

document.body.appendChild(renderer.domElement)

const particleCount = Math.pow(2, 18)
const particlePainter = new ParticlePainter(renderer, camera, particleCount)

// starry-night style
particlePainter.addTransforState({
  name: 'starryNightReady',
  state: function(particlePainter, img, imageData) {
    const { computeWidth, computeHeight } = particlePainter
    particlePainter.mesh.geometry.copy(new THREE.BoxBufferGeometry(1, 1, 2))
    const nextPositions = new Float32Array(computeWidth * computeHeight * 4)

    for (let y = 0; y < computeHeight; y++) {
      for (let x = 0; x < computeWidth; x++) {
        const i = (y * computeHeight + x) * 4

        nextPositions[i + 0] = x - computeWidth * 0.5
        nextPositions[i + 1] = y - computeHeight * 0.5
        nextPositions[i + 2] = 2000
        nextPositions[i + 3] = 1
      }
    }

    particlePainter.styleMesh.visible = false

    return {
      nextPositions,
    }
  },
  glslPaths: {
    velocity: path.resolve(__dirname, './ParticlePainter/shaders/starry-night-ready/dt-velocity.glsl')
  }
})

particlePainter.addTransforState({
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
    velocity: path.resolve(__dirname, './ParticlePainter/shaders/starry-night-show/dt-velocity.glsl')
  }
})


//common style
particlePainter.addTransforState({
  name: 'commonReady',
  state: function(particlePainter, img, imageData) {
    const { computeWidth, computeHeight } = particlePainter
    const nextPositions = new Float32Array(computeWidth * computeHeight * 4)
    particlePainter.styleMesh.visible = false

    for (let y = 0; y < computeHeight; y++) {
      for (let x = 0; x < computeWidth; x++) {
        const i = (y * computeHeight + x) * 4
        const ri = Math.random() //(y * computeHeight + x) / ()

        nextPositions[i + 0] = Math.cos(ri * 2 * Math.PI) * 1200
        nextPositions[i + 1] = Math.sin(ri * 2 * Math.PI) * 1200
        nextPositions[i + 2] = (Math.random() - 0.5) * 1000
        nextPositions[i + 3] = 1

      }
    }

    return {
      nextPositions,
    }
  },
  glslPaths: {
    velocity: path.resolve(__dirname, './ParticlePainter/shaders/common-ready/dt-velocity.glsl')
  }
})

particlePainter.addTransforState({
  name: 'commonShow',
  state: function(particlePainter, img, imageData) {
    const { computeWidth, computeHeight } = particlePainter
    const nextPositions = new Float32Array(computeWidth * computeHeight * 4)
    const nextColors = new Float32Array(computeWidth * computeHeight * 4)
    particlePainter.styleMesh.visible = false

    for (let y = 0; y < computeHeight; y++) {
      for (let x = 0; x < computeWidth; x++) {
        const i = (y * computeHeight + x) * 4

        nextPositions[i + 0] = x - computeWidth * 0.5
        nextPositions[i + 1] = y - computeHeight * 0.5
        nextPositions[i + 2] = 10
        nextPositions[i + 3] = 1

        nextColors[i + 0] = imageData.data[i + 0] / 255
        nextColors[i + 1] = imageData.data[i + 1] / 255
        nextColors[i + 2] = imageData.data[i + 2] / 255
        nextColors[i + 3] = imageData.data[i + 3] / 255
      }
    }

    return {
      nextPositions,
      nextColors,
    }
  },
  glslPaths: {
    velocity: path.resolve(__dirname, './ParticlePainter/shaders/common-show/dt-velocity.glsl')
  }
})

particlePainter.compile().then(() => {
  requestAnimationFrame(render)
})

function render(t) {
  particlePainter.render(t)
  requestAnimationFrame(render)
}

const control = new OrbitControls(camera, renderer.domElement)

function loadImage(src) {
  return new Promise((resolve) => {
    const resImg = new Image()
    resImg.crossOrigin = "Anonymous";
    resImg.src = src
    resImg.onload = (e) => {
      const img = e.target
      const canvas = document.createElement('canvas')
      const { computeWidth, computeHeight } = particlePainter

      canvas.width = computeWidth
      canvas.height = computeHeight

      const context = canvas.getContext('2d')
      context.drawImage(resImg, 0, 0, resImg.width, resImg.height,
        0, 0, computeWidth, computeHeight)

      const imageData = context.getImageData(0, 0, computeWidth, computeHeight)
      resolve({ imageData, img })
    }
  })
}
window.camera = camera
window.addEventListener('keyup', ({keyCode}) => {
  if (keyCode == 49) {    // starray-night

    particlePainter.toState('starryNightReady')

    new TWEEN.Tween(camera.rotation)
    .to({
      x: 0.,
      y: 0.,
      z: 0.
     }, 3000)
    .start()

    new TWEEN.Tween(camera.position)
    .to({
      x: 0,
      y: 0,
      z: 2600 }, 6000)
    .on('complete', () => {

      loadImage(`./resources/styled1.jpg`).then(({imageData, img}) => {
        particlePainter.toState('starryNightShow', imageData, img)
      })

      new TWEEN.Tween(camera.position)
      .to({
        x: -5.496596160302264,
        y: -453.16908737111,
        z: 393.20168575666844
      }, 2000)
      .start();

      new TWEEN.Tween(camera.rotation)
      .to({
        x: 0.8561323593044102,
        y: -0.009161121742914736,
        z: 0.010557749391455028
       }, 2000)
      .start()
    })
    .start()

  } else if (keyCode == 50) {   // common

    particlePainter.toState('commonReady')

    new TWEEN.Tween(camera.rotation)
    .to({
      x: 0.,
      y: 0.,
      z: 0.
     }, 3000)
    .start()

    new TWEEN.Tween(camera.position)
    .to({
      x: 0,
      y: 0,
      z: 1000 }, 6000)
    .start()
    .on('complete', () => {
      loadImage(`./resources/styled7.jpg`).then(({imageData, img}) => {

        particlePainter.toState('commonShow', imageData, img)

        new TWEEN.Tween(camera.position)
        .to({
          x: 0,
          y: 0,
          z: 400 }, 2000)
        .start()
      })
    })

  }
})



// socket

import config from './config'
const { SOCKET_HOST, SOCKET_PORT } = config
const socket = require('socket.io-client')(SOCKET_HOST + ':' + SOCKET_PORT + '/visual')
let cameraTween = {
  rotation: new TWEEN.Tween(camera.rotation),
  position: new TWEEN.Tween(camera.position)
}

socket.on('selected-result', (dataStr) => {
  const { styleId, resultSrc } = JSON.parse(dataStr)
  
  const resultUrl = `${SOCKET_HOST}:${SOCKET_PORT}${resultSrc}`
  console.log(resultUrl)
  console.log(JSON.parse(dataStr))

  if(styleId == 0) {
        particlePainter.toState('starryNightReady')
    
        new TWEEN.Tween(camera.rotation)
        .to({
          x: 0.,
          y: 0.,
          z: 0.
         }, 3000)
        .start()
    
        new TWEEN.Tween(camera.position)
        .to({
          x: 0,
          y: 0,
          z: 2600 }, 6000)
        .on('complete', () => {
    
          loadImage(resultUrl).then(({imageData, img}) => {
            particlePainter.toState('starryNightShow', imageData, img)
          })
    
          new TWEEN.Tween(camera.position)
          .to({
            x: -5.496596160302264,
            y: -453.16908737111,
            z: 393.20168575666844
          }, 2000)
          .start();
    
          new TWEEN.Tween(camera.rotation)
          .to({
            x: 0.8561323593044102,
            y: -0.009161121742914736,
            z: 0.010557749391455028
           }, 2000)
          .start()
        })
        .start()
  } else {
    particlePainter.toState('commonReady')

    new TWEEN.Tween(camera.rotation)
    .to({
      x: 0.,
      y: 0.,
      z: 0.
      }, 3000)
    .start()

    new TWEEN.Tween(camera.position)
    .to({
      x: 0,
      y: 0,
      z: 1000 }, 6000)
    .start()
    .on('complete', () => {
      loadImage(resultUrl).then(({imageData, img}) => {

        particlePainter.toState('commonShow', imageData, img)

        new TWEEN.Tween(camera.position)
        .to({
          x: 0,
          y: 0,
          z: 400 }, 2000)
        .start()
      })
    })
  }
})

socket.on('result-generated', (dataStr) => {
  const { styleId, resultSrc } = JSON.parse(dataStr)
  const imgSrc = `${SOCKET_HOST}:${SOCKET_PORT}${resultSrc}`

  if(styleId == 0) {

    cameraTween.rotation.stop()
    cameraTween.rotation
    .to({
      x: 0.,
      y: 0.,
      z: 0.
     }, 1000)
    .start()

    loadImage(imgSrc).then(({imageData, img}) => {
      particlePainter.toState('starryNightShow', imageData, img)

      cameraTween.position.stop()
      cameraTween.position
      .to({
        x: -5.496596160302264,
        y: -453.16908737111,
        z: 393.20168575666844
      }, 2000)
      .start();

      cameraTween.rotation.stop()
      cameraTween.rotation
      .to({
        x: 0.8561323593044102,
        y: -0.009161121742914736,
        z: 0.010557749391455028
        }, 2000)
      .start()

      console.log('starryNightShow')
    })


  } else {
    setTimeout(() => {
      loadImage(imgSrc).then(({imageData, img}) => {
        particlePainter.toState('commonShow', imageData, img)

        cameraTween.position.stop()
        cameraTween.position
        .to({
          x: 0,
          y: 0,
          z: 400 }, 2000)
        .start()
      })
    }, 1000)
  }
})

// socket.on('selected-result', (dataStr) => {
//   const data = JSON.parse(dataStr)
//   console.log(data)
// })