// FIXED Nov 2025: Browser compatibility check
// EventEmitter is only available in Node.js, not in browser
// Implement simple EventEmitter shim for browser environment

let EventEmitter: any;

if (typeof window === 'undefined') {
    // Node.js environment - use native EventEmitter
    try {
        EventEmitter = require('events').EventEmitter;
    } catch (e) {
        // Fallback to shim if import fails
        EventEmitter = class {
            private listeners: Map<string, Function[]> = new Map();
            on(event: string, listener: Function) {
                if (!this.listeners.has(event)) this.listeners.set(event, []);
                this.listeners.get(event)!.push(listener);
            }
            emit(event: string, ...args: any[]) {
                const eventListeners = this.listeners.get(event);
                if (eventListeners) eventListeners.forEach(fn => fn(...args));
                return eventListeners ? eventListeners.length > 0 : false;
            }
            removeAllListeners() { this.listeners.clear(); }
        };
    }
} else {
    // Browser environment - use complete shim
    // FIX BUG-010: Add missing EventEmitter methods
    EventEmitter = class {
        private listeners: Map<string, Function[]> = new Map();
        private onceListeners: Map<string, Set<Function>> = new Map();

        on(event: string, listener: Function) {
            if (!this.listeners.has(event)) this.listeners.set(event, []);
            this.listeners.get(event)!.push(listener);
            return this;
        }

        once(event: string, listener: Function) {
            if (!this.onceListeners.has(event)) {
                this.onceListeners.set(event, new Set());
            }
            this.onceListeners.get(event)!.add(listener);

            // Also add to regular listeners
            if (!this.listeners.has(event)) this.listeners.set(event, []);
            this.listeners.get(event)!.push(listener);

            return this;
        }

        off(event: string, listener: Function) {
            const eventListeners = this.listeners.get(event);
            if (eventListeners) {
                const index = eventListeners.indexOf(listener);
                if (index !== -1) {
                    eventListeners.splice(index, 1);
                }
            }

            // Remove from once listeners too
            const onceSet = this.onceListeners.get(event);
            if (onceSet) {
                onceSet.delete(listener);
            }

            return this;
        }

        emit(event: string, ...args: any[]) {
            const eventListeners = this.listeners.get(event);
            const onceSet = this.onceListeners.get(event);

            if (eventListeners) {
                eventListeners.forEach(fn => {
                    fn(...args);

                    // Remove if it was a once listener
                    if (onceSet && onceSet.has(fn)) {
                        this.off(event, fn);
                        onceSet.delete(fn);
                    }
                });
            }

            return eventListeners ? eventListeners.length > 0 : false;
        }

        removeListener(event: string, listener: Function) {
            return this.off(event, listener);
        }

        removeAllListeners(event?: string) {
            if (event) {
                this.listeners.delete(event);
                this.onceListeners.delete(event);
            } else {
                this.listeners.clear();
                this.onceListeners.clear();
            }
            return this;
        }

        listenerCount(event: string): number {
            const eventListeners = this.listeners.get(event);
            return eventListeners ? eventListeners.length : 0;
        }

        listeners(event: string): Function[] {
            return this.listeners.get(event) || [];
        }

        eventNames(): string[] {
            return Array.from(this.listeners.keys());
        }
    };
}

export interface MCPServer {
    name: string;
    capabilities: string[];
    transport: 'stdio' | 'websocket' | 'sse';
    source: {
        path: string;
        entrypoint: string;
    };
    environment?: Record<string, string>;
    status: 'connected' | 'disconnected' | 'error';
}

export interface MCPTool {
    name: string;
    description: string;
    inputSchema: any;
    server: string;
}

interface MCPResource {
    uri: string;
    name: string;
    description: string;
    mimeType: string;
}

interface MCPClient {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    callTool(name: string, args: any): Promise<any>;
    listTools(): Promise<MCPTool[]>;
    listResources(): Promise<MCPResource[]>;
    readResource(uri: string): Promise<any>;
}

export class MCPBridge extends EventEmitter {
    declare emit: (eventName: string | symbol, ...args: any[]) => boolean;

    private servers: Map<string, MCPServer> = new Map();
    private clients: Map<string, MCPClient> = new Map();
    private availableTools: Map<string, MCPTool> = new Map();

    constructor() {
        super();
    }

    async initialize(serverConfigs: Omit<MCPServer, 'status'>[]): Promise<void> {
        for (const config of serverConfigs) {
            await this.registerServer(config);
        }
        await this.discoverTools();
    }

    async registerServer(config: Omit<MCPServer, 'status'>): Promise<void> {
        const serverConfigWithStatus: MCPServer = { ...config, status: 'disconnected' };
        try {
            this.servers.set(config.name, serverConfigWithStatus);
            const client = await this.createClient(serverConfigWithStatus);
            await client.connect();
            this.clients.set(config.name, client);
            this.servers.set(config.name, { ...config, status: 'connected' });
            this.emit('serverConnected', config.name);
        } catch (error) {
            this.servers.set(config.name, { ...config, status: 'error' });
            this.emit('serverError', config.name, error);
            throw error;
        }
    }

    private async createClient(config: MCPServer): Promise<MCPClient> {
        // FIXED Nov 2025: Check if we're in browser environment
        const isBrowser = typeof window !== 'undefined';

        switch (config.transport) {
            case 'stdio':
                if (isBrowser) {
                    console.warn('[MCPBridge] Stdio transport is not supported in browser. MCPBridge will be disabled.');
                    throw new Error('Stdio transport is not supported in a browser environment.');
                }
                // In Node.js, stdio would work but we don't have the implementation here
                throw new Error('Stdio transport not implemented in this build.');
            case 'websocket':
                if (!isBrowser && typeof WebSocket === 'undefined') {
                    throw new Error('WebSocket not available in this environment.');
                }
                return new WebSocketMCPClient(config);
            case 'sse':
                if (!isBrowser && typeof EventSource === 'undefined') {
                    throw new Error('EventSource (SSE) not available in this environment.');
                }
                return new SSEMCPClient(config);
            default:
                throw new Error(`Unsupported transport: ${config.transport}`);
        }
    }

    async discoverTools(): Promise<void> {
        this.availableTools.clear();
        for (const [serverName, client] of this.clients) {
            try {
                const tools = await client.listTools();
                tools.forEach(tool => {
                    this.availableTools.set(`${serverName}:${tool.name}`, { ...tool, server: serverName });
                });
            } catch (error) {
                console.error(`Failed to discover tools from ${serverName}:`, error);
            }
        }
        this.emit('toolsDiscovered', Array.from(this.availableTools.values()));
    }

    async callTool(toolName: string, args: any, serverName?: string): Promise<any> {
        let fullToolName: string;

        if (serverName) {
            fullToolName = `${serverName}:${toolName}`;
        } else {
            const foundTool = Array.from(this.availableTools.keys()).find(key => key.endsWith(`:${toolName}`));
            if (!foundTool) throw new Error(`Tool '${toolName}' not found in any server`);
            fullToolName = foundTool;
        }

        const tool = this.availableTools.get(fullToolName);
        if (!tool) throw new Error(`Tool '${fullToolName}' not found`);

        const client = this.clients.get(tool.server);
        if (!client) throw new Error(`Server '${tool.server}' not connected`);

        try {
            const result = await client.callTool(toolName, args);
            this.emit('toolCalled', toolName, args, result);
            return result;
        } catch (error) {
            this.emit('toolError', toolName, error);
            throw error;
        }
    }

    getAvailableTools(): MCPTool[] {
        return Array.from(this.availableTools.values());
    }

    getServerStatus(): Array<{name: string, status: string, capabilities: string[]}> {
        return Array.from(this.servers.values()).map(server => ({
            name: server.name,
            status: server.status,
            capabilities: server.capabilities
        }));
    }

    async shutdown(): Promise<void> {
        const disconnectPromises = Array.from(this.clients.values()).map(client => client.disconnect());
        await Promise.all(disconnectPromises);
        this.servers.clear();
        this.clients.clear();
        this.availableTools.clear();
        this.emit('shutdown');
    }
}

class WebSocketMCPClient implements MCPClient {
    private ws: WebSocket | undefined;

    constructor(private config: MCPServer) {}
    
    async connect(): Promise<void> {
        const url = this.config.environment?.apiKey 
            ? `${this.config.source.path}?apiKey=${this.config.environment.apiKey}`
            : this.config.source.path;
        this.ws = new WebSocket(url);
        return new Promise((resolve, reject) => {
            if (!this.ws) return reject(new Error("WebSocket not initialized"));
            this.ws.onopen = () => resolve();
            this.ws.onerror = (event) => reject(event);
        });
    }
    
    async disconnect(): Promise<void> {
        this.ws?.close();
    }
    
    private sendRequest(payload: object): Promise<any> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error("Not connected");
        this.ws.send(JSON.stringify(payload));
        return new Promise((resolve, reject) => {
             if (!this.ws) return reject(new Error("Not connected"));
             this.ws.onmessage = (ev) => resolve(JSON.parse(ev.data));
             this.ws.onerror = (event) => reject(event);
        });
    }

    async callTool(name: string, args: any): Promise<any> {
        const request = { method: 'callTool', params: { name, args } };
        return this.sendRequest(request);
    }
    
    async listTools(): Promise<MCPTool[]> {
        const request = { method: 'listTools' };
        const response = await this.sendRequest(request);
        return response.tools || [];
    }

    async listResources(): Promise<MCPResource[]> {
        console.warn("listResources not implemented for WebSocketMCPClient");
        return [];
    }

    async readResource(uri: string): Promise<any> {
        console.warn("readResource not implemented for WebSocketMCPClient");
        return null;
    }
}

class SSEMCPClient implements MCPClient {
    private es: EventSource | undefined;

    constructor(private config: MCPServer) {}
    
    async connect(): Promise<void> {
        this.es = new EventSource(this.config.source.path);
        return new Promise((resolve, reject) => {
            if (!this.es) return reject(new Error("EventSource not initialized"));
            this.es.onopen = () => resolve();
            this.es.onerror = (event) => reject(event);
        });
    }

    async disconnect(): Promise<void> {
        this.es?.close();
    }
    
    private async fetchRequest(path: string, method: 'GET' | 'POST', body?: object): Promise<any> {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        const apiKey = this.config.environment?.apiKey;
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        
        const response = await fetch(`${this.config.source.path}/${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }

    async callTool(name: string, args: any): Promise<any> {
        return this.fetchRequest('callTool', 'POST', { name, args });
    }
    
    async listTools(): Promise<MCPTool[]> {
        const response = await this.fetchRequest('listTools', 'GET');
        return response.tools || [];
    }

    async listResources(): Promise<MCPResource[]> {
        console.warn("listResources not implemented for SSEMCPClient");
        return [];
    }
    
    async readResource(uri: string): Promise<any> {
        console.warn("readResource not implemented for SSEMCPClient");
        return null;
    }
}
