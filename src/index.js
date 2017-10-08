const THREE = require('three')
const OrbitControls = require('three-orbit-controls')(THREE)
const path = require('path')
const oflow = require('../lib/oflow')


// var flow = new oflow.WebCamFlow();

// const WIDTH = 640
// const HEIGHT = 480
// const canvas = document.createElement('canvas')
// canvas.width = WIDTH
// canvas.height = HEIGHT
// document.body.appendChild(canvas)
// const context = canvas.getContext('2d')

// let flows = null

// let maxX = 17 * 2
// let maxY = 17 * 2

// flow.onCalculated(function (direction) {
//   const { zones } = direction
  
//   if (!flows) {
//     flows = new Float32Array(zones.length * 4)
//   }

//   zones.forEach((zone, i) => {
//     const i4 = i * 4

//     flows[i4 + 0] = zone.u / 17
//     flows[i4 + 1] = zone.v / 17
//     flows[i4 + 2] = 0
//     flows[i4 + 3] = 1
//   });
// });

// flow.startCapture();

// function render() {
//   context.fillStyle = '#000'
//   context.fillRect(0, 0, WIDTH, HEIGHT)
  
//   if (flows) {
//     const colCount = parseInt(640 / 17)
//     const rowCount = parseInt(480 / 17)

//     const xInterval = WIDTH / colCount
//     const yInterval = HEIGHT / rowCount

//     context.strokeStyle = '#ffffff'
//     for (let y = 0; y < rowCount; y++) {
//       for (let x = 0; x < colCount; x++) {
//         const i = (y * colCount + x) * 4
//         const u = flows[i + 0]
//         const v = flows[i + 1]

//         context.beginPath()
//         const fromX = WIDTH - x * xInterval + xInterval * 0.5
//         const fromY = y * yInterval + yInterval * 0.5
//         const toX = fromX - u * xInterval
//         const toY = fromY + v * yInterval

//         // context.fillStyle = `rgb(${Math.round(u * 255)}, ${Math.round(v * 255)}, 255)`
//         // context.fillRect(fromX, fromY, 4, 4)

//         context.moveTo(fromX, fromY)
//         context.lineTo(toX, toY)
//         context.stroke()        
//       }
//     }

//   }

//   requestAnimationFrame(render)
// }

// requestAnimationFrame(render)

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



// socket

import config from './config'
const { SOCKET_HOST, SOCKET_PORT } = config
const socket = require('socket.io-client')(SOCKET_HOST + ':' + SOCKET_PORT + '/visual')

socket.on('selected-style', (dataStr) => {
  const { styleId } = JSON.parse(dataStr)

  if(styleId == 0) {
    particlePainter.toState('starryNightReady') 
  } else {
    particlePainter.toState('commonReady')  
  }
})

socket.on('result-generated', (dataStr) => {
  const { styleId, resultSrc } = JSON.parse(dataStr)
  const imgSrc = `${SOCKET_HOST}:${SOCKET_PORT}${resultSrc}`

  if(styleId == 0) {
    setTimeout(() => {
      loadImage(imgSrc).then((imageData) => {
        particlePainter.toState('starryNightShow', imageData)
      })
    }, 1000)
  } else {
    setTimeout(() => {
      loadImage(imgSrc).then((imageData) => {
        particlePainter.toState('commonShow', imageData)
      })
    }, 1000)    
  }
})

socket.on('selected-result', (dataStr) => {
  const { styleId, resultSrc } = JSON.parse(dataStr)
  const imgSrc = `${SOCKET_HOST}:${SOCKET_PORT}${resultSrc}`

  if(styleId == 0) {
    particlePainter.toState('starryNightReady') 
    setTimeout(() => {
      loadImage(imgSrc).then((imageData) => {
        particlePainter.toState('starryNightShow', imageData)
      })
    }, 5000)
  } else {
    particlePainter.toState('commonReady') 
    setTimeout(() => {
      loadImage(imgSrc).then((imageData) => {
        particlePainter.toState('commonShow', imageData)
      })
    }, 5000)    
  }
})