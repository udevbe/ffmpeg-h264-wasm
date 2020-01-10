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
       unsigned char *data_in, int data_in_size,
       void *data_out, int *data_size_out, int *width_out, int *height_out);

#endif //FFMPEG_H264_WASM_DECODER_H
