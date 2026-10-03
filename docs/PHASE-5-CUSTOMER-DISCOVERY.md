# Phase 5: existing customer discovery flow

The existing flow is retained: Customer Home → database categories → Service List/category/search → Service Details → approved Providers → Provider Details → reviews/saved location/published availability → existing booking entry.

Customer Home, category tiles, shared styles, headers, branding, icons, bottom navigation and route structure were not replaced. Admin Dashboard, Provider Dashboard, authentication, approval UI, provider application UI and booking/payment screens were not changed. Existing service/provider cards retain their design; only real descriptions, selected-service price, skills, availability text and a View Reviews action were connected. The existing review screen retains its rating/review layout with pagination controls and safer request lifecycle.

## Frontend files modified

- `frontend/src/api/catalogue.ts`: public skills/address response types.
- `frontend/src/api/domain.ts`: existing review request accepts service context, cancellation, pagination and a 15-second timeout.
- `frontend/src/app/customer/services.tsx`: real short description in the existing service card.
- `frontend/src/app/customer/service.tsx`: category and clear no-provider message.
- `frontend/src/app/customer/providers.tsx`: clearer empty-state message.
- `frontend/src/app/customer/provider.tsx`: selected service/price, public skills, View Reviews, explicit missing-availability message.
- `frontend/src/components/customer/CustomerUI.tsx`: real availability summary in existing provider cards; styles unchanged.
- `frontend/src/app/reviews/provider.tsx`: service context, abortable focus reload, retry and previous/more review actions. Existing review presentation retained.

## Backend files modified

- `backend/src/utils/approved-providers.js`: whitelist public professional skills.
- `backend/src/controllers/catalogue/catalogue.controller.js`: completed-booking reputation for provider lists/details; correct service-rating join through Booking.service.
- `backend/src/controllers/review/review.controller.js`: approved-provider checks, completed-booking review query, safe author fields, pagination and summary.
- `backend/src/routes/review/review.routes.js`: existing provider-review endpoint now requires authentication.

## New files

- `backend/src/utils/completed-reviews.js`: shared completed-booking aggregation and one batched rating query for a provider list.
- `backend/tests/customer-discovery.integration.cjs`: isolated MongoDB/API checks; temporary records/files cleaned up.
- This document.

No packages installed, new environment variables, new screens, duplicate API endpoints, collections or schema changes.

## Existing APIs used

- `GET /api/catalogue/categories`: active database categories/icons.
- `GET /api/catalogue/services?categoryId=...&search=...`: active services in active categories; literal escaped search.
- `GET /api/catalogue/services/:id`: real details/base price and completed-booking service review summary.
- `GET /api/catalogue/services/:id/providers`: approved applications for exactly this service; existing name/area search and rating/price/nearest filters retained.
- `GET /api/catalogue/providers/:id?serviceId=...`: selected approved service's public professional data, price and stored ProviderLocation; only approved active services offered.
- `GET /api/catalogue/providers/:id/location?serviceId=...`: existing approved saved-location query retained.
- `GET /api/reviews/provider/:providerId?serviceId=...&page=1`: existing endpoint, now authenticated. Requires an active approved provider/service relationship. Returns completed-booking reviews only, a real reputation summary and 20 reviews per page. Customer author display name/avatar are returned; booking metadata and private provider verification information are excluded.

Catalogue authentication/role middleware already restricts customer discovery to the current database customer's session. Provider-review reads also require a valid current database user session; no frontend-supplied role is trusted.

## Approval and privacy

ProviderApplication status `approved` plus the requested service ID is the backend authority. Pending and rejected applications never reach the customer response. Approval for Service A does not grant visibility for Service B. Suspended providers, inactive accounts/services/categories are excluded. The whitelist omits verification documents, qualifications, rejection reasons, audit fields, passwords, email/phone and authentication tokens. Public skills are plain professional text; uploaded certificates remain private.

Reputation is calculated from Review records joined to completed Bookings with matching provider/customer identities. Cached or seeded Provider rating fields do not substitute for actual completed-booking reviews. List ratings use one aggregation for all returned providers. Service ratings join Booking.service because Review has no service field.

## Location and availability limits

Details show the approved application's saved address. Coordinates are retained in the API for existing nearest filtering and future map integration; there are no coordinate inputs. This checkout has no embedded map component to reuse, so no new map or tracking implementation was introduced. Existing saved customer location/nearest behavior is preserved.

Existing weekly Provider.availability and isAvailable are reused. No invented dates or time slots. If no schedule is published, the UI says so and the existing booking entry remains available. Weekly hours are a published schedule, not a guarantee that a particular appointment is free; the existing booking API validates availability and slot conflicts. Full calendar/route/live-GPS work remains outside Phase 5.

## Verification

- `node tests/customer-discovery.integration.cjs`: 82 real MongoDB/API checks passed, covering all 12 required discovery cases plus completed reviews, private-field exclusion, real prices/locations, availability, review permissions and service deactivation. Temporary test records/files were removed.
- `node --test test/catalogue-booking.test.js test/service-management.test.js`: 61 tests passed.
- `npx tsc --noEmit`: passed.
- Targeted ESLint on all eight modified frontend files: passed.
- Expo Web export: all 49 routes exported successfully.
- Git comparison confirms customer shared style definitions are unchanged and no Admin/Provider screen diff was introduced in Phase 5.
- Full Expo lint reports five pre-existing errors in unrelated admin assignment/bookings/jobs and payment/success screens. The review-screen lifecycle error was fixed while modifying that screen.

API flow was exercised against MongoDB. Physical-device behavior and a complete browser click-through are not claimed by these checks.

Expo APIs/navigation were checked against [SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/) and [Expo Router documentation](https://docs.expo.dev/router/introduction/).
