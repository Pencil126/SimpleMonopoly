# 大富翁遊戲專案設定指南

## ✅ 專案需求確認
- 專案類型：Node.js Express 網站
- 語言：JavaScript
- 框架：Express.js
- 功能：簡易大富翁遊戲

## 🎯 核心功能
- 可設定棋子數量
- 雙骰子擲骰系統
- 棋盤移動機制
- 記錄棋子走過的格子
- 同隊棋子走到走過的格子時可蓋房子

## 📋 專案設定進度

- [x] 建立專案指示檔案
- [x] Scaffold 專案結構
- [x] 客製化專案內容
- [x] 安裝相依套件
- [x] 測試與執行專案
- [x] 完成文件撰寫

## ✨ 專案已完成

遊戲伺服器目前運行於 http://localhost:3000

### 已實作功能
✅ Express.js 伺服器
✅ 可設定 1-6 個棋子
✅ 雙骰子擲骰系統
✅ 24 格循環棋盤
✅ 棋子移動追蹤
✅ 蓋房子功能
✅ 響應式 UI 設計
✅ 即時遊戲狀態顯示

## API 端點

- `POST /api/create-session`：建立新會話，返回 sessionId
- `POST /api/delete-session`：刪除會話（頁面關閉時自動調用）
- `POST /api/init-game`：初始化遊戲，設定棋子數量（需 sessionId）
- `POST /api/roll-dice`：擲骰子並移動棋子（需 sessionId）
- `POST /api/build-house`：在目前格子蓋房子（需 sessionId）
- `POST /api/next-player`：切換到下一位玩家（需 sessionId）
- `POST /api/clear-skip`：清除休息狀態（需 sessionId）
- `GET /api/game-state`：取得目前遊戲狀態（需 sessionId）