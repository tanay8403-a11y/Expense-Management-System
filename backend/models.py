import sqlite3
import os
from datetime import datetime, timedelta, date
from werkzeug.security import check_password_hash, generate_password_hash

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(DB_DIR, "database_fresh.db")

def connect():
    return sqlite3.connect(DB_NAME)


def verify_password(stored_password, plain_password):
    """Check password against stored value (hash or legacy plain-text)."""
    if not stored_password:
        return False
    # Try hash check first
    try:
        if check_password_hash(stored_password, plain_password):
            return True
    except (ValueError, TypeError):
        pass
    # Fallback: legacy plain-text comparison
    return stored_password == plain_password


def _is_hashed(value):
    """Return True if value looks like a werkzeug password hash."""
    return value and (
        value.startswith("pbkdf2:") or
        value.startswith("scrypt:") or
        value.startswith("bcrypt:")
    )


def init_db():
    conn = connect()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            gender TEXT NOT NULL,
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

    conn.execute("""
        CREATE TABLE IF NOT EXISTS savings(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            month TEXT NOT NULL,
            amount REAL DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, month)
        )
    """)

    conn.commit()
    # Add welcome_email_sent column to users table if it does not exist
    try:
        cur.execute("PRAGMA table_info(users)")
        cols = [r[1] for r in cur.fetchall()]
        if 'welcome_email_sent' not in cols:
            cur.execute("ALTER TABLE users ADD COLUMN welcome_email_sent INTEGER DEFAULT 0")
            conn.commit()
    except Exception:
        # If anything goes wrong, ignore; not critical
        pass

    conn.close()


def login_user(username, password):
    conn = connect()
    cur = conn.cursor()

    cur.execute("SELECT * FROM users WHERE username=?", (username,))
    user = cur.fetchone()

    if not user or not verify_password(user[4], password):
        conn.close()
        return None

    # Auto-migrate plain-text password to hash on first login
    if not _is_hashed(user[4]):
        hashed = generate_password_hash(password)
        cur.execute("UPDATE users SET password=? WHERE id=?", (hashed, user[0]))
        conn.commit()
        # Return updated user tuple with new hash
        user = (user[0], user[1], user[2], user[3], hashed) + user[5:]

    conn.close()
    return user


def register_user(full_name, username, password):
    conn = connect()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO users(full_name, username, password) VALUES(?,?,?)",
        (full_name, username, generate_password_hash(password))
    )
    conn.commit()
    conn.close()


def get_user_profile(username):
    conn = connect()
    cur = conn.cursor()
    cur.execute(
        "SELECT full_name, username, email, gender, favorite_sport, welcome_email_sent FROM users WHERE username=?",
        (username,)
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return None

    return {
        "full_name": row[0],
        "username": row[1],
        "email": row[2],
        "gender": row[3],
        "favorite_sport": row[4],
        "welcome_email_sent": bool(row[5]) if len(row) > 5 else False
    }


def update_user_profile(current_username, full_name, new_username):
    conn = connect()
    cur = conn.cursor()

    cur.execute("SELECT id, password FROM users WHERE username=?", (current_username,))
    user = cur.fetchone()
    if not user:
        conn.close()
        return "not_found"

    cur.execute(
        "UPDATE users SET full_name=?, username=? WHERE id=?",
        (full_name, new_username, user[0])
    )
    conn.commit()
    updated = cur.rowcount > 0
    conn.close()
    return "updated" if updated else "not_found"


def change_user_password(username, current_password, new_password):
    conn = connect()
    cur = conn.cursor()

    cur.execute("SELECT id, password FROM users WHERE username=?", (username,))
    user = cur.fetchone()
    if not user:
        conn.close()
        return "not_found"

    if not verify_password(user[1], current_password):
        conn.close()
        return "invalid_current"

    cur.execute(
        "UPDATE users SET password=? WHERE id=?",
        (generate_password_hash(new_password), user[0])
    )
    conn.commit()
    conn.close()
    return "updated"


def add_expense(username, date, category, amount, description):
    conn = connect()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE username=?", (username,))
    user = cur.fetchone()
    if not user:
        conn.close()
        return False
    cur.execute(
        "INSERT INTO expenses(user_id, date, category, amount, description) VALUES(?,?,?,?,?)",
        (user[0], date, category, amount, description)
    )
    conn.commit()
    conn.close()
    return True


def get_expenses(username, month=None):
    conn = connect()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE username=?", (username,))
    user = cur.fetchone()
    if not user:
        conn.close()
        return []

    user_id = user[0]

    if month is None:
        cur.execute(
            "SELECT id, date, category, amount, description FROM expenses WHERE user_id=?",
            (user_id,)
        )
    else:
        today = date.today()

        if month in ('0', 0):
            start_date = today.replace(day=1)
            if today.month == 12:
                end_date = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                end_date = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        elif month in ('1', 1):
            first_this = today.replace(day=1)
            last_prev = first_this - timedelta(days=1)
            start_date = last_prev.replace(day=1)
            end_date = last_prev
        else:
            try:
                month_obj = datetime.strptime(month, '%Y-%m').date()
                start_date = month_obj.replace(day=1)
                if month_obj.month == 12:
                    end_date = month_obj.replace(year=month_obj.year + 1, month=1, day=1) - timedelta(days=1)
                else:
                    end_date = month_obj.replace(month=month_obj.month + 1, day=1) - timedelta(days=1)
            except ValueError:
                cur.execute(
                    "SELECT id, date, category, amount, description FROM expenses WHERE user_id=?",
                    (user_id,)
                )
                data = cur.fetchall()
                conn.close()
                return data

        cur.execute(
            """SELECT id, date, category, amount, description FROM expenses
               WHERE user_id=? AND date >= ? AND date <= ?""",
            (user_id, start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
        )

    data = cur.fetchall()
    conn.close()
    return data


def delete_expense(username, id):
    conn = connect()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE username=?", (username,))
    user = cur.fetchone()
    if not user:
        conn.close()
        return False
    cur.execute("DELETE FROM expenses WHERE id=? AND user_id=?", (id, user[0]))
    conn.commit()
    conn.close()
    return cur.rowcount > 0


def update_expense(username, id, date, category, amount, description):
    conn = connect()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE username=?", (username,))
    user = cur.fetchone()
    if not user:
        conn.close()
        return False
    cur.execute(
        """UPDATE expenses
           SET date=?, category=?, amount=?, description=?
           WHERE id=? AND user_id=?""",
        (date, category, amount, description, id, user[0])
    )
    conn.commit()
    conn.close()
    return cur.rowcount > 0


def set_budget(username, month, monthly_budget, daily_limit):
    conn = connect()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE username=?", (username,))
    user = cur.fetchone()
    if not user:
        conn.close()
        return False
    cur.execute(
        """INSERT INTO budgets(user_id, month, monthly_budget, daily_limit)
           VALUES(?,?,?,?)
           ON CONFLICT(user_id, month) DO UPDATE SET
               monthly_budget=excluded.monthly_budget,
               daily_limit=excluded.daily_limit""",
        (user[0], month, monthly_budget, daily_limit)
    )
    conn.commit()
    conn.close()
    return True


def mark_welcome_sent(username):
    conn = connect()
    cur = conn.cursor()
    cur.execute("UPDATE users SET welcome_email_sent=1 WHERE username=?", (username,))
    conn.commit()
    conn.close()
    return True


def get_budget(username, month=None):
    conn = connect()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE username=?", (username,))
    user = cur.fetchone()
    if not user:
        conn.close()
        return None

    if month:
        cur.execute(
            "SELECT monthly_budget, daily_limit FROM budgets WHERE user_id=? AND month=?",
            (user[0], month)
        )
    else:
        cur.execute(
            """SELECT monthly_budget, daily_limit FROM budgets
               WHERE user_id=? ORDER BY month DESC LIMIT 1""",
            (user[0],)
        )
    budget = cur.fetchone()
    conn.close()
    return budget


def get_savings(username):
    conn = connect()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE username=?", (username,))
    user = cur.fetchone()
    if not user:
        conn.close()
        return 0
    cur.execute("SELECT SUM(amount) FROM savings WHERE user_id=?", (user[0],))
    total = cur.fetchone()[0]
    conn.close()
    return total or 0


def has_savings_record(username, month):
    conn = connect()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE username=?", (username,))
    user = cur.fetchone()
    if not user:
        conn.close()
        return False
    cur.execute("SELECT 1 FROM savings WHERE user_id=? AND month=?", (user[0], month))
    exists = cur.fetchone() is not None
    conn.close()
    return exists


def add_savings(username, month, amount):
    conn = connect()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE username=?", (username,))
    user = cur.fetchone()
    if not user:
        conn.close()
        return False
    cur.execute(
        """INSERT INTO savings(user_id, month, amount)
           VALUES(?,?,?)
           ON CONFLICT(user_id, month) DO UPDATE SET amount=excluded.amount""",
        (user[0], month, amount)
    )
    conn.commit()
    conn.close()
    return True


def get_monthly_expense_total(username, month):
    conn = connect()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE username=?", (username,))
    user = cur.fetchone()
    if not user:
        conn.close()
        return 0

    user_id = user[0]
    today = date.today()

    if month in ('0', 0):
        start = today.replace(day=1)
        # Fix: handle December correctly
        if today.month == 12:
            end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
    elif month in ('1', 1):
        first_this = today.replace(day=1)
        last_prev = first_this - timedelta(days=1)
        start = last_prev.replace(day=1)
        end = last_prev
    else:
        month_obj = datetime.strptime(month, '%Y-%m').date()
        start = month_obj.replace(day=1)
        if month_obj.month == 12:
            end = month_obj.replace(year=month_obj.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end = month_obj.replace(month=month_obj.month + 1, day=1) - timedelta(days=1)

    cur.execute(
        "SELECT SUM(amount) FROM expenses WHERE user_id=? AND date BETWEEN ? AND ?",
        (user_id, start.strftime('%Y-%m-%d'), end.strftime('%Y-%m-%d'))
    )
    total = cur.fetchone()[0] or 0
    conn.close()
    return total