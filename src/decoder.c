//
// Created by erik on 1/6/20.
//

#include <stdio.h>
#include <stdlib.h>
#include "decoder.h"
#include "libavutil/imgutils.h"

struct codec_context {
    AVCodecContext *ctx;
    AVCodec *codec;
};

void
init_lib(void) {
    avcodec_register_all();
}

struct codec_context *
create_codec_context() {
    struct codec_context *context = malloc(sizeof(struct codec_context));

    context->codec = avcodec_find_decoder(AV_CODEC_ID_H264);
    if (!context->codec) {
        free(context);
        return 0;
    }
    // avcodec_register(context->codec);

    context->ctx = avcodec_alloc_context3(context->codec);
    if (avcodec_open2(context->ctx, context->codec, NULL) < 0) {
        avcodec_free_context(&context->ctx);
        free(context);
        return 0;
    }

    context->ctx->thread_count = 8;
    context->ctx->thread_type = FF_THREAD_SLICE;

    return context;
}

void
destroy_codec_context(struct codec_context *context) {
    avcodec_free_context(&context->ctx);
    free(context);
}

int
decode(struct codec_context *context,
       unsigned char *data_in, int data_in_size,
       void *data_out, int *data_size_out, int *width_out, int *height_out) {
    AVPacket avpkt;
    AVFrame *picture;
    int dest_size, ret, in_len, size, len;
    unsigned char * data;

    av_init_packet(&avpkt);
    avpkt.data = data_in;
    avpkt.size = data_in_size;

    ret = avcodec_send_packet(context->ctx, &avpkt);
    if (ret != 0) {
        // TODO handle error codes?
        return ret;
    }

    picture = av_frame_alloc();
    ret = avcodec_receive_frame(context->ctx, picture);
    if (ret != 0) {
        // TODO handle error codes?
        return ret;
    }

    dest_size = av_image_get_buffer_size(AV_PIX_FMT_YUV420P, picture->width, picture->height, 1);
    av_image_copy_to_buffer(data_out, dest_size, picture->data, picture->linesize,
                            AV_PIX_FMT_YUV420P, picture->width, picture->height, 1);

    *width_out = picture->width;
    *height_out = picture->height;
    *data_size_out = dest_size;
    av_frame_free(&picture);
    return 0;
}
