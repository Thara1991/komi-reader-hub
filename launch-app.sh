#!/bin/bash

# Launch Komi Reader Hub Electron App
# This script ensures the app runs as an Electron app, not as a web app

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Path to the app
APP_PATH="$SCRIPT_DIR/dist-electron/mac-arm64/Komi Reader Hub.app"

# Check if app exists
if [ ! -d "$APP_PATH" ]; then
    echo "❌ App not found at: $APP_PATH"
    echo "Please run 'npm run electron:dist' first to build the app"
    exit 1
fi

echo "🚀 Launching Komi Reader Hub..."
echo "📍 App path: $APP_PATH"

# Launch the app using the MacOS executable directly
"$APP_PATH/Contents/MacOS/Komi Reader Hub"

echo "✅ App launched successfully!"
