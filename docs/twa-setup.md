# FCO Ground TWA Setup

This document tracks the repo-side setup for launching `FCO Ground` as a Trusted Web Activity.

## Current Production URL

- Base URL: `https://fconlinemanual.vercel.app`

## Repo-Side Readiness

- PWA manifest exists at `apps/fconline/src/app/manifest.ts`
- Service worker exists at `apps/fconline/public/sw.js`
- Web push implementation exists in `apps/fconline/src/lib/appNotifications.ts`
- `maskable` icon entries were added to the manifest

## Asset Links

TWA requires a production file at:

- `https://fconlinemanual.vercel.app/.well-known/assetlinks.json`

Use this repo template as the starting point:

- `apps/fconline/public/.well-known/assetlinks.json.template`

Before renaming it to `assetlinks.json`, replace:

- `package_name`
- `PASTE_YOUR_RELEASE_KEY_SHA256_FINGERPRINT_HERE`

Recommended initial Android package name:

- `com.fcoground.app`

Current release fingerprint:

- `08:ED:79:DC:76:BC:33:F4:69:4C:FA:DB:42:3F:41:9D:61:5A:40:D5:A1:B2:BB:07:76:BA:59:92:CB:40:40:F3`

## Release Fingerprint

You will need the SHA-256 fingerprint of the Android signing key that will be used for the Play release.

Once the real fingerprint is available:

1. Keep `apps/fconline/public/.well-known/assetlinks.json` in sync with the release key
2. Deploy the web app
3. Verify `/.well-known/assetlinks.json` is publicly reachable over HTTPS

Current local signing material:

- Keystore path: `C:\Users\Rich\FConline\.local\android\fcoground-release.keystore`
- Alias: `fcoground`

## Continue On Another PC

1. Clone the repository and run `npm install`
2. Install JDK 17
3. Install Bubblewrap CLI
4. Install Android command-line tools and required SDK packages
5. Securely copy the existing release keystore to the new PC
6. Recreate `android/twa/local.properties` with the local SDK path
7. Keep using the same package name `com.fcoground.app`
8. Keep using the same release keystore and alias `fcoground`

Important:

- If the release keystore changes, you will not be able to continue shipping updates for the same Play app in the normal way.
- `android/twa/local.properties` and the keystore stay local and should not be committed.

## Android Wrapper Status

The Android/TWA wrapper now exists in:

- `android/twa`

Generated local outputs:

- Upload bundle: `android/twa/app-release-bundle.aab`
- Device test APK: `android/twa/app-release-signed.apk`

Local-only files:

- `android/twa/local.properties`
- `C:\Users\Rich\FConline\.local\android\fcoground-release.keystore`

## Remaining Release Steps

1. Deploy the web app so `/.well-known/assetlinks.json` is publicly served from `https://fconlinemanual.vercel.app`
2. Verify:
   - `https://fconlinemanual.vercel.app/.well-known/assetlinks.json`
   - `https://fconlinemanual.vercel.app/manifest.webmanifest`
3. Upload `android/twa/app-release-bundle.aab` to the Play Console
4. Start with Internal testing or Closed testing
5. Install on a real Android device and validate:
   - full-screen launch
   - push notification click-through
   - splash transition
   - deep link handling

## Play Console Checklist

- App name: `FCO Ground`
- Package name: `com.fcoground.app`
- Production origin: `https://fconlinemanual.vercel.app`
- Privacy policy URL: must be filled in Play Console
- Data safety form: must be completed in Play Console
- App icon/screenshots/feature graphic: prepare before review submission
- Closed testing requirement: verify your account's current Play requirement before requesting production access
