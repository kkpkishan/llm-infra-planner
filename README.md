# LLMcalc — LLM Hardware Calculator

> A precision-first, fully client-side tool for estimating GPU memory, throughput, and cloud costs for any LLM workload.

Built for ML engineers, infrastructure architects, and developers who need accurate hardware estimates — not ballpark guesses.

---

## What it does

LLMcalc answers the questions you actually have before deploying or training a large language model:

- **How much VRAM does this model need?** — broken down by weights, KV cache, activations, gradients, and optimizer states
- **Which GPU can run it?** — ranked by tier (Budget / Balanced / Performance) with utilization bars
- **What will it cost on cloud?** — sortable table across AWS, Azure, GCP, Lambda, RunPod, Vast, CoreWeave
- **How fast will it run?** — tokens/sec estimate using the roofline model
- **What's the cheapest option per million tokens?** — cost efficiency metric computed automatically
- **How do I set up the software stack?** — OS, driver, CUDA, PyTorch, container, and monitoring recommendations

Everything runs in the browser. No backend, no telemetry, no account required.

---

## Features

### Five Workload Modes

| Mode | What it calculates |
|---|---|
| **Inference** | Weights + KV cache + overhead |
| **Scale** | Multi-replica cluster sizing for a target QPS |
| **Fine-tune** | Weights + activations + gradients + optimizer (LoRA / QLoRA / full) |
| **Train** | Full pre-training memory with gradient checkpointing |
| **Reverse** | Given a GPU, which models fit? |

### Calculation Engine

All formulas are pure TypeScript functions with no side effects, independently tested with property-based tests.

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

40+ models across Llama, Mistral, Qwen, DeepSeek, Gemma, and Phi families. Each entry includes full architecture parameters: layers, hidden size, attention heads, KV heads, head dimension, max context length, attention type, and MoE configuration.

### GPU Database

30+ GPUs across:
- NVIDIA consumer (RTX 3090, 4090, ...)
- NVIDIA workstation (RTX Ada, RTX Pro)
- NVIDIA datacenter (A100, H100, H200, B100, B200)
- AMD (MI300X, RX 7900 XTX)
- Apple Silicon (M1 through M4 variants)

### Cloud Database

25+ instances from AWS, Azure, GCP, Lambda, RunPod, Vast, and CoreWeave with on-demand and spot pricing.

### Compare Mode

Add up to 3 configurations side-by-side. Numeric deltas are shown relative to the anchor config — green for improvement, red for regression — across VRAM, throughput, cloud cost, and cost per million tokens.

### Reverse Mode

Flip the calculator: pick a GPU (or enter custom VRAM), set a context length and workload mode, and see every model in the database ranked by fit status. Overflow models show the minimum precision required to fit.

### Shareable URLs

The full calculator state (model, precision, KV precision, context, batch, mode) is encoded in the URL. Share a link and the recipient sees exactly the same configuration.

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` | Open model search |
| `⌘\` | Toggle dark / light mode |
| `⌘↵` | Copy share URL |
| `?` | Show all shortcuts |
| `i` `s` `f` `t` `r` | Switch mode (Inference / Scale / Fine-tune / Train / Reverse) |
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
# Clone the repo
git clone https://github.com/kkpkishan/llm-infra-planner.git
cd llm-infra-planner

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Run Tests

```bash
# Unit + property-based tests (69 tests)
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

### Build and run

```bash
# Build the image
docker build -t llm-hardware-calculator:latest .

# Run on port 3000
docker run -p 3000:80 llm-hardware-calculator:latest
```

### Docker Compose (recommended)

```bash
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000).

The production image is a two-stage build:

1. **Builder** — `node:20-alpine` installs dependencies and runs `npm run build`
2. **Runner** — `nginx:1.27-alpine` serves the static assets with gzip, 1-year immutable cache for hashed assets, SPA routing, and rate limiting

Image size is approximately 25 MB.

---

## Project Structure

```
src/
├── components/
│   ├── calculator/     # All calculator UI components
│   ├── feedback/       # Toast, EmptyState, ErrorState, Skeleton
│   ├── layout/         # TopBar, ModeTabsBar, PageShell, Footer
│   └── primitives/     # Button, Input, Slider, Dialog, Popover, etc.
├── data/
│   ├── models.json     # 40+ LLM architecture specs
│   ├── gpus.json       # 30+ GPU specs with pricing
│   ├── cloud.json      # 25+ cloud instance pricing
│   └── meta.json       # Data version and build timestamp
├── lib/
│   ├── formulas/       # Pure calculation kernel (vram, kvcache, training, ...)
│   ├── keyboard-shortcuts.ts
│   ├── url-serializer.ts
│   └── use-theme.ts
├── pages/              # Home, Compare, Reverse, Models, Hardware, Guides
├── store/              # Zustand calculator store
└── styles/             # Tailwind config, design tokens, globals
scripts/
└── validate-data.ts    # Build-time JSON schema validation
```

---

## Data

All data is static JSON bundled with the app. No runtime API calls are made.

- **Models** — sourced from HuggingFace `config.json` files, with manual overrides for MoE active parameters and MLA compressed dimensions
- **GPUs** — MSRP / street prices, memory bandwidth, FP16 TFLOPS, TDP
- **Cloud** — on-demand and spot pricing with `lastPriceUpdate` timestamps

To update data, edit the JSON files in `src/data/` and run `npm run validate` to check schema compliance.

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
