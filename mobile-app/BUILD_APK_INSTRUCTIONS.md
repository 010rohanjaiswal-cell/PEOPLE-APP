# Build Release APK Instructions

## Prerequisites
- ✅ App name updated to "People"
- ⏳ Icon image needs to be set up

## Step 1: Set Up App Icon

### If you have the icon image file:

1. Save your icon image (the handshake icon) to a file, e.g., `~/Downloads/people-icon.png`

2. Run the Python script to generate all icon sizes:
   ```bash
   cd mobile-app
   python3 setup-icon.py ~/Downloads/people-icon.png
   ```

   This will create:
   - `assets/icon.png` (1024x1024)
   - `assets/adaptive-icon.png` (1024x1024)
   - `assets/splash-icon.png` (1024x1024)
   - `assets/favicon.png` (512x512)

### If you need to download/create the icon:

1. Save the handshake icon image as a PNG file (minimum 1024x1024 pixels)
2. Place it in an accessible location
3. Run the setup script as shown above

## Step 2: Verify Configuration

Check that `app.json` has:
- ✅ `"name": "People"`
- ✅ `"icon": "./assets/icon.png"`

## Step 3: Build the Release APK

### Using EAS Build (Recommended - Cloud Build):

```bash
cd mobile-app
eas build --platform android --profile production
```

This will:
- Build the APK in the cloud
- Provide a download link when complete
- Take approximately 15-30 minutes

### Alternative: Local Build (if you have Android SDK set up):

```bash
cd mobile-app/android
./gradlew assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

## Step 4: Sign the APK (if needed)

If building locally, you may need to sign the APK. EAS builds handle this automatically.

## Notes

- The app name is now "People" (updated in app.json and Android strings.xml)
- Icon files need to be 1024x1024 pixels minimum
- The build process will use the icon from `assets/icon.png`
- EAS build requires an Expo account (free tier available)

