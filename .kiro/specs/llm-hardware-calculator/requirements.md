# Requirements Document

## Introduction

The LLM Hardware Calculator is a production-quality, accuracy-first web application that helps users determine hardware requirements, make buy-vs-rent decisions, and estimate costs for LLM workloads. The application covers four workloads: single-user inference, inference at scale, fine-tuning (LoRA/QLoRA/full), and pre-training from scratch. All calculations run client-side with static JSON data, and every output shows its formula, inputs, and assumptions.

## Glossary

- **Calculator**: The LLM Hardware Calculator web application
- **VRAM_Engine**: The core calculation module that computes memory requirements for model weights, KV cache, activations, gradients, and optimizer states
- **Model_Picker**: The UI component that allows users to search and select an LLM from the model database
- **Precision_Picker**: The UI component that allows users to select a quantization format (FP16, BF16, INT8, INT4, GGUF variants)
- **GPU_Recommender**: The module that matches computed VRAM requirements against the GPU database and produces ranked recommendations
- **Cloud_Recommender**: The module that matches GPU recommendations against cloud instance data and produces cost-ranked suggestions
- **Throughput_Estimator**: The module that estimates tokens-per-second using the roofline model
- **URL_Serializer**: The module that encodes and decodes calculator state to and from URL query parameters
- **Model_Database**: The static JSON dataset containing architecture specs for ~40+ LLMs sourced from HuggingFace configs
- **GPU_Database**: The static JSON dataset containing specs for consumer, workstation, datacenter, Apple Silicon, and TPU hardware
- **Cloud_Database**: The static JSON dataset containing instance types and pricing from AWS, Azure, GCP, and specialty providers
- **Fit_Badge**: A visual indicator (green/yellow/red) showing whether a GPU can accommodate the computed VRAM requirement
- **KV_Cache**: Key-Value cache memory used during inference, calculated with GQA/MQA/MLA awareness
- **MoE**: Mixture-of-Experts architecture where total parameters differ from activated parameters
- **GQA**: Grouped Query Attention, where key-value heads are fewer than attention heads
- **MLA**: Multi-head Latent Attention, a compressed KV cache scheme used by DeepSeek models
- **Roofline_Model**: A performance estimation approach where throughput is bounded by memory bandwidth divided by active model weight size
- **VRAM_Breakdown**: A stacked-bar visualization showing the contribution of weights, KV cache, activations, and overhead to total VRAM
- **Formula_Panel**: An expandable UI section that reveals the mathematical formula and inputs used for a given calculation
- **Dark_Mode**: The application's dark color theme, detected via `prefers-color-scheme` and toggled manually, persisted in localStorage
- **Keyboard_Shortcuts**: Global keyboard shortcuts for power-user navigation (e.g., ⌘K for model search, mode switching via single keys)
- **Cluster_Recommender**: The module that recommends GPU topology, parallelism strategy, and framework based on VRAM requirements
- **Stack_Recommender**: The module that recommends OS, driver, CUDA, PyTorch, container, and monitoring stack based on selected hardware
- **Metrics_Row**: A UI component displaying tokens/sec, cost per million tokens, and time-to-first-token
- **KV_Cache_Precision**: A separate precision setting for the KV cache, independent of model weight precision
- **Advanced_Panel**: A collapsible UI section for advanced settings including framework selection, overhead tuning, and tokenizer options
- **Data_Freshness_Badge**: A UI element in the top bar showing when price/model data was last updated
- **Compare_Mode**: A side-by-side comparison view supporting up to 3 calculator configurations with diff highlighting
- **Reverse_Mode**: An inverted calculator mode where users specify hardware and see which models fit
- **Navigation_System**: The top-bar navigation linking Calculator, Compare, Reverse, Models, Hardware, and Guides pages
- **Best_Price_Badge**: A visual indicator on the cheapest cloud instance recommendation
- **GPU_Utilization_Bar**: A thin progress bar on GPU cards showing VRAM utilization percentage
- **Cost_Per_Million_Tokens**: A derived metric computed from throughput and hourly cloud cost
- **Time_To_First_Token**: An estimated latency metric for the prefill phase of inference

## Requirements

### Requirement 1: Model Weight VRAM Calculation

**User Story:** As a user, I want the calculator to compute the VRAM required for model weights at a given precision, so that I know the baseline memory footprint.

#### Acceptance Criteria

1. WHEN a user selects a model and precision, THE VRAM_Engine SHALL compute weight memory as `num_params × bytes_per_param` using the precision-to-bytes mapping: FP32=4.0, FP16/BF16=2.0, FP8=1.0, INT8=1.0, INT4=0.5, GGUF Q4_K_M=0.606, GGUF Q5_K_M=0.711, GGUF Q8_0=1.0625.
2. WHEN the selected model uses a Mixture-of-Experts architecture, THE VRAM_Engine SHALL use total parameters (all experts) for VRAM sizing and activated parameters for throughput estimation.
3. THE VRAM_Engine SHALL display the computed weight memory in gigabytes (GB) with one decimal place of precision.
4. FOR ALL valid model and precision combinations, computing weights then displaying the result SHALL produce a value equal to `num_params × bytes_per_param / 1e9` rounded to one decimal (round-trip property).

### Requirement 2: KV Cache Calculation

**User Story:** As a user, I want the calculator to compute KV cache memory for inference, so that I understand how context length and batch size affect total VRAM.

#### Acceptance Criteria

1. WHEN a user configures model, precision, context length, and batch size for inference mode, THE VRAM_Engine SHALL compute KV cache as `2 × num_layers × batch × seq_len × num_kv_heads × head_dim × bytes_per_kv_param`.
2. WHEN the selected model uses GQA, THE VRAM_Engine SHALL use `num_key_value_heads` (fewer than `num_attention_heads`) in the KV cache formula.
3. WHEN the selected model uses MQA, THE VRAM_Engine SHALL use `num_kv_heads = 1` in the KV cache formula.
4. WHEN the selected model uses MLA (Multi-head Latent Attention), THE VRAM_Engine SHALL compute KV cache as `num_layers × batch × seq_len × d_c × bytes_per_param` using the model's compressed latent dimension, and SHALL fall back to the GQA formula when `d_c` is not available.
5. THE VRAM_Engine SHALL display KV cache memory in gigabytes (GB) with two decimal places of precision.
6. WHEN context length doubles, THE VRAM_Engine SHALL compute a KV cache value that is exactly double the previous value, holding all other inputs constant (metamorphic property).

### Requirement 3: Training Memory Calculation

**User Story:** As a user, I want the calculator to compute total VRAM for training workloads including activations, gradients, and optimizer states, so that I can plan hardware for fine-tuning or pre-training.

#### Acceptance Criteria

1. WHEN the user selects fine-tune or train mode, THE VRAM_Engine SHALL compute activation memory per layer as `seq_len × batch × hidden_size × (34 + 5 × seq_len × num_attention_heads / hidden_size) × 2 bytes`.
2. WHEN gradient checkpointing is enabled, THE VRAM_Engine SHALL reduce activation memory by applying the `sqrt(num_layers)` checkpointing formula.
3. WHEN full-parameter training with mixed-precision Adam is selected, THE VRAM_Engine SHALL compute optimizer overhead as `14 × num_params` bytes (FP16 gradients + FP32 master weights + FP32 momentum + FP32 variance).
4. WHEN LoRA fine-tuning is selected, THE VRAM_Engine SHALL compute trainable parameters as `rank × (d_in + d_out)` summed over target modules, and SHALL apply gradient and optimizer costs only to trainable parameters.
5. WHEN QLoRA fine-tuning is selected, THE VRAM_Engine SHALL compute base weights at NF4 precision (approximately 0.5 bytes per parameter plus blockwise scale overhead) and adapter weights at BF16 precision.
6. THE VRAM_Engine SHALL display the total training memory as the sum of weights, activations, gradients, and optimizer states in gigabytes (GB).

### Requirement 4: Total VRAM Aggregation and Breakdown

**User Story:** As a user, I want to see the total VRAM requirement with a visual breakdown of each component, so that I understand what drives memory consumption.

#### Acceptance Criteria

1. THE VRAM_Engine SHALL compute total VRAM as the sum of weights, KV cache (inference) or activations (training), gradients (training), optimizer states (training), and a fixed overhead of approximately 1 GB for CUDA context and framework.
2. THE Calculator SHALL display a stacked-bar chart showing the contribution of each memory component (weights, KV cache or activations, gradients, optimizer states, overhead) to the total.
3. THE Calculator SHALL label each segment of the stacked-bar chart with its component name and size in GB.
4. FOR ALL valid input combinations, the sum of individual component values displayed in the breakdown SHALL equal the total VRAM value displayed (invariant property).

### Requirement 5: GPU Fit Classification

**User Story:** As a user, I want to see which GPUs can fit my workload, so that I can quickly identify viable hardware options.

#### Acceptance Criteria

1. WHEN total VRAM is computed, THE GPU_Recommender SHALL classify each GPU in the GPU_Database with a Fit_Badge: green when total VRAM is at most 80% of GPU memory, yellow when total VRAM is between 80% and 100% of GPU memory, and red when total VRAM exceeds GPU memory.
2. THE GPU_Recommender SHALL present three recommended GPUs in tiers: Budget (price under $1000, VRAM at least 12 GB), Balanced (price $1000–$3000, VRAM 16–48 GB), and Performance (price above $3000 or datacenter SKU).
3. THE GPU_Recommender SHALL display each recommended GPU with its name, VRAM, Fit_Badge, and price.
4. THE GPU_Recommender SHALL convey fit status using both an icon and text label, not color alone.
5. FOR ALL GPU classifications, a GPU classified as green SHALL have VRAM greater than or equal to the computed total VRAM, and a GPU classified as red SHALL have VRAM less than the computed total VRAM (invariant property).

### Requirement 6: Cloud Instance Recommendations

**User Story:** As a user, I want to see cloud instance options with pricing, so that I can evaluate the rent option for my workload.

#### Acceptance Criteria

1. WHEN total VRAM and GPU recommendations are computed, THE Cloud_Recommender SHALL select at least 3 cloud instances from the Cloud_Database that can accommodate the workload, sorted by on-demand hourly price ascending.
2. THE Cloud_Recommender SHALL display each instance with provider name, instance type, GPU configuration, on-demand price per hour, and spot price per hour when available.
3. THE Cloud_Recommender SHALL support filtering by cloud provider.
4. THE Cloud_Recommender SHALL include instances from both major providers (AWS, Azure, GCP) and specialty providers (Lambda, RunPod, Vast, CoreWeave) when available.

### Requirement 7: Inference Throughput Estimation

**User Story:** As a user, I want to see an estimated tokens-per-second for each recommended GPU, so that I can evaluate performance alongside cost.

#### Acceptance Criteria

1. WHEN a GPU recommendation is displayed for inference mode, THE Throughput_Estimator SHALL compute tokens per second as `memory_bandwidth_GBs / active_weights_GB × efficiency_factor`.
2. THE Throughput_Estimator SHALL use activated parameters (not total parameters) for MoE models when computing active weight size.
3. THE Throughput_Estimator SHALL apply an efficiency factor between 0.55 and 0.95 depending on the inferred runtime framework (llama.cpp: 0.55–0.70, vLLM/TGI: 0.75–0.90, TensorRT-LLM: 0.85–0.95).
4. THE Throughput_Estimator SHALL display the estimated tokens per second as a whole number.

### Requirement 8: Model Picker with Fuzzy Search

**User Story:** As a user, I want to search and select from a database of popular LLMs, so that I can quickly configure the calculator without manually entering architecture details.

#### Acceptance Criteria

1. THE Model_Picker SHALL provide a searchable dropdown containing all models in the Model_Database (approximately 40 or more models).
2. WHEN the user types into the Model_Picker, THE Model_Picker SHALL perform fuzzy matching against model names and display matching results within 100 milliseconds.
3. THE Model_Picker SHALL display model family badges (e.g., Llama, Mistral, Qwen, DeepSeek, Gemma, Phi) alongside each result.
4. WHEN a model is selected, THE Model_Picker SHALL populate all architecture parameters (layers, hidden size, attention heads, KV heads, head dimension, max context length, attention type) from the Model_Database.
5. THE Model_Picker SHALL be fully navigable using keyboard input, following ARIA 1.2 combobox patterns.

### Requirement 9: Precision Picker

**User Story:** As a user, I want to select a quantization precision for the model, so that I can see how different precisions affect VRAM and performance.

#### Acceptance Criteria

1. THE Precision_Picker SHALL offer the following precision options: FP16, BF16, INT8, INT4, GGUF Q4_K_M, GGUF Q5_K_M, GGUF Q8_0.
2. THE Precision_Picker SHALL display the bytes-per-parameter value next to each precision option.
3. WHEN the user selects a precision, THE Calculator SHALL immediately recompute all outputs using the selected precision's bytes-per-parameter value.

### Requirement 10: Context Length and Batch Size Inputs

**User Story:** As a user, I want to configure context length and batch size, so that I can model realistic workload scenarios.

#### Acceptance Criteria

1. THE Calculator SHALL provide a context length slider with a logarithmic scale ranging from 1,024 to 131,072 tokens, with snap points at powers of two.
2. THE Calculator SHALL provide a batch size input ranging from 1 to 32.
3. WHEN the user adjusts context length or batch size, THE Calculator SHALL immediately recompute all outputs.
4. THE Calculator SHALL constrain the context length slider maximum to the selected model's `maxContextLength` value from the Model_Database.

### Requirement 11: Use Case Mode Toggle

**User Story:** As a user, I want to switch between inference, fine-tune, and train modes, so that the calculator shows the relevant memory components for my workload.

#### Acceptance Criteria

1. THE Calculator SHALL provide a mode toggle with three options: Inference, Fine-tune, and Train.
2. WHEN Inference mode is selected, THE VRAM_Engine SHALL compute weights, KV cache, and overhead, and SHALL exclude activations, gradients, and optimizer states.
3. WHEN Fine-tune mode is selected, THE VRAM_Engine SHALL compute weights, activations, gradients, optimizer states, and overhead, and SHALL include LoRA/QLoRA options.
4. WHEN Train mode is selected, THE VRAM_Engine SHALL compute weights, activations, gradients, optimizer states, and overhead for full-parameter training.

### Requirement 12: Shareable URL

**User Story:** As a user, I want to share my calculator configuration via URL, so that others can see the same results.

#### Acceptance Criteria

1. THE URL_Serializer SHALL encode the current calculator state (model, precision, context length, batch size, mode) into URL query parameters.
2. WHEN a user loads a URL with valid query parameters, THE URL_Serializer SHALL restore the calculator state from those parameters and display the corresponding results.
3. THE Calculator SHALL provide a share button that copies the current shareable URL to the clipboard.
4. FOR ALL valid calculator states, encoding to URL then decoding from URL SHALL restore an equivalent calculator state (round-trip property).

### Requirement 13: Formula Transparency

**User Story:** As a user, I want to see the formulas and inputs behind every calculated value, so that I can verify the results and understand the methodology.

#### Acceptance Criteria

1. THE Calculator SHALL provide an expandable Formula_Panel for each computed output (weights, KV cache, activations, throughput, total VRAM).
2. WHEN expanded, THE Formula_Panel SHALL display the mathematical formula rendered using KaTeX, the specific input values used, and the computed result.
3. THE Formula_Panel SHALL cite the source paper or reference for each formula.

### Requirement 14: Model Database

**User Story:** As a developer, I want a structured, validated model database sourced from HuggingFace configs, so that all calculations use accurate architecture parameters.

#### Acceptance Criteria

1. THE Model_Database SHALL contain at least 40 models spanning the Llama, Mistral, Qwen, DeepSeek, Gemma, and Phi families.
2. THE Model_Database SHALL store for each model: total parameters, active parameters (for MoE), number of layers, hidden size, intermediate size, number of attention heads, number of KV heads, head dimension, vocabulary size, attention type (MHA/GQA/MQA/MLA), and maximum context length.
3. THE Model_Database SHALL be generated at build time from a curated list of HuggingFace model IDs by fetching each model's `config.json`.
4. IF a model's `config.json` is missing required fields, THEN THE build script SHALL fail the build and report the missing fields.
5. THE Model_Database SHALL support a manual override file for values not present in `config.json` (MoE active parameters, MLA compressed latent dimension, training token counts).

### Requirement 15: GPU Database

**User Story:** As a developer, I want a comprehensive GPU database covering consumer, workstation, datacenter, Apple Silicon, and TPU hardware, so that the calculator can recommend across all tiers.

#### Acceptance Criteria

1. THE GPU_Database SHALL contain at least 30 GPUs spanning NVIDIA consumer (GeForce RTX), NVIDIA workstation (RTX Ada/Pro), NVIDIA datacenter (A100, H100, H200, B100, B200), AMD (MI300X, RX 7900 XTX), and Apple Silicon (M1 through M4 variants).
2. THE GPU_Database SHALL store for each GPU: vendor, name, category, memory in GB, memory bandwidth in GB/s, FP16/BF16 TFLOPS, TDP in watts, and price (MSRP or street).
3. THE GPU_Database SHALL treat Apple Silicon unified memory as available VRAM for inference calculations.

### Requirement 16: Cloud Provider Database

**User Story:** As a developer, I want a cloud instance database with pricing from multiple providers, so that the calculator can recommend cost-effective cloud options.

#### Acceptance Criteria

1. THE Cloud_Database SHALL contain at least 25 instances from AWS, Azure, GCP, Lambda, RunPod, Vast, and CoreWeave.
2. THE Cloud_Database SHALL store for each instance: provider, instance type, GPU configuration (type and count), on-demand price per hour, spot price per hour (when available), and supported regions.
3. THE Cloud_Database SHALL include a `lastPriceUpdate` timestamp for each entry so the UI can display data freshness.

### Requirement 17: VRAM Breakdown Visualization

**User Story:** As a user, I want a clear visual breakdown of VRAM usage, so that I can see which components consume the most memory.

#### Acceptance Criteria

1. THE Calculator SHALL render a stacked-bar chart using distinct colors for each memory component: weights, KV cache, activations, gradients, optimizer states, and overhead.
2. THE Calculator SHALL label each bar segment with its component name and value in GB.
3. WHEN the user changes any input, THE Calculator SHALL update the stacked-bar chart within 200 milliseconds.

### Requirement 18: Client-Side Execution

**User Story:** As a user, I want the calculator to run entirely in my browser with no backend dependency, so that my data stays private and the app loads fast.

#### Acceptance Criteria

1. THE Calculator SHALL perform all calculations client-side using TypeScript without making network requests to a backend server.
2. THE Calculator SHALL load model, GPU, and cloud data from static JSON files bundled with the application.
3. THE Calculator SHALL be deployable as a static site to any CDN or static hosting provider (Cloudflare Pages, Vercel, Netlify).

### Requirement 19: Responsive Layout

**User Story:** As a user, I want the calculator to work on both desktop and mobile devices, so that I can use it from any device.

#### Acceptance Criteria

1. THE Calculator SHALL use a three-column layout on desktop viewports (inputs, VRAM breakdown, recommendations) and a single-column stacked layout on mobile viewports.
2. THE Calculator SHALL be usable on viewports as narrow as 375 pixels without horizontal scrolling.

### Requirement 20: Keyboard Accessibility

**User Story:** As a user who relies on keyboard navigation, I want all interactive elements to be keyboard-accessible, so that I can use the calculator without a mouse.

#### Acceptance Criteria

1. THE Calculator SHALL make all inputs, buttons, dropdowns, and expandable panels reachable and operable via keyboard (Tab, Enter, Escape, Arrow keys).
2. THE Calculator SHALL implement custom comboboxes following ARIA 1.2 combobox patterns.
3. THE Calculator SHALL respect the `prefers-reduced-motion` media query by disabling non-essential animations.
4. THE Calculator SHALL maintain a minimum contrast ratio of 4.5:1 for all text content.

### Requirement 21: Data Validation

**User Story:** As a developer, I want all database entries validated against schemas and sanity ranges, so that incorrect data does not produce misleading results.

#### Acceptance Criteria

1. THE build pipeline SHALL validate all model, GPU, and cloud JSON entries against their respective TypeScript schemas.
2. THE build pipeline SHALL reject entries with VRAM values outside the range of 1 GB to 1,024 GB.
3. IF any validation check fails, THEN THE build pipeline SHALL fail the build and report all validation errors.

### Requirement 22: Cloud Instance Table

**User Story:** As a user, I want a sortable table of cloud instances, so that I can compare options across providers and sort by price or GPU count.

#### Acceptance Criteria

1. THE Calculator SHALL display cloud instances in a sortable table with columns: provider, instance type, GPU configuration, on-demand price per hour, spot price per hour, and region.
2. WHEN the user clicks a column header, THE Calculator SHALL sort the table by that column in ascending or descending order.
3. THE Calculator SHALL allow filtering the cloud table by provider name.

### Requirement 23: Overhead and CUDA Context Memory

**User Story:** As a user, I want the calculator to account for CUDA context and framework overhead, so that the total VRAM estimate is realistic.

#### Acceptance Criteria

1. THE VRAM_Engine SHALL add approximately 1 GB of overhead for CUDA context and framework memory to every VRAM calculation.
2. THE VRAM_Engine SHALL display the overhead as a separate component in the VRAM_Breakdown.

### Requirement 24: Parser and Serializer for URL State

**User Story:** As a developer, I want a robust URL state serializer and parser, so that shareable URLs reliably encode and decode calculator configurations.

#### Acceptance Criteria

1. THE URL_Serializer SHALL serialize calculator state into query parameters using the schema: `model`, `precision`, `ctx`, `batch`, `mode`.
2. THE URL_Serializer SHALL parse query parameters back into a valid calculator state, applying default values for any missing parameters.
3. IF the URL contains an unrecognized model ID, THEN THE URL_Serializer SHALL fall back to the default model and display a notification to the user.
4. IF the URL contains an out-of-range context length, THEN THE URL_Serializer SHALL clamp the value to the selected model's maximum context length.
5. THE URL_Serializer SHALL format calculator state into a valid URL query string, and THE URL_Serializer SHALL parse that query string back into an equivalent state (round-trip property).
6. FOR ALL valid calculator states, serializing to URL then parsing from URL SHALL produce an equivalent calculator state (round-trip property).


### Requirement 25: Dark Mode

**User Story:** As a user, I want a first-class dark mode that respects my system preference and can be toggled manually, so that I can use the calculator comfortably in any lighting condition.

#### Acceptance Criteria

1. THE Calculator SHALL detect the user's system color scheme preference via `prefers-color-scheme` and apply the matching theme on first load.
2. THE Calculator SHALL provide a theme toggle button in the top bar that switches between light and dark modes.
3. WHEN the user manually toggles the theme, THE Calculator SHALL persist the preference in localStorage and apply it on subsequent visits.
4. THE Calculator SHALL apply the theme before first paint using an inline script in `<head>` to prevent a flash of unstyled content (FOUC).
5. THE Calculator SHALL synchronize theme preference across browser tabs via the `storage` event.
6. THE Calculator SHALL provide equally polished light and dark themes with appropriate color tokens for backgrounds, foregrounds, borders, accents, and data visualization colors.

### Requirement 26: Keyboard Shortcuts

**User Story:** As a power user, I want global keyboard shortcuts for common actions, so that I can navigate and operate the calculator without reaching for the mouse.

#### Acceptance Criteria

1. THE Calculator SHALL support the keyboard shortcut `⌘/Ctrl + K` to open the model search combobox.
2. THE Calculator SHALL support the keyboard shortcut `⌘/Ctrl + \` to toggle the theme.
3. THE Calculator SHALL support single-key shortcuts `i`, `s`, `f`, `t`, `r` to switch between Inference, Scale, Fine-tune, Train, and Reverse modes respectively, when no input is focused.
4. THE Calculator SHALL provide a keyboard shortcuts help modal accessible via the `?` key.
5. THE Calculator SHALL display keyboard shortcut hints next to relevant UI elements (e.g., "⌘K" next to the model picker label).

### Requirement 27: Clustering Recommendations

**User Story:** As a user, I want the calculator to recommend GPU topology, parallelism strategy, and serving framework, so that I know how to configure multi-GPU setups.

#### Acceptance Criteria

1. WHEN the computed VRAM exceeds a single GPU's capacity, THE Cluster_Recommender SHALL recommend a multi-GPU topology with the appropriate parallelism strategy (Tensor Parallelism, Pipeline Parallelism, FSDP, or ZeRO).
2. THE Cluster_Recommender SHALL recommend a serving framework (vLLM, llama.cpp, TGI, TensorRT-LLM) based on the workload mode and hardware selection.
3. THE Cluster_Recommender SHALL display recommended framework-specific launch arguments (e.g., vLLM `--tensor-parallel-size`, `--quantization`, `--max-model-len`).
4. THE Calculator SHALL display clustering recommendations in a dedicated panel below the cloud table, showing topology, framework, and alternative runtime options.

### Requirement 28: OS and Software Stack Recommendations

**User Story:** As a user, I want the calculator to recommend an OS, driver, CUDA version, PyTorch version, container setup, and monitoring stack, so that I have a complete deployment guide.

#### Acceptance Criteria

1. THE Stack_Recommender SHALL recommend an operating system, NVIDIA driver version, CUDA toolkit version, PyTorch version, container runtime, and monitoring stack based on the selected GPU generation and workload mode.
2. THE Calculator SHALL display the software stack recommendations in a dedicated panel alongside the clustering recommendations.
3. THE Stack_Recommender SHALL update recommendations when the user changes the GPU selection or workload mode.

### Requirement 29: Metrics Row

**User Story:** As a user, I want to see key performance and cost metrics (tokens/sec, cost per million tokens, time-to-first-token) at a glance, so that I can quickly evaluate a configuration's practical value.

#### Acceptance Criteria

1. THE Calculator SHALL display a metrics row below the VRAM breakdown showing three metrics: tokens per second, cost per million tokens, and time-to-first-token.
2. THE Calculator SHALL compute cost per million tokens as `(hourly_cloud_cost / (tokens_per_second × 3600)) × 1,000,000` using the cheapest recommended cloud instance.
3. THE Calculator SHALL estimate time-to-first-token based on the prefill computation for the configured context length.
4. THE Calculator SHALL display each metric with its value, unit, and a contextual subtitle (e.g., "batched vLLM · H100" for cost, "prefill 32k ctx" for TTFT).

### Requirement 30: KV Cache Precision Input

**User Story:** As a user, I want to set the KV cache precision independently from the model weight precision, so that I can model realistic configurations where KV cache uses a different quantization than weights.

#### Acceptance Criteria

1. THE Calculator SHALL provide a separate KV cache precision selector with options: FP16, INT8, and Q4.
2. WHEN the user selects a KV cache precision, THE VRAM_Engine SHALL use the selected KV cache precision's bytes-per-parameter value in the KV cache formula, independent of the model weight precision.
3. THE Calculator SHALL default the KV cache precision to FP16.

### Requirement 31: Advanced Settings Panel

**User Story:** As a user, I want access to advanced settings for framework selection, overhead tuning, and tokenizer options, so that I can fine-tune calculations for my specific setup.

#### Acceptance Criteria

1. THE Calculator SHALL provide a collapsible "Advanced" panel below the primary inputs.
2. THE Advanced_Panel SHALL include options for: serving framework selection (vLLM, llama.cpp, TGI, TensorRT-LLM), overhead multiplier adjustment, and tokenizer selection.
3. WHEN the user changes advanced settings, THE Calculator SHALL immediately recompute all outputs using the updated parameters.

### Requirement 32: Data Freshness Display

**User Story:** As a user, I want to see when the calculator's price and model data was last updated, so that I can assess the reliability of the recommendations.

#### Acceptance Criteria

1. THE Calculator SHALL display a Data_Freshness_Badge in the top bar showing the time elapsed since the last data update (e.g., "data · 4h ago").
2. THE Data_Freshness_Badge SHALL read the `lastPriceUpdate` timestamp from the data metadata file.

### Requirement 33: Compare Mode

**User Story:** As a user, I want to compare up to 3 calculator configurations side-by-side, so that I can evaluate trade-offs between different model/precision/hardware combinations.

#### Acceptance Criteria

1. THE Calculator SHALL provide a Compare mode accessible via a "Compare" button in the mode tabs bar and via the `/compare` route.
2. THE Compare_Mode SHALL support up to 3 configurations displayed side-by-side in columns.
3. THE Compare_Mode SHALL display numeric deltas between configurations with +/− signs and color coding (green for improvement, red for regression) relative to the first (anchor) configuration.
4. THE Compare_Mode SHALL show for each configuration: model name, precision, context length, total VRAM, tokens/sec, GPU fit status for key GPUs, best cloud price per hour, and cost per million tokens.
5. EACH configuration column SHALL include a mode chip, copy-config button, and remove button.

### Requirement 34: Reverse Mode

**User Story:** As a user who already owns hardware, I want to specify my GPU and see which models I can run, so that I can find the best models for my existing setup.

#### Acceptance Criteria

1. THE Calculator SHALL provide a Reverse mode accessible via the "Reverse" tab and the `/reverse` route.
2. THE Reverse_Mode SHALL accept inputs for: GPU selection (or custom VRAM amount), target context length, and workload mode (inference or fine-tune).
3. THE Reverse_Mode SHALL display a sortable grid of all models in the Model_Database with their fit status (green/yellow/red), estimated tokens/sec, and required quantization level for the selected hardware.
4. THE Reverse_Mode SHALL support filtering by model family, parameter size range, license, and modality (text/vision/embedding).

### Requirement 35: Navigation System

**User Story:** As a user, I want a consistent navigation system across all pages, so that I can easily move between the calculator, catalogs, and documentation.

#### Acceptance Criteria

1. THE Calculator SHALL provide a top-bar navigation with links to: Calculator (`/`), Compare (`/compare`), Reverse (`/reverse`), Models (`/models`), Hardware (`/hardware`), and Guides (`/guides`).
2. THE Navigation_System SHALL highlight the currently active page link.
3. THE Navigation_System SHALL collapse to a hamburger menu on mobile viewports below 1024px.

### Requirement 36: Cloud Table Enhancements

**User Story:** As a user, I want the cloud instance table to show provider logos, interconnect details, cost per million tokens, and highlight the best-priced option, so that I can make informed cloud decisions at a glance.

#### Acceptance Criteria

1. THE Cloud table SHALL display a colored provider logo (square with initials) next to each provider name.
2. THE Cloud table SHALL include an "Interconnect" column showing the interconnect type (PCIe, NVLink, NVSwitch, InfiniBand) for each instance.
3. THE Cloud table SHALL include a "$/M tok" column showing the computed cost per million tokens for each instance.
4. THE Cloud table SHALL display a "best price" badge on the instance with the lowest cost per million tokens.
5. THE Cloud table SHALL support sorting by any numeric column ($/h, Spot, $/M tok) and filtering by region.

### Requirement 37: GPU Card Utilization Visualization

**User Story:** As a user, I want each GPU recommendation card to show a utilization bar and key hardware stats, so that I can visually compare how well each GPU fits my workload.

#### Acceptance Criteria

1. EACH GPU card SHALL display a thin utilization bar (4px height) showing the percentage of GPU VRAM consumed by the workload.
2. THE utilization bar SHALL be colored green for ≤80% utilization, amber for 80–100%, and red for >100%.
3. EACH GPU card SHALL display a stats row showing memory bandwidth (GB/s), compute performance (TFLOPS), and TDP (watts).
4. EACH GPU card SHALL display the amount of free VRAM remaining and estimated tokens/sec.

### Requirement 38: Scale Mode (Inference at Scale)

**User Story:** As a user serving multiple concurrent users, I want a Scale mode that calculates required replicas and throughput for a target QPS, so that I can plan production inference deployments.

#### Acceptance Criteria

1. THE Calculator SHALL provide a Scale mode accessible via the "Scale" tab.
2. THE Scale mode SHALL accept additional inputs for: target queries per second (QPS), average output tokens per request, and concurrent users.
3. THE Scale mode SHALL compute the required number of GPU replicas as `ceil(target_output_tokens_per_second / throughput_per_GPU)` with a 20–30% headroom factor.
4. THE Scale mode SHALL display the total cluster cost per hour and cost per million tokens for the recommended configuration.

### Requirement 39: Model and Hardware Catalogs

**User Story:** As a user, I want browsable catalogs of all models and GPUs in the database, so that I can explore available options and view detailed specifications.

#### Acceptance Criteria

1. THE Calculator SHALL provide a Models catalog page (`/models`) displaying all models in the Model_Database in a filterable, sortable table with columns: name, family, parameters, context length, license, and release date.
2. THE Calculator SHALL provide a Hardware catalog page (`/hardware`) displaying all GPUs in the GPU_Database in a filterable, sortable table with columns: name, vendor, category, VRAM, bandwidth, TFLOPS, TDP, and price.
3. EACH catalog page SHALL support filtering by vendor/family and sorting by any column.

### Requirement 40: Guides and Documentation Pages

**User Story:** As a user, I want in-app documentation explaining the calculation methodology, quantization trade-offs, and deployment best practices, so that I can make informed decisions.

#### Acceptance Criteria

1. THE Calculator SHALL provide a Guides page (`/guides`) with MDX-based articles.
2. THE Guides page SHALL use a three-column layout: TOC sidebar (240px), article content (max 680px), and section anchors sidebar (180px).
3. THE Guides SHALL include at minimum: "How VRAM is calculated", "Choosing a quantization", and a Glossary article.
