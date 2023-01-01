//
// Created by erik on 1/6/20.
//

#ifndef FFMPEG_H264_WASM_DECODER_H
#define FFMPEG_H264_WASM_DECODER_H

struct codec_context;

void
init_lib(void);

struct codec_context *
create_codec_context();

void
destroy_codec_context(struct codec_context *context);

void
decode(struct codec_context *context,
       uint8_t *data_in,
       int data_in_size,
       uint8_t **y_plane_out,
       uint8_t **u_plane_out,
       uint8_t **v_plane_out,
       int *width_out,
       int *height_out,
       int *stride_out
);

#endif //FFMPEG_H264_WASM_DECODER_H
