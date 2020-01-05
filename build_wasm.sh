#!/usr/bin/env bash
set -e

EMSDK_VERSION="latest"

#######################################
# Ensures a repo is checked out.
# Arguments:
#   url: string
#   name: string
# Returns:
#   None
#######################################
ensure_repo() {
  local url name
  local "${@}"

  git -C ${name} pull || git clone ${url} ${name}
}

ensure_emscripten() {
  ensure_repo url='https://github.com/emscripten-core/emsdk.git' name='emsdk'
  pushd 'emsdk'
  ./emsdk install ${EMSDK_VERSION}
  ./emsdk activate ${EMSDK_VERSION}
  source ./emsdk_env.sh
  popd
}

ensure_libav() {
  ensure_repo url='git://git.libav.org/libav' name='libav'
}

build() {
  pushd libav

  make clean

  emconfigure ./configure --cc="emcc" --ar="emar" --prefix="$(pwd)"/../dist --enable-cross-compile --target-os=none --arch=x86_32 --cpu=generic \
    --enable-gpl --enable-version3 --disable-avdevice --disable-avformat --disable-avfilter \
    --disable-swscale --disable-avresample \
    --disable-programs --disable-logging --disable-everything --enable-decoder=h264 \
    --disable-asm --disable-doc --disable-devices --disable-network \
    --disable-hwaccels --disable-parsers --disable-bsfs --disable-debug --disable-protocols --disable-indevs --disable-outdevs
  emmake make
  emmake make install

  popd
  echo "Running Emscripten..."
  emcc dist/lib/libavcodec.a dist/lib/libavutil.a -s MODULARIZE=1 -s EXPORT_ES6=1 -s ENVIRONMENT='web,worker' -s USE_PTHREADS=1 -s PTHREAD_POOL_SIZE=4 -s PTHREAD_HINT_NUM_CORES=4 -s ERROR_ON_UNDEFINED_SYMBOLS=0 -O3 --llvm-opts 3 --llvm-lto 3 -o ./libav-h264.js -s EXPORTED_FUNCTIONS='["_malloc", "_free","_avcodec_find_decoder","_avcodec_alloc_context3","_av_frame_alloc","_avcodec_open2","_avcodec_decode_video2"]'

  echo "Finished Build"
}

main() {
  ensure_emscripten
  ensure_libav
  build
}

main
