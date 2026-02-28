# Hardware — Sensors & Gateway

## Supplier

**Milesight IoT** — [milesight.com/iot](https://www.milesight.com/iot)

All hardware uses the **US915** frequency band (North America). Sensors communicate via **LoRaWAN** protocol to a central gateway, which forwards data over WiFi/Ethernet to the cloud.

Partner program for volume discounts: [milesight.com/partner/ecosystem](https://www.milesight.com/partner/ecosystem)

---

## EM320-TH-915M — Temperature & Humidity Sensor

**Product page**: [milesight.com/iot/product/lorawan-sensor/em320-th](https://www.milesight.com/iot/product/lorawan-sensor/em320-th)

### Key Specs

| Spec | Value |
|------|-------|
| **Temperature range** | -30°C to +60°C (-22°F to 140°F) |
| **Temperature accuracy** | ±0.3°C (-30 to 0°C); ±0.2°C (0 to 60°C) |
| **Temperature resolution** | 0.1°C |
| **Humidity range** | 0% to 100% RH |
| **Humidity accuracy** | ±2% (at 25°C) |
| **Battery** | 2x 2700 mAh ER14505 Li-SOCl2 |
| **Battery life** | 10+ years (SF7, US915, 10-min interval, 25°C) |
| **IP rating** | IP67 (waterproof, dustproof) |
| **Dimensions** | 85 x 58 x 18 mm (~3.3 x 2.3 x 0.7 in) |
| **Weight** | 93.2g (standard), 102g (magnet version) |
| **Housing** | PC + ABS, **FDA food-grade approved**, white |
| **Data storage** | 3,000 entries with timestamps (retransmits on reconnection) |
| **Sensor chip** | Sensirion (high-precision) |
| **Mounting** | Wall screw, pole mount (standard); magnetic adsorption (magnet version) |
| **Certifications** | CE, FCC, Telec, EN12830, RoHS, FDA food contact materials |

### LoRaWAN Specs

| Spec | Value |
|------|-------|
| **Protocol** | LoRaWAN v1.0.2/v1.0.3 |
| **Class** | A (fixed) |
| **Frequency** | US915 (915 MHz) |
| **TX power** | 20 dBm |
| **Sensitivity** | -137 dBm @ 300 bps |
| **Join mode** | OTAA (preferred) or ABP |
| **Default fPort** | 85 |
| **Default App EUI** | `24E124C0002A0001` |
| **Default AppKey** | `5572404C696E6B4C6F52613230313823` |
| **Range** | Up to 2 km urban, 15 km rural (line of sight) |

### Why This Sensor

- **FDA food-grade housing** — critical for health department compliance
- **IP67** — handles humid walk-in cooler/freezer environments
- **10+ year battery** — no maintenance visits for battery replacement
- **3,000-entry buffer** — if gateway temporarily goes offline, data isn't lost
- **±0.2°C accuracy** — exceeds most compliance requirements
- **NFC config** — no cables or pairing buttons, configure via phone tap

### Unit Cost

**$37.00/unit** (pre-volume discount, from Milesight direct order, Feb 2026)

Model number on invoice: `EM320-TH-915M`

---

## AM102-915M — Indoor Ambience Monitoring Sensor

This sensor was also ordered ($42/unit, 4 units) and monitors indoor conditions. It's broader than just temp/humidity — may include CO2, light, PIR motion. Useful for dining room comfort monitoring but **not the primary sensor for food safety compliance**. The EM320-TH is the correct choice for walk-ins, freezers, and reach-in equipment.

**Unit cost**: $42.00/unit

---

## UG65-915M-EA — LoRaWAN Gateway

**Product page**: [milesight.com/iot/product/lorawan-gateway/ug65](https://www.milesight.com/iot/product/lorawan-gateway/ug65)

### Key Specs

| Spec | Value |
|------|-------|
| **CPU** | Quad-core 1.5 GHz, 64-bit ARM Cortex-A53 |
| **RAM** | 512 MB DDR4 |
| **Storage** | 8 GB eMMC |
| **LoRa chip** | Semtech SX1302 |
| **LoRa channels** | 8 (half/full-duplex) |
| **Device capacity** | ~2,000 Class A/B/C devices |
| **LoRaWAN support** | v1.0 and v1.0.2, Class A/B/C |
| **Frequency** | US915 |
| **TX power** | 27 dBm max |
| **Sensitivity** | -140 dBm @ 292 bps |
| **IP rating** | IP65 |
| **Dimensions** | 180 x 110 x 55.5 mm |
| **Weight** | 548g |
| **Operating temp** | -40°C to +70°C |
| **Power consumption** | Typical 2.9W, max 4.2W |

### Connectivity

| Interface | Details |
|-----------|---------|
| **WiFi** | IEEE 802.11 b/g/n, 2.4 GHz. AP mode (setup) + Client mode (internet) |
| **Ethernet** | 1x RJ45 WAN, 10/100/1000 Mbps (Gigabit) |
| **PoE** | 802.3af (powered device) |
| **USB** | Type-C (5V/1A power) |
| **Power** | DC 9-24V jack, PoE, or USB-C |

### Software Capabilities

- **Built-in LoRaWAN Network Server** — no external network server needed
- **MQTT forwarding** — publish decoded sensor data to any MQTT broker
- **Payload codec** — decode binary LoRaWAN payloads to JSON on the gateway
- **Node-RED** — built-in for custom data processing workflows
- **Python SDK** — secondary development capability
- **VPN support** — OpenVPN, IPsec, WireGuard, PPTP, L2TP, GRE, DMVPN
- **Tailscale** — installable via custom script (see [04-provisioning-and-setup.md](./04-provisioning-and-setup.md))
- **Web GUI** — full configuration at `192.168.1.1` (Chrome recommended)
- **FUOTA** — firmware update over-the-air for connected sensors

### Why This Gateway

- **2,000 device capacity** — overkill for 15 sensors, but means one gateway per location is always enough
- **Built-in network server** — no need for external ChirpStack/TTN infrastructure
- **WiFi client mode** — connects to restaurant's existing WiFi (simple customer setup)
- **ARM64 Linux** — can run Tailscale for zero-config remote access
- **Sub-5W power** — negligible electricity cost
- **PoE option** — single cable for power + network in locations with PoE switches

### "-EA" vs "-L04" Variants

The `-EA` suffix means **no cellular**. The `-L04` variants include LTE Cat 4 cellular as a backup connection. For our use case, `-EA` (WiFi/Ethernet only) is sufficient since restaurants have WiFi. The cellular variant is more expensive and unnecessary.

### Unit Cost

**$234.00/unit** (pre-volume discount, from Milesight direct order, Feb 2026)

Model number on invoice: `UG65-915M-EA`

---

## Configuration Tool — Milesight ToolBox App

The ToolBox app is used to configure sensors via NFC tap from a smartphone. This is how sensors are initially provisioned and how settings are changed.

- **iOS**: [App Store](https://apps.apple.com/us/app/milesight-toolbox/id1518748039)
- **Android**: [Google Play](https://play.google.com/store/apps/details?id=com.ursalinknfc)

### What It Does

- Read/write sensor settings wirelessly via NFC (no cable needed)
- View device EUI, firmware version, battery status, current readings
- Configure LoRaWAN join mode (OTAA/ABP), frequency band, channel index
- Set reporting intervals, alarm thresholds
- Password protected (default: `123456`, should change)

### NFC Configuration Workflow

1. Install ToolBox on NFC-enabled smartphone
2. Enable NFC on phone
3. Launch ToolBox, select NFC mode
4. Hold phone's NFC area close to sensor (~10mm, remove phone case)
5. Tap "Read" to pull current config
6. Modify settings (frequency, join mode, reporting interval, thresholds)
7. Tap "Write" to push new config
8. Re-read to verify

**Tip**: Identify your phone's NFC antenna location first. Remove cases for best contact.

---

## Sensor Payload Format

The EM320-TH uses binary payloads on fPort 85. Milesight provides official JavaScript decoders at [github.com/Milesight-IoT/SensorDecoders](https://github.com/Milesight-IoT/SensorDecoders) (in the `em-series` directory).

### Binary Payload Structure

```
Channel1 (1 byte) | Type1 (1 byte) | Data1 (N bytes, little-endian) | ...
```

### Decoded Fields

| Channel | Type | Meaning | Size | Conversion |
|---------|------|---------|------|------------|
| `0x01` | `0x75` | Battery level | 1 byte | raw value = percentage |
| `0x03` | `0x67` | Temperature | 2 bytes | Int16LE / 10 = °C |
| `0x04` | `0x68` | Humidity | 1 byte | raw / 2 = % RH |

### Example Decoded Output

```json
{
  "battery": 92,
  "temperature": 30.8,
  "humidity": 50.5
}
```

The gateway's built-in payload codec can handle this decoding automatically, so the MQTT messages contain human-readable JSON.

### Decoder Compatibility

Official decoders support:
- Milesight built-in Network Server (on the UG65)
- ChirpStack v3 / v4
- The Things Network (TTN)

---

## Sample Order (Actual Invoice — Feb 2026)

| Item | Model | Unit Price | Qty | Total |
|------|-------|-----------|-----|-------|
| Indoor Ambience Sensor | AM102-915M | $42.00 | 4 | $168.00 |
| Temp & Humidity Sensor | EM320-TH-915M | $37.00 | 21 | $777.00 |
| LoRaWAN Gateway | UG65-915M-EA | $234.00 | 1 | $234.00 |
| Shipping | — | $110.00 | — | $110.00 |
| **Total** | | | **26 pcs** | **$1,289.00** |

### Per-Restaurant COGS Estimate (15 sensors + 1 gateway)

| Item | Cost |
|------|------|
| 15x EM320-TH @ $37 | $555 |
| 1x UG65 gateway @ $234 | $234 |
| Shipping (proportional) | ~$56 |
| Engraving/labeling | ~$5-10 |
| **Total** | **~$850-855** |

These costs should decrease with Milesight Partner Program volume discounts.
