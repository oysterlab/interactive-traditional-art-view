const THREE = require('three')
const OrbitControls = require('three-orbit-controls')(THREE)
const path = require('path')

import ParticlePainter from './ParticlePainter'

const WIDTH = window.innerWidth
const HEIGHT = window.innerHeight
const renderer = new THREE.WebGLRenderer()
renderer.setSize(WIDTH, HEIGHT)

const camera = new THREE.PerspectiveCamera(75, WIDTH/HEIGHT, 1, 10000)
camera.position.z = 500;  

document.body.appendChild(renderer.domElement)

const particleCount = Math.pow(2, 18)
const particlePainter = new ParticlePainter(renderer, camera, particleCount)

// starry-night style
particlePainter.addTransforState({
  name: 'starryNightReady',
  state: function(imageData, particlePainter) {
    const { computeWidth, computeHeight } = particlePainter
    const nextPositions = new Float32Array(computeWidth * computeHeight * 4)

    for (let y = 0; y < computeHeight; y++) {
      for (let x = 0; x < computeWidth; x++) {
        const i = (y * computeHeight + x) * 4

        nextPositions[i + 0] = (Math.random() - 0.5) * 2000
        nextPositions[i + 1] = (Math.random() - 0.5) * 2000
        nextPositions[i + 2] = 2000
        nextPositions[i + 3] = 1
      }
    }

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
  state: function(imageData, particlePainter) {
    const { computeWidth, computeHeight } = particlePainter
    const nextPositions = new Float32Array(computeWidth * computeHeight * 4)
    const nextColors = new Float32Array(computeWidth * computeHeight * 4)

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
    velocity: path.resolve(__dirname, './ParticlePainter/shaders/starry-night-show/dt-velocity.glsl')
  }
})


//common style
particlePainter.addTransforState({
  name: 'commonReady',
  state: function(imageData, particlePainter) {
    const { computeWidth, computeHeight } = particlePainter
    const nextPositions = new Float32Array(computeWidth * computeHeight * 4)

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
  state: function(imageData, particlePainter) {
    const { computeWidth, computeHeight } = particlePainter
    const nextPositions = new Float32Array(computeWidth * computeHeight * 4)
    const nextColors = new Float32Array(computeWidth * computeHeight * 4)
    
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
    resImg.onload = () => {
      const canvas = document.createElement('canvas')
      const { computeWidth, computeHeight } = particlePainter
  
      canvas.width = computeWidth
      canvas.height = computeHeight
    
      const context = canvas.getContext('2d')
      context.drawImage(resImg, 0, 0, resImg.width, resImg.height, 
        0, 0, computeWidth, computeHeight)  
      
      const imageData = context.getImageData(0, 0, computeWidth, computeHeight)
      resolve(imageData)
    }
  })
}

window.addEventListener('keyup', ({keyCode}) => {
  if (keyCode == 49) {    //ready starray-night
    particlePainter.toState('starryNightReady')
  } else if (keyCode == 50) {   //show starray-night
    loadImage('./resources/styled1.jpg').then((imageData) => {
      particlePainter.toState('starryNightShow', imageData)
    })
  } else if (keyCode == 51) {    //ready common
    particlePainter.toState('commonReady')
  } else if (keyCode == 52) {   //show common
    loadImage(`./resources/styled${Math.ceil(Math.random() * 4) + 1}.jpg`).then((imageData) => {
      console.log(imageData)
      particlePainter.toState('commonShow', imageData)
    })
  }
})

