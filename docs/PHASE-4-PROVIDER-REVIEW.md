# Phase 4: provider application review

Admins can open Provider Applications from the existing home/dashboard, filter by All/Pending/Approved/Rejected, paginate, review submitted information and privately download supporting certificates. Pending applications offer approval confirmation and rejection confirmation with an optional reason. The management dashboard shows a live pending count and refreshes when focused.

Provider role remains `provider`. My Service Applications reloads from the backend on focus and displays the latest status and the provider's own rejection reason. There is no notification delivery model in this checkout; this status screen is the Phase 4 notification mechanism. No push/email delivery is claimed.

## Backend files

Modified:
- `backend/src/models/index.js`
- `backend/src/routes/admin/admin.routes.js`
- `backend/src/routes/provider/provider.routes.js`
- `backend/src/controllers/admin/admin.controller.js`
- `backend/src/controllers/catalogue/catalogue.controller.js`
- `backend/src/controllers/service/service.controller.js`
- `backend/src/controllers/booking/booking.controller.js`
- `backend/test/catalogue-booking.test.js`

Created:
- `backend/src/routes/admin/provider-applications.routes.js`
- `backend/src/controllers/admin/provider-applications.controller.js`
- `backend/src/utils/approved-providers.js`
- `backend/tests/provider-review.integration.cjs`

## Frontend files

Modified:
- `frontend/src/api/provider-applications.ts`
- `frontend/src/app/admin/dashboard.tsx`
- `frontend/src/app/admin/_layout.tsx` (new screen headers only; existing role guard retained)
- `frontend/src/app/provider/applications.tsx`
- `frontend/src/components/auth/RoleDashboard.tsx`
- `frontend/app.config.ts`
- `frontend/package.json`
- `frontend/package-lock.json`

Created:
- `frontend/src/api/admin-provider-applications.ts`
- `frontend/src/app/admin/provider-applications.tsx`
- `frontend/src/app/admin/provider-application/[id].tsx`
- `frontend/src/components/admin/ApplicationStatus.tsx`
- `frontend/src/utils/open-application-document.ts`

Also created this document.

## Packages and configuration

Added direct Expo-compatible dependencies through `npx expo install`: `expo-file-system ~57.0.7` and `expo-sharing ~57.0.22`. FileSystem was already present transitively. Added the Sharing config plugin manually to the existing dynamic app.config.ts after Expo requested it. A native development/release binary needs these modules available; physical-device document opening was not tested. Web downloads use the existing authenticated Axios client and browser Blob URLs.

No new environment variables. Existing `MONGODB_URI`, `JWT_SECRET`, optional `PROVIDER_UPLOAD_DIR`, and configured frontend API URL are reused. Existing MongoDB transaction support is required, as in Phase 3.

## APIs

All review routes inherit the existing admin router's authentication and `role('admin')` middleware:

| Method | Endpoint | Behavior |
| --- | --- | --- |
| GET | `/api/admin/provider-applications?status=pending&page=1` | 25 items per page, total count, pending count; supports all/pending/approved/rejected |
| GET | `/api/admin/provider-applications/:id` | Populated provider contact, service/category, professional details, location, documents and review audit |
| PATCH | `/api/admin/provider-applications/:id/approve` | Empty body; approves pending application for its service |
| PATCH | `/api/admin/provider-applications/:id/reject` | Optional `{ "rejectionReason": "..." }`, maximum 2000 characters |
| GET | `/api/admin/provider-applications/:id/documents/:documentId` | Authenticated private file download; no storage key or fabricated public URL |

Existing `/api/admin/dashboard` now returns `pendingProviderApplications`. Existing provider application list returns its stored review status/reason. Customer catalogue list, provider details/location and shared service summaries now use approved applications. Existing booking creation checks approval before accepting a provider/service pair.

Invalid IDs/missing applications return 404; invalid query/body returns 400; already reviewed or ineligible applications return 409. Unauthenticated requests return 401. Customers and providers return 403 even if a signed JWT contains an admin role claim, because middleware reads the current database user role.

## MongoDB and consistency

Reuse `ProviderApplication` in `providerapplications`; add optional `reviewedAt`, `reviewedBy` (User reference) and `rejectionReason`. Existing records need no rewrite. No new collections or duplicate relationship records.

Only pending → approved/rejected transitions are permitted. Approval validates the current provider account, provider suspension state, service and category. A transaction changes application status/audit and synchronizes the existing Provider.services offering used by booking. It activates a pending_approval Provider profile while preserving an existing active profile's availability. User.role is never updated. Conditional status updates and MongoDB transaction retry protect concurrent/repeated reviews; second attempts return 409 without duplicate offerings. Rejection does not add a service offering. Uploaded document storage keys remain hidden.

## Customer visibility

The approved application for the requested service is the authority. Backend queries include `status: approved` and the specific service reference. Pending/rejected applications and legacy manual service assignments without an approved application are not advertised to customers. No existing records were automatically approved.

Public responses whitelist display name/avatar, service offerings, experience/about, price, existing rating/review count, availability and service location. Private contact details, qualifications/certificates, review audit, rejection reasons and authentication data are excluded. Provider detail offers only approved active services; direct detail/location URLs cannot reveal an unapproved provider. Booking validation also blocks bypassing the provider list with an unapproved provider ID.

## Location

Admin review displays the stored readable ProviderLocation address without coordinate inputs or live tracking. The inspected checkout has no embedded map component or react-native-maps dependency; Phase 4 therefore uses the existing stored location without introducing a new map implementation. The provider application/location form was not redesigned.

## Verified

- `node tests/provider-review.integration.cjs`: 48 real MongoDB/API checks passed. Isolated test users, services, applications, locations and temporary files were cleaned up afterward.
- `node --test test/catalogue-booking.test.js test/service-management.test.js`: 61 tests passed, including existing booking/service behavior and unapproved booking rejection.
- `npx tsc --noEmit`: passed.
- ESLint on every changed frontend source/config file: passed.
- Expo Web export: all 48 routes exported successfully.
- Existing Phase 3 integration script: all 24 checks passed, including duplicate submission protection, pending status, stored location and private certificates.
- Full `npx expo lint`: six pre-existing errors remain in admin/assign-provider, admin/assign-service-provider, admin/bookings, admin/jobs, payment/success and reviews/provider. No unrelated screen changes were made to silence them.

Integration checks cover pending submission, admin retrieval, approval/rejection, review audit, concurrent duplicate approval, forbidden re-review, unchanged provider role, 401/403 permissions, private certificate downloads, service-specific customer filtering, public-field privacy and provider-specific status/rejection visibility. Native document viewer behavior still needs testing on a physical device. A browser click-through review has not been claimed.

Expo references: [SDK 57](https://docs.expo.dev/versions/v57.0.0/), [FileSystem](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/), [Sharing](https://docs.expo.dev/versions/v57.0.0/sdk/sharing/).
