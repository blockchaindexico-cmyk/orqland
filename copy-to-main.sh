#!/usr/bin/env bash
# Copies ONLY the new Orders & Delivery files into your main repositories.
# It never overwrites an existing file (prints a CONFLICT line instead) and never edits host files.
#
#   ./copy-to-main.sh /path/to/orqland-engine /path/to/orqland-web
set -euo pipefail

USAGE="usage: $0 <orqland-engine path> <orqland-web path>"
ENGINE_DST="${1:?$USAGE}"
WEB_DST="${2:?$USAGE}"
HERE="$(cd "$(dirname "$0")" && pwd)"

ENGINE_FILES=(
  src/infrastructure/database/schema/orders.schema.ts
  src/infrastructure/database/schema/delivery-management.schema.ts
  src/infrastructure/database/schema/delivery-support.schema.ts
  src/config/orders.config.ts
  src/config/delivery.config.ts
  src/core/utils/db-executor.ts
  src/core/utils/gql-enum.ts
  src/core/utils/money.ts
  src/core/utils/public-codes.ts
  src/core/utils/workspace-access.ts
)
ENGINE_DIRS=(src/modules/orders src/modules/delivery)

WEB_FILES=(
  "src/app/(protected)/(dashboard)/orders/page.tsx"
  "src/app/(protected)/(dashboard)/delivery/page.tsx"
  "src/app/(protected)/(account_center)/orqland-run/page.tsx"
  "src/app/(protected)/(account_center)/my-orders/page.tsx"
  src/styles/ops-theme.css
  src/styles/order-cards.css
  # New shared primitives (copied only if you don't already have a file with the same name)
  src/components/ui/bar-chart.tsx
  src/components/ui/form-field.tsx
  src/components/ui/map-view.tsx
  src/components/ui/metric.tsx
  src/components/ui/panel.tsx
  src/components/ui/status-dot.tsx
  src/components/ui/table.tsx
  src/components/ui/timeline.tsx
  src/components/ui/underline-tabs.tsx
)
WEB_DIRS=(src/features/dashboard/common src/features/dashboard/orders src/features/dashboard/delivery src/features/orqlandRun src/features/myOrders)

copied=0; conflicts=0
copy_one() { # src_root dst_root relative_path
  local src="$1/$3" dst="$2/$3"
  if [[ -e "$dst" ]]; then echo "CONFLICT (kept yours): $dst"; conflicts=$((conflicts+1)); return; fi
  mkdir -p "$(dirname "$dst")"; cp "$src" "$dst"; copied=$((copied+1))
}
copy_tree() { # src_root dst_root relative_dir
  while IFS= read -r -d '' f; do copy_one "$1" "$2" "${f#"$1"/}"; done < <(find "$1/$3" -type f -print0)
}

for f in "${ENGINE_FILES[@]}"; do copy_one "$HERE/orqland-engine" "$ENGINE_DST" "$f"; done
for d in "${ENGINE_DIRS[@]}"; do copy_tree "$HERE/orqland-engine" "$ENGINE_DST" "$d"; done
for f in "${WEB_FILES[@]}"; do copy_one "$HERE/orqland-web" "$WEB_DST" "$f"; done
for d in "${WEB_DIRS[@]}"; do copy_tree "$HERE/orqland-web" "$WEB_DST" "$d"; done

echo
echo "Copied $copied file(s); $conflicts conflict(s)."
echo "Next: follow the manual steps in MERGE_GUIDE.md (index.ts exports, AppModule, deps, env, migration, navigation links)."
