# GNS Android App (Play Store)

## Prerequisites
- Node.js 18+
- Java JDK 17+ (NOT JDK 25 — Gradle 8.11 is incompatible)
- Android command-line tools or Android Studio
- Google Play Developer account ($25)

## Quick Setup

### 1. Generate the Android project
```powershell
npx @bubblewrap/cli init --manifest="https://yourdomain.com/manifest.webmanifest"
```

You'll be prompted for:
- **Domain** — press Enter (default from manifest)
- **URL path** — press Enter (`/`)
- **App name** — press Enter
- **Short app name** — press Enter
- **Icon location** — press Enter
- **Theme color** — press Enter
- **Background color** — press Enter
- **Display mode** — select `standalone`
- **Orientation** — select `default`
- **Play Billing** — `n`
- **JDK install?** — `n`
- **JDK path** — enter the path to your JDK 17+ installation

### 2. Build a test APK (unsigned)
```powershell
npx @bubblewrap/cli build --unsigned
```

Output: `app/build/outputs/apk/debug/app-debug.apk`

### 3. Build a signed AAB (for Play Store)
```powershell
npx @bubblewrap/cli build
```

Output: `app-release-signed.apk` and `app-release-bundle.aab`

### 4. Install on phone (test APK)
```powershell
adb install app/build/outputs/apk/debug/app-debug.apk
```

## Digital Asset Links

After generating the keystore, get your SHA256 fingerprint:
```powershell
keytool -list -v -keystore android.keystore -storepass YOUR_PASSWORD | findstr "SHA256:"
```

Set it in your `backend/.env`:
```
ANDROID_PACKAGE_NAME=com.gns.app
ANDROID_SHA256_FINGERPRINT=AA:BB:CC:...your fingerprint...
```

Then deploy the backend so the `/.well-known/assetlinks.json` endpoint is live at your domain.

## Publishing Steps
1. Go to https://play.google.com/console
2. Create a new app
3. Fill in store listing (description, screenshots, etc.)
4. Upload the `.aab` file from `app/build/outputs/bundle/release/`
5. Complete the app content questionnaire
6. Submit for review
