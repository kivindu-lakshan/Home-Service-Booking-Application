# HomeHalo Phase 3 — provider service applications

Implemented in the running project at `C:\Users\Admin\Desktop\HCI\Home-Service-Booking-Application`. Authentication and admin service CRUD were preserved. Phase 4 was not implemented.

## Files created

- `frontend/src/app/provider/_layout.tsx` — provider-only route guard.
- `frontend/src/app/provider/dashboard.tsx` — provider dashboard links.
- `frontend/src/app/provider/apply.tsx` — selected service, professional details, documents and confirmed location.
- `frontend/src/app/provider/applications.tsx` — own applications with submission date and status badges.
- `frontend/src/api/provider-applications.ts` — typed API, multipart submission and frontend validation.
- `backend/src/routes/provider/provider.routes.js` — provider authorization, submission, private downloads and optional address lookup.
- `backend/tests/provider-applications.integration.cjs` — repeatable live integration checks using temporary records/files.
- `docs/PHASE3.md` — this report.

## Files modified

- `backend/src/models/index.js` — application/location schemas and indexes.
- `backend/src/app.js` — mount provider routes.
- `frontend/src/app/index.tsx` — redirect authenticated providers to their dashboard.
- `frontend/src/app/_layout.tsx` — disable the default provider header, keeping the arrow-only back control.
- `frontend/src/components/services/ServiceList.tsx` — provider-only Apply action on the existing shared service cards.
- Backend/frontend `package.json` and `package-lock.json` — Multer and SDK-compatible Expo DocumentPicker.
- `.gitignore` — exclude private certificate storage.

## Database inspection and models

The configured live database was inspected before adding schemas. It contained `providers`, but no `providerlocations`, provider application, or upload collection. There was no existing provider location model or storage implementation. The seed script mentions removing `providerlocations`, but that collection was absent in the connected database. No seed/reset was run.

Existing collections reused: `users`, `providers`, `services`, `servicecategories`. Added `ProviderLocation` explicitly mapped to the requested **`providerlocations`** name, and `ProviderApplication` mapped to **`providerapplications`**. No alternate location collection was created.

Application fields: `provider` (existing Provider reference), `service` (existing Service reference), `professionalName`, `phone`, `yearsExperience`, `aboutMe`, `qualifications`, `skills`, optional `priceFrom`, `location` (ProviderLocation reference), `documents` (name, MIME type, size, private storage key, generated document ID), `status`, and timestamps. User identity/email/password are not duplicated. Professional name/phone are prefilled where available and retained as the submitted professional contact information.

Each location contains `provider`, `address`, numeric `latitude` and `longitude`, plus timestamps. Coordinates are required, finite and range-checked. No fabricated coordinates are stored. Application/location creation uses a MongoDB transaction, requiring an Atlas/replica-set deployment.

## APIs and authorization

All new routes are under `/api/provider`, using the existing authentication middleware and `role('provider')`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/applications` | List only the signed-in provider's applications |
| POST | `/applications` | Multipart application JSON plus `documents` files |
| GET | `/applications/:id/documents/:documentId` | Download only that provider's document |
| GET | `/location-search?address=...` | Optional server-side Google Geocoding lookup |

Existing `GET /api/services` supplies active admin-created services. Submission also verifies the service and category are active. No token returns 401; customer/admin returns 403. Provider/profile references are derived server-side from the authenticated user. New provider profiles are created lazily with `pending_approval` and unavailable, without changing existing active profiles.

## Documents

Select 1–5 PDF, PNG or JPEG files, maximum 5 MiB each. Both client and server validate limits; server additionally checks file signatures, MIME and extension. Files are stored under `backend/storage/provider-documents`, or the absolute directory configured by backend `PROVIDER_UPLOAD_DIR`. MongoDB stores metadata/references, not binary data. Filenames are random UUIDs, excluded from Git, not publicly served, and accessible only through authenticated ownership checks. Storage keys are omitted from normal API responses. Invalid/concurrent duplicate submission failures clean up files. Production deployments need durable private storage/backups; ephemeral hosting filesystems are unsuitable.

## Pending status and duplicates

Every new request is server-created as `pending`. Requests containing client-controlled status, provider identity or document metadata are rejected. Valid schema statuses are pending/approved/rejected, but Phase 3 exposes no approval/rejection endpoint. `User.role` remains `provider`. Applications do not add services to the approved Provider.services array, activate provider profiles, or expose pending applicants to customers.

A partial unique MongoDB index on `(provider, service)` applies to pending/approved applications. This prevents concurrent duplicates; a preflight check provides a friendly 409 message: “You have already applied for this service.” Rejected applications do not block a later application.

## Location and Google configuration

The project already has expo-location, but no map component or Google key/configuration. The form supports GPS via the existing location helper or manual address plus exact coordinates, requires explicit confirmation, and opens a real Google Maps pin through a Maps URL. The map opens externally; there is no embedded draggable map in this phase.

Address search is implemented, but unavailable until configured. Set **`GOOGLE_MAPS_API_KEY` in the backend environment**, enable **Geocoding API** in a billed Google Cloud project, restrict the key to that API and the backend's public IP as appropriate, then restart the backend. Never use EXPO_PUBLIC for this server key. Search then returns matching addresses and coordinates for selection. Without the key the endpoint returns a clear 503, and GPS/manual input remains usable. Search is limited to 20 requests/minute per IP.

References: [Google Geocoding setup](https://developers.google.com/maps/documentation/geocoding/guides-v3/get-api-key), [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started), [Expo SDK 57 DocumentPicker](https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/).

## Verification performed

- 24 actual Express/MongoDB integration checks passed: missing-token 401 for read/submit; customer/admin 403 for read/submit; manipulated approved status 400; invalid coordinates 400; forged PDF 400; missing qualifications 400; simultaneous submissions produce one 201 and one 409; pending API/database status; storage key hidden; no approved provider service added; user stays provider; coordinates persisted; sequential duplicate 409; own list/correct service population; authenticated download/retained bytes; missing Google configuration 503. Temporary accounts, applications, locations and files were removed.
- Browser test at localhost:8081: common Provider login → dashboard → shared active services → correct selected service → professional fields → synthetic PDF upload → manual coordinate confirmation → successful submission → My Service Applications displays Pending and document count.
- Mobile viewport 390 × 844: application list fits and arrow-only back control verified. Temporary viewport reset.
- TypeScript passed. Expo lint: zero errors, one existing Axios import warning in `frontend/src/api/client.ts`.
- Native Android/iOS device upload and GPS permission flows were not exercised. Google search cannot be verified without a configured key. No live tracking/approval workflow was added.

## Complete manual test

1. Sign in with an existing provider through the common Login screen.
2. Select Available Services on the Provider Dashboard.
3. Select Apply for this Service; confirm the correct service name is shown.
4. Complete professional name, phone, experience, description, qualifications and skills; price is optional.
5. Attach a valid PDF/PNG/JPEG certificate under 5 MiB.
6. Enter the service address. Use current location, enter exact coordinates manually, or search/select after configuring Google Geocoding.
7. Review View pin in Google Maps, then Confirm location.
8. Submit. Check My Service Applications for service name, date and Pending.
9. Inspect providerapplications and the referenced providerlocations record in MongoDB; status must be pending and user role provider.
10. Attempt another application for the same service: expect a useful duplicate message/409.
11. POST the endpoint with customer/admin credentials: 403. Without a token: 401.

Repeat the automated checks from the project root with `node backend/tests/provider-applications.integration.cjs`. This uses the configured database, creates distinctly named temporary test accounts, and removes only its own records/files. Do not run the destructive seed script to test Phase 3.

## Remaining configuration / limitations

Google Geocoding key/billing/API enablement remains user-provided. Embedded interactive Maps and device-specific map configuration remain future work. Configure durable private file storage for production. Native device testing remains outstanding. The existing lint warning is unrelated to Phase 3. Dependency installs initially failed on the primary npm registry's untrusted certificate; installation succeeded through an HTTPS mirror without disabling TLS verification.
