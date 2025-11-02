/**
 * Vitest setup file for component tests
 * Configures testing library and custom matchers
 */

import '@testing-library/jest-dom';
import { expect } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';

// Extend Vitest expect with jest-axe matchers
expect.extend(toHaveNoViolations);
