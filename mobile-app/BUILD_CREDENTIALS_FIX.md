# Build Credentials Fix

## Issue
```
Generating a new Keystore is not supported in --non-interactive mode
```

The build needs to generate Android signing credentials (keystore), but this requires interactive mode.

## Solution

### Option 1: Run Build Interactively (Recommended)

Run the build command **without** `--non-interactive` flag. It will prompt you to generate credentials:

```bash
cd mobile-app
eas build --profile development --platform android
```

When prompted:
- "Generate a new Android Keystore?" → Type `y` and press Enter
- It will generate and store the keystore automatically
- Build will continue

### Option 2: Generate Credentials First

1. **Generate credentials interactively:**
   ```bash
   cd mobile-app
   eas credentials
   ```
   - Select "Android"
   - Select "Set up new credentials"
   - Follow prompts

2. **Then build:**
   ```bash
   eas build --profile development --platform android --non-interactive
   ```

### Option 3: Use Local Credentials (Advanced)

If you have existing Android keystore:
1. Place keystore file in project
2. Configure in `eas.json`
3. Build will use local credentials

## What I've Done

✅ Updated `eas.json` to use remote credentials
✅ Set `credentialsSource: "remote"` in development profile
✅ Configured build type as APK

## Next Step

Run the build **interactively** (without `--non-interactive`):

```bash
cd mobile-app
eas build --profile development --platform android
```

This will:
1. Prompt you to generate keystore (type `y`)
2. Generate and store credentials automatically
3. Continue with the build

---

**Note:** This is a one-time setup. After credentials are generated, future builds can use `--non-interactive` flag.

