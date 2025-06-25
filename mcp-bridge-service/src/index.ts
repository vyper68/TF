import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { MCPClient } from './MCPClient';
import { BridgeServer } from './BridgeServer';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// 中間件
app.use(cors());
app.use(express.json());

// 環境變量配置
const PORT = process.env.PORT || 3000;
const MEMORYMESH_PATH = process.env.MEMORYMESH_PATH || 'node';
const MEMORYMESH_ARGS = process.env.MEMORYMESH_ARGS ? 
  process.env.MEMORYMESH_ARGS.split(',') : 
  ['/path/to/memorymesh/dist/index.js'];

// 創建MCP客戶端
const mcpClient = new MCPClient(MEMORYMESH_PATH, MEMORYMESH_ARGS);

// 創建橋接服務器
const bridgeServer = new BridgeServer(mcpClient);

// WebSocket連接處理
wss.on('connection', (ws) => {
  console.log('新的WebSocket連接');
  
  bridgeServer.handleConnection(ws);
  
  ws.on('close', () => {
    console.log('WebSocket連接關閉');
    bridgeServer.handleDisconnection(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket錯誤:', error);
  });
});

// HTTP API端點
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mcpConnected: mcpClient.isConnected()
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    mcpConnected: mcpClient.isConnected(),
    activeConnections: bridgeServer.getConnectionCount(),
    uptime: process.uptime()
  });
});

// 啟動服務器
async function startServer() {
  try {
    // 初始化MCP客戶端
    await mcpClient.connect();
    console.log('MemoryMesh MCP客戶端連接成功');
    
    // 啟動HTTP服務器
    server.listen(PORT, () => {
      console.log(`MCP橋接服務運行在端口 ${PORT}`);
      console.log(`WebSocket端點: ws://localhost:${PORT}`);
      console.log(`健康檢查: http://localhost:${PORT}/health`);
    });
    
  } catch (error) {
    console.error('啟動服務器失敗:', error);
    process.exit(1);
  }
}

// 優雅關閉
process.on('SIGINT', async () => {
  console.log('正在關閉服務器...');
  
  // 關閉WebSocket服務器
  wss.close();
  
  // 斷開MCP連接
  await mcpClient.disconnect();
  
  // 關閉HTTP服務器
  server.close(() => {
    console.log('服務器已關閉');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('收到SIGTERM信號，正在關閉...');
  await mcpClient.disconnect();
  process.exit(0);
});

// 未捕獲的異常處理
process.on('uncaughtException', (error) => {
  console.error('未捕獲的異常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未處理的Promise拒絕:', reason);
  process.exit(1);
});

// 啟動服務器
startServer();
