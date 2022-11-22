#!/bin/bash
set -Eeuxo pipefail
cd "$CODEBUILD_SRC_DIR"

export PATH="/root/.local/bin:$PATH"

npm run create-dev-requirements
pip install -r requirements.txt

#nohup /usr/local/bin/dockerd --host=unix:///var/run/docker.sock --storage-driver=overlay& > /dev/null
#timeout 15 sh -c "until docker info; do echo .; sleep 1; done"
#docker-compose -f docker-compose.yml up -d

ENV="test" pytest -s --cov="src" --cov-report="xml" tests/