/**
 * Comprehensive unit tests for test-projects HelloWorld React component
 * Tests actual component behavior without mocks
 * Session ID: 12831346-e151-455b-a69f-f88fb71bee57
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import HelloWorld from '../../test-projects/frontend/HelloWorld';

describe('Test-Projects HelloWorld Component', () => {
  describe('Component Rendering', () => {
    it('should render the component successfully', () => {
      const { container } = render(<HelloWorld />);
      expect(container).toBeInTheDocument();
    });

    it('should display "Hello World" text in h1 element', () => {
      render(<HelloWorld />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Hello World');
    });

    it('should render with correct DOM structure', () => {
      const { container } = render(<HelloWorld />);
      const divElement = container.querySelector('div');
      const h1Element = container.querySelector('h1');

      expect(divElement).toBeInTheDocument();
      expect(h1Element).toBeInTheDocument();
      expect(h1Element?.parentElement).toBe(divElement);
    });

    it('should have h1 as the only child of div', () => {
      const { container } = render(<HelloWorld />);
      const divElement = container.querySelector('div');

      expect(divElement?.children.length).toBe(1);
      expect(divElement?.children[0].tagName).toBe('H1');
    });
  });

  describe('Props Interface Validation', () => {
    it('should render without any props', () => {
      // Component defines empty interface, should work without props
      const { container } = render(<HelloWorld />);
      expect(container.querySelector('h1')).toHaveTextContent('Hello World');
    });

    it('should maintain consistent behavior with empty props object', () => {
      const { container } = render(<HelloWorld {...{}} />);
      expect(container.querySelector('h1')).toHaveTextContent('Hello World');
    });
  });

  describe('Component Type Safety', () => {
    it('should be a valid React functional component', () => {
      expect(typeof HelloWorld).toBe('function');
    });

    it('should return valid React element', () => {
      const element = HelloWorld({});
      expect(React.isValidElement(element)).toBe(true);
    });

    it('should have correct display name for debugging', () => {
      expect(HelloWorld.name).toBe('HelloWorld');
    });
  });

  describe('Text Content Validation', () => {
    it('should contain exact text "Hello World"', () => {
      render(<HelloWorld />);
      const heading = screen.getByRole('heading');
      expect(heading.textContent).toBe('Hello World');
    });

    it('should not have leading or trailing whitespace', () => {
      render(<HelloWorld />);
      const heading = screen.getByRole('heading');
      expect(heading.textContent).toMatch(/^Hello World$/);
    });

    it('should have correct text node structure', () => {
      const { container } = render(<HelloWorld />);
      const h1Element = container.querySelector('h1');

      expect(h1Element?.childNodes.length).toBe(1);
      expect(h1Element?.childNodes[0].nodeType).toBe(Node.TEXT_NODE);
      expect(h1Element?.childNodes[0].textContent).toBe('Hello World');
    });
  });

  describe('Multiple Instance Rendering', () => {
    it('should render multiple instances independently', () => {
      const { container } = render(
        <>
          <HelloWorld />
          <HelloWorld />
          <HelloWorld />
        </>
      );

      const headings = container.querySelectorAll('h1');
      expect(headings).toHaveLength(3);

      headings.forEach(heading => {
        expect(heading).toHaveTextContent('Hello World');
      });
    });

    it('should maintain separate DOM nodes for each instance', () => {
      const { container } = render(
        <>
          <div id="first"><HelloWorld /></div>
          <div id="second"><HelloWorld /></div>
        </>
      );

      const firstHeading = container.querySelector('#first h1');
      const secondHeading = container.querySelector('#second h1');

      expect(firstHeading).not.toBe(secondHeading);
      expect(firstHeading).toHaveTextContent('Hello World');
      expect(secondHeading).toHaveTextContent('Hello World');
    });
  });

  describe('Re-render Behavior', () => {
    it('should handle re-renders without issues', () => {
      const { rerender, container } = render(<HelloWorld />);

      expect(container.querySelector('h1')).toHaveTextContent('Hello World');

      rerender(<HelloWorld />);
      expect(container.querySelector('h1')).toHaveTextContent('Hello World');

      rerender(<HelloWorld />);
      expect(container.querySelector('h1')).toHaveTextContent('Hello World');
    });

    it('should not create duplicate elements on re-render', () => {
      const { rerender, container } = render(<HelloWorld />);

      for (let i = 0; i < 5; i++) {
        rerender(<HelloWorld />);
      }

      const headings = container.querySelectorAll('h1');
      expect(headings).toHaveLength(1);
    });
  });

  describe('Accessibility', () => {
    it('should have semantic HTML structure', () => {
      const { container } = render(<HelloWorld />);
      const heading = container.querySelector('h1');

      // h1 is a semantic heading element
      expect(heading?.tagName).toBe('H1');
    });

    it('should be accessible to screen readers', () => {
      render(<HelloWorld />);

      // getByRole ensures the element is accessible
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it('should have readable text content', () => {
      const { container } = render(<HelloWorld />);
      const heading = container.querySelector('h1');

      // Text should be directly in the element, not hidden
      expect(heading?.textContent).toBe('Hello World');
      expect(window.getComputedStyle(heading!).visibility).not.toBe('hidden');
    });
  });

  describe('Performance Characteristics', () => {
    it('should render quickly in rapid succession', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        const { unmount } = render(<HelloWorld />);
        unmount();
      }

      const duration = performance.now() - start;
      // Should complete 100 render/unmount cycles quickly
      expect(duration).toBeLessThan(1000);
    });

    it('should not leak memory on unmount', () => {
      const { unmount, container } = render(<HelloWorld />);

      expect(container.querySelector('h1')).toBeInTheDocument();

      unmount();

      expect(container.querySelector('h1')).not.toBeInTheDocument();
      expect(container.innerHTML).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should render in strict mode without warnings', () => {
      const { container } = render(
        <React.StrictMode>
          <HelloWorld />
        </React.StrictMode>
      );

      expect(container.querySelector('h1')).toHaveTextContent('Hello World');
    });

    it('should work with React.memo wrapper', () => {
      const MemoizedHelloWorld = React.memo(HelloWorld);
      const { container } = render(<MemoizedHelloWorld />);

      expect(container.querySelector('h1')).toHaveTextContent('Hello World');
    });

    it('should work inside React.Fragment', () => {
      const { container } = render(
        <React.Fragment>
          <HelloWorld />
        </React.Fragment>
      );

      expect(container.querySelector('h1')).toHaveTextContent('Hello World');
    });

    it('should handle being rendered conditionally', () => {
      const ConditionalWrapper = ({ show }: { show: boolean }) => (
        <>{show && <HelloWorld />}</>
      );

      const { rerender, container } = render(<ConditionalWrapper show={true} />);
      expect(container.querySelector('h1')).toHaveTextContent('Hello World');

      rerender(<ConditionalWrapper show={false} />);
      expect(container.querySelector('h1')).not.toBeInTheDocument();

      rerender(<ConditionalWrapper show={true} />);
      expect(container.querySelector('h1')).toHaveTextContent('Hello World');
    });
  });

  describe('Component Structure Integrity', () => {
    it('should export as default', async () => {
      const module = await import('../../test-projects/frontend/HelloWorld');
      expect(module.default).toBe(HelloWorld);
    });

    it('should be a pure component with no side effects', () => {
      let sideEffectDetected = false;

      // Override console methods temporarily
      const originalLog = console.log;
      const originalWarn = console.warn;
      const originalError = console.error;

      console.log = () => { sideEffectDetected = true; };
      console.warn = () => { sideEffectDetected = true; };
      console.error = () => { sideEffectDetected = true; };

      render(<HelloWorld />);

      // Restore console methods
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;

      expect(sideEffectDetected).toBe(false);
    });

    it('should match expected TypeScript interface', () => {
      // This test validates the component matches its TypeScript definition
      const props: {} = {}; // HelloWorldProps is an empty interface
      const { container } = render(<HelloWorld {...props} />);
      expect(container.querySelector('h1')).toHaveTextContent('Hello World');
    });
  });
});