import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ThemeProvider } from '@workspace/ui';
import '@workspace/ui/theme';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element #root not found');
}

const root = createRoot(container);
root.render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
