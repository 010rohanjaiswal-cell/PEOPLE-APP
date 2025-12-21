# Cashfree App Whitelisting Guide

## ✅ Professional Solution: Whitelist Your App Package Name

The 403 Forbidden error is because Cashfree blocks WebView requests from non-whitelisted apps. **You can whitelist your app for development/testing without needing a Play Store link.**

## 📱 Your App Package Name

**Android Package:** `com.company.people`  
**iOS Bundle ID:** `com.company.people`

## 🔧 Steps to Whitelist in Cashfree Dashboard

### Step 1: Login to Cashfree Dashboard
1. Go to [https://merchant.cashfree.com](https://merchant.cashfree.com)
2. Login with your merchant account

### Step 2: Navigate to Whitelisting
1. Go to **Developers** section (or **Settings** → **Developers**)
2. Click on **Whitelisting** or **App Whitelisting**
3. Click **Add New** or **+ Add App**

### Step 3: Add Your App Package
1. **Whitelisting Type:** Select **"App package"** or **"Mobile App"**
2. **Package Name:** Enter `com.company.people`
3. **Platform:** Select **Android** (and iOS if needed)
4. **Purpose:** Select **"Development"** or **"Testing"**
5. **Description:** Enter something like:
   ```
   Development/testing for People App. App is in development phase, not yet published to Play Store.
   ```

### Step 4: Submit for Approval
1. Click **Confirm & Proceed** or **Submit**
2. Cashfree will review (usually within 24 hours, sometimes faster)
3. You'll receive email notification when approved

## ⚠️ Important Notes

### For Development/Testing:
- ✅ **You DON'T need Play Store link** for development whitelisting
- ✅ Just provide the package name: `com.company.people`
- ✅ Select "Development" or "Testing" as purpose
- ✅ Approval is usually faster for development apps

### For Production:
- ⚠️ Production whitelisting may require Play Store link
- ⚠️ But you can use development whitelisting until app is published
- ✅ Once app is on Play Store, update whitelisting to production

## 🎯 What Happens After Whitelisting

Once your app is whitelisted:
1. ✅ WebView will no longer get 403 errors
2. ✅ Payment page will load inside your app
3. ✅ Professional in-app payment experience
4. ✅ No external browser needed

## 📞 If You Need Help

If Cashfree support asks for Play Store link:
1. Explain: "App is in development, not yet published"
2. Mention: "We need whitelisting for testing/development"
3. Provide: Package name `com.company.people`
4. Request: Development/testing whitelisting approval

## ✅ After Whitelisting Approval

1. **No code changes needed** - your current code will work
2. **Test the payment flow** - WebView should load successfully
3. **Check logs** - Should see successful page load, no 403 errors

## 🔄 Alternative: Contact Cashfree Support

If the dashboard doesn't allow whitelisting without Play Store link:
1. Contact Cashfree support via email or chat
2. Explain you need development whitelisting
3. Provide package name: `com.company.people`
4. Request temporary whitelisting for testing

---

**This is the professional solution** - once whitelisted, your WebView integration will work perfectly without any external browser redirects!

