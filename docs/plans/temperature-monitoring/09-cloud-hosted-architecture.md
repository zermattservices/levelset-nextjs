# Cloud-Hosted Architecture — Eliminating Self-Managed Infrastructure

## Key Insight: Tailscale Is Not Required

The UG65 gateway natively supports **MQTT over TLS** and **HTTP POST** to any cloud endpoint. Tailscale was one approach to simplify networking, but the gateway can connect directly to cloud-hosted brokers or APIs over standard internet — no VPN tunnel needed.

The gateway's built-in capabilities:
- **MQTT client**: Publish to any MQTT broker with TLS (port 8883)
- **HTTP POST**: Send decoded JSON payloads to any HTTPS endpoint
- **Node-RED**: Built-in edge processing for data transformation before forwarding
- **Built-in LoRaWAN Network Server**: No external LoRaWAN infrastructure needed

This means the entire backend can be cloud-hosted with zero self-managed servers.

---

## Architecture Options

### Option A: Gateway → Levelset API Route (Simplest)

```
EM320-TH sensors
    | (LoRaWAN)
    v
UG65 Gateway (built-in network server + payload codec)
    | (HTTP POST, decoded JSON, over HTTPS)
    v
Levelset API Route (Next.js /api/sensors/ingest)
    | (validate + insert)
    v
Supabase Postgres (sensor_readings table)
    | (query from dashboard)
    v
Levelset Dashboard (charts, alerts, compliance reports)
```

**How it works**: The UG65 decodes LoRaWAN payloads using its built-in codec, then HTTP POSTs the decoded JSON directly to a Levelset API endpoint. The API route validates, stores in Supabase, and triggers alerts.

| Pros | Cons |
|------|------|
| Zero additional infrastructure | Supabase Postgres not optimized for time-series |
| Fully integrated with Levelset | API route must handle high message volume |
| Single codebase | No built-in downsampling or retention policies |
| Cheapest option | Need to build charting/alerting from scratch |

**Estimated cost**: ~$25-80/month (Supabase Pro plan, already paid for)

---

### Option B: Gateway → MQTT Broker → InfluxDB Cloud

```
EM320-TH sensors
    | (LoRaWAN)
    v
UG65 Gateway (built-in network server)
    | (MQTT over TLS, port 8883)
    v
HiveMQ Cloud / EMQX Cloud (managed MQTT broker)
    | (rule engine or Telegraf bridge)
    v
InfluxDB Cloud (time-series storage)
    | (Grafana Cloud or InfluxDB UI for dashboards)
    v
Levelset Dashboard (embedded Grafana panels or API queries)
```

**How it works**: Gateway publishes raw MQTT messages to a managed broker. A Telegraf instance or broker rule engine routes data to InfluxDB Cloud. Grafana Cloud provides dashboards, optionally embedded in Levelset.

| Pros | Cons |
|------|------|
| Purpose-built time-series storage | Multiple services to manage |
| Native downsampling and retention | Monthly cost adds up |
| Grafana dashboards are excellent | Integration with Levelset requires embedding |
| Scales effortlessly | Customer data lives outside Supabase |

**Estimated cost at 1,000 locations**:

| Service | Monthly Cost |
|---------|-------------|
| InfluxDB Cloud (usage-based) | ~$143 |
| HiveMQ Cloud (Starter) | ~$52 |
| Grafana Cloud (Pro) | ~$50 |
| Telegraf (runs on any small VM or container) | ~$5-10 |
| **Total** | **~$250-255/month** |

---

### Option C: Gateway → Milesight Development Platform → Levelset

```
EM320-TH sensors
    | (LoRaWAN)
    v
UG65 Gateway (built-in network server)
    | (MQTT to Milesight cloud)
    v
Milesight Development Platform ($1/device/year)
    | (REST API + webhooks)
    v
Levelset API Route (webhook receiver)
    | (process + store)
    v
Supabase Postgres + Levelset Dashboard
```

**How it works**: The gateway forwards data to Milesight's Development Platform, which provides device management, data storage, and a REST API. Levelset receives data via webhooks and stores it in Supabase.

| Pros | Cons |
|------|------|
| $1/device/year — extremely cheap | Dependency on Milesight's platform |
| Full REST API for device management | Extra hop adds latency |
| Webhook push to any endpoint | Limited data retention on their side |
| Device provisioning UI included | Less control over data pipeline |

**Important**: The Milesight **IoT Cloud** (different product) has NO API — it's dashboard-only and a dead end for integration. The **Development Platform** is the one with full API access.

**Estimated cost at 1,000 locations**:

| Service | Monthly Cost |
|---------|-------------|
| Milesight Development Platform (1,000 gateways) | ~$83 ($1/device/year) |
| Supabase (already paid) | $0 incremental |
| **Total** | **~$83/month** |

---

### Option D: AWS IoT Core (Enterprise Path)

```
EM320-TH sensors
    | (LoRaWAN)
    v
UG65 Gateway (built-in network server)
    | (MQTT over TLS to AWS IoT Core endpoint)
    v
AWS IoT Core (managed MQTT + rules engine)
    | (IoT Rules → Lambda → TimeStream or DynamoDB)
    v
AWS TimeStream or RDS Postgres
    | (API Gateway + Lambda for dashboard queries)
    v
Levelset Dashboard (API integration)
```

| Pros | Cons |
|------|------|
| Enterprise-grade reliability | Most expensive option |
| IoT Rules engine for routing/filtering | AWS complexity and vendor lock-in |
| Native device shadow for state management | Requires AWS expertise |
| Scales to millions of devices | Overkill for restaurant monitoring |

**Estimated cost at 1,000 locations**:

| Service | Monthly Cost |
|---------|-------------|
| AWS IoT Core (messages + connections) | ~$78 |
| AWS TimeStream | ~$100-200 |
| Lambda + API Gateway | ~$20-50 |
| **Total** | **~$200-330/month** |

---

## Recommendation

### Start: Option A (Gateway → Levelset API)

For launch through ~100 locations, the simplest path is having gateways HTTP POST directly to a Levelset API route. This requires:
- One API route (`/api/sensors/ingest`) to receive and store data
- A `sensor_readings` table in Supabase
- Dashboard components for temperature charts and alerts
- Zero additional infrastructure or monthly costs

### Scale: Option B (Add InfluxDB Cloud)

When time-series query performance matters (100+ locations, compliance reporting, historical trends), add InfluxDB Cloud as the time-series store while keeping Supabase as the source of truth for device configuration and alert rules. The API route becomes a dual-write endpoint.

### Avoid: Option D (AWS IoT Core)

Unnecessary complexity for this use case. Only consider if an enterprise customer requires AWS-hosted infrastructure.

---

## Gateway HTTP POST Configuration

The UG65 can be configured to POST decoded JSON directly to an HTTPS endpoint:

### Gateway Setup (Web UI)

1. Navigate to **Network Server → Application**
2. Set **Type**: HTTP
3. Set **URL**: `https://app.levelset.io/api/sensors/ingest`
4. Set **Auth**: Bearer token or API key header
5. Set **Payload Format**: JSON (decoded by built-in codec)

### Payload Example (What Levelset Receives)

```json
{
  "devEUI": "24E124710B002A3F",
  "deviceName": "Walk-in Cooler",
  "applicationName": "Temperature Sensors",
  "timestamp": "2026-02-27T14:30:00Z",
  "fPort": 85,
  "data": {
    "temperature": 3.2,
    "humidity": 65.4,
    "battery": 98
  }
}
```

The gateway's built-in payload codec decodes the raw LoRaWAN bytes into human-readable JSON before forwarding. No server-side decoding needed.

### Gateway Node-RED Alternative

For more complex routing, the UG65's built-in Node-RED can:
- Add authentication headers
- Batch multiple sensor readings
- Filter out duplicate or stale data
- Route different sensors to different endpoints
- Add location/organization metadata before forwarding

---

## Gateway MQTT Direct-to-Cloud Configuration

For Option B (InfluxDB Cloud via managed MQTT):

### Gateway Setup (Web UI)

1. Navigate to **Network Server → Application**
2. Set **Type**: MQTT
3. Set **Server**: `broker.hivemq.cloud` (or any cloud MQTT broker)
4. Set **Port**: 8883 (TLS)
5. Set **Username/Password**: Broker credentials
6. Set **Client ID**: Gateway serial number
7. Set **Topic**: `levelset/{orgId}/{locationId}/sensors`

The gateway publishes to the cloud MQTT broker over TLS — no Tailscale, no VPN, no port forwarding needed. The broker handles routing to InfluxDB via Telegraf or a rule engine.

---

## Cloud vs Self-Hosted Comparison

| Factor | Self-Hosted (Doc 08) | Cloud Option A | Cloud Option B | Cloud Option C |
|--------|---------------------|----------------|----------------|----------------|
| Monthly cost (1K locations) | ~$700 | ~$25-80 | ~$250 | ~$83 |
| Infrastructure to manage | Hetzner + Tailscale | None | MQTT + InfluxDB configs | Webhook endpoint |
| Time-series performance | Excellent (InfluxDB) | Adequate (Postgres) | Excellent (InfluxDB) | Adequate |
| Setup complexity | High | Low | Medium | Low |
| Tailscale required | Yes | No | No | No |
| Data sovereignty | Full control | Supabase | InfluxDB Cloud regions | Milesight servers |
| Vendor dependency | Minimal | Minimal | InfluxDB + Grafana | Milesight |
| Gateway config | MQTT to Tailscale IP | HTTP POST to URL | MQTT to cloud broker | MQTT to Milesight |

---

## WiFi Setup (Same Simplicity, No Tailscale)

Without Tailscale, the customer setup is equally simple:

1. **Gateway ships pre-configured**: HTTP POST or MQTT endpoint pre-set, authentication baked in
2. **Customer plugs in gateway** and connects to WiFi (via app or web UI)
3. **Gateway connects to WiFi → HTTPS/MQTT starts flowing** — standard outbound HTTPS (port 443) or MQTTS (port 8883) works through any firewall
4. **No port forwarding, no VPN, no static IPs** — outbound connections only, works behind any NAT/firewall

The customer experience is identical to the Tailscale approach. The difference is purely backend architecture.
