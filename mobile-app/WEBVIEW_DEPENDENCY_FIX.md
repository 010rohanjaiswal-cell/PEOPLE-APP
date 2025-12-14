# WebView Dependency Fix

## Issue
`expo-firebase-recaptcha` requires `react-native-webview` as a peer dependency, but it wasn't installed.

## Solution
✅ Installed `react-native-webview` using:
```bash
npx expo install react-native-webview
```

This installed version `13.15.0` which is compatible with Expo SDK 54.

## Important Note

**`react-native-webview` is a native module**, which means:
- ✅ It's now installed in `package.json`
- ⚠️ **You need to rebuild the EAS dev build** for it to work
- The current dev build won't have this native module

## Next Steps

### Option 1: Rebuild EAS Dev Build (Recommended)
Since `react-native-webview` is a native module, rebuild the dev build:

```bash
cd mobile-app
eas build --profile development --platform android
```

### Option 2: Test Locally First
You can test the app locally, but the reCAPTCHA modal might not work until the native module is included in the build.

## Current Status

- ✅ `react-native-webview` installed
- ✅ `expo-firebase-recaptcha` dependencies satisfied
- ⏳ Need to rebuild EAS dev build for native module support

## Why This Is Needed

`expo-firebase-recaptcha` uses `react-native-webview` to display the reCAPTCHA verification interface. This is a native module that needs to be compiled into the app binary.

---

**Action Required:** Rebuild EAS dev build to include `react-native-webview` native module.

