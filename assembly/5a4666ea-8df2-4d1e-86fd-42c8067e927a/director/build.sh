#!/bin/bash
# Brandly Director's Cut — Assembly Build
set -e
echo "🎬 Assembling Director's cut: C:\Users\Patrick\Documents\DREAM-PIXELS-FORGE\plugins\pi-brandly\assembly\5a4666ea-8df2-4d1e-86fd-42c8067e927a\director"
[ ! -d node_modules ] && npm install
npx remotion render src/index.ts MatchaQuick "C:\Users\Patrick\Documents\DREAM-PIXELS-FORGE\plugins\pi-brandly\assembly\5a4666ea-8df2-4d1e-86fd-42c8067e927a\director\out\matchaquick-director-cut.mp4" --codec h264
echo "✅ Delivered: C:\Users\Patrick\Documents\DREAM-PIXELS-FORGE\plugins\pi-brandly\assembly\5a4666ea-8df2-4d1e-86fd-42c8067e927a\director\out\matchaquick-director-cut.mp4"
