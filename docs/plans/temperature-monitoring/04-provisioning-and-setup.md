# Provisioning & Setup

Two phases:
1. **Pre-shipping** — what we do before the hardware leaves our hands
2. **Customer setup** — the 5-minute process the customer does on-site (no technical skill required)

---

## Phase 1: Pre-Shipping (Our Side)

### Goal

Ship a fully pre-configured kit. Sensors paired to gateway, Tailscale installed, HTTP POST endpoint configured. The customer's only job is plug in the gateway, open the Levelset app, connect WiFi, and place sensors.

### Step 1: Receive and Label Hardware

1. Receive sensors and gateway from Milesight
2. **Engrave or label each sensor** with the customer's chosen names (e.g., "Walk-In Cooler", "Freezer #1", "Prep Line Reach-In")
   - Customer provides sensor names during ordering (in the Levelset app or order form)
   - Use a label maker or engraving service for durability
3. Record each sensor's **DevEUI** (printed on the sensor label/box) and map it to the customer's name
4. Store this mapping in Supabase: `sensor_devices` table with `{ dev_eui, name, org_id, location_id }`

### Step 2: Configure Sensors via ToolBox App (~8 min for 15 sensors)

For the first sensor:

1. Open Milesight ToolBox app on NFC-enabled Android phone
2. Hold phone to sensor, tap **Read**
3. Configure:
   - **Join mode**: OTAA
   - **Frequency band**: US915
   - **Channel index**: 8-15
   - **Reporting interval**: 10 minutes (default)
   - **Data Storage**: Enabled (default)
   - **Data Retransmission**: Enabled (default)
   - **Password**: Change from default `123456` to a secure password
4. Tap **Write** to save
5. Tap **Set Template** → name it (e.g., "Levelset Standard")

For all remaining sensors:
1. Go to **Device → Template** in ToolBox
2. Select "Levelset Standard" template
3. Hold phone to sensor → tap **Write**
4. ~10 seconds per sensor

**This is the only time NFC/physical access is ever needed.** After shipping, all config changes happen remotely via downlink commands through the Levelset dashboard.

### Step 3: Configure Gateway

#### 3a. Initial Access

1. Power on the UG65 via USB-C or DC adapter
2. Connect laptop to the gateway's WiFi AP: `Gateway_XXXXXX` (password: `iotpassword`)
3. Open browser to `https://192.168.1.1`
4. Login with `admin` / `password`
5. Change password on first login (required)

#### 3b. Enable Built-in Network Server

1. **Packet Forwarder → General**: Enable localhost server, Save & Apply
2. **Network Server → General**: Enable, Save & Apply
3. **Network Server → Applications**: Create application "Levelset Sensors"
4. **Network Server → Profiles**: Create device profile — OTAA, Class A

#### 3c. Add All Sensors to the Gateway

For each sensor:

1. **Network Server → Devices**: Add device
2. Enter **Device EUI** (from sensor label)
3. Enter **AppKey**: `{DevEUI}{DevEUI}` for Q4 2025+ sensors (e.g., `24e124710b002a3f24e124710b002a3f`)
4. Select the device profile and application
5. Set a **device name** matching the customer's label (e.g., "walk-in-cooler-1")

#### 3d. Configure HTTP POST to Levelset API

1. In the application settings, add a **Data Transmission** integration:
   - **Type**: HTTP
   - **URL**: `https://app.levelset.io/api/sensors/ingest`
   - **Auth**: API key header (pre-generated for this location)
   - **Payload Codec**: Enabled (decoded JSON output)
2. Save and Apply

#### 3e. Enable Gateway REST API

1. **System → HTTP API Management**
2. Set **Independent Account** with dedicated API credentials
3. Record the API username/password — needed for remote downlink commands

#### 3f. Verify All Sensors Join

1. Power on all sensors near the gateway
2. Wait ~2-5 minutes for each to send a Join Request
3. Check **Network Server → Devices** — all sensors should show "Activated"
4. Check **Network Server → Packets** to verify uplink data arriving
5. Check the Levelset dashboard — sensor readings should appear within 10 minutes

### Step 4: Install Tailscale on Gateway

Reference: Mac's `tailscale-gw` script — [gist.github.com/mjshiggins/0a62198aa73647c7764267956b388b4c](https://gist.github.com/mjshiggins/0a62198aa73647c7764267956b388b4c)

#### 4a. Enable SSH on Gateway

1. In gateway web GUI: **System → General Settings → Access Service**
2. Enable SSH

#### 4b. SSH into Gateway

```bash
ssh root@192.168.1.1
```

#### 4c. Install Tailscale

```bash
curl -o /usr/local/sbin/tailscale-gw https://gist.githubusercontent.com/mjshiggins/0a62198aa73647c7764267956b388b4c/raw/tailscale-gw
chmod +x /usr/local/sbin/tailscale-gw
/usr/local/sbin/tailscale-gw install
```

**What the script does**:
- Downloads Tailscale ARM64 static binaries
- Verifies SHA256 checksums
- Installs `tailscale` and `tailscaled` to `/usr/local/bin`
- Creates persistent state at `/overlay/tailscale` (critical — `/var` is volatile)
- Adds auto-start to `/etc/rc.local`
- Uses `--tun=userspace-networking` (embedded kernel limitation)

#### 4d. Authenticate with Pre-Generated Auth Key

Generate auth key in Tailscale admin console:
- **Reusable**: Yes (for batch provisioning)
- **Pre-approved**: Yes
- **Tags**: `tag:sensor-gateway`
- **Expiration**: 90 days

Then on the gateway:

```bash
/usr/local/bin/tailscale --socket=/var/run/tailscale/tailscaled.sock up \
  --auth-key=tskey-auth-XXXXX \
  --tun=userspace-networking \
  --hostname=gw-{locationId}
```

#### 4e. Record Tailscale IP

The gateway now has a stable Tailscale IP (100.x.y.z). Record this in Supabase `sensor_gateways` table. This IP is used by the Levelset API to SSH into the gateway for remote management.

### Step 5: Final Verification

Before shipping, confirm:

1. All sensors show "Activated" in the gateway network server
2. Gateway is HTTP POSTing data to the Levelset API (check dashboard for readings)
3. Tailscale shows the gateway online (`/usr/local/sbin/tailscale-gw status`)
4. You can SSH into the gateway over Tailscale from your laptop
5. Gateway REST API responds at `http://100.x.y.z:8080` over Tailscale

### Step 6: Package and Ship

- Place all sensors in individual bags, labeled with their names
- Include the gateway with power adapter
- Include a **setup card** (laminated, one page) with:
  - QR code linking to the Levelset app setup wizard
  - Simple instruction: "Plug in gateway → Open Levelset app → Tap Setup Sensors → Connect WiFi"
  - Support phone number

---

## Phase 2: Customer Setup (5 Minutes, Zero Technical Skill)

### What the Customer Receives

- 1x labeled gateway (UG65) with power adapter
- 15x labeled temperature sensors (already paired to gateway)
- 1x laminated quick-start card

### Step 1: Plug In the Gateway (30 seconds)

Place the gateway in a central location (near the kitchen, within range of all sensors). Plug in the power adapter. Status LED turns on. The gateway broadcasts a WiFi hotspot (`Gateway_XXXXXX`).

### Step 2: Connect Gateway to WiFi via Levelset App (3 minutes)

This is the critical UX flow built into the Levelset mobile app:

1. Open the Levelset app → navigate to **Temperature Monitoring → Setup Sensors**
2. App detects the `Gateway_XXXXXX` WiFi network and prompts user to connect
3. User taps to connect (app uses `react-native-wifi-reborn` or similar to auto-join with the pre-set password)
4. App calls the gateway's internal WiFi API at `192.168.1.1` to scan for available networks
5. App displays available WiFi networks in a native list UI
6. User selects their restaurant WiFi and enters the password
7. App sends the WiFi config to the gateway
8. Gateway switches from AP mode to Client mode — connects to restaurant WiFi
9. App shows "Connected!" confirmation

**After this point, the gateway AP hotspot disappears** — the gateway is now a regular device on the restaurant's WiFi. HTTP POST data starts flowing to Levelset, and Tailscale auto-connects for remote management.

See [11-gateway-api-reference.md](./11-gateway-api-reference.md) for the technical details on the WiFi configuration API.

### Step 3: Place the Sensors (1 minute)

Place each labeled sensor in its designated spot. Magnetic versions stick directly to fridge/freezer surfaces. Standard versions can be wall-mounted with included screws.

**The sensors are already paired to the gateway — no additional setup needed.** They start reporting temperatures within 10 minutes of the gateway coming online.

### Post-Setup Verification

Within 15-20 minutes:
- The Levelset dashboard shows all sensors online with current readings
- Push notification confirms "Your sensors are online"
- If a sensor isn't reporting, it may be out of range — move closer to the gateway

---

## Remote Sensor Configuration (Post-Setup)

After deployment, all sensor configuration changes happen through the Levelset dashboard. **No one at the restaurant needs to do anything.**

### How It Works

1. Manager opens Levelset dashboard → Temperature Monitoring → Sensor Settings
2. Changes a threshold (e.g., Walk-In Cooler max temp from 8°C to 6°C)
3. Levelset API sends the downlink command to the gateway over Tailscale:
   - SSH into gateway at `100.x.y.z`, OR
   - HTTP POST to gateway REST API at `http://100.x.y.z:8080/api/urdevices/{devEUI}/downlink`
4. Gateway queues the downlink command
5. Sensor receives the command on its next uplink (within 10 minutes)
6. Sensor applies the new threshold and confirms

### What Can Be Changed Remotely

| Setting | Downlink Hex | Via Dashboard |
|---------|-------------|---------------|
| Temperature alert thresholds | `ff06cc {min} {max} 00000000` | Threshold slider |
| Reporting interval | `ff03{seconds_LE}` | Dropdown (5/10/15/30 min) |
| Enable/disable alerts | `ff06c8...` / `ff06cc...` | Toggle switch |
| Reboot sensor | `ff10ff` | "Reboot" button |
| Query historical data | `fd6c {start} {end}` | "Recover data" button |
| Enable/disable data storage | `ff6801` / `ff6800` | Toggle switch |

### What Cannot Be Changed Remotely

| Setting | Why | When It's Set |
|---------|-----|---------------|
| LoRaWAN join parameters (OTAA, channels) | NFC only via ToolBox | Pre-shipping (Step 2) |
| Sensor password | NFC only via ToolBox | Pre-shipping (Step 2) |
| Calibration offset | NFC only via ToolBox | Pre-shipping (if needed) |

These are set once during pre-shipping and never need to change in the field.

---

## Remote Troubleshooting

### Diagnostic Capabilities (No Customer Involvement)

| What | How |
|------|-----|
| Check if sensor is reporting | Query `sensor_readings` in Supabase — last timestamp per DevEUI |
| Check battery level | Battery % included in every uplink reading |
| Check signal strength | RSSI/SNR included in every uplink reading |
| Check gateway status | SSH into gateway over Tailscale, or check Tailscale admin panel |
| View gateway device list | Gateway REST API: `GET /api/urdevices` |
| View recent packets | Gateway REST API or SSH into web UI |
| Reboot a sensor | Send downlink `ff10ff` via gateway API |
| Recover missed data | Send historical query downlink `fd6c {start} {end}` |
| Check gateway internet | SSH → `ping google.com` |
| Check gateway WiFi | SSH → check WLAN status |

### Common Issues

| Problem | Symptom | Remote Fix |
|---------|---------|------------|
| Sensor stopped reporting | No readings in dashboard for 30+ min | Check gateway device list — if "Activated", gateway lost internet. If "De-Activate", sensor out of range → call customer to reposition |
| Battery dying | Battery % dropping below 20% | Alert customer to replace batteries (ER14505 Li-SOCl2, ~$3 each, 2 per sensor) |
| Temperature spike | Alert fires in dashboard | Query historical data to determine if brief spike or sustained issue |
| All sensors at one location offline | No data from any sensor | Gateway likely lost internet — SSH in to check WiFi status. May need customer to restart router |
| Sensor reading inaccurate | Temperature doesn't match expectations | Apply software-side calibration offset in Levelset (preferred over NFC recalibration) |
| Gateway unreachable via Tailscale | Can't SSH in | Gateway lost internet or Tailscale crashed. Customer needs to check gateway power/internet. Last resort: factory reset and re-provision |

### What Requires Customer Action

Only two scenarios require someone at the restaurant to physically do something:

1. **Battery replacement** (~every 5-10 years) — swap two ER14505 batteries
2. **Gateway WiFi password changed** — reconnect gateway to new WiFi (open Levelset app → Setup Sensors flow again)

Everything else is handled remotely through the Levelset dashboard and Tailscale.

---

## Tailscale Key Management

### ACL Configuration

Gateways can only reach the Levelset server, not each other:

```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["tag:sensor-gateway"],
      "dst": ["tag:sensor-server:8080,22,443"]
    },
    {
      "action": "accept",
      "src": ["tag:sensor-admin"],
      "dst": ["tag:sensor-gateway:22,8080"]
    }
  ],
  "tagOwners": {
    "tag:sensor-gateway": ["autogroup:admin"],
    "tag:sensor-server": ["autogroup:admin"],
    "tag:sensor-admin": ["autogroup:admin"]
  }
}
```

### Auth Key Lifecycle

| Stage | Action |
|-------|--------|
| **Provisioning batch** | Generate a reusable, pre-approved auth key in Tailscale console |
| **Per gateway** | Use the key during `tailscale up` |
| **Post-provisioning** | Auth key can expire — already-connected gateways stay connected |
| **Node key renewal** | Node keys auto-renew while device is online (180-day default) |
| **Decommissioning** | Remove device from Tailscale admin console |

### Tailscale Cost

| Location Count | Plan | Monthly Cost |
|---------------|------|-------------|
| 1-99 | Free (100 devices) | $0 |
| 100-1,000 | Starter ($6/user, 10 devices/user) | $60-600 |
| 1,000+ | Enterprise (custom IoT pricing) | ~$500-800 est. |

---

## Future Automation

### Provisioning Script

Automate pre-shipping with a script that:
1. Reads a CSV of `{ devEUI, sensorName, orgId, locationId }`
2. Inserts device records into Supabase
3. Generates a Tailscale auth key via API
4. SSHs into the gateway to install Tailscale and configure
5. Adds all sensors to the gateway network server via REST API
6. Sets the HTTP POST endpoint via REST API
7. Verifies all sensors join and data flows

### Mobile App WiFi Setup

Build native WiFi setup in the Expo app:
1. Detect `Gateway_*` SSIDs using WiFi scanning libraries
2. Auto-connect using the pre-set AP password
3. Call the gateway's internal WiFi API to scan and configure
4. Present a native UI for network selection and password entry
5. Show real-time sensor status as they come online

See [11-gateway-api-reference.md](./11-gateway-api-reference.md) for the API details needed to build this.
