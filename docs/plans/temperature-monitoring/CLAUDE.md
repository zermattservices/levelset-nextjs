# SensorCo

IoT temperature sensor monitoring platform. Sells hardware + SaaS subscriptions to restaurants for food safety compliance. Partners like Levelset integrate via API.

## Product Spec

The `docs/plans/temperature-monitoring/` folder contains the complete product specification. Read the [README](./README.md) first for an overview, then the numbered docs for details.

**Start here for context**:
- [01-product-overview.md](./01-product-overview.md) — what we're building and why
- [03-architecture.md](./03-architecture.md) — end-to-end data flow and architecture decisions
- [05-integration-options.md](./05-integration-options.md) — database schema, API endpoints, partner integration
- [09-cloud-hosted-architecture.md](./09-cloud-hosted-architecture.md) — hosting, costs, ingest endpoint pseudocode

**Hardware references** (read when implementing ingest/downlink logic):
- [02-hardware.md](./02-hardware.md) — sensor and gateway specs
- [07-em320-th-sensor-reference.md](./07-em320-th-sensor-reference.md) — sensor payload format, downlink commands
- [11-gateway-api-reference.md](./11-gateway-api-reference.md) — gateway REST API for sending downlinks

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15, App Router |
| **Language** | TypeScript, strict mode |
| **Styling** | Tailwind CSS |
| **Components** | shadcn/ui |
| **Database** | Supabase (Postgres) |
| **Auth** | Supabase Auth |
| **Hosting** | Vercel |
| **Charts** | Recharts (for temperature dashboards) |

## Project Structure

```
sensorco/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, signup)
│   ├── (dashboard)/              # Authenticated dashboard pages
│   │   ├── locations/            # Location list and detail views
│   │   ├── sensors/              # Sensor detail, charts, config
│   │   ├── alerts/               # Alert management
│   │   └── settings/             # Account, billing, API keys
│   ├── api/
│   │   ├── sensors/ingest/       # Gateway HTTP POST endpoint (see doc 09)
│   │   └── v1/                   # Partner REST API (see doc 05)
│   └── layout.tsx
├── components/
│   ├── ui/                       # shadcn/ui components
│   └── ...                       # Feature components
├── lib/
│   ├── supabase/                 # Supabase client factories
│   ├── alerts/                   # Alert evaluation logic
│   └── gateway/                  # Gateway API client (downlink commands)
├── docs/plans/temperature-monitoring/  # Product spec (this folder)
└── supabase/migrations/          # SQL migrations
```

## Architecture

```
DATA PATH (no auth needed on gateway side):
  EM320-TH Sensors ──(LoRaWAN)──> UG65 Gateway ──(HTTP POST)──> /api/sensors/ingest ──> Supabase

MANAGEMENT PATH (Tailscale, on-demand):
  SensorCo API ──(SSH/REST over Tailscale)──> Gateway ──(downlink)──> Sensors

PARTNER PATH:
  Partner App ──(REST API with API key)──> /api/v1/* ──> Supabase
```

**Key decisions** (locked in, do not revisit):
- Gateway HTTP POSTs decoded JSON to our API — no MQTT broker, no InfluxDB
- Tailscale on every gateway for remote management only (not data transport)
- All sensor config changes via downlink commands through gateway REST API
- Supabase Postgres for everything (readings, devices, alerts, customers)
- Partner integration via REST API with API key auth

## Database

Schema is defined in [05-integration-options.md](./05-integration-options.md). Core tables:

| Table | Purpose |
|-------|---------|
| `customers` | SensorCo's customers (Levelset, direct restaurants, etc.) |
| `customer_locations` | Physical locations with sensors |
| `sensor_devices` | Device registry — maps DevEUI to name, customer, location |
| `sensor_gateways` | Gateway registry — Tailscale IP, API credentials, status |
| `sensor_readings` | Time-series — temperature, humidity, battery per reading |
| `sensor_alert_rules` | Configurable thresholds per sensor |
| `sensor_alerts` | Alert history — threshold breaches |

All tenant data is scoped by `customer_id`. Never query without it.

## API Endpoints

### Ingest (gateway → SensorCo)

```
POST /api/sensors/ingest
Header: x-api-key: {location-specific API key}
Body: Milesight gateway HTTP POST payload (see doc 09 for format)
```

This is the most critical endpoint. Every sensor reading flows through it. It must:
1. Validate the API key and resolve the location
2. Insert into `sensor_readings`
3. Check `sensor_alert_rules` for threshold breaches
4. Create `sensor_alerts` and fire webhooks if breached

### Partner API (see doc 05 for full list)

```
GET  /api/v1/locations/{id}/sensors
GET  /api/v1/sensors/{id}/readings?start=&end=
GET  /api/v1/sensors/{id}/status
PUT  /api/v1/sensors/{id}/config
GET  /api/v1/locations/{id}/alerts
POST /api/v1/alerts/{id}/acknowledge
POST /api/v1/webhooks
GET  /api/v1/locations/{id}/compliance-report
```

All partner API routes require `Authorization: Bearer {api_key}` header. Scope all queries by the customer associated with the API key.

## Commands

```bash
npm run dev              # Dev server (port 3000)
npm run build            # Production build
npm run lint             # Lint
npm run typecheck        # Type check (strict mode)
```

## Conventions

- **TypeScript strict mode** — always. No `any` types without justification.
- **Server Components by default** — only use `"use client"` when needed for interactivity
- **Supabase client**: Use `createServerClient` in Server Components/Route Handlers, `createBrowserClient` in Client Components. Never import `createClient` directly.
- **Tailwind only** — no inline styles, no CSS modules, no styled-components
- **shadcn/ui** — use existing components before building custom ones
- **Migrations** — all schema changes via migration files in `supabase/migrations/`

## What NOT to Do

- Never use Pages Router patterns — this is App Router only
- Never store sensor data outside Supabase without explicit decision
- Never expose gateway Tailscale IPs or credentials to the frontend
- Never query tenant tables without `customer_id` scope
- Never hardcode DevEUI, API keys, or Tailscale IPs
- Never commit `.env.local` or files containing secrets
