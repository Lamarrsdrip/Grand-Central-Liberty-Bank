#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Grand Central Liberty Bank — push this project to YOUR GitHub
# ─────────────────────────────────────────────────────────────
# Usage:
#   1. Create an EMPTY repo on github.com (e.g. grand-central-liberty-bank)
#   2. Run:  bash push-to-github.sh https://github.com/<you>/<repo>.git
# ─────────────────────────────────────────────────────────────
set -e

REPO_URL="$1"
if [ -z "$REPO_URL" ]; then
  echo "❌ Provide your GitHub repo URL."
  echo "   Example: bash push-to-github.sh https://github.com/yourname/grand-central-liberty-bank.git"
  exit 1
fi

# Make sure node_modules / .next / .env are NOT committed
echo "→ Initializing git..."
git init -q
git add .
git commit -q -m "Grand Central Liberty Bank — premium 2026 UI redesign"
git branch -M main
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

echo "→ Pushing to $REPO_URL ..."
git push -u origin main

echo ""
echo "✅ Done! Your code is now on GitHub."
echo "   Next: pull it into Emergent and deploy (see DEPLOYMENT.md)."
