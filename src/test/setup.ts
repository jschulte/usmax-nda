/**
 * Vitest Test Setup
 * Configures global test utilities and matchers
 */

import '@testing-library/jest-dom/vitest';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  if (typeof document !== 'undefined') {
    cleanup();
  }
});
