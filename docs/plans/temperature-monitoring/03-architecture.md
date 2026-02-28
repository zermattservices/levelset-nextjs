# Architecture — Full Technical Stack

## End-to-End Data Flow

```
EM320-TH Sensors ──(LoRaWAN 915MHz radio)──> UG65 Gateway
                                                  │
                                          ┌───────┴────────┐
                                          │ Built-in        │
                                          │ Network Server  │
                                          │ (decode payload)│
                                          └───────┬────────┘
                                                  │
                                          ┌───────┴────────┐
                                          │ MQTT Publisher   │
                                          │ (on gateway)     │
                                          └───────┬────────┘
                                                  │
                                      ╔═══════════╧═══════════╗
                                      ║   Tailscale Tunnel     ║
                                      ║   (WireGuard mesh)     ║
                                      ╚═══════════╤═══════════╝
                                                  │
                                          ┌───────┴────────┐
                                          │ Mosquitto MQTT  │
                                          │ Broker          │
                                          │ (central server)│
                                          └───────┬────────┘
                                                  │
                                          ┌───────┴────────┐
                                          │ Telegraf         │
                                          │ (MQTT consumer)  │
                                          └───────┬────────┘
                                                  │
                                          ┌───────┴────────┐
                                          │ InfluxDB         │
                                          │ (time-series DB) │
                                          └───────┬────────┘
                                                  │
                                    ┌─────────────┼─────────────┐
                                    │             │             │
                              ┌─────┴─────┐ ┌────┴────┐ ┌─────┴─────┐
                              │ Dashboard  │ │ Alerts  │ │ Grafana   │
                              │ (Levelset  │ │ Engine  │ │ (internal │
                              │  or custom)│ │         │ │  only)    │
                              └───────────┘ └─────────┘ └───────────┘
```

## Layer-by-Layer Breakdown

### Layer 1: Sensors → Gateway (LoRaWAN)

**Protocol**: LoRaWAN over 915 MHz radio (US915 band)

The EM320-TH sensors transmit temperature and humidity readings at a configurable interval (default: 10 minutes). Each transmission includes battery level. The sensors use **Class A** operation: they send data, then open two short receive windows for any pending downlink commands from the gateway.

**Join process (OTAA)**:
1. Sensor transmits Join Request with its DevEUI and AppEUI
2. Gateway/network server validates the AppKey
3. Session keys generated (NwkSKey, AppSKey)
4. Dynamic Device Address assigned
5. Sensor begins periodic data transmission

**Resilience**: If the sensor temporarily loses gateway connectivity, it stores up to 3,000 readings with timestamps and retransmits them when reconnected.

**US915 channel config**: Channel index must be set to 8-15 when using the Milesight gateway's default settings.

### Layer 2: Gateway Network Server (Decode)

The UG65 has a **built-in LoRaWAN network server** — no external ChirpStack or TTN required. This simplifies the architecture significantly.

**On the gateway**:
1. **Packet Forwarder** receives raw LoRa packets
2. **Network Server** handles device authentication and session management
3. **Payload Codec** decodes binary payloads to JSON using Milesight's decoder scripts

The gateway transforms raw binary like `01 75 5C 03 67 34 01 04 68 65` into:
```json
{
  "battery": 92,
  "temperature": 30.8,
  "humidity": 50.5
}
```

### Layer 3: Gateway → MQTT (Data Forwarding)

The gateway publishes decoded JSON to an MQTT broker. This can be configured in the gateway web GUI under Network Server > Applications > Data Transmission.

**MQTT message format** (published by gateway):
```json
{
  "applicationID": 1,
  "applicationName": "restaurant_sensors",
  "deviceName": "walk-in-cooler-1",
  "devEUI": "24e124126a148401",
  "fPort": 85,
  "data": "base64_encoded_raw",
  "object": {
    "battery": 92,
    "temperature": 30.8,
    "humidity": 50.5
  },
  "rxInfo": {
    "rssi": -45,
    "loRaSNR": 8.5,
    "time": "2026-02-27T12:00:00Z"
  }
}
```

**Topic structure**: `/milesight/uplink/{devEUI}` or `application/{app_id}/device/{dev_eui}/event/up`

**Downlink** (commands back to sensors): `/milesight/downlink/{devEUI}`

### Layer 4: Tailscale (Secure Networking)

Tailscale provides the secure overlay network connecting each restaurant's gateway to the central server. It uses WireGuard tunnels under the hood.

**Why Tailscale (not VPN/port forwarding)**:
- Zero configuration for the customer — gateway auto-connects on power-up
- NAT traversal works automatically, even behind restaurant firewalls
- No static IPs or port forwarding needed
- Each gateway gets a stable 100.x.y.z address on the tailnet
- Pre-authenticated before shipping (auth keys)
- Can SSH into any gateway remotely for troubleshooting

See [04-provisioning-and-setup.md](./04-provisioning-and-setup.md) for Tailscale installation details.

### Layer 5: MQTT Broker (Central Server)

**Mosquitto** MQTT broker on the central server receives messages from all restaurant gateways.

```conf
# /etc/mosquitto/mosquitto.conf
listener 1883
protocol mqtt
allow_anonymous false
password_file /mosquitto/config/password_file
persistence true
persistence_location /mosquitto/data/
autosave_interval 300
log_dest file /mosquitto/log/mosquitto.log
```

**User setup**:
```bash
# Create users for gateway and Telegraf
mosquitto_passwd -c /mosquitto/config/password_file gateway_user
mosquitto_passwd /mosquitto/config/password_file telegraf_user
```

**MQTT bridge option**: Instead of the gateway publishing directly to the central Mosquitto, you can run Mosquitto locally on the gateway and use an MQTT bridge to forward messages to the central server. This adds resilience — if the internet drops, messages queue locally.

```conf
# Gateway mosquitto.conf bridge
connection central-bridge
address 100.x.y.z:1883  # Tailscale IP of central server
topic application/# out 1
remote_username bridge_user
remote_password bridge_password
```

### Layer 6: Telegraf (Data Pipeline)

**Telegraf** subscribes to the MQTT broker and writes data to InfluxDB. It handles JSON parsing, field extraction, and tagging.

```toml
# /etc/telegraf/telegraf.conf

[[inputs.mqtt_consumer]]
  servers = ["tcp://localhost:1883"]
  topics = ["application/+/device/+/event/up"]
  username = "telegraf_user"
  password = "telegraf_password"
  data_format = "json"

  [[inputs.mqtt_consumer.topic_parsing]]
    topic = "application/+/device/+/event/+"
    measurement = "measurement/_/_/_/_"
    tags = "_/app_id/_/dev_eui/_/event"

[[outputs.influxdb_v2]]
  urls = ["http://localhost:8181"]
  token = "your-influxdb-token"
  organization = ""
  bucket = "sensor_data"
```

### Layer 7: InfluxDB (Time-Series Storage)

**InfluxDB** stores all sensor readings as time-series data. Natural fit for temperature monitoring — optimized for timestamped measurements with efficient compression and fast range queries.

**Data model**:
- **Measurement**: `sensor_data`
- **Tags** (indexed): `dev_eui`, `location_id`, `sensor_name`, `org_id`
- **Fields** (values): `temperature`, `humidity`, `battery`, `rssi`
- **Timestamp**: Automatically captured from MQTT message

**Retention**: Raw data for 90 days (configurable), downsampled 15-min averages for 2+ years (for compliance audits).

```bash
# Create database
influxdb3 create database sensor_data

# Query example
influxdb3 query --database sensor_data \
  "SELECT time, temperature, humidity FROM sensor_data WHERE dev_eui = '24e124126a148401' AND time > now() - 24h"
```

### Layer 8: Alerting

Three approaches, not mutually exclusive:

**Option A — InfluxDB 3 native alerts (Python plugins)**:
```bash
influxdb3 create trigger \
  --database sensor_data \
  --plugin-filename alert.py \
  --trigger-spec "table:sensor_data" \
  --trigger-arguments "name=temp_high,threshold=40,field_name=temperature,endpoint_type=slack" \
  temp_high_alert
```

**Option B — Grafana alert rules**:
- Create dashboard panel querying InfluxDB
- Define alert condition: `WHEN avg(temperature) IS ABOVE 40 FOR 5m`
- Send to Slack, email, PagerDuty, SMS, webhook

**Option C — Custom alerting in Levelset backend**:
- Telegraf writes to both InfluxDB and a webhook/Supabase
- Levelset API route checks thresholds and sends push notifications via the mobile app
- Most tightly integrated option, but requires more custom development

### Layer 9: Dashboard / Visualization

**Grafana** (for internal use / rapid prototyping):
- Connects directly to InfluxDB
- Pre-built dashboard templates for sensor data
- Good for initial testing and Mac's existing infrastructure

**Levelset Dashboard** (for customer-facing product):
- Build temperature monitoring as a new module in the Next.js dashboard
- Or build a standalone frontend that queries InfluxDB/Supabase
- See [05-integration-options.md](./05-integration-options.md) for detailed options

---

## Central Server Requirements

The MQTT broker, Telegraf, InfluxDB, and Grafana all run on a single central server.

**Minimum specs** (for up to ~50 restaurant locations):
- 2 vCPUs
- 4 GB RAM
- 50 GB SSD
- Linux (Ubuntu 22.04+ recommended)

**Hosting options**:
- Fly.io (consistent with Levelset agent deployment)
- Hetzner/DigitalOcean (cost-effective)
- AWS/GCP (enterprise, if needed)

**Tailscale** must also be installed on the central server so it's part of the same tailnet as all gateways.

---

## Key External Resources

| Resource | URL |
|----------|-----|
| Milesight SensorDecoders | [github.com/Milesight-IoT/SensorDecoders](https://github.com/Milesight-IoT/SensorDecoders) |
| EM320-TH User Guide | [resource.milesight.com/.../em320-th-user-guide-en.pdf](https://resource.milesight.com/milesight/iot/document/em320-th-user-guide-en.pdf) |
| UG65 User Guide | [resource.milesight.com/.../ug65-user-guide-en.pdf](https://resource.milesight.com/milesight/iot/document/ug65-user-guide-en.pdf) |
| Milesight MQTT Integration Guide | [support.milesight-iot.com/.../mqtt-broker](https://support.milesight-iot.com/support/solutions/articles/73000514193) |
| Milesight Gateway MQTT API | [support.milesight-iot.com/.../mqtt-api](https://support.milesight-iot.com/support/solutions/articles/73000617705) |
| Telegraf MQTT Consumer Plugin | [docs.influxdata.com/.../mqtt_consumer](https://docs.influxdata.com/telegraf/v1/input-plugins/mqtt_consumer/) |
| InfluxDB 3 Alerting | [influxdata.com/blog/core-enterprise-alerting-influxdb3](https://www.influxdata.com/blog/core-enterprise-alerting-influxdb3/) |
| Tailscale Auth Keys | [tailscale.com/kb/1085/auth-keys](https://tailscale.com/kb/1085/auth-keys) |
