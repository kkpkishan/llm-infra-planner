# Implementation Plan: LLM Hardware Calculator

## Overview

Build a fully client-side LLM hardware calculator (React 18 + Vite 5 + TypeScript) with a pure calculation kernel, static JSON data, URL-as-state, and a dense keyboard-first UI. Development proceeds bottom-up: project scaffolding → data layer → calculation kernel (with property tests) → state management → UI components → page assembly → advanced features → polish.

## Tasks

- [x] 1. Project scaffolding and design system foundation
  - [x] 1.1 Initialize Vite 5 + React 18 + TypeScript project with path aliases
    - Run `npm create vite@latest` with React-TS template
    - Install core dependencies: `tailwindcss@3`, `@tailwindcss/typography`, `tailwindcss-animate`, `lucide-react`, `zustand`, `nuqs`, `recharts`, `katex`, `fuse.js`, `@tanstack/react-table`, `cmdk`
    - Install dev dependencies: `vitest`, `fast-check`, `@playwright/test`, `@types/katex`
    - Configure `tsconfig.json` with `@/` path alias to `src/`
    - Create directory structure: `src/components/{primitives,calculator,layout,feedback}`, `src/lib/formulas`, `src/store`, `src/pages`, `src/styles`, `src/data`
    - _Requirements: 18.1, 18.3_

  - [x] 1.2 Set up Tailwind CSS config with design tokens
    - Create `src/styles/tokens.css` with all CSS custom properties (light + dark mode) from the design system: neutrals, accent violet, semantic fit colors, data visualization palette
    - Create `tailwind.config.ts` with extended font families (Inter, JetBrains Mono), custom font sizes (3xs through 6xl), color tokens mapped to CSS variables, border radius scale, transition durations, and timing functions
    - Create `src/styles/globals.css` importing Tailwind layers and tokens
    - _Requirements: 25.6_

  - [x] 1.3 Implement dark mode with FOUC prevention
    - Create inline `<script>` in `index.html` `<head>` that reads `localStorage` theme preference or `prefers-color-scheme`, sets `data-theme` attribute on `<html>` before paint
    - Implement `useTheme` hook: reads/writes `localStorage`, listens to `storage` event for cross-tab sync, provides `theme` and `toggleTheme`
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_

  - [x] 1.4 Create base shadcn/ui primitive components
    - Copy and customize shadcn/ui primitives into `src/components/primitives/`: `button.tsx`, `input.tsx`, `select.tsx`, `slider.tsx`, `tabs.tsx`, `tooltip.tsx`, `popover.tsx`, `dialog.tsx`, `command.tsx`
    - Apply design tokens: button variants (primary/secondary/ghost/outline), input heights (sm/md/lg), focus ring styles
    - Ensure all primitives use semantic HTML and proper ARIA attributes
    - _Requirements: 20.1, 20.2_


- [x] 2. Static data layer and build-time validation
  - [x] 2.1 Create TypeScript interfaces for data models
    - Define `ModelSpec`, `GPUSpec`, `CloudInstance`, `PrecisionConfig` interfaces in `src/lib/formulas/types.ts`
    - Define `VRAMBreakdown`, `WorkloadMode`, `CalculatorState`, `TrainingOptions`, `AdvancedSettings` types
    - Define `GPUFitResult`, `FitStatus`, `GPURecommendations`, `CloudRecommendation`, `ClusterRecommendation`, `StackRecommendation` types
    - _Requirements: 14.2, 15.2, 16.2_

  - [x] 2.2 Create static JSON data files for models, GPUs, and cloud instances
    - Create `src/data/models.json` with 40+ model entries (Llama, Mistral, Qwen, DeepSeek, Gemma, Phi families) including all required architecture fields from the PRFAQ model database
    - Create `src/data/gpus.json` with 30+ GPU entries (NVIDIA consumer/workstation/datacenter, AMD, Apple Silicon) with memory, bandwidth, FLOPS, TDP, and pricing
    - Create `src/data/cloud.json` with 25+ cloud instances (AWS, Azure, GCP, Lambda, RunPod, Vast, CoreWeave) with pricing and `lastPriceUpdate` timestamps
    - Create `src/data/meta.json` with data version and last update timestamp
    - _Requirements: 14.1, 14.2, 15.1, 15.2, 15.3, 16.1, 16.2, 16.3, 32.2_

  - [x] 2.3 Implement build-time data validation script
    - Create `scripts/validate-data.ts` that validates all JSON entries against TypeScript interfaces
    - Validate required fields are present and non-null for every entry
    - Validate GPU `memoryGB` is within [1, 1024] range
    - Validate cloud instance prices are positive
    - Fail build and report all validation errors if any check fails
    - _Requirements: 21.1, 21.2, 21.3_

  - [ ]* 2.4 Write property tests for data validation (Properties 19, 20)
    - **Property 19: Database schema completeness** — For any entry in models/gpus/cloud JSON, all required fields SHALL be present and non-null
    - **Validates: Requirements 14.2, 15.2, 16.2, 16.3**
    - **Property 20: VRAM range validation** — For any GPU entry, memoryGB in [1, 1024] SHALL be accepted, outside SHALL be rejected
    - **Validates: Requirements 21.2**

- [x] 3. Calculation kernel — weights and precision
  - [x] 3.1 Implement precision mapping module
    - Create `src/lib/formulas/precision.ts` with `PRECISION_MAP` (FP32, FP16, BF16, FP8, INT8, INT4, GGUF Q4_K_M, Q5_K_M, Q8_0) and `KV_PRECISION_MAP` (FP16, INT8, Q4)
    - Export `getPrecisionConfig(key: string): PrecisionConfig` and `getKVPrecisionConfig(key: string): PrecisionConfig`
    - _Requirements: 1.1, 9.1, 9.2, 30.1_

  - [x] 3.2 Implement weight memory computation
    - Create `src/lib/formulas/vram.ts` with `computeWeightMemory(input: WeightCalcInput): WeightCalcResult`
    - Formula: `weightGB = round(numParams × bytesPerParam / 1e9, 1)`
    - Handle MoE models: use `paramsTotal` for VRAM sizing
    - _Requirements: 1.1, 1.2, 1.3_

  - [x]* 3.3 Write property test for weight memory (Property 1)
    - **Property 1: Weight memory formula correctness**
    - Use `arbModelSpec()` and `arbPrecision()` generators
    - Verify `computeWeightMemory` returns `round(numParams × bytesPerParam / 1e9, 1)` for all valid inputs
    - **Validates: Requirements 1.1, 1.3, 1.4**

  - [x]* 3.4 Write property test for MoE VRAM vs throughput (Property 2)
    - **Property 2: MoE uses total params for VRAM and active params for throughput**
    - Use `arbMoEModelSpec()` generator
    - Verify VRAM uses `paramsTotal`, throughput uses `paramsActive`
    - **Validates: Requirements 1.2, 7.2**

- [x] 4. Calculation kernel — KV cache
  - [x] 4.1 Implement KV cache computation
    - Create `src/lib/formulas/kvcache.ts` with `computeKVCache(input: KVCacheInput): KVCacheResult`
    - Standard formula: `2 × numLayers × batch × seqLen × numKVHeads × headDim × bytesPerParam / 1e9`
    - Handle GQA (fewer KV heads), MQA (numKVHeads=1), MLA (use `mlaCompressedDim` with fallback to GQA)
    - Round to 2 decimal places
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x]* 4.2 Write property tests for KV cache (Properties 3, 4, 5)
    - **Property 3: KV cache formula correctness** — Verify formula for MHA/GQA/MQA attention types
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5**
    - **Property 4: MLA KV cache with GQA fallback** — Verify MLA uses compressed dim when available, falls back to GQA otherwise
    - **Validates: Requirements 2.4**
    - **Property 5: KV cache scales linearly with context length** — Doubling seqLen doubles KV cache
    - **Validates: Requirements 2.6**


- [x] 5. Calculation kernel — training memory
  - [x] 5.1 Implement training memory computation
    - Create `src/lib/formulas/training.ts` with `computeTrainingMemory(input: TrainingMemoryInput): TrainingMemoryResult`
    - Activation memory per layer: `seqLen × batch × hiddenSize × (34 + 5 × seqLen × numAttentionHeads / hiddenSize) × 2` bytes
    - Gradient checkpointing: apply `sqrt(numLayers)` reduction
    - Mixed-precision Adam: `14 × numParams` bytes optimizer overhead
    - LoRA: trainable params = `Σ(rank × (d_in + d_out))`, gradient/optimizer costs only on trainable params
    - QLoRA: base weights at NF4 (~0.5 bytes/param), adapters at BF16
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x]* 5.2 Write property tests for training memory (Properties 6, 7, 8, 9)
    - **Property 6: Activation memory formula correctness** — Verify activation formula for valid training configs
    - **Validates: Requirements 3.1**
    - **Property 7: Gradient checkpointing reduces activation memory** — Verify checkpointing=true produces ≤ checkpointing=false
    - **Validates: Requirements 3.2**
    - **Property 8: Mixed-precision Adam optimizer overhead** — Verify optimizer memory = `14 × numParams` bytes
    - **Validates: Requirements 3.3**
    - **Property 9: LoRA trainable parameters and cost isolation** — Verify trainable params formula and cost isolation
    - **Validates: Requirements 3.4**

- [x] 6. Calculation kernel — VRAM aggregation and throughput
  - [x] 6.1 Implement total VRAM aggregation
    - Extend `src/lib/formulas/vram.ts` with `computeTotalVRAM(model, precision, kvPrecision, contextLength, batchSize, mode, trainingOptions?): VRAMBreakdown`
    - Sum weights + KV cache (inference) or activations (training) + gradients + optimizer + ~1 GB overhead
    - Mode-dependent: inference includes KV cache, excludes training components; fine-tune/train include activations, gradients, optimizer
    - _Requirements: 4.1, 11.2, 11.3, 11.4, 23.1_

  - [x] 6.2 Implement throughput estimation
    - Create `src/lib/formulas/throughput.ts` with `computeThroughput(input: ThroughputInput): ThroughputResult`
    - Formula: `floor(memoryBandwidthGBs / activeWeightsGB × efficiencyFactor)`
    - Use active params for MoE models
    - Return whole number
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 6.3 Implement cost metrics computation
    - Create `src/lib/formulas/cost-metrics.ts` with `computeCostMetrics(input: CostMetricsInput): CostMetricsResult`
    - Cost per million tokens: `round((hourlyCloudCost / (tokensPerSecond × 3600)) × 1_000_000, 2)`
    - Time-to-first-token estimation based on prefill computation
    - Handle division by zero (return N/A)
    - _Requirements: 29.2, 29.3_

  - [x]* 6.4 Write property tests for VRAM aggregation and throughput (Properties 10, 11, 15, 22)
    - **Property 10: VRAM breakdown sum invariant** — Sum of all components equals reported total
    - **Validates: Requirements 3.6, 4.1, 4.4**
    - **Property 11: Mode-dependent VRAM components** — Inference has KV>0, training components=0; training modes have activations/gradients/optimizer>0
    - **Validates: Requirements 11.2, 11.3, 11.4**
    - **Property 15: Throughput formula correctness** — Verify `floor(bandwidth / activeWeights × efficiency)` as whole number
    - **Validates: Requirements 7.1, 7.3, 7.4**
    - **Property 22: Cost per million tokens formula** — Verify cost formula for valid inputs
    - **Validates: Requirements 29.2, 36.3**

- [x] 7. Checkpoint — Core kernel tests pass
  - Ensure all kernel unit tests and property tests pass, ask the user if questions arise.

- [x] 8. Calculation kernel — GPU and cloud recommenders
  - [x] 8.1 Implement GPU fit classification and recommender
    - Create `src/lib/formulas/gpu-recommender.ts` with `classifyGPUFit(totalVRAMGB, gpuMemoryGB): FitStatus` and `recommendGPUs(totalVRAMGB, gpus, throughputInput?): GPURecommendations`
    - Green: ≤80% utilization, Yellow: 80–100%, Red: >100%
    - Tier classification: Budget (<$1000, ≥12GB), Balanced ($1000–$3000, 16–48GB), Performance (>$3000 or datacenter)
    - Compute utilization percent and free VRAM for each GPU
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 8.2 Implement cloud instance recommender
    - Create `src/lib/formulas/cloud-recommender.ts` with `recommendCloudInstances(totalVRAMGB, instances, gpuDb, providerFilter?, regionFilter?): CloudRecommendation[]`
    - Filter instances that can accommodate VRAM, sort by on-demand price ascending
    - Compute `costPerMillionTokens` and mark `isBestPrice` on cheapest
    - Support provider and region filtering
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 36.3, 36.4_

  - [x]* 8.3 Write property tests for GPU and cloud recommenders (Properties 12, 13, 14, 28)
    - **Property 12: GPU fit classification thresholds** — Verify green/yellow/red thresholds at 80% and 100%
    - **Validates: Requirements 5.1, 5.5, 37.2**
    - **Property 13: Cloud recommendations sorted by price** — Verify ascending price order
    - **Validates: Requirements 6.1**
    - **Property 14: Cloud provider filtering** — All returned instances match provider filter
    - **Validates: Requirements 6.3, 22.3**
    - **Property 28: Best price badge uniqueness and correctness** — Exactly one isBestPrice=true with minimum cost
    - **Validates: Requirements 36.4**


- [x] 9. Calculation kernel — cluster, stack, and scale recommenders
  - [x] 9.1 Implement cluster recommender
    - Create `src/lib/formulas/cluster-recommender.ts` with `recommendCluster(totalVRAMGB, mode, gpus): ClusterRecommendation`
    - When VRAM exceeds single GPU: recommend multi-GPU topology with parallelism strategy (TP, PP, FSDP, ZeRO)
    - Recommend serving framework (vLLM, llama.cpp, TGI, TensorRT-LLM) with launch arguments
    - Include alternative topology and runtime options
    - _Requirements: 27.1, 27.2, 27.3, 27.4_

  - [x] 9.2 Implement stack recommender
    - Create `src/lib/formulas/stack-recommender.ts` with `recommendStack(gpu, mode): StackRecommendation`
    - Return OS, driver, CUDA, PyTorch, container, and monitoring recommendations based on GPU generation and workload mode
    - All six fields must be non-empty strings
    - _Requirements: 28.1, 28.2, 28.3_

  - [x] 9.3 Implement scale mode computation
    - Add scale mode logic: compute required replicas as `ceil((targetQPS × avgOutputTokens) / throughputPerGPU × headroomFactor)` with 20–30% headroom
    - Compute total cluster cost per hour and cost per million tokens
    - _Requirements: 38.1, 38.2, 38.3, 38.4_

  - [x] 9.4 Create kernel barrel export
    - Create `src/lib/formulas/index.ts` re-exporting all formula functions and types
    - _Requirements: 18.1_

  - [x]* 9.5 Write property tests for cluster, stack, and scale (Properties 23, 24, 30)
    - **Property 23: Cluster recommender validity** — When VRAM exceeds largest GPU, returns multi-GPU topology with valid parallelism strategy
    - **Validates: Requirements 27.1, 27.2**
    - **Property 24: Stack recommender completeness** — All six fields are non-empty strings for any valid GPU and mode
    - **Validates: Requirements 28.1**
    - **Property 30: Scale mode replica formula** — Verify replica count formula with headroom factor
    - **Validates: Requirements 38.3**

- [x] 10. URL serializer and state management
  - [x] 10.1 Implement URL serializer with nuqs
    - Create `src/lib/url-serializer.ts` with `serializeState(state): string` and `parseState(queryString, modelDb): CalculatorState`
    - Serialize: model, precision, kvPrecision, ctx, batch, mode to query params
    - Parse: apply defaults for missing params, clamp context to model max, fall back to default model for unrecognized IDs
    - Handle edge cases: invalid precision → FP16, out-of-range batch → clamp to [1, 32]
    - _Requirements: 12.1, 12.2, 24.1, 24.2, 24.3, 24.4_

  - [x] 10.2 Implement Zustand calculator store
    - Create `src/store/calculator-store.ts` with `CalculatorStore` interface
    - Store inputs: selectedModel, precision, kvPrecision, contextLength, batchSize, mode, trainingOptions, advancedSettings
    - Store computed results: breakdown, gpuRecommendations, cloudRecommendations, costMetrics, clusterRecommendation, stackRecommendation
    - Store compare configs (up to 3)
    - Implement `recompute()` action that calls all kernel functions and updates derived state
    - Wire bidirectional sync with nuqs URL params (debounced 300ms)
    - _Requirements: 9.3, 10.3, 18.1_

  - [x]* 10.3 Write property tests for URL serializer (Properties 16, 17, 18)
    - **Property 16: URL state round-trip** — Serialize then parse produces equivalent state for all valid CalculatorState
    - **Validates: Requirements 12.1, 12.2, 12.4, 24.1, 24.5, 24.6**
    - **Property 17: URL parser applies defaults for missing parameters** — Parsing any subset of params produces valid state with defaults
    - **Validates: Requirements 24.2**
    - **Property 18: Context length clamping** — Context > model max is clamped to max
    - **Validates: Requirements 10.4, 24.4**

  - [x]* 10.4 Write property test for KV cache precision independence (Property 21)
    - **Property 21: KV cache precision independence** — Changing weight precision while holding KV precision constant does not change KV cache result
    - **Validates: Requirements 30.2**

- [x] 11. Checkpoint — All kernel + state tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [x] 12. Layout shell and navigation
  - [x] 12.1 Implement TopBar component
    - Create `src/components/layout/TopBar.tsx` with logo (LLMcalc in JetBrains Mono SemiBold), nav links (Calculator, Compare, Reverse, Models, Hardware, Guides), Data_Freshness_Badge, theme toggle (Moon/Sun), keyboard shortcuts button, GitHub link
    - 48px fixed height, z-index 20
    - Highlight active page link
    - Collapse to hamburger menu below 1024px
    - _Requirements: 32.1, 32.2, 35.1, 35.2, 35.3_

  - [x] 12.2 Implement ModeTabsBar component
    - Create `src/components/layout/ModeTabsBar.tsx` with underline-style tabs: Inference, Scale, Fine-tune, Train, Reverse
    - Each tab has 14px SVG icon + label, active tab has accent underline
    - Include Share and Compare action buttons on the right
    - 48px sticky, keyboard navigable (Arrow Left/Right)
    - Tabs are links with URL routing (`/?mode=inference`)
    - _Requirements: 11.1, 38.1_

  - [x] 12.3 Implement PageShell and Footer
    - Create `src/components/layout/PageShell.tsx` wrapping TopBar + ModeTabsBar + main content + Footer
    - Create `src/components/layout/Footer.tsx` with version, methodology link, GitHub link, changelog, prices refreshed timestamp
    - Set up React Router with routes: `/`, `/compare`, `/reverse`, `/models`, `/hardware`, `/guides`
    - _Requirements: 35.1, 19.1_

- [x] 13. Calculator input components
  - [x] 13.1 Implement ModelPicker with fuzzy search
    - Create `src/components/calculator/ModelPicker.tsx` using cmdk (shadcn Command) with Fuse.js fuzzy search
    - Display model family badges (Llama, Mistral, Qwen, etc.), MoE/VLM/Base/Instruct chips
    - Group results by family, pin recent selections from localStorage
    - On select: populate all architecture params from model database
    - ARIA 1.2 combobox pattern: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`
    - Show ⌘K hint next to label
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 13.2 Implement PrecisionPicker and KVPrecisionPicker
    - Create `src/components/calculator/PrecisionPicker.tsx` as segmented control with all precision options, bytes-per-param hint on each
    - Create `src/components/calculator/KVPrecisionPicker.tsx` as segmented control: FP16, INT8, Q4
    - Keyboard navigable as radio group
    - _Requirements: 9.1, 9.2, 30.1, 30.2, 30.3_

  - [x] 13.3 Implement ContextSlider and BatchSlider
    - Create `src/components/calculator/ContextSlider.tsx` with log-scale slider (1024–131072), snap to powers of 2, pill value display above thumb, synced numeric input
    - Constrain max to selected model's `maxContextLength`
    - Create `src/components/calculator/BatchSlider.tsx` with range 1–32, numeric input
    - ARIA slider roles with `aria-valuemin/max/now/text`
    - _Requirements: 10.1, 10.2, 10.4_

  - [x] 13.4 Implement AdvancedPanel
    - Create `src/components/calculator/AdvancedPanel.tsx` as collapsible panel
    - Include: framework selection (vLLM, llama.cpp, TGI, TensorRT-LLM), overhead multiplier, tokenizer selection
    - Training-specific options: LoRA/QLoRA toggle, LoRA rank slider, gradient checkpointing toggle
    - _Requirements: 31.1, 31.2, 31.3_

- [x] 14. Calculator output components
  - [x] 14.1 Implement VRAMBreakdown visualization
    - Create `src/components/calculator/VRAMBreakdown.tsx` with stacked bar (28px height, 6px radius on ends, 2px gaps between segments)
    - Use data visualization palette colors for each component
    - Hero total number: 48px JetBrains Mono SemiBold with "GB" suffix
    - Context line below: "Fits X% on 1× GPU · KV cache precision · framework"
    - Legend: 2-column grid with colored dots + labels + mono values
    - Hover tooltip on segments with exact bytes and formula link
    - Overflow indicator: red-striped fill past GPU limit line
    - Segment width animation: 400ms tween on input change, respect `prefers-reduced-motion`
    - `aria-live="polite"` on total for screen readers
    - _Requirements: 4.2, 4.3, 17.1, 17.2, 17.3_

  - [x] 14.2 Implement MetricsRow
    - Create `src/components/calculator/MetricsRow.tsx` with 3-column grid: tokens/sec, $/M tokens, time-to-first-token
    - Each metric: 11px uppercase label, 22px mono semibold value, 11px mono muted subtitle
    - Handle N/A states for division-by-zero cases
    - _Requirements: 29.1, 29.2, 29.3, 29.4_

  - [x] 14.3 Implement FormulaReveal with KaTeX
    - Create `src/components/calculator/FormulaReveal.tsx` as accordion
    - Render formulas with KaTeX, show input values in monospace, cite source paper
    - Use KaTeX MathML output for screen reader accessibility
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 14.4 Implement GPUCard and GPUList
    - Create `src/components/calculator/GPUCard.tsx` with fit badge (icon + text, not color alone), GPU name/meta/price, 4px utilization bar (green/amber/red), free VRAM, tok/s estimate, stats row (BW, TFLOPS, TDP)
    - Create `src/components/calculator/GPUList.tsx` displaying recommended GPUs in Budget/Balanced/Performance tiers, recommended card with accent gradient
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 37.1, 37.2, 37.3, 37.4_

  - [x] 14.5 Implement CloudTable and CloudRow
    - Create `src/components/calculator/CloudRow.tsx` with provider logo (22px colored square with initials), instance details, pricing columns (right-aligned mono), best-price badge
    - Create `src/components/calculator/CloudTable.tsx` using TanStack Table with sortable columns ($/h, Spot, $/M tok), provider filtering, sticky header, interconnect column
    - _Requirements: 6.1, 6.2, 22.1, 22.2, 22.3, 36.1, 36.2, 36.3, 36.4, 36.5_

  - [x] 14.6 Implement ClusterPanel and StackPanel
    - Create `src/components/calculator/ClusterPanel.tsx` displaying topology, framework, args, alternative options as key-value list
    - Create `src/components/calculator/StackPanel.tsx` displaying OS, driver, CUDA, PyTorch, container, monitoring as key-value list
    - _Requirements: 27.4, 28.2_


- [x] 15. Feedback components
  - [x] 15.1 Implement Toast, EmptyState, ErrorState, and Skeleton components
    - Create `src/components/feedback/Toast.tsx` for clipboard confirmation and notifications
    - Create `src/components/feedback/EmptyState.tsx` with 32px icon, title, description, action button
    - Create `src/components/feedback/ErrorState.tsx` with icon, message, retry button
    - Create `src/components/feedback/Skeleton.tsx` with shimmer animation (respects `prefers-reduced-motion`)
    - _Requirements: 20.3_

- [x] 16. Calculator home page assembly
  - [x] 16.1 Assemble Calculator Home page (`/`)
    - Create `src/pages/Home.tsx` wiring all input and output components to the Zustand store
    - Desktop xl+ layout: 3-column grid (280px inputs | flex VRAM breakdown | 380px recommendations)
    - Tablet md: 2-column layout
    - Mobile: single-column stacked with collapsible inputs summary
    - Below main grid: full-width CloudTable, then ClusterPanel + StackPanel side-by-side
    - Wire store `recompute()` on any input change for immediate output updates
    - _Requirements: 19.1, 19.2, 18.1_

  - [x] 16.2 Implement ShareButton with clipboard
    - Create `src/components/calculator/ShareButton.tsx` that copies current URL to clipboard
    - Icon swap: Share2 → Check for 2s, toast "Link copied"
    - Fallback to input field selection if Clipboard API unavailable
    - _Requirements: 12.3_

- [x] 17. Checkpoint — Calculator home page functional
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Keyboard shortcuts system
  - [x] 18.1 Implement global keyboard shortcuts
    - Create `src/lib/keyboard-shortcuts.ts` with event listener for global shortcuts
    - `⌘/Ctrl + K`: open model search combobox
    - `⌘/Ctrl + \`: toggle theme
    - `⌘/Ctrl + Enter`: copy share URL
    - Single-key mode switching: `i`, `s`, `f`, `t`, `r` (only when no input focused)
    - `c`: add current config to compare
    - `?`: open shortcuts help modal
    - `Esc`: close open dialog/drawer
    - `g then m`: navigate to Models, `g then h`: navigate to Hardware
    - Display shortcut hints next to relevant UI elements
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_

- [x] 19. Compare mode
  - [x] 19.1 Implement CompareDrawer and Compare page
    - Create `src/components/calculator/CompareDrawer.tsx` as 480px right-side drawer
    - Support up to 3 configurations as stacked cards
    - Display for each: model name, precision, context, total VRAM, tok/s, GPU fit status, best cloud $/h, $/M tokens
    - Compute numeric deltas relative to first (anchor) config: +/− signs, green for improvement, red for regression
    - Each column: mode chip header, copy-config button, remove button
    - Create `src/pages/Compare.tsx` with full-page compare layout at `/compare` route
    - Reject 4th config with toast "Maximum 3 configurations"
    - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5_

  - [ ]* 19.2 Write property test for compare mode deltas (Property 25)
    - **Property 25: Compare mode delta correctness** — For any two VRAMBreakdowns A and B, delta = B.field - A.field with correct +/− prefix
    - **Validates: Requirements 33.3**

- [x] 20. Reverse mode
  - [x] 20.1 Implement Reverse mode page
    - Create `src/pages/Reverse.tsx` at `/reverse` route
    - Inputs: GPU picker (or custom VRAM amount), target context length, workload mode (inference/fine-tune)
    - Output: sortable grid of all models with fit status (green/yellow/red), estimated tok/s, required quantization level
    - Filters: model family, parameter size range, license, modality (text/vision/embedding)
    - Ensure fit status matches forward calculation for consistency
    - _Requirements: 34.1, 34.2, 34.3, 34.4_

  - [ ]* 20.2 Write property tests for reverse mode (Properties 26, 27)
    - **Property 26: Reverse mode consistency with forward calculation** — Fit status in reverse mode matches forward calculation for same model/GPU/precision/context
    - **Validates: Requirements 34.3**
    - **Property 27: Reverse mode model filtering** — All returned models match every active filter criterion
    - **Validates: Requirements 34.4**


- [x] 21. Catalog pages
  - [x] 21.1 Implement Models catalog page
    - Create `src/pages/Models.tsx` at `/models` route
    - Filterable, sortable table using TanStack Table: name, family, parameters, context length, license, release date
    - Filter by family, sort by any column
    - _Requirements: 39.1, 39.3_

  - [x] 21.2 Implement Hardware catalog page
    - Create `src/pages/Hardware.tsx` at `/hardware` route
    - Filterable, sortable table: name, vendor, category, VRAM, bandwidth, TFLOPS, TDP, price
    - Filter by vendor, memory range, price range
    - _Requirements: 39.2, 39.3_

  - [ ]* 21.3 Write property tests for catalog sorting (Properties 29, 31)
    - **Property 29: Cloud table sorting order** — Sorting by any numeric column produces monotonically ordered sequence
    - **Validates: Requirements 36.5**
    - **Property 31: Catalog sorting correctness** — Sorting any catalog by any column produces monotonically ordered values
    - **Validates: Requirements 39.3**

- [x] 22. Guides and documentation page
  - [x] 22.1 Implement Guides page
    - Create `src/pages/Guides.tsx` at `/guides` route
    - Three-column layout: TOC sidebar (240px sticky), article content (max 680px), section anchors sidebar (180px sticky)
    - Create initial MDX articles: "How VRAM is calculated", "Choosing a quantization", Glossary
    - _Requirements: 40.1, 40.2, 40.3_

- [x] 23. Responsive layout and mobile optimization
  - [x] 23.1 Implement responsive breakpoints and mobile layout
    - Apply mobile-first CSS with breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
    - Mobile (<768px): stacked layout, collapsible inputs with summary ("Llama-3.1-70B · Q4_K_M · 32k · batch 1"), GPU list shows top 3 with "Show all", cloud table transforms to card carousel
    - Sticky bottom action bar on mobile: Share + Compare buttons
    - Touch targets: minimum 44×44px hit area
    - Bottom sheet for model picker on phone
    - Verify usable at 375px without horizontal scrolling
    - _Requirements: 19.1, 19.2_

- [x] 24. Accessibility polish
  - [x] 24.1 Implement accessibility features
    - Add skip link: "Skip to main content" visible on focus
    - Verify all icon-only buttons have `aria-label`
    - Add `aria-label` overrides for numbers with units (e.g., "55.8 gigabytes")
    - Verify `aria-live="polite"` on dynamic VRAM total updates
    - Verify focus management: `:focus-visible` only, tab order matches visual order
    - Verify minimum 4.5:1 contrast ratio for all text
    - Verify `prefers-reduced-motion` disables non-essential animations (bar segments snap, spinners become static text)
    - _Requirements: 20.1, 20.2, 20.3, 20.4_

- [x] 25. Checkpoint — All features complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 26. End-to-end tests
  - [ ]* 26.1 Write Playwright end-to-end tests
    - Full calculator flow: select model → set precision → set KV precision → adjust context → verify breakdown + metrics
    - Shareable URL round-trip: configure → copy URL → navigate → verify same state
    - Responsive layout: verify 3-column at 1280px, single-column at 375px
    - Keyboard navigation: Tab through inputs, Enter to select, Escape to close
    - Keyboard shortcuts: ⌘K opens model picker, ⌘\ toggles theme, mode keys
    - Dark mode: toggle, verify colors, reload and verify persistence
    - Compare mode: add 2 configs, verify deltas, remove config
    - Reverse mode: select GPU, verify model grid with fit badges
    - Cloud table: sort by $/M tok, verify order, verify best-price badge
    - ARIA compliance: verify combobox roles, labels, slider roles
    - Mobile: verify collapsed inputs, bottom action bar, touch targets
    - _Requirements: 12.2, 12.4, 19.1, 20.1, 25.2, 26.1, 33.2, 34.3_

- [x] 27. Final checkpoint — All tests pass
  - Ensure all unit tests, property tests, and end-to-end tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests (31 total) validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- The calculation kernel (tasks 3–9) is built and tested before any UI, ensuring correctness from the ground up
- All 40 requirements are covered across the implementation tasks
