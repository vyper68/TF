import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private process: ChildProcess | null = null;
  private connected: boolean = false;
  private command: string;
  private args: string[];

  constructor(command: string, args: string[]) {
    this.command = command;
    this.args = args;
  }

  async connect(): Promise<void> {
    try {
      // 啟動MemoryMesh進程
      this.process = spawn(this.command, this.args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (!this.process.stdin || !this.process.stdout) {
        throw new Error('無法創建MemoryMesh進程的stdio流');
      }

      // 創建MCP傳輸層
      this.transport = new StdioClientTransport({
        stdin: this.process.stdin,
        stdout: this.process.stdout
      });

      // 創建MCP客戶端
      this.client = new Client({
        name: 'memorymesh-bridge',
        version: '1.0.0'
      }, {
        capabilities: {}
      });

      // 連接到MemoryMesh
      await this.client.connect(this.transport);
      this.connected = true;

      console.log('MCP客戶端連接成功');

      // 監聽進程事件
      this.process.on('error', (error) => {
        console.error('MemoryMesh進程錯誤:', error);
        this.connected = false;
      });

      this.process.on('exit', (code, signal) => {
        console.log(`MemoryMesh進程退出，代碼: ${code}, 信號: ${signal}`);
        this.connected = false;
      });

      this.process.stderr?.on('data', (data) => {
        console.error('MemoryMesh stderr:', data.toString());
      });

    } catch (error) {
      console.error('MCP客戶端連接失敗:', error);
      this.connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.connected = false;

      if (this.client) {
        await this.client.close();
        this.client = null;
      }

      if (this.transport) {
        await this.transport.close();
        this.transport = null;
      }

      if (this.process) {
        this.process.kill('SIGTERM');
        this.process = null;
      }

      console.log('MCP客戶端已斷開連接');
    } catch (error) {
      console.error('斷開MCP客戶端連接時出錯:', error);
    }
  }

  async callTool(name: string, arguments_: any): Promise<any> {
    if (!this.client || !this.connected) {
      throw new Error('MCP客戶端未連接');
    }

    try {
      const result = await this.client.callTool({
        name,
        arguments: arguments_
      });

      return result;
    } catch (error) {
      console.error(`調用工具 ${name} 失敗:`, error);
      throw error;
    }
  }

  async listTools(): Promise<any> {
    if (!this.client || !this.connected) {
      throw new Error('MCP客戶端未連接');
    }

    try {
      const result = await this.client.listTools();
      return result;
    } catch (error) {
      console.error('獲取工具列表失敗:', error);
      throw error;
    }
  }

  async getResources(): Promise<any> {
    if (!this.client || !this.connected) {
      throw new Error('MCP客戶端未連接');
    }

    try {
      const result = await this.client.listResources();
      return result;
    } catch (error) {
      console.error('獲取資源列表失敗:', error);
      throw error;
    }
  }

  async readResource(uri: string): Promise<any> {
    if (!this.client || !this.connected) {
      throw new Error('MCP客戶端未連接');
    }

    try {
      const result = await this.client.readResource({ uri });
      return result;
    } catch (error) {
      console.error(`讀取資源 ${uri} 失敗:`, error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // 便捷方法：MemoryMesh特定操作
  async addNode(nodeType: string, data: any): Promise<any> {
    return this.callTool(`add_${nodeType}`, data);
  }

  async updateNode(nodeType: string, name: string, data: any): Promise<any> {
    return this.callTool(`update_${nodeType}`, { name, ...data });
  }

  async deleteNode(nodeType: string, name: string): Promise<any> {
    return this.callTool(`delete_${nodeType}`, { name });
  }

  async searchMemory(query: string): Promise<any> {
    return this.callTool('search_memory', { query });
  }

  async getMemoryStats(): Promise<any> {
    return this.callTool('get_memory_stats', {});
  }

  async createRelation(from: string, to: string, relationType: string): Promise<any> {
    return this.callTool('create_relation', { from, to, relationType });
  }

  async getAllNodes(): Promise<any> {
    return this.callTool('get_all_nodes', {});
  }

  async getNodesByType(nodeType: string): Promise<any> {
    return this.callTool('get_nodes_by_type', { nodeType });
  }
}
