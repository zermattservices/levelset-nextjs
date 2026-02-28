# Product Overview — SensorCo Temperature Monitoring

## Vision

SensorCo is a separate company (Zermatt Business Services as managing member) that builds and sells IoT sensor monitoring as a service. The first product is automated temperature monitoring for restaurants — continuous logging for food safety compliance (health department, HACCP, corporate brand standards).

The current market leaders — ComplianceMate and EcoLab — are expensive, require long contracts, and use proprietary hardware. SensorCo can undercut them on price by 35-40% while offering a simpler setup experience. SensorCo sells directly to restaurants and through partners like Levelset who integrate SensorCo's platform into their own products.

**Long-term vision**: Expand beyond temperature to all industrial IoT sensors (humidity, air quality, water quality, energy monitoring, etc.). The Milesight sensor ecosystem covers dozens of sensor types at compelling price points vs the incumbent market.

## Business Structure

- **SensorCo**: Separate LLC (name TBD, "SensorCo" is placeholder)
- **Ownership**: Zermatt Business Services as managing member. Potential co-founders: Mac (mjshiggins) and possibly a third partner.
- **Relationship to Levelset**: Levelset is SensorCo's first customer. Levelset pays SensorCo for sensor monitoring services for its Chick-fil-A restaurant clients.
- **Independence**: SensorCo has its own infrastructure, codebase, API, and customer relationships. It is not a Levelset product module.

## Target Market

- **First customer**: Levelset (Chick-fil-A operators — existing Levelset relationship)
- **Direct sales**: Any restaurant needing temperature compliance monitoring
- **Partner channel**: SaaS platforms serving restaurants (like Levelset) that want to offer sensor monitoring as part of their product
- **Sweet spot**: Multi-unit operators who need per-location monitoring without enterprise pricing

## Competitive Landscape

### ComplianceMate (now "Ladle")

| Tier | Monthly | Annual | Includes |
|------|---------|--------|----------|
| Lite | $69/mo | $699/yr | Digital checklists, data management, quality control, food traceability |
| Plus | $99/mo (24-mo contract) | $999/yr | Gateway + 2 LoRaWAN sensors, 24/7 monitoring, everything in Lite |
| Pro | $159/mo (24-mo contract) | $1,599/yr | Expanded features, 2 sensors, everything in Plus |

**Key weaknesses**: Only 2 sensors included in base hardware (restaurants need 4-15+). Additional sensors are extra cost. Requires 24-month contracts on Plus/Pro tiers.

### EcoLab

- Custom-quoted, enterprise-focused, bundled with chemical/pest/dishwashing contracts
- Generally the most expensive option
- Difficult contracts to exit
- Targets large chains, not independents

### Other Competitors

| Company | Starting Price | Notes |
|---------|---------------|-------|
| Zenput (Crunchtime) | From $40/mo | Operations platform with temp monitoring add-on |
| SmartSense by Digi | Custom quote | All-inclusive (hardware + software + calibration) |
| SafetyCulture (iAuditor) | Free tier | Broader safety platform, basic temp monitoring |
| Sonicu | Custom quote | Strong in healthcare crossover |
| MOCREO | Budget-friendly | Consumer/SMB-grade, not enterprise |

### Market Pain Points (SensorCo's Opportunities)

1. **Overnight blind spots**: Equipment failures happen overnight with no staff present. A compressor dying at midnight destroys an entire walk-in by morning
2. **Manual logging is unreliable**: 30-40% of restaurants produce incomplete/unreliable manual temp logs. Staff spend 30-60 min/day on manual checks
3. **Existing solutions are expensive**: Hardware + monthly subscriptions, especially for 4-15 sensors per location
4. **Vendor lock-in**: Proprietary sensors tie you to one vendor's ecosystem
5. **Base packages are inadequate**: Most include only 2 sensors — a typical restaurant needs 4-8+ (walk-in cooler, walk-in freezer, reach-in fridges, prep line, hot holding)
6. **Alert fatigue**: Too many false alarms (door briefly opened) cause staff to ignore real alerts

## Pricing Model (Proposed)

### SensorCo Direct Sales (Per Restaurant)

| Line Item | Amount | Frequency |
|-----------|--------|-----------|
| Sensors (15 per location) | $75/sensor = **$1,125** | One-time upfront |
| Dashboard/monitoring subscription | **$60/month ($720/year)** | Recurring |

### Partner Channel (e.g., Levelset)

SensorCo can offer partners like Levelset:
- **Wholesale pricing** on hardware (at or near cost)
- **Revenue share** or **wholesale SaaS rate** on the monthly subscription
- Partner integrates via SensorCo's API and may mark up to their end customers

The exact partner pricing model is TBD. Options include:
1. Levelset buys at wholesale and resells at retail (margin for Levelset)
2. SensorCo bills end customers directly, pays Levelset a referral fee
3. Levelset pays SensorCo a flat per-location fee, handles its own customer billing

### Hardware COGS Per Restaurant

Using EM320-TH sensors at $37/unit (pre-volume discount):

| Item | Unit Cost | Qty | Total |
|------|-----------|-----|-------|
| EM320-TH-915M sensors | $37.00 | 15 | $555.00 |
| UG65-915M-EA gateway | $234.00 | 1 | $234.00 |
| Shipping (proportional) | ~$56.00 | — | ~$56.00 |
| **Total COGS** | | | **~$845** |

> Note: These are pre-volume/partner pricing. The Milesight Partner Ecosystem program offers volume discounts. Apply at [milesight.com/partner/ecosystem](https://www.milesight.com/partner/ecosystem).

### Margin Analysis (Direct Sales)

| Period | Revenue | COGS | Gross Profit | Margin |
|--------|---------|------|-------------|--------|
| Year 1 | $1,845 | ~$845-920 | ~$925-1,000 | ~50-54% |
| Year 2+ | $720/yr | ~$0 | ~$720/yr | ~100%* |

*Before software hosting/support costs. SensorCo will have its own infrastructure costs (see [09-cloud-hosted-architecture.md](./09-cloud-hosted-architecture.md)).

### Price Comparison vs ComplianceMate

| Period | ComplianceMate | SensorCo | Savings | % Cheaper |
|--------|---------------|----------|---------|-----------
| Year 1 | $2,850 | $1,845 | $1,005 | 35% cheaper |
| Year 2 | $1,275 | $720 | $555 | 44% cheaper |
| 2-Year Total | $4,125 | $2,565 | $1,560 | 38% cheaper |
| 3-Year Total | $5,400 | $3,285 | $2,115 | 39% cheaper |

**Pricing notes**:
- Gateway cost is bundled into the per-sensor upfront fee (not charged separately). Could alternatively be positioned as a one-time "installation fee" or absorbed as customer acquisition cost since recurring revenue pays it back quickly
- 15 sensors per restaurant is the standard package. Adjust per customer based on equipment count
- ComplianceMate comparison assumes their Plus tier ($99/mo) + additional sensors beyond their included 2

## Market Size Context

- Food temperature monitoring market: ~$2.5B (2023), growing at 7.3% CAGR toward ~$4.8B by 2032
- "Integrated hardware + cloud SaaS" segment holds ~45% market share
- Modern wireless IoT systems deploy in 2-3 hours per location with no construction or wiring
- **Beyond temperature**: The broader industrial IoT sensor market is significantly larger. SensorCo's platform architecture (gateway + API + dashboard) is sensor-agnostic — the same infrastructure supports any Milesight sensor type.
