# Home Service API

Node.js, Express, MongoDB/Mongoose REST API. All responses use `{ success, data, message }`.

Set `PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, and `EXPO_PUBLIC_API_URL` in the single `.env` file at the project root. The frontend reads the same file through its Expo config bridge.

```powershell
npm install
npm run seed
npm run dev
```

Only authentication endpoints are implemented in this scope. The remaining domain collections are schema-only and are synchronized on startup. See `requests.http` for auth requests. Email delivery is simulated by logging raw one-time tokens; payment/card data is not handled.

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
