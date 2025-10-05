/**
 * Integration tests for Hello World feature
 * Tests the interaction between React component and API endpoint
 */

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HelloWorld from '../../frontend/HelloWorld';
import { helloHandler } from '../../backend/hello';

describe('Hello World Feature Integration', () => {
  describe('Component and API Data Consistency', () => {
    it('should display same text as API returns', () => {
      // Get API response
      const apiResponse = helloHandler();

      // Render component
      render(<HelloWorld />);

      // Verify they match
      const componentText = screen.getByText('Hello World').textContent;
      expect(componentText).toBe(apiResponse.message);
    });

    it('should maintain consistency across multiple instances', () => {
      const apiResponse1 = helloHandler();
      const apiResponse2 = helloHandler();

      const { container } = render(
        <>
          <HelloWorld className="first" />
          <HelloWorld className="second" />
        </>
      );

      const first = container.querySelector('.first');
      const second = container.querySelector('.second');

      expect(first?.textContent).toBe(apiResponse1.message);
      expect(second?.textContent).toBe(apiResponse2.message);
      expect(first?.textContent).toBe(second?.textContent);
    });
  });

  describe('Full Stack Hello World Flow', () => {
    it('should simulate complete flow from API to UI', () => {
      // Step 1: API call
      const apiData = helloHandler();
      expect(apiData).toBeDefined();
      expect(apiData.message).toBe('Hello World');

      // Step 2: Data transformation (if any)
      const displayData = apiData.message;

      // Step 3: UI rendering
      render(<HelloWorld />);

      // Step 4: Verify end-to-end
      const uiElement = screen.getByText(displayData);
      expect(uiElement).toBeInTheDocument();
    });

    it('should handle data flow with className', () => {
      // API provides data
      const apiResponse = helloHandler();

      // Component receives styling
      const className = 'api-data-display';

      // Render with styling
      render(<HelloWorld className={className} />);

      // Verify both data and styling
      const element = screen.getByText(apiResponse.message);
      expect(element).toHaveClass(className);
    });
  });

  describe('React Component with API Data', () => {
    let apiData: ReturnType<typeof helloHandler>;

    beforeEach(() => {
      // Fetch data before each test
      apiData = helloHandler();
    });

    it('should render API data in component', () => {
      // Create a component that would display API data
      const ComponentWithAPIData = () => {
        const data = apiData;
        return <HelloWorld className={data.message.length > 10 ? 'long-message' : 'short-message'} />;
      };

      render(<ComponentWithAPIData />);

      // Message has 11 characters, so it should have 'long-message' class
      const element = screen.getByText('Hello World');
      expect(element).toHaveClass('long-message');
    });

    it('should validate data types between API and component', () => {
      // API returns object with string message
      expect(typeof apiData).toBe('object');
      expect(typeof apiData.message).toBe('string');

      // Component accepts string className
      const { container } = render(<HelloWorld className={apiData.message.toLowerCase().replace(' ', '-')} />);

      const element = container.querySelector('.hello-world');
      expect(element).toBeInTheDocument();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle when API and UI text might differ', () => {
      const apiResponse = helloHandler();
      render(<HelloWorld />);

      // Both should say "Hello World"
      const uiText = screen.getByText('Hello World').textContent;
      expect(uiText).toBe(apiResponse.message);

      // If they were different, this would fail
      expect(uiText).not.toBe('Goodbye World');
    });

    it('should maintain data integrity', () => {
      // Get multiple API responses
      const responses = [];
      for (let i = 0; i < 5; i++) {
        responses.push(helloHandler());
      }

      // Render multiple components
      const { container } = render(
        <>
          {responses.map((_, index) => (
            <HelloWorld key={index} className={`item-${index}`} />
          ))}
        </>
      );

      // Verify all display same message
      responses.forEach((response, index) => {
        const element = container.querySelector(`.item-${index}`);
        expect(element?.textContent).toBe(response.message);
      });
    });
  });

  describe('Performance Integration', () => {
    it('should handle rapid API calls with UI updates', () => {
      const apiCalls = [];
      const startTime = performance.now();

      // Simulate rapid API calls
      for (let i = 0; i < 100; i++) {
        apiCalls.push(helloHandler());
      }

      const apiTime = performance.now() - startTime;

      // Render components for each API call
      const renderStart = performance.now();
      const { container } = render(
        <>
          {apiCalls.map((_, index) => (
            <HelloWorld key={index} className={`perf-${index}`} />
          ))}
        </>
      );

      const renderTime = performance.now() - renderStart;

      // Performance assertions
      expect(apiTime).toBeLessThan(50); // API calls should be fast
      expect(renderTime).toBeLessThan(500); // Rendering should be reasonable

      // Verify all rendered correctly
      const elements = container.querySelectorAll('[class^="perf-"]');
      expect(elements).toHaveLength(100);
    });
  });

  describe('JSON Serialization Flow', () => {
    it('should handle API to JSON to UI flow', () => {
      // Step 1: Get API response
      const apiResponse = helloHandler();

      // Step 2: Serialize (as would happen in HTTP response)
      const jsonString = JSON.stringify(apiResponse);
      expect(jsonString).toBe('{"message":"Hello World"}');

      // Step 3: Parse (as would happen in frontend)
      const parsed = JSON.parse(jsonString);

      // Step 4: Use in component
      render(<HelloWorld className={parsed.message.length.toString()} />);

      // Step 5: Verify
      const element = screen.getByText('Hello World');
      expect(element).toHaveClass('11'); // length of "Hello World"
    });
  });

  describe('Component Lifecycle with API Data', () => {
    it('should handle mounting with API data', () => {
      const apiData = helloHandler();

      const { unmount } = render(<HelloWorld />);
      expect(screen.getByText(apiData.message)).toBeInTheDocument();

      unmount();
      expect(screen.queryByText(apiData.message)).not.toBeInTheDocument();
    });

    it('should handle re-rendering with fresh API data', () => {
      const initialData = helloHandler();

      const { rerender } = render(<HelloWorld className="initial" />);
      expect(screen.getByText(initialData.message)).toHaveClass('initial');

      // Simulate new API call
      const newData = helloHandler();

      rerender(<HelloWorld className="updated" />);
      expect(screen.getByText(newData.message)).toHaveClass('updated');
    });
  });

  describe('Data Validation Integration', () => {
    it('should validate API response format for UI consumption', () => {
      const apiResponse = helloHandler();

      // Validate response structure
      expect(apiResponse).toHaveProperty('message');
      expect(Object.keys(apiResponse)).toHaveLength(1);

      // Validate message format
      expect(apiResponse.message).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);

      // Render and verify
      render(<HelloWorld />);
      const element = screen.getByText(apiResponse.message);
      expect(element).toBeInTheDocument();
    });

    it('should ensure type compatibility', () => {
      const apiResponse = helloHandler();

      // TypeScript would catch this, but let's verify runtime
      expect(typeof apiResponse.message).toBe('string');

      // Component expects optional string for className
      const classNameFromAPI = apiResponse.message.split(' ')[0].toLowerCase();

      render(<HelloWorld className={classNameFromAPI} />);
      const element = screen.getByText('Hello World');
      expect(element).toHaveClass('hello');
    });
  });
});