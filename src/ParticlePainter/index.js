
const THREE = require('three')
const OrbitControls = require('three-orbit-controls')(THREE)
const GPUComputationRenderer = require('../../lib/GPUComputationRenderer')(THREE)
const glsl = require('glslify')
const path = require('path')
const request = require('superagent')

import config from '../config'
const { SOCKET_HOST, SOCKET_PORT } = config

import OpticalFlow from './OpticalFlow'

class ParticlePainter {
    constructor(renderer, camera, particleCount) {
        this.renderer = renderer
        this.camera = camera
        this.particleCount = particleCount
        this.transferStates = {}
        
        const opticalFlow = new OpticalFlow()
        opticalFlow.start()
        
        this.opticalFlow = opticalFlow
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

            dtPosition.image.data[i + 0] = (Math.random() - 0.5) * 512 //i * 0.1 * Math.sin(i * 0.001) + ((Math.random() < 0.5) ? 1000 : - 1000)
            dtPosition.image.data[i + 1] = (Math.random() - 0.5) * 512
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
        velocityVariable.material.uniforms.flowTexture = { type: 't', value: null }        
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
        
        const mesh = new THREE.Mesh(geometry, material);

        const styleGeometry = new THREE.PlaneGeometry(computeWidth, computeHeight)
        const styleTexture = null;
        const styleMaterial = new THREE.MeshBasicMaterial({map: null});
        var styleMesh = new THREE.Mesh(styleGeometry, styleMaterial);
        styleMesh.visible = false
        styleMesh.material.transparent = true
        scene.add(styleMesh)

        scene.add(mesh)

        mesh.material.uniforms.colorTexture.value = dtColor
        velocityVariable.material.uniforms.destPosTexture.value = dtDestPosition
        colorVariable.material.uniforms.destColorTexture.value = dtDestColor

        this.renderer = renderer
        this.scene = scene
        this.camera = camera
        this.styleMesh = styleMesh
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
        velocityVariable.material.uniforms.flowTexture.value = this.opticalFlow.getTexture()

        mesh.material.uniforms.positionTexture.value = gpuCompute.getCurrentRenderTarget(positionVariable).texture
        mesh.material.uniforms.colorTexture.value = gpuCompute.getCurrentRenderTarget(colorVariable).texture
        
        renderer.render(scene, camera)
    }

    compile() {
        return new Promise((resolve) => {
            const dtVelocityLogic = `
                ###imports###
            
                uniform sampler2D flowTexture;
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
                    vec2 flow = (texture2D(flowTexture, vec2(1. - uv.x, uv.y)).xy - 0.5) * 2.;
                    
                    ###logics###

                    gl_FragColor = nextVel;
                }
            `

            const velocityGlsl = this.compileShader('velocity', dtVelocityLogic)
            
            this.sendCompileRequest({
                velocity: velocityGlsl
            }, true).then((glsls) => {
                this.init(glsls)

                resolve()
            })
        })

    }

    sendCompileRequest(glslifys, build) {
        return new Promise((resolve) => {

            if (build) {
                resolve({"velocity":"#define GLSLIFY 1\n\n                //\n// Description : Array and textureless GLSL 2D/3D/4D simplex\n//               noise functions.\n//      Author : Ian McEwan, Ashima Arts.\n//  Maintainer : ijm\n//     Lastmod : 20110822 (ijm)\n//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.\n//               Distributed under the MIT License. See LICENSE file.\n//               https://github.com/ashima/webgl-noise\n//\n\nvec3 mod289_6(vec3 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 mod289_6(vec4 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 permute_6(vec4 x) {\n     return mod289_6(((x*34.0)+1.0)*x);\n}\n\nvec4 taylorInvSqrt_6(vec4 r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nfloat snoise_6(vec3 v)\n  {\n  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;\n  const vec4  D_6 = vec4(0.0, 0.5, 1.0, 2.0);\n\n// First corner\n  vec3 i  = floor(v + dot(v, C.yyy) );\n  vec3 x0 =   v - i + dot(i, C.xxx) ;\n\n// Other corners\n  vec3 g_6 = step(x0.yzx, x0.xyz);\n  vec3 l = 1.0 - g_6;\n  vec3 i1 = min( g_6.xyz, l.zxy );\n  vec3 i2 = max( g_6.xyz, l.zxy );\n\n  //   x0 = x0 - 0.0 + 0.0 * C.xxx;\n  //   x1 = x0 - i1  + 1.0 * C.xxx;\n  //   x2 = x0 - i2  + 2.0 * C.xxx;\n  //   x3 = x0 - 1.0 + 3.0 * C.xxx;\n  vec3 x1 = x0 - i1 + C.xxx;\n  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y\n  vec3 x3 = x0 - D_6.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y\n\n// Permutations\n  i = mod289_6(i);\n  vec4 p = permute_6( permute_6( permute_6(\n             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))\n           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))\n           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));\n\n// Gradients: 7x7 points over a square, mapped onto an octahedron.\n// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)\n  float n_ = 0.142857142857; // 1.0/7.0\n  vec3  ns = n_ * D_6.wyz - D_6.xzx;\n\n  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)\n\n  vec4 x_ = floor(j * ns.z);\n  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)\n\n  vec4 x = x_ *ns.x + ns.yyyy;\n  vec4 y = y_ *ns.x + ns.yyyy;\n  vec4 h = 1.0 - abs(x) - abs(y);\n\n  vec4 b0 = vec4( x.xy, y.xy );\n  vec4 b1 = vec4( x.zw, y.zw );\n\n  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;\n  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;\n  vec4 s0 = floor(b0)*2.0 + 1.0;\n  vec4 s1 = floor(b1)*2.0 + 1.0;\n  vec4 sh = -step(h, vec4(0.0));\n\n  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;\n  vec4 a1_6 = b1.xzyw + s1.xzyw*sh.zzww ;\n\n  vec3 p0_6 = vec3(a0.xy,h.x);\n  vec3 p1 = vec3(a0.zw,h.y);\n  vec3 p2 = vec3(a1_6.xy,h.z);\n  vec3 p3 = vec3(a1_6.zw,h.w);\n\n//Normalise gradients\n  vec4 norm = taylorInvSqrt_6(vec4(dot(p0_6,p0_6), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n  p0_6 *= norm.x;\n  p1 *= norm.y;\n  p2 *= norm.z;\n  p3 *= norm.w;\n\n// Mix final noise value\n  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\n  m = m * m;\n  return 42.0 * dot( m*m, vec4( dot(p0_6,x0), dot(p1,x1),\n                                dot(p2,x2), dot(p3,x3) ) );\n  }\n\nvec3 snoiseVec3_1( vec3 x ){\n\n  float s  = snoise_6(vec3( x ));\n  float s1 = snoise_6(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));\n  float s2 = snoise_6(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));\n  vec3 c = vec3( s , s1 , s2 );\n  return c;\n\n}\n\nvec3 curlNoise_1( vec3 p ){\n  \n  const float e = .1;\n  vec3 dx = vec3( e   , 0.0 , 0.0 );\n  vec3 dy = vec3( 0.0 , e   , 0.0 );\n  vec3 dz = vec3( 0.0 , 0.0 , e   );\n\n  vec3 p_x0 = snoiseVec3_1( p - dx );\n  vec3 p_x1 = snoiseVec3_1( p + dx );\n  vec3 p_y0 = snoiseVec3_1( p - dy );\n  vec3 p_y1 = snoiseVec3_1( p + dy );\n  vec3 p_z0 = snoiseVec3_1( p - dz );\n  vec3 p_z1 = snoiseVec3_1( p + dz );\n\n  float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;\n  float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;\n  float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;\n\n  const float divisor = 1.0 / ( 2.0 * e );\n  return normalize( vec3( x , y , z ) * divisor );\n\n}\n\nvec4 starryNightShowVelocity_5(vec4 currPos, vec4 destPos, vec4 vel, vec4 currColor, float uTime, vec2 flow) {\n\n    float t = (sin(uTime * 0.00001) * cos(uTime * 0.001)) * 0.8 + 0.2;\n    vec4 vel_ = vec4(curlNoise_1(vec3(currPos.xyz * 0.006)), t);\n\n    float l = length(destPos - currPos) * 0.05;\n   \n    vec4 diff = (destPos - currPos) * 0.01;\n\n    diff.xyz += vel_.xyz;\n\n    vel.xyz *= 0.1;\n    vel.xyz += diff.xyz; \n\n    return vel;\n}\n\n            \nvec4 starryNightShowVelocity_2(vec4 currPos, vec4 destPos, vec4 vel, vec4 currColor, float uTime, vec2 flow) {\n\n    float t = (sin(uTime * 0.0001) * cos(uTime * 0.001)) * 0.8 + 0.2;\n\n    vec3 lumi = vec3(0.3126, 0.6652, 0.0222);\n\n    float l = currColor.r * lumi.r + currColor.g * lumi.g + currColor.b * lumi.b;\n\n    float m = pow((1. - l), 0.2) * 0.1;\n\n    vec4 diff = (destPos - currPos) * m;// * pow((1. - l), 1.4);\n\n    vel.xyz *= 0.1;    \n    vel.xyz += diff.xyz; \n\n    float z = (destPos - currPos).z;\n\n    if ((l > 0.76 && z < 0.0001) && length(flow) > 0.5 ){\n        vel.xy += pow(flow * 2., vec2(2.)).xy;\n        vel.z += 1000. * length(flow); //pow(length(flow) * 4., 2.);                        \n    }\n\n    return vel;\n}\n\n            //\n// Description : Array and textureless GLSL 2D/3D/4D simplex\n//               noise functions.\n//      Author : Ian McEwan, Ashima Arts.\n//  Maintainer : ijm\n//     Lastmod : 20110822 (ijm)\n//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.\n//               Distributed under the MIT License. See LICENSE file.\n//               https://github.com/ashima/webgl-noise\n//\n\nvec3 mod289_3(vec3 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 mod289_3(vec4 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 permute_3(vec4 x) {\n     return mod289_3(((x*34.0)+1.0)*x);\n}\n\nvec4 taylorInvSqrt_3(vec4 r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nfloat snoise_3(vec3 v)\n  {\n  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;\n  const vec4  D_3 = vec4(0.0, 0.5, 1.0, 2.0);\n\n// First corner\n  vec3 i  = floor(v + dot(v, C.yyy) );\n  vec3 x0 =   v - i + dot(i, C.xxx) ;\n\n// Other corners\n  vec3 g_3 = step(x0.yzx, x0.xyz);\n  vec3 l = 1.0 - g_3;\n  vec3 i1 = min( g_3.xyz, l.zxy );\n  vec3 i2 = max( g_3.xyz, l.zxy );\n\n  //   x0 = x0 - 0.0 + 0.0 * C.xxx;\n  //   x1 = x0 - i1  + 1.0 * C.xxx;\n  //   x2 = x0 - i2  + 2.0 * C.xxx;\n  //   x3 = x0 - 1.0 + 3.0 * C.xxx;\n  vec3 x1 = x0 - i1 + C.xxx;\n  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y\n  vec3 x3 = x0 - D_3.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y\n\n// Permutations\n  i = mod289_3(i);\n  vec4 p = permute_3( permute_3( permute_3(\n             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))\n           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))\n           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));\n\n// Gradients: 7x7 points over a square, mapped onto an octahedron.\n// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)\n  float n_ = 0.142857142857; // 1.0/7.0\n  vec3  ns = n_ * D_3.wyz - D_3.xzx;\n\n  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)\n\n  vec4 x_ = floor(j * ns.z);\n  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)\n\n  vec4 x = x_ *ns.x + ns.yyyy;\n  vec4 y = y_ *ns.x + ns.yyyy;\n  vec4 h = 1.0 - abs(x) - abs(y);\n\n  vec4 b0 = vec4( x.xy, y.xy );\n  vec4 b1 = vec4( x.zw, y.zw );\n\n  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;\n  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;\n  vec4 s0 = floor(b0)*2.0 + 1.0;\n  vec4 s1 = floor(b1)*2.0 + 1.0;\n  vec4 sh = -step(h, vec4(0.0));\n\n  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;\n  vec4 a1_3 = b1.xzyw + s1.xzyw*sh.zzww ;\n\n  vec3 p0_3 = vec3(a0.xy,h.x);\n  vec3 p1 = vec3(a0.zw,h.y);\n  vec3 p2 = vec3(a1_3.xy,h.z);\n  vec3 p3 = vec3(a1_3.zw,h.w);\n\n//Normalise gradients\n  vec4 norm = taylorInvSqrt_3(vec4(dot(p0_3,p0_3), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n  p0_3 *= norm.x;\n  p1 *= norm.y;\n  p2 *= norm.z;\n  p3 *= norm.w;\n\n// Mix final noise value\n  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\n  m = m * m;\n  return 42.0 * dot( m*m, vec4( dot(p0_3,x0), dot(p1,x1),\n                                dot(p2,x2), dot(p3,x3) ) );\n  }\n\nvec3 snoiseVec3_5( vec3 x ){\n\n  float s  = snoise_3(vec3( x ));\n  float s1 = snoise_3(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));\n  float s2 = snoise_3(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));\n  vec3 c = vec3( s , s1 , s2 );\n  return c;\n\n}\n\nvec3 curlNoise_5( vec3 p ){\n  \n  const float e = .1;\n  vec3 dx = vec3( e   , 0.0 , 0.0 );\n  vec3 dy = vec3( 0.0 , e   , 0.0 );\n  vec3 dz = vec3( 0.0 , 0.0 , e   );\n\n  vec3 p_x0 = snoiseVec3_5( p - dx );\n  vec3 p_x1 = snoiseVec3_5( p + dx );\n  vec3 p_y0 = snoiseVec3_5( p - dy );\n  vec3 p_y1 = snoiseVec3_5( p + dy );\n  vec3 p_z0 = snoiseVec3_5( p - dz );\n  vec3 p_z1 = snoiseVec3_5( p + dz );\n\n  float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;\n  float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;\n  float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;\n\n  const float divisor = 1.0 / ( 2.0 * e );\n  return normalize( vec3( x , y , z ) * divisor );\n\n}\n\nvec4 starryNightShowVelocity_3(vec4 currPos, vec4 destPos, vec4 vel, vec4 currColor, float uTime, vec2 flow) {\n\n    float t = (sin(uTime * 0.00001) * cos(uTime * 0.001)) * 0.8 + 0.2;\n    vec4 vel_ = vec4(curlNoise_5(vec3(currPos.xyz * 0.001)), t) * .2;\n\n    float l = length(destPos - currPos) * 0.05;\n   \n    vec4 diff = (destPos - currPos) * 0.01;\n\n    diff.xyz += vel_.xyz * l;\n\n    vel.xyz *= 0.1;\n    vel.xyz += diff.xyz; \n\n    return vel;\n}\n\n            //\n// Description : Array and textureless GLSL 2D/3D/4D simplex\n//               noise functions.\n//      Author : Ian McEwan, Ashima Arts.\n//  Maintainer : ijm\n//     Lastmod : 20110822 (ijm)\n//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.\n//               Distributed under the MIT License. See LICENSE file.\n//               https://github.com/ashima/webgl-noise\n//\n\nvec3 mod289_7(vec3 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 mod289_7(vec4 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 permute_7(vec4 x) {\n     return mod289_7(((x*34.0)+1.0)*x);\n}\n\nvec4 taylorInvSqrt_7(vec4 r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nfloat snoise_7(vec3 v)\n  {\n  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;\n  const vec4  D_7 = vec4(0.0, 0.5, 1.0, 2.0);\n\n// First corner\n  vec3 i  = floor(v + dot(v, C.yyy) );\n  vec3 x0 =   v - i + dot(i, C.xxx) ;\n\n// Other corners\n  vec3 g_7 = step(x0.yzx, x0.xyz);\n  vec3 l = 1.0 - g_7;\n  vec3 i1 = min( g_7.xyz, l.zxy );\n  vec3 i2 = max( g_7.xyz, l.zxy );\n\n  //   x0 = x0 - 0.0 + 0.0 * C.xxx;\n  //   x1 = x0 - i1  + 1.0 * C.xxx;\n  //   x2 = x0 - i2  + 2.0 * C.xxx;\n  //   x3 = x0 - 1.0 + 3.0 * C.xxx;\n  vec3 x1 = x0 - i1 + C.xxx;\n  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y\n  vec3 x3 = x0 - D_7.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y\n\n// Permutations\n  i = mod289_7(i);\n  vec4 p = permute_7( permute_7( permute_7(\n             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))\n           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))\n           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));\n\n// Gradients: 7x7 points over a square, mapped onto an octahedron.\n// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)\n  float n_ = 0.142857142857; // 1.0/7.0\n  vec3  ns = n_ * D_7.wyz - D_7.xzx;\n\n  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)\n\n  vec4 x_ = floor(j * ns.z);\n  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)\n\n  vec4 x = x_ *ns.x + ns.yyyy;\n  vec4 y = y_ *ns.x + ns.yyyy;\n  vec4 h = 1.0 - abs(x) - abs(y);\n\n  vec4 b0 = vec4( x.xy, y.xy );\n  vec4 b1 = vec4( x.zw, y.zw );\n\n  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;\n  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;\n  vec4 s0 = floor(b0)*2.0 + 1.0;\n  vec4 s1 = floor(b1)*2.0 + 1.0;\n  vec4 sh = -step(h, vec4(0.0));\n\n  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;\n  vec4 a1_7 = b1.xzyw + s1.xzyw*sh.zzww ;\n\n  vec3 p0_7 = vec3(a0.xy,h.x);\n  vec3 p1 = vec3(a0.zw,h.y);\n  vec3 p2 = vec3(a1_7.xy,h.z);\n  vec3 p3 = vec3(a1_7.zw,h.w);\n\n//Normalise gradients\n  vec4 norm = taylorInvSqrt_7(vec4(dot(p0_7,p0_7), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n  p0_7 *= norm.x;\n  p1 *= norm.y;\n  p2 *= norm.z;\n  p3 *= norm.w;\n\n// Mix final noise value\n  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\n  m = m * m;\n  return 42.0 * dot( m*m, vec4( dot(p0_7,x0), dot(p1,x1),\n                                dot(p2,x2), dot(p3,x3) ) );\n  }\n\nvec3 snoiseVec3_6( vec3 x ){\n\n  float s  = snoise_7(vec3( x ));\n  float s1 = snoise_7(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));\n  float s2 = snoise_7(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));\n  vec3 c = vec3( s , s1 , s2 );\n  return c;\n\n}\n\nvec3 curlNoise_6( vec3 p ){\n  \n  const float e = .1;\n  vec3 dx = vec3( e   , 0.0 , 0.0 );\n  vec3 dy = vec3( 0.0 , e   , 0.0 );\n  vec3 dz = vec3( 0.0 , 0.0 , e   );\n\n  vec3 p_x0 = snoiseVec3_6( p - dx );\n  vec3 p_x1 = snoiseVec3_6( p + dx );\n  vec3 p_y0 = snoiseVec3_6( p - dy );\n  vec3 p_y1 = snoiseVec3_6( p + dy );\n  vec3 p_z0 = snoiseVec3_6( p - dz );\n  vec3 p_z1 = snoiseVec3_6( p + dz );\n\n  float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;\n  float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;\n  float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;\n\n  const float divisor = 1.0 / ( 2.0 * e );\n  return normalize( vec3( x , y , z ) * divisor );\n\n}\n\n// 3 1 1 \n\nvec4 commonShowVelocity_0(vec4 currPos, vec4 destPos, vec4 vel, vec4 currColor, float uTime,  vec2 flow) {\n\n    float t = (sin(uTime * 0.00001) * cos(uTime * 0.001)) * 0.8 + 0.2;\n    vec4 noise = vec4(curlNoise_6(vec3(currPos.xyz * 0.001)), t) * .05;\n\n    float m = 0.01;\n\n    vec4 diff = (destPos - currPos) * (abs(noise) + m);\n\n    vel.xyz *= 0.1;    \n    vel.xyz += diff.xyz; \n\n    flow.xy *= 2.;\n    \n    vec2 d = sin(cos(sin(flow.xy) * 2.0));\n\n    vel.x += d.x * 1.4;\n    vel.y += d.y * 0.4;\n\n    return vel;\n}\n\n            //\n// Description : Array and textureless GLSL 2D/3D/4D simplex\n//               noise functions.\n//      Author : Ian McEwan, Ashima Arts.\n//  Maintainer : ijm\n//     Lastmod : 20110822 (ijm)\n//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.\n//               Distributed under the MIT License. See LICENSE file.\n//               https://github.com/ashima/webgl-noise\n//\n\nvec3 mod289_0(vec3 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 mod289_0(vec4 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 permute_0(vec4 x) {\n     return mod289_0(((x*34.0)+1.0)*x);\n}\n\nvec4 taylorInvSqrt_0(vec4 r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nfloat snoise_0(vec3 v)\n  {\n  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;\n  const vec4  D_0 = vec4(0.0, 0.5, 1.0, 2.0);\n\n// First corner\n  vec3 i  = floor(v + dot(v, C.yyy) );\n  vec3 x0 =   v - i + dot(i, C.xxx) ;\n\n// Other corners\n  vec3 g_0 = step(x0.yzx, x0.xyz);\n  vec3 l = 1.0 - g_0;\n  vec3 i1 = min( g_0.xyz, l.zxy );\n  vec3 i2 = max( g_0.xyz, l.zxy );\n\n  //   x0 = x0 - 0.0 + 0.0 * C.xxx;\n  //   x1 = x0 - i1  + 1.0 * C.xxx;\n  //   x2 = x0 - i2  + 2.0 * C.xxx;\n  //   x3 = x0 - 1.0 + 3.0 * C.xxx;\n  vec3 x1 = x0 - i1 + C.xxx;\n  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y\n  vec3 x3 = x0 - D_0.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y\n\n// Permutations\n  i = mod289_0(i);\n  vec4 p = permute_0( permute_0( permute_0(\n             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))\n           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))\n           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));\n\n// Gradients: 7x7 points over a square, mapped onto an octahedron.\n// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)\n  float n_ = 0.142857142857; // 1.0/7.0\n  vec3  ns = n_ * D_0.wyz - D_0.xzx;\n\n  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)\n\n  vec4 x_ = floor(j * ns.z);\n  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)\n\n  vec4 x = x_ *ns.x + ns.yyyy;\n  vec4 y = y_ *ns.x + ns.yyyy;\n  vec4 h = 1.0 - abs(x) - abs(y);\n\n  vec4 b0 = vec4( x.xy, y.xy );\n  vec4 b1 = vec4( x.zw, y.zw );\n\n  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;\n  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;\n  vec4 s0 = floor(b0)*2.0 + 1.0;\n  vec4 s1 = floor(b1)*2.0 + 1.0;\n  vec4 sh = -step(h, vec4(0.0));\n\n  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;\n  vec4 a1_0 = b1.xzyw + s1.xzyw*sh.zzww ;\n\n  vec3 p0_0 = vec3(a0.xy,h.x);\n  vec3 p1 = vec3(a0.zw,h.y);\n  vec3 p2 = vec3(a1_0.xy,h.z);\n  vec3 p3 = vec3(a1_0.zw,h.w);\n\n//Normalise gradients\n  vec4 norm = taylorInvSqrt_0(vec4(dot(p0_0,p0_0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n  p0_0 *= norm.x;\n  p1 *= norm.y;\n  p2 *= norm.z;\n  p3 *= norm.w;\n\n// Mix final noise value\n  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\n  m = m * m;\n  return 42.0 * dot( m*m, vec4( dot(p0_0,x0), dot(p1,x1),\n                                dot(p2,x2), dot(p3,x3) ) );\n  }\n\nvec3 snoiseVec3_7( vec3 x ){\n\n  float s  = snoise_0(vec3( x ));\n  float s1 = snoise_0(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));\n  float s2 = snoise_0(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));\n  vec3 c = vec3( s , s1 , s2 );\n  return c;\n\n}\n\nvec3 curlNoise_7( vec3 p ){\n  \n  const float e = .1;\n  vec3 dx = vec3( e   , 0.0 , 0.0 );\n  vec3 dy = vec3( 0.0 , e   , 0.0 );\n  vec3 dz = vec3( 0.0 , 0.0 , e   );\n\n  vec3 p_x0 = snoiseVec3_7( p - dx );\n  vec3 p_x1 = snoiseVec3_7( p + dx );\n  vec3 p_y0 = snoiseVec3_7( p - dy );\n  vec3 p_y1 = snoiseVec3_7( p + dy );\n  vec3 p_z0 = snoiseVec3_7( p - dz );\n  vec3 p_z1 = snoiseVec3_7( p + dz );\n\n  float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;\n  float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;\n  float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;\n\n  const float divisor = 1.0 / ( 2.0 * e );\n  return normalize( vec3( x , y , z ) * divisor );\n\n}\n\nvec4 starryNightShowVelocity_0(vec4 currPos, vec4 destPos, vec4 vel, vec4 currColor, float uTime, vec2 flow) {\n\n    float t = (sin(uTime * 0.00001) * cos(uTime * 0.001)) * 0.8 + 0.2;\n    vec4 vel_ = vec4(curlNoise_7(vec3(currPos.xyz * 0.001)), t) * .2;\n\n    float l = length(destPos - currPos) * 0.05;\n   \n    vec4 diff = (destPos - currPos) * 0.01;\n\n    diff.xyz += vel_.xyz * l;\n\n    vel.xyz *= 0.1;\n    vel.xyz += diff.xyz; \n\n    return vel;\n}\n\n            //\n// Description : Array and textureless GLSL 2D/3D/4D simplex\n//               noise functions.\n//      Author : Ian McEwan, Ashima Arts.\n//  Maintainer : ijm\n//     Lastmod : 20110822 (ijm)\n//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.\n//               Distributed under the MIT License. See LICENSE file.\n//               https://github.com/ashima/webgl-noise\n//\n\nvec3 mod289_2(vec3 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 mod289_2(vec4 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 permute_2(vec4 x) {\n     return mod289_2(((x*34.0)+1.0)*x);\n}\n\nvec4 taylorInvSqrt_2(vec4 r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nfloat snoise_2(vec3 v)\n  {\n  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;\n  const vec4  D_2 = vec4(0.0, 0.5, 1.0, 2.0);\n\n// First corner\n  vec3 i  = floor(v + dot(v, C.yyy) );\n  vec3 x0 =   v - i + dot(i, C.xxx) ;\n\n// Other corners\n  vec3 g_2 = step(x0.yzx, x0.xyz);\n  vec3 l = 1.0 - g_2;\n  vec3 i1 = min( g_2.xyz, l.zxy );\n  vec3 i2 = max( g_2.xyz, l.zxy );\n\n  //   x0 = x0 - 0.0 + 0.0 * C.xxx;\n  //   x1 = x0 - i1  + 1.0 * C.xxx;\n  //   x2 = x0 - i2  + 2.0 * C.xxx;\n  //   x3 = x0 - 1.0 + 3.0 * C.xxx;\n  vec3 x1 = x0 - i1 + C.xxx;\n  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y\n  vec3 x3 = x0 - D_2.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y\n\n// Permutations\n  i = mod289_2(i);\n  vec4 p = permute_2( permute_2( permute_2(\n             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))\n           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))\n           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));\n\n// Gradients: 7x7 points over a square, mapped onto an octahedron.\n// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)\n  float n_ = 0.142857142857; // 1.0/7.0\n  vec3  ns = n_ * D_2.wyz - D_2.xzx;\n\n  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)\n\n  vec4 x_ = floor(j * ns.z);\n  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)\n\n  vec4 x = x_ *ns.x + ns.yyyy;\n  vec4 y = y_ *ns.x + ns.yyyy;\n  vec4 h = 1.0 - abs(x) - abs(y);\n\n  vec4 b0 = vec4( x.xy, y.xy );\n  vec4 b1 = vec4( x.zw, y.zw );\n\n  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;\n  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;\n  vec4 s0 = floor(b0)*2.0 + 1.0;\n  vec4 s1 = floor(b1)*2.0 + 1.0;\n  vec4 sh = -step(h, vec4(0.0));\n\n  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;\n  vec4 a1_2 = b1.xzyw + s1.xzyw*sh.zzww ;\n\n  vec3 p0_2 = vec3(a0.xy,h.x);\n  vec3 p1 = vec3(a0.zw,h.y);\n  vec3 p2 = vec3(a1_2.xy,h.z);\n  vec3 p3 = vec3(a1_2.zw,h.w);\n\n//Normalise gradients\n  vec4 norm = taylorInvSqrt_2(vec4(dot(p0_2,p0_2), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n  p0_2 *= norm.x;\n  p1 *= norm.y;\n  p2 *= norm.z;\n  p3 *= norm.w;\n\n// Mix final noise value\n  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\n  m = m * m;\n  return 42.0 * dot( m*m, vec4( dot(p0_2,x0), dot(p1,x1),\n                                dot(p2,x2), dot(p3,x3) ) );\n  }\n\nvec3 snoiseVec3_3( vec3 x ){\n\n  float s  = snoise_2(vec3( x ));\n  float s1 = snoise_2(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));\n  float s2 = snoise_2(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));\n  vec3 c = vec3( s , s1 , s2 );\n  return c;\n\n}\n\nvec3 curlNoise_3( vec3 p ){\n  \n  const float e = .1;\n  vec3 dx = vec3( e   , 0.0 , 0.0 );\n  vec3 dy = vec3( 0.0 , e   , 0.0 );\n  vec3 dz = vec3( 0.0 , 0.0 , e   );\n\n  vec3 p_x0 = snoiseVec3_3( p - dx );\n  vec3 p_x1 = snoiseVec3_3( p + dx );\n  vec3 p_y0 = snoiseVec3_3( p - dy );\n  vec3 p_y1 = snoiseVec3_3( p + dy );\n  vec3 p_z0 = snoiseVec3_3( p - dz );\n  vec3 p_z1 = snoiseVec3_3( p + dz );\n\n  float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;\n  float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;\n  float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;\n\n  const float divisor = 1.0 / ( 2.0 * e );\n  return normalize( vec3( x , y , z ) * divisor );\n\n}\n\nvec4 commonShowVelocity_1(vec4 currPos, vec4 destPos, vec4 vel, vec4 currColor, float uTime,  vec2 flow) {\n\n    float t = (sin(uTime * 0.00001) * cos(uTime * 0.001)) * 0.8 + 0.2;\n    vec4 noise = vec4(curlNoise_3(vec3(currPos.xyz * 0.001)), t) * .05;\n\n    float m = 0.01;\n\n    vec4 diff = (destPos - currPos) * (abs(noise) + m);\n\n    vel.xyz *= 0.1;    \n    vel.xyz += diff.xyz; \n\n    vel.xyz += pow(flow * 2., vec2(5.)).xyy;\n\n    return vel;\n}\n\n            //\n// Description : Array and textureless GLSL 2D/3D/4D simplex\n//               noise functions.\n//      Author : Ian McEwan, Ashima Arts.\n//  Maintainer : ijm\n//     Lastmod : 20110822 (ijm)\n//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.\n//               Distributed under the MIT License. See LICENSE file.\n//               https://github.com/ashima/webgl-noise\n//\n\nvec3 mod289_8(vec3 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 mod289_8(vec4 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 permute_8(vec4 x) {\n     return mod289_8(((x*34.0)+1.0)*x);\n}\n\nvec4 taylorInvSqrt_8(vec4 r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nfloat snoise_8(vec3 v)\n  {\n  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;\n  const vec4  D_8 = vec4(0.0, 0.5, 1.0, 2.0);\n\n// First corner\n  vec3 i  = floor(v + dot(v, C.yyy) );\n  vec3 x0 =   v - i + dot(i, C.xxx) ;\n\n// Other corners\n  vec3 g_8 = step(x0.yzx, x0.xyz);\n  vec3 l = 1.0 - g_8;\n  vec3 i1 = min( g_8.xyz, l.zxy );\n  vec3 i2 = max( g_8.xyz, l.zxy );\n\n  //   x0 = x0 - 0.0 + 0.0 * C.xxx;\n  //   x1 = x0 - i1  + 1.0 * C.xxx;\n  //   x2 = x0 - i2  + 2.0 * C.xxx;\n  //   x3 = x0 - 1.0 + 3.0 * C.xxx;\n  vec3 x1 = x0 - i1 + C.xxx;\n  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y\n  vec3 x3 = x0 - D_8.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y\n\n// Permutations\n  i = mod289_8(i);\n  vec4 p = permute_8( permute_8( permute_8(\n             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))\n           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))\n           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));\n\n// Gradients: 7x7 points over a square, mapped onto an octahedron.\n// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)\n  float n_ = 0.142857142857; // 1.0/7.0\n  vec3  ns = n_ * D_8.wyz - D_8.xzx;\n\n  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)\n\n  vec4 x_ = floor(j * ns.z);\n  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)\n\n  vec4 x = x_ *ns.x + ns.yyyy;\n  vec4 y = y_ *ns.x + ns.yyyy;\n  vec4 h = 1.0 - abs(x) - abs(y);\n\n  vec4 b0 = vec4( x.xy, y.xy );\n  vec4 b1 = vec4( x.zw, y.zw );\n\n  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;\n  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;\n  vec4 s0 = floor(b0)*2.0 + 1.0;\n  vec4 s1 = floor(b1)*2.0 + 1.0;\n  vec4 sh = -step(h, vec4(0.0));\n\n  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;\n  vec4 a1_8 = b1.xzyw + s1.xzyw*sh.zzww ;\n\n  vec3 p0_8 = vec3(a0.xy,h.x);\n  vec3 p1 = vec3(a0.zw,h.y);\n  vec3 p2 = vec3(a1_8.xy,h.z);\n  vec3 p3 = vec3(a1_8.zw,h.w);\n\n//Normalise gradients\n  vec4 norm = taylorInvSqrt_8(vec4(dot(p0_8,p0_8), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n  p0_8 *= norm.x;\n  p1 *= norm.y;\n  p2 *= norm.z;\n  p3 *= norm.w;\n\n// Mix final noise value\n  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\n  m = m * m;\n  return 42.0 * dot( m*m, vec4( dot(p0_8,x0), dot(p1,x1),\n                                dot(p2,x2), dot(p3,x3) ) );\n  }\n\nvec3 snoiseVec3_0( vec3 x ){\n\n  float s  = snoise_8(vec3( x ));\n  float s1 = snoise_8(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));\n  float s2 = snoise_8(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));\n  vec3 c = vec3( s , s1 , s2 );\n  return c;\n\n}\n\nvec3 curlNoise_0( vec3 p ){\n  \n  const float e = .1;\n  vec3 dx = vec3( e   , 0.0 , 0.0 );\n  vec3 dy = vec3( 0.0 , e   , 0.0 );\n  vec3 dz = vec3( 0.0 , 0.0 , e   );\n\n  vec3 p_x0 = snoiseVec3_0( p - dx );\n  vec3 p_x1 = snoiseVec3_0( p + dx );\n  vec3 p_y0 = snoiseVec3_0( p - dy );\n  vec3 p_y1 = snoiseVec3_0( p + dy );\n  vec3 p_z0 = snoiseVec3_0( p - dz );\n  vec3 p_z1 = snoiseVec3_0( p + dz );\n\n  float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;\n  float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;\n  float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;\n\n  const float divisor = 1.0 / ( 2.0 * e );\n  return normalize( vec3( x , y , z ) * divisor );\n\n}\n\nvec4 starryNightShowVelocity_4(vec4 currPos, vec4 destPos, vec4 vel, vec4 currColor, float uTime, vec2 flow) {\n\n    float t = (sin(uTime * 0.0001) * cos(uTime * 0.0001)) * 0.8 + 0.2;\n    vec4 vel_ = vec4(curlNoise_0(vec3(vec2(currPos.xy * 0.004), t)), t) * .2;\n\n    float l = length(destPos - currPos) * 0.05;\n   \n    vec4 diff = (destPos - currPos) * 0.01;\n\n    diff.xyz += vel_.xyz * l;\n\n    vel.xyz *= 0.1;\n    vel.xyz += diff.xyz; \n\n    return vel;\n}\n\n            //\n// Description : Array and textureless GLSL 2D/3D/4D simplex\n//               noise functions.\n//      Author : Ian McEwan, Ashima Arts.\n//  Maintainer : ijm\n//     Lastmod : 20110822 (ijm)\n//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.\n//               Distributed under the MIT License. See LICENSE file.\n//               https://github.com/ashima/webgl-noise\n//\n\nvec3 mod289_5(vec3 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 mod289_5(vec4 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 permute_5(vec4 x) {\n     return mod289_5(((x*34.0)+1.0)*x);\n}\n\nvec4 taylorInvSqrt_5(vec4 r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nfloat snoise_5(vec3 v)\n  {\n  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;\n  const vec4  D_5 = vec4(0.0, 0.5, 1.0, 2.0);\n\n// First corner\n  vec3 i  = floor(v + dot(v, C.yyy) );\n  vec3 x0 =   v - i + dot(i, C.xxx) ;\n\n// Other corners\n  vec3 g_5 = step(x0.yzx, x0.xyz);\n  vec3 l = 1.0 - g_5;\n  vec3 i1 = min( g_5.xyz, l.zxy );\n  vec3 i2 = max( g_5.xyz, l.zxy );\n\n  //   x0 = x0 - 0.0 + 0.0 * C.xxx;\n  //   x1 = x0 - i1  + 1.0 * C.xxx;\n  //   x2 = x0 - i2  + 2.0 * C.xxx;\n  //   x3 = x0 - 1.0 + 3.0 * C.xxx;\n  vec3 x1 = x0 - i1 + C.xxx;\n  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y\n  vec3 x3 = x0 - D_5.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y\n\n// Permutations\n  i = mod289_5(i);\n  vec4 p = permute_5( permute_5( permute_5(\n             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))\n           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))\n           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));\n\n// Gradients: 7x7 points over a square, mapped onto an octahedron.\n// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)\n  float n_ = 0.142857142857; // 1.0/7.0\n  vec3  ns = n_ * D_5.wyz - D_5.xzx;\n\n  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)\n\n  vec4 x_ = floor(j * ns.z);\n  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)\n\n  vec4 x = x_ *ns.x + ns.yyyy;\n  vec4 y = y_ *ns.x + ns.yyyy;\n  vec4 h = 1.0 - abs(x) - abs(y);\n\n  vec4 b0 = vec4( x.xy, y.xy );\n  vec4 b1 = vec4( x.zw, y.zw );\n\n  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;\n  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;\n  vec4 s0 = floor(b0)*2.0 + 1.0;\n  vec4 s1 = floor(b1)*2.0 + 1.0;\n  vec4 sh = -step(h, vec4(0.0));\n\n  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;\n  vec4 a1_5 = b1.xzyw + s1.xzyw*sh.zzww ;\n\n  vec3 p0_5 = vec3(a0.xy,h.x);\n  vec3 p1 = vec3(a0.zw,h.y);\n  vec3 p2 = vec3(a1_5.xy,h.z);\n  vec3 p3 = vec3(a1_5.zw,h.w);\n\n//Normalise gradients\n  vec4 norm = taylorInvSqrt_5(vec4(dot(p0_5,p0_5), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n  p0_5 *= norm.x;\n  p1 *= norm.y;\n  p2 *= norm.z;\n  p3 *= norm.w;\n\n// Mix final noise value\n  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\n  m = m * m;\n  return 42.0 * dot( m*m, vec4( dot(p0_5,x0), dot(p1,x1),\n                                dot(p2,x2), dot(p3,x3) ) );\n  }\n\nvec3 snoiseVec3_8( vec3 x ){\n\n  float s  = snoise_5(vec3( x ));\n  float s1 = snoise_5(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));\n  float s2 = snoise_5(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));\n  vec3 c = vec3( s , s1 , s2 );\n  return c;\n\n}\n\nvec3 curlNoise_8( vec3 p ){\n  \n  const float e = .1;\n  vec3 dx = vec3( e   , 0.0 , 0.0 );\n  vec3 dy = vec3( 0.0 , e   , 0.0 );\n  vec3 dz = vec3( 0.0 , 0.0 , e   );\n\n  vec3 p_x0 = snoiseVec3_8( p - dx );\n  vec3 p_x1 = snoiseVec3_8( p + dx );\n  vec3 p_y0 = snoiseVec3_8( p - dy );\n  vec3 p_y1 = snoiseVec3_8( p + dy );\n  vec3 p_z0 = snoiseVec3_8( p - dz );\n  vec3 p_z1 = snoiseVec3_8( p + dz );\n\n  float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;\n  float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;\n  float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;\n\n  const float divisor = 1.0 / ( 2.0 * e );\n  return normalize( vec3( x , y , z ) * divisor );\n\n}\n\nvec4 commonShowVelocity_2(vec4 currPos, vec4 destPos, vec4 vel, vec4 currColor, float uTime,  vec2 flow) {\n\n    float t = (sin(uTime * 0.00001) * cos(uTime * 0.001)) * 0.8 + 0.2;\n    vec4 noise = vec4(curlNoise_8(vec3(currPos.xyz * 0.001)), t) * .05;\n\n    float m = 0.01;\n\n    vec4 diff = (destPos - currPos) * (abs(noise) + m);\n\n    vel.xyz *= 0.1;    \n    vel.xyz += diff.xyz; \n\n    vel.xyz += pow(flow * 2., vec2(5.)).xyy;\n\n    return vel;\n}\n\n            //\n// Description : Array and textureless GLSL 2D/3D/4D simplex\n//               noise functions.\n//      Author : Ian McEwan, Ashima Arts.\n//  Maintainer : ijm\n//     Lastmod : 20110822 (ijm)\n//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.\n//               Distributed under the MIT License. See LICENSE file.\n//               https://github.com/ashima/webgl-noise\n//\n\nvec3 mod289_4(vec3 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 mod289_4(vec4 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 permute_4(vec4 x) {\n     return mod289_4(((x*34.0)+1.0)*x);\n}\n\nvec4 taylorInvSqrt_4(vec4 r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nfloat snoise_4(vec3 v)\n  {\n  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;\n  const vec4  D_4 = vec4(0.0, 0.5, 1.0, 2.0);\n\n// First corner\n  vec3 i  = floor(v + dot(v, C.yyy) );\n  vec3 x0 =   v - i + dot(i, C.xxx) ;\n\n// Other corners\n  vec3 g_4 = step(x0.yzx, x0.xyz);\n  vec3 l = 1.0 - g_4;\n  vec3 i1 = min( g_4.xyz, l.zxy );\n  vec3 i2 = max( g_4.xyz, l.zxy );\n\n  //   x0 = x0 - 0.0 + 0.0 * C.xxx;\n  //   x1 = x0 - i1  + 1.0 * C.xxx;\n  //   x2 = x0 - i2  + 2.0 * C.xxx;\n  //   x3 = x0 - 1.0 + 3.0 * C.xxx;\n  vec3 x1 = x0 - i1 + C.xxx;\n  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y\n  vec3 x3 = x0 - D_4.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y\n\n// Permutations\n  i = mod289_4(i);\n  vec4 p = permute_4( permute_4( permute_4(\n             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))\n           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))\n           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));\n\n// Gradients: 7x7 points over a square, mapped onto an octahedron.\n// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)\n  float n_ = 0.142857142857; // 1.0/7.0\n  vec3  ns = n_ * D_4.wyz - D_4.xzx;\n\n  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)\n\n  vec4 x_ = floor(j * ns.z);\n  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)\n\n  vec4 x = x_ *ns.x + ns.yyyy;\n  vec4 y = y_ *ns.x + ns.yyyy;\n  vec4 h = 1.0 - abs(x) - abs(y);\n\n  vec4 b0 = vec4( x.xy, y.xy );\n  vec4 b1 = vec4( x.zw, y.zw );\n\n  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;\n  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;\n  vec4 s0 = floor(b0)*2.0 + 1.0;\n  vec4 s1 = floor(b1)*2.0 + 1.0;\n  vec4 sh = -step(h, vec4(0.0));\n\n  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;\n  vec4 a1_4 = b1.xzyw + s1.xzyw*sh.zzww ;\n\n  vec3 p0_4 = vec3(a0.xy,h.x);\n  vec3 p1 = vec3(a0.zw,h.y);\n  vec3 p2 = vec3(a1_4.xy,h.z);\n  vec3 p3 = vec3(a1_4.zw,h.w);\n\n//Normalise gradients\n  vec4 norm = taylorInvSqrt_4(vec4(dot(p0_4,p0_4), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n  p0_4 *= norm.x;\n  p1 *= norm.y;\n  p2 *= norm.z;\n  p3 *= norm.w;\n\n// Mix final noise value\n  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\n  m = m * m;\n  return 42.0 * dot( m*m, vec4( dot(p0_4,x0), dot(p1,x1),\n                                dot(p2,x2), dot(p3,x3) ) );\n  }\n\nvec3 snoiseVec3_4( vec3 x ){\n\n  float s  = snoise_4(vec3( x ));\n  float s1 = snoise_4(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));\n  float s2 = snoise_4(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));\n  vec3 c = vec3( s , s1 , s2 );\n  return c;\n\n}\n\nvec3 curlNoise_4( vec3 p ){\n  \n  const float e = .1;\n  vec3 dx = vec3( e   , 0.0 , 0.0 );\n  vec3 dy = vec3( 0.0 , e   , 0.0 );\n  vec3 dz = vec3( 0.0 , 0.0 , e   );\n\n  vec3 p_x0 = snoiseVec3_4( p - dx );\n  vec3 p_x1 = snoiseVec3_4( p + dx );\n  vec3 p_y0 = snoiseVec3_4( p - dy );\n  vec3 p_y1 = snoiseVec3_4( p + dy );\n  vec3 p_z0 = snoiseVec3_4( p - dz );\n  vec3 p_z1 = snoiseVec3_4( p + dz );\n\n  float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;\n  float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;\n  float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;\n\n  const float divisor = 1.0 / ( 2.0 * e );\n  return normalize( vec3( x , y , z ) * divisor );\n\n}\n\nvec4 starryNightShowVelocity_1(vec4 currPos, vec4 destPos, vec4 vel, vec4 currColor, float uTime, vec2 flow) {\n\n    float t = (sin(uTime * 0.00001) * cos(uTime * 0.001)) * 0.8 + 0.2;\n    vec4 vel_ = vec4(curlNoise_4(vec3(currPos.xyz * 0.001)), t) * .2;\n\n    float l = length(destPos - currPos) * 0.05;\n   \n    vec4 diff = (destPos - currPos) * 0.01;\n\n    diff.xyz += vel_.xyz * l;\n\n    vel.xyz *= 0.1;\n    vel.xyz += diff.xyz; \n\n    return vel;\n}\n\n            //\n// Description : Array and textureless GLSL 2D/3D/4D simplex\n//               noise functions.\n//      Author : Ian McEwan, Ashima Arts.\n//  Maintainer : ijm\n//     Lastmod : 20110822 (ijm)\n//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.\n//               Distributed under the MIT License. See LICENSE file.\n//               https://github.com/ashima/webgl-noise\n//\n\nvec3 mod289_1(vec3 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 mod289_1(vec4 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0;\n}\n\nvec4 permute_1(vec4 x) {\n     return mod289_1(((x*34.0)+1.0)*x);\n}\n\nvec4 taylorInvSqrt_1(vec4 r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nfloat snoise_1(vec3 v)\n  {\n  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;\n  const vec4  D_1 = vec4(0.0, 0.5, 1.0, 2.0);\n\n// First corner\n  vec3 i  = floor(v + dot(v, C.yyy) );\n  vec3 x0 =   v - i + dot(i, C.xxx) ;\n\n// Other corners\n  vec3 g_1 = step(x0.yzx, x0.xyz);\n  vec3 l = 1.0 - g_1;\n  vec3 i1 = min( g_1.xyz, l.zxy );\n  vec3 i2 = max( g_1.xyz, l.zxy );\n\n  //   x0 = x0 - 0.0 + 0.0 * C.xxx;\n  //   x1 = x0 - i1  + 1.0 * C.xxx;\n  //   x2 = x0 - i2  + 2.0 * C.xxx;\n  //   x3 = x0 - 1.0 + 3.0 * C.xxx;\n  vec3 x1 = x0 - i1 + C.xxx;\n  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y\n  vec3 x3 = x0 - D_1.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y\n\n// Permutations\n  i = mod289_1(i);\n  vec4 p = permute_1( permute_1( permute_1(\n             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))\n           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))\n           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));\n\n// Gradients: 7x7 points over a square, mapped onto an octahedron.\n// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)\n  float n_ = 0.142857142857; // 1.0/7.0\n  vec3  ns = n_ * D_1.wyz - D_1.xzx;\n\n  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)\n\n  vec4 x_ = floor(j * ns.z);\n  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)\n\n  vec4 x = x_ *ns.x + ns.yyyy;\n  vec4 y = y_ *ns.x + ns.yyyy;\n  vec4 h = 1.0 - abs(x) - abs(y);\n\n  vec4 b0 = vec4( x.xy, y.xy );\n  vec4 b1 = vec4( x.zw, y.zw );\n\n  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;\n  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;\n  vec4 s0 = floor(b0)*2.0 + 1.0;\n  vec4 s1 = floor(b1)*2.0 + 1.0;\n  vec4 sh = -step(h, vec4(0.0));\n\n  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;\n  vec4 a1_1 = b1.xzyw + s1.xzyw*sh.zzww ;\n\n  vec3 p0_1 = vec3(a0.xy,h.x);\n  vec3 p1 = vec3(a0.zw,h.y);\n  vec3 p2 = vec3(a1_1.xy,h.z);\n  vec3 p3 = vec3(a1_1.zw,h.w);\n\n//Normalise gradients\n  vec4 norm = taylorInvSqrt_1(vec4(dot(p0_1,p0_1), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n  p0_1 *= norm.x;\n  p1 *= norm.y;\n  p2 *= norm.z;\n  p3 *= norm.w;\n\n// Mix final noise value\n  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\n  m = m * m;\n  return 42.0 * dot( m*m, vec4( dot(p0_1,x0), dot(p1,x1),\n                                dot(p2,x2), dot(p3,x3) ) );\n  }\n\nvec3 snoiseVec3_2( vec3 x ){\n\n  float s  = snoise_1(vec3( x ));\n  float s1 = snoise_1(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));\n  float s2 = snoise_1(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));\n  vec3 c = vec3( s , s1 , s2 );\n  return c;\n\n}\n\nvec3 curlNoise_2( vec3 p ){\n  \n  const float e = .1;\n  vec3 dx = vec3( e   , 0.0 , 0.0 );\n  vec3 dy = vec3( 0.0 , e   , 0.0 );\n  vec3 dz = vec3( 0.0 , 0.0 , e   );\n\n  vec3 p_x0 = snoiseVec3_2( p - dx );\n  vec3 p_x1 = snoiseVec3_2( p + dx );\n  vec3 p_y0 = snoiseVec3_2( p - dy );\n  vec3 p_y1 = snoiseVec3_2( p + dy );\n  vec3 p_z0 = snoiseVec3_2( p - dz );\n  vec3 p_z1 = snoiseVec3_2( p + dz );\n\n  float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;\n  float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;\n  float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;\n\n  const float divisor = 1.0 / ( 2.0 * e );\n  return normalize( vec3( x , y , z ) * divisor );\n\n}\n\nvec4 commonShowVelocity_3(vec4 currPos, vec4 destPos, vec4 vel, vec4 currColor, float uTime,  vec2 flow) {\n\n    float t = (sin(uTime * 0.00001) * cos(uTime * 0.001)) * 0.8 + 0.2;\n    vec4 noise = vec4(curlNoise_2(vec3(currPos.xyz * 0.001)), t) * .005;\n\n    float m = 0.01;\n\n    vec4 diff = (destPos - currPos) * (noise);\n    diff.z = -length(flow.xy) * 0.1; \n    diff.z *= length(destPos - currPos);\n\n    vel.xyz *= 0.001;    \n    vel.xyz += diff.xyz;\n\n//    vel.xy += flow.xy * 30.;\n\n    return vel;\n}\n\n            \n            \n                uniform sampler2D flowTexture;\n                uniform sampler2D destPosTexture;\n                uniform float uTime;\n                uniform int styleType;\n                \n                void main() {\n                    vec4 nextVel = vec4(0.);\n                \n                    vec2 uv = gl_FragCoord.xy / resolution.xy;\n                    \n                    vec4 destPos = texture2D(destPosTexture, uv);\n                    vec4 currPos = texture2D(positionTexture, uv);\n                    vec4 currVel = texture2D(velocityTexture, uv);\n                    vec4 currColor = texture2D(colorTexture, vec2(uv.x, 1. - uv.y));\n                    vec2 flow = (texture2D(flowTexture, vec2(1. - uv.x, uv.y)).xy - 0.5) * 2.;\n                    \n                    if (styleType == 0) {\n                     nextVel = starryNightShowVelocity_5(currPos, destPos, currVel, currColor, uTime, flow); \n                } else if (styleType == 1) {\n                     nextVel = starryNightShowVelocity_2(currPos, destPos, currVel, currColor, uTime, flow); \n                }else if (styleType == 2) {\n                     nextVel = starryNightShowVelocity_3(currPos, destPos, currVel, currColor, uTime, flow); \n                }else if (styleType == 3) {\n                     nextVel = commonShowVelocity_0(currPos, destPos, currVel, currColor, uTime, flow); \n                }else if (styleType == 4) {\n                     nextVel = starryNightShowVelocity_0(currPos, destPos, currVel, currColor, uTime, flow); \n                }else if (styleType == 5) {\n                     nextVel = commonShowVelocity_1(currPos, destPos, currVel, currColor, uTime, flow); \n                }else if (styleType == 6) {\n                     nextVel = starryNightShowVelocity_4(currPos, destPos, currVel, currColor, uTime, flow); \n                }else if (styleType == 7) {\n                     nextVel = commonShowVelocity_2(currPos, destPos, currVel, currColor, uTime, flow); \n                }else if (styleType == 8) {\n                     nextVel = starryNightShowVelocity_1(currPos, destPos, currVel, currColor, uTime, flow); \n                }else if (styleType == 9) {\n                     nextVel = commonShowVelocity_3(currPos, destPos, currVel, currColor, uTime, flow); \n                }\n\n                    gl_FragColor = nextVel;\n                }\n            "})
            }
            else {
                request
                .post(`http://localhost:3000/compile-glsl`)
                .send({glslifys})
                .withCredentials(false)
                .end((err, res) => {
                    const glsls = JSON.parse(res.text)
                    resolve(glsls)
                })
            }
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

            let glslChunk = ` nextVel = ${funcName}(currPos, destPos, currVel, currColor, uTime, flow);`
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

    toState(stateName, imageData, img) {
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

        const { nextPositions, nextColors } = func(this, img, imageData)

        this.setDestination({
            positions: nextPositions,
            colors: nextColors
        })

        velocityVariable.material.uniforms.styleType.value = id
    }
}

export default ParticlePainter