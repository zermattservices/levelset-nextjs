# SensorCo Platform Architecture & Partner Integration

SensorCo is a standalone sensor monitoring platform. It has its own infrastructure, dashboard, and API. Partners like Levelset integrate via the SensorCo API to embed sensor data into their own products.

---

## SensorCo Platform Components

### SensorCo Dashboard (Direct Customers)

For customers who buy directly from SensorCo, the SensorCo dashboard is the primary interface.

**Stack**: Next.js (or similar), hosted on Vercel, backed by SensorCo's own Supabase project.

**Features**:
- Temperature/humidity charts per sensor
- Current status grid — all sensors at a glance
- Alert configuration — set thresholds per sensor
- Compliance log export (CSV/PDF for health department audits)
- Sensor management — rename, disable, view history
- Multi-location support with per-location views

### SensorCo API (Partner Integration)

For partners like Levelset, SensorCo exposes a REST API. Partners read sensor data, configure alerts, and manage devices through this API, then display the data in their own dashboards and mobile apps.

```
SensorCo API
    │
    ├── GET  /api/v1/locations/{id}/sensors         — list sensors at a location
    ├── GET  /api/v1/sensors/{id}/readings           — get readings (time range, pagination)
    ├── GET  /api/v1/sensors/{id}/status             — current status + last reading
    ├── PUT  /api/v1/sensors/{id}/config             — update thresholds, reporting interval
    ├── GET  /api/v1/locations/{id}/alerts            — list active/historical alerts
    ├── POST /api/v1/alerts/{id}/acknowledge          — acknowledge an alert
    ├── POST /api/v1/webhooks                         — register webhook for alert delivery
    └── GET  /api/v1/locations/{id}/compliance-report  — generate compliance export
```

**Authentication**: API key per partner, scoped to their customer/location set. Partners only see data for locations they manage.

### SensorCo Mobile App

SensorCo's own mobile app handles:
1. **Gateway WiFi setup** — the critical onboarding flow (see [04-provisioning-and-setup.md](./04-provisioning-and-setup.md))
2. **Push notifications** for alerts
3. **Quick status view** for direct customers

Partners may also build the WiFi setup flow into their own apps using the gateway's internal API (documented in [11-gateway-api-reference.md](./11-gateway-api-reference.md)). Levelset, for example, would integrate the WiFi setup flow into the Levelset mobile app so CFA operators never need to download a separate app.

---

## How Levelset Integrates (First Partner)

Levelset is SensorCo's first customer/partner. The integration looks like this:

```
Levelset Dashboard (app.levelset.io)
    │
    │ API calls to SensorCo
    │
    ▼
SensorCo API (api.sensorco.com)
    │
    │ Reads from SensorCo's Supabase
    │
    ▼
SensorCo Supabase Postgres
    (sensor_readings, sensor_devices, sensor_alerts, etc.)
```

### What Levelset Builds

| Component | Location | Description |
|-----------|----------|-------------|
| Temperature page | `components/pages/TemperatureMonitoring/` | Dashboard UI showing sensor data from SensorCo API |
| API proxy routes | `pages/api/temperature/` | Thin proxy that calls SensorCo API with Levelset's API key |
| Permission constants | `packages/permissions/` | `TEMP_VIEW_DASHBOARD`, `TEMP_MANAGE_ALERTS`, etc. |
| Sidebar nav item | `components/shared/Sidebar/` | Link to temperature monitoring page |
| i18n strings | `locales/{en,es}/common.json` | Temperature monitoring labels |
| Mobile WiFi setup | `apps/mobile/` | Gateway onboarding flow (calls gateway directly, not SensorCo API) |
| Alert webhook handler | `pages/api/webhooks/sensorco-alerts.ts` | Receives alert webhooks from SensorCo |

### What Levelset Does NOT Build

- Sensor data ingestion (SensorCo handles gateway → API → database)
- Alert threshold evaluation (SensorCo's alert engine)
- Device management / gateway communication (SensorCo via Tailscale)
- Compliance report generation (SensorCo API provides this)

### Levelset Permission Module

Add temperature monitoring permissions to Levelset's existing permission system:

| Module | Sub-Item Key | Description |
|--------|-------------|-------------|
| Temperature Monitoring | `TEMP_VIEW_DASHBOARD` | View temperature dashboard and readings |
| Temperature Monitoring | `TEMP_MANAGE_SENSORS` | Configure sensor names and settings |
| Temperature Monitoring | `TEMP_MANAGE_ALERTS` | Configure alert rules and thresholds |
| Temperature Monitoring | `TEMP_ACKNOWLEDGE_ALERTS` | Acknowledge and resolve alerts |
| Temperature Monitoring | `TEMP_EXPORT_DATA` | Export temperature logs for compliance audits |

These would be added to `packages/permissions/src/constants.ts` and seeded via `scripts/seed-permission-modules.ts`.

---

## SensorCo Database Schema

SensorCo has its own Supabase project. These tables live in SensorCo's database, NOT in Levelset's.

### customers

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                          -- "Levelset", "Joe's Pizza", etc.
  customer_type TEXT NOT NULL DEFAULT 'direct', -- 'partner' or 'direct'
  api_key TEXT UNIQUE,                          -- for API access
  webhook_url TEXT,                             -- for alert delivery
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### customer_locations

```sql
CREATE TABLE customer_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  name TEXT NOT NULL,                           -- "CFA #12345 - Main St"
  address TEXT,
  external_id TEXT,                             -- partner's internal ID (e.g., Levelset location_id)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### sensor_devices

```sql
CREATE TABLE sensor_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  location_id UUID NOT NULL REFERENCES customer_locations(id),
  dev_eui TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,                    -- "Walk-In Cooler", "Freezer #1"
  sensor_type TEXT NOT NULL DEFAULT 'temperature_humidity',
  gateway_id UUID REFERENCES sensor_gateways(id),
  temp_min_threshold NUMERIC,           -- alert if below (°C)
  temp_max_threshold NUMERIC,           -- alert if above (°C)
  humidity_min_threshold NUMERIC,
  humidity_max_threshold NUMERIC,
  reporting_interval_minutes INT DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  last_temperature NUMERIC,
  last_humidity NUMERIC,
  last_battery_pct INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### sensor_gateways

```sql
CREATE TABLE sensor_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  location_id UUID NOT NULL REFERENCES customer_locations(id),
  mac_address TEXT NOT NULL UNIQUE,
  tailscale_ip TEXT,
  hostname TEXT,                         -- "gw-{locationId}"
  firmware_version TEXT,
  api_key TEXT,                          -- per-location API key for ingest auth
  is_online BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### sensor_readings

```sql
CREATE TABLE sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  location_id UUID NOT NULL REFERENCES customer_locations(id),
  sensor_id UUID NOT NULL REFERENCES sensor_devices(id),
  dev_eui TEXT NOT NULL,
  temperature NUMERIC,
  humidity NUMERIC,
  battery_pct INT,
  rssi INT,
  snr NUMERIC,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### sensor_alert_rules

```sql
CREATE TABLE sensor_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  location_id UUID REFERENCES customer_locations(id),    -- NULL = customer-wide default
  sensor_id UUID REFERENCES sensor_devices(id),           -- NULL = all sensors at location
  rule_type TEXT NOT NULL,                                 -- 'temp_high', 'temp_low', 'humidity_high', 'battery_low', 'offline'
  threshold_value NUMERIC,
  duration_minutes INT DEFAULT 5,                          -- must exceed threshold for N minutes before alerting
  notify_email BOOLEAN DEFAULT true,
  notify_sms BOOLEAN DEFAULT false,
  notify_push BOOLEAN DEFAULT true,
  notify_webhook BOOLEAN DEFAULT true,                     -- send to partner webhook
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### sensor_alerts (alert history)

```sql
CREATE TABLE sensor_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  location_id UUID NOT NULL REFERENCES customer_locations(id),
  sensor_id UUID REFERENCES sensor_devices(id),
  rule_id UUID REFERENCES sensor_alert_rules(id),
  alert_type TEXT NOT NULL,
  triggered_value NUMERIC,
  threshold_value NUMERIC,
  message TEXT,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,                                    -- user identifier (could be partner user ID)
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Mobile App Integration

### SensorCo Mobile App (Direct Customers)

SensorCo builds its own mobile app for direct customers:
1. **Gateway WiFi setup flow** — connect to gateway AP, configure WiFi credentials
2. **Sensor status view** — list of sensors with current temps, battery, last seen
3. **Push notifications** — for temperature alerts
4. **Quick actions** — acknowledge alerts, view recent history

### Partner Mobile Integration (Levelset)

Partners like Levelset integrate the WiFi setup flow into their own mobile apps. The setup flow talks directly to the gateway hardware (not through SensorCo's API) since the phone needs to be on the gateway's local WiFi AP during setup.

For ongoing sensor status and alerts, the Levelset mobile app calls SensorCo's API through Levelset's own API proxy routes.

See [11-gateway-api-reference.md](./11-gateway-api-reference.md) for the WiFi setup API details.
