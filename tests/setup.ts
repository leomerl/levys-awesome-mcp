import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage for tests
const localStorageMock: Storage = {
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => {},
  removeItem: (key: string) => {},
  clear: () => {},
  key: (index: number) => null,
  length: 0,
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock matchMedia for theme detection tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});

// Mock CSS custom properties
const mockSetProperty = vi.fn();
const mockClassList = {
  add: vi.fn(),
  remove: vi.fn(),
  contains: vi.fn(),
  toggle: vi.fn(),
};

Object.defineProperty(document.documentElement, 'style', {
  value: {
    setProperty: mockSetProperty,
    getPropertyValue: vi.fn((prop: string) => ''),
  },
  writable: true,
});

Object.defineProperty(document.documentElement, 'classList', {
  value: mockClassList,
  writable: true,
});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockSetProperty.mockClear();
  mockClassList.add.mockClear();
  mockClassList.remove.mockClear();
  mockClassList.contains.mockClear();
  mockClassList.toggle.mockClear();
});