import { Notice } from 'obsidian';

export class MCPBridge {
	private url: string;
	private ws: WebSocket | null = null;
	private connected: boolean = false;
	private messageId: number = 0;
	private pendingRequests: Map<number, { resolve: Function, reject: Function }> = new Map();

	constructor(url: string) {
		this.url = url;
	}

	async connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.ws = new WebSocket(this.url);
				
				this.ws.onopen = () => {
					this.connected = true;
					console.log('MCP Bridge connected to MemoryMesh');
					resolve();
				};

				this.ws.onmessage = (event) => {
					this.handleMessage(event.data);
				};

				this.ws.onclose = () => {
					this.connected = false;
					console.log('MCP Bridge disconnected from MemoryMesh');
				};

				this.ws.onerror = (error) => {
					console.error('MCP Bridge connection error:', error);
					reject(error);
				};

			} catch (error) {
				reject(error);
			}
		});
	}

	disconnect(): void {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.connected = false;
	}

	private handleMessage(data: string): void {
		try {
			const message = JSON.parse(data);
			
			if (message.id && this.pendingRequests.has(message.id)) {
				const { resolve, reject } = this.pendingRequests.get(message.id)!;
				this.pendingRequests.delete(message.id);
				
				if (message.error) {
					reject(new Error(message.error.message || 'MCP request failed'));
				} else {
					resolve(message.result);
				}
			}
		} catch (error) {
			console.error('Error parsing MCP message:', error);
		}
	}

	private async sendRequest(method: string, params: any): Promise<any> {
		if (!this.connected || !this.ws) {
			throw new Error('MCP Bridge not connected');
		}

		const id = ++this.messageId;
		const request = {
			jsonrpc: '2.0',
			id,
			method,
			params
		};

		return new Promise((resolve, reject) => {
			this.pendingRequests.set(id, { resolve, reject });
			
			this.ws!.send(JSON.stringify(request));
			
			// 設置超時
			setTimeout(() => {
				if (this.pendingRequests.has(id)) {
					this.pendingRequests.delete(id);
					reject(new Error('Request timeout'));
				}
			}, 10000);
		});
	}

	// MemoryMesh工具調用方法
	async addNode(nodeType: string, data: any): Promise<any> {
		return this.sendRequest('tools/call', {
			name: `add_${nodeType}`,
			arguments: data
		});
	}

	async updateNode(nodeType: string, name: string, data: any): Promise<any> {
		return this.sendRequest('tools/call', {
			name: `update_${nodeType}`,
			arguments: { name, ...data }
		});
	}

	async deleteNode(nodeType: string, name: string): Promise<any> {
		return this.sendRequest('tools/call', {
			name: `delete_${nodeType}`,
			arguments: { name }
		});
	}

	async searchMemory(query: string): Promise<any> {
		return this.sendRequest('tools/call', {
			name: 'search_memory',
			arguments: { query }
		});
	}

	async getMemoryStats(): Promise<any> {
		return this.sendRequest('tools/call', {
			name: 'get_memory_stats',
			arguments: {}
		});
	}

	async createRelation(from: string, to: string, relationType: string): Promise<any> {
		return this.sendRequest('tools/call', {
			name: 'create_relation',
			arguments: { from, to, relationType }
		});
	}

	// 獲取所有節點
	async getAllNodes(): Promise<any> {
		return this.sendRequest('tools/call', {
			name: 'get_all_nodes',
			arguments: {}
		});
	}

	// 獲取特定類型的節點
	async getNodesByType(nodeType: string): Promise<any> {
		return this.sendRequest('tools/call', {
			name: 'get_nodes_by_type',
			arguments: { nodeType }
		});
	}

	isConnected(): boolean {
		return this.connected;
	}
}
