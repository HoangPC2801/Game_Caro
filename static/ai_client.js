const socket = io();
let mySymbol = "X";
let currentTurn = "X";
const board = [];
const boardSize = 15;

const boardDiv = document.getElementById("board");
const info = document.getElementById("info");
const turnText = document.getElementById("turn");
const timerContainer = document.getElementById("timer");
const progressBar = document.getElementById("progress-bar");
const restartButton = document.getElementById("restart-button");
const loadingSpinner = document.getElementById("loading");

const clickSound = new Audio("/static/sounds/click.mp3");
const moveSound = new Audio("/static/sounds/move.mp3");
const winSound = new Audio("/static/sounds/win.mp3");

let timerInterval = null;

function startTimer() {
    clearTimer();
    let timeLeft = 30;
    progressBar.style.width = "100%";
    timerInterval = setInterval(() => {
        timeLeft -= 0.1; // Update every 100ms for smooth animation
        const percentage = (timeLeft / 30) * 100;
        progressBar.style.width = `${percentage}%`;
        if (timeLeft <= 0) {
            clearTimer();
            socket.emit("timeout_ai");
        }
    }, 100);
}

function clearTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

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

// Gửi nước đi của người chơi
function makeMove(row, col, cell) {
    if (board[row][col] === "" && currentTurn === mySymbol) {
        socket.emit("make_move_ai", { row, col, symbol: mySymbol });
        loadingSpinner.style.display = "block";
        moveSound.play();
        clearTimer();
    }
}

// Khởi động lại game
function restartGame() {
    socket.emit("restart_ai_game");
    restartButton.style.display = "none";
    info.innerText = "You are 'X'. Start playing!";
    turnText.innerText = "Turn: X";
    timerContainer.style.display = "block";
    currentTurn = "X";
    createBoard();
    startTimer();
}

// Khởi tạo bàn cờ và timer khi tải trang
createBoard();
startTimer();

// Lắng nghe phản hồi từ server
socket.on("update_board_ai", (data) => {
    const { row, col, symbol } = data;
    if (row === -1 && col === -1) {
        createBoard();
        startTimer();
        return;
    }
    board[row][col] = symbol;
    const index = row * boardSize + col;
    const cell = boardDiv.children[index];
    cell.innerText = symbol;
    cell.classList.add(symbol.toLowerCase());
    currentTurn = symbol === "X" ? "O" : "X";
    turnText.innerText = `Turn: ${currentTurn}`;
    loadingSpinner.style.display = "none";
    moveSound.play();
    if (currentTurn === "X") {
        startTimer();
    }
});

socket.on("game_over_ai", (data) => {
    clearTimer();
    let message = "";
    if (data.reason === "timeout") {
        message = "🤖 AI wins due to timeout!";
    } else {
        message = data.winner === mySymbol ? "🎉 You win!" : "🤖 AI wins!";
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
    restartButton.style.display = "block";
    loadingSpinner.style.display = "none";
    winSound.play();
    for (let cell of boardDiv.children) {
        cell.onclick = null;
    }
});

socket.on("timeout_ai", () => {
    clearTimer();
    info.innerText = "🤖 AI wins due to timeout!";
    turnText.innerText = "";
    timerContainer.style.display = "none";
    restartButton.style.display = "block";
    loadingSpinner.style.display = "none";
    winSound.play();
    for (let cell of boardDiv.children) {
        cell.onclick = null;
    }
});