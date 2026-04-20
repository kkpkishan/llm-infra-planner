# Contributing to LLMcalc

## Adding New Models

### Quick Start

1. **Add to allowlist** — edit `data/models.yml`:
   ```yaml
   models:
     - meta-llama/Llama-3.1-8B
     - your-org/your-new-model   # ← add here
   ```

2. **Run ingestion**:
   ```bash
   npx tsx scripts/ingest-models.ts
   ```

3. **Validate**:
   ```bash
   npm run validate
   npm test
   ```

4. **Commit**:
   ```bash
   git add src/data/models.json data/.model-cache.json
   git commit -m "data: add your-new-model"
   ```

### With HuggingFace Token (for gated models)

```bash
export HF_TOKEN=hf_your_token_here
npx tsx scripts/ingest-models.ts
```

### Manual Overrides

If the model has fields not in `config.json` (MoE active params, MLA compressed dim), add to `data/models-override.yml`:

```yaml
overrides:
  "your-org/your-new-model":
    paramsActive: 37000000000
    mlaCompressedDim: 512
    notes: "MoE with MLA attention"
```

### What the Script Does

1. Fetches `config.json` from HuggingFace Hub
2. Parses architecture fields (layers, hidden size, attention heads, etc.)
3. Detects architecture type (dense / MoE / MLA / VLM / SSM / hybrid)
4. Extracts parameter count from safetensors metadata
5. Validates all fields against schema
6. Merges with existing `src/data/models.json`
7. Writes cache to `data/.model-cache.json` for incremental updates

### Troubleshooting

**"No config.json" error:**
- Model is gated → set `HF_TOKEN` env var
- Model doesn't exist → check the HuggingFace URL
- Model has non-standard config → add manual override

**"Validation failed" error:**
- Check the error message for missing fields
- Add manual override in `data/models-override.yml`
- Or fix the model's `config.json` on HuggingFace

---

## Adding New GPUs

### Quick Start

1. **Add to hardware YAML** — edit `data/hardware.yml`:
   ```yaml
   gpus:
     # ... existing entries ...
     
     - id: nvidia-h100-nvl
       vendor: nvidia
       name: H100 NVL 94GB
       category: datacenter
       memoryGB: 94
       memoryBandwidthGBs: 3900
       flops:
         fp32: 60
         fp16: 900
         fp8: 1800
         int8: 1800
       tdpWatts: 400
       formFactor: pcie
       releaseYear: 2023
       notes: "PCIe variant with 94GB HBM3"
   ```

2. **Run refresh**:
   ```bash
   npx tsx scripts/refresh-hardware.ts
   ```

3. **Validate**:
   ```bash
   npm run validate
   npm test
   ```

4. **Commit**:
   ```bash
   git add src/data/gpus.json data/hardware.yml
   git commit -m "data: add H100 NVL 94GB"
   ```

### Required Fields

- `id` — unique identifier (kebab-case)
- `vendor` — `nvidia` | `amd` | `apple` | `intel` | `google-tpu`
- `name` — display name
- `category` — `consumer` | `workstation` | `datacenter` | `apple-silicon` | `tpu`
- `memoryGB` — VRAM in GB (1-1024)
- `memoryBandwidthGBs` — HBM bandwidth in GB/s
- `flops` — object with `fp32`, `fp16`, `int8` (TFLOPS or TOPS)
- `tdpWatts` — thermal design power (1-5000)
- `formFactor` — `pcie` | `sxm` | `oam` | `integrated` | `mxm`
- `releaseYear` — 2000-2035

### Optional Fields

- `nvlink` — `{ perGPU_GBs: number }` for NVLink bandwidth
- `msrpUSD` — manufacturer suggested retail price
- `streetUSD` — actual market price
- `notes` — any additional info

---

## Adding Cloud Instances

### Quick Start

1. **Add to cloud overrides** — edit `data/cloud-overrides.yml`:
   ```yaml
   instances:
     # ... existing entries ...
     
     - id: aws-p6.48xlarge
       provider: aws
       instanceType: p6.48xlarge
       gpus:
         - id: nvidia-b200-sxm
           count: 8
       vcpus: 192
       ramGB: 2048
       storageGB: 8000
       networkGbps: 3200
       interconnect: nvswitch
       pricing:
         onDemandUSDPerHour: 150.00
         spotUSDPerHour: 45.00
       regions:
         - us-east-1
         - us-west-2
       lastPriceUpdate: "2026-04-20"
   ```

2. **Run refresh**:
   ```bash
   npx tsx scripts/refresh-cloud-prices.ts
   ```

3. **Validate**:
   ```bash
   npm run validate
   npm test
   ```

4. **Commit**:
   ```bash
   git add src/data/cloud.json data/cloud-overrides.yml
   git commit -m "data: add AWS p6.48xlarge (B200)"
   ```

---

## Automated Daily Updates

The GitHub Actions workflows run automatically:

- **Models**: Daily at 3:17 UTC (`.github/workflows/ingest-models.yml`)
- **Prices**: Daily at 4:00 UTC (`.github/workflows/refresh-prices.yml`)

Both create auto-PRs when data changes. Review and merge the PRs to update the live site.

### Manual Trigger

Go to GitHub Actions → select workflow → "Run workflow" → choose options.

---

## Testing Your Changes

### 1. Validate data schema

```bash
npm run validate
```

This checks:
- All required fields present
- Sanity ranges (VRAM 1-1024 GB, params 1M-2T, etc.)
- Type correctness

### 2. Run unit tests

```bash
npm test
```

All 244 tests must pass.

### 3. Build the app

```bash
npm run build
```

Must complete with 0 TypeScript errors.

### 4. Test locally

```bash
npm run dev
```

Open http://localhost:5173 and verify:
- New model appears in the model picker
- New GPU appears in GPU recommendations
- New cloud instance appears in the cloud table
- All calculations work correctly

### 5. Test in Docker

```bash
docker compose up --build
```

Open http://localhost:3000 and verify the production build works.

---

## Data File Locations

| File | Purpose | Updated by |
|---|---|---|
| `src/data/models.json` | Model database (bundled with app) | `ingest-models.ts` |
| `src/data/gpus.json` | GPU database (bundled with app) | `refresh-hardware.ts` |
| `src/data/cloud.json` | Cloud pricing (bundled with app) | `refresh-cloud-prices.ts` |
| `src/data/exchange-rates.json` | Currency rates (bundled with app) | `refresh-cloud-prices.ts` |
| `src/data/meta.json` | Data versions and timestamps | All scripts |
| `data/models.yml` | Model allowlist (source of truth) | Manual |
| `data/models-override.yml` | Manual model overrides | Manual |
| `data/hardware.yml` | GPU specs (source of truth) | Manual |
| `data/cloud-overrides.yml` | Cloud pricing (source of truth) | Manual |
| `data/.model-cache.json` | Incremental update cache | `ingest-models.ts` |

---

## Common Issues

### "No config.json" for gated models

**Solution**: Set `HF_TOKEN` environment variable:
```bash
export HF_TOKEN=hf_your_token_here
npx tsx scripts/ingest-models.ts
```

### "Validation failed" errors

**Solution**: Check the error message and add manual override:
```yaml
# data/models-override.yml
overrides:
  "problematic-model":
    paramsActive: 12900000000
    notes: "Manual override for MoE active params"
```

### Script hangs or times out

**Solution**: The HuggingFace API may be slow. The script has a 45-minute timeout in CI. For local runs, be patient or reduce the allowlist temporarily.

### Exchange rates fetch fails

**Solution**: The script uses fallback rates from `src/data/exchange-rates.json`. If Frankfurter API is down, the bundled rates are used.

---

## Full Refresh (ignore cache)

```bash
FULL_REFRESH=true npx tsx scripts/ingest-models.ts
```

This re-fetches all models even if `lastModified` hasn't changed.

---

## Questions?

Open an issue on GitHub or check the inline comments in the script files for implementation details.
