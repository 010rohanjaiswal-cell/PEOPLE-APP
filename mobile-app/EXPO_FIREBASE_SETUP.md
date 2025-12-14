# Expo + Firebase Setup - Production Apps Approach

## How Production Apps Work

Production apps like Amazon, Google Pay, etc. **DO use Expo**, but they:
1. Use **Expo Config Plugins** to add native modules
2. Use **EAS Build** (which you're already using)
3. Add native configuration files (google-services.json)

## What We Need

### 1. Config Plugin (Already Added ✅)
The plugin `@react-native-firebase/app` is already in `app.json` plugins array.

### 2. google-services.json (Required ⚠️)
This file is **required** for Firebase to work. Download it from Firebase Console.

### 3. Proper Plugin Configuration
The plugin should automatically handle native code during EAS build.

## Steps to Fix

### Step 1: Download google-services.json
1. Go to Firebase Console: https://console.firebase.google.com/project/freelancing-platform-v2
2. Project Settings → Your apps → Android app
3. Download `google-services.json`
4. Place it in: `mobile-app/android/app/google-services.json`

### Step 2: Verify Plugin Configuration
The plugin in `app.json` should be:
```json
"plugins": [
  "@react-native-firebase/app",
  ...
]
```

### Step 3: Rebuild
```bash
eas build --profile development --platform android
```

## Why Build Was Failing

The build fails because:
- `google-services.json` is missing (required by Firebase)
- The config plugin needs this file to configure native code

## After Adding google-services.json

The build should succeed because:
- ✅ Config plugin is configured
- ✅ Native modules will be compiled
- ✅ Firebase will be properly initialized
- ✅ Phone auth will work natively (no reCAPTCHA!)

## This Is How Production Apps Do It

1. Use Expo (managed workflow)
2. Add config plugins for native modules
3. Add native config files (google-services.json)
4. Build with EAS (handles native compilation)
5. Result: Full native Firebase support!

---

**Next Step:** Download and add `google-services.json`, then rebuild!

