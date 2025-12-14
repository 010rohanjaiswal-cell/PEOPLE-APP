# Build Troubleshooting Guide

## Current Issue
Build failing during "Install dependencies" phase.

## Check Build Logs
**Critical:** Check the detailed build logs to see the exact error:
https://expo.dev/accounts/010rohan/projects/people-app/builds/8c691acf-d438-4580-81ee-d2166a711f52

Look for:
- Specific package causing failure
- Native module errors
- Version conflicts
- Missing dependencies

## Potential Problematic Packages

### 1. Cloudinary (Removed ✅)
- **Issue:** `cloudinary` is a Node.js package, not React Native compatible
- **Solution:** Removed - we'll upload images via backend API instead
- **Status:** ✅ Fixed

### 2. @bam.tech/react-native-image-resizer
- **Issue:** Native module, might need config plugin
- **Solution:** May need to add to `app.json` plugins or remove temporarily

### 3. react-native-date-picker
- **Issue:** Native module, might need config plugin
- **Alternative:** Use `@react-native-community/datetimepicker` (Expo-compatible)

### 4. react-native-modal (RC version)
- **Issue:** Release candidate version might be unstable
- **Solution:** Try stable version or use Expo's built-in modal

## Quick Fix: Remove Native Modules Temporarily

If build still fails, try removing native modules temporarily:

```bash
npm uninstall @bam.tech/react-native-image-resizer react-native-date-picker
```

Then build again. If it works, we know one of these is the issue.

## Alternative: Use Expo-Compatible Packages

### Image Resizer
- Remove for now, add compression later via backend or Expo Image Manipulator

### Date Picker
```bash
npm uninstall react-native-date-picker
npx expo install @react-native-community/datetimepicker
```

### Modal
- Keep `react-native-modal` for now, or use React Native's built-in Modal

## Next Steps

1. **Check build logs** at the URL above (most important!)
2. **Identify the failing package** from error message
3. **Remove or replace** that package
4. **Try building again**

## Image Upload Strategy

Since we removed Cloudinary:
- Upload images to backend API
- Backend handles Cloudinary upload
- Frontend just sends image data to backend

This is actually a better approach for React Native!

---

**Action:** Check the build logs URL to see the exact error, then we can fix the specific package causing the issue.

