# Create New Expo Project

## Issue
The project ID `abda32d0-d27c-4bfe-8052-81b60fcd0407` doesn't belong to your account (`010rohan`) or doesn't exist.

## Solution: Create New Project

### Option 1: Via Expo Dashboard (Recommended - 1 minute)

1. **Go to:** https://expo.dev/accounts/010rohan/projects
2. **Click:** "Create a project" or "New Project"
3. **Enter:**
   - Name: `people-app`
   - Slug: `people-app` (auto-filled)
4. **Click:** "Create"
5. **Copy the Project ID** shown
6. **Add to app.json:**
   ```json
   "extra": {
     "eas": {
       "projectId": "paste-new-project-id-here"
     }
   }
   ```
7. **Build:**
   ```bash
   eas build --profile development --platform android
   ```

### Option 2: Via Command Line (Interactive)

Run this command (it will ask you to create the project):

```bash
cd mobile-app
eas init
```

When prompted:
- "Would you like to create a project for @010rohan/people-app?" → Type `y`
- It will create the project and add the ID to `app.json` automatically

Then build:
```bash
eas build --profile development --platform android
```

## Current Status

- ✅ You're logged in as: `010rohan`
- ✅ Project ID removed from app.json (ready for new one)
- ✅ All code and dependencies ready
- ⏳ Need to create new project

## After Creating Project

Once you have a valid project ID in `app.json`, the build will work!

---

**Quick Fix:** Go to https://expo.dev/accounts/010rohan/projects and create a new project called "people-app"

