let gameState = null;
const BOARD_SIZE = 16;

// 格子說明（寫死在程式中）
const cellLabels = {
    0: '起 / 終點',
    1: '臺灣節慶',
    2: '',
    3: '外國節慶',
    4: '休息一次',
    5: '',
    6: '臺灣節慶',
    7: '機會 / 命運',
    8: '再骰一次',
    9: '臺灣節慶',
    10: '',
    11: '外國節慶',
    12: '休息一次',
    13: '',
    14: '外國節慶',
    15: '機會 / 命運'
};

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
            document.getElementById('game-main').style.display = 'flex';
            
            // 確保按鈕狀態正確
            document.getElementById('roll-btn').disabled = false;
            document.getElementById('build-btn').disabled = true;
            document.getElementById('next-btn').disabled = true;
            
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

    // 建立16個格子（四邊框）
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

        // 顯示格子標籤（如果有設定）
        if (cellLabels[i]) {
            const cellLabel = document.createElement('div');
            cellLabel.className = 'cell-label';
            cellLabel.textContent = cellLabels[i];
            cell.appendChild(cellLabel);
        }

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

// 取得格子在網格中的位置（16格，每邊4格）
function getCellPosition(index) {
    // 下方邊（0-4）：從右下角逆時針到左下角
    if (index >= 0 && index <= 4) {
        return { col: 5 - index, row: 5 };
    }
    // 左方邊（5-7）：從下到上
    else if (index >= 5 && index <= 7) {
        return { col: 1, row: 5 - (index - 4) };
    }
    // 上方邊（8-12）：從左上角到右上角
    else if (index >= 8 && index <= 12) {
        return { col: index - 7, row: 1 };
    }
    // 右方邊（13-15）：從上到下
    else {
        return { col: 5, row: index - 11 };
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
            showDiceResult(data.dice1, data.total);
        }, 600);

        // 延遲更新玩家位置，等動畫完成
        setTimeout(async () => {
            await updatePlayerPosition(data);

        // 標記走過的格子
        markVisitedCell(data.newPosition, data.playerId);

        // 更新按鈕狀態
        const buildBtn = document.getElementById('build-btn');
        const nextBtn = document.getElementById('next-btn');
        
        console.log('canBuildHouse:', data.canBuildHouse);
        
        if (data.canBuildHouse) {
            buildBtn.disabled = false;
        } else {
            buildBtn.disabled = true;
        }
        
        nextBtn.disabled = false;
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
        </div>
    `;
    
    // 隨機顯示點數（動畫效果）
    const dice1 = document.getElementById('dice1');
    
    let count = 0;
    const interval = setInterval(() => {
        const random1 = Math.floor(Math.random() * 6) + 1;
        renderDice(dice1, random1);
        count++;
        if (count >= 6) {
            clearInterval(interval);
        }
    }, 100);
}

// 顯示骰子結果
function showDiceResult(dice1Value, total) {
    const diceResult = document.getElementById('dice-result');
    diceResult.innerHTML = `
        <div class="dice-container">
            <div class="dice" id="dice1-final"></div>
        </div>
        <div class="dice-result-text">
            🎲 點數：${dice1Value}
        </div>
    `;
    
    const dice1 = document.getElementById('dice1-final');
    
    renderDice(dice1, dice1Value);
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
function markVisitedCell(position, playerId) {
    const cell = document.getElementById(`cell-${position}`);
    cell.classList.add('visited', 'player-visited');
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
            
            // 更新格子上的房子顯示
            updateHouseDisplay(data.position, data.playerId, data.houseCount, player.color);

            alert(`玩家 ${data.playerId + 1} 在格子 ${data.position} 蓋了第 ${data.houseCount} 棟房子！`);
            
            // 禁用蓋房子按鈕（限制每回合只能蓋一座房子）
            const buildBtn = document.getElementById('build-btn');
            if (buildBtn) buildBtn.disabled = true;
            
            // 更新資訊面板
            updateInfoPanel();
        }
    } catch (error) {
        console.error('蓋房子失敗:', error);
        alert('蓋房子失敗，請重試');
    }
}

// 更新房子顯示
function updateHouseDisplay(position, playerId, houseCount, playerColor) {
    const cell = document.getElementById(`cell-${position}`);
    
    // 移除該玩家舊的房子顯示（如果有）
    const oldHouse = cell.querySelector(`.house-player-${playerId}`);
    if (oldHouse) {
        oldHouse.remove();
    }
    
    // 建立新的房子顯示
    const house = document.createElement('div');
    house.className = `house house-player-${playerId}`;
    house.innerHTML = '🏠';
    house.style.filter = `drop-shadow(0 0 3px ${playerColor})`;
    house.title = `玩家 ${playerId + 1} 的房子 x${houseCount}`;
    house.dataset.playerId = playerId;
    house.dataset.count = houseCount;
    
    // 根據玩家ID設定位置，讓房子從右上角排列
    const houseOffset = playerId * 30; // 每個玩家偏移30px
    house.style.top = `${3 + Math.floor(playerId / 2) * 25}px`;
    house.style.right = `${3 + (playerId % 2) * 30}px`;
    
    // 顯示房子數量
    const countBadge = document.createElement('span');
    countBadge.className = 'house-count';
    countBadge.textContent = houseCount;
    countBadge.style.cssText = `
        position: absolute;
        bottom: -5px;
        right: -5px;
        background: ${playerColor};
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.6em;
        font-weight: bold;
        border: 2px solid white;
        z-index: 3;
    `;
    house.appendChild(countBadge);
    
    cell.appendChild(house);
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
        
        // 清空骰子結果並重設按鈕狀態
        document.getElementById('dice-result').innerHTML = '';
        document.getElementById('build-btn').disabled = true;
        document.getElementById('next-btn').disabled = true;
        
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
            infoPanel.style.display = 'block';
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
                    <div class="stat-item">🏠 房子總數：${Object.values(player.houses).reduce((sum, count) => sum + count, 0)}</div>
                `;

                infoPanel.appendChild(playerInfo);
            });
        });
}
