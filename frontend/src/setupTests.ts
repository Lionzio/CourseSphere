// frontend/src/setupTests.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global mocks genéricos para prevenir erros no JSDOM com bibliotecas de gráficos (Recharts) e canvas
window.ResizeObserver =
  window.ResizeObserver ||
  vi.fn().mockImplementation(() => ({
    disconnect: vi.fn(),
    observe: vi.fn(),
    unobserve: vi.fn(),
  }));