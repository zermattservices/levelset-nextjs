# Levelset Temperature Monitoring — Product Documentation

This folder contains comprehensive documentation for adding IoT temperature sensor monitoring as a product alongside the Levelset app. The goal is to compete with ComplianceMate and EcoLab by offering a cheaper, simpler, better-integrated solution for restaurant temperature compliance.

## Documents

| Document | Purpose |
|----------|---------|
| [01-product-overview.md](./01-product-overview.md) | Vision, competitive landscape, target market, pricing model |
| [02-hardware.md](./02-hardware.md) | Sensor and gateway specs, costs, provisioning details |
| [03-architecture.md](./03-architecture.md) | Full technical stack: LoRaWAN → MQTT → InfluxDB → Dashboard |
| [04-provisioning-and-setup.md](./04-provisioning-and-setup.md) | Pre-shipping config, Tailscale, customer 5-minute setup flow |
| [05-integration-options.md](./05-integration-options.md) | Built into Levelset vs standalone — both approaches documented |
| [06-ug65-gateway-reference.md](./06-ug65-gateway-reference.md) | Complete UG65 gateway configuration reference — every setting, default, and step-by-step procedure |
| [07-em320-th-sensor-reference.md](./07-em320-th-sensor-reference.md) | Complete EM320-TH sensor reference — payload formats, downlink commands, calibration, thresholds |
| [08-infrastructure-and-scaling.md](./08-infrastructure-and-scaling.md) | Hosting architecture for 1,000+ locations — server sizing, Tailscale at scale, costs, HA |
| [09-cloud-hosted-architecture.md](./09-cloud-hosted-architecture.md) | Cloud-only options that eliminate self-managed infrastructure — Gateway HTTP POST, MQTT to cloud, Milesight Development Platform |
| [10-firmware-and-niagara-reference.md](./10-firmware-and-niagara-reference.md) | Firmware file analysis, update procedures, and Niagara Framework BMS integration reference |

## Key Contacts

- **Hardware supplier**: Milesight (IoT division) — [milesight.com/iot](https://www.milesight.com/iot)
- **Infrastructure advisor**: Mac (mjshiggins) — built the Tailscale-on-gateway setup, runs similar deployment
- **Partner program**: [milesight.com/partner/ecosystem](https://www.milesight.com/partner/ecosystem)

## Status

**Phase**: Research & Documentation (pre-implementation)
**Last updated**: 2026-02-27
