const socket = io();
let mySymbol = "X";
let currentTurn = "X";
const board = [];
const boardSize = 15;

const boardDiv = document.getElementById("board");
const info = document.getElementById("info");
const turnText = document.getElementById("turn");
const restartButton = document.getElementById("restart-button");
const loadingSpinner = document.getElementById("loading");

const clickSound = new Audio("/static/sounds/click.mp3");
const moveSound = new Audio("/static/sounds/move.mp3");
const winSound = new Audio("/static/sounds/win.mp3");

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
    }
}

// Khởi động lại game
function restartGame() {
    socket.emit("restart_ai_game");
    restartButton.style.display = "none";
    info.innerText = "You are 'X'. Start playing!";
    turnText.innerText = "Turn: X";
    currentTurn = "X";
    createBoard();
}

// Khởi tạo bàn cờ khi tải trang
createBoard();

// Lắng nghe phản hồi từ server
socket.on("update_board_ai", (data) => {
    const { row, col, symbol } = data;
    board[row][col] = symbol;
    const index = row * boardSize + col;
    const cell = boardDiv.children[index];
    cell.innerText = symbol;
    cell.classList.add(symbol.toLowerCase());
    currentTurn = symbol === "X" ? "O" : "X";
    turnText.innerText = `Turn: ${currentTurn}`;
    loadingSpinner.style.display = "none";
    moveSound.play();
});

socket.on("game_over_ai", (data) => {
    loadingSpinner.style.display = "none";
    info.innerText = data.winner === mySymbol ? "🎉 You win!" : "🤖 AI wins!";
    turnText.innerText = "";
    restartButton.style.display = "block";
    winSound.play();
    // Vô hiệu hóa bàn cờ
    for (let cell of boardDiv.children) {
        cell.onclick = null;
    }
});