import tkinter as tk
from tkinter import ttk, messagebox
import re
from typing import Optional

class ChessLoginPage:
    def __init__(self):
        self.root = tk.Tk()
        self.setup_window()
        self.create_styles()
        self.create_widgets()
        self.center_window()
        
    def setup_window(self):
        """Configure the main window"""
        self.root.title("Chess Game - Login")
        self.root.geometry("450x600")
        self.root.configure(bg='#2c3e50')
        self.root.resizable(False, False)
        
        # Set window icon (optional - you can add your chess icon here)
        try:
            self.root.iconbitmap('chess_icon.ico')  # Replace with your icon file
        except:
            pass  # Icon file not found, continue without it
            
    def create_styles(self):
        """Create custom styles for ttk widgets"""
        self.style = ttk.Style()
        
        # Configure entry style
        self.style.configure(
            'Login.TEntry',
            fieldbackground='white',
            borderwidth=2,
            relief='solid',
            padding=10
        )
        
        # Configure button styles
        self.style.configure(
            'Login.TButton',
            background='#3498db',
            foreground='white',
            borderwidth=0,
            focuscolor='none',
            padding=(20, 10)
        )
        
        self.style.configure(
            'Register.TButton',
            background='#2ecc71',
            foreground='white',
            borderwidth=0,
            focuscolor='none',
            padding=(20, 10)
        )
        
        # Configure label style
        self.style.configure(
            'Title.TLabel',
            background='#2c3e50',
            foreground='white',
            font=('Arial', 24, 'bold')
        )
        
        self.style.configure(
            'Subtitle.TLabel',
            background='#2c3e50',
            foreground='#bdc3c7',
            font=('Arial', 10)
        )
        
        self.style.configure(
            'Field.TLabel',
            background='#2c3e50',
            foreground='white',
            font=('Arial', 11)
        )
        
    def create_widgets(self):
        """Create and arrange all widgets"""
        # Main container
        main_frame = tk.Frame(self.root, bg='#2c3e50', padx=40, pady=40)
        main_frame.pack(fill='both', expand=True)
        
        # Chess piece symbol (using Unicode)
        chess_symbol = tk.Label(
            main_frame,
            text="♔",
            font=('Arial', 48),
            fg='#f39c12',
            bg='#2c3e50'
        )
        chess_symbol.pack(pady=(0, 20))
        
        # Title
        title_label = ttk.Label(
            main_frame,
            text="Chess Master",
            style='Title.TLabel'
        )
        title_label.pack(pady=(0, 5))
        
        subtitle_label = ttk.Label(
            main_frame,
            text="Welcome back! Please sign in to continue",
            style='Subtitle.TLabel'
        )
        subtitle_label.pack(pady=(0, 40))
        
        # Login form frame
        form_frame = tk.Frame(main_frame, bg='#2c3e50')
        form_frame.pack(fill='x', pady=20)
        
        # Username field
        username_label = ttk.Label(
            form_frame,
            text="Username",
            style='Field.TLabel'
        )
        username_label.pack(anchor='w', pady=(0, 5))
        
        self.username_var = tk.StringVar()
        self.username_entry = ttk.Entry(
            form_frame,
            textvariable=self.username_var,
            style='Login.TEntry',
            font=('Arial', 11)
        )
        self.username_entry.pack(fill='x', pady=(0, 20))
        
        # Password field
        password_label = ttk.Label(
            form_frame,
            text="Password",
            style='Field.TLabel'
        )
        password_label.pack(anchor='w', pady=(0, 5))
        
        self.password_var = tk.StringVar()
        self.password_entry = ttk.Entry(
            form_frame,
            textvariable=self.password_var,
            style='Login.TEntry',
            font=('Arial', 11),
            show='*'
        )
        self.password_entry.pack(fill='x', pady=(0, 10))
        
        # Show/Hide password checkbox
        self.show_password_var = tk.BooleanVar()
        show_password_check = tk.Checkbutton(
            form_frame,
            text="Show password",
            variable=self.show_password_var,
            command=self.toggle_password_visibility,
            bg='#2c3e50',
            fg='#bdc3c7',
            selectcolor='#2c3e50',
            activebackground='#2c3e50',
            activeforeground='#bdc3c7'
        )
        show_password_check.pack(anchor='w', pady=(0, 30))
        
        # Login button
        login_button = ttk.Button(
            form_frame,
            text="Sign In",
            style='Login.TButton',
            command=self.handle_login
        )
        login_button.pack(fill='x', pady=(0, 15))
        
        # Register button
        register_button = ttk.Button(
            form_frame,
            text="Create New Account",
            style='Register.TButton',
            command=self.handle_register
        )
        register_button.pack(fill='x', pady=(0, 20))
        
        # Forgot password link
        forgot_password_label = tk.Label(
            form_frame,
            text="Forgot your password?",
            fg='#3498db',
            bg='#2c3e50',
            cursor='hand2',
            font=('Arial', 9, 'underline')
        )
        forgot_password_label.pack()
        forgot_password_label.bind('<Button-1>', self.handle_forgot_password)
        
        # Status label for messages
        self.status_label = tk.Label(
            main_frame,
            text="",
            bg='#2c3e50',
            font=('Arial', 9),
            wraplength=350
        )
        self.status_label.pack(pady=(20, 0))
        
        # Bind Enter key to login
        self.root.bind('<Return>', lambda event: self.handle_login())
        
        # Focus on username field
        self.username_entry.focus()
        
    def center_window(self):
        """Center the window on the screen"""
        self.root.update_idletasks()
        width = self.root.winfo_width()
        height = self.root.winfo_height()
        pos_x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        pos_y = (self.root.winfo_screenheight() // 2) - (height // 2)
        self.root.geometry(f'{width}x{height}+{pos_x}+{pos_y}')
        
    def toggle_password_visibility(self):
        """Toggle password field visibility"""
        if self.show_password_var.get():
            self.password_entry.configure(show='')
        else:
            self.password_entry.configure(show='*')
            
    def validate_inputs(self) -> tuple[bool, str]:
        """Validate user inputs"""
        username = self.username_var.get().strip()
        password = self.password_var.get()
        
        if not username:
            return False, "Please enter a username"
            
        if len(username) < 3:
            return False, "Username must be at least 3 characters long"
            
        if not password:
            return False, "Please enter a password"
            
        if len(password) < 6:
            return False, "Password must be at least 6 characters long"
            
        # Check for valid username characters
        if not re.match("^[a-zA-Z0-9_]+$", username):
            return False, "Username can only contain letters, numbers, and underscores"
            
        return True, ""
        
    def show_status_message(self, message: str, is_error: bool = False):
        """Display status message to user"""
        color = '#e74c3c' if is_error else '#2ecc71'
        self.status_label.configure(text=message, fg=color)
        
        # Clear message after 3 seconds
        self.root.after(3000, lambda: self.status_label.configure(text=""))
        
    def handle_login(self):
        """Handle login button click"""
        is_valid, message = self.validate_inputs()
        
        if not is_valid:
            self.show_status_message(message, is_error=True)
            return
            
        username = self.username_var.get().strip()
        password = self.password_var.get()
        
        # Here you would typically verify credentials against a database
        # For demonstration, we'll use a simple check
        if self.authenticate_user(username, password):
            self.show_status_message("Login successful! Starting game...")
            self.root.after(1500, self.start_game)
        else:
            self.show_status_message("Invalid username or password", is_error=True)
            
    def authenticate_user(self, username: str, password: str) -> bool:
        """
        Authenticate user credentials
        Replace this with your actual authentication logic
        """
        # Demo credentials - replace with database lookup
        demo_users = {
            "player1": "password123",
            "chessmaster": "game123",
            "admin": "admin123"
        }
        
        return username in demo_users and demo_users[username] == password
        
    def handle_register(self):
        """Handle register button click"""
        self.show_status_message("Registration feature coming soon!")
        # You can implement registration logic here or open a new window
        
    def handle_forgot_password(self, event=None):
        """Handle forgot password click"""
        self.show_status_message("Password recovery feature coming soon!")
        # You can implement password recovery logic here
        
    def start_game(self):
        """Start the chess game - replace with your game logic"""
        messagebox.showinfo(
            "Success", 
            f"Welcome {self.username_var.get()}!\nStarting Chess Game..."
        )
        # Here you would typically:
        # 1. Close this window
        # 2. Start your chess game
        self.root.destroy()
        start_chess_game()
        
    def run(self):
        """Start the login page"""
        self.root.mainloop()

# Example usage
if __name__ == "__main__":
    # Create and run the login page
    login_page = ChessLoginPage()
    login_page.run()