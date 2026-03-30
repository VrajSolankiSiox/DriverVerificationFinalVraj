# Rank Me Now — Hotel Demo Intelligence

Hotel Demo Intelligence is an internal sales intelligence and report-generation application for Rank Me Now. It helps reps, managers, and analysts build hotel demo narratives from manually defined compsets, uploaded Expedia rate files, and first-party website audits without claiming actual hotel revenue, occupancy, or proprietary financials.

## What the product does

The application is built around three experiences:

1. **Internal Workspace** for hotel setup, manual compsets, Expedia uploads, mapping templates, validation, website audits, and report QA.
2. **Presentation Mode** for client-safe screen sharing with slide-like sections and keyboard navigation.
3. **Exports** for PPTX and PDF artifacts generated from the same approved report data used in presentation mode.

Core capabilities:

- Subject hotel profile management
- Manual compset creation and reuse
- Expedia `.xlsx`, `.xls`, and `.csv` upload support
- Flexible column mapping templates and normalization
- Deterministic deduplication and import modes
- Rules-based rate positioning analytics
- Same-domain website crawler and website audit scoring
- Report builder with modular sections and approval flow
- Client-safe and internal export variants
- Activity logging and role-based access control

## Architecture overview

### Application layer

- **Next.js App Router** with server components by default
- Protected internal workspace under `app/(app)`
- Client-safe presentation and print routes under `app/(present)`
- Route handlers under `app/api/*` for authenticated mutation flows

### Domain/services layer

Business logic is kept in `lib/services/*`, `lib/uploads/*`, `lib/analytics/*`, `lib/website/*`, and `lib/reports/*`.

Key service groups:

- `lib/services/hotels.ts` — hotel CRUD and retrieval
- `lib/services/compsets.ts` — manual compset creation and retrieval
- `lib/services/uploads.ts` — file persistence, workbook parsing, validation, import
- `lib/services/website-audit.ts` — crawl orchestration and score persistence
- `lib/services/reports.ts` — report view model, section generation, approval flow
- `lib/services/exports.ts` — export artifact lifecycle

### Data layer

- **PostgreSQL** via Prisma ORM
- NextAuth users, accounts, sessions, and verification tokens
- Hotel/compset/upload/rate/website/report/export/activity models in Prisma

### Storage model for MVP

- **Database** for core state and analytics metadata
- **Local filesystem** for uploaded files and generated exports
  - `storage/uploads/`
  - `storage/exports/`

## Stack summary

- Next.js App Router + TypeScript
- React
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- NextAuth credentials auth
- Zod validation
- react-hook-form
- @tanstack/react-table
- Recharts
- SheetJS `xlsx`
- Cheerio
- Playwright
- PptxGenJS
- Vitest
- Docker Compose

## Project structure

```text
app/
  (app)/
  (present)/
  api/
components/
lib/
prisma/
public/
storage/
styles/
tests/
```

## Local setup

### 1. Copy environment variables

```bash
cp .env.example .env
```

### 2. Start Postgres

```bash
docker-compose up -d
```

### 3. Install dependencies

```bash
npm install
```

### 4. Generate Prisma client

```bash
npm run prisma:generate
```

### 5. Run migrations

```bash
npm run prisma:migrate
```

### 6. Seed demo data

```bash
npm run prisma:seed
```

### 7. Start the app

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment variables

The repo includes `.env.example` with the minimum required variables:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `APP_BASE_URL`
- `PLAYWRIGHT_BROWSERS_PATH`
- `WEBSITE_CRAWL_PAGE_LIMIT`
- `WEBSITE_CRAWL_MAX_DEPTH`
- `FEATURE_PAGE_SPEED_ADAPTER`

## Seed users

After running the seed script, use one of these credentials:

- `admin@rankmenow.io` / `Password123!`
- `manager@rankmenow.io` / `Password123!`
- `rep@rankmenow.io` / `Password123!`

## Seeded demo data

The seed script creates:

- 1 admin, 1 manager, 1 rep
- 1 subject hotel
- 4 comp hotels
- 1 manual compset
- 1 upload mapping template
- 90 days of sample rate observations
- 1 completed website snapshot
- 1 approved report with generated report sections
- 1 sample upload batch reference

## How uploads work

1. Create a subject hotel and compset.
2. Start an upload from `/uploads/new`.
3. Select workbook sheet.
4. Map source columns to logical fields.
5. Validate rows and hotel matching.
6. Import rows with `APPEND_NEW` or `UPSERT_MATCHING`.

The dedupe key is based on:

- hotel
- stay date
- capture date
- room type
- rate plan
- refundable flag
- currency

## How website audits work

Website audits are deliberately limited to:

- same-domain crawling only
- configurable page limit
- configurable crawl depth
- HTML pages only
- first-party hotel site analysis

The audit stores:

- snapshot-level subscores
- page-level extracted findings
- rule-based notes
- crawl transparency data

## How reports work

Reports are tied to:

- one subject hotel
- one manual compset snapshot/version

Statuses:

- `DRAFT`
- `REVIEW_READY`
- `APPROVED`
- `EXPORTED`

Only approved reports can be exported as **client-safe** artifacts.

## Presentation mode

Client-safe presentation mode is available at:

```text
/reports/[id]/present
```

Features:

- read-only deck-like rendering
- left/right keyboard navigation
- slide jump sidebar
- no internal notes or admin controls

## Exports

Two export types are implemented:

- **PPTX** via PptxGenJS
- **PDF** via Playwright PDF rendering

Two visibility variants are supported:

- `CLIENT_SAFE`
- `INTERNAL_FULL`

Export records are stored in `ExportArtifact` and downloadable from the export center.

## Tests

Run unit tests:

```bash
npm test
```

Run Playwright E2E:

```bash
npm run test:e2e
```

## Notes on filesystem-backed storage

This MVP stores uploaded files and generated exports on the local filesystem. For production deployment, replace or wrap the storage helpers in `lib/fs-storage.ts` with object storage such as S3, R2, or GCS.

## Deploying to Vercel

This repo is a standard **Next.js App Router** app and can be deployed to Vercel.

1. Provision a hosted Postgres database (e.g., Neon/Supabase) and copy its connection string.
2. In Vercel, set Environment Variables:
   - `DATABASE_URL` (use a pooled/transaction URL for serverless)
   - `DIRECT_URL` (use a direct connection URL for Prisma migrations)
   - `NEXTAUTH_URL` (your Vercel domain, e.g. `https://your-app.vercel.app`)
   - `NEXTAUTH_SECRET`
   - `APP_BASE_URL` (same as `NEXTAUTH_URL`)
3. In Vercel Project Settings → Build & Development Settings:
   - Build Command: `npm run vercel-build`

Notes:

- Prisma migrations are applied during build via `prisma migrate deploy` (see `package.json`).
- On Vercel, filesystem writes are routed to `/tmp` (ephemeral). For persistent uploads/exports, use object storage.

## Limitations

Current MVP limitations:

- Credentials auth only; no SSO/OIDC provider setup
- Export generation is synchronous rather than queued
- Page speed is intentionally adapter-stubbed
- The website audit crawler is conservative and same-domain only
- Presentation mode is optimized for practical demos, not full slide authoring
- Upload matching uses deterministic hotel-name normalization plus manual overrides, not fuzzy AI matching

## Recommended next steps

- Move exports/uploads to object storage
- Add background job processing for long-running exports and audits
- Add richer report section editing UI and drag-drop reorder UX
- Add audit comparison diffs between website snapshots
- Add org-scoped multi-tenancy if Rank Me Now needs separate data partitions
- Add optional SSO and stronger rate-limit persistence backed by Redis
