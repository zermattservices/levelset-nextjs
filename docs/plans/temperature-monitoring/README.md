# SensorCo — Temperature Monitoring Product Documentation

This folder contains comprehensive documentation for SensorCo's IoT temperature sensor monitoring platform. SensorCo is a separate company (owned by Zermatt Business Services) that builds and sells sensor monitoring as a service. Levelset is SensorCo's first customer.

The goal is to compete with ComplianceMate and EcoLab by offering a cheaper, simpler, better-integrated solution for restaurant temperature compliance — and to expand into broader industrial sensor monitoring over time.

## Business Structure

- **SensorCo**: Separate LLC, Zermatt Business Services as managing member
- **Product**: Sensor monitoring platform (hardware + API + dashboard)
- **First customer**: Levelset (Chick-fil-A operators)
- **Revenue model**: SensorCo sells hardware + SaaS subscriptions to customers directly, or through partners like Levelset

## Architecture Decision

**Data**: Gateway HTTP POSTs decoded JSON → SensorCo API → SensorCo Supabase Postgres. No MQTT broker, no InfluxDB, no self-hosted servers.

**Management**: Tailscale on every gateway for remote SSH/API access. All sensor config changes happen remotely via downlink commands — zero on-site technical work.

**Customer Setup**: Plug in gateway → open SensorCo app (or partner app) → connect WiFi → done. Native mobile app flow.

**Integration**: Partners like Levelset consume SensorCo's API to embed sensor data into their own dashboards and mobile apps.

## Documents

| Document | Purpose |
|----------|---------|
| [01-product-overview.md](./01-product-overview.md) | Vision, competitive landscape, target market, pricing model |
| [02-hardware.md](./02-hardware.md) | Sensor and gateway specs, costs, provisioning details |
| [03-architecture.md](./03-architecture.md) | Finalized technical stack: Gateway HTTP POST → SensorCo API → Supabase, Tailscale for management |
| [04-provisioning-and-setup.md](./04-provisioning-and-setup.md) | Pre-shipping config, customer 5-minute WiFi setup, remote sensor management |
| [05-integration-options.md](./05-integration-options.md) | SensorCo platform architecture, partner API, and Levelset integration approach |
| [06-ug65-gateway-reference.md](./06-ug65-gateway-reference.md) | Complete UG65 gateway configuration reference — every setting, default, and step-by-step procedure |
| [07-em320-th-sensor-reference.md](./07-em320-th-sensor-reference.md) | Complete EM320-TH sensor reference — payload formats, downlink commands, calibration, thresholds |
| [08-infrastructure-and-scaling.md](./08-infrastructure-and-scaling.md) | Self-hosted architecture reference (Hetzner + Mosquitto + InfluxDB) — kept for comparison, not the chosen path |
| [09-cloud-hosted-architecture.md](./09-cloud-hosted-architecture.md) | Finalized cloud architecture — costs, data volume analysis, API route pseudocode, scaling path |
| [10-firmware-and-niagara-reference.md](./10-firmware-and-niagara-reference.md) | Firmware file analysis, update procedures, and Niagara Framework BMS integration reference |
| [11-gateway-api-reference.md](./11-gateway-api-reference.md) | UG65 REST API — authentication, device management, downlink commands, WiFi setup approach |

## Key Contacts

- **Hardware supplier**: Milesight (IoT division) — [milesight.com/iot](https://www.milesight.com/iot)
- **Infrastructure advisor**: Mac (mjshiggins) — built the Tailscale-on-gateway setup, runs similar deployment. Potential co-founder.
- **Partner program**: [milesight.com/partner/ecosystem](https://www.milesight.com/partner/ecosystem)

## Status

**Phase**: Research & Documentation (pre-implementation)
**Last updated**: 2026-02-27
