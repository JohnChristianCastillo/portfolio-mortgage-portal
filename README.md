# Mortgage Borrower Portal

A minimal borrower portal: simulate a mortgage, sign up, fill in and submit a
mortgage application, and upload supporting documents linked to it.

## What was built

- **Simulation** - property value, down payment, income/expenses, and term go
  in; loan amount, monthly payment, interest rate, and an affordability flag
  come out. Anonymous visitors can simulate freely; an IP that bursts past 8
  calls in 10 seconds gets auto-banned (invited/admin sessions are exempt).
- **Sign-up / login** - email + password, JWT-based sessions. Sign-up itself
  is limited to invited/admin sessions (checked via the gateway's verified
  tier header) so an open anonymous demo cannot turn into free database
  growth; login is open to anyone with an existing account.
- **Application** - a single component with visual step sections (About
  project / Personal details / Income details / Expenses details / Submit),
  pre-filled from a prior simulation if there is one. Submitting creates the
  application as a draft and immediately transitions it to submitted; a
  submitted application can no longer be edited.
- **Document upload** - pick a document type, upload a file, see it listed
  against the application. Content-type allowlist and a size limit, both
  enforced server-side.
- **Gateway integration** - this app is self-hosted behind an existing
  Cloudflare Tunnel + access gateway (not deployed throwaway on a PaaS): a
  WebSocket admission handshake, a tier badge and a live "N online" count in
  the nav, and admin-only endpoints to review/unban an auto-banned IP.
- Full test suite: 37 backend (pytest), 34 frontend (vitest).
- Dockerized as a single image: the Angular build copied into the FastAPI
  image as its static root, one container serving both the API and the SPA.

## What was intentionally not built, and why

The brief's own Loom walkthrough was treated as a reference, not a spec (it
says so explicitly), so several things it demos were deliberately left out:

- **Phone verification and office selection** - shown in the reference demo,
  not part of the written mission's four required steps.
- **Feasibility sliders on the simulation result** - nice-to-have polish on
  a number the backend already computes; not required.
- **Multiple named/typed documents with per-type verification status** - the
  brief only asks for "upload supporting documents linked to that
  application." One `document_type` label per upload is enough; there is no
  per-type verification workflow behind it.
- **Real file-content inspection** (magic-byte sniffing, virus scanning) -
  validation trusts the browser-declared content-type plus a size limit. A
  real bank would not stop there; this scope does.
- **Persisting simulation results** - a `SimulationResult` table was
  designed and then cut before being built. The frontend instead holds the
  last simulation's inputs/result in memory only (`LastSimulationService`,
  lives in the browser tab, gone on a full reload) so the application form
  can pre-fill from it, matching the demo's "convert the simulation into an
  application" step without a database table for it.
- **Email verification, real email sending, password reset** - stubbing
  these is explicitly allowed by the brief.
- **An admin/staff view of submitted applications** - out of scope per the
  brief's own "full scope" list. The admin-only banned-IP endpoints that do
  exist are about abuse control, not application review.
- **Angular NgRx, server-side rendering** - unjustified complexity at this
  size; a handful of signals per component was enough.
- **A gateway-wide ban** - the auto-ban only blocks an abusive IP from this
  app, not from the other apps behind the same gateway. Deliberate: the
  gateway's own equivalent mechanism was recently simplified specifically to
  keep per-app abuse policy out of shared infrastructure; this keeps that
  separation rather than reversing it.

## Architecture

- **Backend**: FastAPI, SQLite via SQLAlchemy. Layered as
  `api/` (routes + Pydantic schemas) -> `services/` (business rules: the
  draft/submitted state machine, ownership checks, document validation, the
  simulate abuse guard) -> `repositories/` (plain CRUD) -> `domain/` (ORM
  models + the amortization calculator). Object-oriented on purpose for this
  project - classes/interfaces at each of those layers - as a deliberate
  contrast to a sibling project in the same portfolio that uses a flat
  module/function style; both are valid, this one leans OOP.
- **Data model**: `User` (1) -> (N) `Application` (1) -> (N) `Document`, plus
  a standalone `BannedIp` table for the abuse guard. Ownership is enforced at
  the service layer: a request for someone else's application returns 404,
  not 403, so an id can't even be confirmed to exist.
- **Frontend**: Angular, standalone components, signals for local state,
  reactive forms. A functional HTTP interceptor attaches the JWT to outgoing
  requests; a route guard blocks `/apply` until logged in and carries a
  `returnUrl` so signing up mid-flow lands back where the borrower meant to
  go. A shared `extractErrorMessage()` helper turns a rejection - whichever
  layer produced it - into a specific, human message instead of a generic
  fallback.
- **Two tier concepts, deliberately not conflated**: the gateway's own
  admission tiers (admin/invited/anonymous, forwarded as `X-Session-Tier`)
  decide who can reach this app and, inside it, whether they may sign up or
  are exempt from the abuse guard. This app's own JWTs decide which borrower
  a logged-in session belongs to. Neither replaces the other.
- **Gateway admission handshake**: every `/api/*` call is gated behind an
  admitted WebSocket session at the gateway (`/ws?app=mortgage`) - a plain
  health check would be gated too, so `/health` is deliberately a top-level,
  ungated route, matching the other apps in this stack. `GatewayService`
  mirrors the existing React apps' own admission client; a route is
  detected as "behind the real gateway" via `document.baseURI` containing
  `/mortgage/`, so local dev needs no separate configuration.
- **Deploy shape**: one Docker image, built with `--base-href /mortgage/`
  (the gateway strips that prefix before forwarding, but the browser still
  resolves every relative URL - including plain API calls, not just asset
  tags - against it). A catch-all backend route serves a real file by path
  if one exists, otherwise falls back to `index.html`, since Angular's
  router uses real client-side paths (`/apply`, `/signup`) rather than hash
  routing.

## Running locally

One command, via Docker (builds the frontend and serves everything from one
image):

```
docker build -t mortgage-portal .
docker run -p 8500:8500 mortgage-portal
```

Then open `http://localhost:8500`.

For active development (hot reload on both sides), run two terminals instead:

```
# backend/
uv venv .venv && uv pip install -r requirements.txt --python .venv
.venv/Scripts/uvicorn app.main:app --host 127.0.0.1 --port 8500

# frontend/
npx ng serve --port 4200
```

Then open `http://localhost:4200` (its dev-server proxy forwards `/api/*` and
`/health` to the backend). The gateway admission handshake, tier badge, and
online count are all no-ops here - there is no gateway in local dev - so the
app behaves as if always admitted.

Backend tests: `cd backend && .venv/Scripts/python.exe -m pytest -q`.
Frontend tests: `cd frontend && npx ng test --watch=false`.

## Deliberate trade-offs from the time cap

- The application "multi-step form" is one component with step sections and
  in-memory navigation state, not a routed wizard with per-step persistence.
  Submitting does create-then-submit in one action rather than exposing a
  separate "save draft, come back later" flow.
- Document validation is allowlist + size limit only (see above).
- The simulate abuse guard's burst window is in-memory, not persisted - it
  only has to catch a rapid spam burst, so it resets on restart; the ban
  decision itself is persisted and survives restarts.
- No background workers, no Celery: nothing here needs one.
- UI design system (shared CSS custom properties + a handful of utility
  classes in the global stylesheet, since Angular scopes component styles
  by default) was a deliberate later pass once the four features worked
  end to end, not built in parallel with them.
