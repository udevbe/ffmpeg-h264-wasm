#!/usr/bin/env bash
set -e

EMSDK_VERSION="tot-upstream"
#EMSDK_VERSION="latest"
LIBAV_VERSION="v12.3"

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
  ./emsdk update-tags
  ./emsdk install ${EMSDK_VERSION}
  ./emsdk activate ${EMSDK_VERSION}
  source ./emsdk_env.sh
  popd
}

ensure_libav() {
  ensure_repo url='git://git.libav.org/libav' name='libav'
}

build() {
  rm -rf libav-h264.js libav-h264.wasm libav-h264.worker.js

  ensure_libav
  pushd libav
  git checkout "$LIBAV_VERSION"

  echo "Building libav..."

  emconfigure ./configure --cc="emcc" --ar="emar" --prefix="$(pwd)"/../dist --enable-cross-compile --target-os=none --arch=x86_32 --cpu=generic \
    --enable-gpl --enable-version3 --enable-nonfree --disable-avdevice --disable-avformat --disable-avfilter \
    --disable-swscale --disable-avresample \
    --disable-programs --disable-logging --disable-everything --enable-decoder=h264 \
    --disable-debug --disable-w32threads \
    --disable-asm --disable-doc --disable-devices --disable-network \
    --disable-hwaccels --disable-parsers --disable-bsfs \
    --disable-protocols --disable-indevs --disable-outdevs \
    --enable-lto
  emmake make
  emmake make install
  git checkout master

  popd
  echo "Running Emscripten..."
  emcc src/decoder.c -I./dist/include -s USE_PTHREADS=1 -O3 -msimd128 -c -o dist/decoder.bc
  EXPORTED_FUNCTIONS='["_malloc","_free","_init_lib","_create_codec_context","_destroy_codec_context","_decode"]'
  EXTRA_EXPORTED_RUNTIME_METHODS='["calledRun","getValue"]'
  emcc dist/decoder.bc dist/lib/libavcodec.a dist/lib/libavutil.a -lpthread -pthread --memory-init-file 1 --llvm-opts "['-tti', '-domtree', '-tti', '-domtree', '-deadargelim', '-domtree', '-instcombine', '-domtree', '-jump-threading', '-domtree', '-instcombine', '-reassociate', '-domtree', '-loops', '-loop-rotate', '-licm', '-domtree', '-instcombine', '-loops', '-loop-idiom', '-loop-unroll', '-memdep', '-memdep', '-memcpyopt', '-domtree', '-demanded-bits', '-instcombine', '-jump-threading', '-domtree', '-memdep', '-loops', '-licm', '-adce', '-domtree', '-instcombine', '-elim-avail-extern', '-float2int', '-domtree', '-loops', '-loop-rotate', '-demanded-bits', '-instcombine', '-domtree', '-instcombine', '-loops', '-loop-unroll', '-instcombine', '-licm', '-strip-dead-prototypes', '-domtree']" --llvm-lto 3 -s ENVIRONMENT='worker' -s USE_CLOSURE_COMPILER=1 -s AGGRESSIVE_VARIABLE_ELIMINATION=1 -s NO_EXIT_RUNTIME=1 -s INVOKE_RUN=0 -s DOUBLE_MODE=0 -s TOTAL_MEMORY=134217728 -s USE_PTHREADS=1 -O3 -o ./libav-h264.js -s EXPORTED_FUNCTIONS="$EXPORTED_FUNCTIONS" -s EXTRA_EXPORTED_RUNTIME_METHODS="$EXTRA_EXPORTED_RUNTIME_METHODS"

  echo "Finished Build"
}

main() {
  ensure_emscripten
  build
}

main
