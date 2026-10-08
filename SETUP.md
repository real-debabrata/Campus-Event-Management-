# Campus Events: shared version setup

## 1. Firebase (free Spark plan, no card)
1. console.firebase.google.com > Add project > "Campus Events".
2. Project home > web icon (</>) > register an app. Copy the firebaseConfig values.
3. Build > Authentication > Get started > enable Email/Password. (From 3.3.0 also enable Google: see "Upgrade to 3.3.0".)
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
- Everyone creates an account (name, email, password) and confirms it with a 6-digit code emailed to them (3.2.0 and later, see "Upgrade to 3.2.0"). Signing in never asks for a code.
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

## Public payment links (update)
1. Firestore > Rules: paste the new firestore.rules and Publish (required, the old rules block payment pages).
2. Replace/add in www/: app2.js, sync.js, pay.html (and firebase-config.js if you set PAY_BASE).
3. Run "Deploy web version" so pay.html goes live, then rebuild the APK.
4. In the app: Event > Payments > Create a payment link > copy or share the link. Payers need no account.
5. Old payment forms made before this update have no public page. Delete and recreate them.

## Sign-in page (update)
- login.html is now a separate sign-in and sign-up page. The app (index.html) redirects there until you sign in.
- Sign-in sticks on the device, so the app opens and works offline afterwards. The first sign-in needs internet.
- Update these files in www/: index.html, sync.js, app2.js, and add login.html. Firestore rules are unchanged.

## Upgrade to 2.0.0: event chat, task descriptions, loading screen

### Files to upload
In `www/` replace: index.html, sync.js, app2.js, ui.js, login.html, pay.html.
In `www/` add (new): chat.js, splash.css, splash.js.
In the repo root replace: firestore.rules, package.json, README.md, SETUP.md.
Delete `www/firestore.rules` if you still have it. It is an old, outdated copy; the real one is `firestore.rules` in the repo root.

### Set up the chat, free (about 10 minutes)
Chat reuses the Firebase project, sign-in and Firestore database you already have. There is nothing to buy or switch on: no Blaze plan, no card, no Cloud Functions, no Storage.
1. Open console.firebase.google.com > your project > Build > Firestore Database > Rules.
2. Select everything in the editor, paste the new `firestore.rules` from the repo root, click Publish. (Skip this and the Chat tab shows "Could not load messages (permission-denied)".)
3. No index is needed. Firestore creates the one the chat uses on its own.
4. Upload the files above to GitHub and commit to main. The "Build APK" workflow runs by itself. For the website, run Actions > "Deploy web version" > Run workflow.
5. Optional: in Firestore > Data > appconfig > version, set `latest` to 2.0.0 (and `notes`) so phones with an older APK get the update banner.
6. Test it:
   - Open a shared event > Chat tab > send a message.
   - Sign in on a second device or browser, join with the event code, open Chat. The old messages are there.
   - Tap one of your messages > Edit or Delete. After 2 hours these buttons disappear, and Firestore refuses the change as well.
   - Delete a test event, then check Firestore > Data: the event and its `chat` messages are both gone.

### How the chat works
- Messages live in Firestore at `events/{code}/chat/{message}`. The rules reuse the event's member list, so only members can read or write, and viewers can read but not post.
- Each message stores only: sender id (`u`), name (`n`), text (`t`), server time (`at`), and `ed` when edited. The name must match the member's name in the event and the time is set by the server, so nobody can impersonate or back-date.
- Roles in brackets are read live from the event's member list, so they update when a role changes.
- Messages of 120+ characters are deflate-compressed and stored as bytes when that saves at least 15%. Short messages stay plain text because compressing them would make them bigger.
- Deleting an event: Firestore does not remove sub-collections on its own, so the organizer's app deletes the chat messages first and then the event. If that fails (for example no internet), the event comes back so you can delete it again.
- Alerts: with the Chat tab closed, the app watches only the newest message of each event to show an unread dot and a notification. Under Team > "Notify me about", "Chat messages" turns these on or off. If the ntfy option is on, a "new chat message from NAME" ping (never the message text) is also sent to the event's ntfy topic for closed apps.
- To show "Cashier" instead of "Treasurer", change `treasurer:'Treasurer'` to `treasurer:'Cashier'` on the second line of `www/app2.js`.

### Free-plan budget (Spark: 50,000 reads, 20,000 writes, 20,000 deletes per day, 1 GiB stored)
- Opening a chat reads up to 40 messages. "Load older messages" reads up to 40 more each time.
- Each message sent is 1 write. Every member whose app is open reads it once, so reads are about `messages x active members`.
  Example: 20 members and 150 messages in a day is about 150 writes and 3,000 reads.
- Security rule checks also count as reads. Reads and writes are the limit to watch, not storage: 1 GiB holds millions of short messages.
- Deleting an event with a long chat costs one read and one delete per message.
- If a daily limit is reached, the affected action pauses until the quota resets. Watch Firebase console > Firestore > Usage.

### Task descriptions
- Create a task with the optional "Description for the assignee" box, or tap "+ Brief" on an existing task.
- The brief is folded to save space. Tap "Brief" to open or close it. The task's creator, team leads, managers and the organizer can edit it ("Edit brief").
- The assignee sees it under Tasks and under My tasks. Max 600 characters.

### Loading screen
- The animated logo shows on index.html, login.html and pay.html while the page boots, for at least about 1.2 seconds on the first open and 0.5 seconds after.
- Look and timing: `www/splash.css` and `www/splash.js` (the `MIN` value).

## Upgrade to 3.1.0: expenses, payment-link expiry, name change, chat tagging

Everything stays on the free Spark plan. There is no new service, no Cloud Functions, no Blaze plan and no card.

### Files to upload
In `www/` replace: index.html, sync.js, app2.js, chat.js, ui.js, pay.html.
In `www/` add (new): expenses.js.
In the repo root replace: firestore.rules, package.json, README.md, SETUP.md.
Not changed: login.html, splash.css, splash.js, firebase-config.js, vendor/, the workflows.

### Steps (about 10 minutes)
1. **Publish the new rules first.** Firebase console > Firestore Database > Rules > select everything, paste the new `firestore.rules` from the repo root > Publish. The new rules do three things: members can tag members in chat, payment links carry an expiry (`until`) and stop working when it passes or the event is gone, and payers cannot submit to a dead link.
2. **Upload the files** above to GitHub and commit to main. The "Build APK" workflow starts by itself and builds 3.1.0 (the version comes from `APP_VERSION` in www/ui.js).
3. **Deploy the website.** Actions > "Deploy web version" > Run workflow. This puts the new `pay.html` (the "link expired" message) and the web app live.
4. **Tell the app a new version exists.** Firebase console > Firestore > Data > `appconfig` > `version`: set `latest` to `3.1.0` and add `notes`. Also set `min` to `3.1.0` if you want to block old APKs: from step 1 on, a 2.x app can no longer create payment links (the rules now require the expiry that only 3.1.0 writes).
5. **Open the new app once as the organizer (or treasurer).** Payment links made before 3.1.0 have no expiry, so they would stay open forever. The app stamps the expiry on them automatically the first time an organizer, manager, treasurer or the link's creator opens it (one read per old link, once per device). Check one in Firebase console > Firestore > Data > `payforms` > a document > field `until`.
6. **Test it** (use a test event):
   - *Name*: avatar menu > Account, alerts & join event > change "Your name" > Save. The avatar letter, the People table and new chat messages use the new name on every device.
   - *Close buttons*: the account / alerts panel, the join popup (avatar menu or "Join team") and the About popup each have a ✕. The account panel also closes with Esc or a tap outside.
   - *Chat scrolling*: open a shared event > Chat. The page no longer scrolls; the message list does. Open the keyboard, type, and have someone send a message from another device: the keyboard stays open and the list stays where it was.
   - *Tagging*: type `@` (or tap the @ button), pick a member. On the other device the message is outlined and a "tagged you" alert appears (Account > Notify me about > Chat mentions).
   - *Budget*: Event > Expenses > add budget lines.
   - *Vendor payment*: add a vendor with a UPI ID, add a payment "To pay", tap Pay via UPI, then Mark paid with a UTR. The Spent and Left numbers move.
   - *Items*: add an item and allocate it to a member. That member sees an alert and the item under My tasks. They tap Mark bought and enter the real cost.
   - *Payment link expiry*: create a payment link and open it in a private window. Set the event date to yesterday (Edit event): after a few seconds, reload the link. It shows "This payment link has expired", and the Payments tab shows "Expired". Set the date back, or use Payments > Link expiry > "Keep links open" for extra days, and it works again.
   - *Event deletion*: delete the test event. In Firestore > Data, the `events` document, its `chat` messages, the event's `payforms` documents and their `subs` are all gone. The old link now shows "expired".

### How it works
- **Name change.** Firebase sign-in keeps your display name; the app also copies it into `members.<your id>.name` of each event you are in, because the chat rules compare a message's name with that field. Old chat messages keep the name they were sent with.
- **Expenses data** lives in the event document as four map fields: `bud` (budget lines), `ven` (vendors), `exp` (payments to vendors), `itm` (items to buy). Each entry is its own field (`itm.<id>`), so two people editing different items never overwrite each other, the same way payment links already work. It syncs and works offline like the rest of the event, and adds no reads. A Firestore document holds up to 1 MiB, which fits well over a thousand entries.
- **Spent / to pay.** Spent = vendor payments marked paid + bought items at their real cost. Still to pay = unpaid vendor payments + items not bought yet at their estimate. Left = budget - spent - still to pay. Entries without a category are counted in the totals and shown as "No category".
- **Payment link expiry.** Each `payforms` document stores `until` (milliseconds). It is the end of the event day plus the optional "keep links open" days (Payments > Link expiry, 0 to 30; stored in the event's `pay.grace`). When the event date or the extra days change, the app updates `until` on all of the event's links. The rules (`liveForm` in firestore.rules) make a link unreadable and unsubmittable once `until` has passed **or** the event document no longer exists, so a link also dies at once if a clean-up could not finish.
- **Clean-up on delete.** Firestore does not remove sub-collections on its own. When the organizer deletes an event, the app deletes the chat messages, then each payment link with its submissions, then the event. If anything fails (for example no internet) the event comes back and you can delete it again. Deleting a single payment link also deletes its submissions (the app asks first).
- **Tagging.** A tagged message stores a list `m` of member ids next to its text. The rules accept only ids of people in the event (max 20). The mention alert follows "Chat mentions" in the account panel, not "Chat messages".
- **Chat layout.** In the Chat tab the app adds the class `chatmode` to the page: the event card is hidden, the page cannot scroll, and the chat card is sized to the visible area (`visualViewport`, so it follows the phone keyboard). When the keyboard is open the bottom menu is hidden.

### Free-plan budget (Spark: 50,000 reads, 20,000 writes, 20,000 deletes per day)
- Expenses: one write per change (adding an item, ticking it bought, editing a budget amount). Members already read the event document, so there are no extra reads.
- Name change: one write per event you are in.
- Tagging: no extra reads or writes (it is a field on the message).
- Payment links: a payer opening a link is 1 read (plus the rules' event check, billed as a read) and a submission is 1 write with a few rule reads. Deleting an event or a link costs one read and one delete per submission.
- Deleting an event with a long chat and many submissions can use a few hundred operations in one go. That is fine within the daily limits. Watch Firebase console > Firestore > Usage.

## Upgrade to 3.2.0: email-code (OTP) sign-up, free

Stops bots and mass junk accounts. A new account is created only after the person types a 6-digit code sent to their email. Signing in does **not** ask for a code.

Everything here is free and needs **no credit card**: Brevo (email, 300 a day), Cloudflare Workers (the small server), and Firebase stays on Spark. Firestore rules are unchanged.

### Why it needs a small server
Firebase's sign-up call is public: any bot with your web API key can create accounts without ever opening your app. A code check inside the page would not help, because a bot would simply skip the page. So the plan is:
1. A free Cloudflare Worker (`worker/otp-worker.js`) emails the code, checks it, and creates the account with admin rights.
2. You switch off **Firebase's own sign-up**. From then on the Worker is the only way to create an account, and it does so only after the correct code.

### Files
In `www/` replace: login.html, firebase-config.js (it keeps your Firebase values and adds two lines; see step 5), ui.js.
In the repo root add (new): the `worker/` folder (otp-worker.js, wrangler.toml). Replace: package.json, README.md, SETUP.md.
The `worker/` folder is never published: the website deploys only `www/`, and the APK uses only `www/`.

### Steps (about 30 minutes, in this order)

**1. Brevo: the free email sender**
1. Create a free account at brevo.com (no card).
2. Open Senders, Domains & Dedicated IPs > Senders > add a sender with an email address you own, and click the verification link Brevo emails you. This is the "from" address of the codes.
3. Open SMTP & API > API Keys > Generate a new API key. Copy it. You will paste it into Cloudflare in step 3.
Tip: an address on your own domain is less likely to land in spam than a free Gmail address. While testing, always check the Spam folder.

**2. Firebase: a key that lets the Worker create accounts**
1. Firebase console > gear icon > Project settings > Service accounts > Generate new private key. A .json file downloads.
2. Open it in a text editor. You will paste the whole text into Cloudflare in step 3.
3. This file is a password for your project. Never upload it to GitHub or share it. Delete it from your computer after step 3 if you like (you can always generate a new one).

**3. Cloudflare: the Worker**
1. Create a free account at dash.cloudflare.com (no card).
2. Storage & databases > Workers KV > Create a namespace, name it `cem-otp`.
3. Workers & Pages > Create > Create Worker > name it `cem-otp` > Deploy. Then click Edit code, select everything, paste the contents of `worker/otp-worker.js`, and Deploy.
4. Open the Worker > Settings > Bindings > Add > KV namespace. Variable name `OTP_KV`, namespace `cem-otp`.
5. Settings > Variables and Secrets > add these (type "Secret" for the first three, "Text" for the rest), then Deploy:

   | Name | Type | Value |
   | --- | --- | --- |
   | FIREBASE_SA | Secret | the whole text of the .json file from step 2 |
   | BREVO_API_KEY | Secret | the key from step 1 |
   | OTP_PEPPER | Secret | any long random text (30+ characters). Make one up and keep it |
   | FROM_EMAIL | Text | the sender address you verified in Brevo |
   | FROM_NAME | Text | Campus Events |
   | ALLOWED_ORIGINS | Text | `https://cem.deva.indevs.in,https://YOUR_USERNAME.github.io,https://localhost,capacitor://localhost` (your website addresses, then the Android app. Use your real ones, no trailing slash or path) |
   | ALLOWED_EMAIL_DOMAINS | Text, optional | e.g. `yourcollege.edu.in` to accept only college addresses |

6. Copy the Worker address shown at the top (like `https://cem-otp.yourname.workers.dev`). Open it in a browser: you should see `{"ok":true,"service":"campus-events-otp"}`.

Prefer the command line? `worker/wrangler.toml` lists the same settings and the commands.

**4. Optional but recommended: free captcha (Cloudflare Turnstile)**
It makes bots solve a check before they can trigger an email, and it protects your free email and storage allowance from being used up by spam.
1. Cloudflare dashboard > Turnstile > Add widget. Hostnames: your website host (for example `cem.deva.indevs.in`), `YOUR_USERNAME.github.io` and `localhost` (for the Android app). Mode: Managed.
2. Copy the **Site key** into `TURNSTILE_SITE_KEY` in `www/firebase-config.js` (step 5).
3. Add the **Secret key** to the Worker as a Secret named `TURNSTILE_SECRET`, then Deploy.
Set both or neither. The captcha has not been tested inside the Android app on a real phone; if it does not appear in the APK, check that `localhost` is in the widget's hostnames.

**5. Point the app at the Worker**
1. Open `www/firebase-config.js`. Replace `https://cem-otp.YOUR_SUBDOMAIN.workers.dev` in `window.OTP_API` with your Worker address from step 3.6 (no trailing slash). Leave your Firebase values as they are.
2. Upload the files listed above to GitHub and commit to main. "Build APK" starts by itself.
3. Actions > "Deploy web version" > Run workflow, so the new login page goes live on the website.

**6. Test before switching anything off**
1. Open the website > Create account > enter name, email, password > Send verification code.
2. The email arrives within a minute (check Spam). Enter the code. You should land in the app.
3. Firebase console > Authentication > Users: the new user is listed with your name.
If it fails, see Troubleshooting below. Do not do step 7 until this works.

**7. Switch off Firebase's public sign-up (this is what stops the bots)**
> **Superseded in 3.3.0.** Google sign-in cannot create new users while this is switched off, so 3.3.0 asks you to switch it back **on** and moves the bot protection into `firestore.rules`. If you have not done this step yet, skip it and follow "Upgrade to 3.3.0" instead.

1. Firebase console > Authentication > Settings > User actions > untick **Enable create (sign-up)** > Save.
2. Test again: create another account through the app. It still works, because the Worker creates it with admin rights.
3. Prove the back door is shut: open the login page, press F12 > Console and run
   `firebase.auth().createUserWithEmailAndPassword('bot@example.com','123456')`
   It must fail with `auth/admin-restricted-operation`. Existing users and normal sign-in are not affected.

**8. Update old apps**
Old APKs (3.1.x) try to create accounts directly and now get an error. In Firebase console > Firestore > Data > `appconfig` > `version`, set `latest` to `3.2.0` (and `notes`), and set `min` to `3.2.0` to require the update.

### Troubleshooting
| What you see | Cause and fix |
| --- | --- |
| "Sign-up is not set up yet. Add the OTP service address..." | `OTP_API` in firebase-config.js still has the placeholder, or the new file was not deployed. |
| "This site is not allowed to use the sign-up service." | The address you opened is missing from `ALLOWED_ORIGINS` (scheme and host only, for example `https://cem.deva.indevs.in`). |
| "Sign-up is not set up yet. Please tell the admin." | A Worker setting is missing. Worker > Logs shows `Missing settings: ...`. |
| "Could not send the email." | Brevo sender not verified, wrong `BREVO_API_KEY`, or the 300 a day limit was reached. Worker > Logs shows Brevo's reason. |
| "Could not reach the account service." | `FIREBASE_SA` is not the full JSON, or it belongs to a different Firebase project. Generate a new key from the right project. |
| "Security check failed" | Turnstile site key and secret are from different widgets, or the site is missing from the widget's hostnames. |
| Email in Spam | Common with free sender addresses. Use an address on your own domain, and ask users to mark it "Not spam". |
| "Too many requests" or "Please wait" | The built-in limits (below) working as intended. |

### How it works
- **Send.** The app calls `POST /send` with the name and email (never the password). The Worker rejects bad or throwaway addresses, checks the captcha if enabled, checks the email is not already registered, then makes a random 6-digit code, stores only a salted hash of it for 10 minutes, and emails it through Brevo.
- **Verify.** The app calls `POST /verify` with the code, name, email and password. If the code matches, the Worker creates the Firebase user (name set, email marked verified) using the Firebase admin API, deletes the code, and the app signs in normally.
- **Limits.** 5 wrong guesses lock a code; a new code needs a new email. One code per email per minute, 5 per email per hour, 10 per network address per hour. A code works once, and only for the email it was sent to.
- **Cheapest checks run first.** Captcha, address checks and the registered-email check happen before anything is written to storage, so spam cannot use up the free storage allowance.
- **Only sign-up changed.** Sign-in, password reset and everything in the app talk to Firebase exactly as before.
- Old sign-up code inside `www/sync.js` is no longer reachable (the app redirects to login.html) and would be refused by Firebase anyway.

### Free-plan budget
- **Brevo:** 300 emails a day. Every code and every resend is one email, so about 300 sign-up attempts a day.
- **Cloudflare Workers:** 100,000 requests a day. Far more than sign-up needs.
- **Cloudflare KV storage:** 1,000 writes a day. A code request uses 2 and a wrong guess uses 1, so roughly 400 code requests a day. If a limit is reached, only creating accounts pauses until the next day (UTC midnight). Signing in is not affected.
- **Firebase:** stays on Spark. Creating a user through the admin API costs no Firestore reads or writes.
- Limits are checked against Cloudflare's storage, which can take up to about a minute to update between locations, so they are approximate. That is fine against a bot but not a guarantee against a determined person with many real inboxes: use the captcha and `ALLOWED_EMAIL_DOMAINS` for that.

## Upgrade to 3.3.0: Google sign-up and sign-in, free

Adds a **Continue with Google** button on the website and in the Android app. Email and password keep working.

Everything is free and needs **no credit card**. Google sign-in is part of Firebase Authentication on the Spark plan. If any Firebase page ever asks you to "Upgrade", "Identity Platform" or add a billing account for this, stop and do not continue: Google sign-in does not need it.

### One important change: Firebase sign-up goes back ON
Google can create a new user only while **Enable create (sign-up)** is ticked in Firebase. (3.2.0 told you to untick it.) With it ticked again, anyone with your public API key could make a password account, so 3.3.0 adds a rule to the database: **only accounts with a confirmed email can read or write anything.** Google accounts and accounts made through the OTP Worker are confirmed automatically. Bot-made accounts are not, so they get nothing. Old email accounts that never confirmed get a free Firebase confirmation link when they next sign in.

### Files
Replace in `www/`: login.html, sync.js, ui.js.
Replace in the repo root: firestore.rules, package.json, capacitor.config.json, README.md, SETUP.md.
Replace: `.github/workflows/build-apk.yml`.
Add (new): `.npmrc`, `scripts/patch-google-signin.sh`, `.github/workflows/show-key-fingerprint.yml`.
In the zip the two dot-names have no dot (`github/` and `npmrc`). After uploading, rename them in GitHub: open the file > pencil (edit) > in the path box add the dot (`github/workflows/build-apk.yml` becomes `.github/workflows/build-apk.yml`, `npmrc` becomes `.npmrc`) > Commit.
`firebase-config.js`, the `worker/` folder and `signing/` are **not** changed. Do not overwrite them.

### Part A: website (about 10 minutes)

**A1. Turn on Google in Firebase**
1. console.firebase.google.com > your project > Build > Authentication > **Sign-in method**.
2. **Add new provider** > **Google** > switch **Enable** on.
3. Set the **public-facing name** (for example "Campus Events") and pick your **support email**. Save.

**A2. Allow your website address**
1. Authentication > **Settings** > **Authorized domains** > **Add domain**.
2. Add the address people open the site on, for example `cem.deva.indevs.in` (just the host, no `https://`). Add `yourusername.github.io` too if you use it. `localhost` is already there.

**A3. Switch sign-up back on** (skip if you never switched it off)
1. Authentication > **Settings** > **User actions** > tick **Enable create (sign-up)** > Save.

**A4. Publish the new database rules**
1. Firestore Database > **Rules** tab > select everything > paste the new `firestore.rules` > **Publish**.
2. Do this together with A3. Do not leave sign-up on with the old rules.

**A5. Upload and deploy**
1. On GitHub upload the files listed above (keep the folder structure; "Add file > Upload files" works, and the `.github/workflows/` and `scripts/` folders must keep their paths). Commit.
2. Actions > **Deploy web version** > Run workflow.

**A6. Test on the website**
1. Open the site in a private window > **Continue with Google** > pick an account. You land in the app.
2. Firebase console > Authentication > Users: the Google user is listed with provider Google.
3. Sign out from the account menu and sign in with email and password. It still works.

### Part B: Android app (about 15 minutes)
Do Part A1 first. Google creates the app's "web client" when you switch Google on, and the Android file in step B4 needs it.

**B1. Get your key's SHA-1**
1. GitHub > Actions > **Show signing key fingerprint (SHA-1)** > Run workflow.
2. Open the finished run > the summary shows **SHA-1** (20 pairs like `AB:CD:...`). Copy it.
3. If it says the key or `KEYSTORE_PASSPHRASE` is missing, finish the permanent-key setup from the APK section of README.md first.

**B2. Register the Android app in Firebase**
1. Firebase console > gear icon > **Project settings** > **General** > **Your apps** > **Add app** > Android icon.
2. **Android package name:** `com.campus.events` (exactly). Nickname: anything. **Debug signing certificate SHA-1:** paste the SHA-1 from B1. Click **Register app**.
3. The wizard then shows steps about downloading a file and adding the SDK. You can click **Next** through them. The build does that for you.
4. If you registered the app earlier without the SHA-1: Project settings > Your apps > the Android app > **Add fingerprint** > paste it > Save.

**B3. Download `google-services.json` (after B2)**
1. Project settings > General > Your apps > the Android app > **google-services.json** (download).
2. Open it in a text editor. It must contain both `"client_type": 1` (your Android app) and `"client_type": 3` (the web client). If either is missing, you downloaded too early: check A1 and B2, then download it again.

**B4. Give the file to the build**
1. GitHub repo > Settings > **Secrets and variables** > **Actions** > **New repository secret**.
2. Name: `GOOGLE_SERVICES_JSON`. Value: paste the **whole** file contents. Save.
   (The values in this file are not passwords, but a secret keeps the repo clean. The build checks the file and stops with a clear message if it is wrong.)

**B5. Build and install**
1. Actions > **Build APK** > Run workflow. Download the APK artifact.
2. Install it over the old app. It updates in place because it is signed with the same permanent key.
3. Open the app > **Continue with Google**. Choose your account.

**B6. Optional: ask people to update**
Firestore > `appconfig` > `version`: set `latest` to `3.3.0` and add `notes`.

### Existing users
- **Email accounts made through the code step (3.2.0) and Google accounts:** nothing to do.
- **Email accounts made before 3.2.0** (never confirmed): on the next sign-in they see "Please confirm your email first" and get a link from Firebase. They open it and sign in again. Check spam.
- **Someone with an email account who now taps Google with the same email:** Firebase normally ties it to the same account, so their events are still there. If instead they see "This email already has an account with a password", they sign in with the password.

### Troubleshooting
| What you see | Cause and fix |
| --- | --- |
| "This website address is not allowed for Google sign-in yet" | A2: the exact host is missing from Authorized domains. |
| "Google sign-in is not switched on in Firebase yet" | A1: Google is not enabled in Sign-in method. |
| "New accounts are switched off in Firebase..." | A3: **Enable create (sign-up)** is still unticked. |
| Google window never opens on the website | The browser blocked pop-ups. The page then switches to a redirect by itself; allow pop-ups for the site if it keeps failing. |
| Signed in with Google but the app shows no data or permission errors | A4: the new rules were not published, or the old ones are still active. |
| In the APK: "Google sign-in is missing from this app build" | You installed an older APK. Build and install 3.3.0 (B5). |
| In the APK: Google shows an error with code 10 or "DEVELOPER_ERROR" | The SHA-1 in Firebase does not match the APK, or the package name is not exactly `com.campus.events`. Redo B1 and B2, download `google-services.json` again, update the secret, rebuild. |
| In the APK: nothing happens or a generic failure | `GOOGLE_SERVICES_JSON` secret missing (the Build APK log shows a yellow warning on "Add Google sign-in"), or the phone has no Google Play services. |
| Build APK stops at "Add Google sign-in" with an error | The message says which part of `google-services.json` is missing (no web client, no Android client, wrong package). Fix it and download the file again. |
| Account menu shows the wrong name | Google supplies the name from the Google profile. Change it in the app: account menu > Account > Your name. |

### How it works
- **Website.** `login.html` opens Google's pop-up through Firebase's web SDK. A blocked pop-up falls back to a full-page redirect.
- **Android app.** The plugin `@capacitor-firebase/authentication` shows Google's native account chooser and returns a Google ID token. With `skipNativeAuth` on, the plugin does not sign in natively; the page signs in to Firebase with that token using the same web SDK as before, so Firestore, chat and offline caching are unchanged.
- **The database rule.** `firestore.rules` calls `signedIn()` everywhere it used to check for a login. `signedIn()` also requires `email_verified`. This is what replaces "sign-up switched off".
- **Build.** `scripts/patch-google-signin.sh` enables the plugin's Google libraries and writes `google-services.json` from the secret. Without the secret the APK still builds, but the Google button in the APK fails.
- **Sign-out** goes through one function (`cemSignOut` in sync.js), which also signs out of the native Google account.

### Free-plan budget
- **Firebase Authentication with Google:** no per-user or per-sign-in charge on the Spark plan.
- **Firestore:** unchanged. Sign-in itself uses no reads or writes.
- **GitHub Actions, GitHub Pages, Cloudflare Worker, Brevo:** unchanged.
- **Junk accounts:** with sign-up on, bots can still add empty entries to the Authentication > Users list. They cannot use the database. You can delete them in the console.
