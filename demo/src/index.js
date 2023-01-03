import Worker from './H264NALDecoder.worker'
import YUVSurfaceShader from './YUVSurfaceShader'
import Texture from './Texture'

let H264Worker = null
let videoStreamId = 1

let canvas = null
/**
 * @type {YUVSurfaceShader}
 */
let yuvSurfaceShader = null
let yTexture = null
let uTexture = null
let vTexture = null

/**
 * @type {Array<Uint8Array>}
 */
const h264samples = []

let nroFrames = 0
let start = 0

/**
 * @param {Uint8Array} h264Nal
 */
function decode(h264Nal) {
  H264Worker.postMessage(
    {
      type: 'decode',
      data: h264Nal.buffer,
      offset: h264Nal.byteOffset,
      length: h264Nal.byteLength,
      renderStateId: videoStreamId,
    },
    [h264Nal.buffer],
  )
}

function onPictureReady(message) {
  const { width, height, data } = message
  onPicture(data, width, height)
}

function onPicture(data, width, height) {
  decodeNext()
  const { ptr: framePtr, yPlane, uPlane, vPlane, stride } = data

  canvas.width = width
  canvas.height = height

  const sourceWidth = width
  const sourceHeight = height
  const maxXTexCoord = sourceWidth / stride
  const maxYTexCoord = sourceHeight / height

  const chromaHeight = height >> 1

  // we upload the entire image, including stride padding & filler rows. The actual visible image will be mapped
  // from texture coordinates as to crop out stride padding & filler rows using maxXTexCoord and maxYTexCoord.

  yTexture.image2dBuffer(yPlane, stride, height)
  uTexture.image2dBuffer(uPlane, stride / 2, chromaHeight)
  vTexture.image2dBuffer(vPlane, stride / 2, chromaHeight)
  closeFrame(framePtr)

  yuvSurfaceShader.setTexture(yTexture, uTexture, vTexture)
  yuvSurfaceShader.updateShaderData({ w: width, h: height }, { maxXTexCoord, maxYTexCoord })
  yuvSurfaceShader.draw()
}

function closeFrame(framePtr) {
  H264Worker.postMessage({ type: 'closeFrame', renderStateId: videoStreamId, data: framePtr })
}

function release() {
  if (H264Worker) {
    H264Worker.postMessage({ type: 'release', renderStateId: videoStreamId })
    H264Worker = null
  }
}

function decodeNext() {
  const nextFrame = h264samples.shift()
  if (nextFrame != null) {
    decode(nextFrame)
  } else {
    const fps = (1000 / (Date.now() - start)) * nroFrames
    window.alert(`Decoded ${nroFrames} (3440x1216) frames in ${Date.now() - start}ms @ ${fps >> 0}FPS`)
  }
}

function initWebGLCanvas() {
  canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl')
  yuvSurfaceShader = YUVSurfaceShader.create(gl)
  yTexture = Texture.create(gl, gl.LUMINANCE)
  uTexture = Texture.create(gl, gl.LUMINANCE)
  vTexture = Texture.create(gl, gl.LUMINANCE)

  document.body.append(canvas)
}

function main() {
  initWebGLCanvas()
  new Promise((resolve) => {
    /**
     * @type {Worker}
     * @private
     */
    H264Worker = new Worker()
    H264Worker.addEventListener('message', (e) => {
      const message = e.data
      switch (message.type) {
        case 'pictureReady':
          onPictureReady(message)
          break
        case 'decoderReady':
          resolve(H264Worker)
          break
      }
    })
  })
    .then(() => {
      const fetches = []
      for (let i = 0; i < 60; i++) {
        fetches.push(
          fetch(`h264samples/${i}`).then((response) => {
            return response.arrayBuffer().then(function (buffer) {
              h264samples[i] = new Uint8Array(buffer)
            })
          }),
        )
      }

      return Promise.all(fetches)
    })
    .then(() => {
      nroFrames = h264samples.length
      start = Date.now()
      decodeNext()
    })
}

main()
