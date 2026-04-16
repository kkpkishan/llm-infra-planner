import * as React from 'react';
import { cn } from '@/lib/utils';

interface Article {
  id: string;
  title: string;
  sections: { id: string; heading: string; content: React.ReactNode }[];
}

const ARTICLES: Article[] = [
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
          <p>
            KV cache precision is independent of weight precision. You can run weights at FP16 but cache at INT8 or Q4 to save memory on long contexts. vLLM supports <code className="font-mono text-xs bg-bg-muted px-1 rounded">--kv-cache-dtype fp8</code> for further savings.
          </p>
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
