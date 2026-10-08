# Campus Events (CEM) 3.3.0

Plan campus events with your team: registrations, tasks, roles, UPI payment links, a chat inside every event and now expenses.
Runs as an Android app (APK built by GitHub, no installs) and as a website. Everything fits in the free plans of GitHub and Firebase (Spark).

## What's new in 3.3.0
- **Sign in or sign up with Google**, on the website and inside the Android app. One tap, no password, no emailed code (Google has already confirmed the address). Email and password still work exactly as before.
  - **Website:** a Google pop-up (it switches to a full-page redirect if the browser blocks pop-ups).
  - **Android app:** a pop-up cannot work inside an app, so the app uses the free `@capacitor-firebase/authentication` plugin to get a Google token and signs in to Firebase with it. The rest of the app is unchanged.
  - **Free, no card:** Google sign-in is part of Firebase Authentication on the Spark plan. Do not upgrade to "Identity Platform".
- **Firebase's public sign-up must be switched back ON.** Google can only create new accounts while it is on. The bot protection that 3.2.0 got from switching it off now comes from `firestore.rules`: the database accepts only accounts with a **confirmed email**. Google accounts and OTP-Worker accounts are always confirmed; a bot-made account never is, so it can read and write nothing.
- **Old email accounts** that were created before the code step existed (never confirmed) get a Firebase confirmation link the next time they sign in, then sign in again. This is free and built in.
- Sign-out also forgets the Google account in the APK, so the next sign-in shows the account chooser.
- New helper workflow **Show signing key fingerprint (SHA-1)**, because Firebase needs that SHA-1 for Google sign-in in the APK.
- Setup: **SETUP.md > Upgrade to 3.3.0** (about 25 minutes). Until the Android part is done, the website works and the APK still builds; only the Google button inside the APK will not work.

## What was new in 3.2.0
- **Email code (OTP) when creating an account.** Choose "Create account", enter name, email and password, and a 6-digit code is emailed to you. The account exists only after you type the code. **Signing in never asks for a code.**
  - Stops bots and mass junk accounts: nobody can create an account without a real inbox, and (until 3.3.0) Firebase's own public sign-up was switched off so the code step could not be skipped. From 3.3.0 the database rules do that job instead; see above.
  - Extra guards: codes expire in 10 minutes, 5 wrong tries lock a code, one code per email per minute, 5 codes per email and 10 per network per hour, throwaway-mail domains (mailinator and similar) are refused, and an optional free captcha (Cloudflare Turnstile) and college-email-only mode can be switched on.
  - Still **free, no card**: a small Cloudflare Worker (`worker/otp-worker.js`) sends the code through Brevo (300 emails a day free) and creates the Firebase account. Firebase stays on the Spark plan; there are no Cloud Functions.
  - Setup is a one-time job of about 30 minutes: **SETUP.md > Upgrade to 3.2.0**. Until it is done, "Create account" shows "Sign-up is not set up yet" (sign-in keeps working).
  - Old APKs (3.1.x) cannot create accounts through the code flow. Set `min` to `3.2.0` (or `3.3.0`) in Firestore > appconfig > version to ask people to update.

## What was new in 3.1.0
- **Expenses tab** (Event > Expenses).
  - *Budget*: add budget lines (Food, Venue, Decor...) with a planned amount. Each line shows spent, still to pay, what is left and a bar that turns red when you go over.
  - *Vendors and parties*: save who you pay, with an optional UPI ID and phone.
  - *Payments to vendors*: record what you owe or have paid. For a vendor with a UPI ID, **Pay via UPI** shows a QR code and an "Open UPI app" button with the amount filled in. **Mark paid** stores the mode and UTR.
  - *Items to buy*: build a shopping list (item, quantity, estimated cost, category) and **allocate each item to a member**. The member gets an alert, sees the item under **My tasks**, and marks it bought with the real cost. A "Who is buying what" table shows each member's share.
  - Who sees what: organizer, manager and treasurer manage budget, vendors and payments. Organizer, manager, treasurer and team lead add and allocate items. Everyone else sees only the items list.
- **Payment links belong to the event.** A link stops working at the end of the event day (organizers can keep it open up to 30 extra days under Payments > Link expiry), and when the event is deleted its links and the payments submitted through them are deleted too. Expiry is enforced by the Firestore rules, so an old link cannot be used even if someone saved the page.
- **Change your name**: Account menu > Account, alerts & join event > Your name. It updates your name in every event you are in.
- **Chat**: fixed the scrolling (the chat now fills the screen and only the message list scrolls, the keyboard no longer closes when a sync arrives, new messages no longer jump the list). **Tag members** by typing @ or tapping the @ button; tagged people get an alert (Chat mentions) and see the message outlined.
- **Close buttons** on the account / alerts panel, the join-event popup and the About popup. The account panel also closes with Esc or by tapping outside.

## What was new in 2.0.0
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
1. Create a new GitHub repository and upload everything in this folder (keep the .github and scripts folders).
2. **One time only:** create the permanent signing key (see "APK updates and signing" below). Without it the build stops with a clear error.
3. Open the Actions tab, pick "Build APK", click Run workflow (it also runs on every push to main).
4. When it finishes (about 5 minutes), download "campus-events-apk" from the run page and unzip it.
5. Copy campus-events-vX.Y.Z.apk to your phone and open it. Allow "Install unknown apps" if asked. Over an older version it shows "Update", not "Install".

### Option B: build on your computer
Needs Node 20, JDK 17 and Android Studio.

    npm install
    npx cap add android
    npx cap sync android
    npx cap open android     (then Build > Build APK)

## APK updates and signing
Android installs a new APK **over** the installed app only when all three are true:
1. same package name (`com.campus.events`),
2. signed with the **same key** as the installed app,
3. a **higher `versionCode`** than the installed app.

If any one fails, the phone shows "App not installed as package conflicts with an existing package", "package already installed" or just refuses the update.

### What was wrong and what changed
- The old workflow printed only a warning when the signing key was missing and carried on, so that build got a **random key**. Every build with a random key is a different "developer" to Android and can never update the previous one. It now **stops with an error** instead.
- The key was found only through the hidden default path `~/.android/debug.keystore`. `scripts/patch-android.sh` now writes the key path into `android/app/build.gradle` explicitly.
- `versionCode` used GitHub's `run_number`, which does not rise on a re-run and restarts at 1 in a new or copied repository, so a new APK could look older than the installed one. It is now the number of minutes since 1970: it always goes up.
- After building, the workflow runs `apksigner` and **fails if the APK is not signed with the permanent key**. The run summary shows the certificate fingerprint and the version code, so you can compare builds.

### One-time setup of the permanent key
1. Choose a long passphrase and **save it somewhere safe** (password manager). If it is lost, the key is lost.
2. GitHub repository > Settings > Secrets and variables > Actions > New repository secret. Name: `KEYSTORE_PASSPHRASE`, value: your passphrase.
3. Actions > **Create signing key (run once)** > Run workflow. It adds `signing/debug.keystore.gpg` (encrypted) to the repository. It refuses to overwrite an existing key. Never delete this file or change the secret afterwards.
4. Actions > **Build APK** > Run workflow. In the run page, open the summary and note the **signing certificate SHA-256**. It must be the same on every later build.

### One-time cleanup of the phone (only if updating already fails)
An app installed from a build that used a random key (or a different key) can never be updated. Remove it once, then install the new APK:
1. Optional: open the app and make sure your events are synced (shared events live in Firebase; events kept only on that phone are lost on uninstall).
2. Long-press the app > Uninstall (or Settings > Apps > Campus Events > Uninstall). If you use several profiles or a work profile, uninstall it in each.
3. Install the new `campus-events-vX.Y.Z.apk`.
4. From now on every APK from this repository installs as an **update** and keeps your data.

### Checks and troubleshooting
| What you see | Cause and fix |
| --- | --- |
| Build fails at "Restore permanent signing key": secret missing | Add `KEYSTORE_PASSPHRASE` (step 2 above), then run the build again. |
| Build fails: `signing/debug.keystore.gpg is missing` | Run "Create signing key (run once)". |
| Build fails: `gpg: decryption failed` | The secret does not match the passphrase used to create the key. Put back the original passphrase. If it is lost, delete `signing/debug.keystore.gpg`, set a new secret, run "Create signing key" again, and do the phone cleanup above once. |
| Build fails: `APK is NOT signed with the permanent key` | Something overrode the signing config. Check that `scripts/patch-android.sh` ran. |
| Phone still says package conflict | The installed app was signed with a different key. Do the phone cleanup once. |
| Phone says it cannot downgrade | The installed app has a higher `versionCode` than this APK (for example it came from a build made by someone else). Uninstall once. |
| Check from a computer (USB debugging on) | `adb shell dumpsys package com.campus.events | grep -E "versionCode|versionName"` shows the installed version. |

Notes: the app version people see (`APP_VERSION` in www/ui.js) and Android's `versionCode` are separate. Bump `APP_VERSION` for what users read; `versionCode` is set automatically on every build. If you build on your computer (Option B), make sure the same key is used, otherwise that APK cannot update one built by GitHub.

## Set up Firebase, chat and the website
Follow **SETUP.md** (Firebase project, rules, GitHub Pages, and the upgrade steps: "Upgrade to 2.0.0" (chat), "Upgrade to 3.1.0" (expenses, payment-link expiry, tagging) **"Upgrade to 3.2.0" (email-code sign-up)** and **"Upgrade to 3.3.0" (Google sign-in)**).

## Files
| Path | What it does |
| --- | --- |
| www/index.html | Main app: events, attendees, tabs |
| www/sync.js | Firebase sign-in, live sync, alerts |
| www/app2.js | Roles, tasks (with descriptions), people, payment links and their expiry |
| www/expenses.js | Budget, vendors, vendor payments, items to buy (new in 3.1.0) |
| www/chat.js | Event chat, @tagging, full-screen layout |
| www/ui.js | Menu bar, themes, version control. `APP_VERSION` lives here |
| www/splash.css, www/splash.js | Animated logo loader (new in 2.0.0) |
| www/login.html, www/pay.html | Sign-in and sign-up page (Google button; email sign-up asks for an emailed code), public payment page |
| www/firebase-config.js | Your Firebase keys, plus `OTP_API` (address of the OTP Worker) and the optional `TURNSTILE_SITE_KEY` |
| worker/otp-worker.js | Free Cloudflare Worker: emails the code, checks it, creates the account (new in 3.2.0). Never uploaded to the website; paste it into Cloudflare |
| worker/wrangler.toml | Optional settings file, only if you deploy from the command line |
| .github/workflows/build-apk.yml | Builds the APK with the permanent key, sets the version, verifies the signature |
| .github/workflows/create-signing-key.yml | Run once: creates and encrypts the permanent key |
| scripts/patch-google-signin.sh | Turns on the Google libraries in the generated Android project and writes `google-services.json` from the `GOOGLE_SERVICES_JSON` secret (new in 3.3.0) |
| .github/workflows/show-key-fingerprint.yml | Run once: prints the SHA-1 of your permanent key for Firebase (new in 3.3.0) |
| .npmrc | Stops npm from downloading an unused copy of the `firebase` package (new in 3.3.0) |
| scripts/patch-android.sh | Writes the signing key path and an ever-increasing versionCode into the generated Android project |
| signing/debug.keystore.gpg | Your encrypted permanent key. Never delete it |
| firestore.rules | Security rules (3.3.0: only confirmed emails may use the database). Paste into Firebase console > Firestore > Rules |

## Notes
- **Google sign-in and the confirmed-email rule (3.3.0).** `firestore.rules` has one switch, `requireVerifiedEmail()`, set to `true`. Leave it on. Turning it off while Firebase's public sign-up is on lets bots create accounts that can use your free Firestore quota.
- **Google sign-in in the APK needs three things to line up:** the SHA-1 of your permanent key registered in Firebase, the Android app registered with package name `com.campus.events`, and the `GOOGLE_SERVICES_JSON` secret downloaded *after* the first two. Phones without Google Play services cannot use the Google button (email sign-in still works).
- Event data is cached on the phone and synced through Firebase. Chat and payment links need a shared event.
- Budget, vendors, payments and items are stored inside the event document. The app hides the money sections from members who are not organizer, manager or treasurer, but everyone in the event can technically read the event document. Do not share an event code with people you do not trust with the budget.
- **Sign-up codes and free limits.** Brevo's free plan sends 300 emails a day, so at most about 300 codes a day (a resend is another email). Cloudflare's free plan is 100,000 requests a day and 1,000 stored writes a day; each code request uses 2 of those writes, so roughly 400 requests a day before it pauses. Nothing but sign-up is affected when a limit is reached: sign-in goes straight to Firebase.
- **What the code does and does not do.** It proves the person owns the email address and makes bulk sign-up slow and costly. It cannot stop someone who really owns many inboxes. Turn on the Turnstile captcha and `ALLOWED_EMAIL_DOMAINS` (for example your college domain) in the Worker for stronger protection.
- Keep the Firebase service-account key and the Brevo key only as Cloudflare secrets. Never put them in this repository. The `worker/` folder is not part of the website or the APK.
- The APK is a debug build for sideloading, signed with your permanent key so it updates in place. For Play Store, create a separate signed release build.
- To change the app, edit the files in www/, push to GitHub, and the workflow rebuilds the APK. Bump `APP_VERSION` in www/ui.js on every release.
