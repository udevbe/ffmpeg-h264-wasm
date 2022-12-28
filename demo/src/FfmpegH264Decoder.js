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

/**
 * This class wraps the details of the h264bsd library.
 * Module object is an Emscripten module provided globally by TinyH264.js
 *
 * In order to use this class, you first queue encoded data using queueData.
 * Each call to decode() will decode a single encoded element.
 * When decode() returns H264bsdDecoder.PIC_RDY, a picture is ready in the output buffer.
 * You can also use the onPictureReady() function to determine when a picture is ready.
 * The output buffer can be accessed by calling getNextOutputPicture()
 * An output picture may also be decoded using an H264bsdCanvas.
 * When you're done decoding, make sure to call release() to clean up internal buffers.
 */
class FfmpegH264Decoder {
  /**
   * @param libavH264Module
   * @param {function(output:Uint8Array,width:number,height:number):void}onPictureReady
   * @param {function(errorCode:number):void}onError
   */
  constructor (libavH264Module, onPictureReady, onError) {
    this._libavH264Module = libavH264Module
    /**
     * @type {function(Uint8Array, number, number): void}
     * @private
     */
    this._onPictureReady = onPictureReady
    /**
     * @type {function(errorCode:number): void}
     * @private
     */
    this._onError = onError
    /**
     * @type {number}
     * @private
     */
    this._inBuffer = this._libavH264Module._malloc(1024 * 1024)
    /**
     * @type {number}
     * @private
     */
    this._outBufferSize = this._libavH264Module._malloc(4)
    /**
     * @type {number}
     * @private
     */
    this._outWidth = this._libavH264Module._malloc(4)
    /**
     * @type {number}
     * @private
     */
    this._outHeight = this._libavH264Module._malloc(4)
    this._codecContext = this._libavH264Module._create_codec_context(navigator.hardwareConcurrency)
  }

  release () {
    this._libavH264Module._destroy_codec_context(this._codecContext)
    this._libavH264Module._free(this._inBuffer)
    this._libavH264Module._free(this._outBufferSize)
    this._libavH264Module._free(this._outWidth)
    this._libavH264Module._free(this._outHeight)
  }

  /**
   * @param {Uint8Array} nal
   */
  decode (nal) {
    this._libavH264Module.HEAPU8.set(nal, this._inBuffer)
    const outBufferPtr = this._libavH264Module._decode(this._codecContext, this._inBuffer, nal.byteLength, this._outBufferSize, this._outWidth, this._outHeight)
    if (outBufferPtr === 0) {
      this._onError(0)
      return
    }
    const width = this._libavH264Module.getValue(this._outWidth, 'i32')
    const height = this._libavH264Module.getValue(this._outHeight, 'i32')
    const outBufferSize = this._libavH264Module.getValue(this._outBufferSize, 'i32')
    const pic = new Uint8Array(this._libavH264Module.HEAPU8.subarray(outBufferPtr, outBufferPtr + outBufferSize))
    this._onPictureReady(pic, width, height)
  }
}

export default FfmpegH264Decoder
