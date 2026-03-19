#!/bin/bash
# Build the static demo site for GitHub Pages.
# Temporarily removes API routes (not needed for demo) to allow static export.

set -e

echo "Building static demo site..."

# Restore any previous failed state
[ -d src/app/_api_backup ] && mv src/app/_api_backup src/app/api
[ -d src/app/_insights_backup ] && mv src/app/_insights_backup src/app/insights

# Backup directories not needed for demo (API routes, insights)
mv src/app/api src/app/_api_backup
mv src/app/insights src/app/_insights_backup

# Build with demo mode
NEXT_PUBLIC_DEMO_MODE=true npx next build || {
  # Restore on failure
  mv src/app/_api_backup src/app/api
  mv src/app/_insights_backup src/app/insights
  exit 1
}

# Restore backed-up directories
mv src/app/_api_backup src/app/api
mv src/app/_insights_backup src/app/insights

echo "Demo build complete! Output in ./out/"
