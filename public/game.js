let gameState = null;
const BOARD_SIZE = 40;

// 開始遊戲
async function startGame() {
    const playerCount = parseInt(document.getElementById('player-count').value);
    
    if (playerCount < 1 || playerCount > 6) {
        alert('棋子數量必須在 1-6 之間');
        return;
    }

    try {
        const response = await fetch('/api/init-game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerCount })
        });

        const data = await response.json();
        
        if (data.success) {
            gameState = data;
            document.getElementById('setup-panel').style.display = 'none';
            document.getElementById('game-panel').style.display = 'block';
            
            createBoard();
            updateDisplay();
        }
    } catch (error) {
        console.error('初始化遊戲失敗:', error);
        alert('遊戲初始化失敗，請重試');
    }
}

// 建立棋盤 - 四邊框式佈局
function createBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';

    // 建立40個格子（四邊框）
    for (let i = 0; i < BOARD_SIZE; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.id = `cell-${i}`;
        
        // 設定格子位置
        const position = getCellPosition(i);
        cell.style.gridColumn = position.col;
        cell.style.gridRow = position.row;
        
        // 標記起點
        if (i === 0) {
            cell.classList.add('corner', 'start');
            cell.title = 'GO 起點';
        }

        const cellNumber = document.createElement('div');
        cellNumber.className = 'cell-number';
        cellNumber.textContent = i;
        cell.appendChild(cellNumber);

        const playersContainer = document.createElement('div');
        playersContainer.className = 'players-container';
        playersContainer.id = `players-${i}`;
        cell.appendChild(playersContainer);

        board.appendChild(cell);
    }

    // 建立中間主視覺區域
    const centerArea = document.createElement('div');
    centerArea.className = 'center-area';
    centerArea.innerHTML = '🎲<br>大富翁';
    board.appendChild(centerArea);
}

// 取得格子在網格中的位置
function getCellPosition(index) {
    // 下方邊（0-10）：從右下角逆時針到左下角
    if (index >= 0 && index <= 10) {
        return { col: 11 - index, row: 11 };
    }
    // 左方邊（11-19）：從下到上
    else if (index >= 11 && index <= 19) {
        return { col: 1, row: 11 - (index - 10) };
    }
    // 上方邊（20-30）：從左上角到右上角
    else if (index >= 20 && index <= 30) {
        return { col: index - 19, row: 1 };
    }
    // 右方邊（31-39）：從上到下
    else {
        return { col: 11, row: index - 29 };
    }
}

// 擲骰子
async function rollDice() {
    const rollBtn = document.getElementById('roll-btn');
    rollBtn.disabled = true;

    try {
        // 先顯示滾動動畫
        showDiceRolling();

        const response = await fetch('/api/roll-dice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        
        // 等待動畫完成後顯示結果
        setTimeout(() => {
            showDiceResult(data.dice1, data.dice2, data.total);
        }, 600);

        // 延遲更新玩家位置，等動畫完成
        setTimeout(async () => {
            await updatePlayerPosition(data);

        // 標記走過的格子
        markVisitedCell(data.newPosition, data.playerId);

        // 顯示蓋房子按鈕
        const actionPanel = document.getElementById('action-panel');
        actionPanel.innerHTML = '';

        if (data.canBuildHouse) {
            const buildBtn = document.createElement('button');
            buildBtn.textContent = '🏠 蓋房子';
            buildBtn.className = 'btn btn-success';
            buildBtn.onclick = buildHouse;
            actionPanel.appendChild(buildBtn);
        }

            const nextBtn = document.createElement('button');
            nextBtn.textContent = '下一位玩家';
            nextBtn.className = 'btn btn-secondary';
            nextBtn.onclick = nextPlayer;
            actionPanel.appendChild(nextBtn);
        }, 700);

    } catch (error) {
        console.error('擲骰子失敗:', error);
        alert('擲骰子失敗，請重試');
        rollBtn.disabled = false;
    }
}

// 顯示骰子滾動動畫
function showDiceRolling() {
    const diceResult = document.getElementById('dice-result');
    diceResult.innerHTML = `
        <div class="dice-container">
            <div class="dice rolling" id="dice1"></div>
            <div class="dice rolling" id="dice2"></div>
        </div>
    `;
    
    // 隨機顯示點數（動畫效果）
    const dice1 = document.getElementById('dice1');
    const dice2 = document.getElementById('dice2');
    
    let count = 0;
    const interval = setInterval(() => {
        const random1 = Math.floor(Math.random() * 6) + 1;
        const random2 = Math.floor(Math.random() * 6) + 1;
        renderDice(dice1, random1);
        renderDice(dice2, random2);
        count++;
        if (count >= 6) {
            clearInterval(interval);
        }
    }, 100);
}

// 顯示骰子結果
function showDiceResult(dice1Value, dice2Value, total) {
    const diceResult = document.getElementById('dice-result');
    diceResult.innerHTML = `
        <div class="dice-container">
            <div class="dice" id="dice1-final"></div>
            <div class="dice" id="dice2-final"></div>
        </div>
        <div class="dice-result-text">
            🎲 點數：${dice1Value} + ${dice2Value} = ${total}
        </div>
    `;
    
    const dice1 = document.getElementById('dice1-final');
    const dice2 = document.getElementById('dice2-final');
    
    renderDice(dice1, dice1Value);
    renderDice(dice2, dice2Value);
}

// 渲染骰子點數
function renderDice(diceElement, value) {
    diceElement.innerHTML = '';
    
    const dotPatterns = {
        1: [4],
        2: [1, 8],
        3: [1, 4, 8],
        4: [1, 2, 6, 8],
        5: [1, 2, 4, 6, 8],
        6: [1, 2, 3, 5, 6, 8]
    };
    
    const positions = dotPatterns[value];
    
    for (let i = 1; i <= 8; i++) {
        const dot = document.createElement('div');
        if (positions.includes(i)) {
            dot.className = `dice-dot pos-${i}`;
            diceElement.appendChild(dot);
        }
    }
}

// 更新玩家位置（動畫效果）
async function updatePlayerPosition(data) {
    return new Promise(resolve => {
        // 移除舊位置的玩家
        const oldCell = document.getElementById(`players-${data.oldPosition}`);
        const playerToken = oldCell.querySelector(`[data-player-id="${data.playerId}"]`);
        if (playerToken) {
            playerToken.remove();
        }

        // 添加到新位置
        setTimeout(() => {
            const newCell = document.getElementById(`players-${data.newPosition}`);
            const token = createPlayerToken(data.playerId);
            newCell.appendChild(token);
            resolve();
        }, 300);
    });
}

// 建立玩家標記
function createPlayerToken(playerId) {
    const token = document.createElement('div');
    token.className = 'player-token';
    token.dataset.playerId = playerId;
    
    // 獲取玩家資料
    fetch('/api/game-state')
        .then(res => res.json())
        .then(state => {
            const player = state.players[playerId];
            token.style.backgroundColor = player.color;
            token.textContent = playerId + 1;
        });

    return token;
}

// 標記走過的格子
async function markVisitedCell(position, playerId) {
    const cell = document.getElementById(`cell-${position}`);
    cell.classList.add('visited', 'player-visited');
    
    // 獲取玩家顏色
    const response = await fetch('/api/game-state');
    const state = await response.json();
    const player = state.players[playerId];
    
    // 設定邊框顏色
    cell.style.borderColor = player.color;
    
    // 添加足跡標記（如果還沒有）
    if (!cell.querySelector('.footprint')) {
        const footprint = document.createElement('div');
        footprint.className = 'footprint';
        footprint.innerHTML = '👣';
        footprint.style.color = player.color;
        footprint.title = `玩家 ${playerId + 1} 的足跡`;
        cell.appendChild(footprint);
    }
}

// 蓋房子
async function buildHouse() {
    try {
        const response = await fetch('/api/build-house', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        
        if (data.success) {
            // 獲取玩家顏色
            const stateResponse = await fetch('/api/game-state');
            const state = await stateResponse.json();
            const player = state.players[data.playerId];
            
            // 在格子上顯示房子
            const cell = document.getElementById(`cell-${data.position}`);
            const house = document.createElement('div');
            house.className = 'house';
            house.innerHTML = '🏠';
            house.style.filter = `drop-shadow(0 0 3px ${player.color})`;
            house.title = `玩家 ${data.playerId + 1} 的房子`;
            
            // 添加玩家顏色的光暈效果
            const colorBadge = document.createElement('div');
            colorBadge.style.cssText = `
                position: absolute;
                top: 0;
                right: 0;
                width: 25px;
                height: 25px;
                background: ${player.color};
                border-radius: 50%;
                opacity: 0.6;
                z-index: 1;
            `;
            cell.appendChild(colorBadge);
            cell.appendChild(house);

            alert(`玩家 ${data.playerId + 1} 在格子 ${data.position} 蓋了房子！`);
            
            // 移除蓋房子按鈕
            const successBtn = document.getElementById('action-panel').querySelector('.btn-success');
            if (successBtn) successBtn.remove();
        }
    } catch (error) {
        console.error('蓋房子失敗:', error);
        alert('蓋房子失敗，請重試');
    }
}

// 下一位玩家
async function nextPlayer() {
    try {
        const response = await fetch('/api/next-player', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        
        // 更新目前玩家顯示
        document.getElementById('current-player').textContent = data.currentPlayer + 1;
        
        // 清空動作面板和骰子結果
        document.getElementById('action-panel').innerHTML = '';
        document.getElementById('dice-result').innerHTML = '';
        
        // 啟用擲骰子按鈕
        document.getElementById('roll-btn').disabled = false;

        // 更新資訊面板
        updateInfoPanel();

    } catch (error) {
        console.error('切換玩家失敗:', error);
        alert('切換玩家失敗，請重試');
    }
}

// 更新顯示
function updateDisplay() {
    // 放置所有玩家在起點
    fetch('/api/game-state')
        .then(res => res.json())
        .then(state => {
            state.players.forEach(player => {
                const cell = document.getElementById(`players-${player.position}`);
                const token = createPlayerToken(player.id);
                cell.appendChild(token);
            });

            updateInfoPanel();
        });
}

// 更新資訊面板
function updateInfoPanel() {
    fetch('/api/game-state')
        .then(res => res.json())
        .then(state => {
            const infoPanel = document.getElementById('info-panel');
            infoPanel.innerHTML = '<h3>玩家資訊</h3>';

            state.players.forEach((player, index) => {
                const playerInfo = document.createElement('div');
                playerInfo.className = 'player-info';
                
                if (index === state.currentPlayerIndex) {
                    playerInfo.classList.add('current');
                }

                playerInfo.innerHTML = `
                    <h3>
                        <span class="player-token" style="background-color: ${player.color}; display: inline-block;">
                            ${player.id + 1}
                        </span>
                        玩家 ${player.id + 1}
                        ${index === state.currentPlayerIndex ? '(目前玩家)' : ''}
                    </h3>
                    <div class="stat-item">📍 目前位置：格子 ${player.position}</div>
                    <div class="stat-item">👣 走過格子數：${player.visitedCells.length}</div>
                    <div class="stat-item">🏠 房子數量：${player.houses.length}</div>
                `;

                infoPanel.appendChild(playerInfo);
            });
        });
}
