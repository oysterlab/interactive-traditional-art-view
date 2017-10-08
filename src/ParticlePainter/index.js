
const THREE = require('three')
const OrbitControls = require('three-orbit-controls')(THREE)
const GPUComputationRenderer = require('../../lib/GPUComputationRenderer')(THREE)
const glsl = require('glslify')
const path = require('path')
const request = require('superagent')

class ParticlePainter {
    constructor(renderer, camera, particleCount) {
        this.renderer = renderer
        this.camera = camera
        this.particleCount = particleCount
        this.transferStates = {}        
    }

    init(glsls) {
        const { renderer, camera, particleCount } = this
        const { WIDTH, HEIGHT } = renderer.getSize()
        const scene = new THREE.Scene()

        const computeWidth = Math.ceil(Math.sqrt(particleCount))
        const computeHeight = computeWidth

        const boxIndexes = new Float32Array(particleCount * 2)
        for(let y = 0; y < computeHeight; y++) {
          for(let x = 0; x < computeWidth; x++) {
            const i = (y * computeWidth + x) * 2
        
            boxIndexes[i + 0] = x / computeWidth
            boxIndexes[i + 1] = y / computeHeight
          }
        }
        
        const geometry = new THREE.InstancedBufferGeometry()
        geometry.copy(new THREE.BoxBufferGeometry(1, 1, 1))
        
        geometry.addAttribute('boxIndex', new THREE.InstancedBufferAttribute(boxIndexes, 2, 1))
        
        const gpuCompute = new GPUComputationRenderer(computeWidth, computeHeight, renderer)
        const dtPosition = gpuCompute.createTexture()
        const dtDestPosition = gpuCompute.createTexture()

        const dtVelocity = gpuCompute.createTexture()

        const dtColor = gpuCompute.createTexture()
        const dtDestColor = gpuCompute.createTexture()
        
        for(let i = 0; i < dtPosition.image.data.length; i+=4) {
      
          dtPosition.image.data[i + 0] = 0 //i * 0.1 * Math.sin(i * 0.001) + ((Math.random() < 0.5) ? 1000 : - 1000)
          dtPosition.image.data[i + 1] = 0
          dtPosition.image.data[i + 2] = 0
          dtPosition.image.data[i + 3] = 1
        
          dtVelocity[i + 0] = dtVelocity[i + 1] = dtVelocity[i + 2] = 0
          dtVelocity[i + 3] = 1
          
          dtDestPosition.image.data[i + 0] = dtPosition.image.data[i + 0]
          dtDestPosition.image.data[i + 1] = dtPosition.image.data[i + 1]
          dtDestPosition.image.data[i + 2] = dtPosition.image.data[i + 2]
          dtDestPosition.image.data[i + 3] = 1

          dtColor.image.data[i + 0] = dtColor.image.data[i + 1] = dtColor.image.data[i + 2] = 1
          dtColor.image.data[i + 3] = 1

          dtDestColor.image.data[i + 0] = dtDestColor.image.data[i + 1] = dtDestColor.image.data[i + 2] = 1
          dtDestColor.image.data[i + 3] = 1
        }
        
        const dtColorLogic = glsl(path.resolve(__dirname, './shaders/dtColor.glsl'))
        const colorVariable = gpuCompute.addVariable("colorTexture", dtColorLogic, dtColor)
        colorVariable.material.uniforms.destColorTexture = { type: 't', value: null }

        const dtPositionLogic = glsl(path.resolve(__dirname, './shaders/dtPosition.glsl'))
        const positionVariable = gpuCompute.addVariable("positionTexture", dtPositionLogic, dtPosition)
        
        const velocityVariable = gpuCompute.addVariable("velocityTexture", glsls.velocity, dtVelocity)
        velocityVariable.material.uniforms.destPosTexture = { type: 't', value: null }
        velocityVariable.material.uniforms.uTime = { type: 'f', value: 0 }
        velocityVariable.material.uniforms.styleType = { type: 'i', value: 1 }

        gpuCompute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable])
        gpuCompute.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable, colorVariable])
        gpuCompute.setVariableDependencies(colorVariable, [colorVariable])

        gpuCompute.init()
        
        var material = new THREE.ShaderMaterial({
          vertexShader: glsl(path.resolve(__dirname, './shaders/vertex.glsl')),
          fragmentShader: glsl(path.resolve(__dirname, './shaders/fragment.glsl')),
          uniforms: {
            positionTexture: {
              type: 't', value: null
            },
            colorTexture: {
              type: 't', value: null
            }
          }
        });
        
        const mesh = new THREE.Mesh(geometry, material );
        
        scene.add(mesh)

        mesh.material.uniforms.colorTexture.value = dtColor
        velocityVariable.material.uniforms.destPosTexture.value = dtDestPosition
        colorVariable.material.uniforms.destColorTexture.value = dtDestColor

        this.renderer = renderer
        this.scene = scene
        this.camera = camera
        this.mesh = mesh
        this.particleCount = particleCount
        this.computeWidth = computeWidth
        this.computeHeight = computeHeight
        this.gpuCompute = gpuCompute
        this.dtPosition = dtPosition
        this.dtDestPosition = dtDestPosition
        this.dtColor = dtColor
        this.dtDestColor = dtDestColor
        this.dtVelocity = dtVelocity
        this.velocityVariable = velocityVariable
        this.positionVariable = positionVariable
        this.colorVariable = colorVariable
    }

    render(t) {
        const { renderer, 
            scene, 
            camera, 
            mesh,
            gpuCompute,
            velocityVariable,
            positionVariable,
            colorVariable } = this

        gpuCompute.compute()

        velocityVariable.material.uniforms.uTime.value = t
        mesh.material.uniforms.positionTexture.value = gpuCompute.getCurrentRenderTarget(positionVariable).texture
        mesh.material.uniforms.colorTexture.value = gpuCompute.getCurrentRenderTarget(colorVariable).texture
        
        renderer.render(scene, camera)
    }

    compile() {
        return new Promise((resolve) => {
            const dtVelocityLogic = `
                ###imports###
        
                uniform sampler2D destPosTexture;
                uniform float uTime;
                uniform int styleType;
                
                void main() {
                    vec4 nextVel = vec4(0.);
                
                    vec2 uv = gl_FragCoord.xy / resolution.xy;
                    
                    vec4 destPos = texture2D(destPosTexture, uv);
                    vec4 currPos = texture2D(positionTexture, uv);
                    vec4 currVel = texture2D(velocityTexture, uv);
                    vec4 currColor = texture2D(colorTexture, vec2(uv.x, 1. - uv.y));

                    ###logics###

                    gl_FragColor = nextVel;
                }
            `

            const velocityGlsl = this.compileShader('velocity', dtVelocityLogic)
            
            this.sendCompileRequest({
                velocity: velocityGlsl
            }).then((glsls) => {
                this.init(glsls)

                resolve()
            })
        })

    }

    sendCompileRequest(glslifys) {
        return new Promise((resolve) => {
            request
            .post('http://localhost:3000/compile-glsl')
            .send({glslifys})
            .withCredentials(false)
            .end((err, res) => {
                const glsls = JSON.parse(res.text)
                resolve(glsls)
            })
        })
    }

    compileShader(shaderType, baseGlsl) {
        const { renderer, transferStates } = this

        const importGlsl = Object.keys(transferStates).reduce((res, id, idx) => {
            const { name, glslPaths } = transferStates[id]

            const { glslPath, funcName } = glslPaths[shaderType]
            if (!glslPath) return res
            
            res += `#pragma glslify: ${funcName} = require('${glslPath}')
            `

            return res
        }, '')
        
        const logicGlsl = Object.keys(transferStates).reduce((res, id, idx) => {
            const { glslPaths } = transferStates[id]

            const { glslPath, funcName } = glslPaths[shaderType]
            if (!glslPath) return res

            let glslChunk = ` nextVel = ${funcName}(currPos, destPos, currVel, currColor, uTime);`
            glslChunk = (idx == 0) ? 
                `if (styleType == ${id}) {
                    ${glslChunk} 
                } ` : 
                `else if (styleType == ${id}) {
                    ${glslChunk} 
                }`
                
            return `${res}${glslChunk}`
        }, '')

        const glslStr = baseGlsl
            .replace('###imports###', importGlsl)
            .replace('###logics###', logicGlsl)
        
        return glslStr
    }

    addTransforState(transferState) {
     const { transferStates } = this
     const { name, state, glslPaths } = transferState

     const id = Object.keys(transferStates).length
    
     const glslTypes = Object.keys(glslPaths)
     
     const glslPaths_ = glslTypes.reduce((res, glslType, idx) => {
        const funcName = name + '_' + glslType + '_' + Math.round(Math.random() * 1000) + '_' + idx
        const glslPath = '.' + glslPaths[glslType]

        res[glslType] = {
            funcName,
            glslPath
        }
        return res
     }, {})

     transferStates[id] = {
         id,
         name,
         state,
         glslPaths: glslPaths_,
     }
    }

    setDestination({ positions, colors }) {
        const { dtDestPosition, dtDestColor,  
                computeWidth, computeHeight,
                imageData,
                colorVariable, velocityVariable, gpuCompute } = this

        for (let y = 0; y < computeHeight; y++) {
            for (let x = 0; x < computeWidth; x++) {
                const i = (y * computeWidth + x) * 4
                
                if (positions) {
                    dtDestPosition.image.data[i + 0] = positions[i + 0]
                    dtDestPosition.image.data[i + 1] = positions[i + 1]
                    dtDestPosition.image.data[i + 2] = positions[i + 2]
                    dtDestPosition.image.data[i + 3] = positions[i + 3]
                }

                if (colors) {
                    dtDestColor.image.data[i + 0] = colors[i + 0]
                    dtDestColor.image.data[i + 1] = colors[i + 1]
                    dtDestColor.image.data[i + 2] = colors[i + 2]  
                    dtDestColor.image.data[i + 3] = 1
                }
            }
        }

        dtDestColor.needsUpdate = true
        colorVariable.material.uniforms.destColorTexture.value = dtDestColor

        dtDestPosition.needsUpdate = true
        velocityVariable.material.uniforms.destPosTexture.value = dtDestPosition
    }

    toState(stateName, imageData) {
        const { transferStates, velocityVariable } = this

        const ids = Object.keys(transferStates)

        let id = -1
        let func = function() {}
        for(let i = 0; i < ids.length; i++) {
            const { name, state } = transferStates[ids[i]]

            if (stateName == name) {
                id = ids[i]
                func = state
                break
            }
        }

        const { nextPositions, nextColors } = func(imageData, this)

        this.setDestination({
            positions: nextPositions,
            colors: nextColors
        })

        velocityVariable.material.uniforms.styleType.value = id
    }
}

export default ParticlePainter