import tkinter as tk
from tkinter import messagebox, simpledialog, ttk
import math

class BeautifulChessGame:
    def __init__(self, root):
        self.root = root
        self.root.title("Beautiful Chess Game")
        self.root.configure(bg='#2c3e50')
        self.root.resizable(False, False)
        
        # Game state
        self.board = [[None for _ in range(8)] for _ in range(8)]
        self.selected_piece = None
        self.turn = 'white'
        self.move_history = []
        self.captured_pieces = {'white': [], 'black': []}
        
        # Visual properties
        self.board_size = 640
        self.square_size = self.board_size // 8
        self.light_color = '#f0d9b5'
        self.dark_color = '#b58863'
        self.highlight_color = '#ffff00'
        self.select_color = '#ff6b6b'
        self.valid_move_color = '#74b9ff'
        self.check_color = '#ff4757'
        
        # Animation properties
        self.animation_speed = 10
        self.animating = False
        
        self.setup_ui()
        self.setup_pieces()
        
    def setup_ui(self):
        # Main frame
        main_frame = tk.Frame(self.root, bg='#2c3e50', padx=20, pady=20)
        main_frame.pack()
        
        # Title
        title_label = tk.Label(main_frame, text="♔ BEAUTIFUL CHESS ♛", 
                              font=("Georgia", 24, "bold"), 
                              fg='#ecf0f1', bg='#2c3e50')
        title_label.pack(pady=(0, 10))
        
        # Game info frame
        info_frame = tk.Frame(main_frame, bg='#2c3e50')
        info_frame.pack(pady=(0, 10))
        
        # Current turn indicator
        self.turn_label = tk.Label(info_frame, text="White's Turn", 
                                  font=("Arial", 16, "bold"), 
                                  fg='#ecf0f1', bg='#34495e', 
                                  padx=20, pady=5, relief='ridge', bd=2)
        self.turn_label.pack(side=tk.LEFT, padx=(0, 10))
        
        # Game controls
        controls_frame = tk.Frame(info_frame, bg='#2c3e50')
        controls_frame.pack(side=tk.RIGHT)
        
        self.new_game_btn = tk.Button(controls_frame, text="New Game", 
                                     font=("Arial", 12, "bold"),
                                     bg='#27ae60', fg='white', 
                                     activebackground='#229954',
                                     relief='flat', padx=15, pady=5,
                                     command=self.new_game)
        self.new_game_btn.pack(side=tk.LEFT, padx=5)
        
        self.undo_btn = tk.Button(controls_frame, text="Undo", 
                                 font=("Arial", 12, "bold"),
                                 bg='#e74c3c', fg='white', 
                                 activebackground='#c0392b',
                                 relief='flat', padx=15, pady=5,
                                 command=self.undo_move)
        self.undo_btn.pack(side=tk.LEFT, padx=5)
        
        # Board frame with shadow effect
        board_container = tk.Frame(main_frame, bg='#34495e', relief='raised', bd=3)
        board_container.pack(pady=10)
        
        # Chess board canvas
        self.canvas = tk.Canvas(board_container, width=self.board_size, height=self.board_size, 
                               highlightthickness=0, bd=0)
        self.canvas.pack(padx=5, pady=5)
        self.canvas.bind("<Button-1>", self.on_click)
        self.canvas.bind("<Motion>", self.on_hover)
        
        # Status bar
        status_frame = tk.Frame(main_frame, bg='#2c3e50')
        status_frame.pack(pady=(10, 0), fill='x')
        
        self.status_label = tk.Label(status_frame, text="Ready to play", 
                                   font=("Arial", 11), 
                                   fg='#bdc3c7', bg='#2c3e50')
        self.status_label.pack()
        
        self.draw_board()
        
    def draw_board(self):
        self.canvas.delete("all")
        
        # Draw squares with gradient-like effect
        for row in range(8):
            for col in range(8):
                x1, y1 = col * self.square_size, row * self.square_size
                x2, y2 = x1 + self.square_size, y1 + self.square_size
                
                # Determine base color
                if (row + col) % 2 == 0:
                    base_color = self.light_color
                else:
                    base_color = self.dark_color
                
                # Draw main square
                self.canvas.create_rectangle(x1, y1, x2, y2, fill=base_color, outline='')
                
                # Add subtle inner border for depth
                border_color = self.darken_color(base_color, 0.1)
                self.canvas.create_rectangle(x1+1, y1+1, x2-1, y2-1, 
                                           fill=base_color, outline=border_color, width=1)
                
        # Draw coordinate labels
        self.draw_coordinates()
        
    def draw_coordinates(self):
        # Files (a-h)
        for col in range(8):
            x = col * self.square_size + self.square_size // 2
            letter = chr(ord('a') + col)
            
            # Bottom
            self.canvas.create_text(x, self.board_size - 5, text=letter, 
                                  font=("Arial", 10, "bold"), fill='#34495e')
            # Top
            self.canvas.create_text(x, 5, text=letter, 
                                  font=("Arial", 10, "bold"), fill='#34495e')
        
        # Ranks (1-8)
        for row in range(8):
            y = row * self.square_size + self.square_size // 2
            number = str(8 - row)
            
            # Left
            self.canvas.create_text(5, y, text=number, 
                                  font=("Arial", 10, "bold"), fill='#34495e')
            # Right
            self.canvas.create_text(self.board_size - 5, y, text=number, 
                                  font=("Arial", 10, "bold"), fill='#34495e')

    def setup_pieces(self):
        # Setup pawns
        for col in range(8):
            self.board[1][col] = 'black_pawn'
            self.board[6][col] = 'white_pawn'
        
        # Setup other pieces
        piece_order = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']
        for col, piece in enumerate(piece_order):
            self.board[0][col] = f'black_{piece}'
            self.board[7][col] = f'white_{piece}'
        
        self.draw_pieces()

    def draw_pieces(self):
        self.canvas.delete("piece")
        self.canvas.delete("shadow")
        
        # Enhanced piece symbols with better Unicode characters
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
                    x, y = col * self.square_size + self.square_size // 2, row * self.square_size + self.square_size // 2
                    
                    # Draw shadow for depth
                    self.canvas.create_text(x + 2, y + 2, text=piece_symbols[piece], 
                                          tags="shadow", font=("Arial", 42), fill='#7f8c8d')
                    
                    # Draw piece
                    color = '#2c3e50' if piece.startswith('black') else '#ecf0f1'
                    self.canvas.create_text(x, y, text=piece_symbols[piece], 
                                          tags="piece", font=("Arial", 40, "bold"), fill=color)

    def highlight_square(self, row, col, color=None):
        if color is None:
            color = self.select_color
            
        x1, y1 = col * self.square_size, row * self.square_size
        x2, y2 = x1 + self.square_size, y1 + self.square_size
        
        # Create pulsing highlight effect
        self.canvas.create_rectangle(x1, y1, x2, y2, outline=color, width=4, tags="highlight")
        self.canvas.create_rectangle(x1+2, y1+2, x2-2, y2-2, outline=color, width=2, tags="highlight")

    def show_valid_moves(self, start_row, start_col):
        self.canvas.delete("valid_move")
        piece = self.board[start_row][start_col]
        
        for row in range(8):
            for col in range(8):
                if self.is_valid_move(start_row, start_col, row, col, piece):
                    x, y = col * self.square_size + self.square_size // 2, row * self.square_size + self.square_size // 2
                    
                    # Show different indicators for captures vs normal moves
                    if self.board[row][col] is not None:
                        # Capture indicator
                        self.canvas.create_oval(x-25, y-25, x+25, y+25, 
                                              outline=self.valid_move_color, width=3, tags="valid_move")
                    else:
                        # Normal move indicator
                        self.canvas.create_oval(x-10, y-10, x+10, y+10, 
                                              fill=self.valid_move_color, outline='', tags="valid_move")

    def on_hover(self, event):
        if self.animating:
            return
            
        col, row = event.x // self.square_size, event.y // self.square_size
        if 0 <= row < 8 and 0 <= col < 8:
            piece = self.board[row][col]
            if piece:
                piece_name = piece.replace('_', ' ').title()
                self.status_label.config(text=f"Hovering: {piece_name} at {chr(ord('a') + col)}{8-row}")
            else:
                self.status_label.config(text=f"Square: {chr(ord('a') + col)}{8-row}")

    def on_click(self, event):
        if self.animating:
            return
            
        col, row = event.x // self.square_size, event.y // self.square_size
        if not (0 <= row < 8 and 0 <= col < 8):
            return
            
        if self.selected_piece:
            self.move_piece(row, col)
        else:
            self.select_piece(row, col)

    def select_piece(self, row, col):
        piece = self.board[row][col]
        if piece and piece.startswith(self.turn):
            self.selected_piece = (row, col)
            self.canvas.delete("highlight")
            self.canvas.delete("valid_move")
            self.highlight_square(row, col)
            self.show_valid_moves(row, col)
            
            piece_name = piece.replace('_', ' ').title()
            self.status_label.config(text=f"Selected: {piece_name}")

    def move_piece(self, row, col):
        start_row, start_col = self.selected_piece
        piece = self.board[start_row][start_col]
        
        if self.is_valid_move(start_row, start_col, row, col, piece):
            # Store move for undo functionality
            captured_piece = self.board[row][col]
            move = {
                'from': (start_row, start_col),
                'to': (row, col),
                'piece': piece,
                'captured': captured_piece,
                'turn': self.turn
            }
            
            # Make the move
            self.board[start_row][start_col] = None
            self.board[row][col] = piece
            
            # Check if move leaves king in check
            if self.is_in_check(self.turn):
                # Undo move
                self.board[start_row][start_col] = piece
                self.board[row][col] = captured_piece
                self.show_message("Invalid Move", "You cannot leave your king in check!", "error")
            else:
                # Valid move - add to history
                self.move_history.append(move)
                
                # Handle captured pieces
                if captured_piece:
                    self.captured_pieces[self.turn].append(captured_piece)
                
                # Check for pawn promotion
                if piece.endswith('pawn') and (row == 0 or row == 7):
                    self.promote_pawn(row, col)
                
                # Switch turns
                self.turn = 'black' if self.turn == 'white' else 'white'
                self.update_turn_display()
                
                # Check game end conditions
                if self.is_checkmate(self.turn):
                    winner = 'Black' if self.turn == 'white' else 'White'
                    self.show_message("Checkmate!", f"{winner} wins by checkmate!", "info")
                elif self.is_in_check(self.turn):
                    self.show_message("Check!", f"{self.turn.title()} king is in check!", "warning")
                    self.highlight_king_in_check()
                
                move_notation = f"{chr(ord('a') + start_col)}{8-start_row} → {chr(ord('a') + col)}{8-row}"
                self.status_label.config(text=f"Last move: {move_notation}")
        
        # Clear selection
        self.selected_piece = None
        self.canvas.delete("highlight")
        self.canvas.delete("valid_move")
        self.draw_pieces()

    def highlight_king_in_check(self):
        king_pos = self.find_king(self.turn)
        if king_pos:
            row, col = king_pos
            self.highlight_square(row, col, self.check_color)

    def update_turn_display(self):
        self.turn_label.config(text=f"{self.turn.title()}'s Turn",
                              fg='white' if self.turn == 'white' else '#2c3e50',
                              bg='#34495e' if self.turn == 'white' else '#ecf0f1')

    def new_game(self):
        self.board = [[None for _ in range(8)] for _ in range(8)]
        self.selected_piece = None
        self.turn = 'white'
        self.move_history = []
        self.captured_pieces = {'white': [], 'black': []}
        
        self.setup_pieces()
        self.update_turn_display()
        self.canvas.delete("highlight")
        self.canvas.delete("valid_move")
        self.status_label.config(text="New game started!")

    def undo_move(self):
        if not self.move_history:
            self.show_message("Cannot Undo", "No moves to undo!", "warning")
            return
            
        last_move = self.move_history.pop()
        
        # Restore board position
        from_row, from_col = last_move['from']
        to_row, to_col = last_move['to']
        
        self.board[from_row][from_col] = last_move['piece']
        self.board[to_row][to_col] = last_move['captured']
        
        # Restore turn
        self.turn = last_move['turn']
        self.update_turn_display()
        
        # Remove captured piece from collection
        if last_move['captured']:
            self.captured_pieces[self.turn].remove(last_move['captured'])
        
        self.canvas.delete("highlight")
        self.canvas.delete("valid_move")
        self.draw_pieces()
        self.status_label.config(text="Move undone")

    def show_message(self, title, message, msg_type):
        if msg_type == "error":
            messagebox.showerror(title, message)
        elif msg_type == "warning":
            messagebox.showwarning(title, message)
        else:
            messagebox.showinfo(title, message)

    def promote_pawn(self, row, col):
        current_piece = self.board[row][col]
        piece_color = current_piece.split('_')[0]
        
        # Create custom promotion dialog
        dialog = tk.Toplevel(self.root)
        dialog.title("Pawn Promotion")
        dialog.configure(bg='#2c3e50')
        dialog.geometry("300x200")
        dialog.resizable(False, False)
        dialog.transient(self.root)
        dialog.grab_set()
        
        # Center the dialog
        dialog.geometry(f"+{self.root.winfo_x() + 50}+{self.root.winfo_y() + 100}")
        
        tk.Label(dialog, text="Choose promotion piece:", 
                font=("Arial", 14, "bold"), fg='white', bg='#2c3e50').pack(pady=20)
        
        choice = {'piece': 'queen'}
        
        def select_piece(piece_type):
            choice['piece'] = piece_type
            dialog.destroy()
        
        button_frame = tk.Frame(dialog, bg='#2c3e50')
        button_frame.pack(pady=10)
        
        pieces = [('Queen ♕', 'queen'), ('Rook ♖', 'rook'), ('Bishop ♗', 'bishop'), ('Knight ♘', 'knight')]
        
        for i, (text, piece_type) in enumerate(pieces):
            btn = tk.Button(button_frame, text=text, font=("Arial", 12), 
                           bg='#3498db', fg='white', activebackground='#2980b9',
                           command=lambda p=piece_type: select_piece(p),
                           relief='flat', padx=15, pady=5)
            btn.grid(row=i//2, column=i%2, padx=5, pady=5)
        
        self.root.wait_window(dialog)
        
        self.board[row][col] = f'{piece_color}_{choice["piece"]}'

    # Utility methods
    def darken_color(self, color, factor):
        # Simple color darkening
        if color.startswith('#'):
            color = color[1:]
        rgb = tuple(int(color[i:i+2], 16) for i in (0, 2, 4))
        rgb = tuple(int(c * (1 - factor)) for c in rgb)
        return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"

    # Keep all the original game logic methods
    def is_valid_move(self, start_row, start_col, end_row, end_col, piece):
        if piece is None:
            return False

        destination_piece = self.board[end_row][end_col]
        if destination_piece and destination_piece.startswith(self.turn):
            return False

        if piece.endswith('pawn'):
            direction = -1 if piece.startswith('white') else 1
            if start_col == end_col and destination_piece is None:
                if end_row == start_row + direction:
                    return True
                if (start_row == 6 and piece.startswith('white')) or (start_row == 1 and piece.startswith('black')):
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
        step_row = 0 if start_row == end_row else (1 if end_row > start_row else -1)
        step_col = 0 if start_col == end_col else (1 if end_col > start_col else -1)
        
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
        pawn_direction = 1 if color == 'white' else -1
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

        # Check for sliding pieces
        directions = {
            'straight': [(0, 1), (0, -1), (1, 0), (-1, 0)],
            'diagonal': [(1, 1), (1, -1), (-1, 1), (-1, -1)]
        }

        for direction_type, dirs in directions.items():
            for row_dir, col_dir in dirs:
                check_row, check_col = king_row + row_dir, king_col + col_dir
                distance = 1
                while 0 <= check_row < 8 and 0 <= check_col < 8:
                    piece = self.board[check_row][check_col]
                    if piece:
                        if piece.startswith(opponent_color):
                            if direction_type == 'straight' and piece.endswith(('rook', 'queen')):
                                return True
                            elif direction_type == 'diagonal' and piece.endswith(('bishop', 'queen')):
                                return True
                            elif distance == 1 and piece.endswith('king'):
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
                                original_piece = self.board[r][c]
                                self.board[r][c] = piece
                                self.board[row][col] = None
                                if not self.is_in_check(color):
                                    self.board[row][col] = piece
                                    self.board[r][c] = original_piece
                                    return False
                                self.board[row][col] = piece
                                self.board[r][c] = original_piece

        return True

if __name__ == "__main__":
    root = tk.Tk()
    game = BeautifulChessGame(root)
    root.mainloop()