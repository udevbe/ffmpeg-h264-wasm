//
// Created by erik on 1/6/20.
//

#include <stdlib.h>
#include "decoder.h"
#include "libavutil/imgutils.h"

struct codec_context {
    AVCodecContext *c;
    AVFrame *picture;
};

void
init_lib(void) {
    avcodec_register_all();
}

struct codec_context *
create_codec_context() {
    AVCodec *codec;
    AVFrame *picture;
    struct codec_context *context = malloc(sizeof(struct codec_context));

    codec = avcodec_find_decoder(AV_CODEC_ID_H264);
    if (!codec) {
        free(context);
        return 0;
    }

    context->c = avcodec_alloc_context3(codec);
    if (avcodec_open2(context->c, codec, NULL) < 0) {
        avcodec_free_context(&context->c);
        free(context);
        return 0;
    }

    context->picture = av_frame_alloc();

    return context;
}

void
destroy_codec_context(struct codec_context *context) {
    avcodec_free_context(&context->c);
    av_frame_free(&context->picture);
    free(context);
}

int
decode(struct codec_context *context,
       void *data_in, int data_in_size, int width_in, int height_in,
       void *data_out) {
    AVPacket avpkt;
    int dest_size, ret;

    av_init_packet(&avpkt);

    avpkt.size = data_in_size;
    avpkt.data = data_in;
    while (avpkt.size > 0) {
        av_frame_unref(context->picture);
        ret = avcodec_send_packet(context->c, &avpkt);
        if (ret != 0) {
            // TODO handle error codes
            return -1;
        }
        ret = avcodec_receive_frame(context->c, context->picture);
        if (ret != 0) {
            // TODO handle error codes
            return 0;
        }

        dest_size = av_image_get_buffer_size(AV_PIX_FMT_YUV420P, width_in, height_in, 32);
        av_image_copy_to_buffer(data_out, dest_size, context->picture->data, context->picture->linesize,
                                AV_PIX_FMT_YUV420P, width_in, height_in, 32);
        return dest_size;
    }
    return 0;
}
