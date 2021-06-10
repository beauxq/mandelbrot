# prepare to compile
# TODO: what's the best way to deal with this?
# (this is how emsdk told me to use it)
source ~/code/emsdk/emsdk_env.sh
mkdir -p build

# compile c to wasm base 64
emcc draw.c -O2 -s WASM=1 -o build/draw.js
base64 -w0 build/draw.wasm > build/draw.wasm.base64
rm build/draw.js

# make ts file
printf %s "export const drawWasm = '" > ../src/drawWasm.ts
cat build/draw.wasm.base64 >> ../src/drawWasm.ts
printf %s "';" >> ../src/drawWasm.ts
