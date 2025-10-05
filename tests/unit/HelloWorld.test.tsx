/**
 * Comprehensive unit tests for HelloWorld React component
 * Tests actual component behavior without mocks
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HelloWorld from '../../frontend/HelloWorld';

describe('HelloWorld Component', () => {
  describe('Component Rendering', () => {
    it('should render the component successfully', () => {
      const { container } = render(<HelloWorld />);
      expect(container).toBeInTheDocument();
    });

    it('should display "Hello World" text', () => {
      render(<HelloWorld />);
      const element = screen.getByText('Hello World');
      expect(element).toBeInTheDocument();
    });

    it('should render as a div element', () => {
      const { container } = render(<HelloWorld />);
      const divElement = container.querySelector('div');
      expect(divElement).toBeInTheDocument();
      expect(divElement?.tagName).toBe('DIV');
    });
  });

  describe('Props Handling', () => {
    it('should apply custom className when provided', () => {
      const customClass = 'custom-hello-class';
      const { container } = render(<HelloWorld className={customClass} />);
      const divElement = container.querySelector('div');
      expect(divElement).toHaveClass(customClass);
    });

    it('should render without className when not provided', () => {
      const { container } = render(<HelloWorld />);
      const divElement = container.querySelector('div');
      expect(divElement?.className).toBe('');
    });

    it('should handle empty string className', () => {
      const { container } = render(<HelloWorld className="" />);
      const divElement = container.querySelector('div');
      expect(divElement?.className).toBe('');
    });

    it('should handle multiple class names', () => {
      const multipleClasses = 'class1 class2 class3';
      const { container } = render(<HelloWorld className={multipleClasses} />);
      const divElement = container.querySelector('div');
      expect(divElement).toHaveClass('class1');
      expect(divElement).toHaveClass('class2');
      expect(divElement).toHaveClass('class3');
    });

    it('should handle special characters in className', () => {
      const specialClass = 'hello-world_123';
      const { container } = render(<HelloWorld className={specialClass} />);
      const divElement = container.querySelector('div');
      expect(divElement).toHaveClass(specialClass);
    });
  });

  describe('Component Structure', () => {
    it('should have correct DOM structure', () => {
      const { container } = render(<HelloWorld className="test-class" />);
      const divElement = container.querySelector('div.test-class');
      expect(divElement).toBeInTheDocument();
      expect(divElement?.textContent).toBe('Hello World');
    });

    it('should not have nested elements', () => {
      const { container } = render(<HelloWorld />);
      const divElement = container.querySelector('div');
      expect(divElement?.children.length).toBe(0);
    });

    it('should contain text node directly', () => {
      const { container } = render(<HelloWorld />);
      const divElement = container.querySelector('div');
      expect(divElement?.childNodes.length).toBe(1);
      expect(divElement?.childNodes[0].nodeType).toBe(Node.TEXT_NODE);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined className gracefully', () => {
      const { container } = render(<HelloWorld className={undefined} />);
      const divElement = container.querySelector('div');
      expect(divElement).toBeInTheDocument();
      expect(divElement?.className).toBe('');
    });

    it('should maintain consistent text content', () => {
      const { rerender } = render(<HelloWorld />);
      expect(screen.getByText('Hello World')).toBeInTheDocument();

      // Rerender with different className
      rerender(<HelloWorld className="updated" />);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should be accessible', () => {
      const { container } = render(<HelloWorld />);
      const divElement = container.querySelector('div');
      expect(divElement).toHaveTextContent('Hello World');
      // Text should be readable by screen readers
      expect(divElement?.textContent).toMatch(/Hello World/);
    });
  });

  describe('Performance Characteristics', () => {
    it('should render multiple instances without issues', () => {
      const { container } = render(
        <>
          <HelloWorld className="first" />
          <HelloWorld className="second" />
          <HelloWorld className="third" />
        </>
      );

      const firstElement = container.querySelector('.first');
      const secondElement = container.querySelector('.second');
      const thirdElement = container.querySelector('.third');

      expect(firstElement).toBeInTheDocument();
      expect(secondElement).toBeInTheDocument();
      expect(thirdElement).toBeInTheDocument();

      expect(firstElement?.textContent).toBe('Hello World');
      expect(secondElement?.textContent).toBe('Hello World');
      expect(thirdElement?.textContent).toBe('Hello World');
    });

    it('should handle rapid re-renders', () => {
      const { rerender } = render(<HelloWorld className="initial" />);

      for (let i = 0; i < 10; i++) {
        rerender(<HelloWorld className={`class-${i}`} />);
        expect(screen.getByText('Hello World')).toBeInTheDocument();
      }
    });
  });

  describe('TypeScript Type Safety', () => {
    it('should accept valid prop types', () => {
      // This test validates that TypeScript types are correctly defined
      const validProps = {
        className: 'test-class'
      };

      const { container } = render(<HelloWorld {...validProps} />);
      expect(container.querySelector('.test-class')).toBeInTheDocument();
    });

    it('should work with React.FC type', () => {
      // Validate that the component conforms to React.FC interface
      const component = <HelloWorld />;
      expect(component.type).toBe(HelloWorld);
      expect(component.props).toEqual({});
    });
  });
});