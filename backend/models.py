import sqlite3
import os

# Get the directory of this file and use it as the base path
DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(DB_DIR, "database.db")

def connect():
    return sqlite3.connect(DB_NAME)

def init_db():

    conn = connect()
    cur = conn.cursor()

    cur.execute("""
                CREATE TABLE IF NOT EXISTS users(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT,
                username TEXT UNIQUE,
                password TEXT,
                favorite_sport TEXT
            )
        """)

    cur.execute("""
                CREATE TABLE IF NOT EXISTS expenses(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date TEXT,
                category TEXT,
                amount REAL,
                description TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

    cur.execute("""
                CREATE TABLE IF NOT EXISTS budgets(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                month TEXT NOT NULL,
                monthly_budget REAL DEFAULT 0,
                daily_limit REAL DEFAULT 0,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, month)
            )
        """)

    conn.commit()
    conn.close()


def add_expense(username, date, category, amount, description):

    conn = connect()
    cur = conn.cursor()

    # Get user_id from username
    cur.execute("SELECT id FROM users WHERE username=?", (username,))
    user = cur.fetchone()
    
    if not user:
        conn.close()
        return False
    
    user_id = user[0]

    cur.execute(
        "INSERT INTO expenses(user_id, date, category, amount, description) VALUES(?,?,?,?,?)",
        (user_id, date, category, amount, description)
    )

    conn.commit()
    conn.close()
    return True


def get_expenses(username):

    conn = connect()
    cur = conn.cursor()

    # Get user_id from username
    cur.execute("SELECT id FROM users WHERE username=?", (username,))
    user = cur.fetchone()
    
    if not user:
        conn.close()
        return []
    
    user_id = user[0]
    
    cur.execute("SELECT id, date, category, amount, description FROM expenses WHERE user_id=?", (user_id,))

    data = cur.fetchall()

    conn.close()

    return data


def register_user(full_name, username, password):

    conn = connect()
    cur = conn.cursor()

    cur.execute(
        "INSERT INTO users(full_name,username,password) VALUES(?,?,?)",
        (full_name, username, password)
    )

    conn.commit()
    conn.close()


def login_user(username, password):

    conn = connect()
    cur = conn.cursor()

    cur.execute(
        "SELECT * FROM users WHERE username=? AND password=?",
        (username, password)
    )

    user = cur.fetchone()

    conn.close()

    return user


def delete_expense(username, id):

    conn = connect()
    cur = conn.cursor()

    # Get user_id from username
    cur.execute("SELECT id FROM users WHERE username=?", (username,))
    user = cur.fetchone()
    
    if not user:
        conn.close()
        return False
    
    user_id = user[0]

    cur.execute("DELETE FROM expenses WHERE id=? AND user_id=?", (id, user_id))

    conn.commit()
    conn.close()
    return cur.rowcount > 0


# ---------------- UPDATE EXPENSE ---------------- #

def update_expense(username, id, date, category, amount, description):

    conn = connect()
    cur = conn.cursor()

    # Get user_id from username
    cur.execute("SELECT id FROM users WHERE username=?", (username,))
    user = cur.fetchone()
    
    if not user:
        conn.close()
        return False
    
    user_id = user[0]

    cur.execute(
        """UPDATE expenses
           SET date=?, category=?, amount=?, description=?
           WHERE id=? AND user_id=?""",
        (date, category, amount, description, id, user_id)
    )

    conn.commit()
    conn.close()
    return cur.rowcount > 0


# ---------------- SET BUDGET ---------------- #

def set_budget(username, month, monthly_budget, daily_limit):

    conn = connect()
    cur = conn.cursor()

    cur.execute("SELECT id FROM users WHERE username=?", (username,))
    user = cur.fetchone()

    if not user:
        conn.close()
        return False

    user_id = user[0]

    cur.execute(
        """INSERT INTO budgets(user_id, month, monthly_budget, daily_limit)
           VALUES(?,?,?,?)
           ON CONFLICT(user_id, month) DO UPDATE SET
               monthly_budget=excluded.monthly_budget,
               daily_limit=excluded.daily_limit""",
        (user_id, month, monthly_budget, daily_limit)
    )

    conn.commit()
    conn.close()
    return True


# ---------------- GET BUDGET ---------------- #

def get_budget(username):

    conn = connect()
    cur = conn.cursor()

    cur.execute("SELECT id FROM users WHERE username=?", (username,))
    user = cur.fetchone()

    if not user:
        conn.close()
        return None

    user_id = user[0]

    # Return the most recently set budget for this user
    cur.execute(
        """SELECT monthly_budget, daily_limit FROM budgets
           WHERE user_id=?
           ORDER BY month DESC LIMIT 1""",
        (user_id,)
    )

    budget = cur.fetchone()
    conn.close()
    return budget