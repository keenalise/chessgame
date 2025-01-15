from tkinter import *
from PIL import ImageTk, Image
from tkinter import messagebox
from database import register_user, init_db

class RegisterPage:
    def __init__(self, window):
        self.window = window
        self.window.geometry('1166x718')
        self.window.resizable(0, 0)
        self.window.state('zoomed')
        self.window.title('Register Page')

        # Background image
        self.bg_frame = Image.open('images\\background1.png')
        photo = ImageTk.PhotoImage(self.bg_frame)
        self.bg_panel = Label(self.window, image=photo)
        self.bg_panel.image = photo
        self.bg_panel.pack(fill='both', expand='yes')

        # Register Frame
        self.reg_frame = Frame(self.window, bg='#040405', width=950, height=600)
        self.reg_frame.place(x=200, y=70)

        # Heading
        self.txt = "CREATE ACCOUNT"
        self.heading = Label(self.reg_frame, text=self.txt, font=('yu gothic ui', 25, "bold"), bg="#040405",
                           fg='white', bd=5, relief=FLAT)
        self.heading.place(x=80, y=30, width=300, height=30)

        # Left Side Image
        self.side_image = Image.open('images\\vector.png')
        photo = ImageTk.PhotoImage(self.side_image)
        self.side_image_label = Label(self.reg_frame, image=photo, bg='#040405')
        self.side_image_label.image = photo
        self.side_image_label.place(x=5, y=100)

        # Registration form fields
        # Username
        self.username_label = Label(self.reg_frame, text="Username", bg="#040405", fg="#4f4e4d",
                                  font=("yu gothic ui", 13, "bold"))
        self.username_label.place(x=550, y=220)

        self.username_entry = Entry(self.reg_frame, highlightthickness=0, relief=FLAT, bg="#040405", fg="#6b6a69",
                                  font=("yu gothic ui ", 12, "bold"), insertbackground='#6b6a69')
        self.username_entry.place(x=580, y=255, width=270)

        self.username_line = Canvas(self.reg_frame, width=300, height=2.0, bg="#bdb9b1", highlightthickness=0)
        self.username_line.place(x=550, y=279)

        # Email
        self.email_label = Label(self.reg_frame, text="Email", bg="#040405", fg="#4f4e4d",
                               font=("yu gothic ui", 13, "bold"))
        self.email_label.place(x=550, y=300)

        self.email_entry = Entry(self.reg_frame, highlightthickness=0, relief=FLAT, bg="#040405", fg="#6b6a69",
                               font=("yu gothic ui ", 12, "bold"), insertbackground='#6b6a69')
        self.email_entry.place(x=580, y=335, width=270)

        self.email_line = Canvas(self.reg_frame, width=300, height=2.0, bg="#bdb9b1", highlightthickness=0)
        self.email_line.place(x=550, y=359)

        # Password
        self.password_label = Label(self.reg_frame, text="Password", bg="#040405", fg="#4f4e4d",
                                  font=("yu gothic ui", 13, "bold"))
        self.password_label.place(x=550, y=380)

        self.password_entry = Entry(self.reg_frame, highlightthickness=0, relief=FLAT, bg="#040405", fg="#6b6a69",
                                  font=("yu gothic ui", 12, "bold"), show="*", insertbackground='#6b6a69')
        self.password_entry.place(x=580, y=416, width=244)

        self.password_line = Canvas(self.reg_frame, width=300, height=2.0, bg="#bdb9b1", highlightthickness=0)
        self.password_line.place(x=550, y=440)

        # Password show/hide icons
        self.show_image = ImageTk.PhotoImage(Image.open('images\\show.png'))
        self.hide_image = ImageTk.PhotoImage(Image.open('images\\hide.png'))
        self.show_button = Button(self.reg_frame, image=self.show_image, command=self.show_hide_password,
                                relief=FLAT, activebackground="white", borderwidth=0, background="white", cursor="hand2")
        self.show_button.place(x=820, y=416)

        # Confirm Password
        self.confirm_password_label = Label(self.reg_frame, text="Confirm Password", bg="#040405", fg="#4f4e4d",
                                         font=("yu gothic ui", 13, "bold"))
        self.confirm_password_label.place(x=550, y=460)

        self.confirm_password_entry = Entry(self.reg_frame, highlightthickness=0, relief=FLAT, bg="#040405", fg="#6b6a69",
                                         font=("yu gothic ui", 12, "bold"), show="*", insertbackground='#6b6a69')
        self.confirm_password_entry.place(x=580, y=496, width=244)

        self.confirm_password_line = Canvas(self.reg_frame, width=300, height=2.0, bg="#bdb9b1", highlightthickness=0)
        self.confirm_password_line.place(x=550, y=520)

        # Confirm Password show/hide icons
        self.confirm_show_button = Button(self.reg_frame, image=self.show_image, command=self.show_hide_confirm_password,
                                        relief=FLAT, activebackground="white", borderwidth=0, background="white", cursor="hand2")
        self.confirm_show_button.place(x=820, y=496)

        # Track password visibility state
        self.password_shown = False
        self.confirm_password_shown = False

        # Register Button
        self.reg_button = Image.open('images\\btn1.png')
        photo = ImageTk.PhotoImage(self.reg_button)
        self.reg_button_label = Label(self.reg_frame, image=photo, bg='#040405')
        self.reg_button_label.image = photo
        self.reg_button_label.place(x=550, y=530)
        self.register = Button(self.reg_button_label, text='REGISTER', font=("yu gothic ui", 13, "bold"), width=25, bd=0,
                             bg='#3047ff', cursor='hand2', activebackground='#3047ff', fg='white',
                             command=self.register_user_to_db)
        self.register.place(x=20, y=10)

        # Login Link
        self.login_label = Label(self.reg_frame, text='Already have an account?', font=("yu gothic ui", 11, "bold"),
                               relief=FLAT, borderwidth=0, background="#040405", fg='white')
        self.login_label.place(x=550, y=590)

        # Return to Login button
        self.return_button = Button(self.reg_frame, text='Return to Login', font=("yu gothic ui", 13, "bold"),
                                  width=15, bd=0, bg='#1D90F5', cursor='hand2',
                                  activebackground='#1D90F5', fg='white',
                                  command=self.open_login_page)
        self.return_button.place(x=700, y=590)

        self.login_img = ImageTk.PhotoImage(file='images\\login.png')
        self.login_button_label = Button(self.reg_frame, image=self.login_img, bg='#98a65d', cursor="hand2",
                                       borderwidth=0, background="#040405", activebackground="#040405",
                                       command=self.open_login_page)
        self.login_button_label.place(x=670, y=585, width=111, height=35)

    def register_user_to_db(self):
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
            
        if register_user(username, email, password):
            messagebox.showinfo("Success", "Registration successful!")
            self.open_login_page()
        else:
            messagebox.showerror("Error", "Username or email already exists!")
    
    def open_login_page(self):
        self.window.destroy()
        window = Tk()
        from LoginPage import LoginPage  # Import here to avoid circular import
        LoginPage(window)
        window.mainloop()

    def show_hide_password(self):
        if self.password_shown:
            self.password_entry.config(show='*')
            self.show_button.config(image=self.show_image)
            self.password_shown = False
        else:
            self.password_entry.config(show='')
            self.show_button.config(image=self.hide_image)
            self.password_shown = True

    def show_hide_confirm_password(self):
        if self.confirm_password_shown:
            self.confirm_password_entry.config(show='*')
            self.confirm_show_button.config(image=self.show_image)
            self.confirm_password_shown = False
        else:
            self.confirm_password_entry.config(show='')
            self.confirm_show_button.config(image=self.hide_image)
            self.confirm_password_shown = True
