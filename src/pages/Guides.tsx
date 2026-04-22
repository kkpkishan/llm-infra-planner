import * as React from 'react';
import { cn } from '@/lib/utils';

interface Article {
  id: string;
  title: string;
  sections: { id: string; heading: string; content: React.ReactNode }[];
}

const ARTICLES: Article[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    sections: [
      {
        id: 'overview',
        heading: 'Overview',
        content: (
          <>
            <p>
              LLMcalc is a precision-first calculator for estimating GPU memory, throughput, latency, and cloud costs for any LLM workload. Everything runs in your browser — no backend, no telemetry, no account required.
            </p>
            <p className="mt-2">
              The calculator supports two workflows:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li><strong>Model-First</strong> — Select a model, then see which GPUs can run it</li>
              <li><strong>Hardware-First</strong> — Select your GPU, then see which models fit</li>
            </ul>
          </>
        ),
      },
      {
        id: 'model-first-workflow',
        heading: 'Model-First Workflow',
        content: (
          <>
            <p>This is the default workflow. Start by selecting a model:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm mt-2">
              <li>Click the model picker or press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-bg-muted border border-border-subtle rounded">⌘K</kbd></li>
              <li>Search for your model (fuzzy search supported)</li>
              <li>Select precision (FP16, INT8, INT4, GGUF formats)</li>
              <li>Set context length and batch size</li>
              <li>View VRAM breakdown and GPU recommendations</li>
            </ol>
            <p className="mt-2">
              The calculator shows three GPU tiers: <strong>Budget</strong> (lowest cost), <strong>Balanced</strong> (best value), and <strong>Performance</strong> (highest throughput).
            </p>
          </>
        ),
      },
      {
        id: 'hardware-first-workflow',
        heading: 'Hardware-First Workflow',
        content: (
          <>
            <p>If you already have hardware, use the hardware-first workflow:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm mt-2">
              <li>Expand the "Hardware-First Selection" section</li>
              <li>Select your GPU from the dropdown</li>
              <li>View model suggestions sorted by fit status (green = fits, yellow = tight, red = overflow)</li>
              <li>Click a suggested model to select it</li>
            </ol>
            <p className="mt-2">
              This workflow is also available on the <strong>Reverse</strong> page, which shows all 513 models in a sortable table.
            </p>
          </>
        ),
      },
      {
        id: 'workload-modes',
        heading: 'Workload Modes',
        content: (
          <>
            <p>Switch between modes using the tabs or keyboard shortcuts:</p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li><strong>Inference</strong> <kbd className="px-1.5 py-0.5 text-xs font-mono bg-bg-muted border border-border-subtle rounded">i</kbd> — Weights + KV cache + overhead</li>
              <li><strong>Train</strong> <kbd className="px-1.5 py-0.5 text-xs font-mono bg-bg-muted border border-border-subtle rounded">t</kbd> — Full training with activations, gradients, optimizer states</li>
            </ul>
            <p className="mt-2">
              Training mode supports <strong>Full Fine-tune</strong>, <strong>LoRA</strong>, and <strong>QLoRA</strong> methods.
            </p>
          </>
        ),
      },
      {
        id: 'sharing-configs',
        heading: 'Sharing Configurations',
        content: (
          <>
            <p>
              Your entire configuration is encoded in the URL. Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-bg-muted border border-border-subtle rounded">⌘↵</kbd> to copy the share link.
            </p>
            <p className="mt-2">
              The URL includes: model, precision, KV precision, context length, batch size, mode, concurrent users, and SLO targets.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: 'how-vram-is-calculated',
    title: 'How VRAM is Calculated',
    sections: [
      {
        id: 'overview',
        heading: 'Overview',
        content: (
          <p>
            Total VRAM is the sum of four components: <strong>model weights</strong>, <strong>KV cache</strong> (inference) or <strong>activations + gradients + optimizer states</strong> (training), and a fixed <strong>overhead</strong> of ~1 GB for CUDA context and framework.
          </p>
        ),
      },
      {
        id: 'weight-memory',
        heading: 'Weight Memory',
        content: (
          <>
            <p>Weight memory is the simplest component:</p>
            <pre className="bg-bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto mt-2">
              W = num_params × bytes_per_param / 1e9
            </pre>
            <p className="mt-2">
              For a 70B model at FP16 (2 bytes/param): <code className="font-mono text-xs bg-bg-muted px-1 rounded">70e9 × 2 / 1e9 = 140 GB</code>.
            </p>
            <p className="mt-2">Precision mapping:</p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-1">
              <li>FP32 — 4.0 bytes/param</li>
              <li>FP16 / BF16 — 2.0 bytes/param</li>
              <li>INT8 / FP8 — 1.0 bytes/param</li>
              <li>INT4 — 0.5 bytes/param</li>
              <li>GGUF Q4_K_M — 0.606 bytes/param</li>
              <li>GGUF Q5_K_M — 0.711 bytes/param</li>
              <li>GGUF Q8_0 — 1.0625 bytes/param</li>
            </ul>
          </>
        ),
      },
      {
        id: 'kv-cache',
        heading: 'KV Cache',
        content: (
          <>
            <p>The KV cache stores key and value tensors for each token in the context window:</p>
            <pre className="bg-bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto mt-2">
              KV = 2 × L × B × S × H_kv × D_head × bytes_per_kv / 1e9
            </pre>
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li><code className="font-mono text-xs bg-bg-muted px-1 rounded">L</code> — number of layers</li>
              <li><code className="font-mono text-xs bg-bg-muted px-1 rounded">B</code> — batch size</li>
              <li><code className="font-mono text-xs bg-bg-muted px-1 rounded">S</code> — sequence length (context)</li>
              <li><code className="font-mono text-xs bg-bg-muted px-1 rounded">H_kv</code> — KV heads (GQA reduces this)</li>
              <li><code className="font-mono text-xs bg-bg-muted px-1 rounded">D_head</code> — head dimension</li>
            </ul>
            <p className="mt-2">
              GQA (Grouped Query Attention) reduces KV heads below attention heads, significantly cutting KV cache. MLA (DeepSeek) uses a compressed latent dimension instead.
            </p>
            <p className="mt-2">
              <strong>KV Cache Precision</strong> is independent of weight precision. You can run weights at FP16 but cache at INT8 or FP8 to save memory on long contexts.
            </p>
          </>
        ),
      },
      {
        id: 'training-memory',
        heading: 'Training Memory',
        content: (
          <>
            <p>Training adds three components on top of weights:</p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li><strong>Activations</strong> — intermediate tensors needed for backprop. Gradient checkpointing reduces this by √L.</li>
              <li><strong>Gradients</strong> — same size as weights (FP16).</li>
              <li><strong>Optimizer states</strong> — mixed-precision Adam: 14 × num_params bytes (FP16 grads + FP32 master weights + FP32 momentum + FP32 variance).</li>
            </ul>
            <p className="mt-2">LoRA only applies gradients and optimizer to the adapter parameters, dramatically reducing training VRAM.</p>
          </>
        ),
      },
      {
        id: 'multi-gpu-vram',
        heading: 'Multi-GPU VRAM',
        content: (
          <>
            <p>When using multiple GPUs, VRAM is distributed based on the parallelism strategy:</p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li><strong>Tensor Parallelism (TP)</strong> — Weights and KV cache split evenly across all GPUs</li>
              <li><strong>Pipeline Parallelism (PP)</strong> — Weights split by layers, KV cache per stage</li>
              <li><strong>ZeRO-3</strong> — Weights sharded, activations replicated (same as TP for VRAM)</li>
              <li><strong>MoE Expert Parallelism</strong> — Attention weights on every GPU, expert weights sharded</li>
            </ul>
            <p className="mt-2">
              The calculator shows both <strong>per-GPU VRAM</strong> and <strong>total cluster VRAM</strong> in the breakdown.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: 'choosing-quantization',
    title: 'Choosing a Quantization',
    sections: [
      {
        id: 'when-to-quantize',
        heading: 'When to Quantize',
        content: (
          <p>
            Quantization trades a small amount of model quality for significant VRAM savings. Use FP16/BF16 when you have enough VRAM and need maximum quality. Use INT8 for a ~2× memory reduction with minimal quality loss. Use INT4 or GGUF Q4_K_M when running on consumer hardware.
          </p>
        ),
      },
      {
        id: 'gguf-formats',
        heading: 'GGUF Formats',
        content: (
          <>
            <p>GGUF is the format used by llama.cpp. The K-quants use mixed precision per tensor:</p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li><strong>Q4_K_M</strong> — 0.606 bytes/param. Best quality-to-size ratio for most use cases.</li>
              <li><strong>Q5_K_M</strong> — 0.711 bytes/param. Better quality, slightly larger.</li>
              <li><strong>Q8_0</strong> — 1.0625 bytes/param. Near-lossless, good for benchmarking.</li>
            </ul>
          </>
        ),
      },
      {
        id: 'kv-cache-precision',
        heading: 'KV Cache Precision',
        content: (
          <>
            <p>
              KV cache precision is independent of weight precision. You can run weights at FP16 but cache at INT8 or FP8 to save memory on long contexts.
            </p>
            <p className="mt-2">
              vLLM supports <code className="font-mono text-xs bg-bg-muted px-1 rounded">--kv-cache-dtype fp8</code> for further savings. The calculator shows a KV cache curve chart to visualize memory usage across different context lengths.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: 'advanced-features',
    title: 'Advanced Features',
    sections: [
      {
        id: 'concurrent-users',
        heading: 'Concurrent User Capacity',
        content: (
          <>
            <p>
              The <strong>Concurrency</strong> panel estimates how many concurrent users your deployment can serve while meeting SLO targets.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li><strong>TTFT (Time to First Token)</strong> — Prefill latency target (default: 500ms)</li>
              <li><strong>TPOT (Time Per Output Token)</strong> — Decode latency target (default: 50ms)</li>
              <li><strong>Batch Mode</strong> — Toggle between online and offline batch processing</li>
            </ul>
            <p className="mt-2">
              The calculator shows a latency curve chart, bottleneck indicator (memory vs throughput vs prefill), and replica scaling table.
            </p>
          </>
        ),
      },
      {
        id: 'parallelism',
        heading: 'Parallelism Strategies',
        content: (
          <>
            <p>
              The <strong>Parallelism</strong> panel helps you configure multi-GPU deployments:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li><strong>Tensor Parallelism (TP)</strong> — Splits weight matrices across GPUs. Requires fast NVLink interconnect.</li>
              <li><strong>Pipeline Parallelism (PP)</strong> — Splits model layers across GPUs. Works with slower interconnects.</li>
              <li><strong>ZeRO-3</strong> — Shards optimizer states, gradients, and weights. Best for training.</li>
              <li><strong>MoE Expert Parallelism</strong> — Shards expert weights while keeping attention on all GPUs.</li>
            </ul>
            <p className="mt-2">
              Use the GPU slider (1-512 GPUs) to see per-GPU VRAM and cluster topology visualization.
            </p>
          </>
        ),
      },
      {
        id: 'speculative-decoding',
        heading: 'Speculative Decoding',
        content: (
          <>
            <p>
              Speculative decoding uses a small draft model to predict multiple tokens, then verifies with the target model in parallel.
            </p>
            <p className="mt-2">Supported methods:</p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li><strong>Draft Model</strong> — Use a smaller model (e.g., 1B) to draft for a larger model (e.g., 70B)</li>
              <li><strong>Medusa</strong> — Multiple decoding heads predict future tokens</li>
              <li><strong>EAGLE-2 / EAGLE-3</strong> — Auto-regressive draft heads</li>
              <li><strong>Lookahead</strong> — N-gram based speculation</li>
              <li><strong>Prompt Lookup</strong> — Reuse tokens from the prompt</li>
            </ul>
            <p className="mt-2">
              The calculator estimates speedup (1.5-3×) and additional VRAM overhead.
            </p>
          </>
        ),
      },
      {
        id: 'training-methods',
        heading: 'Training Methods',
        content: (
          <>
            <p>
              Training mode supports three methods:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li><strong>Full Fine-tune</strong> — Train all parameters. Requires 14× model size for optimizer states.</li>
              <li><strong>LoRA</strong> — Train low-rank adapter matrices. Reduces VRAM by 10-100×.</li>
              <li><strong>QLoRA</strong> — LoRA with base weights quantized to NF4. Enables fine-tuning on consumer GPUs.</li>
            </ul>
            <p className="mt-2">
              Configure LoRA rank, alpha, and target modules. The calculator shows trainable parameter count and VRAM savings.
            </p>
          </>
        ),
      },
      {
        id: 'cloud-cost-analysis',
        heading: 'Cloud Cost Analysis',
        content: (
          <>
            <p>
              The cloud table shows 37 instances from 8 providers: AWS, Azure, GCP, Lambda, RunPod, Vast, CoreWeave, and Together AI.
            </p>
            <p className="mt-2">Metrics include:</p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li><strong>On-demand hourly cost</strong> — Pay-as-you-go pricing</li>
              <li><strong>Spot hourly cost</strong> — Discounted preemptible instances</li>
              <li><strong>Cost per 1M tokens</strong> — Efficiency metric for inference workloads</li>
              <li><strong>Breakeven hours</strong> — When on-prem capex equals cloud opex</li>
            </ul>
            <p className="mt-2">
              Use the currency picker to view costs in USD, EUR, GBP, JPY, CNY, INR, or BRL.
            </p>
          </>
        ),
      },
      {
        id: 'tco-analysis',
        heading: 'Total Cost of Ownership',
        content: (
          <>
            <p>
              The <strong>TCO</strong> panel compares on-prem vs cloud costs over 3 years:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li><strong>Capex</strong> — GPU purchase cost (MSRP or street price)</li>
              <li><strong>Electricity</strong> — TDP-based power draw × electricity rate × PUE</li>
              <li><strong>Colocation</strong> — Rack space, cooling, network</li>
              <li><strong>Staff</strong> — DevOps / SRE labor</li>
            </ul>
            <p className="mt-2">
              The calculator shows breakeven point and 3-year total cost for both options.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: 'compare-mode',
    title: 'Compare Mode',
    sections: [
      {
        id: 'adding-configs',
        heading: 'Adding Configurations',
        content: (
          <>
            <p>
              Compare up to 3 configurations side-by-side. Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-bg-muted border border-border-subtle rounded">c</kbd> or click the Compare button to add the current config.
            </p>
            <p className="mt-2">
              Each config is editable in the compare drawer. Change model, precision, context, or batch size independently.
            </p>
          </>
        ),
      },
      {
        id: 'delta-metrics',
        heading: 'Delta Metrics',
        content: (
          <>
            <p>
              Numeric deltas are shown relative to the anchor config (first column):
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li><strong className="text-green-600 dark:text-green-400">Green</strong> — Improvement (lower VRAM, lower cost, higher throughput)</li>
              <li><strong className="text-red-600 dark:text-red-400">Red</strong> — Regression (higher VRAM, higher cost, lower throughput)</li>
            </ul>
            <p className="mt-2">
              Metrics include: VRAM, throughput, cloud cost, cost per 1M tokens, and GPU utilization.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    sections: [
      {
        id: 'shortcuts-list',
        heading: 'All Shortcuts',
        content: (
          <>
            <p>Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-bg-muted border border-border-subtle rounded">?</kbd> to see all shortcuts.</p>
            <dl className="space-y-2 mt-3">
              {[
                ['⌘K', 'Open model search'],
                ['⌘\\', 'Toggle dark / light mode'],
                ['⌘↵', 'Copy share URL'],
                ['?', 'Show keyboard shortcuts'],
                ['Esc', 'Close dialog / drawer'],
                ['i', 'Switch to Inference mode'],
                ['t', 'Switch to Train mode'],
                ['r', 'Go to Reverse page'],
                ['c', 'Add config to compare'],
                ['g → m', 'Go to Models catalog'],
                ['g → h', 'Go to Hardware catalog'],
              ].map(([keys, desc]) => (
                <div key={keys as string} className="flex items-start gap-3">
                  <dt className="text-xs font-mono bg-bg-muted px-1.5 py-0.5 rounded border border-border-subtle flex-shrink-0">{keys}</dt>
                  <dd className="text-sm text-fg-muted">{desc}</dd>
                </div>
              ))}
            </dl>
          </>
        ),
      },
    ],
  },
  {
    id: 'glossary',
    title: 'Glossary',
    sections: [
      {
        id: 'terms',
        heading: 'Terms',
        content: (
          <dl className="space-y-3">
            {[
              ['VRAM', 'Video RAM — the GPU memory used to store model weights, KV cache, and activations.'],
              ['GQA', 'Grouped Query Attention — uses fewer KV heads than attention heads, reducing KV cache size.'],
              ['MQA', 'Multi-Query Attention — extreme GQA with a single KV head shared across all attention heads.'],
              ['MLA', 'Multi-head Latent Attention — DeepSeek\'s compressed KV cache using a low-rank latent space.'],
              ['MoE', 'Mixture of Experts — architecture where only a subset of parameters are active per token.'],
              ['LoRA', 'Low-Rank Adaptation — fine-tuning method that trains small adapter matrices instead of full weights.'],
              ['QLoRA', 'Quantized LoRA — LoRA with base weights quantized to NF4, enabling fine-tuning on consumer GPUs.'],
              ['Roofline Model', 'Performance model where throughput is bounded by memory bandwidth / active weight size.'],
              ['Tensor Parallelism', 'Splits individual weight matrices across GPUs, requiring fast NVLink interconnect.'],
              ['Pipeline Parallelism', 'Splits model layers across GPUs, suitable for slower interconnects.'],
              ['ZeRO', 'Zero Redundancy Optimizer — shards optimizer states, gradients, and weights across GPUs.'],
              ['TTFT', 'Time to First Token — prefill latency, the time to generate the first output token.'],
              ['TPOT', 'Time Per Output Token — decode latency, the time to generate each subsequent token.'],
              ['SLO', 'Service Level Objective — target latency or throughput for production deployments.'],
              ['Speculative Decoding', 'Uses a draft model to predict multiple tokens, then verifies in parallel.'],
              ['Gradient Checkpointing', 'Trades compute for memory by recomputing activations during backprop.'],
              ['NVLink', 'NVIDIA\'s high-bandwidth GPU interconnect (up to 900 GB/s per GPU).'],
              ['InfiniBand', 'High-speed network fabric for distributed training (400-800 Gbps).'],
            ].map(([term, def]) => (
              <div key={term as string}>
                <dt className="text-sm font-semibold text-fg-primary">{term}</dt>
                <dd className="text-sm text-fg-muted mt-0.5">{def}</dd>
              </div>
            ))}
          </dl>
        ),
      },
    ],
  },
];

export function Guides() {
  const [activeArticle, setActiveArticle] = React.useState(ARTICLES[0].id);
  const [activeSection, setActiveSection] = React.useState(ARTICLES[0].sections[0].id);

  const article = ARTICLES.find(a => a.id === activeArticle) ?? ARTICLES[0];

  // Scroll spy
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.find(e => e.isIntersecting);
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    article.sections.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [article]);

  return (
    <div className="max-w-[1760px] mx-auto px-4 md:px-6 py-6">
      <div className="flex gap-8">

        {/* TOC sidebar — 240px sticky */}
        <nav className="hidden lg:flex flex-col gap-1 w-60 flex-shrink-0 sticky top-24 self-start h-fit" aria-label="Guide navigation">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted mb-2 px-2">Guides</h2>
          {ARTICLES.map(a => (
            <button
              key={a.id}
              onClick={() => { setActiveArticle(a.id); setActiveSection(a.sections[0].id); window.scrollTo({ top: 0 }); }}
              className={cn(
                'text-left text-sm px-2 py-1.5 rounded-md transition-colors',
                activeArticle === a.id
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-fg-muted hover:text-fg-default hover:bg-bg-muted'
              )}
            >
              {a.title}
            </button>
          ))}
        </nav>

        {/* Article content — max 680px */}
        <article className="flex-1 max-w-[680px] prose prose-sm dark:prose-invert min-w-0">
          <h1 className="text-2xl font-semibold text-fg-primary mb-6 not-prose">{article.title}</h1>
          {article.sections.map(section => (
            <section key={section.id} id={section.id} className="mb-8 not-prose">
              <h2 className="text-base font-semibold text-fg-primary mb-3">{section.heading}</h2>
              <div className="text-sm text-fg-default leading-relaxed space-y-2">
                {section.content}
              </div>
            </section>
          ))}
        </article>

        {/* Section anchors sidebar — 180px sticky */}
        <nav className="hidden xl:flex flex-col gap-1 w-44 flex-shrink-0 sticky top-24 self-start h-fit" aria-label="Section navigation">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted mb-2 px-2">On this page</h2>
          {article.sections.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                'text-xs px-2 py-1 rounded transition-colors',
                activeSection === s.id
                  ? 'text-accent font-medium'
                  : 'text-fg-muted hover:text-fg-default'
              )}
            >
              {s.heading}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
