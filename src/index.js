const THREE = require('three')
const OrbitControls = require('three-orbit-controls')(THREE)

import ParticlePainter from './ParticlePainter'

const WIDTH = window.innerWidth
const HEIGHT = window.innerHeight
const renderer = new THREE.WebGLRenderer()
renderer.setSize(WIDTH, HEIGHT)

const camera = new THREE.PerspectiveCamera(75, WIDTH/HEIGHT, 1, 10000)
camera.position.z = 600;  

document.body.appendChild(renderer.domElement)

const particleCount = Math.pow(2, 18)
const particlePainter = new ParticlePainter(renderer, camera, particleCount)

function render(t) {
  particlePainter.render(t)
  requestAnimationFrame(render)
}

requestAnimationFrame(render)

const control = new OrbitControls(camera, renderer.domElement)



let readyInterval = null
function loadImage(src) {
  clearInterval(readyInterval)
  
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

    const nextPositions = new Float32Array(computeWidth * computeHeight * 4)
    const nextColors = new Float32Array(computeWidth * computeHeight * 4)

    for (let y = 0; y < computeHeight; y++) {
      for (let x = 0; x < computeWidth; x++) {
        const i = (y * computeHeight + x) * 4

        nextPositions[i + 0] = x - computeWidth * 0.5
        nextPositions[i + 1] = y - computeHeight * 0.5
        nextPositions[i + 2] = 0
        nextPositions[i + 3] = 1

        nextColors[i + 0] = imageData.data[i + 0] / 255
        nextColors[i + 1] = imageData.data[i + 1] / 255
        nextColors[i + 2] = imageData.data[i + 2] / 255
        nextColors[i + 3] = imageData.data[i + 3] / 255    
      }
    }

    particlePainter.setDestination({
      positions: nextPositions,
      colors: nextColors
    })
  }  
}

function ready() {
  clearInterval(readyInterval)

  const { computeWidth, computeHeight } = particlePainter
  
  const nextPositions = new Float32Array(computeWidth * computeHeight * 4)
  
  const setRandomPos = () => {
    for (let y = 0; y < computeHeight; y++) {
      for (let x = 0; x < computeWidth; x++) {
        const i = (y * computeHeight + x)
        const i4 = i * 4
        const ri = Math.random()
  
        nextPositions[i4 + 0] = Math.cos(ri * 2 * Math.PI) * 1200
        nextPositions[i4 + 1] = Math.sin(ri * 2 * Math.PI) * 1200
  
        nextPositions[i4 + 2] = 0
        nextPositions[i4 + 3] = 1
      }
    }
  
    particlePainter.setDestination({
      positions: nextPositions
    })
  }

  setRandomPos()
  // readyInterval = setInterval(() => {
  //   setRandomPos()
  // }, 5 * 1000)
}

ready()

window.addEventListener('keyup', ({keyCode}) => {
  if (keyCode == 49) {
    loadImage('./resources/styled' + Math.ceil((Math.random() * 4 + 1))  +'.jpg')
  } else if (keyCode == 50) {
    ready()
  }
})


import config from './config'
const { SOCKET_HOST, SOCKET_PORT } = config
const socket = require('socket.io-client')(SOCKET_HOST + ':' + SOCKET_PORT + '/visual')



socket.on('selected-style', (data) => {
  ready()
  console.log(data)
})

socket.on('styled-image-generated', (data) => {
  data = JSON.parse(data)

  setTimeout(() => {
    loadImage(SOCKET_HOST + ':' + SOCKET_PORT + '/styled/' + data.styledName)
  }, 1000)
})