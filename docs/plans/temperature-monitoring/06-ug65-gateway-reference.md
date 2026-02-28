# UG65 Gateway Configuration Reference

Comprehensive reference for the Milesight UG65 LoRaWAN gateway, extracted from the official User Guide (V2.13, Dec 2025). This document covers every configuration area relevant to setting up the gateway for temperature sensor monitoring with MQTT data forwarding.

**Source**: `ug65-user-guide-en.pdf` (Milesight UG65 User Guide V2.13)

---

## Table of Contents

1. [Initial Access & Credentials](#1-initial-access--credentials)
2. [Network Configuration](#2-network-configuration)
3. [Packet Forwarder](#3-packet-forwarder)
4. [Network Server](#4-network-server)
5. [Applications & MQTT Integration](#5-applications--mqtt-integration)
6. [Payload Codec](#6-payload-codec)
7. [Device Profiles](#7-device-profiles)
8. [Device Management](#8-device-management)
9. [System Administration](#9-system-administration)
10. [Maintenance & Troubleshooting](#10-maintenance--troubleshooting)
11. [Step-by-Step Setup Procedures](#11-step-by-step-setup-procedures)

---

## 1. Initial Access & Credentials

### Default Credentials

| Item | Value |
|------|-------|
| **Web GUI Username** | `admin` |
| **Web GUI Password** | `password` |
| **WiFi AP SSID** | `Gateway_XXXXXX` (last 6 digits of WLAN MAC address) |
| **WiFi AP Password** | `iotpassword` |
| **Web GUI via WiFi** | `https://192.168.1.1` |
| **Web GUI via Ethernet** | `192.168.23.150` |
| **Recommended Browser** | Google Chrome |

### First Login

- Navigate to the web GUI URL
- Enter default username and password
- **Mandatory password change** on first login: new password must contain at least one letter and one number
- After 5 failed login attempts, the account is locked for 10 minutes

### Access Methods

| Method | Default URL/IP |
|--------|---------------|
| **WiFi AP** | Connect to `Gateway_XXXXXX` with password `iotpassword`, then browse to `https://192.168.1.1` |
| **Ethernet (DHCP)** | Connect via Ethernet, gateway obtains IP via DHCP from your network |
| **Ethernet (Static)** | Direct connect, set PC IP to `192.168.23.x` (not .150), browse to `192.168.23.150` |

---

## 2. Network Configuration

### 2.1 Ethernet (Port)

**Web GUI**: Network > Interface > Port

| Parameter | Default | Options |
|-----------|---------|---------|
| **Port** | eth 0 | — |
| **Connection Type** | DHCP | Static IP, DHCP Client, PPPoE |
| **Default Static IP** | 192.168.23.150 | Any valid IP |
| **Netmask** | 255.255.255.0 | — |
| **Gateway** | 192.168.23.1 | — |
| **MTU** | 1500 | — |
| **Primary DNS** | 8.8.8.8 | — |
| **Secondary DNS** | 223.5.5.5 | — |
| **Enable NAT** | Checked | — |

### 2.2 WLAN — AP Mode (Access Point)

**Web GUI**: Network > Interface > WLAN

Used for initial configuration access. The gateway creates its own WiFi hotspot.

| Parameter | Default | Options |
|-----------|---------|---------|
| **Enable** | Checked | — |
| **Work Mode** | AP | AP, Client |
| **SSID Broadcast** | Enabled | — |
| **AP Isolation** | Disabled | — |
| **Radio Type** | 802.11n (2.4GHz) | 802.11b, 802.11g, 802.11n, 802.11b/g/n |
| **Channel** | Auto | Auto, 1-11 |
| **SSID** | Gateway_XXXXXX | Customizable |
| **Encryption Mode** | WPA-PSK/WPA2-PSK | No Encryption, WPA-PSK, WPA2-PSK, WPA-PSK/WPA2-PSK |
| **Bandwidth** | 20MHz | 20MHz, 40MHz |
| **Max Client Number** | 10 | 1-10 |
| **IP Address** | 192.168.1.1 | — |
| **Netmask** | 255.255.255.0 | — |

### 2.3 WLAN — Client Mode

Used for connecting the gateway to an existing WiFi network (the restaurant's WiFi).

**Configuration Steps** (Web GUI: Network > Interface > WLAN):

1. Set **Work Mode** to Client
2. Click **Scan** to discover available networks
3. Select a network and click **Join Network**
4. Enter the WiFi password
5. Set **Encryption Mode** (e.g., WPA-PSK/WPA2-PSK)
6. Under IP Setting, choose **DHCP Client** (recommended) or Static IP
7. Click **Save** and **Apply**
8. Verify at **Status > WLAN** — Status should show "Connected"

After switching to Client mode, the gateway loses its AP hotspot. To regain access:
- Connect via Ethernet to the gateway
- Or perform a factory reset to restore AP mode

### 2.4 WAN Failover

**Web GUI**: Network > Failover > WAN Failover

When using WiFi Client mode as the primary network, set up failover:

| Parameter | Description |
|-----------|-------------|
| **Main Interface** | wlan0 (WiFi) or eth 0 (Ethernet) |
| **Backup Interface** | The alternative interface |
| **Startup Delay(s)** | 30 (seconds before checking backup) |
| **Up Delay(s)** | 0 |
| **Down Delay(s)** | 0 |
| **Track ID** | 1 |

### 2.5 Verifying Connectivity

**Web GUI**: Maintenance > Tools > Ping

Enter a hostname (e.g., `www.google.com`) and click Ping. Successful responses confirm internet connectivity.

---

## 3. Packet Forwarder

**Web GUI**: Packet Forwarder

The Packet Forwarder receives LoRa packets from sensors and forwards them to a network server.

### 3.1 General Settings

**Web GUI**: Packet Forwarder > General

| Parameter | Value/Description |
|-----------|-------------------|
| **Gateway EUI** | Auto-generated from ETH MAC address (MAC + FFFE inserted in middle). Non-editable. |
| **Gateway ID** | Defaults to Gateway EUI. Editable. |
| **Frequency-Sync** | Disabled by default. Can sync with network server. |

### 3.2 Multi-Destination

The gateway can forward packets to multiple network servers simultaneously.

| Column | Description |
|--------|-------------|
| **ID** | Destination identifier (0-based) |
| **Enable** | Toggle forwarding to this destination |
| **Type** | Embedded NS, Semtech, Basic Station, ChirpStack, Custom |
| **Server Address** | IP or hostname of the network server |
| **Connect Status** | Connected / Disconnected |
| **Operation** | Edit / Delete |

**Default configuration**: ID 0, Enabled, Type "Embedded NS", Server Address "localhost", Connected.

To add external network servers (e.g., The Things Network, ChirpStack):
1. Click the "+" button
2. Select Type (e.g., "Semtech" for TTN)
3. Enter Server Address (e.g., `eu1.cloud.thethings.network`)
4. Set Port Up and Port Down (default: 1700/1700)
5. Click Save

### 3.3 Packet Filters

Filter which packets are forwarded based on:
- **NetID**: White/Black list by Network ID
- **JoinEUI**: White/Black list by Join EUI
- **DevEUI**: White/Black list by Device EUI

### 3.4 Radio Configuration

**Web GUI**: Packet Forwarder > Radios

| Parameter | US915 Default | Description |
|-----------|---------------|-------------|
| **Antenna Type** | Internal | Internal or External |
| **Region** | US915 | Select based on deployment region |
| **Radio 0 Center Frequency** | 904.3 MHz | — |
| **Radio 1 Center Frequency** | 905.0 MHz | — |

**Multi Channels Setting** (8 channels for US915):

| Index | Radio | Frequency (MHz) |
|-------|-------|-----------------|
| 0 | Radio 0 | 903.9 |
| 1 | Radio 0 | 904.1 |
| 2 | Radio 0 | 904.3 |
| 3 | Radio 0 | 904.5 |
| 4 | Radio 1 | 904.7 |
| 5 | Radio 1 | 904.9 |
| 6 | Radio 1 | 905.1 |
| 7 | Radio 1 | 905.3 |

### 3.5 Advanced Settings

**Web GUI**: Packet Forwarder > Advanced

| Parameter | Default | Description |
|-----------|---------|-------------|
| **Keep Alive Interval** | 10 sec | Heartbeat interval to network server |
| **Stat Interval** | 30 sec | Statistics reporting interval |
| **Push Timeout** | 100 ms | — |
| **Forward CRC Valid** | Enabled | Forward packets with valid CRC |
| **Forward CRC Error** | Disabled | Forward packets with CRC errors |
| **Forward No CRC** | Disabled | Forward packets without CRC |
| **Beacon Period** | 128 sec | For Class B devices |
| **Beacon Frequency** | Auto | — |
| **Beacon Data Rate** | — | Region-dependent |

### 3.6 Traffic Monitor

**Web GUI**: Packet Forwarder > Traffic

Real-time display of LoRa packets. Columns include:
- Device EUI/Group
- Gateway ID
- Frequency
- Datarate (e.g., SF7BW125)
- RSSI/SNR
- Size
- fPort
- Type (UpUnc, JnReq, JnAcc, DnUnc, DnCnf, ACK)
- Time
- Details (click for packet inspection)

---

## 4. Network Server

**Web GUI**: Network Server

The built-in LoRaWAN network server manages device joins, deduplication, and routing. No external network server (ChirpStack, TTN) is required.

### 4.1 General Settings

**Web GUI**: Network Server > General

| Parameter | Default | Description |
|-----------|---------|-------------|
| **Enable** | Enabled | Toggle the built-in network server |
| **Platform Mode** | Disabled | Enable for Milesight IoT Cloud integration |
| **Cloud Mode** | — | Milesight IoT Cloud (when Platform Mode enabled) |
| **NetID** | 010203 | Network identifier |
| **Join Delay** | 5 sec | Time window for join accept |
| **RX1 Delay** | 1 sec | Receive window 1 delay |
| **Lease Time** | 876000-00-00 | Device lease duration (effectively unlimited) |
| **Log Level** | Info | Info, Debug, Warning, Error |
| **Channel Plan** | Region-dependent | Configurable channel ranges |

---

## 5. Applications & MQTT Integration

### 5.1 Application Configuration

**Web GUI**: Network Server > Applications

Applications group devices for data transmission. Each application can have one MQTT and one HTTP/HTTPS integration.

**Creating an Application:**

1. Navigate to Network Server > Applications
2. Click "+" to add a new application
3. Fill in:
   - **Name**: Application name (e.g., "Levelset Sensors")
   - **Description**: Optional description
   - **Metadata**: Optional checkboxes for including devEUI, deviceName, applicationID, gatewayTime, cellularIP in payloads

### 5.2 Data Transmission — MQTT

**Web GUI**: Network Server > Applications > [Edit Application] > Data Transmission

To add MQTT forwarding:
1. Click "+" under Data Transmission
2. Select **Type**: MQTT
3. Select **Configuration Mode**: Manual Configuration

#### General MQTT Settings

| Parameter | Default | Description |
|-----------|---------|-------------|
| **Broker Address** | — | IP or hostname of MQTT broker |
| **Broker Port** | — | Typically 1883 (unencrypted) or 8883 (TLS) |
| **Client ID** | — | Unique identifier for this connection |
| **Connection Timeout/s** | 30 | Seconds before connection timeout |
| **Keep Alive Interval/s** | 60 | Heartbeat interval |
| **Data Retransmission** | Enabled | Buffer up to 10,000 messages when broker unreachable |

#### User Credentials

| Parameter | Description |
|-----------|-------------|
| **Enable** | Toggle authentication |
| **Username** | MQTT broker username |
| **Password** | MQTT broker password |

#### TLS Settings

| Parameter | Description |
|-----------|-------------|
| **Enable** | Toggle TLS encryption |
| **Mode** | CA signed certificates / Self signed certificates |
| **CA File** | Upload CA certificate (for CA signed mode) |
| **Client Certificate File** | Upload client cert (for Self signed mode) |
| **Client Key File** | Upload client private key (for Self signed mode) |
| **SSL Secure** | Enable SSL verification |

#### Last Will Message

| Parameter | Description |
|-----------|-------------|
| **Enable** | Toggle Last Will and Testament |
| **Will Topic** | Topic published when gateway disconnects unexpectedly |
| **Will QoS** | 0, 1, or 2 |
| **Will Retain** | Whether the will message is retained |
| **Will Message** | The message content |

#### MQTT Topics

Each topic type can be configured with a custom topic name, Retain flag, and QoS level (0, 1, or 2).

| Data Type | Direction | Description |
|-----------|-----------|-------------|
| **Uplink data** | Gateway -> Broker | Sensor data messages |
| **Downlink data** | Broker -> Gateway | Commands to devices |
| **Multicast downlink data** | Broker -> Gateway | Commands to device groups |
| **Join notification** | Gateway -> Broker | Device join events |
| **ACK notification** | Gateway -> Broker | Downlink acknowledgments |
| **Error notification** | Gateway -> Broker | Error events |
| **Request data** | Gateway -> Broker | Request messages |
| **Response data** | Broker -> Gateway | Response messages |

#### "Get via HTTP" Mode

Alternative to manual configuration. Provide a Platform URL and the gateway auto-fetches MQTT settings. Supports Custom Format for specific platforms.

### 5.3 Data Transmission — HTTP/HTTPS

Alternative to MQTT. Configure per-data-type URLs:

| Data Type | Description |
|-----------|-------------|
| **Uplink data** | URL for sensor data |
| **Join notification** | URL for join events |
| **ACK notification** | URL for acknowledgments |
| **Error notification** | URL for errors |

Custom HTTP headers can be added for authentication (Header Name + Header Value pairs).

---

## 6. Payload Codec

**Web GUI**: Network Server > Payload Codec

Decodes binary LoRaWAN payloads into human-readable JSON before MQTT/HTTP forwarding.

### 6.1 Inbuilt Library

The gateway ships with a built-in decoder library for all Milesight sensors.

| Feature | Description |
|---------|-------------|
| **Auto-update** | Keeps decoder library current via internet |
| **Local upload** | Upload codec library ZIP file manually |
| **Coverage** | All Milesight sensor models |
| **Default fPort** | 85 (for Milesight devices) |

### 6.2 Custom Payload Codec

For non-Milesight devices or custom decoding logic.

| Field | Description |
|-------|-------------|
| **Name** | Codec name |
| **Description** | Optional description |
| **Template** | Select a Milesight template as a starting point |

#### Decoder Function

JavaScript (ES2020) function that converts hex payload to JSON.

- **Input**: Binary payload (hex string) + fPort number
- **Output**: JSON object with decoded fields
- **Purpose**: Transform raw sensor data into meaningful key-value pairs

Example output for EM320-TH temperature/humidity sensor:
```json
{
  "battery": 99,
  "humidity": 30,
  "temperature": 23.4
}
```

#### Encoder Function

JavaScript function that converts JSON commands to hex payloads for downlink messages.

- **Input**: JSON command object
- **Output**: Hex string for transmission to device

#### Object Mapping Function

Maps decoded JSON fields to BACnet/Modbus objects for building automation integration.

- **JSON Function mode**: Write JavaScript mapping logic
- **Page Configuration mode**: Visual UI for mapping fields

#### Testing

Built-in test functionality:
1. Enter hex payload data
2. Enter fPort number
3. Click Test to run Decoder or Encoder
4. View JSON output to verify correctness

---

## 7. Device Profiles

**Web GUI**: Network Server > Profiles

### 7.1 Pre-configured Profiles

8 built-in profiles are available:

| Profile Name | Join Type | Class |
|-------------|-----------|-------|
| ClassA-ABP | ABP | A |
| ClassA-OTAA | OTAA | A |
| ClassB-ABP | ABP | A + B |
| ClassB-OTAA | OTAA | A + B |
| ClassC-ABP | ABP | A + C |
| ClassC-OTAA | OTAA | A + C |
| ClassCB-ABP | ABP | A + B + C |
| ClassCB-OTAA | OTAA | A + B + C |

**For Levelset temperature sensors**: Use **ClassA-OTAA** (the EM320-TH is Class A with OTAA join).

### 7.2 Profile Settings

| Parameter | Default | Description |
|-----------|---------|-------------|
| **Name** | Profile name | — |
| **Max TXPower** | 0 | 0 = maximum allowed EIRP for the region |
| **Join Type** | OTAA or ABP | Over-the-Air Activation (preferred) or Activation By Personalization |
| **Class Type** | A (always), B/C optional | Device class capabilities |

### 7.3 Advanced Profile Settings

| Parameter | Default | Description |
|-----------|---------|-------------|
| **ADR** | Enabled | Adaptive Data Rate — dynamically adjusts SF/power |
| **MAC Version** | 1.0.2 | LoRaWAN MAC layer version |
| **Regional Parameters Revision** | B | — |
| **RX1 Datarate Offset** | 0 | — |
| **RX2 Datarate** | 8 | — |
| **RX2 Channel Frequency** | Region-dependent | — |
| **Frequency List** | — | Custom frequency list |
| **Device Channel** | — | Specific channel assignment |
| **PingSlot Periodicity** | — | For Class B devices |
| **PingSlot Datarate** | — | For Class B devices |
| **PingSlot Channel Frequency** | — | For Class B devices |
| **ACK Timeout** | — | Acknowledgment timeout |

---

## 8. Device Management

**Web GUI**: Network Server > Device

### 8.1 Adding a Device

Click **Add** button and fill in:

| Field | Required | Description |
|-------|----------|-------------|
| **Device Name** | Yes | Human-readable name (e.g., "Walk-In Cooler") |
| **Description** | No | Optional notes |
| **Device EUI** | Yes | 16-character hex identifier (printed on sensor) |
| **Device-Profile** | Yes | Select from Profiles (e.g., ClassA-OTAA) |
| **Application** | Yes | Select from Applications |
| **Payload Codec** | Yes | Select decoder (e.g., EM320-TH model) |
| **fPort** | Yes | Default: 85 for Milesight sensors, 1 for custom |
| **Frame-counter Validation** | No | Validate frame counters (security check) |

#### OTAA-Specific Fields

| Field | Description |
|-------|-------------|
| **Application Key** | Default Value: `5572404C696E6B4C6F52613230313823` for Milesight devices. Or Custom Value for non-default keys. Alternative default format: DeviceEUI + DeviceEUI (16+16 chars). |

#### ABP-Specific Fields (if using ABP join)

| Field | Description |
|-------|-------------|
| **Device Address** | 8-character hex address |
| **Network Session Key** | 32-character hex key |
| **Application Session Key** | 32-character hex key |
| **Uplink Frame-counter** | Starting value (default: 0) |
| **Downlink Frame-counter** | Starting value (default: 0) |

#### Additional Settings

| Field | Default | Description |
|-------|---------|-------------|
| **Timeout** | 1440 min (24 hours) | Time after last packet before device shows "Offline" |
| **Modbus RTU** | — | Enable for Milesight controllers with Modbus |

### 8.2 Bulk Import

Click **Bulk Import** to add multiple devices via CSV template. Download the template first, fill in device details, then upload.

### 8.3 Device Status

| Status | Meaning |
|--------|---------|
| **Never activated** | Device has been added but never sent a Join Request |
| **Offline** | Device has not sent data within the Timeout period |
| **Online** | Device is actively sending data |

### 8.4 Viewing Device Data

**Web GUI**: Network Server > Packets

| Column | Description |
|--------|-------------|
| Device EUI/Group | Source device |
| Gateway ID | Receiving gateway |
| Frequency | Transmission frequency |
| Datarate | e.g., SF7BW125 |
| RSSI/SNR | Signal strength and noise ratio |
| Size | Packet size in bytes |
| fPort | Application port number |
| Type | JnReq, JnAcc, UpUnc, UpCnf, DnUnc, DnCnf, ACK |
| Time | Timestamp |
| Details | Click for full packet inspection |

**Packet Detail Fields** (from Details click):
- SpreadFactor, Bitrate, CodeRate
- SNR, RSSI, Power
- Payload (Base64), Payload (hex)
- JSON (decoded output, e.g., `{"battery": 99, "humidity": 30, "temperature": 23.4}`)
- MIC (Message Integrity Code)

### 8.5 Sending Data to Devices (Downlink)

**Web GUI**: Network Server > Packets > Send Data To Device

| Field | Description |
|-------|-------------|
| **Device EUI** | Target device or multicast group |
| **Type** | ASCII or HEX |
| **Payload** | The data to send |
| **Fport** | Application port |
| **Confirmed** | Request acknowledgment (recommended) |

**Class A note**: Downlinks only transmit after the device sends an uplink. The network server queues the downlink and delivers it in the next RX window.

Packet status indicators:
- **Success** (green): Packet delivered
- **Pending** (yellow): Queued, waiting for uplink
- **Gray record**: Already in queue, cannot transmit yet

---

## 9. System Administration

### 9.1 General Settings

**Web GUI**: System > General

| Parameter | Default | Description |
|-----------|---------|-------------|
| **Hostname** | GATEWAY | Device hostname |
| **Web Login Timeout** | 1800 sec (30 min) | Auto-logout after inactivity |

### 9.2 Access Services

**Web GUI**: System > General > Access Service

| Service | Default Port | Default State |
|---------|-------------|---------------|
| **HTTP** | 80 | Enabled |
| **HTTPS** | 443 | Enabled |
| **TELNET** | 23 | Enabled |
| **SSH** | 22 | Enabled |

All ports are customizable. HTTPS supports custom certificate upload.

### 9.3 System Time

**Web GUI**: System > System Time

Three synchronization methods:
1. **Sync with Browser** — one-click sync to your computer's time
2. **NTP Server** — automatic sync (e.g., pool.ntp.org)
3. **Manual** — set date/time manually

### 9.4 User Management

**Web GUI**: System > User Management

| User Type | Capabilities |
|-----------|-------------|
| **Admin** | Full access, username/password changeable (5-31 chars, letter + number) |
| **Common User (Read-Only)** | View-only access to all pages |
| **Common User (Read-Write)** | Full configuration access |

### 9.5 HTTP API Management

**Web GUI**: System > HTTP API Management

| Option | Description |
|--------|-------------|
| **Same as Web GUI Account** | API uses same credentials as web login |
| **Independent Account** | Separate username/password for API access |
| **Advanced Password Encryption** | Enhanced security for API credentials |

### 9.6 SNMP

**Web GUI**: System > SNMP

Supported versions: SNMPv1, SNMPv2c, SNMPv3. Configurable community strings and user credentials.

---

## 10. Maintenance & Troubleshooting

### 10.1 Diagnostic Tools

**Web GUI**: Maintenance > Tools

| Tool | Description |
|------|-------------|
| **Ping** | IP Ping to test connectivity |
| **Traceroute** | Trace network path to destination |
| **Packet Analyzer (Qxdmlog)** | Low-level packet analysis |

### 10.2 System Logs

**Web GUI**: Maintenance > Log

| Feature | Description |
|---------|-------------|
| **System Log** | View and export local logs |
| **Remote Log Server** | Forward logs to external Syslog server (UDP/TCP) |
| **Severity levels** | Emergency, Alert, Critical, Error, Warning, Notice, Info, Debug |

### 10.3 Firmware Upgrade

**Web GUI**: Maintenance > Upgrade

1. Contact Milesight support for firmware file (`.bin` format)
2. Navigate to Maintenance > Upgrade
3. Click **Browse** and select firmware file
4. Click **Upgrade** — gateway validates the file first
5. Keep power on during upgrade
6. After upgrade, clear browser cache before accessing web GUI
7. Optionally check **Reset Configuration to Factory Default** before upgrading

### 10.4 Backup & Restore

**Web GUI**: Maintenance > Backup and Restore

| Action | Description |
|--------|-------------|
| **Restore Config** | Upload a previously saved config file |
| **Full Backup** | Export complete device configuration |
| **Batch Backup** | Export configuration for fleet management |
| **Restore Factory Defaults** | Erase all configuration and reset |

### 10.5 Factory Reset

**Method 1 — Web GUI**:
1. Navigate to Maintenance > Backup and Restore
2. Click **Reset** under "Restore Factory Defaults"
3. Confirm the reset in the dialog
4. Wait for STATUS light to become static and login page reappears

**Method 2 — Hardware Button**:
1. Locate the reset button on the gateway
2. Press and hold for more than 5 seconds until STATUS LED blinks
3. Release and wait for reboot

### 10.6 Reboot

**Web GUI**: Maintenance > Reboot

Manual reboot or scheduled reboot via Maintenance > Schedule.

---

## 11. Step-by-Step Setup Procedures

These procedures are extracted from Chapter 4 (Application Examples) of the user guide. They represent the recommended workflow for our temperature monitoring use case.

### 11.1 Complete Setup: Gateway + Sensors + MQTT

This is the end-to-end procedure for setting up a UG65 to receive data from EM320-TH temperature sensors and forward it via MQTT.

#### Step 1: Connect Gateway to Network

**Option A — Ethernet (simplest)**:
1. Go to Network > Interface > Port
2. Set Connection Type to **DHCP** (or Static IP if needed)
3. Click Save & Apply
4. Connect Ethernet cable to router/modem
5. Verify at Maintenance > Tools > Ping (ping `www.google.com`)

**Option B — WiFi Client Mode**:
1. Go to Network > Interface > Port, set Connection Type to **Static IP**
2. Configure IP: `192.168.23.150`, Netmask: `255.255.255.0`, Gateway: `192.168.23.1`
3. Connect PC to UG65 Ethernet port (directly or via PoE injector)
4. Assign PC IP to same subnet (e.g., `192.168.23.200`)
5. Access web GUI at `192.168.23.150`
6. Go to **Network > Interface > WLAN**, click **Scan**
7. Select restaurant WiFi network, click **Join Network**
8. Enter WiFi password, set Encryption Mode
9. Under IP Setting, select **DHCP Client**
10. Click **Save** and **Apply**
11. Verify at **Status > WLAN** — should show "Connected"
12. Go to **Network > Failover > WAN Failover**, set wlan0 as Main Interface

#### Step 2: Configure Packet Forwarder

1. Go to **Packet Forwarder > General**
2. Verify the default Multi-Destination entry: ID 0, Enabled, Embedded NS, localhost, Connected
3. Note the **Gateway EUI** (needed if registering with external network servers)
4. Go to **Packet Forwarder > Radios**
5. Set **Region** to US915
6. Verify center frequencies: Radio 0 = 904.3 MHz, Radio 1 = 905.0 MHz
7. Verify all 8 Multi Channels are enabled with correct frequencies (903.9, 904.1, 904.3, 904.5, 904.7, 904.9, 905.1, 905.3)
8. Click Save & Apply

#### Step 3: Enable Network Server

1. Go to **Network Server > General**
2. Ensure **Enable** is checked
3. Ensure **Platform Mode** is unchecked (we are not using Milesight IoT Cloud)
4. Default settings are fine: NetID `010203`, Join Delay 5s, RX1 Delay 1s
5. Click Save & Apply

#### Step 4: Create Application

1. Go to **Network Server > Applications**
2. Click "+" to add a new application
3. Enter **Name**: e.g., "Levelset Sensors"
4. Enter **Description**: e.g., "Temperature monitoring"
5. Optionally enable **Metadata** checkboxes (devEUI, deviceName recommended)
6. Click **Save**

#### Step 5: Configure MQTT Integration

1. In the Applications list, click the **Edit** icon for your application
2. Under **Data Transmission**, click "+" to add integration
3. Set **Type**: MQTT
4. Set **Configuration Mode**: Manual Configuration
5. Fill in **General** settings:
   - Broker Address: Your MQTT broker IP (e.g., Tailscale IP `100.x.y.z`)
   - Broker Port: `1883` (or `8883` for TLS)
   - Client ID: `gateway-{locationId}`
   - Connection Timeout: `30`
   - Keep Alive Interval: `60`
   - Data Retransmission: Checked
6. Fill in **User Credentials** (if broker requires auth):
   - Enable: Checked
   - Username: Your MQTT username
   - Password: Your MQTT password
7. Configure **TLS** (if using encrypted connection):
   - Enable: Checked
   - Mode: Self signed certificates (for our infrastructure)
   - Upload CA File, Client Certificate File, Client Key File
   - SSL Secure: Checked
8. Configure **Topics**:
   - Uplink data: `/levelset/{orgId}/{locationId}/uplink` — QoS 1, Retain off
   - Downlink data: `/levelset/{orgId}/{locationId}/downlink` — QoS 1
   - Join notification: `/levelset/{orgId}/{locationId}/join` — QoS 0
   - ACK notification: `/levelset/{orgId}/{locationId}/ack` — QoS 0
   - Error notification: `/levelset/{orgId}/{locationId}/error` — QoS 0
9. Click **Save**

#### Step 6: Add End Devices (Sensors)

For each EM320-TH sensor:

1. Go to **Network Server > Device**
2. Click **Add**
3. Fill in:
   - **Device Name**: Sensor label (e.g., "Walk-In Cooler")
   - **Description**: Optional
   - **Device EUI**: 16-char hex from sensor label
   - **Device-Profile**: ClassA-OTAA
   - **Application**: Select "Levelset Sensors"
   - **Payload Codec**: Select EM320-TH model from dropdown
   - **fPort**: 85
   - **Application Key**: Default Value (uses `5572404C696E6B4C6F52613230313823`)
   - **Timeout**: 1440 min (24 hours)
4. Click **Save & Apply**
5. Repeat for all sensors

**Bulk alternative**: Click **Bulk Import**, download CSV template, fill in all sensor details, upload.

#### Step 7: Verify Sensor Data

1. Power on all sensors near the gateway
2. Wait 2-5 minutes for OTAA join
3. Go to **Network Server > Device** — all sensors should show "Activated" then "Online"
4. Go to **Network Server > Packets** — verify uplink packets arriving
5. Click **Details** on a packet to see decoded JSON:
   ```json
   {
     "battery": 99,
     "humidity": 30,
     "temperature": 23.4
   }
   ```
6. Verify MQTT messages arriving at your broker (use `mosquitto_sub` or MQTT Explorer)

### 11.2 Connecting to External Network Servers

If using an external network server instead of the built-in one:

#### For Semtech-based servers (TTN, etc.)

1. Go to **Packet Forwarder > General**
2. Click "+" under Multi-Destination
3. Set:
   - Enable: Checked
   - Type: Semtech
   - Server Address: e.g., `eu1.cloud.thethings.network`
   - Port Up: 1700
   - Port Down: 1700
4. Click **Save**
5. Configure the radio channels to match the network server's expected channels

#### For ChirpStack

Same process but select Type: ChirpStack and enter the ChirpStack server address.

### 11.3 Node-RED

**Web GUI**: App > Node-RED

1. Go to **App > Node-RED** to enable the feature
2. Click **Launch** to open the Node-RED web GUI
3. Log in with the same username and password as the gateway web GUI
4. Use Node-RED for custom data processing, filtering, or transformation before MQTT forwarding

---

## Quick Reference Card

### Most Common Navigation Paths

| Task | Web GUI Path |
|------|-------------|
| Change WiFi to Client mode | Network > Interface > WLAN |
| Check gateway internet connectivity | Maintenance > Tools > Ping |
| View/edit packet forwarder | Packet Forwarder > General |
| Configure radio channels | Packet Forwarder > Radios |
| Enable/disable network server | Network Server > General |
| Create application | Network Server > Applications |
| Configure MQTT forwarding | Network Server > Applications > [Edit] > Data Transmission |
| Add a sensor device | Network Server > Device > Add |
| Bulk import sensors | Network Server > Device > Bulk Import |
| View live packet data | Network Server > Packets |
| Configure payload decoder | Network Server > Payload Codec |
| Manage device profiles | Network Server > Profiles |
| Enable SSH access | System > General > Access Service |
| Change admin password | System > General > Account |
| Add users | System > User Management |
| Set system time | System > System Time |
| Upgrade firmware | Maintenance > Upgrade |
| Backup configuration | Maintenance > Backup and Restore |
| Factory reset | Maintenance > Backup and Restore > Reset |
| View system logs | Maintenance > Log |
| Reboot gateway | Maintenance > Reboot |
| Enable Node-RED | App > Node-RED |

### Default Values Cheat Sheet

| Item | Default Value |
|------|--------------|
| Web GUI URL (WiFi) | `https://192.168.1.1` |
| Web GUI URL (Ethernet) | `192.168.23.150` |
| Admin username | `admin` |
| Admin password | `password` |
| WiFi AP SSID | `Gateway_XXXXXX` |
| WiFi AP password | `iotpassword` |
| SSH port | 22 |
| HTTP port | 80 |
| HTTPS port | 443 |
| Telnet port | 23 |
| Network Server NetID | `010203` |
| Join Delay | 5 sec |
| RX1 Delay | 1 sec |
| Milesight default AppKey | `5572404C696E6B4C6F52613230313823` |
| Milesight default fPort | 85 |
| Device timeout | 1440 min (24 hrs) |
| MQTT Connection Timeout | 30 sec |
| MQTT Keep Alive | 60 sec |
| Packet Forwarder keep-alive | 10 sec |
| Stat interval | 30 sec |
| Login lockout | 5 failed attempts = 10 min lock |
| Password requirements | Letter + number, change required on first login |
| US915 Radio 0 frequency | 904.3 MHz |
| US915 Radio 1 frequency | 905.0 MHz |

### Packet Type Reference

| Abbreviation | Full Name | Direction |
|-------------|-----------|-----------|
| JnReq | Join Request | Device -> Gateway |
| JnAcc | Join Accept | Gateway -> Device |
| UpUnc | Uplink Unconfirmed | Device -> Gateway |
| UpCnf | Uplink Confirmed | Device -> Gateway |
| DnUnc | Downlink Unconfirmed | Gateway -> Device |
| DnCnf | Downlink Confirmed | Gateway -> Device |
| ACK | Acknowledgment | Device -> Gateway |
