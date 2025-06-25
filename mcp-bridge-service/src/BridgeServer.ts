import { WebSocket } from 'ws';
import { MCPClient } from './MCPClient';

interface WebSocketMessage {
  id: number;
  method: string;
  params: any;
}

interface WebSocketResponse {
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class BridgeServer {
  private mcpClient: MCPClient;
  private connections: Set<WebSocket> = new Set();
  private messageHandlers: Map<string, (params: any) => Promise<any>> = new Map();

  constructor(mcpClient: MCPClient) {
    this.mcpClient = mcpClient;
    this.setupMessageHandlers();
  }

  private setupMessageHandlers() {
    // 工具調用處理器
    this.messageHandlers.set('tools/call', async (params) => {
      const { name, arguments: args } = params;
      return await this.mcpClient.callTool(name, args);
    });

    this.messageHandlers.set('tools/list', async () => {
      return await this.mcpClient.listTools();
    });

    // 資源處理器
    this.messageHandlers.set('resources/list', async () => {
      return await this.mcpClient.getResources();
    });

    this.messageHandlers.set('resources/read', async (params) => {
      const { uri } = params;
      return await this.mcpClient.readResource(uri);
    });

    // MemoryMesh特定操作
    this.messageHandlers.set('memory/add_node', async (params) => {
      const { nodeType, data } = params;
      return await this.mcpClient.addNode(nodeType, data);
    });

    this.messageHandlers.set('memory/update_node', async (params) => {
      const { nodeType, name, data } = params;
      return await this.mcpClient.updateNode(nodeType, name, data);
    });

    this.messageHandlers.set('memory/delete_node', async (params) => {
      const { nodeType, name } = params;
      return await this.mcpClient.deleteNode(nodeType, name);
    });

    this.messageHandlers.set('memory/search', async (params) => {
      const { query } = params;
      return await this.mcpClient.searchMemory(query);
    });

    this.messageHandlers.set('memory/stats', async () => {
      return await this.mcpClient.getMemoryStats();
    });

    this.messageHandlers.set('memory/create_relation', async (params) => {
      const { from, to, relationType } = params;
      return await this.mcpClient.createRelation(from, to, relationType);
    });

    this.messageHandlers.set('memory/get_all_nodes', async () => {
      return await this.mcpClient.getAllNodes();
    });

    this.messageHandlers.set('memory/get_nodes_by_type', async (params) => {
      const { nodeType } = params;
      return await this.mcpClient.getNodesByType(nodeType);
    });

    // 狀態查詢
    this.messageHandlers.set('bridge/status', async () => {
      return {
        mcpConnected: this.mcpClient.isConnected(),
        activeConnections: this.connections.size,
        uptime: process.uptime()
      };
    });

    // Ping/Pong
    this.messageHandlers.set('ping', async () => {
      return { pong: true, timestamp: Date.now() };
    });
  }

  handleConnection(ws: WebSocket) {
    this.connections.add(ws);
    console.log(`新連接，當前連接數: ${this.connections.size}`);

    // 發送歡迎消息
    this.sendMessage(ws, {
      id: 0,
      result: {
        type: 'welcome',
        message: 'MemoryMesh橋接服務已連接',
        mcpConnected: this.mcpClient.isConnected()
      }
    });

    ws.on('message', async (data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        await this.handleMessage(ws, message);
      } catch (error) {
        console.error('處理WebSocket消息時出錯:', error);
        this.sendError(ws, 0, -32700, '解析錯誤', error);
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket錯誤:', error);
      this.handleDisconnection(ws);
    });
  }

  handleDisconnection(ws: WebSocket) {
    this.connections.delete(ws);
    console.log(`連接關閉，當前連接數: ${this.connections.size}`);
  }

  private async handleMessage(ws: WebSocket, message: WebSocketMessage) {
    const { id, method, params } = message;

    try {
      // 檢查MCP連接狀態
      if (!this.mcpClient.isConnected() && method !== 'bridge/status' && method !== 'ping') {
        this.sendError(ws, id, -32001, 'MCP客戶端未連接');
        return;
      }

      // 查找處理器
      const handler = this.messageHandlers.get(method);
      if (!handler) {
        this.sendError(ws, id, -32601, `未知方法: ${method}`);
        return;
      }

      // 執行處理器
      const result = await handler(params);
      this.sendMessage(ws, { id, result });

    } catch (error) {
      console.error(`處理方法 ${method} 時出錯:`, error);
      this.sendError(ws, id, -32000, '內部錯誤', error);
    }
  }

  private sendMessage(ws: WebSocket, response: WebSocketResponse) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(response));
    }
  }

  private sendError(ws: WebSocket, id: number, code: number, message: string, data?: any) {
    this.sendMessage(ws, {
      id,
      error: {
        code,
        message,
        data: data ? String(data) : undefined
      }
    });
  }

  // 廣播消息給所有連接的客戶端
  broadcast(message: any) {
    const data = JSON.stringify(message);
    this.connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }

  // 發送通知（無需回應的消息）
  notify(method: string, params: any) {
    const notification = {
      jsonrpc: '2.0',
      method,
      params
    };
    this.broadcast(notification);
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  // 監控MCP連接狀態變化
  onMCPStatusChange(connected: boolean) {
    this.notify('mcp/status_changed', { connected });
  }
}
