# Setting Up EAS Dev Build - Step by Step

## Why EAS Dev Build for This Project?

Since you're replicating a working web app and need Firebase Phone Auth, EAS Dev Build is the right choice:
- ✅ Full native support for Firebase Phone Auth
- ✅ Production-like testing environment
- ✅ All native modules work properly
- ✅ Better performance

## Prerequisites

- Expo account (free) - Sign up at https://expo.dev
- Android device or emulator
- Internet connection

## Step-by-Step Setup

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

Verify installation:
```bash
eas --version
```

### Step 2: Login to Expo

```bash
eas login
```

Enter your Expo account credentials. If you don't have an account:
1. Go to https://expo.dev/signup
2. Create free account
3. Run `eas login` again

### Step 3: Initialize EAS Project

```bash
cd mobile-app
eas build:configure
```

This will:
- Create `eas.json` file (already created for you)
- Link project to your Expo account
- Set up build configuration

### Step 4: Create Expo Project (if needed)

If prompted, create a new project:
```bash
eas init
```

This will ask for:
- Project name: "People App" or "people-app"
- Project ID: Will be auto-generated

### Step 5: Update app.json with Project ID

After `eas init`, you'll get a project ID. Update `app.json`:

```json
"extra": {
  "eas": {
    "projectId": "your-actual-project-id"
  }
}
```

### Step 6: Build Development Client

```bash
eas build --profile development --platform android
```

This will:
- Take 10-15 minutes (first time)
- Build a custom development client
- Upload to EAS servers
- Give you a download link

**Options during build:**
- Choose Android (press Enter)
- Build will start automatically

### Step 7: Download and Install

After build completes:

**Option A: Download from Dashboard**
1. Go to https://expo.dev/accounts/[your-account]/projects/people-app/builds
2. Find your development build
3. Download APK
4. Install on Android device

**Option B: Install Directly**
```bash
eas build:run --platform android
```

This will:
- Automatically install on connected device
- Or show QR code to scan

### Step 8: Start Development Server

```bash
npm start
```

Then:
1. Open the development client app on your device
2. It will automatically connect to Metro bundler
3. Your app will load

## Using the Dev Build

### Daily Development

1. **Start Metro:**
   ```bash
   npm start
   ```

2. **Open Dev Client:**
   - Open the custom dev client app on your device
   - It connects automatically

3. **Make Changes:**
   - Edit code
   - Save file
   - App reloads automatically (Fast Refresh)

### Rebuilding When Needed

You only need to rebuild when:
- Adding new native dependencies
- Changing app configuration (app.json)
- Updating native code

Rebuild command:
```bash
eas build --profile development --platform android
```

## Troubleshooting

### Issue: Build Fails

**Solution:**
- Check error message in EAS dashboard
- Common issues:
  - Missing environment variables
  - Invalid app.json configuration
  - Network issues

### Issue: Can't Connect to Metro

**Solution:**
1. Make sure device and computer are on same network
2. Check Metro bundler is running: `npm start`
3. Try: `npx expo start --tunnel` (uses Expo tunnel)

### Issue: Firebase Not Working

**Solution:**
1. Make sure `.env` file has all Firebase credentials
2. Verify Firebase project is active
3. Check SHA fingerprints are added in Firebase Console

### Issue: Build Takes Too Long

**Solution:**
- First build always takes 10-15 minutes
- Subsequent builds are faster (5-10 minutes)
- Use `--local` flag for local builds (requires more setup)

## Quick Commands Reference

```bash
# Login to Expo
eas login

# Configure project
eas build:configure

# Build development client
eas build --profile development --platform android

# Install on device
eas build:run --platform android

# Start development server
npm start

# View builds
eas build:list
```

## Cost

- **Free Tier:**
  - 30 builds/month
  - Unlimited development
  - More than enough for this project

## Next Steps After Setup

1. ✅ Dev build installed
2. ✅ Test Firebase configuration
3. ✅ Enable Phone Auth in Firebase Console
4. ✅ Add SHA fingerprints
5. ✅ Test Phone Auth flow
6. ✅ Continue with Phase 3: Client Features

## Alternative: Expo Go (Quick Test)

If you want to test UI quickly before setting up dev build:

```bash
npm start
# Press 'a' for Android
# Scan QR code with Expo Go app
```

**Limitations:**
- Firebase Phone Auth won't work properly
- Some native features limited
- But good for UI/navigation testing

## Recommendation

**Set up EAS Dev Build now** because:
1. You'll need it for Phone Auth anyway
2. Better testing experience
3. Only 15 minutes setup time
4. Free for development

Good luck! 🚀

