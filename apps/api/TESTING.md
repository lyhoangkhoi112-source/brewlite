# API integration and browser E2E tests

These suites use a real PostgreSQL database and never fall back to `DATABASE_URL`
from an API `.env` file. Configure `TEST_DATABASE_URL` with a local-only
PostgreSQL connection to a dedicated database whose name ends in `_test`, for
example `brewlite_test`. Remote hosts, including Neon, are rejected before a
test or test server starts.

Create an empty local test database once (for example, in pgAdmin or with
`createdb -h localhost -p 5432 -U <user> brewlite_test`), then apply the
existing Prisma migrations to that database.

On PowerShell, set the connection string in the current terminal without adding
it to source control:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://<user>:<password>@localhost:5432/brewlite_test?schema=public'
$previousDatabaseUrl = $env:DATABASE_URL
$env:DATABASE_URL = $env:TEST_DATABASE_URL
npx prisma migrate deploy
if ($null -eq $previousDatabaseUrl) {
  Remove-Item Env:DATABASE_URL
} else {
  $env:DATABASE_URL = $previousDatabaseUrl
}
```

Run API integration tests and browser E2E tests from `apps/api`:

```powershell
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

The integration test exercises menu retrieval, guest order creation, mock
payment confirmation, validation, persisted order/payment status, and inventory
decrement. The browser test drives a guest through the menu, checkout, mock
payment, and confirmed order. Both suites create uniquely named fixtures and
delete only orders and products linked to those fixtures.
