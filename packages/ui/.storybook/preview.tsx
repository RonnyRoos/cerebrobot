/**
 * Storybook Preview Configuration
 * 
 * Purpose: Configure Storybook with Neon Flux theme
 * Strategy: Simple decorator that applies theme class without SSR blocking
 * 
 * Industry Best Practice: Material-UI, Chakra, Radix all use lightweight
 * decorators for Storybook rather than full production theme providers
 */

import type { Preview } from '@storybook/react';
import React, { useEffect } from 'react';
import { themes } from 'storybook/theming';
import { Theme } from '../src/theme/theme-provider';
import '../src/theme/globals.css';
import './storybook.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true, // Let theme handle backgrounds via CSS
    },
    docs: {
      theme: themes.dark,
    },
    layout: 'padded',
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'dark',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'dark', icon: 'moon', title: 'Dark' },
          { value: 'light', icon: 'sun', title: 'Light' },
          { value: 'high-contrast', icon: 'contrast', title: 'High Contrast' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'dark';

      useEffect(() => {
        // Apply theme class to document root and preview root
        const root = document.documentElement;
        const previewRoot = document.querySelector('.sb-show-main');
        
        root.classList.remove('theme-dark', 'theme-light', 'theme-high-contrast', 'dark');
        root.classList.add(`theme-${theme}`);
        
        // Add .dark for backward compatibility
        if (theme === 'dark') {
          root.classList.add('dark');
        }

        if (previewRoot) {
          previewRoot.classList.add(`theme-${theme}`);
        }
      }, [theme]);

      return (
        <Theme defaultTheme={theme as 'dark' | 'light' | 'high-contrast'} disablePersistence>
          <Story />
        </Theme>
      );
    },
  ],
};

export default preview;