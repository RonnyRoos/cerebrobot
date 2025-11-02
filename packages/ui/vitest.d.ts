/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module 'vitest' {
  interface Assertion<T = any>
    extends TestingLibraryMatchers<ReturnType<typeof expect.stringContaining>, T> {
    toHaveNoViolations(): Promise<void>;
  }
  interface AsymmetricMatchersContaining
    extends TestingLibraryMatchers<ReturnType<typeof expect.stringContaining>, any> {}
}
