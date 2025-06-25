# 小說創作AI助手 - 完整實施指南

## 📖 專案概述

這是一個整合MemoryMesh知識圖譜的AI協作小說創作工具，包含：

1. **Obsidian插件** - 快速原型，提供基礎功能
2. **MCP橋接服務** - 連接MemoryMesh和Obsidian的中間層
3. **React Web應用** - 完整的專業級解決方案（後續開發）

## 🏗️ 系統架構

```
┌─────────────────┐    WebSocket    ┌─────────────────┐    MCP Protocol    ┌─────────────────┐
│  Obsidian插件   │ ◄──────────────► │  MCP橋接服務    │ ◄─────────────────► │   MemoryMesh    │
│                 │                  │                 │                    │                 │
│ • 角色管理      │                  │ • 協議轉換      │                    │ • 知識圖譜      │
│ • 時間線視覺化  │                  │ • WebSocket服務 │                    │ • 動態工具      │
│ • 內容優化      │                  │ • 錯誤處理      │                    │ • Schema驅動    │
└─────────────────┘                  └─────────────────┘                    └─────────────────┘
```

## 🚀 快速開始

### 第一步：設置MemoryMesh

1. **下載並安裝MemoryMesh**
```bash
git clone https://github.com/CheMiguel23/MemoryMesh.git
cd MemoryMesh
npm install
npm run build
```

2. **配置Claude Desktop**
編輯 `claude_desktop_config.json`：
```json
{
  "mcpServers": {
    "memorymesh": {
      "command": "node",
      "args": ["/absolute/path/to/MemoryMesh/dist/index.js"]
    }
  }
}
```

### 第二步：啟動MCP橋接服務

1. **安裝依賴**
```bash
cd mcp-bridge-service
npm install
```

2. **配置環境變量**
```bash
cp .env.example .env
# 編輯.env文件，設置MemoryMesh路徑
```

3. **構建並啟動服務**
```bash
npm run build
npm start
```

服務將在 `http://localhost:3000` 啟動，WebSocket端點為 `ws://localhost:3000`

### 第三步：安裝Obsidian插件

1. **構建插件**
```bash
cd obsidian-plugin
npm install
npm run build
```

2. **安裝到Obsidian**
- 將整個 `obsidian-plugin` 資料夾複製到 Obsidian vault 的 `.obsidian/plugins/` 目錄
- 重啟Obsidian
- 在設定中啟用「小說創作AI助手」插件

3. **配置插件**
- 在插件設定中設置MemoryMesh服務地址：`ws://localhost:3000`
- 配置LLM API Key（可選）
- 啟用自動簡繁轉換（可選）

## 📋 功能使用指南

### 角色管理

1. **添加角色**
   - 使用命令面板：`Ctrl/Cmd + P` → "添加角色"
   - 或點擊右側面板的「添加角色」按鈕

2. **查看角色關係圖**
   - 打開角色視圖：命令面板 → "角色管理"
   - 切換到「關係圖」模式查看角色網絡

3. **編輯角色信息**
   - 在角色卡片中點擊「編輯」
   - 或在詳情面板中修改

### 時間線管理

1. **創建時間線**
   - 命令面板 → "顯示時間線"
   - 點擊「添加事件」創建新事件

2. **視覺化時間線**
   - 線性視圖：按時間順序排列
   - 分支視圖：按事件類型分層顯示

3. **交互操作**
   - 點擊事件節點查看詳情
   - 拖拽調整事件位置
   - 連接相關事件

### 內容優化

1. **簡繁轉換**
   - 選中文本後使用命令：「優化內容（簡繁轉換）」
   - 或啟用自動轉換功能

2. **內容分析**
   - 分析文本豐富度
   - 檢查主線支線平衡
   - 獲得改進建議

## 🔧 高級配置

### MemoryMesh Schema自定義

在 `MemoryMesh/dist/data/schemas/` 目錄中創建自定義schema：

```json
{
  "name": "add_plot_point",
  "description": "添加情節點到記憶中",
  "properties": {
    "name": {
      "type": "string",
      "description": "情節點名稱",
      "required": true
    },
    "chapter": {
      "type": "string",
      "description": "所屬章節",
      "required": true
    },
    "importance": {
      "type": "string",
      "description": "重要性等級",
      "enum": ["low", "medium", "high", "critical"],
      "required": true
    }
  },
  "additionalProperties": true
}
```

### 橋接服務擴展

在 `BridgeServer.ts` 中添加自定義處理器：

```typescript
this.messageHandlers.set('custom/analyze_plot', async (params) => {
  // 自定義情節分析邏輯
  return await this.customPlotAnalysis(params);
});
```

## 🐛 故障排除

### 常見問題

1. **MCP橋接服務無法連接MemoryMesh**
   - 檢查MemoryMesh路徑是否正確
   - 確認MemoryMesh服務正在運行
   - 查看橋接服務日誌

2. **Obsidian插件無法連接橋接服務**
   - 確認橋接服務在正確端口運行
   - 檢查防火牆設置
   - 驗證WebSocket連接

3. **簡繁轉換不工作**
   - 確認已安裝 `opencc-js` 依賴
   - 檢查插件設定中的轉換選項

### 日誌查看

- **橋接服務日誌**：控制台輸出
- **MemoryMesh日誌**：Claude Desktop日誌
- **Obsidian插件日誌**：開發者工具控制台

## 📈 性能優化

1. **緩存策略**
   - 插件使用30秒緩存減少API調用
   - 橋接服務實現連接池管理

2. **數據同步**
   - 實時WebSocket更新
   - 增量數據傳輸

3. **內存管理**
   - 定期清理無用連接
   - 限制並發請求數量

## 🔮 後續開發計劃

### React Web應用功能

1. **節點式編輯器**
   - 類似ComfyUI的拖拽界面
   - 可視化工作流程設計

2. **高級視覺化**
   - 3D知識圖譜
   - 互動式地圖
   - 動態時間線

3. **AI協作增強**
   - 多LLM支援
   - 智能內容建議
   - 自動化工作流程

### 擴展功能

1. **協作功能**
   - 多用戶實時編輯
   - 版本控制
   - 評論系統

2. **導出功能**
   - 多格式導出
   - 自定義模板
   - 批量處理

3. **整合功能**
   - 其他寫作工具整合
   - 雲端同步
   - 移動端支援

## 📞 支援與貢獻

- **問題回報**：在GitHub Issues中提交
- **功能建議**：在Discussions中討論
- **代碼貢獻**：歡迎提交Pull Request

## 📄 授權

本專案採用MIT授權條款。詳見 [LICENSE](LICENSE) 文件。

---

**開始您的AI協作小說創作之旅！** 🚀✍️
