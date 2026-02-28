# SensorCo Business Structure Design

## Decision

Structure the temperature monitoring product as a separate company called **SensorCo** (placeholder name), rather than building it as a Levelset product module.

## Business Structure

- **Entity**: SensorCo LLC (or similar)
- **Managing Member**: Zermatt Business Services (Andrew Dyar's holding company)
- **Potential Co-Founder**: Mac Higgins (mjshiggins) — brings IoT/hardware expertise, Tailscale provisioning scripts, and Milesight supplier relationship
- **Relationship to Levelset**: Levelset is SensorCo's first customer, not SensorCo's parent. SensorCo operates independently.

## Why Separate

Three options were considered:

### Option A: Separate Company (Selected)

SensorCo as independent LLC with its own infrastructure.

**Pros**: Can sell to anyone, not just Levelset customers. Clean equity structure for co-founders. Own valuation trajectory. No dependency on Levelset's codebase or database. Partners integrate via API.

**Cons**: More initial setup (separate Supabase, Vercel, domain). Slightly more complex for Levelset to integrate (API calls vs direct DB queries).

### Option B: Levelset Product Module (Rejected)

Build directly into Levelset's Next.js dashboard and Supabase.

**Pros**: Faster initial build. Shared auth and permissions. Single codebase.

**Cons**: Can only sell to Levelset customers. Hard to give equity to Mac without giving Levelset equity. Can't sell SensorCo independently. Locks hardware product to a SaaS company's valuation.

### Option C: Division of Zermatt (Rejected)

Run as a product line under Zermatt Business Services, no separate LLC.

**Pros**: No entity setup cost. Simplest structure.

**Cons**: Co-mingled liability. Harder to bring in co-founders. Less credible to partners and customers. Can't raise separate funding.

## Architecture Implications

The separate company decision drives these architectural choices:

| Decision | Implication |
|----------|-------------|
| **Own Supabase** | SensorCo has its own Supabase project ($25/mo). Sensor data lives here, not in Levelset's database. |
| **Own API** | SensorCo exposes a REST API at `api.sensorco.com`. Partners like Levelset call this API. |
| **Own codebase** | SensorCo's dashboard and API are a separate project, not part of the Levelset monorepo. |
| **Partner model** | Levelset builds thin proxy routes and a temperature page that call SensorCo's API. |
| **Customer ID** | SensorCo tables use `customer_id` (referencing SensorCo's `customers` table), not Levelset's `org_id`. |

## Revenue Model

### Direct Sales
- **Hardware**: $75/sensor upfront (COGS ~$37, ~51% margin)
- **SaaS**: $60/month per location (15 sensors)
- **Target**: Independent restaurants, small chains

### Partner Channel (e.g., Levelset)
Three options to negotiate per partner:
1. Partner buys at wholesale, resells at retail (partner keeps margin)
2. SensorCo bills end customers directly, pays partner a referral fee
3. Partner pays SensorCo a flat per-location fee, handles own billing

## Infrastructure Costs

| Scale | Monthly Cost | Revenue |
|-------|-------------|---------|
| 10 locations | ~$45 (Vercel $20 + Supabase $25) | $600 |
| 100 locations | ~$105-155 | $6,000 |
| 1,000 locations | ~$620-1,020 | $60,000 |

SaaS gross margin: ~98% at scale.

## What Changed in the Docs

All 11 temperature monitoring docs in `docs/plans/temperature-monitoring/` were revised:

| Doc | Changes |
|-----|---------|
| README | Rewritten as SensorCo product docs. Added business structure section. |
| 01 (Product Overview) | Vision changed from Levelset module to separate company. Added partner channel pricing. |
| 03 (Architecture) | All data flows reference SensorCo API and SensorCo Supabase. Added Partner API layer. |
| 04 (Provisioning) | All references updated: SensorCo API, SensorCo dashboard, customer_id. |
| 05 (Integration) | Complete rewrite. Now describes SensorCo platform + partner API + Levelset integration. |
| 06 (Gateway Reference) | Application names and MQTT topics updated to SensorCo. |
| 07 (Sensor Reference) | No changes needed (pure hardware spec). |
| 08 (Infrastructure) | Dashboard and backend references updated to SensorCo. |
| 09 (Cloud Architecture) | SensorCo's own infrastructure costs. Added "Build inside Levelset" as rejected option. |
| 10 (Firmware/Niagara) | Levelset references updated to SensorCo where appropriate. |
| 11 (Gateway API) | API references, backend references, and use case descriptions updated to SensorCo. |

## Next Steps

1. **Choose a real name** for SensorCo
2. **Form the LLC** under Zermatt Business Services
3. **Discuss co-founder terms** with Mac
4. **Set up SensorCo infrastructure**: Supabase project, Vercel project, domain
5. **Build the SensorCo API** (ingest endpoint, device registry, alert engine)
6. **Build the SensorCo dashboard** (sensor status, charts, alert config)
7. **Build the Levelset integration** (API proxy routes, temperature page, permissions)
