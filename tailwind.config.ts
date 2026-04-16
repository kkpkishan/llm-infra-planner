import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '3xs': ['0.625rem', { lineHeight: '0.875rem' }],
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.375rem' }],
        md: ['0.9375rem', { lineHeight: '1.5rem' }],
      },
      colors: {
        bg: {
          base: 'var(--bg-base)',
          subtle: 'var(--bg-subtle)',
          muted: 'var(--bg-muted)',
          emphasis: 'var(--bg-emphasis)',
        },
        fg: {
          muted: 'var(--fg-muted)',
          DEFAULT: 'var(--fg-default)',
          primary: 'var(--fg-primary)',
          inverse: 'var(--fg-inverse)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
        accent: {
          subtle: 'var(--accent-subtle)',
          muted: 'var(--accent-muted)',
          DEFAULT: 'var(--accent-default)',
          emphasis: 'var(--accent-emphasis)',
          strong: 'var(--accent-strong)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--info)',
        viz: {
          weights: 'var(--viz-weights)',
          kv: 'var(--viz-kv)',
          activations: 'var(--viz-activations)',
          gradients: 'var(--viz-gradients)',
          optimizer: 'var(--viz-optimizer)',
          overhead: 'var(--viz-overhead)',
          free: 'var(--viz-free)',
        },
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      transitionDuration: {
        fast: '120ms',
        base: '160ms',
        slow: '240ms',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      ringColor: {
        DEFAULT: 'var(--ring)',
      },
    },
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('tailwindcss-animate'),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@tailwindcss/typography'),
  ],
}

export default config
