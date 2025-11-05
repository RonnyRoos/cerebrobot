import { addons } from 'storybook/manager-api';
import { themes } from 'storybook/theming';

/**
 * Storybook Manager Configuration
 *
 * Configures the Storybook UI theme to match Cerebrobot's Neon Flux design system.
 * Uses dark mode by default for consistency with the application's primary aesthetic.
 */
addons.setConfig({
  theme: themes.dark,
});
