from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room
import uuid
import random
import copy
import time
import math

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

rooms = {}
ai_game_state = {"board": [["" for _ in range(15)] for _ in range(15)], "turn": "X"}

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/game')
def game():
    return render_template('index.html')

@app.route('/ai-game')
def ai_game():
    return render_template('ai_game.html')

def check_win(board, row, col, symbol):
    directions = [(1, 0), (0, 1), (1, 1), (1, -1)]
    for dr, dc in directions:
        count = 1
        r, c = row - dr, col - dc
        while 0 <= r < 15 and 0 <= c < 15 and board[r][c] == symbol:
            count += 1
            r -= dr
            c -= dc
        r, c = row + dr, col + dc
        while 0 <= r < 15 and 0 <= c < 15 and board[r][c] == symbol:
            count += 1
            r += dr
            c += dc
        if count >= 5:
            return True
    return False

def get_valid_moves(board, last_move=None):
    """Lấy danh sách nước đi hợp lệ, ưu tiên gần last_move nếu có."""
    moves = []
    if last_move:
        row, col = last_move
        for dr in range(-2, 3):
            for dc in range(-2, 3):
                r, c = row + dr, col + dc
                if 0 <= r < 15 and 0 <= c < 15 and board[r][c] == "":
                    moves.append((r, c))
    else:
        for i in range(15):
            for j in range(15):
                if board[i][j] == "":
                    moves.append((i, j))
    random.shuffle(moves)  # Xáo trộn để tránh thiên hướng cố định
    return moves

def evaluate_heuristic(board, symbol, last_move=None):
    """Đánh giá bảng dựa trên chuỗi ký hiệu liên tiếp."""
    opponent = "X" if symbol == "O" else "O"
    score = 0
    directions = [(1, 0), (0, 1), (1, 1), (1, -1)]

    # Duyệt các ô để tìm chuỗi
    for i in range(15):
        for j in range(15):
            if board[i][j] == "":
                continue
            for dr, dc in directions:
                count = 0
                open_ends = 0
                r, c = i, j
                # Đếm ký hiệu liên tiếp
                while 0 <= r < 15 and 0 <= c < 15 and board[r][c] == board[i][j]:
                    count += 1
                    r += dr
                    c += dc
                # Kiểm tra đầu mở
                if 0 <= r < 15 and 0 <= c < 15 and board[r][c] == "":
                    open_ends += 1
                r, c = i - dr, j - dc
                while 0 <= r < 15 and 0 <= c < 15 and board[r][c] == board[i][j]:
                    count += 1
                    r -= dr
                    c -= dc
                if 0 <= r < 15 and 0 <= c < 15 and board[r][c] == "":
                    open_ends += 1
                # Gán điểm dựa trên độ dài chuỗi và đầu mở
                if board[i][j] == symbol:
                    if count == 4 and open_ends >= 1:
                        score += 1000  # Chuỗi 4 có thể thắng
                    elif count == 3 and open_ends >= 1:
                        score += 100  # Chuỗi 3 nguy hiểm
                    elif count == 2 and open_ends >= 1:
                        score += 10  # Chuỗi 2 tiềm năng
                else:  # Đối thủ
                    if count == 4 and open_ends >= 1:
                        score -= 900  # Phải chặn ngay
                    elif count == 3 and open_ends >= 1:
                        score -= 90  # Nguy cơ cao
                    elif count == 2 and open_ends >= 1:
                        score -= 5  # Nguy cơ thấp
    return score

class MCTSNode:
    def __init__(self, board, move=None, parent=None, symbol="O"):
        self.board = copy.deepcopy(board)
        self.move = move
        self.parent = parent
        self.children = []
        self.visits = 0
        self.wins = 0
        self.symbol = symbol
        if move:
            self.board[move[0]][move[1]] = symbol

    def is_terminal(self):
        if self.move:
            return check_win(self.board, self.move[0], self.move[1], self.symbol)
        return False

    def get_uct(self):
        if self.visits == 0:
            return float('inf')
        exploitation = self.wins / self.visits
        exploration = math.sqrt(2 * math.log(self.parent.visits) / self.visits)
        return exploitation + exploration

    def expand(self):
        moves = get_valid_moves(self.board, self.move)
        opponent_symbol = "X" if self.symbol == "O" else "O"
        for move in moves:
            child = MCTSNode(self.board, move, self, opponent_symbol)
            self.children.append(child)

    def simulate(self):
        """Mô phỏng với heuristic thay vì ngẫu nhiên hoàn toàn."""
        temp_board = copy.deepcopy(self.board)
        last_move = self.move
        current_symbol = "X" if self.symbol == "O" else "O"
        for _ in range(50):
            moves = get_valid_moves(temp_board, last_move)
            if not moves:
                return 0  # Hòa
            # Chọn nước đi dựa trên heuristic
            best_move = None
            best_score = float('-inf')
            for move in moves:
                temp_board[move[0]][move[1]] = current_symbol
                score = evaluate_heuristic(temp_board, "O" if current_symbol == "O" else "X", move)
                temp_board[move[0]][move[1]] = ""
                if score > best_score:
                    best_score = score
                    best_move = move
            # Thêm yếu tố ngẫu nhiên để đa dạng hóa
            if random.random() < 0.2:  # 20% chọn ngẫu nhiên
                best_move = random.choice(moves)
            temp_board[best_move[0]][best_move[1]] = current_symbol
            if check_win(temp_board, best_move[0], best_move[1], current_symbol):
                return 1 if current_symbol == "O" else -1
            last_move = best_move
            current_symbol = "X" if current_symbol == "O" else "O"
        # Đánh giá cuối cùng bằng heuristic
        final_score = evaluate_heuristic(temp_board, "O", last_move)
        if final_score > 0:
            return 0.5  # Ưu thế cho AI
        elif final_score < 0:
            return -0.5  # Ưu thế cho người chơi
        return 0  # Trung lập

def mcts(board, last_move, time_limit=0.5):
    """Thực hiện MCTS trong thời gian giới hạn."""
    root = MCTSNode(board, symbol="O")
    start_time = time.time()

    while time.time() - start_time < time_limit:
        node = root
        while node.children and not node.is_terminal():
            node = max(node.children, key=lambda c: c.get_uct())

        if not node.is_terminal() and not node.children:
            node.expand()

        sim_node = node
        if node.children:
            sim_node = random.choice(node.children)
        result = sim_node.simulate()

        while sim_node:
            sim_node.visits += 1
            sim_node.wins += result if sim_node.symbol == "O" else -result
            sim_node = sim_node.parent

    if root.children:
        best_child = max(root.children, key=lambda c: c.visits)
        return best_child.move
    return None

@socketio.on('join_game')
def on_join(data):
    sid = request.sid
    room = data.get('room')
    join_room(room)
    if room not in rooms:
        rooms[room] = {'players': [sid], 'board': [["" for _ in range(15)] for _ in range(15)], 'turn': 'X'}
        emit('room_created', {'room': room}, room=sid)
    else:
        if len(rooms[room]['players']) < 2:
            rooms[room]['players'].append(sid)
            emit('start_game', {'symbol': 'O'}, room=sid)
            emit('start_game', {'symbol': 'X'}, room=rooms[room]['players'][0])
        else:
            emit('room_full', {}, room=sid)

@socketio.on('make_move')
def on_move(data):
    room = data['room']
    row = data['row']
    col = data['col']
    symbol = data['symbol']
    if room in rooms:
        board = rooms[room]['board']
        if board[row][col] == "":
            board[row][col] = symbol
            emit("update_board", {'row': row, 'col': col, 'symbol': symbol}, room=room)
            if check_win(board, row, col, symbol):
                emit("game_over", {'winner': symbol}, room=room)

@socketio.on('make_move_ai')
def on_move_ai(data):
    global ai_game_state
    row = data['row']
    col = data['col']
    symbol = data['symbol']
    board = ai_game_state['board']
    if board[row][col] == "":
        board[row][col] = symbol
        emit("update_board_ai", {'row': row, 'col': col, 'symbol': symbol})
        if check_win(board, row, col, symbol):
            emit("game_over_ai", {'winner': symbol})
            return
        # AI's turn
        ai_move = mcts(board, (row, col), time_limit=0.8)
        if ai_move:
            ai_row, ai_col = ai_move
            board[ai_row][ai_col] = "O"
            emit("update_board_ai", {'row': ai_row, 'col': ai_col, 'symbol': "O"})
            if check_win(board, ai_row, ai_col, "O"):
                emit("game_over_ai", {'winner': "O"})

@socketio.on('restart_ai_game')
def on_restart_ai():
    global ai_game_state
    ai_game_state = {"board": [["" for _ in range(15)] for _ in range(15)], "turn": "X"}
    emit("update_board_ai", {'row': -1, 'col': -1, 'symbol': ""})

if __name__ == '__main__':
    socketio.run(app, debug=True)