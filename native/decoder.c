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

uint8_t *
decode(struct codec_context *context,
       unsigned char *data_in, int data_in_size, int *data_size_out, int *width_out, int *height_out) {
    AVPacket avpkt;
    int ret;

    avpkt.data = data_in;
    avpkt.size = data_in_size;

    ret = avcodec_send_packet(context->ctx, &avpkt);
    if (ret != 0) {
        // TODO handle error codes?
        return NULL;
    }

    ret = avcodec_receive_frame(context->ctx, context->frame);
    if (ret != 0) {
        // TODO handle error codes?
        return NULL;
    }

    *data_size_out = av_image_get_buffer_size(AV_PIX_FMT_YUV420P, context->frame->width, context->frame->height, 1);
    *width_out = context->frame->width;
    *height_out = context->frame->height;

    return context->frame->data[0];
}
