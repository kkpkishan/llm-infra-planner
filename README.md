# LLMcalc — LLM Infrastructure Calculator

> A precision-first, fully client-side tool for estimating GPU memory, throughput, latency, and cloud costs for any LLM workload.

Built for ML engineers, infrastructure architects, and developers who need accurate hardware estimates — not ballpark guesses.

---

## What it does

LLMcalc answers the questions you actually have before deploying or training a large language model:

- **How much VRAM does this model need?** — broken down by weights, KV cache, activations, gradients, and optimizer states
- **Which GPU can run it?** — ranked by tier (Budget / Balanced / Performance) with utilization bars
- **What will it cost on cloud?** — sortable table across AWS, Azure, GCP, Lambda, RunPod, Vast, CoreWeave, Together AI
- **How fast will it run?** — tokens/sec estimate using the roofline model, with prefill/decode breakdown
- **What's the cheapest option per million tokens?** — cost efficiency metric computed automatically
- **How many concurrent users can it serve?** — capacity planning with SLO-aware TTFT and TPOT targets
- **What's the on-prem vs cloud TCO?** — full total cost of ownership with breakeven analysis
- **How do I set up the software stack?** — OS, driver, CUDA, PyTorch, container, and monitoring recommendations

Everything runs in the browser. No backend, no telemetry, no account required.
<img width="2936" height="1668" alt="image" src="https://github.com/user-attachments/assets/072b10f6-7a8d-4537-ab32-3a06078e0a0a" />

---

## Features

### Workload Modes

| Mode | What it calculates |
|---|---|
| **Inference** | Weights + KV cache + overhead, throughput, cost per token |
| **Fine-tune** | Weights + activations + gradients + optimizer (LoRA / QLoRA / full) |
| **Train** | Full pre-training memory with gradient checkpointing |
| **Reverse** | Given a GPU, which models fit? |

### Calculation Engine

All formulas are pure TypeScript functions with no side effects, independently tested with property-based tests (244 tests across 19 test files).

| Component | Formula |
|---|---|
| Weight memory | `num_params × bytes_per_param / 1e9` |
| KV cache | `2 × layers × batch × seq_len × kv_heads × head_dim × bytes / 1e9` |
| Activation memory | `layers × seq × batch × hidden × (34 + 5×seq×heads/hidden) × 2` |
| Optimizer (Adam) | `14 × num_params` bytes |
| Throughput | `bandwidth_GBs / active_weights_GB × efficiency_factor` |
| Cost / 1M tokens | `(hourly_cost / (tok_per_sec × 3600)) × 1_000_000` |

Supports MoE (uses active params for throughput, total for VRAM), GQA, MQA, and MLA (DeepSeek compressed KV cache).

### Precision Options

| Format | Bytes/param |
|---|---|
| FP32 | 4.0 |
| FP16 / BF16 | 2.0 |
| INT8 / FP8 | 1.0 |
| INT4 | 0.5 |
| GGUF Q4\_K\_M | 0.606 |
| GGUF Q5\_K\_M | 0.711 |
| GGUF Q8\_0 | 1.0625 |

KV cache precision is set independently from weight precision.

### Model Database

513 models across 70+ families including Llama, Mistral, Qwen, DeepSeek, Gemma, Phi, Falcon, Cohere, Grok, InternLM, MiniCPM, SmolLM, Starcoder, Yi, and more. Each entry includes full architecture parameters: layers, hidden size, attention heads, KV heads, head dimension, max context length, attention type, and MoE configuration.

### GPU Database

147 GPUs across 12 vendors:

| Vendor | Coverage |
|---|---|
| NVIDIA | Consumer (RTX 20/30/40/50 series), Workstation (RTX Ada, RTX Pro), Datacenter (A100, H100, H200, B100, B200, GB200) |
| AMD | RDNA consumer (RX 7900 XTX), Instinct datacenter (MI300X, MI325X) |
| Apple Silicon | M1 through M4 variants (all chip tiers) |
| Intel | Arc consumer, Gaudi datacenter |
| Google | TPU v4, v5e, v5p |
| AWS | Trainium, Inferentia |
| Cerebras | WSE-2, WSE-3 (wafer-scale) |
| Groq | LPU |
| SambaNova | RDU |
| Tenstorrent | Grayskull, Wormhole |
| Qualcomm | Cloud AI 100 |
| Huawei | Ascend |

### Cloud Database

37 instances from 8 providers: AWS, Azure, GCP, Lambda, RunPod, Vast, CoreWeave, and Together AI — with on-demand and spot pricing.

### Advanced Panels

| Panel | What it provides |
|---|---|
| **KV Cache Config** | Precision picker, cache size curve chart, per-layer breakdown |
| **Concurrent Users** | Capacity planning with TTFT/TPOT SLO targets, log-scale slider up to 10K users |
| **Speculative Decoding** | Draft model, Medusa, EAGLE-2, EAGLE-3, Lookahead, Prompt Lookup — with speedup estimates and VRAM overhead |
| **Parallelism** | Tensor, pipeline, ZeRO-3, MoE parallelism strategies with topology diagram |
| **Cluster** | Multi-node sizing, interconnect (NVLink / InfiniBand / PCIe), cluster topology visualization |
| **Failover** | Replica redundancy and failover cost modeling |
| **TCO** | On-prem vs cloud total cost of ownership with breakeven analysis (capex, PUE, electricity, colo, staff) |
| **Storage** | Checkpoint size, disk IOPS requirements |
| **Network** | Bandwidth requirements for distributed training |
| **Power** | TDP-based power draw and energy cost estimates |
| **Tokenizer** | Vocab size, embedding VRAM, fertility rate per model |
| **Multimodal** | Vision encoder VRAM overhead for VLMs |
| **Dataset Estimator** | Training dataset size and token count estimation |
| **Format Recommendation** | Quantization format advisor based on VRAM budget |
| **Warmup** | Model load and warmup time estimates |
| **Request Cost** | Per-request cost breakdown by prompt/output token ratio |
| **Prefill/Decode Breakdown** | Separate prefill and decode throughput and latency |
| **Latency Curve** | Throughput vs latency tradeoff chart |
| **Batch Processing** | Offline batch throughput and cost modeling |
| **Auto-scale** | Replica auto-scaling thresholds and cost |

### Compare Mode

Add up to 3 configurations side-by-side. Numeric deltas are shown relative to the anchor config — green for improvement, red for regression — across VRAM, throughput, cloud cost, and cost per million tokens.

### Reverse Mode

Flip the calculator: pick a GPU (or enter custom VRAM), set a context length and workload mode, and see every model in the database ranked by fit status. Overflow models show the minimum precision required to fit.

### Shareable URLs

The full calculator state (model, precision, KV precision, context, batch, mode, concurrent users, SLO targets) is encoded in the URL. Share a link and the recipient sees exactly the same configuration.

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` | Open model search |
| `⌘\` | Toggle dark / light mode |
| `⌘↵` | Copy share URL |
| `?` | Show all shortcuts |
| `i` `f` `t` `r` | Switch mode (Inference / Fine-tune / Train / Reverse) |
| `c` | Add current config to compare |
| `g` → `m` | Go to Models catalog |
| `g` → `h` | Go to Hardware catalog |
| `Esc` | Close dialog or drawer |

---

## Pages

| Route | Description |
|---|---|
| `/` | Main calculator |
| `/compare` | Side-by-side configuration comparison |
| `/reverse` | GPU → model fit grid |
| `/models` | Sortable, filterable model catalog |
| `/hardware` | Sortable, filterable GPU catalog |
| `/guides` | Methodology docs, quantization guide, glossary |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite 5 + TypeScript |
| Styling | Tailwind CSS 3 + CSS custom properties |
| State | Zustand + nuqs (URL-as-state) |
| Routing | React Router v7 |
| Search | Fuse.js (fuzzy model search) |
| Formulas | KaTeX (rendered math) |
| Charts | Recharts |
| Tables | TanStack Table v8 |
| Icons | Lucide React |
| Testing | Vitest + fast-check (property-based tests) |
| Container | Docker (node:20-alpine → nginx:1.27-alpine) |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Local Development

```bash
git clone https://github.com/kkpkishan/llm-infra-planner.git
cd llm-infra-planner
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Run Tests

```bash
# Unit + property-based tests
npm test

# Watch mode
npm run test:watch

# Validate data files against schemas
npm run validate
```

### Production Build

```bash
npm run build
# Output in dist/
```

---

## Docker

```bash
# Build and run
docker build -t llm-hardware-calculator:latest .
docker run -p 3000:80 llm-hardware-calculator:latest
```

```bash
# Docker Compose (recommended)
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000).

The production image is a two-stage build:

1. **Builder** — `node:20-alpine` installs dependencies and runs `npm run build`
2. **Runner** — `nginx:1.27-alpine` serves static assets with gzip, 1-year immutable cache for hashed assets, SPA routing, and rate limiting

Image size is approximately 25 MB.

---

## Project Structure

```
src/
├── components/
│   ├── calculator/     # All calculator UI components (50+ components)
│   ├── feedback/       # Toast, EmptyState, ErrorState, Skeleton
│   ├── layout/         # TopBar, ModeTabsBar, PageShell, Footer
│   └── primitives/     # Button, Input, Slider, Dialog, Popover, etc.
├── data/
│   ├── models.json     # 513 LLM architecture specs
│   ├── gpus.json       # 147 GPU specs with pricing
│   ├── cloud.json      # 37 cloud instance pricing entries
│   └── meta.json       # Data version and build timestamp
├── lib/
│   ├── formulas/       # Pure calculation kernel (40+ formula modules)
│   ├── keyboard-shortcuts.ts
│   ├── url-serializer.ts
│   └── use-theme.ts
├── pages/              # Home, Compare, Reverse, Models, Hardware, Guides
├── store/              # Zustand calculator store
└── styles/             # Tailwind config, design tokens, globals
scripts/
├── ingest-models.ts    # HuggingFace model ingestion pipeline
├── refresh-cloud-prices.ts
├── refresh-hardware.ts
└── validate-data.ts    # Build-time JSON schema validation
```

---

## Data

All data is static JSON bundled with the app. No runtime API calls are made.

- **Models** — sourced from HuggingFace `config.json` files via the ingestion pipeline, with manual overrides for MoE active parameters and MLA compressed dimensions
- **GPUs** — MSRP / street prices, memory bandwidth, FP16 TFLOPS, TDP
- **Cloud** — on-demand and spot pricing with `lastPriceUpdate` timestamps

To update data, edit the JSON files in `src/data/` and run `npm run validate` to check schema compliance.

To re-ingest models from HuggingFace:

```bash
npx tsx scripts/ingest-models.ts
```

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make changes and add tests
4. Run `npm test` and `npm run lint` — both must pass
5. Open a pull request

---

## License

MIT
