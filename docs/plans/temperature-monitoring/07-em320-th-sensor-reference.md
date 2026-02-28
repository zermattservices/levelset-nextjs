# EM320-TH Sensor Configuration Reference

Comprehensive reference for the Milesight EM320-TH temperature & humidity sensor, extracted from the official User Guide (V1.2, June 2023). Covers every configuration parameter, payload format, downlink command, and operational detail.

**Source**: `em320-th-user-guide-en.pdf` (Milesight EM320-TH User Guide V1.2)

---

## Table of Contents

1. [Hardware Details](#1-hardware-details)
2. [Power Button & LED](#2-power-button--led)
3. [NFC Configuration via ToolBox](#3-nfc-configuration-via-toolbox)
4. [LoRaWAN Settings](#4-lorawan-settings)
5. [Time Synchronization](#5-time-synchronization)
6. [General Settings](#6-general-settings)
7. [Calibration](#7-calibration)
8. [Threshold / Alarm Configuration](#8-threshold--alarm-configuration)
9. [Maintenance](#9-maintenance)
10. [Installation](#10-installation)
11. [Battery Replacement](#11-battery-replacement)
12. [Uplink Payload Format](#12-uplink-payload-format)
13. [Downlink Commands](#13-downlink-commands)
14. [Historical Data Enquiry](#14-historical-data-enquiry)
15. [All Default Values](#15-all-default-values)

---

## 1. Hardware Details

### Packing List

**All versions:**
- 1x EM320-TH Device
- 1x Quick Guide
- 1x Warranty Card

**Standard version additional:**
- 2x Wall Mounting Kits (screws + wall plugs)
- 1x Fixing Screw
- 1x Pole Mounting Plate

### Physical Layout

- **NFC Area**: Front face, upper portion near Milesight logo
- **Vent**: Bottom grille section — **must NOT face upwards when installed**
- **Dimensions**: 85 x 58 x 18 mm
- **Battery**: 2x ER14505 Li-SOCl2, total **5400 mAh** capacity
- **Power button & LED**: Inside device (accessible when cover is removed)

---

## 2. Power Button & LED

Located inside the device. The LED indicates device state.

| Action | How | LED Behavior |
|--------|-----|-------------|
| **Power On** | Press and hold > 3 seconds | Off → On |
| **Power Off** | Press and hold > 3 seconds | On → Off |
| **Factory Reset** | Press and hold > 10 seconds | Blinks quickly |
| **Check Status** | Quick press once | Light On = device is on, Light Off = off |

---

## 3. NFC Configuration via ToolBox

### Procedure

1. Download **Milesight ToolBox** from [Google Play](https://play.google.com/store/apps/details?id=com.ursalinknfc) or [App Store](https://apps.apple.com/us/app/milesight-toolbox/id1518748039)
2. Enable NFC on smartphone
3. Launch ToolBox, select NFC mode
4. Hold phone NFC area against device, tap **Read**
5. Modify settings as needed
6. Hold phone against device, tap **Write**
7. Re-read to verify settings were saved

### Tips

- Remove phone case for better NFC contact
- Keep phone ~10mm from device NFC area
- If read/write fails, move phone away and retry
- **Default password**: `123456` — change before deployment
- Magnetic version: remove from magnetic surface before NFC read
- **Only Android ToolBox supports firmware upgrade**

---

## 4. LoRaWAN Settings

### Connection Parameters

| Parameter | Default Value | Notes |
|-----------|--------------|-------|
| **Device EUI** | Unique per device (printed on label) | Contact sales for bulk EUI lists |
| **App EUI (Join EUI)** | `24E124C0002A0001` | |
| **Application Port (fPort)** | `85` | Used for uplink and downlink |
| **LoRaWAN Version** | V1.0.2 / V1.0.3 available | V1.0.3 needed for network time sync |
| **Work Mode** | Class A (fixed) | Cannot be changed |
| **Join Type** | OTAA (preferred) | OTAA required for Milesight IoT Cloud |

### OTAA Keys

| Parameter | Default (Q4 2025+) | Default (Earlier) |
|-----------|--------------------|--------------------|
| **Application Key** | `{DevEUI}{DevEUI}` (e.g., `24e124123456789024e1241234567890`) | `5572404C696E6B4C6F52613230313823` |

### ABP Keys

| Parameter | Default |
|-----------|---------|
| **Network Session Key** | `5572404C696E6B4C6F52613230313823` |
| **Application Session Key** | `5572404C696E6B4C6F52613230313823` |
| **Device Address** | 5th to 12th digits of serial number |

### US915 Channel Configuration

For Milesight gateways with US915, set channel index to **8-15**.

| Index Range | Frequency (MHz) |
|-------------|----------------|
| 0-15 | 902.3 - 905.3 |
| 16-31 | 905.5 - 908.5 |
| 32-47 | 908.7 - 911.7 |
| 48-63 | 911.9 - 914.9 |
| 64-71 | 903.0 - 914.2 |

### Advanced Parameters

| Parameter | Description |
|-----------|-------------|
| **Confirmed Mode** | If device doesn't receive ACK, re-sends data once |
| **Rejoin Mode** | Interval ≤35 min: sends LinkCheckReq every interval. Interval >35 min: sends specific number of packets. If no response, device re-joins. OTAA only. |
| **Channel Mode** | Standard-Channel or Single-Channel (single channel for single-channel gateways) |
| **ADR Mode** | Adaptive Data Rate — lets network server optimize SF/BW/TxPower |
| **Spreading Factor** | Used when ADR is disabled. Higher SF = longer range, more power |
| **Tx Power** | Transmit power strength per LoRa Alliance spec |
| **RX2 Data Rate** | Data rate for RX2 receive window |
| **RX2 Frequency** | Frequency for RX2 window (Hz) |

---

## 5. Time Synchronization

### Method 1: Via ToolBox App

After reading device via ToolBox, tap the sync icon next to "Device Time" in Basic Information. Syncs to smartphone's time and timezone.

### Method 2: Via Network Server

1. Set LoRaWAN version to **V1.0.3**
2. Connect device to network server
3. Device auto-sends `DeviceTimeReq` MAC command after joining
4. **Only syncs time, NOT timezone** — timezone must be set via ToolBox or downlink
5. Auto-syncs every **5 days**

---

## 6. General Settings

| Setting | Default | Range / Options | Notes |
|---------|---------|-----------------|-------|
| **Temperature Unit** | Celsius | Celsius / Fahrenheit | Display only — **uplink payload is always Celsius** |
| **Reporting Interval** | 10 minutes | 1-1080 minutes | How often data is sent to network server |
| **Data Storage** | Enabled | On / Off | Stores periodic data locally. Max 3000 records. CSV export via ToolBox (last 14 days) |
| **Data Retransmission** | Enabled | On / Off | Re-sends data lost during network outages after reconnection |
| **Retransmission Interval** | 600 seconds | 30-1200 seconds | Configurable via downlink. Increases uplink frequency and shortens battery |
| **Password** | `123456` | Any | For ToolBox write access |

### Data Retransmission Notes

- Only works when Data Storage is also enabled
- If device reboots during retransmission, re-sends ALL retransmission data after reconnect
- If network drops again during retransmission, only the latest disconnected data is sent
- Retransmission data includes timestamps (different format from periodic reports — see [Uplink Payload](#12-uplink-payload-format))

---

## 7. Calibration

Adds a fixed offset to the raw sensor reading. Useful for correcting known sensor bias or environmental factors.

**Formula**: `Final Value = Current Value + Calibration Value`

| Sensor | Calibration Available |
|--------|----------------------|
| Temperature | Yes (toggle on/off, offset in °C) |
| Humidity | Yes (toggle on/off, offset in %RH) |

Configure via ToolBox App. The calibrated value is what gets reported in uplink packets.

---

## 8. Threshold / Alarm Configuration

When a reading exceeds (above or below) the configured threshold, the device **immediately sends an alarm packet** (one-time). The alarm is only re-triggered after the condition is dismissed and then re-occurs.

### Configurable Parameters (via ToolBox)

| Parameter | Description |
|-----------|-------------|
| **Temperature Over** | Upper temperature threshold (°C) |
| **Temperature Below** | Lower temperature threshold (°C) |
| **Humidity Over** | Upper humidity threshold (%RH) |
| **Humidity Below** | Lower humidity threshold (%RH) |
| **Collecting Interval** | How often to check after alarm triggers. Must be less than reporting interval. Default: 10 min |

### Threshold Alarm Conditions (via Downlink)

| Hex Code | Condition |
|----------|-----------|
| `c8` | Disable threshold alarm |
| `c9` | Below minimum threshold only |
| `ca` | Over maximum threshold only |
| `cb` | Within range (between min and max) |
| `cc` | Below OR over (outside range) — **most common for food safety** |

---

## 9. Maintenance

### Firmware Upgrade

1. Download firmware from Milesight website to smartphone
2. Read device via ToolBox, tap **Upgrade**, select firmware file
3. Tap **Upgrade** to apply
4. **Only Android ToolBox supports firmware upgrade**
5. Do not use ToolBox during upgrade

### Backup and Restore (Batch Configuration)

For configuring multiple sensors with identical settings:

**Create template:**
1. Read a configured device via ToolBox
2. Tap **Set Template**, enter name, confirm

**Apply template to other devices:**
1. Go to **Device > Template**
2. Select template, tap **Write** while near target device

**Export/import:** Templates export as JSON files. Useful for sharing configs across phones.

### Factory Reset

- **Hardware**: Hold reset button > 10 seconds until LED blinks quickly
- **ToolBox**: Tap **Reset**, hold phone near device

---

## 10. Installation

### Standard Version — Wall Mount

1. Remove backplate from device
2. Screw wall plugs into wall
3. Fix backplate with screws
4. Snap device onto backplate
5. Fix bottom with fixing screw
6. **Vent must NOT face upwards**

### Standard Version — Pole Mount

1. Replace backplate with pole mounting plate, fix with screw
2. Pass cable tie through plate, wrap around pole

### Magnetic Version

Attach directly to metal surface (fridge, freezer, container). Anti-slip pad on back for secure hold. **Vent must NOT face upwards.**

---

## 11. Battery Replacement

### Procedure

1. Release screws behind rubber feet
2. Remove back cover
3. Replace batteries observing polarity (+ and -)
4. Re-assemble

### Requirements

- **Battery type**: ER14505 Li-SOCl2 ONLY — alkaline batteries NOT supported
- **Quantity**: 2x batteries
- **Total capacity**: 5400 mAh
- Always use new batteries (mixing old/new causes inaccurate power readings)
- Remove batteries if device stored long-term (prevent leakage)

---

## 12. Uplink Payload Format

All payloads are HEX, little-endian byte order, on **fPort 85**.

### Message Structure

```
Channel1 (1B) | Type1 (1B) | Data1 (NB) | Channel2 (1B) | Type2 (1B) | Data2 (NB) | ...
```

### Channel/Type Reference

| Data | Channel | Type | Bytes | Decoding |
|------|---------|------|-------|----------|
| Power On | `ff` | `0b` | 1 | `ff` = device on |
| Protocol Version | `ff` | `01` | 1 | e.g., `01` = V1 |
| Hardware Version | `ff` | `09` | 2 | e.g., `03 10` = V3.1 |
| Software Version | `ff` | `0a` | 2 | e.g., `03 01` = V3.1 |
| Device Type | `ff` | `0f` | 1 | `00`=Class A, `01`=B, `02`=C, `03`=C→B |
| Serial Number | `ff` | `16` | 8 | 16 hex digits |
| **Battery** | `01` | `75` | 1 | UINT8, percentage |
| **Temperature** | `03` | `67` | 2 | INT16 little-endian / 10 = °C |
| **Humidity** | `04` | `68` | 1 | UINT8 / 2 = %RH |
| **Historical Data** | `20` | `ce` | 7 | Bytes 1-4: UINT32 Unix timestamp. Bytes 5-6: INT16/10 °C. Byte 7: UINT8/2 %RH |

### Packet Types

#### Basic Information (sent on join)

Reports device metadata when first joining the network.

Example: `ff0b ff0101 ff166785c38226020003 ff090110 ff0a0101 ff0f00`

#### Periodic Report (sent every reporting interval)

Example: `017564 03672201 046850`

| Field | Bytes | Decoding |
|-------|-------|----------|
| Battery | `64` | 0x64 = 100% |
| Temperature | `22 01` | LE: 0x0122 = 290 → 290/10 = **29.0°C** |
| Humidity | `50` | 0x50 = 80 → 80/2 = **40.0%RH** |

#### Temperature Decoding Formula

```
Read 2 bytes little-endian as INT16, divide by 10
Bytes: 22 01 → LE value: 0x0122 = 290 → 290 / 10 = 29.0°C
```

#### Humidity Decoding Formula

```
Read 1 byte as UINT8, divide by 2
Byte: 50 → 0x50 = 80 → 80 / 2 = 40.0%RH
```

#### Alarm Report (sent immediately on threshold breach)

**Temperature alarm**: `03671001` → 0x0110 = 272 → 27.2°C

**Low battery alarm**: `017501` → battery at 1%

#### Historical Data / Retransmission (includes timestamp)

Example: `20ce 0d755b63 10015d`

| Part | Bytes | Decoding |
|------|-------|----------|
| Timestamp | `0d 75 5b 63` | LE: 0x635b750d = 1666938125 (Unix seconds) |
| Temperature | `10 01` | LE: 0x0110 = 272 → 27.2°C |
| Humidity | `5d` | 0x5d = 93 → 46.5%RH |

---

## 13. Downlink Commands

All downlinks use **fPort 85**. Values are little-endian.

### General Commands

| Command | Hex Pattern | Example |
|---------|-------------|---------|
| **Reboot** | `ff10ff` | `ff10ff` |
| **Set Collect Interval** | `ff02` + UINT16 (seconds, LE) | `ff02b004` → 0x04b0 = 1200s = 20 min |
| **Set Report Interval** | `ff03` + UINT16 (seconds, LE) | `ff03c800` → 0x00c8 = 200s |
| **Enable Data Storage** | `ff6801` | Disable: `ff6800` |
| **Enable Retransmission** | `ff6901` | Disable: `ff6900` |
| **Set Retransmission Interval** | `ff6a00` + UINT16 (seconds, LE) | `ff6a00b004` → 1200s. Range: 30-1200, Default: 600 |

### Temperature Threshold via Downlink

**Format**: `ff06` + condition (1B) + min_temp (INT16/10, LE) + max_temp (INT16/10, LE) + `00000000`

**Example — alert when below 20°C or above 30°C**:

```
ff06 cc c800 2c01 00000000
      │   │    │
      │   │    └─ Max: 0x012c = 300 → 30.0°C
      │   └────── Min: 0x00c8 = 200 → 20.0°C
      └────────── Condition: cc = below-or-over
```

**Encoding temperature for downlink:**
```
Temperature °C × 10 → INT16 little-endian
20.0°C → 200 → 0x00C8 → bytes: C8 00
30.0°C → 300 → 0x012C → bytes: 2C 01
-5.0°C → -50 → 0xFFCE → bytes: CE FF
```

### Condition Codes

| Hex | Meaning |
|-----|---------|
| `c8` | Disable threshold alarm |
| `c9` | Alert when below minimum |
| `ca` | Alert when above maximum |
| `cb` | Alert when within range |
| `cc` | Alert when below minimum OR above maximum |

---

## 14. Historical Data Enquiry

Query stored data from the sensor via downlink. Requires: device time is correct AND data storage is enabled.

### Commands

| Command | Hex Pattern | Description |
|---------|-------------|-------------|
| **Query at time point** | `fd6b` + UINT32 timestamp (LE) | Returns closest reading within reporting interval |
| **Query time range** | `fd6c` + UINT32 start (LE) + UINT32 end (LE) | Max 300 records per query |
| **Stop query** | `fd6dff` | Stops ongoing data report |
| **Set retrievability interval** | `ff6a01` + UINT16 seconds (LE) | Range: 30-1200s, Default: 60s |

### Response

| Channel | Type | Value | Meaning |
|---------|------|-------|---------|
| `fc` | `6b` or `6c` | `00` | Query success — device will report historical data |
| `fc` | `6b` or `6c` | `01` | Invalid time point / range |
| `fc` | `6b` or `6c` | `02` | No data in specified time / range |

### Example: Query Time Range

Downlink: `fd6c 64735b63 7c885b63`
- Start: 0x635b7364 = 1666937700
- End: 0x635b887c = 1666943100

Response: `fc6c00` → success

Device then sends historical data packets (`20ce ...`) at the retrievability interval.

### Time Point Query Behavior

If reporting interval is 10 minutes and you query for 17:00:
1. Device looks for a record at exactly 17:00
2. If not found, searches between 16:50 and 17:10
3. Uploads the closest record found

---

## 15. All Default Values

| Setting | Default |
|---------|---------|
| Device password | `123456` |
| App EUI (Join EUI) | `24E124C0002A0001` |
| Application Port (fPort) | `85` |
| LoRaWAN Version | V1.0.2 / V1.0.3 |
| Work Mode | Class A (fixed) |
| AppKey (OTAA, Q4 2025+) | `{DevEUI}{DevEUI}` |
| AppKey (OTAA, earlier) | `5572404C696E6B4C6F52613230313823` |
| NwkSKey (ABP) | `5572404C696E6B4C6F52613230313823` |
| AppSKey (ABP) | `5572404C696E6B4C6F52613230313823` |
| Temperature Unit | Celsius |
| Reporting Interval | 10 minutes (range: 1-1080 min) |
| Data Storage | Enabled |
| Data Retransmission | Enabled |
| Retransmission Interval | 600 seconds (range: 30-1200s) |
| Retrievability Interval | 60 seconds (range: 30-1200s) |
| Threshold Collecting Interval | 10 minutes |
| US915 Channel Index (Milesight GW) | 8-15 |
| Battery capacity | 5400 mAh (2x ER14505) |
| Battery type | ER14505 Li-SOCl2 only |
| Local storage capacity | 3000 records |
| ToolBox CSV export limit | Last 14 days |
| Max records per historical query | 300 |
| Time sync auto-request | Every 5 days |

---

## Quick Reference: Downlink Command Cheat Sheet

```
REBOOT:                      ff10ff
SET REPORT INTERVAL (10min): ff03e803    (0x03e8 = 600s)
SET REPORT INTERVAL (5min):  ff032c01    (0x012c = 300s)
SET REPORT INTERVAL (15min): ff038403    (0x0384 = 900s)
ENABLE DATA STORAGE:         ff6801
DISABLE DATA STORAGE:        ff6800
ENABLE RETRANSMISSION:       ff6901
DISABLE RETRANSMISSION:      ff6900
SET RETRANSMIT INTERVAL:     ff6a005802  (0x0258 = 600s default)

THRESHOLD (below 2°C or above 8°C — walk-in cooler):
  ff06cc 1400 5000 00000000
  (min: 0x0014=20 → 2.0°C, max: 0x0050=80 → 8.0°C)

THRESHOLD (below -18°C — freezer):
  ff06c9 90ff 0000 00000000
  (min: 0xff90 = -112 → -11.2°C... adjust as needed)

THRESHOLD DISABLE:           ff06c8 0000 0000 00000000

QUERY HISTORY (time range):  fd6c [4B start LE] [4B end LE]
STOP QUERY:                  fd6dff
```
