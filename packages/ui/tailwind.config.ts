import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      /* ========================================
         Design System Token Integration
         Extends Tailwind with CSS custom properties
         Spec: /specs/013-neon-flux-design-system/
         ======================================== */

      colors: {
        /* Basic Colors */
        white: 'hsl(var(--color-white) / <alpha-value>)',
        black: 'hsl(var(--color-black) / <alpha-value>)',

        /* Semantic Colors (prefer these in new code) */
        'text-primary': 'hsl(var(--color-text-primary) / <alpha-value>)',
        'text-secondary': 'hsl(var(--color-text-secondary) / <alpha-value>)',
        'text-tertiary': 'hsl(var(--color-text-tertiary) / <alpha-value>)',
        'text-disabled': 'hsl(var(--color-text-disabled) / <alpha-value>)',
        'text-inverse': 'hsl(var(--color-text-inverse) / <alpha-value>)',
        muted: 'hsl(var(--color-text-secondary) / <alpha-value>)', /* Alias for text-secondary */
        'muted-foreground': 'hsl(var(--color-text-tertiary) / <alpha-value>)', /* Alias for text-tertiary (placeholder text) */
        destructive: 'hsl(var(--color-error) / <alpha-value>)', /* Alias for error */
        foreground: 'hsl(var(--color-text-primary) / <alpha-value>)', /* Alias for text-primary */
        background: 'hsl(var(--color-bg-surface) / <alpha-value>)', /* Alias for bg-surface */
        input: 'hsl(var(--color-border-default) / <alpha-value>)', /* Alias for border-default */
        border: 'hsl(var(--color-border-default) / <alpha-value>)', /* Alias for border-default */
        'bg-base': 'hsl(var(--color-bg-base) / <alpha-value>)',
        'bg-surface': 'hsl(var(--color-bg-surface) / <alpha-value>)',
        'bg-elevated': 'hsl(var(--color-bg-elevated) / <alpha-value>)',
        'bg-overlay': 'hsl(var(--color-bg-overlay) / <alpha-value>)',
        'border-subtle': 'hsl(var(--color-border-subtle) / <alpha-value>)',
        'border-default': 'hsl(var(--color-border-default) / <alpha-value>)',
        'border-strong': 'hsl(var(--color-border-strong) / <alpha-value>)',
        'accent-primary': 'hsl(var(--color-accent-primary) / <alpha-value>)',
        'accent-secondary': 'hsl(var(--color-accent-secondary) / <alpha-value>)',
        'accent-tertiary': 'hsl(var(--color-accent-tertiary) / <alpha-value>)',
        'accent-quaternary': 'hsl(var(--color-accent-quaternary) / <alpha-value>)',
        success: 'hsl(var(--color-success) / <alpha-value>)',
        warning: 'hsl(var(--color-warning) / <alpha-value>)',
        error: 'hsl(var(--color-error) / <alpha-value>)',
        info: 'hsl(var(--color-info) / <alpha-value>)',

        /* Primitive Colors (for direct access when needed) */
        'purple-500': 'hsl(var(--color-purple-500) / <alpha-value>)',
        'blue-500': 'hsl(var(--color-blue-500) / <alpha-value>)',
        'pink-500': 'hsl(var(--color-pink-500) / <alpha-value>)',
        'cyan-500': 'hsl(var(--color-cyan-500) / <alpha-value>)',
        'neutral-50': 'hsl(var(--color-neutral-50) / <alpha-value>)',
        'neutral-100': 'hsl(var(--color-neutral-100) / <alpha-value>)',
        'neutral-200': 'hsl(var(--color-neutral-200) / <alpha-value>)',
        'neutral-300': 'hsl(var(--color-neutral-300) / <alpha-value>)',
        'neutral-400': 'hsl(var(--color-neutral-400) / <alpha-value>)',
        'neutral-500': 'hsl(var(--color-neutral-500) / <alpha-value>)',
        'neutral-600': 'hsl(var(--color-neutral-600) / <alpha-value>)',
        'neutral-700': 'hsl(var(--color-neutral-700) / <alpha-value>)',
        'neutral-800': 'hsl(var(--color-neutral-800) / <alpha-value>)',
        'neutral-900': 'hsl(var(--color-neutral-900) / <alpha-value>)',

        /* Backward-Compatible Chat Colors (legacy) */
        'message-user': {
          bg: 'hsl(var(--color-message-user-bg) / <alpha-value>)',
          text: 'hsl(var(--color-message-user-text) / <alpha-value>)',
        },
        'message-agent': {
          bg: 'hsl(var(--color-message-agent-bg) / <alpha-value>)',
          text: 'hsl(var(--color-message-agent-text) / <alpha-value>)',
        },
        'code-block': {
          bg: 'hsl(var(--color-code-block-bg) / <alpha-value>)',
          border: 'hsl(var(--color-code-block-border) / <alpha-value>)',
        },
        'code-inline': {
          bg: 'hsl(var(--color-code-inline-bg) / <alpha-value>)',
        },
        timestamp: 'hsl(var(--color-timestamp) / <alpha-value>)',
        'chat-code-inline': 'hsl(var(--color-message-agent-text) / <alpha-value>)',
        'chat-code': 'hsl(var(--color-message-agent-text) / <alpha-value>)',
        link: {
          DEFAULT: 'hsl(var(--color-link) / <alpha-value>)',
          hover: 'hsl(var(--color-link-hover) / <alpha-value>)',
        },
        'copy-button': {
          DEFAULT: 'hsl(var(--color-copy-button) / <alpha-value>)',
          success: 'hsl(var(--color-copy-button-success) / <alpha-value>)',
        },
      },

      spacing: {
        /* Design System Spacing (4px base unit) */
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
        10: 'var(--space-10)',
        12: 'var(--space-12)',
        16: 'var(--space-16)',
      },

      fontSize: {
        /* Design System Typography */
        xs: ['var(--font-size-xs)', { lineHeight: 'var(--line-height-normal)' }],
        sm: ['var(--font-size-sm)', { lineHeight: 'var(--line-height-normal)' }],
        base: ['var(--font-size-base)', { lineHeight: 'var(--line-height-normal)' }],
        lg: ['var(--font-size-lg)', { lineHeight: 'var(--line-height-snug)' }],
        xl: ['var(--font-size-xl)', { lineHeight: 'var(--line-height-snug)' }],
        '2xl': ['var(--font-size-2xl)', { lineHeight: 'var(--line-height-tight)' }],
        '3xl': ['var(--font-size-3xl)', { lineHeight: 'var(--line-height-tight)' }],
        '4xl': ['var(--font-size-4xl)', { lineHeight: 'var(--line-height-tight)' }],

        /* Legacy Chat Typography (backward-compatible) */
        'chat-body': ['16px', { lineHeight: '1.6' }],
        'chat-code': ['14px', { lineHeight: '1.5' }],
        'chat-code-inline': ['15px', { lineHeight: '1.5' }],
        'chat-timestamp': ['13px', { lineHeight: '1.4', fontWeight: '500' }],
      },

      fontFamily: {
        sans: ['var(--font-family-sans)'],
        mono: ['var(--font-family-mono)'],
      },

      fontWeight: {
        normal: 'var(--font-weight-normal)',
        medium: 'var(--font-weight-medium)',
        semibold: 'var(--font-weight-semibold)',
        bold: 'var(--font-weight-bold)',
        extrabold: 'var(--font-weight-extrabold)',
      },

      boxShadow: {
        /* Standard Elevation */
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',

        /* Neon Flux Glow Effects */
        'glow-purple': 'var(--shadow-glow-purple)',
        'glow-blue': 'var(--shadow-glow-blue)',
        'glow-pink': 'var(--shadow-glow-pink)',
        'glow-cyan': 'var(--shadow-glow-cyan)',

        /* Semantic Elevation */
        card: 'var(--elevation-card)',
        modal: 'var(--elevation-modal)',
        tooltip: 'var(--elevation-tooltip)',
      },

      borderRadius: {
        none: 'var(--radius-none)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },

      blur: {
        sm: 'var(--blur-sm)',
        md: 'var(--blur-md)',
        lg: 'var(--blur-lg)',
      },

      keyframes: {
        'gradient-shift': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(-10%, 10%)' },
        },
        'message-appear': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'typing-glow': {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.7' },
          '30%': { transform: 'translateY(-10px)', opacity: '1' },
        },
      },
      animation: {
        'gradient-shift': 'gradient-shift 15s ease infinite',
        'message-appear': 'message-appear 0.4s ease',
        'typing-glow': 'typing-glow 1.4s infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
