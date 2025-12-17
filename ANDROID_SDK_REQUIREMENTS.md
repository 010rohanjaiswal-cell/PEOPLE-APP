# Android SDK Requirements for PhonePe Integration

## ✅ Configuration Complete

All Android SDK requirements for PhonePe SDK integration have been configured.

## 📋 Requirements Met

### Development Environment
- ✅ **Android Studio**: Latest version recommended (user should have installed)
- ✅ **Android SDK**: Version 5.3.0 or higher (managed by Expo/EAS)
- ✅ **Java/Kotlin**: Basic knowledge required (handled by Expo)

### Project Configuration

| Requirement | Minimum | Configured | Status |
|------------|---------|-----------|--------|
| `compileSdkVersion` | 28+ | **34** | ✅ |
| `minSdkVersion` | 21+ | **21** | ✅ |
| `targetSdkVersion` | 28+ | **34** | ✅ |

## 🔧 Configuration Files

### 1. `app.json`
Android SDK versions are configured in the `android` section:
```json
{
  "android": {
    "compileSdkVersion": 34,
    "minSdkVersion": 21,
    "targetSdkVersion": 34
  }
}
```

### 2. `plugins/withPhonePeMaven.js`
The Expo config plugin ensures:
- ✅ PhonePe Maven repository is added to `build.gradle`
- ✅ SDK versions in `build.gradle` meet PhonePe requirements
- ✅ Versions are set to minimum required or higher

## 🚀 Build Process

When you build the app with EAS Build, the plugin will:
1. Add PhonePe Maven repository to project `build.gradle`
2. Verify/update SDK versions in app `build.gradle`:
   - `compileSdkVersion 34` (if not set or < 28)
   - `minSdkVersion 21` (if not set or < 21)
   - `targetSdkVersion 34` (if not set or < 28)

## 📝 Verification

To verify the configuration after build:

1. **Check `app.json`**:
   ```bash
   cat mobile-app/app.json | grep -A 5 "android"
   ```
   Should show: `compileSdkVersion: 34`, `minSdkVersion: 21`, `targetSdkVersion: 34`

2. **Check build logs**:
   When building with EAS, check the build logs for:
   - "PhonePe Maven repository added"
   - SDK version configurations

3. **Manual verification** (if using bare workflow):
   Check `android/app/build.gradle`:
   ```gradle
   android {
       compileSdkVersion 34
       defaultConfig {
           minSdkVersion 21
           targetSdkVersion 34
       }
   }
   ```

## ⚠️ Important Notes

1. **Expo Managed Workflow**: SDK versions in `app.json` are automatically applied during build. The config plugin ensures they're also in `build.gradle`.

2. **EAS Build**: EAS Build uses the latest Android SDK tools. The versions specified in `app.json` will be used during compilation.

3. **Minimum Versions**: The configured versions (34, 21, 34) exceed PhonePe's minimum requirements (28, 21, 28), ensuring compatibility.

4. **Build Required**: After updating SDK versions, you must rebuild the app:
   ```bash
   cd mobile-app
   eas build --profile development --platform android
   ```

## 🔗 References

- [PhonePe Android SDK Documentation](https://developer.phonepe.com/payment-gateway/mobile-app-integration/standard-checkout-mobile/android-sdk/introduction)
- [Expo Android Configuration](https://docs.expo.dev/versions/latest/config/app/#android)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

