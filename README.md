# Campus Events (CEM) 3.2.0

Plan campus events with your team: registrations, tasks, roles, UPI payment links, a chat inside every event and now expenses.
Runs as an Android app (APK built by GitHub, no installs) and as a website. Everything fits in the free plans of GitHub and Firebase (Spark).

## What's new in 3.2.0
- **Email code (OTP) when creating an account.** Choose "Create account", enter name, email and password, and a 6-digit code is emailed to you. The account exists only after you type the code. **Signing in never asks for a code.**
  - Stops bots and mass junk accounts: nobody can create an account without a real inbox, and Firebase's own public sign-up is switched off so the code step cannot be skipped.
  - Extra guards: codes expire in 10 minutes, 5 wrong tries lock a code, one code per email per minute, 5 codes per email and 10 per network per hour, throwaway-mail domains (mailinator and similar) are refused, and an optional free captcha (Cloudflare Turnstile) and college-email-only mode can be switched on.
  - Still **free, no card**: a small Cloudflare Worker (`worker/otp-worker.js`) sends the code through Brevo (300 emails a day free) and creates the Firebase account. Firebase stays on the Spark plan; there are no Cloud Functions.
  - Setup is a one-time job of about 30 minutes: **SETUP.md > Upgrade to 3.2.0**. Until it is done, "Create account" shows "Sign-up is not set up yet" (sign-in keeps working).
  - Old APKs (3.1.x) cannot create accounts once Firebase sign-up is switched off. Set `min` to `3.2.0` in Firestore > appconfig > version to ask people to update.

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
Follow **SETUP.md** (Firebase project, rules, GitHub Pages, and the upgrade steps: "Upgrade to 2.0.0" (chat), "Upgrade to 3.1.0" (expenses, payment-link expiry, tagging) and **"Upgrade to 3.2.0" (email-code sign-up)**).

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
| www/login.html, www/pay.html | Sign-in and sign-up page (sign-up asks for an emailed code), public payment page |
| www/firebase-config.js | Your Firebase keys, plus `OTP_API` (address of the OTP Worker) and the optional `TURNSTILE_SITE_KEY` |
| worker/otp-worker.js | Free Cloudflare Worker: emails the code, checks it, creates the account (new in 3.2.0). Never uploaded to the website; paste it into Cloudflare |
| worker/wrangler.toml | Optional settings file, only if you deploy from the command line |
| firestore.rules | Security rules. Paste into Firebase console > Firestore > Rules |

## Notes
- Event data is cached on the phone and synced through Firebase. Chat and payment links need a shared event.
- Budget, vendors, payments and items are stored inside the event document. The app hides the money sections from members who are not organizer, manager or treasurer, but everyone in the event can technically read the event document. Do not share an event code with people you do not trust with the budget.
- **Sign-up codes and free limits.** Brevo's free plan sends 300 emails a day, so at most about 300 codes a day (a resend is another email). Cloudflare's free plan is 100,000 requests a day and 1,000 stored writes a day; each code request uses 2 of those writes, so roughly 400 requests a day before it pauses. Nothing but sign-up is affected when a limit is reached: sign-in goes straight to Firebase.
- **What the code does and does not do.** It proves the person owns the email address and makes bulk sign-up slow and costly. It cannot stop someone who really owns many inboxes. Turn on the Turnstile captcha and `ALLOWED_EMAIL_DOMAINS` (for example your college domain) in the Worker for stronger protection.
- Keep the Firebase service-account key and the Brevo key only as Cloudflare secrets. Never put them in this repository. The `worker/` folder is not part of the website or the APK.
- The APK is a debug build for sideloading. For Play Store, create a signed release build.
- To change the app, edit the files in www/, push to GitHub, and the workflow rebuilds the APK. Bump `APP_VERSION` in www/ui.js on every release.
