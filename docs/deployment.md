# Production deployment

This project uses GitHub Actions for the quality gate, Render for the API,
Neon for PostgreSQL, and Vercel for the web app. Render builds the API Docker
image from `apps/api/Dockerfile`; a separate image registry is not required for
this source-based Render setup.

## One-time provider setup

### Neon

1. Create a PostgreSQL project and database.
2. Copy the direct (unpooled) connection string.
3. Add it as the GitHub Actions secret `NEON_DATABASE_URL`.
4. Add the same connection string to the Render API service as `DATABASE_URL`.

The workflow applies Prisma migrations before deploying the API. For a new
database, run `npm run db:seed` from `apps/api` once after the first migration
if the sample catalog is wanted. The seed is intentionally not run on every
deployment because it updates catalog fields.

### Render API

1. Create a Render web service connected to this repository.
2. Set the root directory to `apps/api`, select the Docker runtime, and use
   `Dockerfile`.
3. Disable automatic deploys; GitHub Actions triggers deployments after checks.
4. Set the health check path to `/health`.
5. Configure `DATABASE_URL`, a strong `JWT_SECRET`, and any other required
   application environment variables.
6. Add the Render API key as `RENDER_API_KEY` and the service ID as
   `RENDER_SERVICE_ID` in GitHub Actions secrets.
7. Add the public service URL, for example `https://brewlite-api.onrender.com`,
   as the GitHub Actions variable `RENDER_API_URL`.

### Vercel web app

1. Create a Vercel project for this repository and set its root directory to
   `apps/web`.
2. Set the production environment variable `NEXT_PUBLIC_API_URL` to the Render
   API URL, with no trailing slash.
3. Disable automatic production deployments so GitHub Actions is the single
   deployment path.
4. Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as GitHub
   Actions secrets. The IDs are available in the Vercel project's
   `.vercel/project.json` after linking it locally.
5. Add the public production URL, for example `https://brewlite.vercel.app`,
   as the GitHub Actions variable `VERCEL_PRODUCTION_URL`.

## Deployment flow

Pull requests run API lint, unit tests, API build, web lint, and web build.
Pushes to `main` and version tags (`v*`) run the same checks, then:

1. Apply pending Prisma migrations to Neon.
2. Ask Render to deploy the exact Git commit and wait for it to become live.
3. Smoke test the API at `/health`.
4. Build a Vercel production deployment without assigning the production
   domain, smoke test it, and promote it only after it responds successfully.
5. Smoke test the Vercel production URL.

The Vercel project must have `NEXT_PUBLIC_API_URL` set in its production
environment before the first deployment.

## Rollback

If Render deployment or its health check fails, the workflow stops. In Render,
open the service's **Events** or **Deploys** page and redeploy the last known
good deployment. If the Vercel candidate fails its smoke test, it is not
promoted and the current production deployment remains active. If the final
production smoke test fails after promotion, use Vercel's **Deployments** page
to promote the previous successful deployment.

Application rollback does not reverse database migrations. Keep migrations
backward-compatible with the previous application version and back up Neon
before applying a migration that could remove or transform data.
