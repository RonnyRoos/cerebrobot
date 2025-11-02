import type { Config } from 'tailwindcss';
import baseConfig from '@workspace/ui/tailwind.config';

const config: Config = {
  presets: [baseConfig],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
