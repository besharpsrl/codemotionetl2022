#!/bin/bash
set -Eeuxo pipefail
cd "$CODEBUILD_SRC_DIR"

export PATH="/root/.local/bin:$PATH"

npm ci
npm run zip-requirements
npm run build
node_modules/.bin/cdk synth