# Customer service and provider flow

Customers now see Customer Home at `/` after login. Admin and provider users retain the existing home screen and routes. The `/customer` route group and new APIs require the existing authenticated customer role.

Home → Services → Service Details → Provider List → Provider Details → Book This Provider → existing Payment Details. The service ID is retained through provider selection. Booking creation was missing in the repository, so the new appointment form creates an existing `Booking` document, then passes its ID to the existing payment flow. No second booking or payment model was added.

## Database relationships and verified data

- `ServiceCategory` uses `servicecategories`. `Service.category` references its `_id`.
- `Service` uses `services`. Only active services in active categories are shown.
- `Provider` uses `providers`. `Provider.services[].service` references `Service._id`; `priceFrom` is the provider's price for that service, falling back to the service's `basePrice` when absent.
- `Provider.user` references `User`, which provides the name and avatar. Customer responses exclude contact details, passwords, and account settings. Suspended provider accounts are hidden.
- Location is currently embedded in `Provider.city`, `latitude`, and `longitude`. A read-only inspection of the configured database found **3 categories, 3 services, 1 provider, and 0 providerlocations records**. The repository has no `ProviderLocation` model and its seed script lists `providerlocations` as a removed collection. Consequently there is no separate location relationship to join without inventing fields. The location endpoint returns the existing embedded provider location. The seed script was not run or modified.
- Service ratings are aggregated from existing `Review.service` references. Provider ratings use the existing `ratingAvg` and `reviewCount`.
- `Booking` references the authenticated customer, selected provider and service. Its address snapshot comes from an address owned by the customer. The server controls price and status, checks active service/provider membership, future dates, published availability when present, and the existing unique appointment index. New appointments use Sri Lanka time and the existing 12-hour stored time convention. Requests start pending and continue to the existing payment screen. No unconfigured taxes or extra charges are invented.

## Missing or unavailable data

Current service records have no `imageUrl`; provider avatar images are optional. Neutral image fallbacks are displayed. Categories have icon keys rather than image URLs, rendered with a small presentation-only icon map; categories, names, services and providers all come from the database. The provider has a city but no coordinates, and saved addresses may also lack coordinates. Nearest therefore reports that coordinates are required, instead of inventing distances. No separate provider location records or schema exist. There is no supplied reference image in the attachment; the UI follows the described layout and existing purple design system. The Custom Service card opens existing support rather than creating an unsupported custom-service model.

## API endpoints

New endpoints (all require authenticated customer access):

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/catalogue/categories` | Active service categories |
| GET | `/api/catalogue/services?categoryId=…&search=…` | Search and category filtering |
| GET | `/api/catalogue/services/:id` | Service details and review-derived rating |
| GET | `/api/catalogue/services/:id/providers?search=…&filter=…` | Matching providers; `all`, `top_rated`, `nearest`, `lowest_price` |
| GET | `/api/catalogue/providers/:id?serviceId=…` | Provider details with selected-service membership validation |
| GET | `/api/catalogue/providers/:id/location` | Existing embedded provider location; details also include it |
| POST | `/api/bookings` | Create a booking in the existing model |
| GET | `/api/bookings/:id` | Read a booking owned by the customer; completes the existing `getBooking` utility |

Reused endpoints: `/api/auth/login`, `/api/auth/me`, `/api/addresses`, `/api/payments/bookings`, `/api/payments/booking/:bookingId` (GET/POST), `/api/payments/methods`, and existing support endpoints behind the Custom Service card. All new API calls use the shared Axios client and token handling. `EXPO_PUBLIC_API_URL` or Expo `extra.apiUrl` now also takes precedence on web; the existing local-development fallback remains centralized.

Booking body: `serviceId`, `providerId`, `addressId`, `scheduledDate` (`YYYY-MM-DD`), `scheduledTime` (24-hour `HH:mm`), optional `notes`. Unknown fields are rejected. Booking IDs are returned to the existing payment screen; prices, customer IDs and status cannot be supplied by the client.

## Created files

- `backend/src/controllers/catalogue/catalogue.controller.js`
- `backend/src/routes/catalogue/catalogue.routes.js`
- `backend/src/controllers/booking/booking.controller.js`
- `backend/src/routes/booking/booking.routes.js`
- `backend/test/catalogue-booking.test.js`
- `frontend/src/api/catalogue.ts`
- `frontend/src/hooks/useCatalogueData.ts`
- `frontend/test/customer-flow.test.cjs`
- `frontend/src/components/customer/CustomerUI.tsx`
- `frontend/src/components/customer/CustomerHome.tsx`
- `frontend/src/app/customer/_layout.tsx`
- `frontend/src/app/customer/services.tsx`
- `frontend/src/app/customer/service.tsx`
- `frontend/src/app/customer/providers.tsx`
- `frontend/src/app/customer/provider.tsx`
- `frontend/src/app/customer/book.tsx`
- `CUSTOMER_FLOW.md`

## Modified files

- `backend/src/app.js`: mount catalogue and booking routes.
- `frontend/src/api/client.ts`: honor existing API configuration on web too.
- `frontend/src/app/_layout.tsx`: register customer route group.
- `frontend/src/app/index.tsx`: render Customer Home only for customers.
- `frontend/src/app/profile.tsx`: enable Services navigation for customers.
- `frontend/src/app/bookings/index.tsx`: add customer bottom navigation and reload when screen regains focus after booking.
- `frontend/src/components/ui.tsx`: optional accessible disabled state for existing buttons.

## Validation

The catalogue/booking route tests mock database queries, with real Express routing and JWT authentication. They cover customer authorization, category and service matching, escaped search, privacy, sorting, missing coordinates, active data, customer-owned address and booking access, server-controlled price/status, invalid dates, availability, duplicate appointment conflicts and safe errors. Frontend tests exercise actual screen event handlers, including category filtering, role guards, selected IDs through provider selection, the payment handoff and duplicate-tap protection.

- Backend: all **263 tests passed**, including 24 new catalogue/booking tests.
- Frontend: all 50 existing tests and **11 new flow tests passed**.
- `tsc --noEmit`: passed.
- ESLint on all changed frontend implementation files: no errors; one existing Axios import warning.
- Expo web export: passed, including all customer routes. Output is under the ignored `frontend/dist/customer-flow-preview` directory.
- Full `npm run lint`: existing errors in Admin, payment and review screens; those unrelated screens are unchanged.
- Database inspection was read-only. No seed, migration or live booking/payment write was performed. Browser/native device visual verification was not performed.
