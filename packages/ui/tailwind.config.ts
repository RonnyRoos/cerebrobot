import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
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
      colors: {
        'message-user': {
          bg: 'hsl(var(--color-message-user-bg))',
          text: 'hsl(var(--color-message-user-text))',
        },
        'message-agent': {
          bg: 'hsl(var(--color-message-agent-bg))',
          text: 'hsl(var(--color-message-agent-text))',
        },
        'code-block': {
          bg: 'hsl(var(--color-code-block-bg))',
          border: 'hsl(var(--color-code-block-border))',
        },
        'code-inline': {
          bg: 'hsl(var(--color-code-inline-bg))',
        },
        timestamp: 'hsl(var(--color-timestamp))',
        'chat-code-inline': 'hsl(var(--color-message-agent-text))',
        'chat-code': 'hsl(var(--color-message-agent-text))',
        link: {
          DEFAULT: 'hsl(var(--color-link))',
          hover: 'hsl(var(--color-link-hover))',
        },
        'copy-button': {
          DEFAULT: 'hsl(var(--color-copy-button))',
          success: 'hsl(var(--color-copy-button-success))',
        },
      },
      fontSize: {
        'chat-body': ['16px', { lineHeight: '1.6' }],
        'chat-code': ['14px', { lineHeight: '1.5' }],
        'chat-code-inline': ['15px', { lineHeight: '1.5' }],
        'chat-timestamp': ['13px', { lineHeight: '1.4', fontWeight: '500' }],
      },
      fontFamily: {
        mono: [
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
