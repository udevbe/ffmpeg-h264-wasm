import { H264Decoder } from './H264Decoder'
import LibavH264 from './libav-h264'

export type libavh264 = {
  readonly HEAPU8: Uint8Array
  _malloc(bytes: number): number
  _free(ptr: number): void
  _decode(
    codecContext: number,
    dataIn: number,
    dataInSize: number,
    yPlaneOut: number,
    uPlaneOut: number,
    vPlaneOut: number,
    widthOut: number,
    heightOut: number,
    strideOut: number,
  ): void
  getValue(address: number, addressType: string): number
  _create_codec_context(): number
  _destroy_codec_context(_codecContext: number): void
}

const h264Decoders: Record<string, H264Decoder> = {}

export function init() {
  return LibavH264().then((LibavH264: libavh264) => {
    self.addEventListener(
      'message',
      (e) => {
        // @ts-ignore
        const message = e.data
        const renderStateId = message.renderStateId
        const messageType = message.type
        switch (messageType) {
          case 'decode': {
            let decoder = h264Decoders[renderStateId]
            if (!decoder) {
              decoder = new H264Decoder(
                LibavH264,
                (
                  output: {
                    yPlane: Uint8Array
                    uPlane: Uint8Array
                    vPlane: Uint8Array
                    stride: number
                  },
                  width: number,
                  height: number,
                ) => {
                  postMessage(
                    {
                      type: 'pictureReady',
                      width,
                      height,
                      renderStateId,
                      data: output,
                    },
                    [output.yPlane.buffer, output.uPlane.buffer, output.vPlane.buffer],
                  )
                },
              )
              h264Decoders[renderStateId] = decoder
            }
            decoder.decode(new Uint8Array(message.data, message.offset, message.length))
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
      },
      { passive: true },
    )

    self.postMessage({ type: 'decoderReady' })
  })
}
