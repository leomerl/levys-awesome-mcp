import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class MCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private timeout = 10000; // Default 10 seconds
  private pendingRequests = new Map<string | number, {
    resolve: (value: MCPResponse) => void;
    reject: (error: Error) => void;
  }>();

  async start(command: string, args: string[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let buffer = '';
      
      this.process.stdout?.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response: MCPResponse = JSON.parse(line);
              this.handleResponse(response);
            } catch (error) {
              console.error('Failed to parse response:', line);
            }
          }
        }
      });

      this.process.stderr?.on('data', (data) => {
        const message = data.toString();
        if (message.includes('server running')) {
          resolve();
        }
      });

      this.process.on('error', reject);
      this.process.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      setTimeout(resolve, 1000);
    });
  }

  async call(method: string, params?: any): Promise<MCPResponse> {
    if (!this.process) {
      throw new Error('Client not started');
    }

    const id = ++this.requestId;
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      const requestStr = JSON.stringify(request) + '\n';
      this.process!.stdin?.write(requestStr);

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, this.timeout);
    });
  }

  setTimeout(ms: number): void {
    this.timeout = ms;
  }

  private handleResponse(response: MCPResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      this.pendingRequests.delete(response.id);
      pending.resolve(response);
    }
  }

  async stop(): Promise<void> {
    if (this.process) {
      // Clear pending requests first
      for (const [id, pending] of this.pendingRequests) {
        pending.reject(new Error('Client stopped'));
      }
      this.pendingRequests.clear();

      this.process.kill();
      this.process = null;
    }
  }
}