# CompoundCA

A Canadian investment calculator with a React frontend and an ASP.NET Core Web API.

## Structure

```text
src/                         React + Tailwind CSS + Chart.js (Vite)
  api.js                     HTTP/JSON client
backend/CompoundCA.Api/       C# / ASP.NET Core (.NET 10)
  Controllers/               API endpoints
  Models/                    Validated request and response contracts
  Services/                  Investment projection calculations
tests/api.test.mjs           HTTP integration checks
```

The frontend sends calculator inputs to the API, which returns the metrics and yearly chart data. No database, EF Core, Supabase configuration, migrations, or persistence have been added. JWT authentication and user accounts are future work; both current endpoints are public.

## Run locally

Install Node.js 22.12+ (or a newer supported LTS) and the .NET 10 SDK. A .NET runtime alone cannot build the API.

Start the backend from the repository root:

```sh
dotnet run --project backend/CompoundCA.Api
```

The development profile listens on `http://localhost:5080`. In a second terminal:

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` requests to the backend. Both processes must be running. The page calculates the default plan on load and recalculates when you select **Calculate**. If a request fails, the page shows an error and keeps any previous result visible.

## API

- `GET /api/health`: returns `{ "status": "healthy" }` (process health only).
- `POST /api/projections`: returns the selected account projection, TFSA and taxable comparison series, chart labels, and effective rates.

Example JSON request (also available in `backend/CompoundCA.Api/CompoundCA.Api.http`):

```json
{
  "starting": 10000,
  "monthly": 500,
  "rate": 7,
  "years": 20,
  "account": "TFSA"
}
```

All fields are required. Starting balance accepts 0–1,000,000,000 CAD; monthly contributions accept 0–1,000,000 CAD; annual return accepts 0–100%; years must be a whole number from 0–100. Account must be `TFSA`, `RRSP`, or `Taxable`. Invalid requests return HTTP 400 with validation problem details. Request bodies are limited to 16 KB.

The calculation preserves the original monthly compounding and month-end contributions. Taxable returns subtract two percentage points, with a floor of zero. RRSP uses the same growth calculation as TFSA; deductions, contribution limits, withdrawal taxes, and inflation are not modeled.

The calculator has a shared limit of 120 requests per minute **per API instance**, returning HTTP 429 with a `Retry-After` header when exceeded. Health checks are exempt. This initial limiter is neither per-user nor distributed across instances.

## Verify

```sh
dotnet build backend/CompoundCA.Api
npm run build
```

With a fresh backend running in Development, run:

```sh
npm run test:api
```

The integration checks cover projection math, account selection, boundaries, invalid JSON/input, development CORS, and rate limiting. They consume the calculator quota; restart the backend or wait one minute before calculating again or rerunning tests. `API_BASE_URL` optionally overrides the test server address.

## Deployment configuration

- **Frontend / Vercel:** use the repository root, `npm run build`, and output directory `dist`. Set `VITE_API_BASE_URL` to the backend's HTTPS origin, without `/api` or a trailing slash, before building. See `.env.example`. Vite embeds this public URL at build time; do not put secrets in `VITE_` variables. `npm run preview` also needs a build with this URL because the development proxy is not used in preview.
- **Backend / Railway, Render, or Azure:** host as a .NET 10 application. Publish with `dotnet publish backend/CompoundCA.Api -c Release -o backend/publish`, then run `dotnet backend/publish/CompoundCA.Api.dll`. Configure `ASPNETCORE_URLS` to bind to the host's assigned port (for example `http://0.0.0.0:8080`) and `ASPNETCORE_ENVIRONMENT=Production`. Use the host's HTTPS termination. Configure `Cors__AllowedOrigins__0=https://your-app.vercel.app` (additional origins use indices 1, 2, etc.). Production permits no cross-origin browser access until configured. Health check path: `/api/health`.
- **Database / Supabase:** reserved for a later implementation; no connection is made.

No deployment resources are created by this repository setup.
