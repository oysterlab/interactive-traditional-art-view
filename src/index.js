const THREE = require('three')
const OrbitControls = require('three-orbit-controls')(THREE)
const path = require('path')

const TWEEN = require('es6-tween')
TWEEN.autoPlay(true)

import ParticlePainter from './ParticlePainter'

import StarryNight from './ParticlePainter/StarryNight'
import Scream from './ParticlePainter/Scream'
import Wave from './ParticlePainter/Wave'
import Udine from './ParticlePainter/Udine'
import Common from './ParticlePainter/Common'

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
particlePainter.addTransforState(StarryNight.Ready)
particlePainter.addTransforState(StarryNight.Show)

// scream style
particlePainter.addTransforState(Scream.Ready)
particlePainter.addTransforState(Scream.Show)

// wave style
particlePainter.addTransforState(Wave.Ready)
particlePainter.addTransforState(Wave.Show)

// udine style
particlePainter.addTransforState(Udine.Ready)
particlePainter.addTransforState(Udine.Show)

// common style
particlePainter.addTransforState(Common.Ready)
particlePainter.addTransforState(Common.Show)


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

let cameraTween = {
  rotation: new TWEEN.Tween(camera.rotation),
  position: new TWEEN.Tween(camera.position)
}


window.camera = camera

setTimeout(() => {
  particlePainter.toState(StarryNight.Ready.name)
  StarryNight.Ready.cameraAnimation(cameraTween).then(() => {
    loadImage(`./resources/styled1.jpg`).then(({imageData, img}) => {
      particlePainter.toState(StarryNight.Show.name, imageData, img)
      StarryNight.Show.cameraAnimation(cameraTween)
    })
  })
}, 500)

// socket

import config from './config'
const { SOCKET_HOST, SOCKET_PORT } = config
const socket = require('socket.io-client')(SOCKET_HOST + ':' + SOCKET_PORT + '/visual')

// from history
socket.on('selected-result', (dataStr) => {
  const { styleId, resultSrc } = JSON.parse(dataStr)
  
  const resultUrl = `${SOCKET_HOST}:${SOCKET_PORT}${resultSrc}`

  if (styleId == 0) {
    
    particlePainter.toState(StarryNight.Ready.name)
    StarryNight.Ready.cameraAnimation(cameraTween).then(() => {
      loadImage(resultUrl).then(({imageData, img}) => {
        particlePainter.toState(StarryNight.Show.name, imageData, img)
        StarryNight.Show.cameraAnimation(cameraTween)
      })
    })

  } else if (styleId == 1) {

    particlePainter.toState(Wave.Ready.name)
    Wave.Ready.cameraAnimation(cameraTween).then(() => {
      loadImage(resultUrl).then(({imageData, img}) => {
        particlePainter.toState(Wave.Show.name, imageData, img)
        Wave.Show.cameraAnimation(cameraTween)
      })
    })

  } else if (styleId == 2) {

    particlePainter.toState(Scream.Ready.name)
    Scream.Ready.cameraAnimation(cameraTween).then(() => {
      loadImage(resultUrl).then(({imageData, img}) => {
        particlePainter.toState(Scream.Show.name, imageData, img)
        Scream.Show.cameraAnimation(cameraTween)
      })
    })
    
  } else if (styleId == 3) {
    
    particlePainter.toState(Udine.Ready.name)
    Udine.Ready.cameraAnimation(cameraTween).then(() => {
      loadImage(resultUrl).then(({imageData, img}) => {
        particlePainter.toState(Udine.Show.name, imageData, img)
        Udine.Show.cameraAnimation(cameraTween)
      })
    })

  } else {

    particlePainter.toState(Common.Ready.name)
    Common.Ready.cameraAnimation(cameraTween).then(() => {
      loadImage(resultUrl).then(({imageData, img}) => {
        particlePainter.toState(Common.Show.name, imageData, img)
        Common.Show.cameraAnimation(cameraTween)
      })
    })
  }
})

// from conductive

socket.on('selected-style', (dataStr) => {
  const { styleId } = JSON.parse(dataStr)
  
  if (styleId == 0) {

    particlePainter.toState(StarryNight.Ready.name)
    StarryNight.Ready.cameraAnimation(cameraTween)

  } else if (styleId == 1) {

    particlePainter.toState(Wave.Ready.name)
    Wave.Ready.cameraAnimation(cameraTween)

  } else if (styleId == 2) {

    particlePainter.toState(Scream.Ready.name)
    Scream.Ready.cameraAnimation(cameraTween)

  } else if (styleId == 3) {

    particlePainter.toState(Udine.Ready.name)
    Udine.Ready.cameraAnimation(cameraTween)
    
  } else {

    particlePainter.toState(Common.Ready.name)
    Common.Ready.cameraAnimation(cameraTween)

  } 
})


socket.on('result-generated', (dataStr) => {
  const { styleId, resultSrc } = JSON.parse(dataStr)
  const imgSrc = `${SOCKET_HOST}:${SOCKET_PORT}${resultSrc}`

  if (styleId == 0) {

    loadImage(imgSrc).then(({imageData, img}) => {
      particlePainter.toState(StarryNight.Show.name, imageData, img)
      StarryNight.Show.cameraAnimation(cameraTween)
    })

  } else if (styleId == 1) {

    loadImage(imgSrc).then(({imageData, img}) => {
      particlePainter.toState(Wave.Show.name, imageData, img)
      Wave.Show.cameraAnimation(cameraTween)
    })

  } else if (styleId == 2) {

    loadImage(imgSrc).then(({imageData, img}) => {
      particlePainter.toState(Scream.Show.name, imageData, img)
      Scream.Show.cameraAnimation(cameraTween)
    })

  } else if (styleId == 3) {

    loadImage(imgSrc).then(({imageData, img}) => {
      particlePainter.toState(Udine.Show.name, imageData, img)
      Udine.Show.cameraAnimation(cameraTween)
    })

  } else {

    loadImage(imgSrc).then(({imageData, img}) => {
      particlePainter.toState(Common.Show.name, imageData, img)
      Common.Show.cameraAnimation(cameraTween)
    })

  } 
  
})


// debugging

window.addEventListener('keyup', ({keyCode}) => {
  if (keyCode == 49) {    // starray-night

    particlePainter.toState(StarryNight.Ready.name)
    StarryNight.Ready.cameraAnimation(cameraTween).then(() => {
      loadImage(`./resources/styled1.jpg`).then(({imageData, img}) => {
        particlePainter.toState(StarryNight.Show.name, imageData, img)
        StarryNight.Show.cameraAnimation(cameraTween)
      })
    })

  } else if (keyCode == 50) {   // wave

    particlePainter.toState(Wave.Ready.name)
    Wave.Ready.cameraAnimation(cameraTween).then(() => {
      loadImage(`./resources/styled5.jpg`).then(({imageData, img}) => {
        particlePainter.toState(Wave.Show.name, imageData, img)
        Wave.Show.cameraAnimation(cameraTween)
      })
    })

  } else if (keyCode == 51) {   // scream
    
    particlePainter.toState(Scream.Ready.name)
    Scream.Ready.cameraAnimation(cameraTween).then(() => {
      loadImage(`./resources/styled7.jpg`).then(({imageData, img}) => {
        particlePainter.toState(Scream.Show.name, imageData, img)
        Scream.Show.cameraAnimation(cameraTween)
      })
    })

  } else if (keyCode == 52) {   // udine
    
    particlePainter.toState(Udine.Ready.name)
    Udine.Ready.cameraAnimation(cameraTween).then(() => {
      loadImage(`./resources/styled6.jpg`).then(({imageData, img}) => {
        particlePainter.toState(Udine.Show.name, imageData, img)
        Udine.Show.cameraAnimation(cameraTween)
      })
    })

  } else {

    particlePainter.toState(Common.Ready.name)
    Common.Ready.cameraAnimation(cameraTween).then(() => {
      loadImage(`./resources/test2-1507957932338-4.jpg`).then(({imageData, img}) => {
        particlePainter.toState(Common.Show.name, imageData, img)
        Common.Show.cameraAnimation(cameraTween)
      })
    })

  }

  
})
