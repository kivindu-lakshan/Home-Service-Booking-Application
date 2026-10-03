# Home Service API

Node.js, Express, MongoDB/Mongoose REST API. All responses use `{ success, data, message }`.

Set `PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, and `EXPO_PUBLIC_API_URL` in the single `.env` file at the project root. The frontend reads the same file through its Expo config bridge.

```powershell
npm install
npm run seed
npm run dev
```

Authentication remains available under `/api/auth`; the remaining domain collections are synchronized on startup. See `requests.http` for auth requests. Email delivery is simulated by logging raw one-time tokens; payment/card data is not handled.

Payment, review, and admin management endpoints are now backed by MongoDB:

| Method          | Endpoint                                      | Purpose                                            |
| --------------- | --------------------------------------------- | -------------------------------------------------- |
| GET/POST        | `/api/payments/booking/:bookingId`            | Read or record a payment record                    |
| GET/POST/DELETE | `/api/payments/methods`                       | Manage saved payment methods                       |
| POST            | `/api/reviews`                                | Submit one review for a completed customer booking |
| GET             | `/api/reviews/provider/:providerId`           | Read provider rating and reviews                   |
| GET             | `/api/reviews/booking/:bookingId`             | Read a booking review                              |
| GET             | `/api/admin/dashboard`                        | Admin-only MongoDB aggregations/counts             |
| GET             | `/api/admin/bookings`                         | Admin-only search/filter bookings                  |
| GET             | `/api/admin/bookings/:id/available-providers` | Find active available providers                    |
| POST            | `/api/admin/bookings/:id/assign`              | Persist provider assignment                        |
| GET             | `/api/admin/jobs`                             | Admin-only active job monitor                      |
| PATCH           | `/api/admin/jobs/:id/status`                  | Persist job status changes                         |
| GET/POST        | `/api/bookings`                               | List own bookings or create new scheduled booking  |
| GET             | `/api/bookings/slots`                         | Get available scheduling time slots                |
| GET             | `/api/bookings/:id`                           | Get single booking details & payment state         |
| PATCH           | `/api/bookings/:id/reschedule`                | Reschedule booking date/time slot                  |
| PATCH           | `/api/bookings/:id/cancel`                    | Cancel booking with reason                         |
| PATCH           | `/api/bookings/:id/status`                    | Provider/Admin live job status progress            |

The frontend refreshes data when these screens open and after mutations; bookings and jobs also support pull-to-refresh. Customers can schedule new bookings directly from services, choose dates/slots, reschedule, cancel, or track live service status.

| Method | Endpoint                        | Auth   |
| ------ | ------------------------------- | ------ |
| POST   | `/api/auth/register`            | No     |
| POST   | `/api/auth/login`               | No     |
| GET    | `/api/auth/me`                  | Bearer |
| POST   | `/api/auth/change-password`     | Bearer |
| POST   | `/api/auth/forgot-password`     | No     |
| POST   | `/api/auth/reset-password`      | No     |
| POST   | `/api/auth/verify-email`        | No     |
| POST   | `/api/auth/resend-verification` | Bearer |
| DELETE | `/api/auth/me`                  | Bearer |
