import FfmpegH264Decoder from './FfmpegH264Decoder'

import libavH264URL from '!file-loader!./libav-h264.js'
import libavH264WasmURL from '!file-loader!./libav-h264.wasm.asset'
import libavH264WorkerURL from '!file-loader!./libav-h264.worker.js'

/**
 * @type {{'libav-h264.wasm'}}
 */
const assets = {
  'libav-h264.js': libavH264URL,
  'libav-h264.wasm': libavH264WasmURL,
  'libav-h264.worker.js': libavH264WorkerURL
}

self.Module = {
  locateFile: path => assets[path],
  mainScriptUrlOrBlob: libavH264URL
}
importScripts(libavH264URL)

/**
 * @type {Object.<number,FfmpegH264Decoder>}
 */
const h264Decoders = {}

function loadNativeModule () {
  return new Promise(resolve => {
    if (Module.calledRun) {
      resolve()
    } else {
      Module.onRuntimeInitialized = () => resolve()
    }
  })
}

async function init () {
  await loadNativeModule()

  self.addEventListener('message', ({ data: { data, length, offset, renderStateId, type } }) => {
    switch (type) {
      case 'decode': {
        let decoder = h264Decoders[renderStateId]
        if (!decoder) {
          decoder = new FfmpegH264Decoder(
            self.Module,
            (output, width, height) => {
              postMessage({
                type: 'pictureReady',
                width,
                height,
                renderStateId,
                data: output.buffer
              }, [output.buffer])
            },
            () => postMessage({ type: 'needMoreData' }),
            errorCode => postMessage({ type: 'error', errorCode }))
          h264Decoders[renderStateId] = decoder
        }
        decoder.decode(new Uint8Array(data, offset, length))
        break
      }
      case 'release': {
        const decoder = h264Decoders[renderStateId]
        if (decoder) {
          decoder.release()
          delete h264Decoders[renderStateId]
        }
        break
      }
    }
  })

  self.postMessage({ 'type': 'decoderReady' })
}

export {
  init
}
