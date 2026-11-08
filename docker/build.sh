#!/bin/sh
# Builds the Windows installer inside the tauri-build image (Linux + cargo-xwin + NSIS), so the
# host needs neither Rust nor MSVC. Run through `npm run dist` (scripts/docker-build.js), which
# mounts the repository at /app with named volumes for node_modules, the cargo registry, the
# MSVC SDK cache and the build target. The setup ends up in release/.
set -eu
cd /app

npm ci --no-audit --no-fund
[ -f resources/data/meta.json ] || npm run fetch-data
npm test
npx tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc --bundles nsis "$@"

version=$(node -p "require('./package.json').version")
bundle=/target/x86_64-pc-windows-msvc/release/bundle/nsis
mkdir -p release
cp "$bundle/LoL Helper_${version}_x64-setup.exe" "release/LoLHelper-Setup-${version}.exe"
[ -f "$bundle/LoL Helper_${version}_x64-setup.exe.sig" ] && cp "$bundle/LoL Helper_${version}_x64-setup.exe.sig" "release/LoLHelper-Setup-${version}.exe.sig"
cp "/target/x86_64-pc-windows-msvc/release/LoL Helper.exe" "release/LoL Helper.exe"
ls -l release
