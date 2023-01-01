#include <stdio.h>
#include <stdlib.h>
#include "decoder.h"
#include "libavcodec/avcodec.h"
#include "libavutil/imgutils.h"

struct codec_context {
    AVCodecContext *ctx;
    AVFrame *frame;
};

struct codec_context *
create_codec_context() {
    struct codec_context *context = malloc(sizeof(struct codec_context));

    const AVCodec *codec = avcodec_find_decoder(AV_CODEC_ID_H264);
    if (!codec) {
        free(context);
        return 0;
    }
    context->frame = av_frame_alloc();

    context->ctx = avcodec_alloc_context3(codec);
    if (avcodec_open2(context->ctx, codec, NULL) < 0) {
        avcodec_free_context(&context->ctx);
        free(context);
        return 0;
    }

    return context;
}

void
destroy_codec_context(struct codec_context *context) {
    av_frame_free(&context->frame);
    avcodec_free_context(&context->ctx);
    free(context);
}

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
) {
    AVPacket avpkt;
    int ret;

    avpkt.data = data_in;
    avpkt.size = data_in_size;

    ret = avcodec_send_packet(context->ctx, &avpkt);
    if (ret != 0) {
        // TODO handle error codes?
        *y_plane_out = 0;
        return;
    }

    ret = avcodec_receive_frame(context->ctx, context->frame);
    if (ret != 0) {
        // TODO handle error codes?
        *y_plane_out = 0;
        return;
    }

    *y_plane_out = context->frame->data[0];
    *u_plane_out = context->frame->data[1];
    *v_plane_out = context->frame->data[2];
    *stride_out = context->frame->linesize[0];
    *width_out = context->frame->width;
    *height_out = context->frame->height;
}
