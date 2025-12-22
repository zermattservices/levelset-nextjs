# Levelset API Documentation (Internal)

This folder contains internal API documentation. **This is NOT deployed to Mintlify** - it's for internal developer reference only.

## Contents

- `openapi.yaml` - OpenAPI 3.0 specification for Levelset APIs

## API Categories

### Authentication
- POST /api/auth/confirm - Confirm email/auth flow

### Employees
- GET/POST /api/employees - Employee CRUD operations
- POST /api/employees/sync-hotschedules - Sync from HotSchedules
- POST /api/employees/sync-hire-date - Sync hire dates
- GET /api/employees/rating-status - Get certification status

### Ratings
- GET/POST /api/ratings - Positional ratings operations
- GET /api/ratings/analytics - Rating analytics
- GET /api/rating-thresholds - Get rating scale thresholds
- GET /api/position-labels - Get position criteria labels

### Mobile API (Token-authenticated)
- GET /api/mobile/[token]/ratings - Submit/get ratings
- GET /api/mobile/[token]/positional-data - Get position data
- GET /api/mobile/[token]/infraction-data - Get infraction types
- POST /api/mobile/[token]/infractions - Submit infractions
- GET /api/mobile/[token]/position-labels - Get position labels
- GET /api/mobile/[token]/rating-thresholds - Get thresholds
- GET /api/mobile/manifest/[token] - PWA manifest

### Admin
- POST /api/admin/create-user - Create dashboard user
- POST /api/admin/create-admin-user - Create admin-only user
- POST /api/admin/setup-spanish-translations - Setup translations

### Other
- POST /api/bulk-update-employees - Bulk employee updates
- GET /api/evaluations - Certification evaluations
- POST /api/cron/evaluate-certifications - Cron job for certifications

## Usage

This OpenAPI spec is for internal reference. To view it:

1. Use a tool like Swagger UI or Redoc
2. Import into Postman or Insomnia
3. Use VSCode OpenAPI extensions

## Not for Public Distribution

This documentation is internal only. Public-facing documentation is in the `/docs` folder and deployed to docs.levelset.io via Mintlify.
