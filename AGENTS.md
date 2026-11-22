# Agent notes

CampusCart is a MERN app: Express API in `server/`, React SPA in `src/`, shared
types in `shared/`, MongoDB via the official driver, Better Auth for sessions.
It is no longer connected to Lovable.

- Enforce every business rule in the Express API (`server/routes/*`), never only in the UI.
- Prices, order splitting and status changes are server-side; checkout runs in a MongoDB transaction.
- Persist purchase reviews in `reviews` linked to the order and product; only the buyer of a delivered order may review, once per product per order (unique index).
- Public review reads return only author name, rating, comment and date; never expose buyer ids, e-mails, phone numbers or student IDs.
- Student IDs (`user.studentId`, `seller_identities`) are private: owner and admins only. Student ID photos are Cloudinary "authenticated" assets shown via signed URLs.
- Uploaded image URLs must be validated with `assertOwnImageUrl` (uploader's own folder).
- Keep API responses in the shapes defined in `shared/types.ts`.
- Run `npm run typecheck` and `npm test` (with `TEST_MONGODB_URI` for API tests) before pushing.
- Don't force-push or rewrite pushed history.
