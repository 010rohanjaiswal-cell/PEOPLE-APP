# Build Release APK Instructions

## Prerequisites
- ✅ App name updated to "People"
- App icon: People mark in `assets/icon.png` (and matching Expo + native launcher assets)

## Step 1: App icon (reference)

Source of truth: **`assets/icon.png`** (1024x1024 PNG). The same file is used for `adaptive-icon.png`, `splash-icon.png`, and `favicon.png`. Android `mipmap-*` launcher webps, `drawable-*` splash logos, and iOS `AppIcon.appiconset` are kept in sync with that artwork.

To replace later: overwrite `assets/icon.png`, copy to the other `assets/*` icon files, then regenerate native sizes or run `npx expo prebuild --clean` (re-apply any native edits afterward).

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
- Icon source should stay 1024x1024 PNG for store / Expo
- The build process will use the icon from `assets/icon.png`
- EAS build requires an Expo account (free tier available)

