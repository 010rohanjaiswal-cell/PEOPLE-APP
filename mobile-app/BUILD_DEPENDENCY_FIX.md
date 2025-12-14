# Build Dependency Fix

## Issue
Build failed during "Install dependencies" phase with unknown error.

## Root Cause
Some packages installed were not compatible with Expo managed workflow:
- `react-native-image-picker` - Conflicts with `expo-image-picker`
- `react-native-vector-icons` - Deprecated, we have `@expo/vector-icons`
- `react-native-netinfo` - Should use `@react-native-community/netinfo`

## Fixes Applied

### 1. Removed Incompatible Packages
- ❌ Removed `react-native-image-picker` (using `expo-image-picker` instead)
- ❌ Removed `react-native-vector-icons` (using `@expo/vector-icons` instead)
- ❌ Removed `react-native-netinfo` (replaced with Expo-compatible version)

### 2. Added Expo-Compatible Packages
- ✅ `@react-native-community/netinfo` - Expo-compatible network info

### 3. Kept Compatible Packages
- ✅ `expo-image-picker` - Expo's image picker (already installed)
- ✅ `@expo/vector-icons` - Expo's icon library (already installed)
- ✅ All other packages are Expo-compatible

## Updated Package List

### Removed
- `react-native-image-picker` → Use `expo-image-picker` instead
- `react-native-vector-icons` → Use `@expo/vector-icons` instead
- `react-native-netinfo` → Use `@react-native-community/netinfo` instead

### Added
- `@react-native-community/netinfo` - Expo-compatible network detection

## Code Updates Needed

When using these packages in code, make sure to:

1. **Image Picker:**
   ```javascript
   // Use expo-image-picker (already imported)
   import * as ImagePicker from 'expo-image-picker';
   ```

2. **Icons:**
   ```javascript
   // Use @expo/vector-icons (already imported)
   import { MaterialIcons } from '@expo/vector-icons';
   ```

3. **Network Info:**
   ```javascript
   // Use @react-native-community/netinfo
   import NetInfo from '@react-native-community/netinfo';
   ```

## Next Steps

1. ✅ Dependencies fixed
2. ⏳ Try build again:
   ```bash
   cd mobile-app
   eas build --profile development --platform android
   ```

## Build Logs

If build still fails, check detailed logs at:
https://expo.dev/accounts/010rohan/projects/people-app/builds/5403189e-6ef4-43bb-8447-dd13ae377036

Look for specific error messages in the "Install dependencies" phase.

---

**Dependencies updated for Expo compatibility!** 🚀

