const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// 中間件設定
app.use(express.json());
app.use(express.static('public'));

// 遊戲狀態
let gameState = {
    players: [],
    boardSize: 16,
    currentPlayerIndex: 0,
    isGameStarted: false,
    cellLabels: {} // 儲存格子的提示文字
};

// 初始化遊戲
app.post('/api/init-game', (req, res) => {
    const { playerCount } = req.body;
    
    if (!playerCount || playerCount < 1 || playerCount > 6) {
        return res.status(400).json({ error: '棋子數量必須在 1-6 之間' });
    }

    gameState.players = [];
    for (let i = 0; i < playerCount; i++) {
        gameState.players.push({
            id: i,
            position: 0,
            visitedCells: [0],
            houses: {}, // 改為物件，格式為 { 位置: 房子數量 }
            color: getPlayerColor(i)
        });
    }
    
    gameState.currentPlayerIndex = 0;
    gameState.isGameStarted = true;

    res.json({ 
        success: true, 
        players: gameState.players,
        currentPlayer: gameState.currentPlayerIndex
    });
});

// 擲骰子
app.post('/api/roll-dice', (req, res) => {
    if (!gameState.isGameStarted) {
        return res.status(400).json({ error: '遊戲尚未開始' });
    }

    const dice1 = Math.floor(Math.random() * 6) + 1;
    const total = dice1;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const oldPosition = currentPlayer.position;
    const newPosition = (oldPosition + total) % gameState.boardSize;

    currentPlayer.position = newPosition;

    // 檢查是否可以蓋房子（第一次踩上即可建房）
    let canBuildHouse = true;

    // 記錄走過的格子
    if (!currentPlayer.visitedCells.includes(newPosition)) {
        currentPlayer.visitedCells.push(newPosition);
    }

    res.json({
        dice1,
        total,
        playerId: currentPlayer.id,
        oldPosition,
        newPosition,
        canBuildHouse,
        visitedCells: currentPlayer.visitedCells,
        houses: currentPlayer.houses
    });
});

// 蓋房子
app.post('/api/build-house', (req, res) => {
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
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    
    res.json({
        currentPlayer: gameState.currentPlayerIndex,
        player: gameState.players[gameState.currentPlayerIndex]
    });
});

// 取得遊戲狀態
app.get('/api/game-state', (req, res) => {
    res.json(gameState);
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
