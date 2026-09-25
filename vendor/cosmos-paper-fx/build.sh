#!/bin/sh
# Une las fuentes en dist/ y genera la versión minificada (requiere terser: npm i -g terser)
cd "$(dirname "$0")"
cat src/00-core.js src/10-cast.js src/20-runtime.js src/30-scenes.js > dist/cosmos-paper-fx.js
node --check dist/cosmos-paper-fx.js || exit 1
if command -v terser >/dev/null; then terser dist/cosmos-paper-fx.js -c -m --comments '/^!/' -o dist/cosmos-paper-fx.min.js; fi
wc -c dist/*.js
