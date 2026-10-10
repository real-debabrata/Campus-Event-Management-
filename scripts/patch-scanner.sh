#!/usr/bin/env bash
# v3.5.0: prepares the generated Android project for ticket scanning (@capacitor-mlkit/barcode-scanning).
# Adds to android/app/src/main/AndroidManifest.xml:
#   1) the CAMERA permission (the plugin documents it; Google's scanner screen used by scan() does not need it at run time), and
#   2) the meta-data that makes Google download the scanner component when the app is installed, so the first scan is instant.
# Safe to run twice. Usage: scripts/patch-scanner.sh [path/to/AndroidManifest.xml]
set -euo pipefail

MANIFEST="${1:-android/app/src/main/AndroidManifest.xml}"
[ -f "$MANIFEST" ] || { echo "::error::$MANIFEST not found. Run 'npx cap add android' first."; exit 1; }

export MANIFEST
python3 - <<'PY'
import os, re, sys
p = os.environ["MANIFEST"]
s = open(p, encoding="utf-8").read()
changed = False

if "android.permission.CAMERA" not in s:
    s, n = re.subn(r'(<application\b)', '<uses-permission android:name="android.permission.CAMERA" />\n    \\1', s, count=1)
    if not n:
        sys.exit("::error::<application> tag not found in AndroidManifest.xml (Capacitor template changed?)")
    changed = True

if "com.google.mlkit.vision.DEPENDENCIES" not in s:
    s, n = re.subn(r'(<application\b[^>]*>)', '\\1\n        <meta-data android:name="com.google.mlkit.vision.DEPENDENCIES" android:value="barcode_ui"/>', s, count=1)
    if not n:
        sys.exit("::error::<application> tag not found in AndroidManifest.xml (Capacitor template changed?)")
    changed = True

if changed:
    open(p, "w", encoding="utf-8").write(s)
print("AndroidManifest.xml: scanner permission and module meta-data", "added" if changed else "already present")
PY
