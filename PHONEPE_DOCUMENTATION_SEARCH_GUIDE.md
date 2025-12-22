# PhonePe Documentation Search Guide

## Current Issue
`NativeArgumentsParseException` when calling `PhonePe.startTransaction()` on Android with `null` as the second parameter.

## What to Search in PhonePe Documentation

### 1. **Method Signature Documentation**
Search for:
- "PhonePe React Native SDK startTransaction method signature"
- "startTransaction parameters Android"
- "React Native SDK v2 startTransaction"

**Where to look:**
- https://developer.phonepe.com/docs/react-native-sdk-integration-standard/
- https://developer.phonepe.com/v1/reference/react-native-sdk-integration-standard-2/

### 2. **Optional Parameters Handling**
Search for:
- "React Native SDK optional parameters Android"
- "startTransaction appSchema optional Android"
- "null parameter React Native bridge Android"

**Key Questions:**
- Is `appSchema` truly optional for Android?
- How should optional parameters be passed in React Native?
- Does the SDK have method overloading (different signatures)?

### 3. **Sample App Code**
Search for:
- "PhonePe React Native sample app GitHub"
- "pg-sdk-react-native-sample startTransaction"

**Repository:**
- https://github.com/PhonePe/pg-sdk-react-native-sample

**What to check:**
- How does the sample app call `startTransaction` on Android?
- What value do they pass for `appSchema` on Android?
- Do they use `null`, empty string, or omit the parameter?

### 4. **Known Issues / Troubleshooting**
Search for:
- "PhonePe React Native SDK NativeArgumentsParseException"
- "React Native SDK Android null parameter error"
- "startTransaction Android troubleshooting"

### 5. **SDK Version Specific**
Search for:
- "PhonePe React Native SDK v2 changelog"
- "SDK v2 vs v3 startTransaction differences"
- "react-native-phonepe-pg v2 documentation"

**Note:** We're using v2 from:
```
https://phonepe.mycloudrepo.io/public/repositories/phonepe-mobile-react-native-sdk/releases/v2/react-native-phonepe-pg.tgz
```

### 6. **Native Module Implementation**
If you have access to the SDK source:
- Check the native Android module (Kotlin/Java)
- Look for `@ReactMethod` annotations
- Check parameter types: `@Nullable String` vs `String`

## Current Implementation Details

**Our current call:**
```javascript
PhonePe.startTransaction(requestBodyString, '') // Empty string for Android
```

**Request body format:**
```json
{
  "orderId": "...",
  "merchantId": "M23OKIGC1N363",
  "token": "...",
  "paymentMode": {
    "type": "PAY_PAGE"
  }
}
```

## Questions to Ask PhonePe Support

1. What is the exact method signature for `startTransaction` in React Native SDK v2?
2. How should optional `appSchema` parameter be passed on Android?
3. Is there a method overload that doesn't require `appSchema`?
4. Are there any known issues with React Native bridge and null parameters?
5. Should we upgrade to SDK v3? What are the breaking changes?

## Alternative Approaches to Try

1. **Check if SDK has method overloading:**
   - Try calling with only one parameter: `PhonePe.startTransaction(requestBodyString)`
   - Check if there's a different method name for Android

2. **Use empty string instead of null:**
   - React Native bridge may handle empty string better than null
   - This is what we're currently trying

3. **Check SDK version:**
   - Consider upgrading to v3 if available
   - Check changelog for fixes related to Android parameter handling

4. **Contact PhonePe Support:**
   - They may have specific guidance for React Native bridge issues
   - They might provide a workaround or patch

