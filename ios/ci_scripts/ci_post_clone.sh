#!/bin/sh
set -e

echo "=== Installing Node via Homebrew ==="
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1
brew install node
echo "Node version:"
node --version

echo "=== Installing Ruby 3.3 via Homebrew ==="
brew install ruby@3.3
export PATH="/usr/local/opt/ruby@3.3/bin:$PATH"
echo "Ruby version:"
ruby --version

echo "=== Installing npm packages ==="
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install --no-audit --no-fund

echo "=== Installing newer CocoaPods via gem ==="
export GEM_HOME="$HOME/.gem"
export PATH="$GEM_HOME/bin:$PATH"
gem install --user-install xcodeproj
gem install --user-install cocoapods

echo "CocoaPods version:"
pod --version

echo "=== Installing pods ==="
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
pod install --repo-update

echo "=== Done ==="
