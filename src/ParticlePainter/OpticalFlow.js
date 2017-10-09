const THREE = require('three')
const oflow = require('../../lib/oflow')

class OpticalFlow {
    constructor() {
        var flow = new oflow.WebCamFlow();
        
        const WIDTH = 512
        const HEIGHT = 512
        const canvas = document.createElement('canvas')
        canvas.width = WIDTH
        canvas.height = HEIGHT
        //document.body.appendChild(canvas)
        const context = canvas.getContext('2d')
        
        const colCount = parseInt(640 / 17)
        const rowCount = parseInt(480 / 17)
        
        const xInterval = WIDTH / colCount
        const yInterval = HEIGHT / rowCount
        
        let maxX = 17 * 2
        let maxY = 17 * 2
        
        const flowCanvas = document.createElement('canvas')
        flowCanvas.width = colCount
        flowCanvas.height = rowCount
        const flowContext = flowCanvas.getContext('2d')
        let flowData = flowContext.createImageData(colCount, rowCount)
        
        flow.onCalculated((direction) => {
          const { zones } = direction
          
          zones.forEach((zone, i) => {
            const i4 = i * 4
        
            flowData.data[i4 + 0] = 0;//177 + ((zone.u / 17) - 0.5) * 2 * 177
            flowData.data[i4 + 1] = 127;//177 + ((zone.v / 17) - 0.5) * 2 * 177
            flowData.data[i4 + 2] = 0
            flowData.data[i4 + 3] = 255
          });
        
          flowContext.putImageData(flowData, 0, 0)
          context.drawImage(flowCanvas, 0, 0, colCount, rowCount, 0, 0, WIDTH, HEIGHT)
        
          this.flowTexture = new THREE.Texture(canvas)
        });

        this.flowTexture = null
        this.flow = flow
    }

    getTexture() {
        if (this.flowTexture) this.flowTexture.needsUpdate = true
        return this.flowTexture
    }

    start() {
        const { flow } = this
        flow.startCapture();        
    }
}

export default OpticalFlow