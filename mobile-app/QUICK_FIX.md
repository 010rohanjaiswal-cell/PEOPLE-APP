# Quick Fix - Create Expo Project

## The Problem
```
Experience with id 'dbd1d8c1-48ff-4212-967c-d57375791720' does not exist.
```

The Expo project/experience doesn't exist yet. We need to create it first.

## Quick Solution (2 minutes)

### Step 1: Create Project via Dashboard

1. Go to: https://expo.dev/accounts/010rohan/projects
2. Click "Create a project" or "New Project"
3. Name: `people-app`
4. Click "Create"
5. Copy the Project ID shown

### Step 2: Add Project ID to app.json

Open `mobile-app/app.json` and add:

```json
"extra": {
  "eas": {
    "projectId": "paste-your-project-id-here"
  }
}
```

### Step 3: Build Again

```bash
cd mobile-app
eas build --profile development --platform android
```

## Alternative: Interactive Command

If you prefer command line, run this (it will ask you questions):

```bash
cd mobile-app
eas init
```

Type `y` when asked to create project, then:

```bash
eas build --profile development --platform android
```

## Why This Happened

- The project ID in `app.json` was from a previous attempt
- The actual Expo project/experience was never created
- EAS needs the project to exist before building

## After Creating Project

✅ Build will work  
✅ All dependencies included  
✅ Configuration is ready  
✅ Just need the project to exist  

---

**TL;DR:** Create project at https://expo.dev/accounts/010rohan/projects, add ID to app.json, then build again.

