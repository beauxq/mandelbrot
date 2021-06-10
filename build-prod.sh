pushd wasm
./compile2base64.sh
popd
npx webpack --config webpack.config.js --mode=production
