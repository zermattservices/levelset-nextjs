# Cloud-Hosted Architecture — Final Decision

## Architecture Summary

```
DATA PATH (standard internet):
  Gateway ──(HTTP POST over HTTPS)──> Levelset API ──> Supabase Postgres

MANAGEMENT PATH (Tailscale):
  Levelset API ──(SSH/REST over Tailscale)──> Gateway ──(downlink)──> Sensors
```

**Data transport**: Gateway HTTP POSTs decoded JSON to the Levelset API over standard HTTPS. No MQTT broker, no InfluxDB, no self-hosted server. Works through any firewall — it's just an outbound HTTPS request.

**Remote management**: Tailscale on every gateway for SSH access and REST API calls. Used on-demand to send downlink commands (config changes) and troubleshoot. Not involved in data transport.

**Storage**: Supabase Postgres for everything — already paid for, no additional infrastructure.

**Customer WiFi setup**: Native flow in the Levelset mobile app using the gateway's internal WiFi API (see [11-gateway-api-reference.md](./11-gateway-api-reference.md)).

---

## Why This Architecture

### What We Considered and Rejected

| Option | Why Rejected |
|--------|-------------|
| **Self-hosted Mosquitto + InfluxDB + Grafana** (doc 08) | Unnecessary server to manage. Gateway can POST directly to our API. |
| **MQTT to cloud broker + InfluxDB Cloud** | Extra services and cost. Postgres handles the volume at our scale. |
| **Milesight Development Platform** | Adds a middleman dependency for $83/mo. We can go direct. |
| **AWS IoT Core** | Overkill complexity. $300/mo for something Supabase does. |
| **Tailscale for data transport** | Not needed. Standard HTTPS works. Keep Tailscale for management only. |
| **No Tailscale at all** | Need SSH access for remote sensor config and troubleshooting. No technical staff on-site. |

### Why Gateway HTTP POST + Supabase Wins

1. **Zero additional infrastructure** — runs on Vercel + Supabase, which we already pay for
2. **Single data store** — sensor readings, device config, alerts all in Postgres alongside existing Levelset data
3. **Fully integrated** — no iframe embeds, no external dashboards, no separate auth systems
4. **Simplest deployment** — one API route, one set of tables, one codebase
5. **$0 incremental cost** at launch

---

## Monthly Costs

### At Launch (10 locations, 150 sensors)

| Component | Monthly Cost |
|-----------|-------------|
| Vercel (already paid) | $0 |
| Supabase Pro (already paid) | $0 |
| Tailscale Free (100 devices) | $0 |
| **Total additional infrastructure** | **$0** |

### At 100 Locations (1,500 sensors)

| Component | Monthly Cost |
|-----------|-------------|
| Supabase (already paid, may need compute add-on) | ~$0-50 |
| Tailscale Starter ($6/user × ~10 users) | ~$60 |
| **Total** | **~$60-110** |

### At 1,000 Locations (15,000 sensors)

| Component | Monthly Cost |
|-----------|-------------|
| Supabase (compute add-on for query volume) | ~$100-200 |
| Tailscale Enterprise (custom IoT pricing) | ~$500-800 |
| **Total** | **~$600-1,000** |
| **Revenue at $60/location** | **$60,000/mo** |
| **SaaS gross margin** | **~98%** |

---

## Data Volume Analysis

At 1,000 locations with 15 sensors each, reporting every 10 minutes:

| Metric | Value |
|--------|-------|
| Messages per second | 25 |
| Rows per day | 2,160,000 |
| Rows per month | ~64,800,000 |
| Row size (estimated) | ~200 bytes |
| Raw data per month | ~12 GB |
| 90-day retention | ~36 GB |

**Supabase Pro** includes 8 GB database space on the base plan. At scale, you'd add compute and storage add-ons (~$50-200/mo depending on usage). This is well within Supabase's capabilities for structured query patterns (queries are always scoped by `org_id` + `location_id` + time range).

### When to Add InfluxDB Cloud

If historical query performance becomes an issue (e.g., rendering 90-day charts across 15 sensors is slow), add InfluxDB Cloud (~$143/mo) as a dedicated time-series store:

- API route dual-writes: Supabase for config/alerts, InfluxDB for time-series
- Dashboard queries hit InfluxDB for charts, Supabase for everything else
- No architectural change needed — just add a second write target in the ingest endpoint

This is a scaling optimization, not a launch requirement.

---

## Gateway Configuration

### HTTP POST Setup (Pre-Shipping)

In the gateway web UI:

1. **Network Server → Applications** → create "Levelset Sensors"
2. **Data Transmission** → add HTTP integration:
   - **URL**: `https://app.levelset.io/api/sensors/ingest`
   - **Auth**: API key header (unique per location)
   - **Payload Codec**: Enabled
3. Save and Apply

### What the API Receives

```json
{
  "applicationID": 1,
  "applicationName": "Levelset Sensors",
  "deviceName": "walk-in-cooler-1",
  "devEUI": "24e124126a148401",
  "fPort": 85,
  "data": "AXVcA2c0AQRoZQ==",
  "object": {
    "temperature": 30.8,
    "humidity": 50.5,
    "battery": 92
  },
  "rxInfo": {
    "rssi": -45,
    "loRaSNR": 8.5,
    "time": "2026-02-27T12:00:00Z"
  }
}
```

The `object` field contains the decoded sensor values (decoded by the gateway's built-in codec). The `data` field contains the raw Base64-encoded LoRaWAN payload as a fallback.

### Levelset API Route (`/api/sensors/ingest`)

```typescript
// Pseudocode — actual implementation TBD
export default async function handler(req, res) {
  // 1. Validate API key (unique per location)
  const locationId = validateApiKey(req.headers['x-api-key']);

  // 2. Extract sensor data
  const { devEUI, object, rxInfo } = req.body;
  const { temperature, humidity, battery } = object;

  // 3. Insert reading
  await supabase.from('sensor_readings').insert({
    dev_eui: devEUI,
    location_id: locationId,
    temperature,
    humidity,
    battery,
    rssi: rxInfo?.rssi,
    snr: rxInfo?.loRaSNR,
    recorded_at: rxInfo?.time || new Date().toISOString(),
  });

  // 4. Check alert thresholds
  const rules = await supabase
    .from('sensor_alert_rules')
    .select('*')
    .eq('dev_eui', devEUI)
    .single();

  if (rules && (temperature > rules.max_temp || temperature < rules.min_temp)) {
    await supabase.from('sensor_alerts').insert({
      dev_eui: devEUI,
      location_id: locationId,
      alert_type: temperature > rules.max_temp ? 'temp_high' : 'temp_low',
      value: temperature,
      threshold: temperature > rules.max_temp ? rules.max_temp : rules.min_temp,
    });
    // Send push notification, email, etc.
  }

  return res.status(200).json({ ok: true });
}
```

---

## Tailscale Role (Management Only)

Tailscale is installed on every gateway **solely** for remote SSH access and REST API calls. It is NOT involved in data transport.

### What Flows Over Tailscale

| Action | How |
|--------|-----|
| Send downlink to sensor | `POST http://100.x.y.z:8080/api/urdevices/{devEUI}/downlink` |
| List paired sensors | `GET http://100.x.y.z:8080/api/urdevices` |
| Check gateway status | `ssh root@100.x.y.z` |
| Push firmware update | `scp firmware.bin root@100.x.y.z:/tmp/` |
| Debug connectivity | `ssh root@100.x.y.z ping google.com` |

### What Does NOT Flow Over Tailscale

- Sensor data readings (HTTP POST over standard internet)
- Dashboard queries (Supabase over standard internet)
- Mobile app interactions (Supabase + Levelset API over standard internet)

### Tailscale Is Free at Launch

Tailscale Free tier includes 100 devices. At 10 locations (10 gateways + 1 server = 11 devices), you're well within limits. Paid plans only needed past ~99 locations.
