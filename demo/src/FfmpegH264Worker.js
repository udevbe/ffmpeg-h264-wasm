import FfmpegH264Decoder from './FfmpegH264Decoder'
import FfmpegH264 from './libav-h264'

/**
 * @type {Object.<number,FfmpegH264Decoder>}
 */
const h264Decoders = {}

function handleInit(ffmpegH264) {
  self.addEventListener('message', ({ data: { data, length, offset, renderStateId, type } }) => {
    switch (type) {
      case 'decode': {
        let decoder = h264Decoders[renderStateId]
        if (!decoder) {
          decoder = new FfmpegH264Decoder(
              ffmpegH264,
            (output, width, height) => {
              postMessage({
                type: 'pictureReady',
                width,
                height,
                renderStateId,
                data: output.buffer
              }, [output.buffer])
            },
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

function init () {
  FfmpegH264().then(handleInit)
}

export {
  init
}