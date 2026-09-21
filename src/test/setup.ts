import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement ResizeObserver, which Recharts' ResponsiveContainer
// (first used in Phase 11's dashboard, and again by Phase 12's reports)
// requires to measure its container. A minimal no-op stub is enough for
// tests — they don't depend on real resize behavior, just on the chart
// rendering without throwing "ResizeObserver is not defined".
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub;
