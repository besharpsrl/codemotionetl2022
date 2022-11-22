#!/bin/bash
set -Eeuxo pipefail
cd "$CODEBUILD_SRC_DIR"

# Update npm
npm i -g npm

# Update pip
python -m pip install --upgrade pip

# Install and update poetry
curl -sSL https://install.python-poetry.org | python -
export PATH="/root/.local/bin:$PATH"
poetry self update
poetry --version