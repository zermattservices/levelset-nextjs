# Architecture — Finalized Technical Stack

## Design Decisions

These are locked in based on our research and operational requirements:

1. **Data transport**: Gateway HTTP POSTs decoded JSON to Levelset API — no MQTT broker, no InfluxDB, no self-hosted infrastructure
2. **Remote management**: Tailscale on every gateway for SSH access — used on-demand for remote config changes and troubleshooting
3. **Sensor config**: All sensor configuration changes happen remotely via downlink commands sent through the gateway's REST API over Tailscale — zero on-site technical work
4. **Customer setup**: Native mobile app flow — user plugs in gateway, opens Levelset app, connects gateway to WiFi through a native UI
5. **Storage**: Supabase Postgres for everything — sensor readings, device registry, alert rules, alert history

## End-to-End Data Flow

```
EM320-TH Sensors ──(LoRaWAN 915MHz)──> UG65 Gateway
                                            │
                                    ┌───────┴────────┐
                                    │ Built-in        │
                                    │ Network Server  │
                                    │ + Payload Codec │
                                    │ (binary → JSON) │
                                    └───────┬────────┘
                                            │
                                    ┌───────┴────────┐
                                    │ HTTP POST       │
                                    │ (HTTPS, port 443│
                                    │  standard       │
                                    │  internet)      │
                                    └───────┬────────┘
                                            │
                                    ┌───────┴────────┐
                                    │ Levelset API    │
                                    │ /api/sensors/   │
                                    │   ingest        │
                                    └───────┬────────┘
                                            │
                                    ┌───────┴────────┐
                                    │ Supabase        │
                                    │ Postgres        │
                                    │ (sensor_readings│
                                    │  + device       │
                                    │  registry)      │
                                    └───────┬────────┘
                                            │
                              ┌─────────────┼─────────────┐
                              │             │             │
                        ┌─────┴─────┐ ┌────┴────┐ ┌─────┴─────┐
                        │ Dashboard  │ │ Alerts  │ │ Mobile    │
                        │ (Levelset) │ │ Engine  │ │ App       │
                        └───────────┘ └─────────┘ └───────────┘
```

## Remote Management Flow (Separate from Data)

```
Levelset Dashboard / API
    │
    │ (user changes sensor threshold or config)
    │
    ▼
Levelset API Route (/api/sensors/config)
    │
    │ (SSH over Tailscale to gateway at 100.x.y.z)
    │ (or HTTP to gateway REST API at 100.x.y.z:8080)
    │
    ▼
UG65 Gateway REST API (port 8080)
    │
    │ POST /api/urdevices/{devEUI}/downlink
    │ (downlink command queued)
    │
    ▼
EM320-TH Sensor
    (receives command on next uplink, within 10 min)
```

**Data flows over standard internet (HTTP POST). Management flows over Tailscale (SSH/API). These are completely separate paths.**

---

## Layer-by-Layer Breakdown

### Layer 1: Sensors → Gateway (LoRaWAN)

**Protocol**: LoRaWAN over 915 MHz radio (US915 band, channels 8-15)

The EM320-TH sensors transmit temperature and humidity readings at a configurable interval (default: 10 minutes). Each transmission includes battery level. The sensors use **Class A** operation: they send data, then open two short receive windows for any pending downlink commands.

**Join process (OTAA)**:
1. Sensor transmits Join Request with DevEUI and AppEUI
2. Gateway's built-in network server validates the AppKey
3. Session keys generated (NwkSKey, AppSKey)
4. Dynamic Device Address assigned
5. Sensor begins periodic data transmission

**Resilience**: If the sensor temporarily loses gateway connectivity, it stores up to 3,000 readings with timestamps and retransmits them when reconnected (Data Retransmission is enabled by default).

### Layer 2: Gateway (Decode + Forward)

The UG65 has a **built-in LoRaWAN network server** — no external ChirpStack or TTN required.

**On the gateway**:
1. **Packet Forwarder** receives raw LoRa packets
2. **Network Server** handles device authentication and session management
3. **Payload Codec** decodes binary payloads to JSON

The gateway transforms raw binary like `01 75 5C 03 67 34 01 04 68 65` into:
```json
{
  "battery": 92,
  "temperature": 30.8,
  "humidity": 50.5
}
```

### Layer 3: Gateway → Levelset API (HTTP POST)

The gateway HTTP POSTs decoded JSON to `https://app.levelset.io/api/sensors/ingest` over standard HTTPS (port 443). This works through any restaurant firewall — it's just an outbound HTTPS request, same as loading a web page.

**What Levelset receives**:
```json
{
  "applicationID": 1,
  "applicationName": "restaurant_sensors",
  "deviceName": "walk-in-cooler-1",
  "devEUI": "24e124126a148401",
  "fPort": 85,
  "data": "base64_encoded_raw",
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

**Gateway configuration** (pre-shipping, in web UI):
1. Network Server → Applications → create "Levelset Sensors"
2. Data Transmission → set Type: HTTP
3. Set URL: `https://app.levelset.io/api/sensors/ingest`
4. Set Auth: API key header (unique per location)
5. Enable Payload Codec for decoded JSON output

### Layer 4: Tailscale (Management Only)

Tailscale is installed on every gateway **solely for remote management** — SSH access and REST API calls. It is NOT used for data transport.

**Why Tailscale for management**:
- SSH into any gateway from anywhere (no customer involvement)
- Hit the gateway's REST API at `100.x.y.z:8080` for sending downlink commands
- Survives router changes, IP changes, NAT — always reachable
- Pre-authenticated before shipping (auth keys with `tag:sensor-gateway`)
- Costs nothing on the free tier up to 100 gateways

**What flows over Tailscale**:
- SSH sessions for troubleshooting
- Gateway REST API calls for sensor config changes (downlinks)
- Firmware updates (when needed)

**What does NOT flow over Tailscale**:
- Sensor data (flows over standard HTTPS)
- Dashboard queries (standard Supabase)

### Layer 5: Supabase (Storage + Auth)

All data lives in Supabase Postgres:

**Tables** (see [05-integration-options.md](./05-integration-options.md) for full schemas):

| Table | Purpose |
|-------|---------|
| `sensor_devices` | Device registry — maps DevEUI to sensor name, org, location |
| `sensor_gateways` | Gateway registry — Tailscale IP, firmware version, status |
| `sensor_readings` | Time-series data — temperature, humidity, battery, RSSI per reading |
| `sensor_alert_rules` | Configurable thresholds per sensor |
| `sensor_alerts` | Alert history — when thresholds were breached |

### Layer 6: Alerting

On every ingest, the API route checks the sensor's configured thresholds:

1. Gateway POSTs reading to `/api/sensors/ingest`
2. API inserts into `sensor_readings`
3. API queries `sensor_alert_rules` for this sensor's thresholds
4. If temperature > max or < min → insert into `sensor_alerts` + send push notification
5. Dashboard shows active alerts with acknowledgment workflow

Alert delivery:
- Push notification via mobile app
- Email (optional)
- SMS (optional, via Twilio)
- Dashboard banner/badge

### Layer 7: Dashboard + Mobile App

**Dashboard** (web):
- Temperature charts per sensor (Recharts or similar)
- Current status grid — all sensors at a glance with color-coded status
- Alert configuration — set thresholds per sensor
- Compliance log export (CSV/PDF for health department audits)
- Sensor management — rename, disable, view history

**Mobile app** (Expo/React Native):
- WiFi setup flow for new gateways (see [04-provisioning-and-setup.md](./04-provisioning-and-setup.md))
- Push notification alerts
- Quick status view — all sensors with current readings
- Sensor config — change thresholds, reporting intervals

---

## What This Architecture Does NOT Need

| Component | Why Not |
|-----------|---------|
| MQTT broker (Mosquitto) | Gateway posts directly to Levelset API via HTTP |
| Telegraf | No MQTT → InfluxDB pipeline needed |
| InfluxDB | Supabase Postgres handles the volume at launch; add later if needed |
| Grafana | Dashboard built natively in Levelset |
| Self-hosted server (Hetzner) | Everything runs on Vercel + Supabase (existing infra) |
| ChirpStack / TTN | Gateway has built-in network server |
| VPN for data transport | Standard HTTPS from gateway to API |

---

## Scaling Path

| Scale | Sensors | Data Volume | Storage Strategy |
|-------|---------|-------------|-----------------|
| **Launch** (10 locations) | 150 | ~216K rows/month | Supabase Postgres only |
| **Growth** (100 locations) | 1,500 | ~2.16M rows/month | Supabase Postgres + partitioning |
| **Scale** (1,000 locations) | 15,000 | ~21.6M rows/month | Add InfluxDB Cloud for time-series, keep Supabase for config |

At 1,000 locations with 10-minute reporting, you're writing 25 rows/second to Postgres. Supabase Pro handles this easily. The main concern at scale is historical query performance (e.g., "show me 90 days of data for all 15 sensors"), which is when you'd add InfluxDB Cloud as a dedicated time-series store.

---

## Key External Resources

| Resource | URL |
|----------|-----|
| UG65 HTTP API Specification | [resource.milesight.com/.../ug-http-api-documentation-en.pdf](https://resource.milesight.com/milesight/iot/document/ug-http-api-documentation-en.pdf) |
| Milesight SensorDecoders | [github.com/Milesight-IoT/SensorDecoders](https://github.com/Milesight-IoT/SensorDecoders) |
| EM320-TH User Guide | [resource.milesight.com/.../em320-th-user-guide-en.pdf](https://resource.milesight.com/milesight/iot/document/em320-th-user-guide-en.pdf) |
| UG65 User Guide | [resource.milesight.com/.../ug65-user-guide-en.pdf](https://resource.milesight.com/milesight/iot/document/ug65-user-guide-en.pdf) |
| Tailscale Auth Keys | [tailscale.com/kb/1085/auth-keys](https://tailscale.com/kb/1085/auth-keys) |
| Python Gateway API Client | [github.com/corgan2222/Milesight-Gateway-API](https://github.com/corgan2222/Milesight-Gateway-API) |
