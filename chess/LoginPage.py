import tkinter as tk
from tkinter import messagebox
from ChessGame import ChessGame  # Import the ChessGame class
from PIL import ImageTk, Image
from database import verify_login, init_db


class LoginPage:
    def __init__(self, window):
        self.window = window
        self.window.geometry('1166x718')
        self.window.resizable(0, 0)
        self.window.state('zoomed')
        self.window.title('Login Page')

        # ========================================================================
        # ============================background image============================
        # ========================================================================
        self.bg_frame = Image.open('images\\background1.png')
        photo = ImageTk.PhotoImage(self.bg_frame)
        self.bg_panel = tk.Label(self.window, image=photo)
        self.bg_panel.image = photo
        self.bg_panel.pack(fill='both', expand='yes')
        # ====== Login Frame =========================
        self.lgn_frame = tk.Frame(self.window, bg='#040405', width=950, height=600)
        self.lgn_frame.place(x=200, y=70)

        # ========================================================================
        # ========================================================
        # ========================================================================
        self.txt = "WELCOME"
        self.heading = tk.Label(self.lgn_frame, text=self.txt, font=('yu gothic ui', 25, "bold"), bg="#040405",
                             fg='white',
                             bd=5,
                             relief=tk.FLAT)
        self.heading.place(x=80, y=30, width=300, height=30)

        # ========================================================================
        # ============ Left Side Image ================================================
        # ========================================================================
        self.side_image = Image.open('images\\vector.png')
        photo = ImageTk.PhotoImage(self.side_image)
        self.side_image_label = tk.Label(self.lgn_frame, image=photo, bg='#040405')
        self.side_image_label.image = photo
        self.side_image_label.place(x=5, y=100)

        # ========================================================================
        # ============ Sign In Image =============================================
        # ========================================================================
        self.sign_in_image = Image.open('images\\hyy.png')
        photo = ImageTk.PhotoImage(self.sign_in_image)
        self.sign_in_image_label = tk.Label(self.lgn_frame, image=photo, bg='#040405')
        self.sign_in_image_label.image = photo
        self.sign_in_image_label.place(x=620, y=130)

        # ========================================================================
        # ============ Sign In label =============================================
        # ========================================================================
        self.sign_in_label = tk.Label(self.lgn_frame, text="Sign In", bg="#040405", fg="white",
                                    font=("yu gothic ui", 17, "bold"))
        self.sign_in_label.place(x=650, y=240)

        # ========================================================================
        # ============================username====================================
        # ========================================================================
        self.username_label = tk.Label(self.lgn_frame, text="Username", bg="#040405", fg="#4f4e4d",
                                    font=("yu gothic ui", 13, "bold"))
        self.username_label.place(x=550, y=300)

        self.username_entry = tk.Entry(self.lgn_frame, highlightthickness=0, relief=tk.FLAT, bg="#040405", fg="#6b6a69",
                                    font=("yu gothic ui ", 12, "bold"), insertbackground = '#6b6a69')
        self.username_entry.place(x=580, y=335, width=270)

        self.username_line = tk.Canvas(self.lgn_frame, width=300, height=2.0, bg="#bdb9b1", highlightthickness=0)
        self.username_line.place(x=550, y=359)
        # ===== Username icon =========
        self.username_icon = Image.open('images\\username_icon.png')
        photo = ImageTk.PhotoImage(self.username_icon)
        self.username_icon_label = tk.Label(self.lgn_frame, image=photo, bg='#040405')
        self.username_icon_label.image = photo
        self.username_icon_label.place(x=550, y=332)

        # ========================================================================
        # ============================login button================================
        # ========================================================================
        self.lgn_button = Image.open('images\\btn1.png')
        photo = ImageTk.PhotoImage(self.lgn_button)
        self.lgn_button_label = tk.Label(self.lgn_frame, image=photo, bg='#040405')
        self.lgn_button_label.image = photo
        self.lgn_button_label.place(x=550, y=450)
        self.login = tk.Button(self.lgn_button_label, text='LOGIN', font=("yu gothic ui", 13, "bold"), width=25, bd=0,
                            bg='#3047ff', cursor='hand2', activebackground='#3047ff', fg='white',
                            command=self.verify_login_credentials)
        self.login.place(x=20, y=10)
        # ========================================================================
        # ============================Forgot password=============================
        # ========================================================================
        self.forgot_button = tk.Button(self.lgn_frame, text="Forgot Password ?",
                                    font=("yu gothic ui", 13, "bold underline"), fg="white", relief=tk.FLAT,
                                    activebackground="#040405"
                                    , borderwidth=0, background="#040405", cursor="hand2")
        self.forgot_button.place(x=630, y=510)
        # =========== Sign Up ==================================================
        self.sign_label = tk.Label(self.lgn_frame, text='No account yet?', font=("yu gothic ui", 11, "bold"),
                                relief=tk.FLAT, borderwidth=0, background="#040405", fg='white')
        self.sign_label.place(x=550, y=560)

        self.signup_img = ImageTk.PhotoImage(file='images\\register.png')
        self.signup_button_label = tk.Button(self.lgn_frame, image=self.signup_img, bg='#98a65d', cursor="hand2",
                                        borderwidth=0, background="#040405", activebackground="#040405",
                                        command=self.open_register_page)
        self.signup_button_label.place(x=670, y=555, width=111, height=35)

        # ========================================================================
        # ============================password====================================
        # ========================================================================
        self.password_label = tk.Label(self.lgn_frame, text="Password", bg="#040405", fg="#4f4e4d",
                                    font=("yu gothic ui", 13, "bold"))
        self.password_label.place(x=550, y=380)

        self.password_entry = tk.Entry(self.lgn_frame, highlightthickness=0, relief=tk.FLAT, bg="#040405", fg="#6b6a69",
                                    font=("yu gothic ui", 12, "bold"), show="*", insertbackground = '#6b6a69')
        self.password_entry.place(x=580, y=416, width=244)

        self.password_line = tk.Canvas(self.lgn_frame, width=300, height=2.0, bg="#bdb9b1", highlightthickness=0)
        self.password_line.place(x=550, y=440)
        # ======== Password icon ================
        self.password_icon = Image.open('images\\password_icon.png')
        photo = ImageTk.PhotoImage(self.password_icon)
        self.password_icon_label = tk.Label(self.lgn_frame, image=photo, bg='#040405')
        self.password_icon_label.image = photo
        self.password_icon_label.place(x=550, y=414)
        # ========= show/hide password ==================================================================
        self.show_image = ImageTk.PhotoImage \
            (file='images\\show.png')

        self.hide_image = ImageTk.PhotoImage \
            (file='images\\hide.png')

        self.show_button = tk.Button(self.lgn_frame, image=self.show_image, command=self.show, relief=tk.FLAT,
                                  activebackground="white"
                                  , borderwidth=0, background="white", cursor="hand2")
        self.show_button.place(x=860, y=420)

    def show(self):
        self.hide_button = tk.Button(self.lgn_frame, image=self.hide_image, command=self.hide, relief=tk.FLAT,
                                  activebackground="white"
                                  , borderwidth=0, background="white", cursor="hand2")
        self.hide_button.place(x=860, y=420)
        self.password_entry.config(show='')

    def hide(self):
        self.show_button = tk.Button(self.lgn_frame, image=self.show_image, command=self.show, relief=tk.FLAT,
                                  activebackground="white"
                                  , borderwidth=0, background="white", cursor="hand2")
        self.show_button.place(x=860, y=420)
        self.password_entry.config(show='*')

    def open_register_page(self):
        self.window.withdraw()  # Hide the login window
        register_window = tk.Toplevel(self.window)  # Create a new top-level window
        RegisterPage(register_window, self.window)  # Pass the current window instance
        register_window.protocol("WM_DELETE_WINDOW", self.on_closing)  # Handle window close

    def on_closing(self):
        self.window.destroy()  # Close the application when the window is closed

    def verify_login_credentials(self):
        username = self.username_entry.get()
        password = self.password_entry.get()
        
        if not all([username, password]):
            messagebox.showerror("Error", "All fields are required!")
            return
        
        if verify_login(username, password):            
            messagebox.showinfo("Success", "Login successful!")
            self.open_chess_game()  # Open the chess game
            self.window.destroy()  # Close the login window immediately after opening the chess game
        else:
            messagebox.showerror("Error", "Invalid username or password!")

    def open_chess_game(self):
        chess_window = tk.Tk()  # Create a new Tk window for the chess game
        ChessGame(chess_window)  # Initialize the ChessGame with the new window
        chess_window.mainloop()  # Start the chess game loop


class RegisterPage:
    def __init__(self, window, login_window):
        self.window = window
        self.login_window = login_window  # Store the reference to the login window
        self.window.geometry('1166x718')
        self.window.resizable(0, 0)
        self.window.state('zoomed')
        self.window.title('Register Page')

        # ========================================================================
        # ============================background image============================
        # ========================================================================
        self.bg_frame = Image.open('images\\background1.png')
        photo = ImageTk.PhotoImage(self.bg_frame)
        self.bg_panel = tk.Label(self.window, image=photo)
        self.bg_panel.image = photo
        self.bg_panel.pack(fill='both', expand='yes')
        
        # ====== Register Frame =========================
        self.reg_frame = tk.Frame(self.window, bg='#040405', width=950, height=600)
        self.reg_frame.place(x=200, y=70)

        # ========================================================================
        # ============================heading======================================
        # ========================================================================
        self.txt = "REGISTER"
        self.heading = tk.Label(self.reg_frame, text=self.txt, font=('yu gothic ui', 25, "bold"), bg="#040405",
                             fg='white',
                             bd=5,
                             relief=tk.FLAT)
        self.heading.place(x=80, y=30, width=300, height=30)

        # ========================================================================
        # ============================username====================================
        # ========================================================================
        self.username_label = tk.Label(self.reg_frame, text="Username", bg="#040405", fg="#4f4e4d",
                                    font=("yu gothic ui", 13, "bold"))
        self.username_label.place(x=550, y=300)

        self.username_entry = tk.Entry(self.reg_frame, highlightthickness=0, relief=tk.FLAT, bg="#040405", fg="#6b6a69",
                                    font=("yu gothic ui ", 12, "bold"), insertbackground = '#6b6a69')
        self.username_entry.place(x=580, y=335, width=270)

        self.username_line = tk.Canvas(self.reg_frame, width=300, height=2.0, bg="white", highlightthickness=0)
        self.username_line.place(x=550, y=359)

        # ========================================================================
        # ============================email========================================
        # ========================================================================
        self.email_label = tk.Label(self.reg_frame, text="Email", bg="#040405", fg="#4f4e4d",
                                    font=("yu gothic ui", 13, "bold"))
        self.email_label.place(x=550, y=360)

        self.email_entry = tk.Entry(self.reg_frame, highlightthickness=0, relief=tk.FLAT, bg="#040405", fg="#6b6a69",
                                    font=("yu gothic ui ", 12, "bold"), insertbackground = '#6b6a69')
        self.email_entry.place(x=580, y=395, width=270)

        self.email_line = tk.Canvas(self.reg_frame, width=300, height=2.0, bg="white", highlightthickness=0)
        self.email_line.place(x=550, y=419)

        # ========================================================================
        # ============================password====================================
        # ========================================================================
        self.password_label = tk.Label(self.reg_frame, text="Password", bg="#040405", fg="#4f4e4d",
                                    font=("yu gothic ui", 13, "bold"))
        self.password_label.place(x=550, y=430)

        self.password_entry = tk.Entry(self.reg_frame, highlightthickness=0, relief=tk.FLAT, bg="#040405", fg="#6b6a69",
                                    font=("yu gothic ui", 12, "bold"), show="*", insertbackground = '#6b6a69')
        self.password_entry.place(x=580, y=466, width=244)

        self.password_line = tk.Canvas(self.reg_frame, width=300, height=2.0, bg="white", highlightthickness=0)
        self.password_line.place(x=550, y=490)

        # Show/Hide Password Button
        self.show_password_image = ImageTk.PhotoImage(file='images\\show.png')
        self.hide_password_image = ImageTk.PhotoImage(file='images\\hide.png')
        self.show_password_button = tk.Button(self.reg_frame, image=self.show_password_image, command=self.toggle_password_visibility, bg="#040405", borderwidth=0)
        self.show_password_button.place(x=860, y=466)

        # ========================================================================
        # ============================confirm password============================
        # ========================================================================
        self.confirm_password_label = tk.Label(self.reg_frame, text="Confirm Password", bg="#040405", fg="#4f4e4d",
                                    font=("yu gothic ui", 13, "bold"))
        self.confirm_password_label.place(x=550, y=500)

        self.confirm_password_entry = tk.Entry(self.reg_frame, highlightthickness=0, relief=tk.FLAT, bg="#040405", fg="#6b6a69",
                                    font=("yu gothic ui", 12, "bold"), show="*", insertbackground = '#6b6a69')
        self.confirm_password_entry.place(x=580, y=536, width=244)

        self.confirm_password_line = tk.Canvas(self.reg_frame, width=300, height=2.0, bg="white", highlightthickness=0)
        self.confirm_password_line.place(x=550, y=560)

        # Show/Hide Confirm Password Button
        self.show_confirm_password_button = tk.Button(self.reg_frame, image=self.show_password_image, command=self.toggle_confirm_password_visibility, bg="#040405", borderwidth=0)
        self.show_confirm_password_button.place(x=860, y=536)

        # ========================================================================
        # ============================register button=============================
        # ========================================================================
        self.register_button = tk.Button(self.reg_frame, text='REGISTER', font=("yu gothic ui", 13, "bold"), width=25, bd=0,
                            bg='#3047ff', cursor='hand2', activebackground='#3047ff', fg='white',
                            command=self.register_user)
        self.register_button.place(x=550, y=580)

        # ========================================================================
        # ============================ Return to Login Button ====================
        # ========================================================================
        self.back_button = tk.Button(self.reg_frame, text='Return to Login', font=("yu gothic ui", 13, "bold"), width=25, bd=0,
                                     bg='#040405', cursor='hand2', activebackground='#040405', fg='white',
                                     command=self.back_to_login)
        self.back_button.place(x=800, y=580)

        # ========================================================================
        # ============================ Left Side Image ============================
        # ========================================================================
        self.side_image = Image.open('images\\vector.png')
        photo = ImageTk.PhotoImage(self.side_image)
        self.side_image_label = tk.Label(self.reg_frame, image=photo, bg='#040405')
        self.side_image_label.image = photo
        self.side_image_label.place(x=5, y=100)

        # ========================================================================
        # ============================ Sign In Image =============================
        # ========================================================================
        self.sign_in_image = Image.open('images\\hyy.png')
        photo = ImageTk.PhotoImage(self.sign_in_image)
        self.sign_in_image_label = tk.Label(self.reg_frame, image=photo, bg='#040405')
        self.sign_in_image_label.image = photo
        self.sign_in_image_label.place(x=620, y=130)

    def toggle_password_visibility(self):
        if self.password_entry.cget('show') == '*':
            self.password_entry.config(show='')
            self.show_password_button.config(image=self.hide_password_image)
        else:
            self.password_entry.config(show='*')
            self.show_password_button.config(image=self.show_password_image)

    def toggle_confirm_password_visibility(self):
        if self.confirm_password_entry.cget('show') == '*':
            self.confirm_password_entry.config(show='')
            self.show_confirm_password_button.config(image=self.hide_password_image)
        else:
            self.confirm_password_entry.config(show='*')
            self.show_confirm_password_button.config(image=self.show_password_image)

    def register_user(self):
        username = self.username_entry.get()
        email = self.email_entry.get()
        password = self.password_entry.get()
        confirm_password = self.confirm_password_entry.get()

        if not all([username, email, password, confirm_password]):
            messagebox.showerror("Error", "All fields are required!")
            return
        
        if password != confirm_password:
            messagebox.showerror("Error", "Passwords do not match!")
            return
        
        # Here you would typically add code to save the new user to the database
        messagebox.showinfo("Success", "Registration successful!")
        self.window.destroy()  # Close the register window

    def back_to_login(self):
        self.window.destroy()  # Close the register window
        self.login_window.deiconify()  # Show the previous login window


def page():
    init_db()  # Initialize database when starting the application
    window = tk.Tk()
    LoginPage(window)
    window.mainloop()


if __name__ == '__main__':
    page()