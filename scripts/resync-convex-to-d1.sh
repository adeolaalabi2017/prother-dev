#!/usr/bin/env bash
# Re-sync Convex prod -> D1 (content drift catch-up until writes migrate).
# Full export is ~200KB; safe to run daily/weekly via cron or manually.
# Usage: bun scripts/resync-convex-to-d1.sh
set -euo pipefail
cd "$(dirname "$0")/.."
SNAP=/tmp/opencode/prother-resync
mkdir -p "$SNAP"
npx convex export --prod --path "$SNAP"
rm -rf "$SNAP/snapshot"
unzip -o -q "$SNAP"/snapshot_*.zip -d "$SNAP/snapshot"
rm "$SNAP"/snapshot_*.zip
bun scripts/import-convex-to-d1.ts "$SNAP/snapshot" "$SNAP/import.sql"
grep -v -e "^BEGIN TRANSACTION;$" -e "^COMMIT;$" -e "^PRAGMA" "$SNAP/import.sql" > "$SNAP/import-notx.sql"
bunx wrangler d1 execute prother --remote --file="$SNAP/import-notx.sql" | tail -3
