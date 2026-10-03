---
name: retrv-mobile
description: Manages Capacitor native bridge, Android Gradle builds, device permissions, native push registration, and mobile lifecycle integration in Retrv.
---

# Retrv Mobile Skill

> **Target:** Capacitor native runtime, Android platform configuration, native plugins, and mobile UX lifecycle.

---

## 1. Native Mobile Stack in Retrv

Retrv is packaged for Android using Capacitor (`@capacitor/core: ^8.5.2`, `@capacitor/android: ^8.5.2`):
- **Configuration:** `capacitor.config.ts` (App ID: `com.retrv.app`, App Name: `Retrv`).
- **Android Root:** `android/` (Gradle project, `android/app/build.gradle`, `AndroidManifest.xml`).
- **Installed Native Plugins:**
  - `@capacitor/push-notifications` (`pushNotificationService.ts`)
  - `@capacitor/status-bar` (`useTheme.ts`)
  - `capacitor-native-settings` (`useNotificationPreferences.ts`)
- **CI Build Workflow:** `.github/workflows/build-apk.yml` (Builds unsigned release and debug APKs).

---

## 2. Inviolable Mobile Rules

1. **Browser Testing Is Insufficient for Native Features:**
   - Push notifications, camera permissions, status bar styling, back-button handling, and deep links MUST be validated on an Android emulator or physical device.
   - Code must gracefully handle `Capacitor.isNativePlatform() === false` when running in desktop browsers.
2. **Capacitor Sync Discipline:**
   - Whenever dependencies are updated or native assets/plugins change, run `npx cap sync android` to ensure web assets and Gradle plugins are in sync.
3. **App Lifecycle & Backgrounding:**
   - The app must handle backgrounding, pausing, and resuming cleanly.
   - Ensure WebSocket connections in `useChat` or `useNotifications` reconnect cleanly upon app resume without leaving zombie listeners.
4. **Android Permissions:**
   - Any feature requiring runtime permissions (e.g., `POST_NOTIFICATIONS` on Android 13+) must check and request permissions via Capacitor plugins before attempting native registration.
5. **No Blind Gradle Mutations:**
   - Do not modify `android/build.gradle` or `android/app/build.gradle` without verifying compatibility with Capacitor version 8 and Android SDK targets (compileSdk 36, targetSdk 36).
