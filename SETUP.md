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
