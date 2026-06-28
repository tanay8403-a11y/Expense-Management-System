import sqlite3, os, sys
p = r"c:\Users\Asus\Downloads\ems2\ems2\backend\database.db"
if not os.path.exists(p):
    print('database file not found:', p)
    sys.exit(0)
conn = sqlite3.connect(p)
cur = conn.cursor()
try:
    cur.execute('SELECT id, date, category, amount, description FROM expenses')
    rows = cur.fetchall()
    if not rows:
        print('no expense rows')
    else:
        for r in rows:
            print(r)
except Exception as e:
    print('error:', e)
finally:
    conn.close()
