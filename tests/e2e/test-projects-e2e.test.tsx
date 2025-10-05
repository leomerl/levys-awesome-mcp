/**
 * End-to-End tests for test-projects components
 * Tests complete user workflows without mocks
 * Session ID: 12831346-e151-455b-a69f-f88fb71bee57
 */

import React from 'react';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import HelloWorld from '../../test-projects/frontend/HelloWorld';
import { handler as helloHandler } from '../../test-projects/backend/hello';

describe('Test-Projects E2E Workflow Tests', () => {
  describe('Complete Application Flow', () => {
    it('should simulate complete user journey from load to interaction', async () => {
      // Simulate full application with API integration
      const FullApplication = () => {
        const [apiData, setApiData] = React.useState<{ message: string } | null>(null);
        const [isLoading, setIsLoading] = React.useState(true);
        const [refreshCount, setRefreshCount] = React.useState(0);

        const fetchData = React.useCallback(async () => {
          setIsLoading(true);
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 10));
          const response = helloHandler();
          setApiData(response);
          setIsLoading(false);
        }, []);

        React.useEffect(() => {
          fetchData();
        }, [fetchData, refreshCount]);

        const handleRefresh = () => {
          setRefreshCount(prev => prev + 1);
        };

        return (
          <div data-testid="app-container">
            <header>
              <HelloWorld />
            </header>

            <main>
              {isLoading ? (
                <div data-testid="loading">Loading data...</div>
              ) : (
                <div data-testid="content">
                  <p data-testid="api-message">
                    Message from API: {apiData?.message}
                  </p>
                  <button
                    data-testid="refresh-button"
                    onClick={handleRefresh}
                  >
                    Refresh Data
                  </button>
                  <p data-testid="refresh-count">
                    Refreshed {refreshCount} times
                  </p>
                </div>
              )}
            </main>
          </div>
        );
      };

      const { container } = render(<FullApplication />);

      // Step 1: Verify initial loading state
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.getByRole('heading')).toHaveTextContent('Hello World');

      // Step 2: Wait for data to load
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
        expect(screen.getByTestId('content')).toBeInTheDocument();
      });

      // Step 3: Verify loaded content
      expect(screen.getByTestId('api-message')).toHaveTextContent(
        'Message from API: Hello World'
      );
      expect(screen.getByTestId('refresh-count')).toHaveTextContent(
        'Refreshed 0 times'
      );

      // Step 4: User interaction - click refresh
      const refreshButton = screen.getByTestId('refresh-button');
      fireEvent.click(refreshButton);

      // Step 5: Verify refresh behavior
      await waitFor(() => {
        expect(screen.getByTestId('refresh-count')).toHaveTextContent(
          'Refreshed 1 times'
        );
      });

      // Step 6: Multiple refreshes
      fireEvent.click(refreshButton);
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByTestId('refresh-count')).toHaveTextContent(
          'Refreshed 3 times'
        );
      });

      // Step 7: Verify data consistency after refreshes
      expect(screen.getByTestId('api-message')).toHaveTextContent(
        'Message from API: Hello World'
      );
    });

    it('should handle complete form submission workflow', async () => {
      // Simulate a form that uses the API
      const FormWorkflow = () => {
        const [formData, setFormData] = React.useState({ name: '' });
        const [submittedData, setSubmittedData] = React.useState<any>(null);
        const [apiGreeting, setApiGreeting] = React.useState('');

        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();

          // Get greeting from API
          const apiResponse = helloHandler();

          // Combine with form data
          const result = {
            greeting: apiResponse.message,
            name: formData.name,
            timestamp: Date.now()
          };

          setSubmittedData(result);
          setApiGreeting(apiResponse.message);
        };

        return (
          <div>
            <HelloWorld />

            <form onSubmit={handleSubmit} data-testid="greeting-form">
              <input
                data-testid="name-input"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ name: e.target.value })}
                placeholder="Enter your name"
              />
              <button type="submit" data-testid="submit-button">
                Get Greeting
              </button>
            </form>

            {submittedData && (
              <div data-testid="result">
                <p data-testid="personalized-greeting">
                  {apiGreeting}, {submittedData.name}!
                </p>
                <p data-testid="submission-time">
                  Submitted at: {new Date(submittedData.timestamp).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        );
      };

      render(<FormWorkflow />);

      // Step 1: Verify initial state
      expect(screen.getByRole('heading')).toHaveTextContent('Hello World');
      expect(screen.getByTestId('name-input')).toHaveValue('');
      expect(screen.queryByTestId('result')).not.toBeInTheDocument();

      // Step 2: Fill in form
      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: 'Alice' } });
      expect(nameInput).toHaveValue('Alice');

      // Step 3: Submit form
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      // Step 4: Verify result
      await waitFor(() => {
        expect(screen.getByTestId('result')).toBeInTheDocument();
        expect(screen.getByTestId('personalized-greeting')).toHaveTextContent(
          'Hello World, Alice!'
        );
      });

      // Step 5: Submit again with different name
      fireEvent.change(nameInput, { target: { value: 'Bob' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('personalized-greeting')).toHaveTextContent(
          'Hello World, Bob!'
        );
      });
    });
  });

  describe('Multi-Component Interaction Flow', () => {
    it('should handle complex multi-component workflow', async () => {
      // Dashboard with multiple integrated components
      const Dashboard = () => {
        const [stats, setStats] = React.useState({
          apiCalls: 0,
          componentRenders: 0,
          lastMessage: ''
        });

        const incrementApiCalls = () => {
          const response = helloHandler();
          setStats(prev => ({
            ...prev,
            apiCalls: prev.apiCalls + 1,
            lastMessage: response.message
          }));
        };

        React.useEffect(() => {
          setStats(prev => ({
            ...prev,
            componentRenders: prev.componentRenders + 1
          }));
        });

        return (
          <div data-testid="dashboard">
            <section data-testid="header-section">
              <HelloWorld />
            </section>

            <section data-testid="stats-section">
              <h2>Dashboard Stats</h2>
              <p data-testid="api-calls">API Calls: {stats.apiCalls}</p>
              <p data-testid="render-count">Renders: {stats.componentRenders}</p>
              <p data-testid="last-message">Last Message: {stats.lastMessage}</p>
            </section>

            <section data-testid="actions-section">
              <button
                data-testid="call-api-button"
                onClick={incrementApiCalls}
              >
                Call API
              </button>
            </section>
          </div>
        );
      };

      const { rerender } = render(<Dashboard />);

      // Initial state verification
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hello World');
      expect(screen.getByTestId('api-calls')).toHaveTextContent('API Calls: 0');
      expect(screen.getByTestId('render-count')).toHaveTextContent('Renders: 1');

      // Trigger API call
      fireEvent.click(screen.getByTestId('call-api-button'));

      await waitFor(() => {
        expect(screen.getByTestId('api-calls')).toHaveTextContent('API Calls: 1');
        expect(screen.getByTestId('last-message')).toHaveTextContent(
          'Last Message: Hello World'
        );
      });

      // Multiple API calls
      fireEvent.click(screen.getByTestId('call-api-button'));
      fireEvent.click(screen.getByTestId('call-api-button'));

      await waitFor(() => {
        expect(screen.getByTestId('api-calls')).toHaveTextContent('API Calls: 3');
      });

      // Force re-render
      rerender(<Dashboard />);

      await waitFor(() => {
        const renderCount = screen.getByTestId('render-count').textContent;
        expect(parseInt(renderCount?.match(/\d+/)?.[0] || '0')).toBeGreaterThan(1);
      });
    });
  });

  describe('Error Recovery Flow', () => {
    it('should handle and recover from errors in complete workflow', async () => {
      const ErrorRecoveryApp = () => {
        const [error, setError] = React.useState<string | null>(null);
        const [attempts, setAttempts] = React.useState(0);
        const [data, setData] = React.useState<{ message: string } | null>(null);

        const fetchDataWithErrorHandling = async () => {
          try {
            setAttempts(prev => prev + 1);

            // Simulate intermittent failure
            if (attempts === 1) {
              throw new Error('Network error');
            }

            const response = helloHandler();
            setData(response);
            setError(null);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setData(null);
          }
        };

        React.useEffect(() => {
          fetchDataWithErrorHandling();
        }, []); // eslint-disable-line react-hooks/exhaustive-deps

        return (
          <div data-testid="error-recovery-app">
            <HelloWorld />

            {error ? (
              <div data-testid="error-state">
                <p data-testid="error-message">Error: {error}</p>
                <button
                  data-testid="retry-button"
                  onClick={fetchDataWithErrorHandling}
                >
                  Retry
                </button>
                <p data-testid="attempt-count">Attempts: {attempts}</p>
              </div>
            ) : data ? (
              <div data-testid="success-state">
                <p data-testid="success-message">Success: {data.message}</p>
                <p data-testid="attempt-count">Attempts: {attempts}</p>
              </div>
            ) : (
              <div data-testid="loading-state">Loading...</div>
            )}
          </div>
        );
      };

      render(<ErrorRecoveryApp />);

      // Should show error on first attempt
      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
        expect(screen.getByTestId('error-message')).toHaveTextContent(
          'Error: Network error'
        );
        expect(screen.getByTestId('attempt-count')).toHaveTextContent('Attempts: 1');
      });

      // Retry should succeed
      fireEvent.click(screen.getByTestId('retry-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
        expect(screen.getByTestId('success-state')).toBeInTheDocument();
        expect(screen.getByTestId('success-message')).toHaveTextContent(
          'Success: Hello World'
        );
        expect(screen.getByTestId('attempt-count')).toHaveTextContent('Attempts: 2');
      });
    });
  });

  describe('Performance E2E Test', () => {
    it('should handle high-frequency updates efficiently', async () => {
      const PerformanceApp = () => {
        const [updates, setUpdates] = React.useState(0);
        const [messages, setMessages] = React.useState<string[]>([]);
        const [isRunning, setIsRunning] = React.useState(false);

        const runPerformanceTest = () => {
          setIsRunning(true);
          const interval = setInterval(() => {
            setUpdates(prev => {
              const newCount = prev + 1;
              if (newCount >= 10) {
                clearInterval(interval);
                setIsRunning(false);
              }
              return newCount;
            });

            const response = helloHandler();
            setMessages(prev => [...prev.slice(-9), response.message]);
          }, 50);
        };

        return (
          <div data-testid="performance-app">
            <HelloWorld />

            <div data-testid="performance-stats">
              <p data-testid="update-count">Updates: {updates}</p>
              <p data-testid="message-count">Messages: {messages.length}</p>
              <p data-testid="running-status">
                Status: {isRunning ? 'Running' : 'Idle'}
              </p>
            </div>

            <button
              data-testid="start-test"
              onClick={runPerformanceTest}
              disabled={isRunning}
            >
              Start Performance Test
            </button>

            <div data-testid="message-list">
              {messages.map((msg, idx) => (
                <div key={idx} data-testid={`message-${idx}`}>
                  {msg}
                </div>
              ))}
            </div>
          </div>
        );
      };

      render(<PerformanceApp />);

      // Initial state
      expect(screen.getByTestId('update-count')).toHaveTextContent('Updates: 0');
      expect(screen.getByTestId('running-status')).toHaveTextContent('Status: Idle');

      // Start performance test
      fireEvent.click(screen.getByTestId('start-test'));

      // Wait for test to complete
      await waitFor(() => {
        expect(screen.getByTestId('running-status')).toHaveTextContent('Status: Idle');
      }, { timeout: 2000 });

      // Verify results
      expect(screen.getByTestId('update-count')).toHaveTextContent('Updates: 10');
      expect(screen.getByTestId('message-count')).toHaveTextContent('Messages: 10');

      // Verify all messages are correct
      const messageElements = screen.getAllByTestId(/message-\d+/);
      expect(messageElements).toHaveLength(10);
      messageElements.forEach(element => {
        expect(element).toHaveTextContent('Hello World');
      });
    });
  });
});