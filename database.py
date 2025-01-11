import sqlite3
from hashlib import sha256

def init_db():
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (username TEXT PRIMARY KEY,
                  email TEXT UNIQUE,
                  password TEXT)''')
    conn.commit()
    conn.close()

def hash_password(password):
    return sha256(password.encode()).hexdigest()

def register_user(username, email, password):
    try:
        conn = sqlite3.connect('users.db')
        c = conn.cursor()
        hashed_password = hash_password(password)
        c.execute("INSERT INTO users VALUES (?, ?, ?)", (username, email, hashed_password))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        return False

def verify_login(username, password):
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    hashed_password = hash_password(password)
    c.execute("SELECT * FROM users WHERE username=? AND password=?", (username, hashed_password))
    result = c.fetchone()
    conn.close()
    return result is not None
