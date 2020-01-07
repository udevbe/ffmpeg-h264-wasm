//
// Created by erik on 1/6/20.
//

#ifndef FFMPEG_H264_WASM_DECODER_H
#define FFMPEG_H264_WASM_DECODER_H

#include "libavcodec/avcodec.h"

struct codec_context;

void
init_lib(void);

struct codec_context *
create_codec_context(void);

void
destroy_codec_context(struct codec_context *context);

int
decode(struct codec_context *context,
       void *data_in, int data_in_size, int width_in, int height_in,
       void *data_out);

#endif //FFMPEG_H264_WASM_DECODER_H
