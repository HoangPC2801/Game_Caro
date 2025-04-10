const socket = io();
let currentRoom = null;
let mySymbol = "";
let currentTurn = "X";
const board = [];
const boardSize = 15;

const boardDiv = document.getElementById("board");
const info = document.getElementById("info");
const turnText = document.getElementById("turn");

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
    }
}

// Hàm khi người dùng bấm "Vào phòng"
function joinRoom() {
    const roomCode = document.getElementById("room-input").value.trim();
    if (roomCode === "") {
        alert("Vui lòng nhập mã phòng!");
        return;
    }
    currentRoom = roomCode;
    socket.emit("join_game", { room: roomCode });
    document.getElementById("room-container").style.display = "none";
    info.innerText = "Đang chờ người chơi khác...";
}

// Lắng nghe phản hồi từ server
socket.on("start_game", (data) => {
    mySymbol = data.symbol;
    info.innerText = `Bạn là '${mySymbol}'. Bắt đầu chơi!`;
    turnText.innerText = `Lượt: X`;
    createBoard();
});

socket.on("room_full", () => {
    alert("Phòng đã đầy! Vui lòng tải lại và nhập phòng khác.");
    location.reload();
});

socket.on("update_board", (data) => {
    const { row, col, symbol } = data;
    board[row][col] = symbol;
    const index = row * boardSize + col;
    const cell = boardDiv.children[index];
    cell.innerText = symbol;
    currentTurn = symbol === "X" ? "O" : "X";
    turnText.innerText = `Lượt: ${currentTurn}`;
});

socket.on("game_over", (data) => {
    alert(`🎉 Người chơi '${data.winner}' đã thắng!`);
});
