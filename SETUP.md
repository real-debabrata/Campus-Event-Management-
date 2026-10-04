# Campus Events: shared version setup

## 1. Firebase (free Spark plan, no card)
1. console.firebase.google.com > Add project > "Campus Events".
2. Project home > web icon (</>) > register an app. Copy the firebaseConfig values.
3. Build > Authentication > Get started > enable Email/Password.
4. Build > Firestore Database > Create database > pick a nearby location > Production mode.
5. Firestore > Rules tab > paste the contents of firestore.rules > Publish.

## 2. Add your config
Open www/firebase-config.js and replace the placeholder values with yours.

## 3. Upload and build
1. Create a GitHub repository and upload this whole folder (keep the .github folder).
2. Actions > "Build APK" > Run workflow. Download the APK artifact when it finishes.
3. For the web version: Settings > Pages > Source: GitHub Actions, then Actions > "Deploy web version" > Run workflow.
4. Firebase console > Authentication > Settings > Authorized domains > add yourusername.github.io.

## 4. Use it
- Everyone creates an account (name, email, password).
- The organizer opens an event and taps "Share with team" to get a 6-letter code.
- Members tap Team > Join an event and enter the code.
- Team > "Notify me about" controls which alerts you get.

## Notes
- Alerts appear while the app is open or recently in the background. Android may stop a swiped-away app.
- For alerts to a closed app, turn on the ntfy option and have members install the free ntfy app and subscribe to the topic shown on the event page.
- Any member can edit the event. Only the organizer can delete it; other members leave it instead.
- Spark limits: 50K reads and 20K writes per day. If a cap is hit, writes pause until the next day.

## IMPORTANT: activate the workflows (one-time, 2 minutes)
GitHub only runs workflows from a folder named ".github/workflows". Dot-folders are hidden on many computers, so this zip ships it as "github/workflows". After uploading to GitHub, for EACH of the two files (build-apk.yml and pages.yml):
1. Open the file in your repository (github/workflows/...).
2. Click the pencil icon (Edit).
3. In the file name box at the top, change the path from "github/workflows/build-apk.yml" to ".github/workflows/build-apk.yml" (add the dot in front of github).
4. Click Commit changes.
Then the Actions tab will show "Build APK" and "Deploy web version".
