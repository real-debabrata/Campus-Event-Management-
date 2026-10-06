// Firebase web app config (these values are not secrets; Firestore rules protect the data).
window.FB_CONFIG = {
  apiKey: "AIzaSyDAhRFtfr7OVMdMcGNvGVbltx6BQMrB3zQ",
  authDomain: "event-management-cfc44.firebaseapp.com",
  projectId: "event-management-cfc44",
  storageBucket: "event-management-cfc44.firebasestorage.app",
  messagingSenderId: "492698777947",
  appId: "1:492698777947:web:59c8dbfc741faf31eb427e"
};
// Optional: the address where this site is hosted, used to build payment links in the Android app.
// Example: "https://yourname.github.io/your-repo/"  (leave empty to enter it inside the app)
window.PAY_BASE = "https://cem.deba.indevs.in/";

// Sign-up OTP service: the address of your Cloudflare Worker (worker/otp-worker.js), no trailing slash.
// Until you replace this, "Create account" is blocked on purpose. Setup steps: SETUP.md > "Upgrade to 3.2.0".
window.OTP_API = "https://cem-otp.deb69096909.workers.dev";
// Optional free captcha (Cloudflare Turnstile) in front of "Send verification code". Paste the SITE key, or leave empty.
// If you fill this in, also add the matching secret key as TURNSTILE_SECRET in the Worker.
window.TURNSTILE_SITE_KEY = "";
