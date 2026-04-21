#!/bin/sh
set -e
echo "=== Installing Node via nvm ==="
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
echo "Node: $(node --version)"
echo "=== Installing npm packages ==="
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci
echo "=== Installing pods ==="
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
pod install
echo "=== Done ==="
