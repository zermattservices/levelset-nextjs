# Integration Options — Levelset vs Standalone

Two approaches for the customer-facing dashboard. Both share the same backend infrastructure (gateway → MQTT → InfluxDB). The difference is where the UI lives and how tightly it integrates with Levelset.

---

## Option A: Built into Levelset Dashboard

### How It Works

Add temperature monitoring as a new module in the existing Next.js dashboard at `app.levelset.io`, alongside PEA ratings, scheduling, and discipline.

### Architecture

```
InfluxDB ←── Levelset API route (/api/temperature/*) ←── Dashboard components
                                                              │
                                                     PermissionsProvider
                                                     (P.TEMP_VIEW_DATA, etc.)
```

**Data flow**:
1. API routes in `pages/api/temperature/` query InfluxDB for sensor data
2. Components in `components/pages/TemperatureMonitoring/` display dashboards, charts, alerts
3. Permission checks via existing `PermissionsProvider` with new permission module constants
4. Org/location scoping via existing `AuthProvider` and `LocationProvider`

### What Gets Built

| Component | Location |
|-----------|----------|
| Page wrapper | `pages/temperature.tsx` |
| Page component | `components/pages/TemperatureMonitoring/TemperatureMonitoring.tsx` |
| Sensor list view | `components/pages/TemperatureMonitoring/SensorList.tsx` |
| Temperature chart | `components/pages/TemperatureMonitoring/TemperatureChart.tsx` |
| Alert configuration | `components/pages/TemperatureMonitoring/AlertSettings.tsx` |
| API routes | `pages/api/temperature/readings.ts`, `alerts.ts`, `sensors.ts` |
| Permission constants | Add to `packages/permissions/src/constants.ts` |
| Sidebar nav item | Update `components/shared/Sidebar/` |
| Supabase tables | `sensor_devices`, `sensor_alerts`, `sensor_alert_rules` (metadata only — readings stay in InfluxDB) |
| i18n strings | `locales/{en,es}/common.json` — add temperature monitoring labels |

### Advantages

- Customers already use Levelset — one login, one app
- Leverages existing auth, permissions, org/location scoping
- Cross-feature value: temperature data alongside employee performance, scheduling, discipline
- Faster to market if UI is simple (tables + charts)
- MUI DataGrid Pro and charting libraries already available

### Disadvantages

- Dashboard is Next.js Pages Router — no SSR for time-series data, all client-side fetching
- Need to add InfluxDB client to the Next.js backend (new dependency)
- Real-time updates would require WebSocket or polling (no existing pattern for this in the dashboard)
- If temperature monitoring grows complex, it could bloat the dashboard codebase

### InfluxDB Client in Next.js API Routes

```typescript
// lib/influxdb.ts
import { InfluxDB } from '@influxdata/influxdb-client';

const influxDB = new InfluxDB({
  url: process.env.INFLUXDB_URL!,
  token: process.env.INFLUXDB_TOKEN!,
});

export function getQueryApi(org: string = '') {
  return influxDB.getQueryApi(org);
}
```

```typescript
// pages/api/temperature/readings.ts
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getQueryApi } from '@/lib/influxdb';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient();
  // ... auth check, get orgId, locationId ...

  const queryApi = getQueryApi();
  const query = `
    from(bucket: "sensor_data")
      |> range(start: -24h)
      |> filter(fn: (r) => r["org_id"] == "${orgId}" and r["location_id"] == "${locationId}")
  `;

  const results = [];
  // ... execute query, collect results ...

  return res.status(200).json({ readings: results });
}
```

---

## Option B: Standalone Product

### How It Works

Separate frontend application with its own domain (e.g., `sensors.levelset.io` or `monitor.levelset.io`). Shares Supabase for auth/user management but has its own UI and potentially its own backend.

### Architecture

```
InfluxDB ←── Standalone API (Hono or Next.js) ←── Standalone Frontend
                      │
               Supabase (shared auth)
```

### What Gets Built

| Component | Notes |
|-----------|-------|
| New Next.js or Vite app | Separate from dashboard codebase |
| Auth integration | Use shared Supabase auth (SSO with Levelset dashboard) |
| Temperature dashboard | Custom UI optimized for monitoring (large displays, kiosk mode) |
| Alert management | Custom alert rules UI |
| API layer | Could be Hono.js (like agent) or Next.js API routes |
| Deployment | Vercel (consistent with dashboard) or Fly.io |

### Advantages

- Clean separation — temperature monitoring complexity doesn't affect the main dashboard
- Can optimize UI for monitoring use case (real-time updates, large-screen displays, kiosk mode)
- Could be sold to non-Levelset customers as a standalone product
- Easier to iterate rapidly without worrying about dashboard regressions
- Could use a more modern stack (App Router, React Server Components) without conflicting with dashboard constraints

### Disadvantages

- More infrastructure to maintain
- Customers need to context-switch between two apps
- Duplicated auth/permissions logic
- Longer time to market
- Loses the cross-feature integration value

---

## Recommendation

**Start with Option A** (built into Levelset). Here's why:

1. The initial UI is straightforward — sensor list, temperature charts, alert config. This doesn't require a separate app
2. Cross-feature integration is a competitive advantage over ComplianceMate (which is standalone)
3. Existing auth, permissions, and org/location scoping eliminates weeks of work
4. If temperature monitoring grows complex enough to warrant separation, extract it later
5. The InfluxDB API routes are the same either way — the frontend choice doesn't affect the backend

**If Option B is needed later**: The InfluxDB integration, MQTT infrastructure, and Tailscale networking are all backend concerns that remain the same. Only the frontend would change. This makes extraction straightforward.

---

## Supabase Tables (Needed Either Way)

Sensor readings live in InfluxDB (time-series optimized). But metadata, configuration, and alert rules belong in Supabase alongside the rest of the Levelset data.

### sensor_devices

```sql
CREATE TABLE sensor_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  dev_eui TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,                    -- "Walk-In Cooler", "Freezer #1"
  sensor_type TEXT NOT NULL DEFAULT 'temperature_humidity',
  gateway_id UUID REFERENCES sensor_gateways(id),
  temp_min_threshold NUMERIC,           -- alert if below (°F or °C based on org setting)
  temp_max_threshold NUMERIC,           -- alert if above
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
  org_id UUID NOT NULL REFERENCES orgs(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  mac_address TEXT NOT NULL UNIQUE,
  tailscale_ip TEXT,
  hostname TEXT,                         -- "gw-{locationId}"
  firmware_version TEXT,
  is_online BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### sensor_alert_rules

```sql
CREATE TABLE sensor_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  location_id UUID REFERENCES locations(id),    -- NULL = org-wide default
  sensor_id UUID REFERENCES sensor_devices(id), -- NULL = all sensors at location
  rule_type TEXT NOT NULL,                       -- 'temp_high', 'temp_low', 'humidity_high', 'battery_low', 'offline'
  threshold_value NUMERIC,
  duration_minutes INT DEFAULT 5,               -- must exceed threshold for N minutes before alerting
  notify_email BOOLEAN DEFAULT true,
  notify_sms BOOLEAN DEFAULT false,
  notify_push BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### sensor_alerts (alert history)

```sql
CREATE TABLE sensor_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  sensor_id UUID REFERENCES sensor_devices(id),
  rule_id UUID REFERENCES sensor_alert_rules(id),
  alert_type TEXT NOT NULL,
  triggered_value NUMERIC,
  threshold_value NUMERIC,
  message TEXT,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES app_users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Permission Module

Add a new permission module for temperature monitoring:

| Module | Sub-Item Key | Description |
|--------|-------------|-------------|
| Temperature Monitoring | `TEMP_VIEW_DASHBOARD` | View temperature dashboard and readings |
| Temperature Monitoring | `TEMP_MANAGE_SENSORS` | Add/edit/remove sensors and gateways |
| Temperature Monitoring | `TEMP_MANAGE_ALERTS` | Configure alert rules and thresholds |
| Temperature Monitoring | `TEMP_ACKNOWLEDGE_ALERTS` | Acknowledge and resolve alerts |
| Temperature Monitoring | `TEMP_EXPORT_DATA` | Export temperature logs for compliance audits |

These would be added to `packages/permissions/src/constants.ts` and seeded via `scripts/seed-permission-modules.ts`.

---

## Mobile App Integration

The Levelset mobile app (Expo/React Native) would need:

1. **Gateway WiFi setup flow** — connect to gateway AP, configure WiFi credentials
2. **Sensor status view** — list of sensors with current temps, battery, last seen
3. **Push notifications** — for temperature alerts (already have push infra via Expo)
4. **Quick actions** — acknowledge alerts, view recent history

This would use the native API routes pattern (`/api/native/forms/temperature/`) with JWT auth and permission checks.
