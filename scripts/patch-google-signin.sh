#!/usr/bin/env bash
# Prepares the generated Android project for Google sign-in (v3.3.0):
#   1) tells the sign-in plugin to include the Google libraries (android/variables.gradle), and
#   2) writes android/app/google-services.json from the GOOGLE_SERVICES_JSON secret.
# Without the secret the APK still builds, but the Google button inside the APK will fail (email sign-in is unaffected).
# Usage: GOOGLE_SERVICES_JSON='...' scripts/patch-google-signin.sh
set -euo pipefail

VARS="android/variables.gradle"
[ -f "$VARS" ] || { echo "::error::$VARS not found. Run 'npx cap add android' first."; exit 1; }

if ! grep -q "rgcfaIncludeGoogle" "$VARS"; then
  python3 - <<'PY'
import re
p = "android/variables.gradle"
s = open(p).read()
s, n = re.subn(r'(ext\s*\{)', r"\1\n    rgcfaIncludeGoogle = true", s, count=1)
if not n:
    raise SystemExit("::error::ext block not found in variables.gradle (Capacitor template changed?)")
open(p, "w").write(s)
print("variables.gradle: rgcfaIncludeGoogle = true")
PY
fi

if [ -z "${GOOGLE_SERVICES_JSON:-}" ]; then
  echo "::warning::Secret GOOGLE_SERVICES_JSON is not set. The APK will build, but 'Continue with Google' will not work inside the APK. See SETUP.md > Upgrade to 3.3.0 > Part B (steps B3 and B4)."
  exit 0
fi

printf '%s' "$GOOGLE_SERVICES_JSON" > android/app/google-services.json
python3 - <<'PY'
import json, sys
try:
    j = json.load(open("android/app/google-services.json"))
except Exception as e:
    sys.exit("::error::GOOGLE_SERVICES_JSON is not valid JSON (%s). Paste the WHOLE file." % e)
clients = [c for cl in j.get("client", []) for c in cl.get("oauth_client", [])]
pkgs = [cl["client_info"]["android_client_info"]["package_name"] for cl in j.get("client", [])]
if "com.campus.events" not in pkgs:
    sys.exit("::error::google-services.json is for %s, not com.campus.events. Register the Android app with package name com.campus.events." % pkgs)
if not any(c.get("client_type") == 3 for c in clients):
    sys.exit("::error::google-services.json has no web client. Enable Google in Authentication > Sign-in method and add the SHA-1 key BEFORE downloading the file, then download it again.")
if not any(c.get("client_type") == 1 for c in clients):
    sys.exit("::error::google-services.json has no Android client. Add the SHA-1 key (Project settings > your Android app) and download the file again.")
print("google-services.json OK for", pkgs[0])
PY
