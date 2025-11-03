import type { Preview } from '@storybook/react-vite';
import { ThemeProvider } from '../src/theme/theme-provider';
import '../src/theme/globals.css';
import '../src/theme/tokens/primitives.css';
import '../src/theme/tokens/semantic.css';
import '../src/theme/tokens/component.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true, // Use our own theme system
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default preview;