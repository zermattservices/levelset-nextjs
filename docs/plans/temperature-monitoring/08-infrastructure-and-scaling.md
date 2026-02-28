# Infrastructure & Scaling — Hosting 1,000+ Locations

## Scale Analysis

At 1,000 restaurant locations with 15 sensors each:

```
15,000 sensors x 1 message / 10 minutes = 25 messages/second
```

**This is trivially small.** A single Mosquitto instance handles 7,000+ msg/sec. InfluxDB handles 250,000+ writes/sec. We're operating at <0.5% of capacity on a single server.

### Data Volume

| Metric | Value |
|--------|-------|
| Messages per day | 2,160,000 |
| Raw data per day | ~432 MB (uncompressed) |
| 90-day raw storage | ~38 GB uncompressed, **~5-13 GB** after InfluxDB compression |
| 2-year downsampled (hourly) | ~5 GB compressed |
| **Total disk needed** | **~15-20 GB** |

---

## Recommended Architecture

```
┌──────────────────┐     ┌─────────────────────────────────────────┐
│  1,000 LoRaWAN   │     │         Hetzner CCX23                   │
│  Gateways        │     │   (4 vCPU, 16GB RAM, 160GB NVMe)        │
│                  │     │                                          │
│  Each running    │     │   Mosquitto MQTT (port 8883, TLS)        │
│  Tailscale       │─────│        │                                 │
│                  │     │        ▼                                 │
│  MQTT publish    │     │   Telegraf (mqtt_consumer)               │
│  over Tailscale  │     │        │                                 │
└──────────────────┘     │        ▼                                 │
                         │   InfluxDB 2.x OSS                      │
                         │     ├── "raw" bucket (90-day retention)  │
                         │     └── "downsampled" bucket (2-year)    │
                         │        │                                 │
                         │        ▼                                 │
                         │   Grafana / SensorCo Dashboard           │
                         │                                          │
                         │   Tailscale (on the server too)          │
                         │   Cost: ~$35-45/month                    │
                         └─────────────────────────────────────────┘
```

**All traffic flows over Tailscale's encrypted WireGuard tunnels.** No ports are exposed to the public internet. The MQTT broker listens only on the Tailscale interface.

---

## Server Sizing

### Recommended: Hetzner CCX23

| Spec | Value |
|------|-------|
| CPU | 4 dedicated vCPU |
| RAM | 16 GB DDR4 |
| Disk | 160 GB NVMe SSD |
| Network | 20 TB traffic included |
| Price | ~$35/month (increasing ~25% April 2026) |

### Resource Usage Estimate

| Service | RAM | CPU | Notes |
|---------|-----|-----|-------|
| Mosquitto | ~100 MB | Negligible | Single-threaded, handles 1K connections easily |
| Telegraf | ~100 MB | Negligible | MQTT consumer + InfluxDB writer |
| InfluxDB 2.x | 2-4 GB | Light, spikes during compaction | Well within limits |
| Grafana | ~500 MB | Light | Per-query CPU only |
| Tailscale | ~50 MB | Negligible | Userspace networking |
| OS overhead | ~2 GB | — | Ubuntu 22.04 LTS |
| **Total** | **~5-7 GB of 16 GB** | **Minimal** | **~60% headroom** |

### When to Scale Up

You do NOT need a bigger server or horizontal scaling until:

| Trigger | Current | Limit |
|---------|---------|-------|
| Sensor count | 15,000 | ~150,000-300,000 (10-20x growth) |
| Message rate | 25 msg/sec | ~7,000 msg/sec (Mosquitto with TLS) |
| Connections | 1,000 | ~25,000 (Mosquitto comfortable range) |
| Disk usage | ~15-20 GB | 160 GB available |
| Concurrent dashboard users | — | ~100 before Grafana needs attention |

**A single server handles 10-20x growth.** Years of runway before horizontal scaling is needed.

### Alternative Server Options

| Provider | Plan | Specs | Price | Notes |
|----------|------|-------|-------|-------|
| **Hetzner Cloud** | CCX23 | 4 vCPU, 16 GB, 160 GB | ~$35/mo | Recommended |
| **Hetzner Cloud** | CCX33 | 8 vCPU, 32 GB, 240 GB | ~$65/mo | Room for 50K sensors |
| **Hetzner Dedicated** | AX42 | Ryzen 5, 64 GB, 2x 512 GB NVMe | ~$45/mo | Best value for growth |
| **DigitalOcean** | Premium | 4 vCPU, 16 GB, 320 GB | ~$96/mo | 2-3x Hetzner cost |
| **AWS EC2** | t3.xlarge | 4 vCPU, 16 GB | ~$120/mo + EBS | 3-4x Hetzner cost |
| **Fly.io** | — | — | — | **Not recommended** — poor fit for stateful data infrastructure |

**Fly.io** excels at stateless app containers (like the SensorCo backend). But persistent NVMe storage for InfluxDB belongs on a dedicated VPS or bare metal.

---

## Tailscale at Scale

### The Device Count Problem

Tailscale's pricing is per-user, but IoT deployments have many devices and few users:

| Plan | Per User | Users Needed for 1K Devices | Monthly Cost |
|------|----------|----------------------------|-------------|
| Starter | $6/user | ~90 users (100 + 10/user) | $540 |
| Premium | $18/user | ~45 users (100 + 20/user) | $810 |
| **Enterprise** | **Custom** | **Custom IoT pricing** | **Contact sales** |

### Recommendation: Tailscale Enterprise

The Enterprise plan explicitly offers "Custom & IoT pricing" — designed for high device-to-user ratios. Contact Tailscale sales for a quote.

**Estimated cost**: $500-800/month for 1,000 devices (speculative, based on competitive landscape).

**Key features needed**:
- Programmatic auth key generation via API (for automated provisioning)
- ACL tags (`tag:sensor-gateway`) for zero-trust access control
- Device management API for fleet monitoring
- Pre-approved, reusable auth keys for batch provisioning

### Tailscale API for Provisioning Automation

```bash
# Generate auth key via API (OAuth recommended for automation)
curl -X POST "https://api.tailscale.com/api/v2/tailnet/{tailnet}/keys" \
  -H "Authorization: Bearer {oauth_token}" \
  -d '{
    "capabilities": {
      "devices": {
        "create": {
          "reusable": true,
          "preauthorized": true,
          "tags": ["tag:sensor-gateway"]
        }
      }
    },
    "expirySeconds": 7776000
  }'

# List all devices
curl "https://api.tailscale.com/api/v2/tailnet/{tailnet}/devices" \
  -H "Authorization: Bearer {oauth_token}"

# Remove a decommissioned gateway
curl -X DELETE "https://api.tailscale.com/api/v2/device/{deviceId}" \
  -H "Authorization: Bearer {oauth_token}"
```

### ACL Configuration

Gateways should only reach the MQTT server, not each other:

```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["tag:sensor-gateway"],
      "dst": ["tag:sensor-server:1883,8883"]
    },
    {
      "action": "accept",
      "src": ["tag:sensor-admin"],
      "dst": ["tag:sensor-gateway:22,80,443"]
    }
  ],
  "tagOwners": {
    "tag:sensor-gateway": ["autogroup:admin"],
    "tag:sensor-server": ["autogroup:admin"],
    "tag:sensor-admin": ["autogroup:admin"]
  }
}
```

This ensures:
- Gateways can only talk to the MQTT server (not to each other)
- Admin-tagged users can SSH into any gateway for troubleshooting
- No gateway can be used as a pivot point to attack others

### Budget Alternative: NetBird (Self-Hosted)

If Tailscale Enterprise pricing is too high:

| Option | Cost | Trade-offs |
|--------|------|------------|
| **NetBird Cloud (Team)** | ~$450/mo | WireGuard-based, designed for high device-to-user ratios |
| **NetBird Self-Hosted** | Free (BSD-3 license) | Run your own control plane, zero licensing cost |
| **Headscale** | Free | **Not recommended at 1000+ devices** — performance bottleneck with network map recalculation |

NetBird is the strongest budget alternative: open-source, WireGuard-based, and specifically designed for machine-heavy networks.

---

## MQTT Broker Choice

### Mosquitto vs EMQX

| Factor | Mosquitto | EMQX |
|--------|-----------|------|
| Your 1,000 connections | Trivial | Trivial |
| Your 25 msg/sec | Trivial | Trivial |
| Tested capacity | 100K+ connections | Millions |
| Threading | Single-threaded | Multi-threaded (Erlang) |
| Clustering/HA | No native support | Built-in Erlang clustering |
| Memory footprint | ~100 MB | ~500 MB+ |
| Rule engine | No | Yes (SQL-based data routing) |
| Operational complexity | Very low | Moderate |

**Verdict: Start with Mosquitto.** At 1,000 connections and 25 msg/sec, it's at <1% capacity. Only consider EMQX if you need native clustering for HA or grow past 10,000 gateways.

### Managed MQTT Alternatives (If You Don't Want to Self-Host)

| Service | Est. Monthly Cost | Notes |
|---------|-------------------|-------|
| Self-hosted Mosquitto | $0 (runs on same server) | Recommended |
| AWS IoT Core | ~$78/mo | Managed, but adds AWS complexity |
| HiveMQ Cloud | ~$52/mo | Per-message pricing |
| EMQX Cloud Dedicated | ~$234/mo | Overkill for this scale |

---

## Data Retention Strategy

InfluxDB handles this natively with bucket-based retention:

### Bucket Configuration

```
Bucket: "raw"
  Retention: 90 days
  Resolution: 10-minute (full sensor data)
  Size: ~5-13 GB (compressed)

Bucket: "downsampled"
  Retention: 2 years (730 days)
  Resolution: 1-hour (min/max/mean per sensor)
  Size: ~5 GB (compressed)
```

### Downsampling Task (InfluxDB 2.x Flux)

```flux
option task = {name: "downsample_hourly", every: 1h}

from(bucket: "raw")
  |> range(start: -task.every)
  |> filter(fn: (r) => r._measurement == "sensor_data")
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
  |> to(bucket: "downsampled")
```

Run a separate task for min/max if needed for compliance (health departments may want the actual high/low, not just averages).

---

## High Availability (If Needed)

### Do You Need HA?

Probably not initially. Sensors report every 10 minutes — missing a few minutes during a server restart isn't catastrophic. Hetzner Cloud VPS recovery is typically under 5 minutes.

**Sensor-side resilience**: Each EM320-TH stores 3,000 readings locally and retransmits them when connectivity is restored. A 30-minute server outage loses zero data.

### Pragmatic HA Setup (~$70-90/month)

If uptime matters:

1. **Primary server**: Mosquitto + Telegraf + InfluxDB + Grafana
2. **Standby server**: Second Mosquitto instance
3. **Gateway MQTT config**: Two broker endpoints — gateways auto-failover to standby
4. **Telegraf dual-write**: Primary Telegraf writes to both InfluxDB instances
5. **Health check**: Simple script promotes standby if primary is unreachable

Total cost: 2x server = ~$70-90/month. No clustering complexity.

---

## Total Cost of Infrastructure

### At 1,000 Locations

| Component | Monthly Cost |
|-----------|-------------|
| Hetzner server (all backend services) | $35-45 |
| Tailscale Enterprise (estimated) | $500-800 |
| Domain + TLS (Cloudflare) | Free |
| **Total Infrastructure** | **$535-845/month** |

### Revenue vs Cost

| Metric | Value |
|--------|-------|
| Locations | 1,000 |
| Monthly SaaS revenue | $60,000/mo ($60/location) |
| Monthly infrastructure | ~$700/mo |
| **SaaS gross margin** | **~98.8%** |

The infrastructure cost is negligible compared to the recurring revenue. Even adding HA ($70-90/mo) and Tailscale Enterprise doesn't meaningfully impact margins.

### Cost Per Location

| Component | Per Location/Month |
|-----------|-------------------|
| Server infrastructure | $0.04 |
| Tailscale | $0.50-0.80 |
| **Total infrastructure per location** | **~$0.54-0.84** |
| Revenue per location | $60.00 |

---

## WiFi Setup Simplicity

The Tailscale architecture is what makes the customer WiFi setup dead simple:

1. **Gateway ships pre-configured**: Tailscale installed, auth key baked in, MQTT broker address is a Tailscale IP (100.x.y.z)
2. **Customer plugs in gateway** and connects it to WiFi (via app or web UI)
3. **Gateway connects to WiFi → Tailscale auto-connects → MQTT starts flowing**
4. **No port forwarding, no static IPs, no firewall rules** — Tailscale handles NAT traversal automatically
5. **Works behind any restaurant firewall/router** — even restrictive corporate networks

The customer never sees or interacts with Tailscale, MQTT, or any backend infrastructure. They just connect WiFi and place sensors.

---

## Growth Path

| Scale | Sensors | Server | MQTT | InfluxDB | Est. Cost |
|-------|---------|--------|------|----------|-----------|
| **Launch** (10 locations) | 150 | Hetzner CPX21 ($8/mo) | Mosquitto | InfluxDB OSS | ~$50/mo* |
| **Growth** (100 locations) | 1,500 | Hetzner CCX23 ($35/mo) | Mosquitto | InfluxDB OSS | ~$200/mo* |
| **Scale** (1,000 locations) | 15,000 | Hetzner CCX23 ($35/mo) | Mosquitto | InfluxDB OSS | ~$700/mo* |
| **Large** (5,000 locations) | 75,000 | Hetzner AX42 ($45/mo) | Mosquitto or EMQX | InfluxDB OSS | ~$1,200/mo* |
| **Enterprise** (10,000+) | 150,000+ | Multi-server | EMQX cluster | InfluxDB Enterprise | ~$3,000+/mo* |

*Includes estimated Tailscale costs. Tailscale Free (100 devices) covers the launch phase.

At launch with 10 locations (150 sensors), **Tailscale Free tier covers you** (100 device limit, you'd have ~11 devices: 10 gateways + 1 server). You don't need Enterprise pricing until you exceed 100 gateways.
