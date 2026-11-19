# Merge guide — Orders & Delivery modules → ORQLAND

Built to your documented structure: NestJS `src/modules/<feature>/{dto/{inputs,types,enums},resolvers,services,helpers}` and Drizzle schemas in `src/infrastructure/database/schema/` (engine), and `src/features/<feature>/{components,graphql,hooks,services,types}` with Next.js App Router route groups (web).

**Status:** schema approved by the Core Engine Architecture team (review of 3 Nov 2026) with minor alignments — all applied; see `docs/SCHEMA_DESIGN.md` §10. The gap-closure round (licence images, disconnect requests, statements, notification preferences) adds three tables and a few nullable columns, isolated in migration `0002` and flagged **pending approval** in §11 of the schema doc. Merge target: `dev`.

Each harness folder also contains **host stand-ins** — files your repos already have (auth guard, Drizzle provider, existing tables, UI primitives, layouts). Every stand-in starts with `[HOST SHIM]`. **Do not copy them.**

---

## 1. Copy the new files (177 files)

```bash
./copy-to-main.sh /path/to/orqland-engine /path/to/orqland-web
```

The script only adds files. If a file already exists it prints `CONFLICT` and leaves yours alone.

| Repo | New files |
|---|---|
| engine | `src/modules/orders/**`, `src/modules/delivery/**` (including unit + e2e specs); three schema files in `src/infrastructure/database/schema/` — `orders.schema.ts`, `delivery-management.schema.ts`, `delivery-support.schema.ts`; `src/config/{orders,delivery}.config.ts` (all env access); `src/core/utils/{db-executor,gql-enum,money,public-codes,workspace-access}.ts` |
| web | `src/features/dashboard/{common,orders,delivery}/**`, `src/features/orqlandRun/**`, `src/features/myOrders/**`, 4 route pages, `src/styles/ops-theme.css`, and nine new primitives in `src/components/ui/` (`status-dot`, `metric`, `timeline`, `table`, `panel`, `underline-tabs`, `form-field`, `map-view`, `bar-chart`) |

---

## 2. Engine (orqland-engine)

### 2.1 Export the new schemas

Append to `src/infrastructure/database/schema/index.ts`:

```ts
// ── Orders & Delivery modules ──
export * from './orders.schema';
export * from './delivery-management.schema';
export * from './delivery-support.schema';
```

### 2.2 Point the schema imports at your existing tables

Each of the three schema files starts with a short block marked *Existing ORQLAND tables*. Fix those paths and export names if yours differ (for example if `orqspaces` or `deliveryAgents` live in another file):

| File | Imports |
|---|---|
| `orders.schema.ts` | `orqListings, orqListingVariants` ← `./listings.schema`; `orqspaces` ← `./orqspaces.schema`; `orqUserAddresses, orqUsers` ← `./users.schema` |
| `delivery-management.schema.ts` | `deliveryAgents` ← `./delivery-agents.schema`; `orqspaces` ← `./orqspaces.schema`; `orqUsers` ← `./users.schema` |
| `delivery-support.schema.ts` | `orqUsers` ← `./users.schema` |

`delivery_agent_assignments` (the legacy mapping kept in sync) is used from the services through `@/infrastructure/database/schema`, so it only needs to be exported from your `index.ts`, as it already is.

The services also use these **column property names** on your tables. Rename them in the code if yours differ:

| Table | Properties used |
|---|---|
| orq_users | `id, orqUserId, displayName, fname, lname, phone, email, avatar, roles (enum array), accountStatus` |
| orq_user_addresses | `id, userId, recipientName, recipientPhone, doorNo, street, landmark, city, district, state, country, pincode, latitude, longitude` |
| orqspaces | `id, name, ownerId` |
| orq_listings | `id, ownerId, orqspaceId, listingType, title, images, basePrice, gstPercentage, totalPrice, hasVariants, status, isPublic` |
| orq_listing_variants | `id, listingId, type, sku, basePrice, gstPercentage, totalPrice, inventoryMode, remainingQuantity, variantStatus` |
| delivery_agents | `userId, vehicleNumber, updatedAt` |
| delivery_agent_assignments | `deliveryAgentUserId, orqspaceId, assignedAt, revokedAt` |

### 2.3 Verify the core imports

The modules import exactly these from your core:

| Import | Expected |
|---|---|
| `@/infrastructure/database/drizzle.module` | `DRIZZLE` injection token and `DrizzleDB` type (`NodePgDatabase<typeof schema>`) |
| `@/core/guards/gql-auth.guard` | `GqlAuthGuard`, which sets `req.user` |
| `@/core/decorators/current-user.decorator` | `CurrentUser` decorator plus an `AuthUser` type with **`id` = orq_users.id (uuid)** and **`roles: string[]`** |
| `@/core/guards/roles.guard`, `@/core/decorators/roles.decorator` | `RolesGuard`, `Roles(...)`. Used only on the platform-admin mutations |
| `@/core/guards/http-auth.guard` | **New requirement:** `HttpAuthGuard` for REST controllers — verifies the Firebase ID token and sets `req.user` (same `AuthUser` shape). Used only by `DeliveryFilesController` (document upload/download). If your REST guard has another name, change the one import in `modules/delivery/controllers/delivery-files.controller.ts` |

If a name differs, list every place it's used:

```bash
grep -rn "@/core/\|drizzle.module" src/modules/orders src/modules/delivery
```

GraphQL field resolvers read `context.req.user`, so your `GraphQLModule` context must expose `req`. Nest's default does.

### 2.4 Register the modules

In `app.module.ts`:

```ts
import { ScheduleModule } from '@nestjs/schedule';
import { OrdersModule } from './modules/orders/orders.module';
import { DeliveryModule } from './modules/delivery/delivery.module';

imports: [ /* … */ ScheduleModule.forRoot(), OrdersModule, DeliveryModule ]
```

Skip `ScheduleModule.forRoot()` if you already register it. Optionally add the two config factories to your `ConfigModule.forRoot({ load: [/* … */, ordersConfig, deliveryConfig] })` (default exports of `src/config/orders.config.ts` and `src/config/delivery.config.ts`) so the values are also available through `ConfigService`; the modules read them directly, so this is not required.

### 2.5 Dependencies

```bash
pnpm add @nestjs/schedule
```

`class-validator`, `class-transformer`, `drizzle-orm` and `@nestjs/platform-express` (which brings `multer`, used for document uploads) are presumably already in your repo.

### 2.6 Environment

See `orqland-engine/.env.example`. Required:

| Variable | Purpose |
|---|---|
| `DA_ENCRYPTION_KEY` | **32-byte key as 64 hex characters** (`openssl rand -hex 32`). AES-256-GCM encryption of licence number, DOB and vehicle number. Validated at first use |
| `DA_FINGERPRINT_SECRET` | ≥ 32 chars. HMAC-SHA-256 key for duplicate-detection fingerprints. **Never rotate without re-fingerprinting** |
| `SUREPASS_API_TOKEN` | Surepass API authentication token |
| `SUREPASS_BASE_URL` | Surepass API base URL. Optionally `SUREPASS_DL_PATH` / `SUREPASS_RC_PATH` |
| `SUREPASS_MODE` | `live` or `mock`. Unset → `mock`, so local development never crashes — **except with `NODE_ENV=production`, where unset means `live`** (see `surepass.client.ts` for the mock rules) |

Optional, with defaults (all read in `src/config/*.config.ts`):

| Variable | Default | Purpose |
|---|---|---|
| `DELIVERY_UPLOAD_DIR`, `DELIVERY_UPLOAD_MAX_BYTES` | `.data/delivery-uploads`, 8 MB | Local encrypted document storage (standalone build only — bind GCP storage on merge, §2.8) |
| `ORDER_PAYMENT_HOLD_MINUTES` | 60 | Unpaid ONLINE orders still `PLACED` after this are cancelled by SYSTEM and their stock released (`0` disables) |
| `ORDER_SLA_ACCEPT_MINUTES`, `DELIVERY_SLA_{ACCEPT,PICKUP,DELIVER}_MINUTES` | 15, 10, 20, 45 | SLA targets on the operations console |
| `DELIVERY_STALE_LOCATION_SECONDS` | 120 | When an agent's position counts as stale |

Keep the two secrets in your secret manager. Business-rule overrides (re-KYC months, limits, retention) are listed in `.env.example` with their defaults.

### 2.7 Migration

Run `pnpm run migration:generate` in your repo, so the migration chains onto your own Drizzle snapshot. **Review it before applying.** It must contain only `CREATE TYPE`, `CREATE TABLE`, `CREATE INDEX`, `ADD CONSTRAINT … FOREIGN KEY` and `ADD COLUMN` on the module's **own** tables (25 new tables) — no `ALTER` or `DROP` on existing ORQLAND tables.

Reference output, generated against the stand-in tables: `orqland-engine/drizzle/0001_orders_delivery_modules.sql` (the approved 22 tables) and `0002_delivery_files_statements_prefs.sql` (the proposed additions: `delivery_files`, `delivery_statements`, `delivery_notification_preferences` and nullable columns for document references and disconnect requests). Then:

```bash
pnpm run migration:migrate
```

### 2.8 Integration points to review

| Where | What to decide |
|---|---|
| `core/utils/workspace-access.ts` → `assertWorkspaceAccess` | The single workspace-admin check (review §2.3). Currently `orqspaces.owner_id === userId`; rewire its body to the internal `assertOrqspaceAccess` to support delegated workspace administrators. Nothing else needs to change |
| `modules/delivery/services/notifications/delivery-notifier.service.ts` → `deliver` | Every notification is already stored for in-app history (`delivery_notifications`). Override `deliver()` to also push / email through your notification channels |
| `modules/orders/helpers/orderable.ts` | `ORDERABLE_LISTING_STATUSES`: set this to the status value(s) your published listings use |
| `modules/orders/services/lifecycle/order-placement.service.ts` | `deliveryFee = 0` until the fee policy (Q-10) is decided |
| `modules/delivery/services/files/delivery-file-storage.ts` → `DELIVERY_FILE_STORAGE` | Document bytes (licence front/back, RC, proof-of-delivery, COD proof, ticket attachments). The standalone build encrypts them to local disk; bind the token to a small class that implements `put/get/remove` against your **private** GCP bucket (no public URLs). The `delivery_files` table, type sniffing, size limit, access rules and audit stay as they are |
| `delivery_agents.driving_license_image_url` | Set on activation to the engine path `/delivery/files/<licence front id>` (served only to the owner and KYC reviewers). If other parts of your app read this column as a public URL, keep reading it through the engine route |
| Support / safety staffing | Tickets are routed to teams by category (`TEAM_BY_CATEGORY` in `support.service.ts`); emergencies are `URGENT` for team `SAFETY`. Align team names with your support org |

---

## 3. Web (orqland-web)

### 3.1 Routes and navigation

The route pages were placed at:

| Page | File | URL |
|---|---|---|
| Order Management | `app/(protected)/(dashboard)/orders/page.tsx` | `/orders` |
| Delivery Management | `app/(protected)/(dashboard)/delivery/page.tsx` | `/delivery` |
| Orqland Run (6 screens via `?tab=`) | `app/(protected)/(account_center)/orqland-run/page.tsx` | `/orqland-run` |
| Customer — My orders | `app/(protected)/(account_center)/my-orders/page.tsx` | `/my-orders` |

- Point the sidebar items **"My Orders / Bookings"** → `/orders` and **"Delivery"** → `/delivery`.
- Point the account centre's **"Orqland Run"** item → `/orqland-run`, and the buyer's orders entry (e.g. **"My Activity"**) → `/my-orders`.
- **Checkout:** on your listing / cart page, open `<CheckoutSheet open lines={cartLines} onOpenChange={…} />` from `features/myOrders/components/CheckoutSheet.tsx`, where `lines` are `{ listingId, variantId?, quantity, title, variantLabel?, unitTotalPrice, orqspaceName? }`. Prices are re-computed on the server. `/checkout-demo` in the harness shows the usage (stand-in, not copied).
- If you use other paths, move the page files and update `DELIVERY_PAGE_HREF` in `features/dashboard/orders/components/OrderActions.tsx`.

### 3.2 Active workspace

`features/dashboard/common/hooks/useActiveOrqspaceId.ts` is the one adapter you need to rewrite. Return the current workspace's **orqspaces.id (UUID)** from your existing workspace store or context.

### 3.3 Shared client and UI primitives

- `@/lib/graphqlClient` must export `graphqlClient` (a `graphql-request` `GraphQLClient` that attaches the Firebase token). If yours is named differently, update the four `services/*.service.ts` files (orders, delivery, run, my-orders).
- **New integration point:** `@/lib/authToken` must export `getAuthorizationHeader(): Promise<string>` (e.g. `` `Bearer ${await auth.currentUser!.getIdToken()}` `` from your Firebase setup) and `ENGINE_ORIGIN` (the engine URL without `/graphql`). It is used only by `features/dashboard/common/services/delivery-files.service.ts` for document upload/download. The harness file is a stand-in.
- Existing shadcn-style components used from `@/components/ui/`: `button` (variants `default | outline | ghost | destructive`, sizes `sm | icon`, `asChild`), `input`, `textarea`, `dialog`, `sheet`, `switch`, `skeleton`. If one is missing or its API differs, copy it from `orqland-web/src/components/ui/`.
- New primitives (copied by the script, only if you don't already have a file with that name): `status-dot` (state = dot + text label), `metric` (compact metric strip), `timeline`, `table` (compact data table), `panel` (`Panel`, `SectionLabel`, `EmptyState`, `ErrorNote`), `underline-tabs`, `form-field` (`FormField` with `aria-invalid`/`aria-describedby`, `Select`), `map-view` (Leaflet), `bar-chart` (`BarChart`, `Meter`).
- **Visual style — guide §11 "Design direction".** The Orders, Delivery, Run and My-orders screens use minimal black / white / neutral surfaces, strong type hierarchy, compact tables, one status-dot vocabulary, map-focused live views and timeline details. The palette is scoped by the `ops-theme` class (`src/styles/ops-theme.css`, imported by the four page components and set on their dialogs/sheets), which remaps the standard tokens (`--primary`, `--border`, `--muted`, `--success`, `--warning`, `--destructive`…) **inside those screens only** — the rest of your app keeps its brand colours, and the sidebar/header are untouched.
- Maps: Leaflet tiles come from `NEXT_PUBLIC_MAP_TILE_URL` (default CARTO light, OpenStreetMap data), rendered greyscale. Without tiles the map shows a neutral grid so markers and routes stay readable. Check the tile provider's terms or use your own key in production.

### 3.4 Dependencies

```bash
pnpm add leaflet @radix-ui/react-dialog @radix-ui/react-switch @radix-ui/react-slot @tanstack/react-query graphql-request react-hook-form @hookform/resolvers zod zustand lucide-react
pnpm add -D @types/leaflet
```

Most of these already exist in your repo; `leaflet` is the only new one. `zustand` is used only by the stand-in `useActiveOrqspaceId`.

---

## 4. Verify after merging

```bash
cd orqland-engine && pnpm run build && pnpm test
```

End-to-end specs (`src/modules/orders/orders.e2e.spec.ts`, `src/modules/delivery/delivery.e2e.spec.ts`) need a PostgreSQL database whose name ends in `_e2e` — the harness drops and recreates it and refuses any other name. Point `E2E_DATABASE_URL` at it and use `test/jest-e2e.json` from the harness (or copy its settings into your e2e config):

```bash
E2E_DATABASE_URL=postgres://postgres:postgres@localhost:5432/orqland_e2e pnpm run test:e2e
```

Exclude `*.e2e.spec.ts` from the unit-test run (`testPathIgnorePatterns`). The harness seeds its fixtures straight into your existing tables, and sends `Bearer dev:<user id>` tokens; swap `call()` in `src/modules/orders/testing/e2e-harness.ts` for your test-token helper.

```bash
cd orqland-web && pnpm run build
```

Then walk through the flow:

1. User → Orqland Run → Register: licence number + date of birth + **licence front/back photos**, vehicle + optional RC photo, consent (with `SUREPASS_MODE=mock` locally) → status **Active**.
2. Workspace → Delivery operations → Settings: set the pickup point → Agents: search an Orq ID, invite with a ₹/km rate.
3. Agent → Run → Workspaces: accept the invitation → Home: go **Online** (GPS chip turns on).
4. Customer places a COD order → Orders: Accept → Start preparing → Mark ready → Delivery operations → Assignment: Dispatch (automatic, or choose an agent).
5. Agent → Run → Deliveries: accept the request (countdown, estimate) → heading to pickup → confirm pickup → start trip → Complete: customer code, proof photo, cash collected (and UPI proof if not cash).
6. Workspace → Live map: follow the agent on the map with the timeline → COD: record the handover → the order shows **Paid** → Costs & statements: approve the earning, mark paid.
7. Agent → Run → Earnings: statement + CSV, dispute an earning → it shows **Under review** in Costs. Workspaces: request a disconnection while a delivery is active → it completes automatically after the delivery.
8. Customer → My orders: progress, the 4-digit delivery code and the timeline.

The end-to-end specs run this flow and the integrity rules (oversell, duplicate KYC, private document access, limits, atomic accept, disconnect requests, statements, payment hold, cancellations) against PostgreSQL: `src/modules/orders/orders.e2e.spec.ts` and `src/modules/delivery/delivery.e2e.spec.ts` (37 unit + 40 e2e tests).

---

## 5. Not included / pending decisions

- Payment gateway (manual and COD only, per your choice). `OrderPaymentsService.record()` is the single hook a gateway webhook needs.
- Mapping provider: maps use Leaflet with configurable tiles; navigation opens Google Maps directions. Route optimisation and precise ETAs wait for the provider decision (guide §7). Displayed travel times are labelled estimates.
- Statement PDF: statements export as CSV (and a share summary); a PDF layout can be added once branding is agreed.
- Approval of the three proposed tables in `docs/SCHEMA_DESIGN.md` §11.
- Open business questions Q-1 … Q-15 in `docs/SCHEMA_DESIGN.md` §8. Each has a working default.
