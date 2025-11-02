import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
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
        timestamp: 'hsl(var(--color-timestamp))',
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
