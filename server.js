const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = 3000;

// 中間件設定
app.use(express.json());
app.use(express.static('public'));

// 會話管理：儲存每個客戶端的遊戲狀態
const sessions = new Map();
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 小時

// 定期清理過期會話（每小時檢查一次）
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.lastActivity > SESSION_TIMEOUT) {
            console.log(`清理過期會話: ${sessionId}`);
            sessions.delete(sessionId);
        }
    }
}, 60 * 60 * 1000);

// 建立新會話
app.post('/api/create-session', (req, res) => {
    const sessionId = uuidv4();
    sessions.set(sessionId, {
        gameState: {
            players: [],
            boardSize: 16,
            currentPlayerIndex: 0,
            isGameStarted: false
        },
        lastActivity: Date.now()
    });
    console.log(`建立新會話: ${sessionId}`);
    res.json({ sessionId });
});

// 刪除會話
app.post('/api/delete-session', (req, res) => {
    const { sessionId } = req.body;
    if (sessionId && sessions.has(sessionId)) {
        sessions.delete(sessionId);
        console.log(`刪除會話: ${sessionId}`);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: '會話不存在' });
    }
});

// 取得或建立會話
function getSession(sessionId) {
    if (!sessionId || !sessions.has(sessionId)) {
        return null;
    }
    const session = sessions.get(sessionId);
    session.lastActivity = Date.now(); // 更新活動時間
    return session;
}

// 初始化遊戲
app.post('/api/init-game', (req, res) => {
    const { playerCount, sessionId } = req.body;
    
    if (!playerCount || playerCount < 1 || playerCount > 6) {
        return res.status(400).json({ error: '棋子數量必須在 1-6 之間' });
    }

    const session = getSession(sessionId);
    if (!session) {
        return res.status(400).json({ error: '無效的會話' });
    }

    const gameState = session.gameState;
    gameState.players = [];
    for (let i = 0; i < playerCount; i++) {
        gameState.players.push({
            id: i,
            position: 0,
            visitedCells: [0],
            houses: {},
            skipNextTurn: false,
            color: getPlayerColor(i)
        });
    }
    
    gameState.currentPlayerIndex = 0;
    gameState.isGameStarted = true;

    console.log(`會話 ${sessionId.substring(0, 8)}... 初始化遊戲: ${playerCount} 位玩家`);

    res.json({ 
        success: true, 
        players: gameState.players,
        currentPlayer: gameState.currentPlayerIndex
    });
});

// 擲骰子
app.post('/api/roll-dice', (req, res) => {
    const { sessionId } = req.body;
    const session = getSession(sessionId);
    if (!session) {
        return res.status(400).json({ error: '無效的會話' });
    }

    const gameState = session.gameState;
    if (!gameState.isGameStarted) {
        return res.status(400).json({ error: '遊戲尚未開始' });
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    const dice1 = Math.floor(Math.random() * 6) + 1;
    const total = dice1;

    const oldPosition = currentPlayer.position;
    const newPosition = (oldPosition + total) % gameState.boardSize;

    currentPlayer.position = newPosition;

    // 記錄走過的格子
    if (!currentPlayer.visitedCells.includes(newPosition)) {
        currentPlayer.visitedCells.push(newPosition);
    }

    // 檢查是否可以蓋房子（起點和休息格子不能蓋房子）
    let canBuildHouse = true;
    if (newPosition === 0 || newPosition === 4 || newPosition === 12) {
        canBuildHouse = false;
    }

    // 檢查特殊格子
    let specialCell = null;
    let canRollAgain = false;
    
    // 休息一次：格子 4, 12
    if (newPosition === 4 || newPosition === 12) {
        currentPlayer.skipNextTurn = true;
        specialCell = '休息一次';
    }
    // 再骰一次：格子 8
    else if (newPosition === 8) {
        canRollAgain = true;
        specialCell = '再骰一次';
    }

    res.json({
        dice1,
        total,
        playerId: currentPlayer.id,
        oldPosition,
        newPosition,
        canBuildHouse,
        canRollAgain,
        specialCell,
        visitedCells: currentPlayer.visitedCells,
        houses: currentPlayer.houses
    });
});

// 清除當前玩家的跳過狀態
app.post('/api/clear-skip', (req, res) => {
    const { sessionId } = req.body;
    const session = getSession(sessionId);
    if (!session) {
        return res.status(400).json({ error: '無效的會話' });
    }
    
    const gameState = session.gameState;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    currentPlayer.skipNextTurn = false;
    
    res.json({
        success: true,
        playerId: currentPlayer.id
    });
});

// 蓋房子
app.post('/api/build-house', (req, res) => {
    const { sessionId } = req.body;
    const session = getSession(sessionId);
    if (!session) {
        return res.status(400).json({ error: '無效的會話' });
    }
    
    const gameState = session.gameState;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const position = currentPlayer.position;

    // 初始化該位置的房子數量
    if (!currentPlayer.houses[position]) {
        currentPlayer.houses[position] = 0;
    }

    // 增加房子數量
    currentPlayer.houses[position]++;

    res.json({
        success: true,
        playerId: currentPlayer.id,
        position,
        houseCount: currentPlayer.houses[position],
        houses: currentPlayer.houses
    });
});

// 下一位玩家
app.post('/api/next-player', (req, res) => {
    const { sessionId } = req.body;
    const session = getSession(sessionId);
    if (!session) {
        return res.status(400).json({ error: '無效的會話' });
    }
    
    const gameState = session.gameState;
    // 切換到下一位玩家（不清除 skipNextTurn，讓它保留到下一輪）
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    
    res.json({
        currentPlayer: gameState.currentPlayerIndex,
        player: gameState.players[gameState.currentPlayerIndex]
    });
});

// 取得遊戲狀態
app.get('/api/game-state', (req, res) => {
    const sessionId = req.query.sessionId;
    const session = getSession(sessionId);
    if (!session) {
        return res.status(400).json({ error: '無效的會話' });
    }
    
    res.json(session.gameState);
});

// 玩家顏色
function getPlayerColor(index) {
    const colors = ['#FF6B6B', '#4169E1', '#2ECC71', '#FFA500', '#9B59B6', '#F1C40F'];
    return colors[index % colors.length];
}

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`大富翁遊戲伺服器運行於 http://localhost:${PORT}`);
});
