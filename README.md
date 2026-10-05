# Campus Events (CEM) 2.0.0

Plan campus events with your team: registrations, tasks, roles, UPI payment links and now a chat inside every event.
Runs as an Android app (APK built by GitHub, no installs) and as a website. Everything fits in the free plans of GitHub and Firebase (Spark).

## What's new in 2.0.0
- **Event chat.** Every shared event has a Chat tab, like a group chat. Names show their role, for example `Rohit (Treasurer)` and `Ronit (Member)`.
  - People who join later can read the whole history ("Load older messages" pages back 40 at a time).
  - Edit or delete your own message within 2 hours of sending. Organizer and managers can delete any message.
  - The chat is deleted together with the event.
  - Long messages are compressed to save space; the unread dot and alerts keep Firestore reads low.
- **Task descriptions.** Add a brief when you create a task (or later with "+ Brief"). It is folded by default; tap "Brief" to open or close it. Assignees see it in My tasks too.
- **Animated logo loader** while the app starts, on the app, sign-in and payment pages, so the first screen never looks blank.
- Roles, payment links and sign-in work as before.

## Build the APK
### Option A: no installs, GitHub builds it for you
1. Create a new GitHub repository and upload everything in this folder (keep the .github folder).
2. Open the Actions tab, pick "Build APK", click Run workflow (it also runs on every push to main).
3. When it finishes (about 5 minutes), download "campus-events-apk" from the run page and unzip it.
4. Copy app-debug.apk to your phone and open it. Allow "Install unknown apps" if asked.

### Option B: build on your computer
Needs Node 20, JDK 17 and Android Studio.

    npm install
    npx cap add android
    npx cap sync android
    npx cap open android     (then Build > Build APK)

## Set up Firebase, chat and the website
Follow **SETUP.md** (Firebase project, rules, GitHub Pages, and the step-by-step chat setup under "Upgrade to 2.0.0").

## Files
| Path | What it does |
| --- | --- |
| www/index.html | Main app: events, attendees, tabs |
| www/sync.js | Firebase sign-in, live sync, alerts |
| www/app2.js | Roles, tasks (with descriptions), people, payment links |
| www/chat.js | Event chat (new in 2.0.0) |
| www/ui.js | Menu bar, themes, version control. `APP_VERSION` lives here |
| www/splash.css, www/splash.js | Animated logo loader (new in 2.0.0) |
| www/login.html, www/pay.html | Sign-in page, public payment page |
| firestore.rules | Security rules. Paste into Firebase console > Firestore > Rules |

## Notes
- Event data is cached on the phone and synced through Firebase. Chat needs a shared event.
- The APK is a debug build for sideloading. For Play Store, create a signed release build.
- To change the app, edit the files in www/, push to GitHub, and the workflow rebuilds the APK. Bump `APP_VERSION` in www/ui.js on every release.
