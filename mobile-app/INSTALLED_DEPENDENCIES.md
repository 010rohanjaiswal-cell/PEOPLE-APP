# Installed Dependencies - Complete List

## ✅ All Dependencies Installed for Future Phases

This document lists all React Native packages and dependencies that have been installed upfront to save time during EAS dev build and future development.

### Core Dependencies

#### Navigation & Routing
- ✅ `@react-navigation/native` - Core navigation library
- ✅ `@react-navigation/stack` - Stack navigator
- ✅ `@react-navigation/bottom-tabs` - Bottom tab navigator
- ✅ `react-native-screens` - Native screen components
- ✅ `react-native-safe-area-context` - Safe area handling
- ✅ `react-native-gesture-handler` - Gesture handling (required for navigation)
- ✅ `react-native-reanimated` - Animations (required for navigation)

#### State Management & Storage
- ✅ `@react-native-async-storage/async-storage` - Async storage for data persistence
- ✅ `expo-secure-store` - Secure storage for tokens
- ✅ `react-hook-form` - Form handling and validation

#### API & Networking
- ✅ `axios` - HTTP client for API calls
- ✅ `react-native-netinfo` - Network connectivity detection (for offline support)

#### Authentication
- ✅ `firebase` - Firebase SDK for Phone Authentication

#### Image Handling
- ✅ `expo-image-picker` - Image picker for camera/gallery
- ✅ `react-native-image-picker` - Alternative image picker
- ✅ `cloudinary` - Cloudinary SDK for image uploads
- ✅ `@bam.tech/react-native-image-resizer` - Image compression and resizing

#### UI Components
- ✅ `@expo/vector-icons` - Icon library
- ✅ `react-native-vector-icons` - Additional icons
- ✅ `react-native-modal` - Modal components
- ✅ `react-native-dropdown-picker` - Dropdown/select component
- ✅ `react-native-date-picker` - Date picker for verification form
- ✅ `react-native-toast-message` - Toast notifications for user feedback

#### Deep Linking & Web
- ✅ `expo-linking` - Deep linking for payment callbacks
- ✅ `expo-web-browser` - In-app browser for PhonePe payments

#### Development
- ✅ `expo-dev-client` - Development client for EAS builds
- ✅ `expo-status-bar` - Status bar component

### What's Included in EAS Build

All these packages are now included in the EAS dev build, so you won't need to rebuild when you:
- Add PhonePe payment integration (Phase 5)
- Add Cloudinary image uploads (Phase 5)
- Add date picker for verification (Phase 4)
- Add modals (Phase 3 & 4)
- Add deep linking for payments (Phase 5)
- Add offline support (Phase 5)
- Add toast notifications (All phases)

### Packages Not Installed (Will Install When Needed)

#### PhonePe SDK
- ⏳ PhonePe SDK - May require custom native module or web integration
  - Will install when implementing payment flow (Phase 5)
  - May use web-based integration instead of native SDK

### Usage Notes

#### Image Resizer
- Use `@bam.tech/react-native-image-resizer` for compressing images before Cloudinary upload
- Helps reduce upload time and storage costs

#### Date Picker
- Use `react-native-date-picker` for date of birth in verification form
- Works on both Android and iOS

#### Modal
- Use `react-native-modal` for all modals (Offers, Bill, Make Offer)
- Provides smooth animations and backdrop handling

#### Dropdown
- Use `react-native-dropdown-picker` for category and gender selection
- Better UX than native picker

#### Toast Messages
- Use `react-native-toast-message` for success/error feedback
- Better than Alert for non-critical messages

#### Deep Linking
- Use `expo-linking` for handling payment callbacks
- Configure in `app.json` when implementing payments

#### Network Info
- Use `react-native-netinfo` for offline detection
- Show offline indicator when connection is lost

### Next Steps

1. ✅ All dependencies installed
2. ✅ Ready for EAS dev build
3. ⏳ Build EAS dev client (in progress)
4. ⏳ Test Firebase configuration
5. ⏳ Continue with Phase 3: Client Features

### Rebuild Required When

You'll need to rebuild the EAS dev client only if:
- Adding new native modules (not in this list)
- Changing app configuration (app.json)
- Updating Expo SDK version
- Adding custom native code

### Time Saved

By installing all dependencies upfront:
- ✅ **No rebuild needed** when adding PhonePe integration
- ✅ **No rebuild needed** when adding Cloudinary uploads
- ✅ **No rebuild needed** when adding date picker
- ✅ **No rebuild needed** when adding modals
- ✅ **No rebuild needed** when adding deep linking
- ✅ **No rebuild needed** when adding offline support

**Estimated time saved: 2-3 hours** (avoiding multiple rebuilds)

---

**Last Updated:** December 2025  
**Status:** All future dependencies installed ✅

