#!/bin/bash

# Script to set up app icon from a source image
# Usage: ./setup-icon.sh <path-to-icon-image>

if [ -z "$1" ]; then
    echo "Usage: ./setup-icon.sh <path-to-icon-image>"
    echo "Example: ./setup-icon.sh ~/Downloads/app-icon.png"
    exit 1
fi

SOURCE_IMAGE="$1"
ASSETS_DIR="./assets"

if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "Error: Image file not found: $SOURCE_IMAGE"
    exit 1
fi

echo "Setting up app icon from: $SOURCE_IMAGE"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "Error: ImageMagick is required. Install it with:"
    echo "  macOS: brew install imagemagick"
    echo "  Linux: sudo apt-get install imagemagick"
    exit 1
fi

# Create 1024x1024 icon.png
echo "Creating icon.png (1024x1024)..."
convert "$SOURCE_IMAGE" -resize 1024x1024^ -gravity center -extent 1024x1024 "$ASSETS_DIR/icon.png"

# Create adaptive-icon.png (1024x1024) - same as icon for Android
echo "Creating adaptive-icon.png (1024x1024)..."
convert "$SOURCE_IMAGE" -resize 1024x1024^ -gravity center -extent 1024x1024 "$ASSETS_DIR/adaptive-icon.png"

# Create splash-icon.png (can be larger, will be resized by Expo)
echo "Creating splash-icon.png (1024x1024)..."
convert "$SOURCE_IMAGE" -resize 1024x1024^ -gravity center -extent 1024x1024 "$ASSETS_DIR/splash-icon.png"

# Create favicon.png (512x512 for web)
echo "Creating favicon.png (512x512)..."
convert "$SOURCE_IMAGE" -resize 512x512^ -gravity center -extent 512x512 "$ASSETS_DIR/favicon.png"

echo "✅ Icon setup complete!"
echo "All icon files have been created in $ASSETS_DIR"
echo ""
echo "Next steps:"
echo "1. Review the generated icons"
echo "2. Run: eas build --platform android --profile production"
echo "   or: eas build --platform android --profile preview"

