# My Friend Bullet: Android app

The Android (Capacitor) build of **My Friend Bullet**. The game itself is not in this folder: it lives in the gamebox repo at [`games/my_friend_bullet`](../games/my_friend_bullet), and the website and this app run the same code.

`npm run build` copies the shared game into `www/`, and Capacitor bundles `www/` into the app. Never edit `www/` (it's regenerated every build); change the game in gamebox instead.

## What's in here

| File | What it is |
| --- | --- |
| `game.config.json` | Where the shared game lives |
| `build-www.mjs` | Builds `www/` from the shared game (turns the Flask page into plain HTML) |
| `native.js` | Android-only glue: back button (pause / resume / exit), pause when the app goes to the background, hides the fullscreen button and keyboard help |
| `capacitor.config.json` | App id, name, web dir |
| `android/` | The Android Studio project (landscape lock + fullscreen in `MainActivity.java`) |
| `assets/` | Source images for the app icon and splash screen |
| `store/` | Play Store listing: icon, feature graphic, screenshots and listing text (local only, git-ignored) |

## Setup

1. Install [Node.js](https://nodejs.org) and [Android Studio](https://developer.android.com/studio). No other Java is needed: the project builds with Android Studio's bundled JDK (Java 25).
2. In this folder:

   ```bash
   npm install
   ```

3. That's it. The app is **fully offline**: no leaderboard, no name entry, no internet permission. It keeps only the player's own high score on the phone. (The website keeps the verified global leaderboard; `main.js` switches between the two depending on whether the page has a leaderboard server, and the app build never gives it one.)

## Build tool versions

- Gradle **9.5.1** (in `android/gradle/wrapper/gradle-wrapper.properties`): the first Gradle line that runs on Java 25 *and* still works with the Android Gradle Plugin 8.13 that Capacitor 8 uses.
- Don't accept Android Studio's offers to upgrade **Gradle past 9.5** or **AGP to 9.x** for now: Gradle 9.6+ breaks AGP 8, and Capacitor's own Android libraries are built for AGP 8. Upgrade when Capacitor does (`npm install @capacitor/core@latest @capacitor/android@latest @capacitor/cli@latest`, then check Capacitor's upgrade guide).

## Day-to-day: making changes

Open the **`android/` folder** (not this folder) in Android Studio: File → Open → `my_friend_bullet_android/android`.

| You want to change... | Edit here | Then |
| --- | --- | --- |
| The game (gameplay, art, sounds, menus) | `gamebox/games/my_friend_bullet/` (shared with the website) | `npm run sync`, then Run ▶ in Android Studio |
| Android-only behaviour (back button, etc.) | `native.js` in this folder | `npm run sync`, then Run ▶ |
| Native Android stuff (permissions, orientation, fullscreen) | `android/app/src/main/` in Android Studio | Run ▶ |
| App name / id | `capacitor.config.json` + `android/app/src/main/res/values/strings.xml` | `npm run sync` |
| Icon / splash | `assets/icon-only.png` | `npm run assets` |

Don't edit `www/` or `android/app/src/main/assets/public/`: both are overwritten by `npm run sync`.

To run on your phone: turn on **Developer options → USB debugging**, plug it in, pick it in Android Studio's device list and press Run ▶. Or from the terminal:

```bash
npm run sync
cd android && ./gradlew installDebug    # needs JAVA_HOME pointing at Android Studio's JDK:
# export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
```

## Release to the Play Store

1. Bump `versionCode` (by 1 every upload) and `versionName` in `android/app/build.gradle`.
2. `npm run sync`
3. Android Studio → **Build → Generate Signed App Bundle** → **Android App Bundle (.aab)**.
   The first time, create a keystore. **Back up the keystore file and its passwords**: you need them for every future update. Never commit them (they're git-ignored).
4. Upload the `.aab` in [Play Console](https://play.google.com/console). Accept **Play App Signing** when asked.
5. Store listing graphics and text are in `store/` (local only, not in git).

For a plain `.apk` to share or sideload: **Build → Generate Signed App Bundle or APK → APK**.

Play Console will also ask for a privacy policy URL and the Data safety form. The app collects nothing (no internet access at all), so both are short: see `store/listing.md`.

## Icons and splash

`assets/icon-only.png` (1024×1024) is the game's thumbnail art (the player and the title), also used for the splash (`logo.png`). `icon-foreground.png` is the same full-bleed art (no padding or border), so the picture fills the whole launcher icon; the title still fits inside round masks. After changing them:

```bash
npm run assets
```

## Moving this folder

If you move this folder out of the gamebox repo, update `gameDir` and `sharedStaticDir` in `game.config.json` to point at `gamebox/games/my_friend_bullet` and `gamebox/static`.
