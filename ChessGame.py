import tkinter as tk

class ChessGUI:
    def __init__(self, master):
        self.master = master
        self.master.title("Chess Game")
        self.square_size = 64
        self.board_size = self.square_size * 8

        self.canvas = tk.Canvas(self.master, width=self.board_size, height=self.board_size)
        self.canvas.pack()

        self.board = [
            ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
            ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
            [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
            ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
            ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
        ]

        self.current_player = 'white'
        self.selected_piece = None
        self.possible_moves = []
        self.move_history = []

        self.draw_board()
        self.draw_pieces()

        self.canvas.bind("<Button-1>", self.on_click)

    def draw_board(self):
        for row in range(8):
            for col in range(8):
                x1 = col * self.square_size
                y1 = row * self.square_size
                x2 = x1 + self.square_size
                y2 = y1 + self.square_size
                color = "#F0D9B5" if (row + col) % 2 == 0 else "#B58863"
                self.canvas.create_rectangle(x1, y1, x2, y2, fill=color, outline="")

    def draw_pieces(self):
        for row in range(8):
            for col in range(8):
                piece = self.board[row][col]
                if piece != ' ':
                    x = col * self.square_size + self.square_size // 2
                    y = row * self.square_size + self.square_size // 2
                    color = "black" if piece in "♜♞♝♛♚♟" else "white"
                    self.canvas.create_text(x, y, text=piece, font=("Arial", 36), fill=color, tags=('piece',))

    def on_click(self, event):
        col = event.x // self.square_size
        row = event.y // self.square_size

        if self.selected_piece:
            if (row, col) in self.possible_moves:
                self.move_piece(self.selected_piece, (row, col))
                self.selected_piece = None
                self.clear_highlights()
                self.switch_player()
            else:
                self.selected_piece = None
                self.clear_highlights()
        else:
            piece = self.board[row][col]
            if piece != ' ' and self.is_current_player_piece(piece):
                self.selected_piece = (row, col)
                self.highlight_square(row, col)
                self.show_possible_moves(row, col)

    def move_piece(self, start, end):
        start_row, start_col = start
        end_row, end_col = end
        piece = self.board[start_row][start_col]
        
        # Check for castling
        if piece in '♔♚' and abs(end_col - start_col) == 2:
            # Determine rook position and new position
            if end_col > start_col:  # Kingside
                rook_col = 7
                new_rook_col = 5
            else:  # Queenside
                rook_col = 0
                new_rook_col = 3
                
            # Move rook
            rook = self.board[start_row][rook_col]
            self.board[start_row][new_rook_col] = rook
            self.board[start_row][rook_col] = ' '
        
        # Regular piece movement
        self.board[end_row][end_col] = self.board[start_row][start_col]
        self.board[start_row][start_col] = ' '
        
        # Record the move
        self.move_history.append((start_row, start_col))
        
        self.canvas.delete('all')
        self.draw_board()
        self.draw_pieces()

    def switch_player(self):
        self.current_player = 'black' if self.current_player == 'white' else 'white'
        self.master.title(f"Chess Game - {self.current_player.capitalize()}'s turn")

    def highlight_square(self, row, col):
        x1 = col * self.square_size
        y1 = row * self.square_size
        x2 = x1 + self.square_size
        y2 = y1 + self.square_size
        self.canvas.create_rectangle(x1, y1, x2, y2, outline='yellow', width=3, tags='highlight')

    def highlight_possible_move(self, row, col):
        x1 = col * self.square_size
        y1 = row * self.square_size
        x2 = x1 + self.square_size
        y2 = y1 + self.square_size
        self.canvas.create_oval(x1+5, y1+5, x2-5, y2-5, fill='light blue', outline='', tags='highlight')

    def clear_highlights(self):
        self.canvas.delete('highlight')

    def is_current_player_piece(self, piece):
        return (piece in "♙♘♗♖♕♔" and self.current_player == 'white') or \
               (piece in "♟♞♝♜♛♚" and self.current_player == 'black')

    def show_possible_moves(self, row, col):
        piece = self.board[row][col]
        if piece in "♙♟":
            self.show_pawn_moves(row, col)
        elif piece in "♖♜":
            self.show_rook_moves(row, col)
        elif piece in "♘♞":
            self.show_knight_moves(row, col)
        elif piece in "♗♝":
            self.show_bishop_moves(row, col)
        elif piece in "♕♛":
            self.show_queen_moves(row, col)
        elif piece in "♔♚":
            self.show_king_moves(row, col)

    def show_pawn_moves(self, row, col):
        direction = -1 if self.current_player == 'white' else 1
        start_row = 6 if self.current_player == 'white' else 1

        if 0 <= row + direction < 8 and self.board[row + direction][col] == ' ':
            self.possible_moves.append((row + direction, col))
            self.highlight_possible_move(row + direction, col)

            if row == start_row and self.board[row + 2*direction][col] == ' ':
                self.possible_moves.append((row + 2*direction, col))
                self.highlight_possible_move(row + 2*direction, col)

        for dc in [-1, 1]:
            if 0 <= row + direction < 8 and 0 <= col + dc < 8:
                target = self.board[row + direction][col + dc]
                if target != ' ' and self.is_current_player_piece(target) != self.is_current_player_piece(self.board[row][col]):
                    self.possible_moves.append((row + direction, col + dc))
                    self.highlight_possible_move(row + direction, col + dc)

    def show_rook_moves(self, row, col):
        directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]
        self.show_sliding_moves(row, col, directions)

    def show_bishop_moves(self, row, col):
        directions = [(1, 1), (1, -1), (-1, 1), (-1, -1)]
        self.show_sliding_moves(row, col, directions)

    def show_queen_moves(self, row, col):
        directions = [(0, 1), (1, 0), (0, -1), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)]
        self.show_sliding_moves(row, col, directions)

    def show_sliding_moves(self, row, col, directions):
        for dr, dc in directions:
            r, c = row + dr, col + dc
            while 0 <= r < 8 and 0 <= c < 8:
                if self.board[r][c] == ' ':
                    self.possible_moves.append((r, c))
                    self.highlight_possible_move(r, c)
                elif self.is_current_player_piece(self.board[r][c]) != self.is_current_player_piece(self.board[row][col]):
                    self.possible_moves.append((r, c))
                    self.highlight_possible_move(r, c)
                    break
                else:
                    break
                r += dr
                c += dc

    def show_knight_moves(self, row, col):
        moves = [
            (row-2, col-1), (row-2, col+1),
            (row-1, col-2), (row-1, col+2),
            (row+1, col-2), (row+1, col+2),
            (row+2, col-1), (row+2, col+1)
        ]
        for r, c in moves:
            if 0 <= r < 8 and 0 <= c < 8:
                if self.board[r][c] == ' ' or self.is_current_player_piece(self.board[r][c]) != self.is_current_player_piece(self.board[row][col]):
                    self.possible_moves.append((r, c))
                    self.highlight_possible_move(r, c)

    def show_king_moves(self, row, col):
        moves = [
            (row-1, col-1), (row-1, col), (row-1, col+1),
            (row, col-1), (row, col+1),
            (row+1, col-1), (row+1, col), (row+1, col+1)
        ]
        for r, c in moves:
            if 0 <= r < 8 and 0 <= c < 8:
                if self.board[r][c] == ' ' or self.is_current_player_piece(self.board[r][c]) != self.is_current_player_piece(self.board[row][col]):
                    self.possible_moves.append((r, c))
                    self.highlight_possible_move(r, c)

        # Add castling moves
        if (row, col) not in self.move_history:  # King hasn't moved
            # Check kingside castling
            if col == 4:  # King is in initial position
                if self.current_player == 'white' and row == 7:
                    rook_pos = (7, 7)
                    if self.is_castling_permitted((row, col), rook_pos):
                        self.possible_moves.append((row, col + 2))
                        self.highlight_possible_move(row, col + 2)
                elif self.current_player == 'black' and row == 0:
                    rook_pos = (0, 7)
                    if self.is_castling_permitted((row, col), rook_pos):
                        self.possible_moves.append((row, col + 2))
                        self.highlight_possible_move(row, col + 2)
                        
                # Check queenside castling
                if self.current_player == 'white' and row == 7:
                    rook_pos = (7, 0)
                    if self.is_castling_permitted((row, col), rook_pos):
                        self.possible_moves.append((row, col - 2))
                        self.highlight_possible_move(row, col - 2)
                elif self.current_player == 'black' and row == 0:
                    rook_pos = (0, 0)
                    if self.is_castling_permitted((row, col), rook_pos):
                        self.possible_moves.append((row, col - 2))
                        self.highlight_possible_move(row, col - 2)

    def is_castling_permitted(self, king_pos, rook_pos):
        row, col = king_pos
        r_row, r_col = rook_pos
        
        # Check if king and rook haven't moved
        if (row, col) in self.move_history or (r_row, r_col) in self.move_history:
            return False
            
        # Check if squares between king and rook are empty
        if r_col > col:  # Kingside
            between_cols = range(col + 1, r_col)
        else:  # Queenside
            between_cols = range(r_col + 1, col)
            
        return all(self.board[row][c] == ' ' for c in between_cols)

class ChessGame:
    def __init__(self):
        self.board = self.initialize_board()
        self.move_history = []
        self.current_player = 'white'

    def initialize_board(self):
        # Initialize the chess board (simplified for this example)
        board = {
            'a1': 'white_rook', 'e1': 'white_king',
            'h1': 'white_rook', 'a8': 'black_rook',
            'e8': 'black_king', 'h8': 'black_rook'
        }
        return board

    def is_castling_permitted(self, king_pos, rook_pos):
        king = self.board.get(king_pos)
        rook = self.board.get(rook_pos)
        
        # Check if king and rook are in correct positions and haven't moved
        if not (king and rook and king.endswith('king') and rook.endswith('rook') and
                king.startswith(self.current_player) and rook.startswith(self.current_player) and
                king_pos not in self.move_history and rook_pos not in self.move_history):
            return False

        # Check if squares between king and rook are vacant
        between_squares = self.get_between_squares(king_pos, rook_pos)
        if not all(self.is_square_empty(sq) for sq in between_squares):
            return False

        # Check if king's path is safe
        king_path = self.get_king_castling_path(king_pos, rook_pos)
        if any(self.is_square_attacked(sq, self.get_opponent_color()) for sq in king_path):
            return False

        return True

    def castle(self, king_pos, rook_pos):
        if not self.is_castling_permitted(king_pos, rook_pos):
            return False

        # Perform castling
        king_file, king_rank = king_pos
        rook_file, rook_rank = rook_pos
        
        if rook_file == 'h':  # Kingside castling
            new_king_pos = f'g{king_rank}'
            new_rook_pos = f'f{king_rank}'
        else:  # Queenside castling
            new_king_pos = f'c{king_rank}'
            new_rook_pos = f'd{king_rank}'

        self.board[new_king_pos] = self.board.pop(king_pos)
        self.board[new_rook_pos] = self.board.pop(rook_pos)

        self.move_history.extend([king_pos, rook_pos])
        self.current_player = self.get_opponent_color()
        return True

    def get_between_squares(self, pos1, pos2):
        file1, rank = pos1
        file2, _ = pos2
        files = 'abcdefgh'
        start = min(files.index(file1), files.index(file2)) + 1
        end = max(files.index(file1), files.index(file2))
        return [f'{files[i]}{rank}' for i in range(start, end)]

    def get_king_castling_path(self, king_pos, rook_pos):
        file, rank = king_pos
        if rook_pos[0] == 'h':  # Kingside castling
            return [king_pos, f'f{rank}', f'g{rank}']
        else:  # Queenside castling
            return [king_pos, f'd{rank}', f'c{rank}']

    def is_square_empty(self, square):
        return square not in self.board

    def is_square_attacked(self, square, attacking_color):
        # Simplified check (in a real implementation, you'd need to check all possible attacks)
        return False  # Placeholder

    def get_opponent_color(self):
        return 'black' if self.current_player == 'white' else 'white'

# Example usage
game = ChessGame()
print(game.castle('e1', 'h1'))  # Attempt white kingside castling

if __name__ == "__main__":
    root = tk.Tk()
    chess_gui = ChessGUI(root)
    root.mainloop()