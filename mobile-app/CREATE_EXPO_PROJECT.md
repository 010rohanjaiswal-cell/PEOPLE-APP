# Create Expo Project - Manual Steps

## Issue
The Expo experience/project doesn't exist yet. We need to create it first before building.

## Solution: Create Project Manually

### Option 1: Create via Expo Dashboard (Easiest)

1. **Go to Expo Dashboard:**
   - Visit: https://expo.dev/accounts/010rohan/projects

2. **Create New Project:**
   - Click "Create a project" or "New Project"
   - Project name: `people-app`
   - Slug: `people-app` (should auto-fill)
   - Click "Create"

3. **Get Project ID:**
   - After creation, you'll see a Project ID
   - Copy this ID

4. **Update app.json:**
   - Add the project ID to `app.json`:
   ```json
   "extra": {
     "eas": {
       "projectId": "your-new-project-id-here"
     }
   }
   ```

5. **Build Again:**
   ```bash
   cd mobile-app
   eas build --profile development --platform android
   ```

### Option 2: Create via Command Line (Interactive)

Run this command in your terminal (it will prompt you):

```bash
cd mobile-app
eas init
```

When prompted:
- "Would you like to create a project for @010rohan/people-app?" → Type `y` and press Enter
- It will create the project and update `app.json` automatically

Then build:
```bash
eas build --profile development --platform android
```

### Option 3: Use Existing Project ID (If You Have One)

If you have an existing Expo project ID, add it to `app.json`:

```json
"extra": {
  "eas": {
    "projectId": "your-existing-project-id"
  }
}
```

## Quick Steps Summary

1. **Create project** (via dashboard or `eas init`)
2. **Get project ID**
3. **Add to app.json** (if not auto-added)
4. **Run build:**
   ```bash
   eas build --profile development --platform android
   ```

## After Project is Created

Once the project exists, the build will work. The build includes:
- ✅ All dependencies we installed
- ✅ Proper Babel configuration
- ✅ All plugins configured
- ✅ Firebase configuration ready

## Current Configuration Status

- ✅ `babel.config.js` - Created and configured
- ✅ `app.json` - Ready (just needs project ID)
- ✅ All dependencies - Installed
- ✅ EAS config - Ready
- ⏳ Expo project - Needs to be created

---

**Next Step:** Create the Expo project using one of the options above, then run the build command again.

