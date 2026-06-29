#!/bin/bash
# Run this from the root of your PS_MobileApplication clone.
# It applies the patch as a new branch and pushes it for a PR.

set -e

BRANCH="feature/item-customisation-notes"
PATCH="feature-item-customisation-notes.patch"

# Make sure we're on main and up to date
git checkout main
git pull origin main

# Create and switch to the feature branch
git checkout -b "$BRANCH"

# Apply the patch (place the .patch file in the repo root first)
git am "$PATCH"

# Push to remote and set upstream
git push -u origin "$BRANCH"

echo ""
echo "✅  Branch '$BRANCH' pushed."
echo "    Open a PR at: https://github.com/kriti-developer/PS_MobileApplication/compare/$BRANCH"
