# Firmware & Niagara Framework Reference

## Firmware Files

### EM320-TH Sensor Firmware

| Property | Value |
|----------|-------|
| Filename | `EM320-TH.0000.0100.0106.bin` |
| Version | 0000.0100.0106 |
| File size | 180 KB |
| Format | Password-protected ZIP archive |
| Contents | `EM320-TH.0000.0100.0106.bin` (189 KB binary) + `upgrade_plan.json` |
| Update method | NFC via ToolBox app (iOS/Android) |

**How to update**: Open the Milesight ToolBox app → connect to sensor via NFC → navigate to Device → Maintenance → select firmware file → apply. The sensor will reboot after update.

The firmware ZIP is password-protected (standard Milesight practice for OTA packages). The password is typically provided by Milesight support or through the partner portal. The `upgrade_plan.json` inside contains metadata about the update sequence and compatibility requirements.

### UG65 Gateway Firmware

| Property | Value |
|----------|-------|
| Filename | `ug65gateway_firmware.bin` |
| File size | 132 MB |
| Format | Encrypted binary archive |
| Contents | `router.tar` (full system image) + `upgrade_tool.tar.gz` |
| Update method | Web UI → System → Firmware Upgrade |
| Min version for BACnet | 60.0.0.46-r2 |

**How to update**: Access gateway web UI (default `http://192.168.23.150`) → System → Firmware Upgrade → upload `.bin` file → click Upgrade. The gateway will reboot (takes 3-5 minutes). Do NOT power off during update.

The firmware is encrypted/obfuscated (standard for embedded Linux gateway images). It contains the full router OS, LoRaWAN network server, MQTT client, Node-RED, and all system services.

### Firmware Management Strategy

For fleet deployment:
- **Keep firmware files in a secure internal location** (not in the git repo — they're 132+ MB binary blobs)
- **Track firmware versions per device** in the Supabase `sensor_gateways` table
- **OTA updates**: The UG65 supports remote firmware upgrade via its web UI. With Tailscale or direct network access, firmware can be pushed remotely
- **Version pinning**: Test new firmware on a single gateway before fleet-wide rollout
- **Minimum firmware**: Ensure all gateways run 60.0.0.46-r2 or later for full feature support

---

## Niagara Framework Integration

### What Is Niagara?

Niagara Framework (by Tridium) is a commercial Building Management System (BMS) platform. It's the dominant software for connecting building automation systems (HVAC, lighting, access control) in large commercial facilities.

### How Milesight Integrates

Milesight provides a free **BACnet driver** for Niagara:
- `milesightBacnet-rt.jar` (runtime module)
- `milesightBacnet-wb.jar` (workbench module)
- Current version: v1.0.0.9

The driver allows Niagara to discover UG65 gateways and their connected sensors via BACnet protocol. Sensor data points (temperature, humidity, battery) are exposed as BACnet objects that Niagara can monitor, alarm on, and log.

### Integration Architecture

```
EM320-TH sensors
    | (LoRaWAN)
    v
UG65 Gateway (BACnet stack enabled)
    | (BACnet + HTTP API)
    v
Niagara Driver (milesightBacnet JAR modules)
    | (BACnet objects)
    v
Niagara Supervisor / JACE Controller
    v
Central BMS Dashboard, Alarms, Scheduling
```

### Supported Devices

| Gateway | Minimum Firmware |
|---------|-----------------|
| UG65 | 60.0.0.46-r2 |
| UG67 | 60.0.0.46-r2 |
| UG56 | 56.0.0.46-r2 |

The EM320-TH is explicitly listed as a supported sensor in the integration documentation.

### Gateway BACnet Configuration

| Setting | Default/Example |
|---------|----------------|
| Device ID | 3000 (must be unique per gateway) |
| MAC Address format | `{IP}:0xBAC0` |
| Pool Services | Must be enabled (Network → IP Port) |
| API access | HTTP Basic Auth with admin credentials |

### Relevance to SensorCo Temperature Monitoring

**Not recommended for our use case.** Niagara Framework is:

- **Expensive**: Enterprise licensing costs per data point
- **Heavyweight**: Requires Niagara Supervisor or JACE hardware ($$$)
- **Desktop-dependent**: Management requires Windows Workbench application
- **Designed for building automation**: HVAC, lighting, access control — not standalone temperature monitoring

**However**, this integration is useful context because:

1. **Enterprise upsell path**: If a SensorCo customer already runs Niagara for their building, they could integrate our sensors into their existing BMS instead of (or alongside) the SensorCo dashboard
2. **Competitor awareness**: ComplianceMate and EcoLab may integrate with Niagara for large enterprise accounts. Knowing this capability exists is valuable for sales conversations
3. **Protocol flexibility**: The UG65's BACnet support confirms it's a full-featured gateway, not just a simple LoRaWAN forwarder

### When Niagara Matters

| Scenario | Use Niagara? |
|----------|-------------|
| Independent restaurant with 1 location | No — use SensorCo directly |
| Restaurant chain with 50 locations | No — use SensorCo directly |
| Restaurant inside a corporate campus with existing BMS | Maybe — offer as integration option |
| Large enterprise with Niagara managing 500+ buildings | Yes — position as BMS-integrated sensor add-on |

For 99% of SensorCo's target market (independent restaurants and small chains), Niagara is irrelevant. The direct HTTP POST or MQTT approach documented in `09-cloud-hosted-architecture.md` is the right path.
