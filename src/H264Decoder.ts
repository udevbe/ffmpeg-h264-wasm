//
//  Copyright (c) 2013 Sam Leitch. All rights reserved.
//
//  Permission is hereby granted, free of charge, to any person obtaining a copy
//  of this software and associated documentation files (the "Software"), to
//  deal in the Software without restriction, including without limitation the
//  rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
//  sell copies of the Software, and to permit persons to whom the Software is
//  furnished to do so, subject to the following conditions:
//
//  The above copyright notice and this permission notice shall be included in
//  all copies or substantial portions of the Software.
//
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
//  IN THE SOFTWARE.
//

import { libavh264 } from './H264Worker'

export class H264Decoder {
  private readonly _inBuffer: number
  private readonly _outBufferSize: number
  private readonly _outWidth: number
  private readonly _outHeight: number
  private readonly _codecContext: number

  constructor(
    private readonly libavH264Module: libavh264,
    private readonly onPictureReady: (output: Uint8Array, width: number, height: number) => void,
  ) {
    this._inBuffer = this.libavH264Module._malloc(1024 * 1024)
    this._outBufferSize = this.libavH264Module._malloc(4)
    this._outWidth = this.libavH264Module._malloc(4)
    this._outHeight = this.libavH264Module._malloc(4)
    this._codecContext = this.libavH264Module._create_codec_context()
  }

  release() {
    this.libavH264Module._destroy_codec_context(this._codecContext)
    this.libavH264Module._free(this._inBuffer)
    this.libavH264Module._free(this._outBufferSize)
    this.libavH264Module._free(this._outWidth)
    this.libavH264Module._free(this._outHeight)
  }

  decode(nal: Uint8Array) {
    this.libavH264Module.HEAPU8.set(nal, this._inBuffer)
    const outBufferPtr = this.libavH264Module._decode(
      this._codecContext,
      this._inBuffer,
      nal.byteLength,
      this._outBufferSize,
      this._outWidth,
      this._outHeight,
    )
    if (outBufferPtr === 0) {
      return undefined
    }
    const width = this.libavH264Module.getValue(this._outWidth, 'i32')
    const height = this.libavH264Module.getValue(this._outHeight, 'i32')
    const outBufferSize = this.libavH264Module.getValue(this._outBufferSize, 'i32')
    const pic = new Uint8Array(this.libavH264Module.HEAPU8.subarray(outBufferPtr, outBufferPtr + outBufferSize))
    this.onPictureReady(pic, width, height)
  }
}
