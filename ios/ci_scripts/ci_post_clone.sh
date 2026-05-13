#!/bin/sh
set -e

echo "=== Installing Node via Homebrew ==="
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1
brew install node
echo "Node version:"
node --version

echo "=== Installing npm packages ==="
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install --no-audit --no-fund

echo "=== Installing CocoaPods ==="
brew install cocoapods || true

echo "=== Installing pods ==="
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"

# Retry pod install up to 3 times to handle transient CDN 429 errors
pod_install_with_retry() {
  local attempt=1
  local max=3
  while [ $attempt -le $max ]; do
    echo "pod install attempt $attempt/$max ..."
    if [ $attempt -eq 1 ]; then
      pod install --repo-update && return 0
    else
      pod install && return 0
    fi
    echo "pod install failed (attempt $attempt). Sleeping 15s before retry..."
    sleep 15
    attempt=$((attempt + 1))
  done
  echo "pod install failed after $max attempts."
  return 1
}

pod_install_with_retry

echo "=== Done ==="
