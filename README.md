# Campus Events: build the APK

## Option A: no installs, GitHub builds it for you
1. Create a new GitHub repository and upload everything in this folder (keep the .github folder).
2. Open the Actions tab, pick "Build APK", click Run workflow.
3. When it finishes (about 5 minutes), download "campus-events-apk" from the run page and unzip it.
4. Copy app-debug.apk to your phone and open it. Allow "Install unknown apps" if asked.

## Option B: build on your computer
Needs Node 20, JDK 17 and Android Studio.
    npm install
    npx cap add android
    npx cap sync android
    npx cap open android     (then Build > Build APK)

## Notes
- Data is stored on the phone (WebView storage). It stays after updates but is removed if you uninstall.
- The APK is a debug build for sideloading. For Play Store, create a signed release build.
- To change the app, edit www/index.html, then run `npx cap sync android` and rebuild.
