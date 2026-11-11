# Reference guide → implementation map

Every module-level requirement of the *ORQLAND Codebase Reference Guide* (Delivery Agent, Orqland Run & Workspace Delivery Management) and where it is implemented. Screens are in `docs/screenshots/`.

## Module A — Registration & KYC
| Requirement | Where |
|---|---|
| Entry point from the existing account ("Delivery Executive — Register") | `orqlandRun/components/OrqlandRunPage.tsx` · screenshot 11 |
| Licence number, **required document images**, validity, result | `RegistrationWizard.tsx` (licence front/back photo capture, DOB, vehicle, optional RC) → `POST /delivery/files` → `registerAsDeliveryAgent(licenceFrontFileId, licenceBackFileId, vehicleRcFileId)` · screenshot 13 |
| Consent | wizard step 3, `@Equals(true)` on the DTO |
| Surepass verification, mismatch / unavailable handling | `services/kyc/agent-registration.service.ts`, `surepass.client.ts`, `kyc-rules.ts`; application timeline · screenshot 14 |
| DA fingerprint (HMAC-SHA-256), licence/vehicle fingerprints, encryption at rest | `kyc-crypto.service.ts`; images AES-256-GCM encrypted in `LocalEncryptedFileStorage` |
| Duplicate prevention | partial unique indexes + `assertNoDuplicates` (e2e "rejects the same licence…") |
| Role granted only when all checks pass; start OFFLINE | `activate()` |

## Module B — Re-KYC
| Requirement | Where |
|---|---|
| Licence 12 months / vehicle 4 months, reminders, restrict assignments | `re-kyc.job.ts`, `config/delivery.config.ts`, `assessAgentKyc` |
| Show which document needs re-verification, re-verify / vehicle change | Run → Profile · screenshot 24 |
| Active delivery never taken away | eligibility only blocks **new** offers |

## Module C — Workspace ↔ agent connection
| Requirement | Where |
|---|---|
| Orq ID search only | Delivery operations → Agents · screenshot 05 |
| Mutual consent, 5/5 limits under row locks, invite rate limits | `connections.service.ts` |
| Per-connection rate, history, snapshot at acceptance | rate dialog + rate history; `ratePerKmSnapshot` |
| Disconnect without deleting history; **request disconnection & track pending requests**; safe handling of active deliveries | `disconnectRequestStatus` (no new offers, auto-completes when active deliveries reach zero, withdraw) · Agents tab, Run → Workspaces · screenshot 23 |

## Module D — Orqland Run (screens 1–6)
| Screen | Where |
|---|---|
| 1 Home: ONLINE/OFFLINE, connections, active job + next action, today, requests count, KYC warnings, notifications, empty state | `RunHomeView.tsx` · screenshot 15 |
| 2 Deliveries: requests (workspace, pickup/drop, distance, time, rate, estimate, expiry, accept/decline), pickup/drop workflow, map + navigation, customer contact, COD, OTP/photo proof, failure/return, history with timeline | `OfferCard.tsx`, `ActiveJob.tsx`, `DeliveriesView.tsx` · screenshots 16–19, 28 |
| 3 Workspaces | `WorkspacesView.tsx` · screenshot 23 |
| 4 Earnings & analytics: funnel, km travelled vs billable, by workspace, today/month, month comparison, states, adjustments, statements (1st–last day), CSV/share, disputes | `EarningsView.tsx`, `delivery_statements` · screenshots 20–22 |
| 5 Profile & verification, notification preferences, location-tracking info, deactivation request | `ProfileView.tsx`, `delivery_notification_preferences` · screenshots 24–26 |
| 6 Notifications & support: read/unread history, tickets with categories + attachments, FAQ, emergency guidance | `HelpView.tsx`, `SupportTickets.tsx` · screenshot 27 |
| Availability rules (OFFLINE/ONLINE/BUSY, KYC blocked) | `agent-availability.service.ts` |

## Module E — Workspace order processing & delivery
| Requirement | Where |
|---|---|
| Order queue, accept/reject, preparation, ready, detail with timeline | `dashboard/orders` · screenshots 09–10 |
| Self-delivery, automatic and manual assignment | Delivery operations → Assignment · screenshots 03–04; `assignment-engine.service.ts` (NEAREST / LEAST_LOADED / HYBRID) |
| Atomic accept, separate failure/return/cancel/reassign transitions, audited override | `agent-task-actions.service.ts`, `task-transitions.service.ts` |
| Failed or expired payments | `OrderPaymentHoldJob` (unpaid ONLINE orders cancelled, stock released) |

## §7 Live tracking & monitoring
Map-focused live view with agent, Orq ID, last location + freshness, pickup/drop-off, route trace, duration/distance, exceptions — Delivery operations → Live map · screenshot 02. Purpose-limited tracking, visible GPS state, stale/denied handling — `useLocationTracking.ts`, Run GPS chip · screenshot 26. Retention job 90 days.

## §8 COD
Expected/collected/method/proof/settled/outstanding/discrepancy, order paid only after settlement — `cod.service.ts`, COD tab · screenshot 06.

## §9 Earnings & monthly cycle
Approved km × snapshotted rate, distance source, no duplicates, audited adjustments, statements DRAFT → FINAL at month end (catches up missed months), payout tracked separately — `earnings.service.ts`, `statements.service.ts` · screenshot 07.

## §10 Permissions
Workspace admins never see KYC documents (403); only platform admins, and each view is audited (`kyc_document.viewed`) — `delivery-files.service.ts`, admin viewer · screenshot 29.

## §11 UI direction
Neutral `ops-theme` (black/white/neutral), status dot + label everywhere, compact tables and metric strips, map-focused live views, timeline details, phone-first Run app with ≥52px actions, labelled form errors (`FormField`, `ErrorNote`). Overview with time-to-accept / assign / pickup / deliver medians and SLA attainment (Runframe-style MTTA/MTTR analytics) · screenshot 01.
