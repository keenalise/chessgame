import tkinter as tk
from tkinter import messagebox

class ChessGame:
    def __init__(self, root):
        self.root = root
        self.root.title("Chess Game")
        self.board = [[None for _ in range(8)] for _ in range(8)]
        self.selected_piece = None
        self.turn = 'white'
        self.create_board()
        self.setup_pieces()

    def create_board(self):
        self.canvas = tk.Canvas(self.root, width=640, height=640)
        self.canvas.pack()
        self.canvas.bind("<Button-1>", self.on_click)
        self.draw_board()

    def draw_board(self):
        colors = ['#f0d9b5', '#b58863']
        for row in range(8):
            for col in range(8):
                color = colors[(row + col) % 2]
                self.canvas.create_rectangle(col * 80, row * 80, (col + 1) * 80, (row + 1) * 80, fill=color)

    def setup_pieces(self):
        # Setup pawns
        for col in range(8):
            self.board[1][col] = 'white_pawn'
            self.board[6][col] = 'black_pawn'
        
        # Setup other pieces
        piece_order = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']
        for col, piece in enumerate(piece_order):
            self.board[0][col] = f'white_{piece}'
            self.board[7][col] = f'black_{piece}'
        
        self.draw_pieces()

    def draw_pieces(self):
        self.canvas.delete("piece")
        piece_symbols = {
            'white_pawn': '♙', 'white_rook': '♖', 'white_knight': '♘', 'white_bishop': '♗',
            'white_queen': '♕', 'white_king': '♔',
            'black_pawn': '♟', 'black_rook': '♜', 'black_knight': '♞', 'black_bishop': '♝',
            'black_queen': '♛', 'black_king': '♚'
        }
        for row in range(8):
            for col in range(8):
                piece = self.board[row][col]
                if piece:
                    x, y = col * 80 + 40, row * 80 + 40
                    self.canvas.create_text(x, y, text=piece_symbols[piece], tags="piece", font=("Arial", 36))

    def on_click(self, event):
        col, row = event.x // 80, event.y // 80
        if self.selected_piece:
            self.move_piece(row, col)
        else:
            self.select_piece(row, col)

    def select_piece(self, row, col):
        piece = self.board[row][col]
        if piece and piece.startswith(self.turn):
            self.selected_piece = (row, col)
            self.highlight_square(row, col)

    def highlight_square(self, row, col):
        self.draw_board()
        self.canvas.create_rectangle(col * 80, row * 80, (col + 1) * 80, (row + 1) * 80, outline="red", width=3)
        self.draw_pieces()

    def move_piece(self, row, col):
        start_row, start_col = self.selected_piece
        piece = self.board[start_row][start_col]
        if self.is_valid_move(start_row, start_col, row, col, piece):
            self.board[start_row][start_col] = None
            self.board[row][col] = piece

            if self.is_in_check(self.turn):
                # Undo move if it leaves the king in check
                self.board[start_row][start_col] = piece
                self.board[row][col] = None
                messagebox.showerror("Invalid Move", "You cannot leave your king in check!")
            else:
                # Check for pawn promotion
                if piece.endswith('pawn') and (row == 0 or row == 7):
                    self.promote_pawn(row, col)

                self.turn = 'black' if self.turn == 'white' else 'white'
                if self.is_checkmate(self.turn):
                    messagebox.showinfo("Checkmate", f"{self.turn.capitalize()} is in checkmate!")
                    self.root.quit()
        
        self.selected_piece = None
        self.draw_board()
        self.draw_pieces()

    def is_valid_move(self, start_row, start_col, end_row, end_col, piece):
        if piece is None:
            return False

        # Check if the destination square has a piece of the same color
        destination_piece = self.board[end_row][end_col]
        if destination_piece and destination_piece.startswith(self.turn):
            return False

        # Simplified move validation
        if piece.endswith('pawn'):
            direction = 1 if piece.startswith('white') else -1
            if start_col == end_col and destination_piece is None:
                if end_row == start_row + direction:
                    return True
                if (start_row == 1 and piece.startswith('white')) or (start_row == 6 and piece.startswith('black')):
                    if end_row == start_row + 2 * direction and self.board[start_row + direction][end_col] is None:
                        return True
            elif abs(start_col - end_col) == 1 and end_row == start_row + direction:
                if destination_piece and not destination_piece.startswith(self.turn):
                    return True
        elif piece.endswith('king'):
            if abs(start_row - end_row) <= 1 and abs(start_col - end_col) <= 1:
                return True
        elif piece.endswith('rook'):
            if start_row == end_row or start_col == end_col:
                return self.is_path_clear(start_row, start_col, end_row, end_col)
        elif piece.endswith('knight'):
            if (abs(start_row - end_row), abs(start_col - end_col)) in [(2, 1), (1, 2)]:
                return True
        elif piece.endswith('bishop'):
            if abs(start_row - end_row) == abs(start_col - end_col):
                return self.is_path_clear(start_row, start_col, end_row, end_col)
        elif piece.endswith('queen'):
            if start_row == end_row or start_col == end_col or abs(start_row - end_row) == abs(start_col - end_col):
                return self.is_path_clear(start_row, start_col, end_row, end_col)
        return False

    def is_path_clear(self, start_row, start_col, end_row, end_col):
        step_row = (end_row - start_row) // max(abs(end_row - start_row), 1)
        step_col = (end_col - start_col) // max(abs(end_col - start_col), 1)
        current_row, current_col = start_row + step_row, start_col + step_col
        while (current_row, current_col) != (end_row, end_col):
            if self.board[current_row][current_col] is not None:
                return False
            current_row += step_row
            current_col += step_col
        return True

    def is_in_check(self, color):
        king_pos = self.find_king(color)
        if king_pos is None:
            return False

        opponent_color = 'black' if color == 'white' else 'white'
        king_row, king_col = king_pos

        # Check for pawn attacks
        pawn_direction = -1 if color == 'white' else 1
        for col_offset in [-1, 1]:
            check_col = king_col + col_offset
            check_row = king_row + pawn_direction
            if 0 <= check_row < 8 and 0 <= check_col < 8:
                piece = self.board[check_row][check_col]
                if piece == f'{opponent_color}_pawn':
                    return True

        # Check for knight attacks
        knight_moves = [(-2, -1), (-2, 1), (-1, -2), (-1, 2),
                        (1, -2), (1, 2), (2, -1), (2, 1)]
        for row_offset, col_offset in knight_moves:
            check_row = king_row + row_offset
            check_col = king_col + col_offset
            if 0 <= check_row < 8 and 0 <= check_col < 8:
                piece = self.board[check_row][check_col]
                if piece == f'{opponent_color}_knight':
                    return True

        # Check for sliding pieces (rook, bishop, queen) and king
        directions = {
            'straight': [(0, 1), (0, -1), (1, 0), (-1, 0)],
            'diagonal': [(1, 1), (1, -1), (-1, 1), (-1, -1)]
        }

        # Check straight lines (rook and queen)
        for row_dir, col_dir in directions['straight']:
            check_row, check_col = king_row + row_dir, king_col + col_dir
            distance = 1
            while 0 <= check_row < 8 and 0 <= check_col < 8:
                piece = self.board[check_row][check_col]
                if piece:
                    if piece.startswith(opponent_color):
                        if piece.endswith(('rook', 'queen')) or (distance == 1 and piece.endswith('king')):
                            return True
                    break
                check_row += row_dir
                check_col += col_dir
                distance += 1

        # Check diagonal lines (bishop and queen)
        for row_dir, col_dir in directions['diagonal']:
            check_row, check_col = king_row + row_dir, king_col + col_dir
            distance = 1
            while 0 <= check_row < 8 and 0 <= check_col < 8:
                piece = self.board[check_row][check_col]
                if piece:
                    if piece.startswith(opponent_color):
                        if piece.endswith(('bishop', 'queen')) or (distance == 1 and piece.endswith('king')):
                            return True
                    break
                check_row += row_dir
                check_col += col_dir
                distance += 1

        return False

    def find_king(self, color):
        for row in range(8):
            for col in range(8):
                if self.board[row][col] == f'{color}_king':
                    return (row, col)
        return None

    def is_checkmate(self, color):
        if not self.is_in_check(color):
            return False

        for row in range(8):
            for col in range(8):
                piece = self.board[row][col]
                if piece and piece.startswith(color):
                    for r in range(8):
                        for c in range(8):
                            if self.is_valid_move(row, col, r, c, piece):
                                # Temporarily make the move
                                original_piece = self.board[r][c]
                                self.board[r][c] = piece
                                self.board[row][col] = None
                                if not self.is_in_check(color):
                                    # Undo the move
                                    self.board[row][col] = piece
                                    self.board[r][c] = original_piece
                                    return False
                                # Undo the move
                                self.board[row][col] = piece
                                self.board[r][c] = original_piece

        return True
    
    def promote_pawn(self, row, col):
    # Identify the color of the pawn being promoted
        current_piece = self.board[row][col]
        piece_color = current_piece.split('_')[0]
        
        from tkinter import simpledialog, messagebox
        
        promotion_choice = simpledialog.askstring("Pawn Promotion", "Choose a piece (Q/R/B/N):")
        if promotion_choice:
            promotion_choice = promotion_choice.upper()
            if promotion_choice == 'Q':
                self.board[row][col] = f'{piece_color}_queen'
            elif promotion_choice == 'R':
                self.board[row][col] = f'{piece_color}_rook'
            elif promotion_choice == 'B':
                self.board[row][col] = f'{piece_color}_bishop'
            elif promotion_choice == 'N':
                self.board[row][col] = f'{piece_color}_knight'
            else:
                messagebox.showerror("Invalid Choice", f"Invalid choice. Promoting to {piece_color} Queen.")
                self.board[row][col] = f'{piece_color}_queen'
        else:
            self.board[row][col] = f'{piece_color}_queen'
    
    
           
        
if __name__ == "__main__":
    root = tk.Tk()
    game = ChessGame(root)
    root.mainloop()
