
## Description

Build automated pipelines to fetch GPU/accelerator specs and cloud instance pricing from AWS, Azure, GCP, and 10+ specialty providers. Support currency conversion, spot price tracking with volatility bands, and new hardware release detection.

## Requirements

### Requirement 1: AWS Price Ingestion
**User Story:** As a developer, I want automated AWS EC2 GPU instance pricing so users always see current on-demand and spot rates.

**Acceptance Criteria:**
- Fetches on-demand prices from AWS Price List Bulk API: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/{region}/index.json`
- Filters to GPU instance families: p4d, p4de, p5, p5e, p5en, p6*, g5, g6, g6e, trn1, trn2, inf2, dl1, dl2q
- Fetches spot prices via `EC2.DescribeSpotPriceHistory` (boto3 or AWS SDK JS) for trailing 30 days
- Computes spot p10/p50/p90 from history
- Fetches instance specs via `EC2.DescribeInstanceTypes` — GPU model, count, GPU memory, network bandwidth, vCPUs, RAM
- Covers regions: us-east-1, us-west-2, eu-west-1, ap-south-1 (Mumbai), ap-northeast-1
- Outputs structured JSON matching `CloudInstance` schema

### Requirement 2: Azure Price Ingestion
**User Story:** As a developer, I want automated Azure VM pricing for GPU SKUs.

**Acceptance Criteria:**
- Queries `https://prices.azure.com/api/retail/prices` (anonymous, no auth)
- OData filter: `serviceName eq 'Virtual Machines' and contains(productName, 'GPU_KEYWORD') and priceType eq 'Consumption'`
- GPU keywords: `H100`, `H200`, `A100`, `A10`, `GB200`, `MI300X`, `T4`, `L4`, `L40S`
- Handles pagination via `NextPageLink`
- Fetches spot prices: filter `endswith(skuName, 'Spot')`
- Fetches reserved 1yr and 3yr: `priceType eq 'Reservation'`
- Maps `armSkuName` to GPU specs from hardware database
- Covers regions: eastus, westus2, westeurope, centralindia

### Requirement 3: GCP Price Ingestion
**User Story:** As a developer, I want automated GCP pricing for GPU instances and TPUs.

**Acceptance Criteria:**
- Queries Cloud Billing Catalog API: `GET cloudbilling.googleapis.com/v1/services/6F81-5844-456A/skus` (Compute Engine service)
- Filters GPU SKUs: A3, A3-Mega, A3-Ultra, A3-High, A4, A2, G2, TPU v5e/v5p/v6e/v7
- Extracts pricing from `pricingInfo[].pricingExpression.tieredRates`
- Handles preemptible via `UsageType: Preemptible` in description
- Covers regions: us-central1, us-east1, europe-west4, asia-south1

### Requirement 4: Specialty Provider Ingestion
**User Story:** As a developer, I want pricing from Lambda, RunPod, Vast.ai, CoreWeave, and others.

**Acceptance Criteria:**
- **Lambda Labs**: REST `cloud.lambdalabs.com/api/v1/instance-types` with API key
- **RunPod**: GraphQL `api.runpod.io/graphql` — query `gpuTypes { id, displayName, memoryInGb, securePrice, communityPrice }`
- **Vast.ai**: REST `vast.ai/api/v0/bundles/` — aggregates marketplace offers, computes p25/median/p75 per GPU type
- **CoreWeave**: scrape pricing page (Playwright headless) — structured extraction
- **Crusoe**: REST `api.crusoecloud.com/v1alpha5/` with API key
- **Modal**: scrape `modal.com/pricing` table
- **Together AI**: API `api.together.xyz/v1/models` — extract per-token pricing
- **Fireworks AI**: scrape `fireworks.ai/pricing`
- **Replicate**: REST `api.replicate.com/v1/hardware`
- **TensorDock**: REST `marketplace.tensordock.com/api/v0/client/deploy/hostnodes`
- **Hyperstack**: REST `infrahub-api.nexgencloud.com/v1/core/flavors`
- For providers without API: Playwright scraper with structured selectors, diff-on-change PR

### Requirement 5: Currency Conversion
**User Story:** As a user, I want to see prices in my local currency (INR, EUR, GBP, JPY, etc.).

**Acceptance Criteria:**
- Fetches daily exchange rates from `api.frankfurter.app/latest?from=USD`
- Supports: USD, EUR, GBP, JPY, INR, CNY, KRW, CAD, AUD, SGD, BRL, CHF, SEK
- Caches rates in `public/data/exchange-rates.json` with `fetchedAt` timestamp
- Frontend shows both original currency and user-selected currency
- User preference persisted in localStorage
- Rate source and date shown in tooltip

### Requirement 6: Hardware Spec Database
**User Story:** As a developer, I want a comprehensive GPU spec database covering NVIDIA, AMD, Apple, Intel, Google TPU, and emerging vendors.

**Acceptance Criteria:**
- Database covers all GPUs listed in base spec hardware tables PLUS:
  - NVIDIA: B300 (288GB HBM3e, 8TB/s, FP4 15 PFLOPS), GB200 NVL72, GB300 NVL72
  - AMD: MI355X (288GB, 8TB/s), MI400 (roadmap placeholder)
  - Apple: M5 Pro/Max/Ultra (when released, placeholder)
  - Intel: Falcon Shores (roadmap placeholder)
  - Google: TPU v7 Ironwood (192GB, 7.4TB/s, 4614 INT8 TOPS)
  - Emerging: Groq LPU, Cerebras CS-3, SambaNova SN40L, Tenstorrent Blackhole, Huawei Ascend 910C
- Each entry has: id, vendor, name, category, memoryGB, memoryBandwidthGBs, flops (fp32/fp16/fp8/fp4/int8), tdpWatts, pcieGen, nvlink, formFactor, msrpUSD, streetUSD, releaseYear, cudaCapability, notes
- New hardware release detection: poll NVIDIA/AMD/Apple newsroom RSS weekly

### Requirement 7: Spot Volatility Tracking
**User Story:** As a user, I want to see spot price ranges (not just a single number) so I can assess risk.

**Acceptance Criteria:**
- Stores trailing 30-day spot history per instance type per region
- Displays as: p10 (best) / p50 (typical) / p90 (worst) $/hr
- Shows AWS interruption frequency bucket: `<5%`, `5-10%`, `10-15%`, `15-20%`, `>20%`
- Visual: small sparkline of last 7 days in cloud table row (optional, v2)
- Tooltip: "Spot prices fluctuate. This instance has been interrupted <5% of the time in the past month."

## Tasks

- [ ] 1. Create `src/types/cloud.ts` with `CloudInstance` + `GPUSpec` TypeScript interfaces + Zod schemas
- [ ] 2. Create `scripts/lib/aws-pricer.ts` — fetches on-demand from Bulk API, spot from DescribeSpotPriceHistory, specs from DescribeInstanceTypes
- [ ] 3. Create `scripts/lib/azure-pricer.ts` — fetches Consumption + Spot + Reservation prices via Retail Prices API with OData filters
- [ ] 4. Create `scripts/lib/gcp-pricer.ts` — fetches from Cloud Billing Catalog, parses tiered rates, maps SKUs to GPU types
- [ ] 5. Create `scripts/lib/specialty-pricers.ts` — individual fetchers for Lambda, RunPod (GraphQL), Vast.ai, Crusoe, Replicate, TensorDock, Hyperstack
- [ ] 6. Create `scripts/lib/scrape-pricers.ts` — Playwright scrapers for CoreWeave, Modal, Fireworks, Together (pricing pages)
- [ ] 7. Create `scripts/lib/currency.ts` — fetches Frankfurter API, caches rates, provides `convertUSD(amount, targetCurrency)` utility
- [ ] 8. Create `scripts/refresh-cloud-prices.ts` — orchestrator: runs all pricers, merges, validates, writes `public/data/cloud.json` + `exchange-rates.json`
- [ ] 9. Create `scripts/refresh-hardware.ts` — updates `public/data/gpus.json` from hardware YAML + newsroom RSS checks
- [ ] 10. Create `data/hardware.yml` — comprehensive GPU spec database with all vendors, verified against datasheets
- [ ] 11. Create `.github/workflows/refresh-prices.yml` — daily cron, commits if diff, includes spot history aggregation
- [ ] 12. Create `src/components/calculator/CurrencyPicker.tsx` — dropdown for currency selection, persists preference
- [ ] 13. Create `src/lib/currency.ts` — client-side conversion utility using cached exchange rates
- [ ] 14. Write tests for each pricer with mocked API responses
- [ ] 15. Add `public/data/meta.json` with `{ modelsVersion, gpusVersion, cloudVersion, exchangeRatesVersion, builtAt }` — UI shows "Prices updated X hours ago"



## Tasks

- [x] 1. Create `src/types/cloud.ts` with `CloudInstance` + `GPUSpec` TypeScript interfaces + Zod schemas
- [x] 2. Create `scripts/lib/aws-pricer.ts` — fetches on-demand from Bulk API, spot from DescribeSpotPriceHistory, specs from DescribeInstanceTypes
- [x] 3. Create `scripts/lib/azure-pricer.ts` — fetches Consumption + Spot + Reservation prices via Retail Prices API with OData filters
- [x] 4. Create `scripts/lib/gcp-pricer.ts` — fetches from Cloud Billing Catalog, parses tiered rates, maps SKUs to GPU types
- [x] 5. Create `scripts/lib/specialty-pricers.ts` — individual fetchers for Lambda, RunPod (GraphQL), Vast.ai, Crusoe, Replicate, TensorDock, Hyperstack
- [x] 6. Create `scripts/lib/currency.ts` — fetches Frankfurter API, caches rates, provides `convertUSD(amount, targetCurrency)` utility
- [x] 7. Create `scripts/refresh-cloud-prices.ts` — orchestrator: runs all pricers, merges, validates, writes `public/data/cloud.json` + `exchange-rates.json`
- [x] 8. Create `scripts/refresh-hardware.ts` — updates `public/data/gpus.json` from hardware YAML + newsroom RSS checks
- [x] 9. Create `data/hardware.yml` — comprehensive GPU spec database with all vendors, verified against datasheets
- [x] 10. Create `data/cloud-overrides.yml` — curated cloud pricing for all providers
- [x] 11. Create `.github/workflows/refresh-prices.yml` — daily cron, commits if diff, includes spot history aggregation
- [x] 12. Create `src/components/calculator/CurrencyPicker.tsx` — dropdown for currency selection, persists preference
- [x] 13. Create `src/lib/currency.ts` — client-side conversion utility using cached exchange rates
- [x] 14. Write tests for each pricer with mocked API responses
- [x] 15. Add `public/data/meta.json` with `{ modelsVersion, gpusVersion, cloudVersion, exchangeRatesVersion, builtAt }`
