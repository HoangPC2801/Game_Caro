const socket = io();
let currentRoom = null;
let mySymbol = "";
let currentTurn = "X";
const board = [];
const boardSize = 15;

const boardDiv = document.getElementById("board");
const info = document.getElementById("info");
const turnText = document.getElementById("turn");
const timerContainer = document.getElementById("timer");
const progressBar = document.getElementById("progress-bar");
const pauseButton = document.getElementById("pause-button");
const restartButton = document.getElementById("restart-button");
const backButton = document.getElementById("back-button");
const loadingSpinner = document.getElementById("loading");
const gameControlsContainer = document.getElementById("game-controls-container");
const gameControlsContent = document.getElementById("game-controls-content");
const gameControlsToggle = document.getElementById("game-controls-toggle");
const chatContainer = document.getElementById("chat-container");
const chatContent = document.getElementById("chat-content");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatToggle = document.getElementById("chat-toggle");

const clickSound = new Audio("/static/sounds/click.mp3");
const moveSound = new Audio("/static/sounds/move.mp3");
const winSound = new Audio("/static/sounds/win.mp3");

let isGameControlsOpen = true;
let isChatOpen = true;

// Khởi tạo bàn cờ
function createBoard() {
    boardDiv.innerHTML = "";
    for (let i = 0; i < boardSize; i++) {
        board[i] = [];
        for (let j = 0; j < boardSize; j++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.onclick = () => makeMove(i, j, cell);
            boardDiv.appendChild(cell);
            board[i][j] = "";
        }
    }
}

// Gửi nước đi
function makeMove(row, col, cell) {
    if (board[row][col] === "" && currentTurn === mySymbol) {
        socket.emit("make_move", { row, col, room: currentRoom, symbol: mySymbol });
        loadingSpinner.style.display = "block";
        moveSound.play();
    }
}

// Hàm khi người dùng bấm "Vào phòng"
function joinRoom() {
    const roomCode = document.getElementById("room-input").value.trim();
    if (roomCode === "") {
        alert("Please enter a room code!");
        return;
    }
    currentRoom = roomCode;
    socket.emit("join_game", { room: roomCode });
    document.getElementById("room-container").style.display = "none";
    info.innerText = "Waiting for another player...";
    loadingSpinner.style.display = "block";
    clickSound.play();
}

// Khởi động lại game
function restartGame() {
    socket.emit("join_game", { room: currentRoom });
    restartButton.style.display = "none";
    pauseButton.style.display = "none";
    gameControlsContainer.style.display = "none";
    chatContainer.style.display = "none";
    info.innerText = "Waiting for another player...";
    loadingSpinner.style.display = "block";
    timerContainer.style.display = "none";
    chatMessages.innerHTML = "";
    isGameControlsOpen = true;
    gameControlsToggle.innerText = "−";
    gameControlsContent.style.display = "block";
    isChatOpen = true;
    chatToggle.innerText = "−";
    chatContent.style.display = "block";
    createBoard();
    clickSound.play();
}

// Tạm dừng/tiếp tục game
function togglePause() {
    if (pauseButton.innerText === "Pause") {
        socket.emit("pause_game", { room: currentRoom });
        pauseButton.innerText = "Resume";
    } else {
        socket.emit("resume_game", { room: currentRoom });
        pauseButton.innerText = "Pause";
    }
    clickSound.play();
}

// Bật/tắt cửa sổ điều khiển game
function toggleGameControls() {
    isGameControlsOpen = !isGameControlsOpen;
    gameControlsToggle.innerText = isGameControlsOpen ? "−" : "+";
    gameControlsContent.style.display = isGameControlsOpen ? "block" : "none";
    clickSound.play();
}

// Bật/tắt cửa sổ chat
function toggleChat() {
    isChatOpen = !isChatOpen;
    chatToggle.innerText = isChatOpen ? "−" : "+";
    chatContent.style.display = isChatOpen ? "block" : "none";
    if (isChatOpen) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    clickSound.play();
}

// Gửi tin nhắn chat
function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
        socket.emit("send_message", { room: currentRoom, symbol: mySymbol, message: message });
        chatInput.value = "";
        clickSound.play();
    }
}

// Xử lý phím Enter trong chat
chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        sendMessage();
    }
});

// Xử lý các nút điều khiển
backButton.addEventListener("click", () => {
    window.location.href = "/";
    clickSound.play();
});

pauseButton.addEventListener("click", togglePause);

restartButton.addEventListener("click", restartGame);

// Lắng nghe phản hồi từ server
socket.on("start_game", (data) => {
    mySymbol = data.symbol;
    info.innerText = `You are '${mySymbol}'. Let's play!`;
    turnText.innerText = `Turn: X`;
    timerContainer.style.display = "block";
    progressBar.style.width = "100%";
    pauseButton.style.display = "block";
    backButton.style.display = "block";
    restartButton.style.display = "none";
    gameControlsContainer.style.display = "block";
    isGameControlsOpen = true;
    gameControlsToggle.innerText = "−";
    gameControlsContent.style.display = "block";
    chatContainer.style.display = "block";
    isChatOpen = true;
    chatToggle.innerText = "−";
    chatContent.style.display = "block";
    loadingSpinner.style.display = "none";
    createBoard();
});

socket.on("room_full", () => {
    alert("Room is full! Please try a different room.");
    loadingSpinner.style.display = "none";
    location.reload();
});

socket.on("update_board", (data) => {
    const { row, col, symbol } = data;
    board[row][col] = symbol;
    const index = row * boardSize + col;
    const cell = boardDiv.children[index];
    cell.innerText = symbol;
    cell.classList.add(symbol.toLowerCase());
    currentTurn = symbol === "X" ? "O" : "X";
    turnText.innerText = `Turn: ${currentTurn}`;
    loadingSpinner.style.display = "none";
    progressBar.style.width = "100%";
    moveSound.play();
});

socket.on("timer_update", (data) => {
    const percentage = (data.remaining / 30) * 100;
    progressBar.style.width = `${percentage}%`;
});

socket.on("game_paused", (data) => {
    pauseButton.innerText = "Resume";
    info.innerText = "Game paused";
    const percentage = (data.remaining / 30) * 100;
    progressBar.style.width = `${percentage}%`;
});

socket.on("receive_message", (data) => {
    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-message ${data.symbol.toLowerCase()}-message`;
    messageDiv.innerText = `${data.symbol}: ${data.message}`;
    chatMessages.appendChild(messageDiv);
    if (isChatOpen) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});

socket.on("game_over", (data) => {
    let message = "";
    if (data.reason === "timeout") {
        message = `🎉 Player '${data.winner}' wins due to timeout!`;
    } else {
        message = `🎉 Player '${data.winner}' wins!`;
        if (data.winning_cells && data.winning_cells.length) {
            data.winning_cells.forEach(([row, col]) => {
                const index = row * boardSize + col;
                const cell = boardDiv.children[index];
                cell.classList.add("winning");
            });
        }
    }
    info.innerText = message;
    turnText.innerText = "";
    timerContainer.style.display = "none";
    pauseButton.style.display = "none";
    backButton.style.display = "block";
    restartButton.style.display = "block";
    gameControlsContainer.style.display = "block";
    chatContainer.style.display = "none";
    loadingSpinner.style.display = "none";
    winSound.play();
    for (let cell of boardDiv.children) {
        cell.onclick = null;
    }
});