# UG65 Gateway REST API Reference

The UG65 has an HTTP REST API on port 8080 for programmatic management. This is how the SensorCo backend sends downlink commands to sensors and how the mobile app will configure WiFi.

**Official API Spec PDF**: [resource.milesight.com/.../ug-http-api-documentation-en.pdf](https://resource.milesight.com/milesight/iot/document/ug-http-api-documentation-en.pdf)

**Postman Testing Guide**: [support.milesight-iot.com/...](https://support.milesight-iot.com/support/solutions/articles/73000514150-how-to-test-milesight-gateway-http-api-by-postman-)

**Community Python Client**: [github.com/corgan2222/Milesight-Gateway-API](https://github.com/corgan2222/Milesight-Gateway-API)

**Minimum firmware**: 60.0.0.42+ (UG65/UG67), 56.0.0.3+ (UG56)

---

## Authentication

**Base URL**: `https://{gatewayIP}:8080`

All API calls require a Bearer token obtained via login. Tokens are valid for 24 hours.

### Login

```
POST /api/internal/login
Content-Type: application/json
```

**Request body** (firmware 60.0.0.42-r5+):
```json
{
  "username": "admin",
  "password": "sI/7ewBCeWunDs6JXXtSHg=="
}
```

The password must be **AES-128-CBC encrypted** before sending:
- Mode: CBC
- Key: `1111111111111111`
- IV: `2222222222222222`
- Output: Base64

Example: `"password"` → `"sI/7ewBCeWunDs6JXXtSHg=="`

**Response**: Returns a `jwt` field. All subsequent requests include:
```
Authorization: Bearer {jwt}
```

### API Account Setup

During pre-shipping, configure a dedicated API account in the gateway web UI:
1. **System → HTTP API Management**
2. Select **Independent Account**
3. Set username/password
4. Optionally enable **Advanced Password Encryption**

---

## Device Management Endpoints

These are the endpoints used by the SensorCo API to manage sensors remotely over Tailscale.

### List All Devices

```
GET /api/urdevices?limit=50&offset=0&applicationID={id}
Authorization: Bearer {jwt}
```

Returns all sensors paired to the gateway with their status (Activated/De-Activate), last seen time, DevEUI, and device name.

### Get Device by DevEUI

```
GET /api/urdevices?search={devEUI}
Authorization: Bearer {jwt}
```

### Create Device (Add Sensor)

```
POST /api/urdevices
Authorization: Bearer {jwt}
Content-Type: application/json
```

Used during automated provisioning to add sensors to the gateway programmatically (instead of through the web UI).

### Update Device

```
PUT /api/urdevices/{devEUI}
Authorization: Bearer {jwt}
Content-Type: application/json
```

### Delete Device

```
DELETE /api/urdevices/{devEUI}
Authorization: Bearer {jwt}
```

---

## Downlink Commands (Critical for Remote Config)

This is the most important API for SensorCo. It sends configuration changes to sensors without any physical access.

### Send Downlink to Device

```
POST /api/urdevices/{devEUI}/downlink
Authorization: Bearer {jwt}
Content-Type: application/json
```

**Request body**:
```json
{
  "confirmed": true,
  "data": "/wM8AA==",
  "devEUI": "24E124148B137836",
  "fPort": 85
}
```

| Field | Type | Description |
|-------|------|-------------|
| `confirmed` | boolean | If true, sensor sends ACK after receiving |
| `data` | string | **Base64-encoded** downlink command payload |
| `devEUI` | string | Target sensor DevEUI |
| `fPort` | integer | LoRaWAN port (always `85` for Milesight sensors) |

### Encoding Downlink Commands

The `data` field is the hex downlink command (see [07-em320-th-sensor-reference.md](./07-em320-th-sensor-reference.md)) encoded as Base64.

**Examples**:

| Command | Hex | Base64 (`data` field) |
|---------|-----|----------------------|
| Reboot sensor | `ff10ff` | `/xD/` |
| Set report interval to 5 min (300s) | `ff032c01` | `/wMsAQ==` |
| Set report interval to 10 min (600s) | `ff03e803` | `/wPoAw==` |
| Set report interval to 15 min (900s) | `ff038403` | `/wOEAw==` |
| Set cooler threshold (2-8°C) | `ff06cc14005000 00000000` | `/wbMFABQAAAAAAAB` |
| Disable threshold alarm | `ff06c8000000000000 0000` | `/wbIAAAAAAAAAAA=` |
| Enable data storage | `ff6801` | `/2gB` |
| Disable data storage | `ff6800` | `/2gA` |

**Converting hex to Base64** (in Node.js):
```typescript
const hexToBase64 = (hex: string) => Buffer.from(hex, 'hex').toString('base64');
// hexToBase64('ff10ff') → '/xD/'
```

### Get Queued Downlinks

```
GET /api/urdevices/{devEUI}/downlink
Authorization: Bearer {jwt}
```

Returns downlink commands waiting to be delivered to the sensor.

### Delete Queued Downlink

```
DELETE /api/urdevices/{devEUI}/downlink/{id}
Authorization: Bearer {jwt}
```

### Send Downlink to Multicast Group

```
POST /api/multicast-groups/{groupID}/downlink
Authorization: Bearer {jwt}
Content-Type: application/json
```

Useful for bulk updates — e.g., change the reporting interval for all sensors at a location simultaneously.

---

## Application Management

### List Applications

```
GET /api/urapplications?organizationID=0&offset=0&limit=10
Authorization: Bearer {jwt}
```

### Get Application

```
GET /api/urapplications/{appID}
Authorization: Bearer {jwt}
```

### Create Application

```
POST /api/urapplications
Authorization: Bearer {jwt}
Content-Type: application/json
```

### Get Integration Config (HTTP/MQTT)

```
GET /api/urapplications/{appID}/integrations/{type}
Authorization: Bearer {jwt}
```

Where `{type}` is `http` or `mqtt`.

---

## Profile Management

### List Profiles

```
GET /api/urprofiles?organizationID={id}&applicationID={id}&offset=0&limit=10
Authorization: Bearer {jwt}
```

### Create Profile

```
POST /api/urprofiles
Authorization: Bearer {jwt}
Content-Type: application/json
```

---

## Payload Codec

### List Codecs

```
GET /api/payloadcodecs?type=default&offset=0&limit=10
Authorization: Bearer {jwt}
```

### Get Codec for Specific Device

```
GET /api/payloadcodecs/{deviceEUI}/device
Authorization: Bearer {jwt}
```

---

## WiFi Configuration API

### The Problem

The official REST API (port 8080) does **not** include WiFi configuration endpoints. The documented API covers only LoRaWAN operations (devices, applications, downlinks, codecs).

WiFi configuration is only accessible through:
1. The web UI (JavaScript SPA at `https://192.168.1.1`)
2. SSH / CLI (`uci` commands on the underlying OpenWrt system)

### Approach: Reverse-Engineer the Web UI's Internal API

The web UI is a JavaScript SPA that calls internal HTTP endpoints for WiFi configuration. These endpoints are undocumented but stable (they're the same endpoints the web UI depends on).

**To discover them**:
1. Connect to the gateway's AP
2. Open the web UI at `https://192.168.1.1` in Chrome
3. Open DevTools → Network tab
4. Navigate to Network → Interface → WLAN
5. Click "Scan" for available networks
6. Record the HTTP requests made (URLs, methods, request/response bodies)
7. Select a network, enter password, click Save & Apply
8. Record those HTTP requests too

**Expected endpoints** (to be confirmed by inspection):

| Action | Likely Endpoint | Method |
|--------|----------------|--------|
| Get current WLAN config | `/api/internal/wlan` or `/cgi-bin/luci/...` | GET |
| Scan for WiFi networks | `/api/internal/wlan/scan` or similar | GET/POST |
| Set WiFi client mode | `/api/internal/wlan` | PUT/POST |
| Apply network changes | `/api/internal/apply` or similar | POST |

The gateway runs OpenWrt with a LuCI-based web interface. LuCI typically exposes JSON-RPC or REST-like endpoints under `/cgi-bin/luci/` or similar paths. The Milesight web UI may use custom endpoints.

### Alternative: SSH + UCI Commands

If the internal WiFi API proves unreliable or changes between firmware versions, the mobile app can achieve the same result via SSH:

**From the SensorCo API or a pre-installed script on the gateway**:

```bash
# Scan for available networks
iwinfo wlan0 scan

# Switch to client mode and connect
uci set wireless.sta.ssid="RestaurantWiFi"
uci set wireless.sta.key="password123"
uci set wireless.sta.encryption="psk2"
uci set wireless.sta.mode="sta"
uci commit wireless
wifi
```

**For the mobile app setup flow** (when the phone is connected to the gateway's AP):

The app could:
1. Connect to the gateway AP (`Gateway_XXXXXX`)
2. Make an HTTP call to a lightweight API endpoint that we pre-install on the gateway (a simple shell script exposed via uhttpd or Node-RED)
3. That endpoint wraps the `iwinfo scan` and `uci set` commands
4. App displays results in native UI

### Pre-Installed Setup Script (Recommended)

During pre-shipping, install a simple WiFi setup helper script on the gateway:

```bash
#!/bin/sh
# /usr/local/bin/wifi-setup-api.sh
# Called by the SensorCo mobile app (or partner app) during customer setup

case "$1" in
  scan)
    # Return available WiFi networks as JSON
    iwinfo wlan0 scan | awk '... parse to JSON ...'
    ;;
  connect)
    # $2 = SSID, $3 = password
    uci set wireless.sta.ssid="$2"
    uci set wireless.sta.key="$3"
    uci set wireless.sta.encryption="psk2"
    uci commit wireless
    wifi
    echo '{"status": "connecting"}'
    ;;
  status)
    # Check if connected
    iwinfo wlan0 info | grep -q "ESSID" && echo '{"connected": true}' || echo '{"connected": false}'
    ;;
esac
```

This script would be exposed via the gateway's built-in Node-RED (which has HTTP input nodes) or a simple uhttpd CGI handler, accessible at `http://192.168.1.1:1880/wifi/scan` etc.

### Mobile App WiFi Setup Flow (Technical)

```
1. App detects Gateway_XXXXXX SSID
   └─ react-native-wifi-reborn: WifiManager.connectToProtectedSSID("Gateway_XXXXXX", "{pre-set-password}", false)

2. App calls gateway WiFi scan endpoint
   └─ fetch("http://192.168.1.1:1880/wifi/scan") → [{ssid: "CFA-Guest", signal: -45}, ...]

3. App displays networks in native picker UI
   └─ User selects "CFA-Guest" and enters password

4. App sends WiFi config to gateway
   └─ fetch("http://192.168.1.1:1880/wifi/connect", {method: "POST", body: {ssid: "CFA-Guest", key: "..."}})

5. Gateway connects to restaurant WiFi
   └─ AP mode turns off, gateway joins CFA-Guest network
   └─ HTTP POST to SensorCo API starts flowing
   └─ Tailscale auto-connects

6. App confirms setup complete
   └─ App reconnects phone to regular WiFi
   └─ App polls SensorCo API for first sensor readings
   └─ Shows "Your sensors are online!" when data arrives
```

---

## SensorCo API → Gateway Communication

### How the SensorCo Backend Reaches Gateways

The SensorCo API server (Vercel) sends commands to gateways through Tailscale. Since Vercel is serverless and can't run Tailscale directly, you need a small relay:

**Option A — Tailscale Funnel/Proxy**:
Run a lightweight proxy on Fly.io with Tailscale installed. The API route calls the proxy, which forwards to the gateway over Tailscale.

**Option B — Tailscale API**:
Use Tailscale's SSH API or machine-to-machine API to execute commands on gateways without a persistent connection.

**Option C — Gateway polls SensorCo**:
Instead of push, the gateway periodically checks a SensorCo API endpoint for pending commands. Simpler but adds latency (commands not instant).

This is an implementation detail to resolve during the build phase.

---

## API Endpoints Summary

| Category | Endpoint Pattern | SensorCo Use Case |
|----------|-----------------|-------------------|
| **Auth** | `POST /api/internal/login` | Authenticate before any API call |
| **Devices** | `GET/POST/PUT/DELETE /api/urdevices` | List sensors, add/remove sensors |
| **Downlinks** | `POST /api/urdevices/{devEUI}/downlink` | Change thresholds, intervals, reboot sensors |
| **Applications** | `GET/POST /api/urapplications` | Manage LoRaWAN application config |
| **Integrations** | `GET /api/urapplications/{id}/integrations/{type}` | Check HTTP POST config |
| **Codecs** | `GET /api/payloadcodecs` | Verify payload decoding |
| **WiFi** (undocumented) | TBD — reverse-engineer or use SSH/script | Mobile app WiFi setup flow |
