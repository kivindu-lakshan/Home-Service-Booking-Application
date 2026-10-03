# Service images

Reuses Service.imageUrl, existing Multer/local-file storage, existing Expo DocumentPicker and React Native Image. No packages installed or required environment variables.

Admin Add/Edit Service now selects PNG/JPEG (maximum 5 MB), previews the current/selected image and supports replace/remove. Upload occurs during Save. Existing image URL entry remains supported. Uploads are stored in backend/storage/service-images under generated UUID filenames. MongoDB stores only a relative imageUrl path, never file bytes/base64. Maintain this directory on persistent storage and back it up in production. Unreferenced uploads after a failed/cancelled save are retained; files are not automatically deleted while another service may reference them.

POST /api/admin/services/images is authenticated/admin-only and rate limited. MIME/extension/signature and file count/size are checked. GET /api/services/images/:filename serves only UUID PNG/JPEG service images publicly, with cross-origin image headers and immutable caching. Provider certificates are not exposed. Existing service APIs already return imageUrl; add/edit validation accepts the generated internal path as well as HTTP(S) URLs.

Frontend resolves uploaded relative paths using the configured API origin on web, Android and iOS. Customer Service List and Service Details continue using the same CatalogueImage and unchanged container dimensions/rounded corners, now explicitly resizeMode=cover. Invalid/missing URLs and image-load failures use the existing placeholder. No name-based image mapping, hardcoded service images, replacement screens or style changes.

Changed files:
- backend/src/controllers/service/service.controller.js
- backend/src/routes/service/service.routes.js
- frontend/src/api/services.ts
- frontend/src/validation/service.ts
- frontend/src/app/admin/service-form.tsx
- frontend/src/components/customer/CustomerUI.tsx
- frontend/src/components/services/ServiceUI.tsx

New files:
- backend/src/controllers/service/service-image.controller.js
- frontend/src/utils/service-image.ts
- backend/tests/service-images.integration.cjs
- frontend/tests/service-images.cjs
- This document.

Admin/Provider dashboards, Customer Home, customer list/details screen layouts, bottom navigation and style definitions were not changed. Screens show the current placeholder until an admin selects an image and saves the service; no existing service was assigned an unsolicited image.

Verification: 31 database/API integration checks passed (temporary fixtures and uploads removed); component checks passed for API-origin resolution, cover sizing and missing/invalid/load-error fallback with unchanged dimensions. TypeScript and targeted ESLint passed. Expo Web export passed for all 49 routes. Full project lint still reports five existing unrelated errors in admin assignment/bookings/jobs and payment success screens. Android/iOS use the existing DocumentPicker and native FormData path; device testing was not performed.
