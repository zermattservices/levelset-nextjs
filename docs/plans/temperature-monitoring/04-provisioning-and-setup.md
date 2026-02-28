# Provisioning & Setup

This document covers two phases:
1. **Pre-shipping** — what we do before the hardware leaves our hands
2. **Customer setup** — the 5-minute process the customer does on-site

---

## Phase 1: Pre-Shipping (Our Side)

### Goal

Ship a fully pre-configured kit: labeled sensors, gateway with Tailscale, all sensors already paired. The customer's only job is to plug in the gateway, connect it to WiFi, and place the sensors.

### Step 1: Receive and Label Hardware

1. Receive sensors and gateway from Milesight
2. **Engrave or label each sensor** with the customer's chosen names (e.g., "Walk-In Cooler", "Freezer #1", "Prep Line Reach-In")
   - Customer provides sensor names during ordering (in the Levelset app or order form)
   - Use a label maker or engraving service for durability
3. Record each sensor's **DevEUI** (printed on the sensor label/box) and map it to the customer's name
4. Store this mapping in the Levelset database: `{ devEUI, sensorName, orgId, locationId }`

### Step 2: Configure Sensors via ToolBox App

For each sensor:

1. Open Milesight ToolBox app on NFC-enabled phone
2. Hold phone to sensor, tap "Read"
3. Set the following:
   - **Join mode**: OTAA
   - **Frequency band**: US915
   - **Channel index**: 8-15
   - **Reporting interval**: 10 minutes (adjustable per customer need)
   - **Password**: Change from default `123456` to a secure password
4. Tap "Write" to save config
5. Re-read to verify

**Batch process**: With NFC, each sensor takes about 30 seconds to configure. 15 sensors ≈ 8 minutes.

### Step 3: Configure Gateway

#### 3a. Initial Access

1. Power on the UG65 via USB-C or DC adapter
2. Connect laptop to the gateway's WiFi AP (SSID: `Gateway_XXXXXX`)
3. Open browser to `http://192.168.1.1`
4. Login (default credentials in the UG65 quick start guide)

#### 3b. Enable Built-in Network Server

1. **Packet Forwarder** > General: Enable localhost server, Save & Apply
2. **Network Server** > General: Enable, Save & Apply
3. **Network Server** > Applications: Create new application (e.g., "Levelset Sensors")
4. **Network Server** > Profiles: Create device profile — OTAA, Class A

#### 3c. Add All Sensors to the Gateway

For each sensor:

1. **Network Server** > Device: Add device
2. Enter **Device EUI** (from sensor label)
3. Enter **AppKey**: `5572404C696E6B4C6F52613230313823` (default, or custom if changed)
4. Select the device profile and application
5. Set a **device name** matching the customer's label (e.g., "walk-in-cooler-1")

#### 3d. Configure MQTT Forwarding

1. In the application settings, add a **Data Transmission** integration:
   - **Protocol**: MQTT
   - **Broker address**: Tailscale IP of central server (100.x.y.z) or `mqtt.levelset.internal`
   - **Broker port**: 1883
   - **Client ID**: `gateway-{locationId}`
   - **Username/Password**: Pre-created credentials for this location
   - **Uplink topic**: `/levelset/{orgId}/{locationId}/uplink/$deveui`
   - **Downlink topic**: `/levelset/{orgId}/{locationId}/downlink/$deveui`
2. Enable **Payload Codec** so messages contain decoded JSON

#### 3e. Verify All Sensors Join

Power on all sensors near the gateway. Wait ~2-5 minutes for each to send a Join Request.

Check **Network Server** > Device list — all sensors should show "Activated" status.

Check **Network Server** > Packets to see uplink data arriving.

### Step 4: Install Tailscale on Gateway

Reference: Mac's `tailscale-gw` script — [gist.github.com/mjshiggins/0a62198aa73647c7764267956b388b4c](https://gist.github.com/mjshiggins/0a62198aa73647c7764267956b388b4c)

#### 4a. Enable SSH on Gateway

1. In gateway web GUI: **System** > **General Settings** > **Access Service**
2. Enable SSH
3. Note the gateway's current IP (from WiFi AP mode: `192.168.1.1`)

#### 4b. SSH into Gateway

```bash
ssh root@192.168.1.1
```

#### 4c. Install tailscale-gw Script

Download and install the script from Mac's gist:

```bash
# Download the script
curl -o /usr/local/sbin/tailscale-gw https://gist.githubusercontent.com/mjshiggins/0a62198aa73647c7764267956b388b4c/raw/tailscale-gw
chmod +x /usr/local/sbin/tailscale-gw

# Install Tailscale binaries
/usr/local/sbin/tailscale-gw install
```

**What the script does**:
- Downloads Tailscale ARM64 static binaries
- Verifies SHA256 checksums
- Installs `tailscale` and `tailscaled` to `/usr/local/bin`
- Creates persistent state at `/overlay/tailscale` (critical — `/var` is volatile on these devices)
- Adds auto-start block to `/etc/rc.local`
- Uses `--tun=userspace-networking` (embedded kernel may lack full TUN support)
- Never calls `tailscale down` to preserve auth state across restarts

#### 4d. Authenticate with Pre-Generated Auth Key

Before provisioning, generate an auth key in the Tailscale admin console:

1. Go to **Settings** > **Keys** > **Generate auth key**
2. Configure:
   - **Reusable**: Yes (for batch provisioning)
   - **Pre-approved**: Yes (bypasses device approval)
   - **Tags**: `tag:sensor-gateway` (for ACL-based access control)
   - **Expiration**: 90 days (covers provisioning window)

Then on the gateway:

```bash
/usr/local/bin/tailscale --socket=/var/run/tailscale/tailscaled.sock up \
  --auth-key=tskey-auth-XXXXX \
  --tun=userspace-networking \
  --hostname=gw-{locationId}
```

The gateway now has a stable Tailscale IP (100.x.y.z) and is accessible from anywhere on the tailnet.

#### 4e. Verify Tailscale Connection

```bash
/usr/local/sbin/tailscale-gw status
```

Check the Tailscale admin console — the gateway should appear with hostname `gw-{locationId}`.

### Step 5: Final Verification

Before shipping:

1. All sensors show "Activated" in the gateway network server
2. Sensor data is flowing through MQTT to the central server
3. Tailscale shows the gateway online
4. MQTT messages arriving at central Mosquitto broker
5. Temperature/humidity readings visible in InfluxDB

### Step 6: Package and Ship

- Place all sensors in individual bags, labeled with their names
- Include the gateway with power adapter
- Include a **setup card** (laminated, one page) with:
  - QR code linking to setup instructions in the Levelset app
  - WiFi: "Plug in gateway → Open Levelset app → Follow setup wizard"
  - Support phone number / chat

---

## Phase 2: Customer Setup (5 Minutes)

### What the Customer Receives

- 1x labeled gateway (UG65) with power adapter
- 15x labeled temperature sensors
- 1x laminated quick-start card

### Setup Steps

The customer's experience should be this simple:

#### Step 1: Plug In the Gateway (1 minute)

Place the gateway in a central location in the restaurant (near the kitchen, within range of all sensors). Plug in the power adapter. A status LED will turn on.

> **Ethernet option**: If the restaurant has an Ethernet drop near the gateway location, plug in an Ethernet cable instead of using WiFi. Skip Step 2.

#### Step 2: Connect Gateway to WiFi (3 minutes)

**Option A — Via Levelset Mobile App (preferred)**:

1. Open the Levelset app
2. Go to Temperature Monitoring > Setup
3. Tap "Connect Gateway"
4. The app connects to the gateway's WiFi AP (`Gateway_XXXXXX`)
5. The app scans for available WiFi networks
6. Customer selects their restaurant WiFi and enters the password
7. The app configures the gateway's WiFi client mode
8. Gateway connects to the restaurant WiFi → Tailscale auto-connects → sensors start reporting

**Option B — Via Gateway Web UI (fallback)**:

1. Connect phone/laptop to the gateway WiFi: `Gateway_XXXXXX`
2. Open browser to `192.168.1.1`
3. Navigate to **Network** > **Interface** > **WLAN**
4. Switch from "Access Point" to "Client" mode
5. Click "Scan" → select restaurant WiFi → enter password
6. Gateway connects and Tailscale auto-reconnects

#### Step 3: Place the Sensors (1 minute)

Place each labeled sensor in its designated location (e.g., "Walk-In Cooler" sensor goes in the walk-in cooler). Sensors can be mounted with screws, hung, or placed on a shelf.

The sensors are already connected to the gateway — no pairing needed. They'll start reporting temperatures within 10 minutes of the gateway coming online.

### Post-Setup Verification

Within 15-20 minutes of setup:
- The Levelset dashboard should show all sensors online with current temperature readings
- If a sensor isn't reporting, check that it's within range of the gateway (up to 2 km in open air, but kitchen walls reduce this — should still be fine within a single restaurant)

---

## Tailscale Key Management

### Auth Key Lifecycle

| Stage | Action |
|-------|--------|
| **Provisioning batch** | Generate a reusable, pre-approved auth key in Tailscale console |
| **Per gateway** | Use the key during `tailscale up` on each gateway |
| **Post-provisioning** | Auth key can expire — already-connected gateways stay connected via their node keys |
| **Node key renewal** | Node keys expire after 180 days by default, but auto-renew while the device is online |
| **Decommissioning** | Remove the device from the Tailscale admin console |

### Access Control (ACLs)

Tag gateways as `tag:sensor-gateway` during provisioning. Then set ACLs so gateways can only communicate with the central MQTT server, not with each other:

```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["tag:sensor-gateway"],
      "dst": ["tag:sensor-server:1883"]
    }
  ]
}
```

### SSH Key Authentication Fix

The Milesight gateway has a quirk with SSH key locations. If SSH key auth doesn't work, the `tailscale-gw` gist includes a fix for correcting the `sshd` config paths on these embedded devices.

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Sensor not joining | Wrong channel index | Set channel 8-15 for US915 via ToolBox app |
| Sensor shows "De-Activate" | Not within range of gateway | Move sensor closer, check gateway is powered on |
| Gateway WiFi won't connect | Wrong password or 5 GHz only | Ensure 2.4 GHz network, re-enter password |
| No data in MQTT | MQTT forwarding not configured | Check gateway web GUI > Applications > Data Transmission |
| Tailscale offline after reboot | rc.local not modified | Re-run `/usr/local/sbin/tailscale-gw install` |
| Tailscale auth expired | Auth key expired before use | Generate new auth key, run `tailscale up` again |
| Can't SSH into gateway | SSH not enabled | Enable in gateway GUI > System > Access Service |

---

## Future Automation Opportunities

### Streamline Pre-Shipping with Scripts

- Script to auto-configure gateway via API (Milesight gateways have a REST API)
- Script to generate Tailscale auth keys via Tailscale API and pre-configure
- Ansible playbook for batch gateway provisioning (similar to Finter's approach — see Tailscale case study)
- Levelset admin panel for managing gateway fleet

### Mobile App WiFi Setup

Build a native flow in the Levelset mobile app (Expo/React Native):
- Use WiFi APIs to detect the gateway's AP
- Auto-connect and configure via HTTP to `192.168.1.1`
- Present a friendly UI for WiFi network selection
- Show real-time sensor status as they come online
