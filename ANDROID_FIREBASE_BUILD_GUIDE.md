# EduVault — Native Android Studio, Firebase & Release Build Guide

## 1. Project Overview & Architecture
- **App Name**: EduVault (`com.eduvault.wb`)
- **Target Audience**: West Bengal Board Students (WBCHSE Class 11–12 & WBBSE Class 9–10)
- **Architecture**: MVVM + Clean Architecture (`core/`, `data/`, `domain/`, `feature/`, `navigation/`)
- **Primary Tech Stack**: Kotlin 2.1, Jetpack Compose Material 3, Hilt DI, Room Offline DB, DataStore, WorkManager, Android `PdfRenderer`, Credential Manager Google Sign-In, Cloud Firestore, Firebase Storage, and Server-Side Gemini AI Assistant (`gemini-3.8-flash`).

---

## 2. Firebase & Google Sign-In Setup Guide

### Step 1: Register the Android App in Firebase Console
1. Open the [Firebase Console](https://console.firebase.google.com/) and select project **`gen-lang-client-0804708254`**.
2. Click **Add app** → **Android**.
3. Enter Android package name: `com.eduvault.wb`
4. Enter App nickname: `EduVault Android`

### Step 2: Generate SHA-1 and SHA-256 Fingerprints
Run the following command inside the `/android` directory to obtain your debug and release signing keys:
```bash
./gradlew signingReport
```
Or using `keytool` directly:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```
Copy both the **SHA-1** and **SHA-256** fingerprints into **Firebase Console → Project Settings → Your Apps → EduVault Android**. This is mandatory for **Android Credential Manager Google Sign-In** and **Firebase App Check (Play Integrity)**.

### Step 3: Download `google-services.json`
Download `google-services.json` from the Firebase Console and place it at:
```text
android/app/google-services.json
```

### Step 4: Enable Authentication Providers
In **Firebase Console → Authentication → Sign-in method**:
1. Enable **Google** provider and copy the **Web client ID** (`114503805647-8gfr4pogvcp7lt17b1futiv252dmorb8.apps.googleusercontent.com`) into `FirebaseAuthRepository.kt`.
2. Enable **Email/Password** provider so students can register with their email and password.

### Step 5: Firestore & Storage Security Rules Deployment
- **Firestore Database ID**: `ai-studio-93141b9e-a843-4d52-a757-98edfa67bb67`
- **Firestore Security Rules**: Located in `/firestore.rules` (enforces zero-trust RBAC, admin-only material uploads, and owner-isolated reading progress/bookmarks/annotations).
- **Storage Security Rules**: Located in `/storage.rules` (enforces 25MB max PDF size, `application/pdf` MIME check, and admin-only writes under `/eduvault/materials/{board}/{className}/{semester}/{subject}/{fileName}`).

---

## 3. APK & Release AAB Build Instructions

### Build Debug APK for Device Testing
```bash
cd android
./gradlew assembleDebug
```
Output APK location:
`android/app/build/outputs/apk/debug/app-debug.apk`

### Build Signed Production Release AAB (Google Play Store)
```bash
cd android
./gradlew bundleRelease
```
Output AAB location:
`android/app/build/outputs/bundle/release/app-release.aab`

### Run Unit & Security Tests
```bash
cd android
./gradlew testDebugUnitTest
```
