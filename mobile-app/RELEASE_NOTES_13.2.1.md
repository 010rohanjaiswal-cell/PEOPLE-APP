# People App — Release Notes

## Version

- **App version**: `13.2.1`
- **Android versionCode**: `16`
- **Build artifact (local)**: `mobile-app/android/app/build/outputs/bundle/release/app-release.aab`

---

## Highlights (what changed)

### Freelancer — job preference notifications (new)

- **Settings → Job notifications**: freelancers can choose a job category they care about and get alerted when new matching jobs are posted (when they have no active assigned job).
- Description copy: *“You'll be notified for every new jobs of your preference.”*
- Selected category appears **in place of** “Select preference” (not as a second line below).

### Category picker (searchable list)

- Replaced grid-style picking with a **scrollable list** of all categories and subcategories.
- **Search** at the top filters the list by name.
- **Delivery** and **Mechanic**: parent row plus indented subcategories (e.g. Two Wheeler, Bike). Choosing the parent **or any sub** saves as that parent so alerts cover **all** jobs in that group.
- **Other**: no generic “Other” parent — only specific trade/skill options (e.g. Interior decorator, Welder) are listed and saved individually.
- **Clear preference** at the bottom of the list removes the selection.

### Picker UX

- Modal **closes immediately** after tap; preference saves in the background (no wait on network).
- **Press feedback**: dark/light overlay animation on each row while tapping.
- Success uses the same **in-app toast** as the rest of the freelancer dashboard (no system alert dialog).

### Notifications — vibration

- **Job preference alerts** (`job_preference_alert`) use a **double vibration** pattern (two pulses).
- Dedicated Android notification channel for preference alerts; foreground push and in-app socket delivery both respect the pattern (with deduplication).

### Backend

- Job preference API: `GET/PUT /api/freelancer/preferences/job-category`
- Notifications batch when matching jobs are posted (every 3rd new post in the preferred category, while freelancer has no active job).
- Preference matching supports parent categories (Delivery / Mechanic) and specific Other subcategories.
- Fix: restored `isValidMainCategory` export so the server starts correctly on deploy.

### Settings version display

- Client and Freelancer Settings show **`13.2.1 (16)`**, from `src/constants/appVersion.js`.

### Android release build

- Version bumped in `app.json`, `android/app/build.gradle`, and `package.json`.
- Rebuild: `cd mobile-app && npm run android:release-aab`

---

## For Play Console (short)

Use this in “What’s new”:

```
• Freelancers: set a job category preference in Settings and get notified for new matching jobs
• Searchable category list with Delivery, Mechanic, and skill-specific options
• Smoother preference picker with instant save and clearer tap feedback
• Double vibration for job preference alerts
• Stability fixes for notifications backend
```

---

## Notes / Known items

- Preference alerts fire when you have **no active assigned job**; counts reset when you change or clear preference.
- Delivery / Mechanic selections always apply to **all** sub-types in that category.
- Other preferences apply only to the **exact** skill you pick, not all “Other” jobs.
- Deploy backend changes to Render for preference save and push alerts to work in production.
- Gradle may show dependency deprecation warnings; release AAB build still succeeds.
