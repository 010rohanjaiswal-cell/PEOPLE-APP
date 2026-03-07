# Fix Play Store "Wrong Signing Key" – Use Your Approved Keystore

Production builds are now set to use **local credentials** (your `credentials.json` and keystore file). The AAB will be signed with whatever keystore is configured there.

**Google expects this certificate:**
```
SHA1: 2B:70:07:0B:18:1A:4F:6A:6C:D4:93:68:97:D8:F3:BD:1D:CD:15:F9
```

**Current situation:**
- The keystore at `credentials/android/keystore.jks` has **SHA1: 5D:0A:7B:CD:...** (not the approved one).
- So you must use the keystore file that has **SHA1 2B:70:07:0B:...** (the one Google approved).

---

## Step 1: Find the keystore with the approved SHA1

You likely have **`keystore/people-upload-key.jks`** (the one created for the upload key reset). Check its fingerprint:

```bash
cd "/Users/rohanjaiswal/Desktop/PEOPLE APP/mobile-app"
keytool -list -v -keystore keystore/people-upload-key.jks
```

Enter the keystore password when prompted. In the output, find **SHA1:**.

- If it is **2B:70:07:0B:18:1A:4F:6A:6C:D4:93:68:97:D8:F3:BD:1D:CD:15:F9** → that file is the approved key. Note the **alias name** (e.g. `upload` or `people-upload-key`).

---

## Step 2: Use that keystore for the build

**Option A – Use `people-upload-key.jks` in place**

1. Open **`credentials.json`** in the project root.
2. Set the path to the approved keystore and its details:
   - **keystorePath:** `keystore/people-upload-key.jks`
   - **keystorePassword:** the password for that keystore
   - **keyAlias:** the alias from Step 1 (from `keytool -list -v`)
   - **keyPassword:** the key password (often same as keystore password)

**Option B – Replace the file at the current path**

1. Copy your approved keystore over the current one:
   ```bash
   cp keystore/people-upload-key.jks credentials/android/keystore.jks
   ```
2. Open **`credentials.json`** and set **keystorePassword**, **keyAlias**, and **keyPassword** to match **people-upload-key.jks** (the alias from `keytool -list -v`).

---

## Step 3: Build the AAB

```bash
cd "/Users/rohanjaiswal/Desktop/PEOPLE APP/mobile-app"
npx eas build --platform android --profile production --non-interactive
```

The build uses **local** credentials, so it will sign the AAB with the keystore in `credentials.json`. Download the new AAB and upload it to Play Console; it should match the approved key.

---

## Summary

| Item | Value |
|------|--------|
| **Production credentials** | `eas.json` → `credentialsSource: "local"` (already set) |
| **Config file** | `credentials.json` (keystore path, password, alias, key password) |
| **Required SHA1** | `2B:70:07:0B:18:1A:4F:6A:6C:D4:93:68:97:D8:F3:BD:1D:CD:15:F9` |
| **Likely approved keystore** | `keystore/people-upload-key.jks` (verify with `keytool -list -v`) |

You must know the **keystore password** and **key alias** for the approved `.jks` file. If you don’t, use the same place you saved them when you created the keystore for the reset (e.g. password manager, secure note).
