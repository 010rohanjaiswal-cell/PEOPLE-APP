# App Icon Setup Instructions

## Step 1: Prepare Your Icon Image

You need to provide the icon image file. The image should be:
- **Format**: PNG (recommended) or JPG
- **Minimum size**: 1024x1024 pixels
- **Background**: Transparent or solid color (will be used as app icon)

## Step 2: Set Up the Icon

### Option A: Using the Setup Script (Recommended)

1. Save your icon image to a location you can access (e.g., `~/Downloads/app-icon.png`)

2. Run the setup script:
   ```bash
   cd mobile-app
   ./setup-icon.sh ~/Downloads/app-icon.png
   ```

   **Note**: This requires ImageMagick. Install it with:
   - macOS: `brew install imagemagick`
   - Linux: `sudo apt-get install imagemagick`

### Option B: Manual Setup

1. Resize your image to **1024x1024 pixels**
2. Replace the following files in `mobile-app/assets/`:
   - `icon.png` (1024x1024)
   - `adaptive-icon.png` (1024x1024) - same as icon.png
   - `splash-icon.png` (1024x1024) - can be same as icon.png
   - `favicon.png` (512x512) - for web

## Step 3: Verify Configuration

The app is already configured in `app.json`:
- App name: **People**
- Icon path: `./assets/icon.png`
- Adaptive icon: `./assets/adaptive-icon.png`

## Step 4: Build the APK

Once the icons are set up, build the release APK:

```bash
cd mobile-app
eas build --platform android --profile production
```

Or for a preview build:

```bash
eas build --platform android --profile preview
```

The APK will be available for download from the Expo dashboard after the build completes.

