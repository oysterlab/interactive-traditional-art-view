const THREE = require('three')
const path = require('path')
const TWEEN = require('es6-tween')
TWEEN.autoPlay(true)


function genDepthPolygon(polygonCount, width, height, minLen) {
  const points = []
  
  for (let i = 0; i < polygonCount; i++) {
      points.push({
          x: width * 0.5 + Math.cos(Math.random() * Math.PI * 2) * width * 0.5,
          y: height * 0.5 + Math.sin(Math.random() * Math.PI * 2) * height * 0.5
      })
  }
  
  const polygonPoints = []
  points.forEach((po, i) => {
      
      const nears = [
          { idx: -1, len: 1000000 },
          { idx: -1, len: 1000000 },
          { idx: -1, len: 1000000 },
          { idx: -1, len: 1000000 },
          { idx: -1, len: 1000000 },
          { idx: -1, len: 1000000 },
          { idx: -1, len: 1000000 },
          { idx: -1, len: 1000000 },
       ]
  
      points.forEach((pc, j) => {
          if (i != j) {
              const len = Math.sqrt(Math.pow(po.x - pc.x, 2) + Math.pow(po.y - pc.y, 2)) 
              
              nears.sort((a, b) => a.len < b.len)
  
              if (nears[0].len > len && len > minLen) {
                  nears[0].len = len
                  nears[0].idx = j
                  nears[0].x = points[j].x
                  nears[0].y = points[j].y
              }
          }
     })
  
      const color = `rgb(${parseInt(Math.random() * 255)},${parseInt(Math.random() * 255)},${parseInt(Math.random() * 255)})`
      const result = nears.slice()

      result.color = color
      polygonPoints.push(result)
  })

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')

  context.fillStyle = '#000'
  context.fillRect(0, 0, width, height)
  
  polygonPoints.forEach((ps) => {
      context.fillStyle = ps.color

      context.beginPath()
      const p0 = ps[0]
      context.moveTo(p0.x, p0.y)
      for (let i = 1; i < ps.length; i++) {
          const p = ps[i]
          context.lineTo(p.x, p.y)
      }
      context.moveTo(p0.x, p0.y)
      context.closePath()
      context.fill()        
  })

  return context.getImageData(0, 0, width, height)
}

const Ready = {
    name: 'udineReady',
    state: function(particlePainter, img, imageData) {
        const { computeWidth, computeHeight } = particlePainter
        particlePainter.mesh.geometry.copy(new THREE.BoxBufferGeometry(1, 1, 2))
        const nextPositions = new Float32Array(computeWidth * computeHeight * 4)

        for (let y = 0; y < computeHeight; y++) {
            for (let x = 0; x < computeWidth; x++) {
            const i = (y * computeHeight + x) * 4

            nextPositions[i + 0] = x
            nextPositions[i + 1] = y
            nextPositions[i + 2] = 1000
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
           }, 2000)
          .start()
    
          cameraTwin.position.stop()
          cameraTwin.position
          .to({
            x: 0,
            y: 0,
            z: 1400 }, 4000)
          .start()
          .on('complete', () => {
            resolve()
          })
        })
      }    
}

const Show = {
    name: 'udineShow',
    state: function(particlePainter, img, imageData) {
      const { computeWidth, computeHeight } = particlePainter
      const nextPositions = new Float32Array(computeWidth * computeHeight * 4)
      const nextColors = new Float32Array(computeWidth * computeHeight * 4)
      particlePainter.mesh.geometry.copy(new THREE.BoxBufferGeometry(1, 1, 20))
     
      particlePainter.styleMesh.visible = false
      const lumi = [0.2126, 0.7152, 0.0722]
      
      const depthPolygon = genDepthPolygon(1000, computeWidth, computeHeight, 20)
  
      for (let y = 0; y < computeHeight; y++) {
        for (let x = 0; x < computeWidth; x++) {
          const i = (y * computeHeight + x) * 4
  
          const r = imageData.data[i + 0] / 255
          const g = imageData.data[i + 1] / 255
          const b = imageData.data[i + 2] / 255
  
          const l = r * lumi[0] + g * lumi[1] + b * lumi[2]
  
          nextPositions[i + 0] = x - computeWidth * 0.5
          nextPositions[i + 1] = y - computeHeight * 0.5
          nextPositions[i + 2] = Math.pow((depthPolygon.data[i + 1] / 255.), 1) * 20
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

      JSON.stringify(camera.ro)
      undefined
      JSON.stringify(camera.rotation)
        return new Promise((resolve) => {
          cameraTwin.position.stop()
          cameraTwin.position
          .to(
            {x: -314.2257685973483,
             y: 20.85640151282336,
             z: 403.99215919660196},
          2000)
          .start();

          cameraTwin.rotation.stop()
          cameraTwin.rotation
          .to({
            x: -7.409642105711355e-17,
            y: -0.5981349214727641,
            z: -4.1723855967760426e-17
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