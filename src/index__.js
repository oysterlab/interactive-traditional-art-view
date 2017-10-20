

const WIDTH = window.innerWidth
const HEIGHT = window.innerHeight

const canvas = document.createElement('canvas')
canvas.width = WIDTH
canvas.height = HEIGHT
document.body.appendChild(canvas)
const context = canvas.getContext('2d')


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
    context.fillRect(0, 0, WIDTH, HEIGHT)
    
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


const polygonPoints = genDepthPolygon(1000, WIDTH, HEIGHT, 300)
console.log(polygonPoints)

function render() {
    context.fillStyle = '#000'
    context.fillRect(0, 0, WIDTH, HEIGHT)
    
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

    requestAnimationFrame(render)
}

requestAnimationFrame(render)