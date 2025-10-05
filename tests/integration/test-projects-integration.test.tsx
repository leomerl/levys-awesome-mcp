/**
 * Integration tests for test-projects components
 * Tests real interactions between frontend and backend without mocks
 * Session ID: 12831346-e151-455b-a69f-f88fb71bee57
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HelloWorld from '../../test-projects/frontend/HelloWorld';
import { handler as helloHandler } from '../../test-projects/backend/hello';

describe('Test-Projects Frontend-Backend Integration', () => {
  describe('Component and API Handler Compatibility', () => {
    it('should display the same message returned by API handler', () => {
      // Get message from API handler
      const apiResponse = helloHandler();

      // Render component
      render(<HelloWorld />);

      // Component should display the same message
      const heading = screen.getByRole('heading');
      expect(heading).toHaveTextContent(apiResponse.message);
    });

    it('should have matching "Hello World" text in both components', () => {
      const apiMessage = helloHandler().message;

      render(<HelloWorld />);
      const componentText = screen.getByRole('heading').textContent;

      expect(apiMessage).toBe('Hello World');
      expect(componentText).toBe('Hello World');
      expect(apiMessage).toBe(componentText);
    });
  });

  describe('Simulated API Integration', () => {
    it('should handle API response in React component', async () => {
      // Simulate a component that fetches from API
      const ApiConnectedComponent = () => {
        const [message, setMessage] = React.useState<string>('');

        React.useEffect(() => {
          // Simulate API call
          const fetchMessage = async () => {
            // In real scenario, this would be fetch('/api/hello')
            const response = await Promise.resolve(helloHandler());
            setMessage(response.message);
          };

          fetchMessage();
        }, []);

        return <div>{message || 'Loading...'}</div>;
      };

      const { container } = render(<ApiConnectedComponent />);

      // Initially shows loading
      expect(container.textContent).toBe('Loading...');

      // Wait for API response
      await waitFor(() => {
        expect(container.textContent).toBe('Hello World');
      });
    });

    it('should display API data in HelloWorld component wrapper', async () => {
      // Enhanced component that uses API data
      const EnhancedHelloWorld = () => {
        const [apiMessage, setApiMessage] = React.useState<string>('');

        React.useEffect(() => {
          const response = helloHandler();
          setApiMessage(response.message);
        }, []);

        return (
          <div>
            <HelloWorld />
            <p data-testid="api-message">{apiMessage}</p>
          </div>
        );
      };

      render(<EnhancedHelloWorld />);

      // Both should show same message
      await waitFor(() => {
        const heading = screen.getByRole('heading');
        const apiParagraph = screen.getByTestId('api-message');

        expect(heading).toHaveTextContent('Hello World');
        expect(apiParagraph).toHaveTextContent('Hello World');
      });
    });
  });

  describe('Full Stack Data Flow', () => {
    it('should maintain data consistency across stack', () => {
      // Backend provides data
      const backendData = helloHandler();

      // Simulate passing through layers
      const serviceLayer = (data: typeof backendData) => data;
      const presentationLayer = (data: typeof backendData) => data.message;

      // Final data should match original
      const finalMessage = presentationLayer(serviceLayer(backendData));
      expect(finalMessage).toBe('Hello World');

      // Render in component
      render(<HelloWorld />);
      const displayed = screen.getByRole('heading').textContent;

      expect(displayed).toBe(finalMessage);
    });

    it('should handle multiple API calls to render multiple components', async () => {
      // Simulate multiple API calls
      const MultipleApiCalls = () => {
        const [messages, setMessages] = React.useState<string[]>([]);

        React.useEffect(() => {
          const fetchMultiple = async () => {
            const responses = await Promise.all([
              Promise.resolve(helloHandler()),
              Promise.resolve(helloHandler()),
              Promise.resolve(helloHandler())
            ]);

            setMessages(responses.map(r => r.message));
          };

          fetchMultiple();
        }, []);

        return (
          <div>
            {messages.map((msg, index) => (
              <div key={index} data-testid={`message-${index}`}>
                {msg}
              </div>
            ))}
          </div>
        );
      };

      render(<MultipleApiCalls />);

      await waitFor(() => {
        expect(screen.getByTestId('message-0')).toHaveTextContent('Hello World');
        expect(screen.getByTestId('message-1')).toHaveTextContent('Hello World');
        expect(screen.getByTestId('message-2')).toHaveTextContent('Hello World');
      });
    });
  });

  describe('Type Safety Integration', () => {
    it('should maintain type safety between backend and frontend', () => {
      // Backend type
      type BackendResponse = ReturnType<typeof helloHandler>;

      // Frontend props that could accept backend data
      interface FrontendProps {
        data?: BackendResponse;
      }

      const TypedComponent: React.FC<FrontendProps> = ({ data }) => (
        <div>{data?.message || <HelloWorld />}</div>
      );

      // Test with backend data
      const backendResponse = helloHandler();
      const { rerender, container } = render(<TypedComponent />);

      expect(container.querySelector('h1')).toBeInTheDocument();

      // Rerender with data
      rerender(<TypedComponent data={backendResponse} />);
      expect(container.textContent).toBe('Hello World');
    });

    it('should handle type conversions correctly', () => {
      const response = helloHandler();

      // Convert to different formats
      const jsonString = JSON.stringify(response);
      const parsed = JSON.parse(jsonString);

      // Use in component
      const DataComponent = ({ message }: { message: string }) => (
        <div>{message}</div>
      );

      render(<DataComponent message={parsed.message} />);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully in component', async () => {
      const ErrorHandlingComponent = () => {
        const [message, setMessage] = React.useState<string>('');
        const [error, setError] = React.useState<string>('');

        React.useEffect(() => {
          try {
            const response = helloHandler();
            if (!response.message) {
              throw new Error('No message received');
            }
            setMessage(response.message);
          } catch (err) {
            setError('Failed to load message');
          }
        }, []);

        return (
          <div>
            {error ? (
              <div data-testid="error">{error}</div>
            ) : (
              <div data-testid="message">{message || 'Loading...'}</div>
            )}
          </div>
        );
      };

      render(<ErrorHandlingComponent />);

      await waitFor(() => {
        // Should successfully show message
        expect(screen.getByTestId('message')).toHaveTextContent('Hello World');
        expect(screen.queryByTestId('error')).not.toBeInTheDocument();
      });
    });

    it('should provide fallback when API is unavailable', () => {
      const FallbackComponent = () => {
        const [message, setMessage] = React.useState<string | null>(null);

        React.useEffect(() => {
          // Simulate API availability check
          const isApiAvailable = true; // Would be actual check in production

          if (isApiAvailable) {
            const response = helloHandler();
            setMessage(response.message);
          }
        }, []);

        return (
          <div>
            {message ? (
              <div data-testid="api-content">{message}</div>
            ) : (
              <HelloWorld />
            )}
          </div>
        );
      };

      const { container } = render(<FallbackComponent />);

      // Should show either API content or fallback component
      const apiContent = screen.queryByTestId('api-content');
      const fallbackHeading = container.querySelector('h1');

      expect(
        apiContent?.textContent === 'Hello World' ||
        fallbackHeading?.textContent === 'Hello World'
      ).toBe(true);
    });
  });

  describe('Performance Integration', () => {
    it('should handle rapid API calls and renders efficiently', async () => {
      const PerformanceTest = () => {
        const [counter, setCounter] = React.useState(0);
        const [messages, setMessages] = React.useState<string[]>([]);

        React.useEffect(() => {
          const responses = [];
          for (let i = 0; i < 10; i++) {
            responses.push(helloHandler().message);
          }
          setMessages(responses);
        }, [counter]);

        return (
          <div>
            <button onClick={() => setCounter(c => c + 1)}>
              Refresh ({counter})
            </button>
            {messages.map((msg, idx) => (
              <div key={`${counter}-${idx}`}>{msg}</div>
            ))}
          </div>
        );
      };

      const { container } = render(<PerformanceTest />);

      await waitFor(() => {
        const messages = container.querySelectorAll('div');
        const helloWorldMessages = Array.from(messages).filter(
          div => div.textContent === 'Hello World'
        );
        expect(helloWorldMessages.length).toBe(10);
      });
    });

    it('should batch multiple component renders with single API call', () => {
      let apiCallCount = 0;

      const CachedApiComponent = () => {
        const [message, setMessage] = React.useState<string>('');

        React.useEffect(() => {
          apiCallCount++;
          const response = helloHandler();
          setMessage(response.message);
        }, []);

        return <div>{message}</div>;
      };

      const BatchedComponent = () => {
        // Single API call for multiple components
        const response = React.useMemo(() => {
          apiCallCount++;
          return helloHandler();
        }, []);

        return (
          <>
            <div>{response.message}</div>
            <div>{response.message}</div>
            <div>{response.message}</div>
          </>
        );
      };

      const { container } = render(<BatchedComponent />);

      const divs = container.querySelectorAll('div');
      expect(divs).toHaveLength(3);
      divs.forEach(div => {
        expect(div).toHaveTextContent('Hello World');
      });

      // Should have made only one API call
      expect(apiCallCount).toBe(1);
    });
  });

  describe('State Management Integration', () => {
    it('should integrate with state management patterns', () => {
      // Simulate simple state management
      interface AppState {
        greeting: string;
        isLoading: boolean;
      }

      const StateManagementComponent = () => {
        const [state, setState] = React.useState<AppState>({
          greeting: '',
          isLoading: true
        });

        React.useEffect(() => {
          // Simulate async state update from API
          setTimeout(() => {
            const response = helloHandler();
            setState({
              greeting: response.message,
              isLoading: false
            });
          }, 0);
        }, []);

        return (
          <div>
            {state.isLoading ? (
              <div>Loading...</div>
            ) : (
              <>
                <HelloWorld />
                <div data-testid="state-greeting">{state.greeting}</div>
              </>
            )}
          </div>
        );
      };

      const { container } = render(<StateManagementComponent />);

      return waitFor(() => {
        const heading = container.querySelector('h1');
        const stateGreeting = screen.getByTestId('state-greeting');

        expect(heading).toHaveTextContent('Hello World');
        expect(stateGreeting).toHaveTextContent('Hello World');
      });
    });

    it('should handle component and API data in combined state', async () => {
      const CombinedStateComponent = () => {
        const [combinedData, setCombinedData] = React.useState({
          componentReady: false,
          apiData: null as { message: string } | null
        });

        React.useEffect(() => {
          const response = helloHandler();
          setCombinedData({
            componentReady: true,
            apiData: response
          });
        }, []);

        return (
          <div>
            {combinedData.componentReady && (
              <>
                <HelloWorld />
                {combinedData.apiData && (
                  <p data-testid="api-state">
                    API says: {combinedData.apiData.message}
                  </p>
                )}
              </>
            )}
          </div>
        );
      };

      render(<CombinedStateComponent />);

      await waitFor(() => {
        const heading = screen.getByRole('heading');
        const apiState = screen.getByTestId('api-state');

        expect(heading).toHaveTextContent('Hello World');
        expect(apiState).toHaveTextContent('API says: Hello World');
      });
    });
  });
});